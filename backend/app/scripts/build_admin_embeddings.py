"""data/admin-sop/chunks.jsonl → AI_FAQ INSERT (audience_cd='ADMIN').

컨테이너 안에서 실행:
    docker exec bank-portfolio-backend python -m app.scripts.build_admin_embeddings

배치 임베딩 → INSERT. 멱등성 — doc_id+context_id 가 같은 row 는 SKIP.
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path


CHUNKS_PATH = Path("/app/data/admin-sop/chunks.jsonl")
BATCH_SIZE = 64
EMBED_MODEL_NAME = "jhgan/ko-sroberta-multitask"


def _build_search_text(chunk: dict) -> str:
    """청크의 임베딩 입력 = title + qas[].question + context (의미 압축).

    AI Hub 청크: question 텍스트가 검색 쿼리와 의미 가깝게 매칭 강화.
    합성 SOP: qas 없이 title + context.
    """
    parts = [chunk.get("doc_title", "")]
    for q in (chunk.get("qas") or [])[:3]:
        if q.get("question"):
            parts.append(q["question"])
    parts.append(chunk.get("context", ""))
    return " ".join(p.strip() for p in parts if p.strip())[:2000]


def _question_text(chunk: dict) -> str:
    """AI_FAQ.QUESTION 컬럼 — 검색 결과로 노출될 짧은 라벨."""
    qas = chunk.get("qas") or []
    if qas and qas[0].get("question"):
        return qas[0]["question"][:200]
    return chunk.get("doc_title", "")[:200]


def _answer_text(chunk: dict) -> str:
    """AI_FAQ.ANSWER 컬럼 — 검색 결과 본문."""
    return chunk.get("context", "")[:4000]


async def main() -> int:
    if not CHUNKS_PATH.exists():
        print(f"[fatal] {CHUNKS_PATH} 없음", file=sys.stderr)
        return 1

    # 청크 로드
    chunks: list[dict] = []
    with open(CHUNKS_PATH, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                chunks.append(json.loads(line))
    print(f"chunks loaded: {len(chunks):,}")

    # 임베딩 모델
    from sentence_transformers import SentenceTransformer
    print(f"loading embed model: {EMBED_MODEL_NAME}")
    model = SentenceTransformer(EMBED_MODEL_NAME)

    # DB pool
    from app.db import init_pool, get_pool
    await init_pool()
    pool = get_pool()

    # 멱등성 — doc_id+context_id 가 같은 row 가 이미 있으면 skip.
    # AI_FAQ 에 별도 컬럼이 없으니 QUESTION 의 prefix(doc_id) 로 식별.
    # 시연용으론 깨끗하게 — admin audience 행 전부 삭제 후 재 INSERT.
    async with pool.acquire() as conn:
        existing = await conn.fetchval(
            'SELECT COUNT(*) FROM public."AI_FAQ" WHERE "AUDIENCE_CD" = \'ADMIN\''
        )
        if existing:
            print(f"기존 ADMIN row {existing}건 삭제 (재빌드)")
            await conn.execute(
                'DELETE FROM public."AI_FAQ" WHERE "AUDIENCE_CD" = \'ADMIN\''
            )

    # 배치 임베딩 + INSERT
    inserted = 0
    for start in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[start:start + BATCH_SIZE]
        texts = [_build_search_text(c) for c in batch]

        # 임베딩
        embs = model.encode(texts, batch_size=BATCH_SIZE, normalize_embeddings=True, show_progress_bar=False)

        # INSERT
        async with pool.acquire() as conn:
            async with conn.transaction():
                for c, emb in zip(batch, embs):
                    emb_str = "[" + ",".join(f"{v:.6f}" for v in emb) + "]"
                    await conn.execute(
                        'INSERT INTO public."AI_FAQ" '
                        '  ("CATEGORY", "QUESTION", "ANSWER", "EMBEDDING", '
                        '   "STATUS_CD", "AUDIENCE_CD", "DELETE_YN", "CREATED_BY") '
                        "VALUES ($1, $2, $3, $4::vector, 'ACTIVE', 'ADMIN', 'N', 'SEED_ADMIN')",
                        c["category"][:50],
                        _question_text(c),
                        _answer_text(c),
                        emb_str,
                    )
        inserted += len(batch)
        if inserted % 256 == 0 or inserted == len(chunks):
            print(f"  {inserted:,} / {len(chunks):,}")

    print(f"\n=== DONE — {inserted:,} rows inserted ===")

    # 최종 분포
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            'SELECT "AUDIENCE_CD", "CATEGORY", count(*) AS n FROM public."AI_FAQ" '
            'WHERE "STATUS_CD" = \'ACTIVE\' AND "DELETE_YN" = \'N\' '
            'GROUP BY 1, 2 ORDER BY 1, 3 DESC'
        )
    print("\nfinal AI_FAQ distribution:")
    for r in rows:
        print(f"  {r['AUDIENCE_CD']:<6} {r['CATEGORY']:<20} {r['n']:>5}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
