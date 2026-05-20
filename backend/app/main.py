from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api.auth import router as auth_router
from .config import settings
from .db import close_pool, get_pool, init_pool
from .exceptions import BankingException
from .logging_setup import get_logger, setup_logging
from .middleware import REQUEST_ID_HEADER, RequestContextMiddleware
from .service.token import InMemoryTokenStore, TokenService

setup_logging()
log = get_logger("app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("app_startup")
    await init_pool()
    # 단기 토큰 저장소 — 개발 단계는 In-Memory. 운영은 RedisTokenStore 로 교체.
    app.state.token_service = TokenService(InMemoryTokenStore())
    yield
    await close_pool()
    log.info("app_shutdown")


app = FastAPI(title="bank-portfolio API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[REQUEST_ID_HEADER],
)
app.add_middleware(RequestContextMiddleware)


@app.exception_handler(BankingException)
async def banking_exception_handler(request: Request, exc: BankingException):
    # 비즈니스 룰 위반(잔액부족 등)은 WARN, 시스템/외부 오류는 ERROR.
    payload = dict(
        code=exc.code,
        http_status=exc.http_status,
        message=exc.message,
        details=exc.details,
    )
    if exc.http_status >= 500:
        log.error("banking_exception", **payload)
    else:
        log.warning("banking_exception", **payload)
    return JSONResponse(
        status_code=exc.http_status,
        content={
            "code": exc.code,
            "message": exc.message,
            "request_id": getattr(request.state, "request_id", None),
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # 예상 외 예외 — 절대 raw 메시지/스택을 응답에 노출하지 않는다.
    log.exception("unhandled_exception")
    return JSONResponse(
        status_code=500,
        content={
            "code": "E_INTERNAL_ERROR",
            "message": "내부 오류가 발생했습니다.",
            "request_id": getattr(request.state, "request_id", None),
        },
    )


app.include_router(auth_router)


@app.get("/")
async def root():
    return {"service": "bank-portfolio", "status": "ok"}


@app.get("/health")
async def health():
    pool = get_pool()
    async with pool.acquire() as conn:
        one = await conn.fetchval("SELECT 1")
        tables = await conn.fetchval(
            "SELECT count(*) FROM information_schema.tables "
            "WHERE table_schema = 'public'"
        )
    return {"db": "up" if one == 1 else "down", "public_tables": tables}