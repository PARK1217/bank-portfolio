"""data/seed-terms/11xx~14xx 25개 상품별 약관 → USER audience 청크 INSERT.

기존 USER 102 청크 (표준 약관 5종 + FAQ 40) 는 그대로 두고,
상품별 특약약관(1101~1408)을 추가 청크화. SOURCE_TAG='SEED_PRODUCT'.

실행:
    docker exec bank-portfolio-backend python -m app.scripts.build_product_terms_embeddings
"""
from __future__ import annotations

import asyncio
import re
import sys
from pathlib import Path


SEED_DIR = Path("/app/data/seed-terms")
EMBED_MODEL_NAME = "jhgan/ko-sroberta-multitask"


def parse_frontmatter(text: str) -> tuple[dict, str]:
    """YAML frontmatter 추출 + body 분리."""
    if not text.startswith("---"):
        return {}, text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text
    meta_raw = parts[1].strip()
    body = parts[2].lstrip("\n")
    meta = {}
    for line in meta_raw.splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip()
    return meta, body


def chunk_terms(body: str, meta: dict) -> list[dict]:
    """## 또는 '제N조' 헤더 단위 분할. 길이 200~1500자."""
    title = meta.get("title", "상품 약관")
    product_id = meta.get("product_id")

    # 헤더 패턴: ## or "## 제N조 (...)"
    sections: list[tuple[str, list[str]]] = []
    current_h = title
    current_buf: list[str] = []
    for line in body.splitlines():
        if re.match(r"^(##\s+|\s*제\d+조\s*\()", line):
            if current_buf:
                sections.append((current_h, current_buf))
            current_h = line.lstrip("# ").strip()
            current_buf = [line]  # 헤더 자체도 본문에 포함
        else:
            current_buf.append(line)
    if current_buf:
        sections.append((current_h, current_buf))

    out = []
    for i, (sec_title, lines) in enumerate(sections):
        body_txt = re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()
        if len(body_txt) < 200:
            continue
        for k in range(0, len(body_txt), 1400):
            piece = body_txt[k:k + 1500]
            if len(piece) < 200:
                continue
            out.append({
                "category": "TERMS",
                "question": f"{title} — {sec_title}"[:200],
                "answer": piece[:4000],
                "product_id": product_id,
            })
    return out


async def main() -> int:
    # 상품별 약관 파일 (1101~1408)
    md_files = sorted(SEED_DIR.glob("1[1-4]*.md"))
    print(f"상품별 약관 파일: {len(md_files)}개")

    all_chunks: list[dict] = []
    for mdfile in md_files:
        text = mdfile.read_text(encoding="utf-8")
        meta, body = parse_frontmatter(text)
        chunks = chunk_terms(body, meta)
        all_chunks.extend(chunks)
        print(f"  {mdfile.name}: {len(chunks)} chunks (product_id={meta.get('product_id')})")

    print(f"\n총 청크: {len(all_chunks)}")

    # 임베딩 모델
    from sentence_transformers import SentenceTransformer
    print(f"임베딩 모델 로딩...")
    model = SentenceTransformer(EMBED_MODEL_NAME)

    from app.db import init_pool, get_pool
    await init_pool()
    pool = get_pool()

    # 기존 SEED_PRODUCT 청크 정리 후 재 INSERT
    async with pool.acquire() as conn:
        existing = await conn.fetchval(
            'SELECT count(*) FROM public."AI_FAQ" WHERE "SOURCE_TAG"=\'SEED_PRODUCT\''
        )
        print(f"기존 SEED_PRODUCT {existing}건 정리 → 재 INSERT")
        await conn.execute(
            'DELETE FROM public."AI_FAQ" WHERE "SOURCE_TAG"=\'SEED_PRODUCT\''
        )

    # 배치 임베딩
    texts = [f"{c['question']} {c['answer']}"[:2000] for c in all_chunks]
    embs = model.encode(texts, batch_size=32, normalize_embeddings=True, show_progress_bar=False)

    async with pool.acquire() as conn:
        async with conn.transaction():
            for c, emb in zip(all_chunks, embs):
                emb_str = "[" + ",".join(f"{v:.6f}" for v in emb) + "]"
                await conn.execute(
                    'INSERT INTO public."AI_FAQ" '
                    '  ("CATEGORY","QUESTION","ANSWER","EMBEDDING",'
                    '   "STATUS_CD","AUDIENCE_CD","SOURCE_TAG","DELETE_YN","CREATED_BY") '
                    "VALUES ($1,$2,$3,$4::vector,'ACTIVE','USER','SEED_PRODUCT','N','SEED_PRODUCT')",
                    c["category"],
                    c["question"],
                    c["answer"],
                    emb_str,
                )

    print(f"\n=== DONE — {len(all_chunks)} SEED_PRODUCT rows inserted ===")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
