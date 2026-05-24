"""Kafka producer/consumer wrapper — 가이드 §2.4 결제망 시뮬레이션 + RAG 트레이스.

설계
- **Producer**: 앱 lifespan 에서 1회 start → 모듈 전역 싱글톤. JSON 직렬화.
- **Consumer**: lifespan 에서 백그라운드 태스크로 등록. 토픽별 핸들러 함수 매핑.
- 브로커 다운 시 graceful: producer/consumer start 가 실패해도 앱은 살아남고
  `send_event` 는 no-op (구조화 로그로 흔적만). 발표 데모 안정성 우선.

토픽
- `transfer.settlement.requested` — 타행이체 INIT 시 발행, consumer 가 100~500ms 후 SETTLED 처리
- `transfer.settlement.completed` — settlement 완료 후 (향후 notification consumer 등에서 활용)
- `chatbot.llm.calls`            — LLM 호출 trace, consumer 가 AI_LLM_CALL_LOG INSERT (Phase 6 Phoenix 연동 후보)
- `chatbot.rag.evaluations`       — RAG 응답 평가 (Faithfulness 등, Phase 6)
"""

from __future__ import annotations

import asyncio
import json
import os
from typing import Any, Awaitable, Callable

import structlog
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer

from ..observability import get_tracer

log = structlog.get_logger("kafka")
_tracer = get_tracer("banking.kafka")

# 토픽 상수
TOPIC_SETTLEMENT_REQUESTED = "transfer.settlement.requested"
TOPIC_SETTLEMENT_COMPLETED = "transfer.settlement.completed"
TOPIC_CHATBOT_LLM_CALLS = "chatbot.llm.calls"
TOPIC_CHATBOT_RAG_EVALS = "chatbot.rag.evaluations"
# 계좌 검증 — 타행 예금주 조회용 request-reply 패턴.
TOPIC_ACCOUNT_VERIFY_REQ = "transfer.account.verify.requested"
TOPIC_ACCOUNT_VERIFY_REPLY = "transfer.account.verify.replies"
# FDS 분류기 — 거래 발생 시 비동기 평가 (룰 + ML + LLM)
TOPIC_FDS_TRANSACTION_DETECTED = "fds.transaction.detected"

_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "kafka:9092")
_GROUP_PREFIX = os.getenv("KAFKA_GROUP_PREFIX", "bank-portfolio")

_producer: AIOKafkaProducer | None = None
_consumer_tasks: list[asyncio.Task] = []
_consumer_objs: list[AIOKafkaConsumer] = []


# ---------------------------------------------------------------------------
# Producer
# ---------------------------------------------------------------------------

async def start_producer() -> None:
    global _producer
    if _producer is not None:
        return
    try:
        p = AIOKafkaProducer(
            bootstrap_servers=_BOOTSTRAP,
            value_serializer=lambda v: json.dumps(v, ensure_ascii=False).encode("utf-8"),
            key_serializer=lambda k: str(k).encode("utf-8") if k is not None else None,
            acks="all",
        )
        await p.start()
        _producer = p
        log.info("kafka_producer_started", bootstrap=_BOOTSTRAP)
    except Exception as exc:
        log.error("kafka_producer_start_failed", error=str(exc))
        _producer = None  # send_event 가 no-op 으로 동작


async def stop_producer() -> None:
    global _producer
    if _producer is None:
        return
    try:
        await _producer.stop()
    except Exception:
        log.exception("kafka_producer_stop_failed")
    _producer = None


async def send_event(topic: str, payload: dict[str, Any], key: str | None = None) -> bool:
    """이벤트 발행. 브로커 다운 시 False 반환 (앱 흐름은 영향 받지 않음)."""
    if _producer is None:
        log.warning("kafka_send_skipped_no_producer", topic=topic)
        return False
    # OpenTelemetry messaging 컨벤션 — span.kind=PRODUCER 가 의미 있는 trace 트리.
    with _tracer.start_as_current_span(f"kafka.publish {topic}") as span:
        span.set_attribute("messaging.system", "kafka")
        span.set_attribute("messaging.destination.name", topic)
        span.set_attribute("messaging.operation", "publish")
        if key:
            span.set_attribute("messaging.kafka.message.key", str(key))
        # 메시지 본문 일부 (debug 용, 너무 크면 잘림)
        try:
            import json as _json
            span.set_attribute("messaging.message.body.preview", _json.dumps(payload, ensure_ascii=False)[:500])
        except Exception:
            pass
        try:
            await _producer.send_and_wait(topic, value=payload, key=key)
            return True
        except Exception as exc:
            span.record_exception(exc)
            log.error("kafka_send_failed", topic=topic, error=str(exc))
            return False


# ---------------------------------------------------------------------------
# Consumer
# ---------------------------------------------------------------------------

async def start_consumer(
    topic: str,
    handler: Callable[[dict[str, Any]], Awaitable[None]],
    group_id: str | None = None,
) -> None:
    """토픽 1개 + 핸들러 함수 1개로 백그라운드 컨슈머 시작."""
    gid = f"{_GROUP_PREFIX}.{group_id or topic.replace('.', '-')}"
    try:
        c = AIOKafkaConsumer(
            topic,
            bootstrap_servers=_BOOTSTRAP,
            group_id=gid,
            value_deserializer=lambda v: json.loads(v.decode("utf-8")),
            auto_offset_reset="latest",  # 백테스트 회피 — 새 메시지만 처리
            enable_auto_commit=True,
        )
        await c.start()
    except Exception as exc:
        log.error("kafka_consumer_start_failed", topic=topic, error=str(exc))
        return

    _consumer_objs.append(c)
    log.info("kafka_consumer_started", topic=topic, group=gid)

    async def _loop() -> None:
        try:
            async for msg in c:
                try:
                    await handler(msg.value)
                except Exception:
                    log.exception("kafka_handler_failed", topic=topic, key=msg.key)
        except asyncio.CancelledError:
            log.info("kafka_consumer_cancelled", topic=topic)
            raise
        except Exception:
            log.exception("kafka_consumer_loop_crashed", topic=topic)

    task = asyncio.create_task(_loop(), name=f"kafka-consumer-{topic}")
    _consumer_tasks.append(task)


# ---------------------------------------------------------------------------
# Request-Reply (correlation_id 기반 in-memory Future map)
# ---------------------------------------------------------------------------
#
# 사용 패턴 (호출자):
#     correlation_id = await register_reply(future)
#     await send_event(REQ_TOPIC, {..., "correlation_id": correlation_id})
#     try:
#         reply = await asyncio.wait_for(future, timeout=3)
#     except asyncio.TimeoutError:
#         unregister_reply(correlation_id)
#
# 리플라이 컨슈머는 메시지 받으면 `resolve_reply(correlation_id, payload)`.

_pending_replies: dict[str, asyncio.Future] = {}


def register_reply() -> tuple[str, asyncio.Future]:
    """correlation_id 와 await 대상 Future 생성·등록."""
    import uuid

    cid = uuid.uuid4().hex
    fut: asyncio.Future = asyncio.get_event_loop().create_future()
    _pending_replies[cid] = fut
    return cid, fut


def resolve_reply(correlation_id: str, payload: dict[str, Any]) -> None:
    """리플라이 컨슈머가 메시지 도착 시 호출. 대응 Future 가 없으면 무시."""
    fut = _pending_replies.pop(correlation_id, None)
    if fut is not None and not fut.done():
        fut.set_result(payload)


def unregister_reply(correlation_id: str) -> None:
    """타임아웃·취소 시 정리."""
    _pending_replies.pop(correlation_id, None)


async def stop_consumers() -> None:
    for task in _consumer_tasks:
        task.cancel()
    for task in _consumer_tasks:
        try:
            await task
        except (asyncio.CancelledError, Exception):
            pass
    for c in _consumer_objs:
        try:
            await c.stop()
        except Exception:
            log.exception("kafka_consumer_stop_failed")
    _consumer_tasks.clear()
    _consumer_objs.clear()
