from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api.account import router as account_router
from .api.account_open import router as account_open_router
from .api.admin_account import router as admin_account_router
from .api.admin_attach import router as admin_attach_router
from .api.admin_auth import router as admin_auth_router
from .api.admin_customer import router as admin_customer_router
from .api.admin_health import router as admin_health_router
from .api.admin_loan import router as admin_loan_router
from .api.admin_overdue import router as admin_overdue_router
from .api.auth import router as auth_router, setup_router
from .api.auto_transfer import router as auto_transfer_router
from .api.chatbot import router as chatbot_router
from .api.favorite_account import router as favorite_account_router
from .api.dashboard import router as dashboard_router
from .api.device import router as device_router
from .api.limit_change import router as limit_change_router
from .api.loan import router as loan_router
from .api.notice import router as notice_router
from .api.notification import router as notification_router
from .api.password import router as password_router
from .api.product import router as product_router
from .api.product_open import router as product_open_router
from .api.security import router as security_router
from .api.signup import router as signup_router
from .api.terms import router as terms_router
from .api.transactions import router as transactions_router
from .api.transfer import router as transfer_router
from .config import settings
from .db import close_pool, get_pool, init_pool
from .exceptions import BankingException
from .logging_setup import get_logger, setup_logging
from .observability import init_tracing
from .middleware import (
    REQUEST_ID_HEADER,
    AdminAuditMiddleware,
    RequestContextMiddleware,
)
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

    # Kafka (가이드 §2.4) — producer + consumer 백그라운드 등록.
    # 브로커 미가동 시 send_event 는 no-op 으로 graceful degrade.
    from .service import kafka as kafka_svc
    from .service.account_verify import (
        handle_external_bank_verify,
        handle_verify_reply,
    )
    from .service.chatbot import handle_llm_call_trace
    from .service.rag_eval_log import handle_rag_evaluation
    from .service.transfer import handle_settlement_requested

    await kafka_svc.start_producer()
    await kafka_svc.start_consumer(
        kafka_svc.TOPIC_SETTLEMENT_REQUESTED,
        handle_settlement_requested,
    )
    await kafka_svc.start_consumer(
        kafka_svc.TOPIC_CHATBOT_LLM_CALLS,
        handle_llm_call_trace,
    )
    await kafka_svc.start_consumer(
        kafka_svc.TOPIC_CHATBOT_RAG_EVALS,
        handle_rag_evaluation,
    )
    # 타행 계좌검증 — 외부 은행 시뮬 consumer (req 토픽) + 호출자 측 reply consumer.
    await kafka_svc.start_consumer(
        kafka_svc.TOPIC_ACCOUNT_VERIFY_REQ,
        handle_external_bank_verify,
        group_id="external-bank-simulator",
    )
    await kafka_svc.start_consumer(
        kafka_svc.TOPIC_ACCOUNT_VERIFY_REPLY,
        handle_verify_reply,
        group_id="verify-reply-consumer",
    )

    # 자동이체 실행 워커 — AUTO_TRANSFER ACTIVE 스캔 + AUTO_TRANSFER_EXEC 적재.
    import asyncio as _asyncio

    from .service import admin_health, auto_transfer_worker

    auto_transfer_task = _asyncio.create_task(auto_transfer_worker.run())
    # 외부 통신망 헬스 스냅 워커 — EXTERNAL_API_HEALTH 5분 적재 (Phase 6 §9.2.3).
    external_health_task = _asyncio.create_task(admin_health.worker_loop())

    yield

    auto_transfer_task.cancel()
    external_health_task.cancel()
    for _t in (auto_transfer_task, external_health_task):
        try:
            await _t
        except _asyncio.CancelledError:
            pass
    await kafka_svc.stop_consumers()
    await kafka_svc.stop_producer()
    await close_pool()
    log.info("app_shutdown")


app = FastAPI(title="bank-portfolio API", version="0.1.0", lifespan=lifespan)

# Phoenix / OTLP 트레이스 — 가이드 §9.2.2. 미설정 시 graceful no-op.
init_tracing(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[REQUEST_ID_HEADER],
)
# /api/admin/* 자동 감사. RequestContextMiddleware 보다 먼저 add → 실행 순서는 나중 (Starlette LIFO),
# 즉 request_id 가 binding 된 다음에 감사 미들웨어가 돌도록 한다.
app.add_middleware(AdminAuditMiddleware)
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
api.include_router(setup_router)
api.include_router(security_router)
api.include_router(device_router)
api.include_router(password_router)
api.include_router(signup_router)
api.include_router(account_router)
# limit_change_router 는 account_router(prefix="/accounts") 와 prefix 공유 —
# `/accounts/{no}/limit-change*` 가 account_router 의 동적 path 와 충돌하지 않도록
# account_router 다음에 별도 mount.
api.include_router(limit_change_router)
api.include_router(transactions_router)
api.include_router(dashboard_router)
# product_open_router 가 `/products/{id}/terms`, `/products/{id}/open-*`, `/products/complete/{token}`
# 같이 더 구체적인 path 를 가지므로 product_router(`/{product_id}` 동적 path) 보다 먼저 등록.
# account_open_router 는 OP-009 적금 가입 → 자동이체 자동 등록 통합 (`/products/{id}/open-installment`).
api.include_router(product_open_router)
api.include_router(account_open_router)
api.include_router(product_router)
api.include_router(terms_router)
# auto_transfer / favorite_account 라우터는 transfer_router 보다 먼저 등록 —
# transfer_router 의 `/{tx_token}` catch-all 이 `/transfer/auto`, `/transfer/favorites`,
# `/transfer/scheduled` 등을 가로채는 것을 방지.
api.include_router(favorite_account_router)
api.include_router(auto_transfer_router)
api.include_router(transfer_router)
api.include_router(loan_router)
api.include_router(admin_auth_router)
api.include_router(admin_loan_router)
api.include_router(admin_attach_router)
# admin_overdue 가 /admin/customers/overdue 와 /admin/customers/{cust}/overdue 를 갖고,
# admin_customer 가 /admin/customers 와 /admin/customers/{cust_no} 를 갖는다.
# overdue 라우터를 먼저 등록해 /overdue 경로가 {cust_no} 다이내믹과 안 부딪히게 한다.
api.include_router(admin_overdue_router)
api.include_router(admin_customer_router)
api.include_router(admin_account_router)
api.include_router(admin_health_router)
api.include_router(chatbot_router)
api.include_router(notification_router)
api.include_router(notice_router)
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