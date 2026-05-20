from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api.account import router as account_router
from .api.auth import router as auth_router
from .api.auto_transfer import router as auto_transfer_router
from .api.chatbot import router as chatbot_router
from .api.favorite_account import router as favorite_account_router
from .api.dashboard import router as dashboard_router
from .api.loan import router as loan_router
from .api.notification import router as notification_router
from .api.product import router as product_router
from .api.signup import router as signup_router
from .api.transactions import router as transactions_router
from .api.transfer import router as transfer_router
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
    # 챗봇 RAG 코퍼스 (FAQ + 약관) in-memory 로드 — `/app/data` 마운트 또는 docker cp 필요.
    from pathlib import Path

    from .service.chatbot import corpora_stats, load_corpora

    data_dir = Path("/app/data")
    if data_dir.exists():
        load_corpora(data_dir)
        log.info("chatbot_corpora_loaded", **corpora_stats())
    else:
        log.warning("chatbot_corpora_missing", data_dir=str(data_dir))
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


# 프론트엔드는 모든 도메인 API 를 `/api/<도메인>/...` 로 호출한다 (frontend/lib/api.ts BASE_URL + 호출부).
# 도메인 라우터들은 `/api` 하위로만 마운트하고, `/`·`/health` 같은 인프라 엔드포인트는
# prefix 없이 그대로 둔다.
api = APIRouter(prefix="/api")
api.include_router(auth_router)
api.include_router(signup_router)
api.include_router(account_router)
api.include_router(transactions_router)
api.include_router(dashboard_router)
api.include_router(product_router)
# auto_transfer / favorite_account 라우터는 transfer_router 보다 먼저 등록 —
# transfer_router 의 `/{tx_token}` catch-all 이 `/transfer/auto`, `/transfer/favorites`,
# `/transfer/scheduled` 등을 가로채는 것을 방지.
api.include_router(favorite_account_router)
api.include_router(auto_transfer_router)
api.include_router(transfer_router)
api.include_router(loan_router)
api.include_router(chatbot_router)
api.include_router(notification_router)
app.include_router(api)


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