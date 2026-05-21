"""챗봇 추천 질문 생성 — 개인화(보유 패턴) + 연계(follow-up).

설계
  - 개인화: ACCOUNT/AUTO_TRANSFER/LOAN_CONTRACT 시그널로 카테고리 우선순위 → AI_FAQ 풀에서 추출.
  - 연계: 직전 답변의 매칭 카테고리에서 같은 카테고리의 다른 FAQ 질문을 k건 pick (중복·동일 질문 제외).
        매칭이 없거나 VECTOR 인 경우 사용자 질문 토큰과 FAQ question 토큰 overlap 점수로 top-k.

LLM 호출 없음 — 휴리스틱·SQL 만으로 동작.
"""

from __future__ import annotations

import re

from ..db import get_pool


_TOKEN_RE = re.compile(r"[A-Za-z가-힣0-9]+")


def _tokenize(s: str) -> set[str]:
    return {t.lower() for t in _TOKEN_RE.findall(s or "") if len(t) >= 2}


# ---------------------------------------------------------------------------
# 개인화 추천 (EmptyState 진입)
# ---------------------------------------------------------------------------

async def _user_signals(customer_no: int) -> dict:
    """ACCOUNT/AUTO_TRANSFER/LOAN_CONTRACT 시그널 집계."""
    pool = get_pool()
    async with pool.acquire() as conn:
        accounts = await conn.fetch(
            'SELECT "ACCOUNT_TYPE_CD", "BALANCE" FROM public."ACCOUNT" '
            "WHERE \"CUSTOMER_NO\" = $1 AND \"DELETE_YN\" = 'N'",
            customer_no,
        )
        autos = await conn.fetchval(
            'SELECT COUNT(*) FROM public."AUTO_TRANSFER" a '
            'JOIN public."ACCOUNT" ac ON ac."ACCOUNT_NO" = a."WITHDRAW_ACCOUNT_NO" '
            'WHERE ac."CUSTOMER_NO" = $1 '
            "  AND a.\"AUTO_STATUS_CD\" = 'ACTIVE' AND a.\"DELETE_YN\" = 'N'",
            customer_no,
        )
        loans = await conn.fetch(
            'SELECT "LOAN_STATUS_CD" FROM public."LOAN_CONTRACT" '
            "WHERE \"CUSTOMER_NO\" = $1 AND \"DELETE_YN\" = 'N'",
            customer_no,
        )

    types = {a["ACCOUNT_TYPE_CD"] for a in accounts}
    balance_total = sum(int(a["BALANCE"] or 0) for a in accounts)
    loan_statuses = [l["LOAN_STATUS_CD"] for l in loans]

    return {
        "account_count": len(accounts),
        "types": types,
        "balance_total": balance_total,
        "auto_active": int(autos or 0),
        "loan_count": len(loans),
        "loan_overdue": "OVERDUE" in loan_statuses,
    }


def _category_priority(sig: dict) -> list[str]:
    """시그널 → 카테고리 우선순위 (앞에 올수록 강하게 노출)."""
    pri: list[str] = []

    if sig["loan_overdue"]:
        pri += ["LOAN", "LOAN"]  # 두 번 추가 = 2건 노출
    elif sig["loan_count"] > 0:
        pri += ["LOAN"]

    if {"INSTALL", "DEPOSIT"} & sig["types"]:
        pri += ["PRODUCT", "AUTO_TRANSFER"]
    elif "FOREIGN" in sig["types"]:
        pri += ["PRODUCT"]

    if sig["auto_active"] >= 3:
        pri += ["AUTO_TRANSFER"]

    if sig["account_count"] <= 1:
        # 신규/저활성 사용자 — 가입·상품 위주
        pri += ["PRODUCT", "SIGNUP"]

    # 항상 따라붙는 일반 카테고리 (마지막 폴백)
    pri += ["TRANSFER", "SECURITY", "ACCOUNT", "PRODUCT"]

    # 중복 정리하되 등장 순서 보존
    seen: set[str] = set()
    out: list[str] = []
    for c in pri:
        if c in seen:
            continue
        out.append(c)
        seen.add(c)
    return out


async def list_personalized_suggestions(customer_no: int, limit: int = 4) -> list[dict]:
    """카테고리 우선순위 × AI_FAQ 풀 → limit 건. 같은 카테고리 중복 회피."""
    sig = await _user_signals(customer_no)
    pri = _category_priority(sig)

    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            'SELECT "FAQ_ID","CATEGORY","QUESTION" FROM public."AI_FAQ" '
            "WHERE \"STATUS_CD\" = 'ACTIVE' "
            "  AND (\"DELETE_YN\" IS NULL OR \"DELETE_YN\" = 'N') "
            "  AND \"CATEGORY\" <> 'TERMS' "
            'ORDER BY "FAQ_ID"'
        )
    by_cat: dict[str, list[dict]] = {}
    for r in rows:
        by_cat.setdefault(r["CATEGORY"], []).append(
            {"faq_id": r["FAQ_ID"], "category": r["CATEGORY"], "question": r["QUESTION"]}
        )

    out: list[dict] = []
    used_qs: set[str] = set()
    for cat in pri:
        if len(out) >= limit:
            break
        pool_for_cat = by_cat.get(cat, [])
        for item in pool_for_cat:
            if item["question"] in used_qs:
                continue
            out.append(item)
            used_qs.add(item["question"])
            break  # 한 카테고리 당 1건씩 라운드로빈

    # 그래도 모자라면 남은 FAQ 채우기
    if len(out) < limit:
        for cat_items in by_cat.values():
            for item in cat_items:
                if len(out) >= limit:
                    break
                if item["question"] in used_qs:
                    continue
                out.append(item)
                used_qs.add(item["question"])

    return out[:limit]


# ---------------------------------------------------------------------------
# 연계(follow-up) 질문 — chat_send 응답에 동봉
# ---------------------------------------------------------------------------

async def follow_up_questions(
    user_question: str,
    matched_category: str | None,
    matched_faq_id: int | None,
    k: int = 3,
) -> list[str]:
    """매칭 카테고리에서 동일 카테고리의 다른 FAQ 질문 k건. 매칭 없으면 토큰 overlap top-k."""
    pool = get_pool()
    async with pool.acquire() as conn:
        if matched_category and matched_category != "TERMS":
            rows = await conn.fetch(
                'SELECT "FAQ_ID","QUESTION" FROM public."AI_FAQ" '
                "WHERE \"STATUS_CD\" = 'ACTIVE' "
                "  AND (\"DELETE_YN\" IS NULL OR \"DELETE_YN\" = 'N') "
                '  AND "CATEGORY" = $1 '
                '  AND ($2::int IS NULL OR "FAQ_ID" <> $2) '
                'ORDER BY "FAQ_ID" LIMIT 10',
                matched_category,
                matched_faq_id,
            )
            return [r["QUESTION"] for r in rows[:k]]

        # 매칭 카테고리 없거나 TERMS — 사용자 질문 토큰 overlap top-k
        rows = await conn.fetch(
            'SELECT "FAQ_ID","CATEGORY","QUESTION" FROM public."AI_FAQ" '
            "WHERE \"STATUS_CD\" = 'ACTIVE' "
            "  AND (\"DELETE_YN\" IS NULL OR \"DELETE_YN\" = 'N') "
            "  AND \"CATEGORY\" <> 'TERMS' "
        )

    q_toks = _tokenize(user_question)
    if not q_toks:
        return [r["QUESTION"] for r in rows[:k]]

    scored = []
    for r in rows:
        d_toks = _tokenize(r["QUESTION"])
        if not d_toks:
            continue
        score = len(q_toks & d_toks) / max(1, len(d_toks))
        if score > 0:
            scored.append((score, r["QUESTION"]))
    scored.sort(key=lambda x: x[0], reverse=True)
    out = [q for _, q in scored[:k]]
    if len(out) < k:
        # 토큰 매칭이 부족하면 일반 추천으로 채움
        for r in rows:
            if r["QUESTION"] in out:
                continue
            out.append(r["QUESTION"])
            if len(out) >= k:
                break
    return out[:k]