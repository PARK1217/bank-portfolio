"""구조화 로깅 셋업 (가이드라인 §3.1).

- JSON 포맷 (structlog + stdlib `logging` 통합)
- 일자별 로테이션 (`logs/banking.log` → `logs/banking.log.YYYY-MM-DD`)
- `request_id` 등은 contextvars로 자동 주입 (미들웨어가 bind)
- 민감 정보(계좌/주민/JWT/비밀번호/카드) 자동 마스킹

사용:
    from app.logging_setup import setup_logging, get_logger
    setup_logging()
    log = get_logger(__name__)
    log.info("event", customer_no=100001, account_no="110-001-123456")
"""

from __future__ import annotations

import json
import logging
import os
from logging.handlers import TimedRotatingFileHandler
from typing import Any, Callable

import structlog


# --- 마스킹 -----------------------------------------------------------------
#
# 공통 규칙 (가이드라인 §3.9):
#   - 식별 가능한 디지트 시퀀스에 대해 **뒤에서 3번째 자리부터 4자리**를 마스킹.
#   - **하이픈은 자릿수 계산에서 제외**, 위치는 그대로 보존.
#   - 디지트 6자 이하는 fallback 으로 전체 마스킹.
#
# 예시:
#   110-001-123456     → 110-001-****56
#   900101-1234567     → 900101-1****67
#   1234-5678-9012-3456 → 1234-5678-90**-**56
#   12345              → ***** (6자 이하 fallback)


def _mask_middle(v: Any) -> str:
    """뒤에서 3번째 자리부터 4자리를 마스킹. 하이픈은 제외하고 위치 보존."""
    s = str(v)
    digit_count = sum(1 for c in s if c != "-")
    if digit_count <= 6:
        return "".join("-" if c == "-" else "*" for c in s)
    mask_start = digit_count - 6  # 디지트 인덱스 기준 마스킹 시작 (inclusive)
    mask_end = digit_count - 2    # exclusive
    out = []
    di = 0
    for c in s:
        if c == "-":
            out.append("-")
            continue
        out.append("*" if mask_start <= di < mask_end else c)
        di += 1
    return "".join(out)


def mask_account_no(v: Any) -> str:
    """계좌번호 마스킹. 예: `110-001-123456` → `110-001-****56`."""
    return _mask_middle(v)


def mask_ssn(v: Any) -> str:
    """주민등록번호 마스킹. 예: `900101-1234567` → `900101-1****67`."""
    return _mask_middle(v)


def mask_card_no(v: Any) -> str:
    """카드번호 마스킹. 예: `1234-5678-9012-3456` → `1234-5678-90**-**56`."""
    return _mask_middle(v)


def mask_password(_: Any) -> str:
    return "***"


def mask_jwt(v: Any) -> str:
    """`eyJhbG...` → `eyJ***` (앞 3자만)."""
    s = str(v)
    if len(s) <= 3:
        return "***"
    return s[:3] + "***"


_KEY_MASKERS: dict[str, Callable[[Any], str]] = {
    "password": mask_password,
    "passwd": mask_password,
    "pw": mask_password,
    "ssn": mask_ssn,
    "resident_no": mask_ssn,
    "resident_number": mask_ssn,
    "juminbeonho": mask_ssn,
    "jwt": mask_jwt,
    "token": mask_jwt,
    "access_token": mask_jwt,
    "refresh_token": mask_jwt,
    "authorization": mask_jwt,
    "card_no": mask_card_no,
    "card_number": mask_card_no,
    "pan": mask_card_no,
}


def _maskerof(key: str) -> Callable[[Any], str] | None:
    k = key.lower()
    if k in _KEY_MASKERS:
        return _KEY_MASKERS[k]
    # 키 이름에 account가 들어가고 식별자성 접미사가 붙은 경우(계좌번호/계좌토큰)
    if "account" in k and any(t in k for t in ("no", "number", "token")):
        return mask_account_no
    return None


def _mask_value(key: str, value: Any) -> Any:
    masker = _maskerof(key)
    if masker is not None and value is not None:
        return masker(value)
    if isinstance(value, dict):
        return {k: _mask_value(k, v) for k, v in value.items()}
    if isinstance(value, list):
        return [_mask_value(key, v) for v in value]
    return value


def mask_sensitive(_logger, _name, event_dict):
    """structlog processor — event_dict 키 기준 자동 마스킹."""
    return {k: _mask_value(k, v) for k, v in event_dict.items()}


# --- 셋업 -------------------------------------------------------------------

_LEVEL_MAP = {
    "DEBUG": logging.DEBUG,
    "INFO": logging.INFO,
    "WARN": logging.WARNING,
    "WARNING": logging.WARNING,
    "ERROR": logging.ERROR,
    "CRITICAL": logging.CRITICAL,
}


def _json_dumps(obj, **kwargs) -> str:
    # 한글이 \uXXXX 로 깨지지 않도록.
    return json.dumps(obj, ensure_ascii=False, **kwargs)


_configured = False


def setup_logging(level: str | None = None, log_dir: str | None = None) -> None:
    """앱 시작 시 1회 호출. 멱등."""
    global _configured
    if _configured:
        return

    level = (level or os.getenv("LOG_LEVEL", "INFO")).upper()
    log_dir = log_dir or os.getenv("LOG_DIR", "logs")
    os.makedirs(log_dir, exist_ok=True)

    timestamper = structlog.processors.TimeStamper(fmt="iso", utc=True)

    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        timestamper,
        mask_sensitive,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    structlog.configure(
        processors=shared_processors
        + [structlog.stdlib.ProcessorFormatter.wrap_for_formatter],
        wrapper_class=structlog.make_filtering_bound_logger(
            _LEVEL_MAP.get(level, logging.INFO)
        ),
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            structlog.processors.JSONRenderer(serializer=_json_dumps),
        ],
        foreign_pre_chain=shared_processors,
    )

    file_handler = TimedRotatingFileHandler(
        filename=os.path.join(log_dir, "banking.log"),
        when="midnight",
        backupCount=30,
        encoding="utf-8",
    )
    file_handler.suffix = "%Y-%m-%d"
    file_handler.setFormatter(formatter)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)

    root = logging.getLogger()
    for h in list(root.handlers):
        root.removeHandler(h)
    root.addHandler(file_handler)
    root.addHandler(console_handler)
    root.setLevel(_LEVEL_MAP.get(level, logging.INFO))

    # uvicorn access 로그는 우리 미들웨어가 대체 — 시끄러움 방지.
    logging.getLogger("uvicorn.access").handlers = []
    logging.getLogger("uvicorn.access").propagate = False

    _configured = True


def get_logger(name: str | None = None):
    return structlog.get_logger(name)