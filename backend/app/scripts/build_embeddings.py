"""data/*.md 코퍼스를 한국어 임베딩으로 인덱싱해 AI_FAQ 테이블에 적재 (멱등).

실행:
    docker compose exec backend python -m app.scripts.build_embeddings

가이드 §3.7 RAG / §0 LLM·Vector.

- 모델: jhgan/ko-sroberta-multitask (한국어 sentence-transformers, 768d)
- 벡터 저장: public.AI_FAQ.EMBEDDING vector(768) + 코사인 거리 `<=>`
- 청크 단위:
    FAQ   = `<question>\n<answer>` 1청크
    TERMS = `<title> · <clause>\n<body>` 1청크 (절 단위)
- TRUNCATE 후 INSERT — 재실행 안전. (FAQ_ID 는 identity 자동 부여)

발표 시 어필: "정형 FAQ + 비정형 약관" 한 인덱스에 코사인 검색 1회로 통합.
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path

import asyncpg
from sentence_transformers import SentenceTransformer

from app.service.chatbot import _parse_faq, _parse_terms


MODEL_NAME = "jhgan/ko-sroberta-multitask"
DATA_DIR = Path(os.getenv("RAG_DATA_DIR", "/app/data"))


def _vec_literal(vec) -> str:
    """numpy/list → pgvector 텍스트 리터럴 `'[x,y,z]'::vector`."""
    return "[" + ",".join(f"{float(x):.6f}" for x in vec) + "]"


async def main() -> None:
    if not DATA_DIR.exists():
        raise SystemExit(f"코퍼스 디렉토리가 없습니다: {DATA_DIR}")

    faqs = _parse_faq(DATA_DIR / "seed-faq.md")
    terms = _parse_terms(DATA_DIR / "seed-terms")
    if not faqs and not terms:
        raise SystemExit("코퍼스 비어있음 — seed-faq.md / seed-terms/*.md 확인 필요")

    # (category, question, answer, embed_text)
    rows: list[tuple[str, str, str, str]] = []
    for f in faqs:
        rows.append((
            f["category"],
            f["question"],
            f["answer"],
            f"{f['question']}\n{f['answer']}",
        ))
    for t in terms:
        title_clause = f"{t['title']} · {t['clause']}"
        rows.append((
            "TERMS",
            title_clause,
            t["body"],
            f"{title_clause}\n{t['body']}",
        ))

    print(f"코퍼스 로드: FAQ {len(faqs)}, TERMS {len(terms)}, 총 {len(rows)} 청크")

    print(f"임베딩 모델 로드 중: {MODEL_NAME}")
    model = SentenceTransformer(MODEL_NAME)
    dim = model.get_sentence_embedding_dimension()
    if dim != 768:
        raise SystemExit(f"모델 차원 불일치: {dim} (AI_FAQ.EMBEDDING 은 vector(768))")

    texts = [r[3] for r in rows]
    print(f"임베딩 추론 중 ({len(texts)} 건)…")
    embeddings = model.encode(
        texts,
        normalize_embeddings=True,  # L2 정규화 → 코사인 거리 = 1 - 내적
        show_progress_bar=False,
        batch_size=16,
    )

    dsn = os.getenv("DATABASE_URL")
    if not dsn:
        raise SystemExit("DATABASE_URL 환경변수 필요")

    conn = await asyncpg.connect(dsn)
    try:
        await conn.execute('TRUNCATE TABLE public."AI_FAQ" RESTART IDENTITY')
        # asyncpg 는 vector 타입을 직접 인식 못하므로 텍스트 리터럴 + `::vector` 캐스트.
        for (category, question, answer, _), emb in zip(rows, embeddings):
            await conn.execute(
                'INSERT INTO public."AI_FAQ" '
                '("CATEGORY", "QUESTION", "ANSWER", "EMBEDDING", "STATUS_CD", "CREATED_BY") '
                "VALUES ($1, $2, $3, $4::vector, 'ACTIVE', 'EMBED_SCRIPT')",
                category, question, answer, _vec_literal(emb),
            )
        cnt = await conn.fetchval('SELECT COUNT(*) FROM public."AI_FAQ"')
        print(f"INSERT 완료. AI_FAQ 행 수: {cnt}")

        # 검색 인덱스 — IVFFlat (lists=4 는 청크 수가 적어서; 운영은 √rows 권장).
        # 이미 있으면 DROP 후 재생성.
        await conn.execute('DROP INDEX IF EXISTS public."ix_AI_FAQ_embedding"')
        await conn.execute(
            'CREATE INDEX "ix_AI_FAQ_embedding" ON public."AI_FAQ" '
            "USING ivfflat (\"EMBEDDING\" vector_cosine_ops) WITH (lists = 4)"
        )
        print("인덱스 생성 완료 (ivfflat cosine, lists=4)")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())