"""account_no → product_id 매핑 (in-memory, 휘발성).

`product_open.py` (SAVING/DEPOSIT/FOREIGN/JOINT/MINOR) 와 `account_open.py` (INSTALL)
두 라우터가 공통으로 사용해야 `/api/products/complete/{token}` 응답의
`product_name` 이 진짜 상품명(예: "자유적립식 적금")으로 떨어진다.

ACCOUNT 테이블에 `PRODUCT_ID` 컬럼이 없어 in-memory dict 로 보관 — backend reload 시
사라지면 호출 측이 `_TYPE_LABEL[account_type_cd]` 폴백(예: "통장")으로 대응.
영구화는 후속 작업 (`ACCOUNT.PRODUCT_ID` 컬럼 신설 권장).
"""

from __future__ import annotations

_MAP: dict[str, int] = {}


def set_product(account_no: str, product_id: int) -> None:
    _MAP[account_no] = int(product_id)


def get_product(account_no: str) -> int | None:
    pid = _MAP.get(account_no)
    return int(pid) if pid is not None else None