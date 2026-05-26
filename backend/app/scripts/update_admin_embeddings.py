"""신규 합성 SOP만 추가 임베딩 (기존 ADMIN row 유지).

작업:
1. chunks.jsonl 의 SYNTH_SOP 청크 다시 빌드 (data/admin-sop/add_synthetic.py)
2. 기존 SYNTH_SOP row 만 삭제 후 재 INSERT (AIHUB 8,235 건은 그대로)

실행:
    docker exec bank-portfolio-backend python -m app.scripts.update_admin_embeddings
"""
from __future__ import annotations

import asyncio
import json
import re
import sys
from pathlib import Path


SYNTH_DIR = Path("/app/data/admin-sop/synthetic")
EMBED_MODEL_NAME = "jhgan/ko-sroberta-multitask"

CATEGORY_MAP = {
    "01-kyc-cdd":             ("KYC",             "ADMIN"),
    "02-aml-str":             ("AML",             "ADMIN"),
    "03-voice-phishing":      ("VOICE_PHISHING",  "ADMIN"),
    "04-complaint-handling":  ("COMPLAINT",       "ADMIN"),
    "05-lost-fraud":          ("SECURITY_OPS",    "ADMIN"),
    "06-settlement-failure":  ("SYSTEM_OPS",      "ADMIN"),
    "07-credit-loan-ops":     ("LOAN_OPS",        "ADMIN"),
    "08-privacy-security":    ("PRIVACY",         "ADMIN"),
    "09-foreign-exchange":    ("FX",              "ADMIN"),
    "10-system-ops":          ("SYSTEM_OPS",      "ADMIN"),
    "11-deposit-termination": ("DEPOSIT_OPS",     "ADMIN"),
    "12-products-catalog":    ("PRODUCT_CATALOG", "BOTH"),
    "13-user-screen-guide":   ("SCREEN_GUIDE",    "BOTH"),
    "14-admin-screen-guide":  ("SCREEN_GUIDE",    "ADMIN"),
}


def chunk_sop(text: str, base_id: str, category: str, title: str) -> list[dict]:
    """## 헤더 단위로 분할."""
    sections = []
    current_h2 = title
    current_buf: list[str] = []
    for line in text.splitlines():
        if line.startswith("## "):
            if current_buf:
                sections.append((current_h2, "\n".join(current_buf).strip()))
            current_h2 = line[3:].strip()
            current_buf = []
        else:
            current_buf.append(line)
    if current_buf:
        sections.append((current_h2, "\n".join(current_buf).strip()))

    out = []
    for i, (sec_title, body) in enumerate(sections):
        body = re.sub(r"\n{3,}", "\n\n", body).strip()
        if len(body) < 100:
            continue
        for k in range(0, len(body), 1400):
            piece = body[k:k + 1500]
            if len(piece) < 100:
                continue
            out.append({
                "category": category[:50],
                "question": f"{title} — {sec_title}"[:200],
                "answer": piece[:4000],
            })
    return out


async def main() -> int:
    chunks: list[dict] = []
    for mdfile in sorted(SYNTH_DIR.glob("*.md")):
        base_id = mdfile.stem
        cat_aud = CATEGORY_MAP.get(base_id, ("GENERAL", "ADMIN"))
        category, audience = cat_aud
        text = mdfile.read_text(encoding="utf-8")
        first_h1 = next((l for l in text.splitlines() if l.startswith("# ")), "")
        title = first_h1[2:].strip().split(" (")[0]
        added = chunk_sop(text, base_id, category, title)
        for c in added:
            c["audience"] = audience
        chunks.extend(added)
        print(f"  {mdfile.name}: {len(added)} chunks → {category} / {audience}")

    print(f"\n총 SYNTH_SOP 청크: {len(chunks)}")

    # 임베딩 모델
    from sentence_transformers import SentenceTransformer
    print(f"임베딩 모델 로딩...")
    model = SentenceTransformer(EMBED_MODEL_NAME)

    from app.db import init_pool, get_pool
    await init_pool()
    pool = get_pool()

    # 기존 SYNTH_SOP row 제거 후 재 INSERT
    async with pool.acquire() as conn:
        existing = await conn.fetchval(
            'SELECT count(*) FROM public."AI_FAQ" WHERE "SOURCE_TAG"=\'SYNTH_SOP\''
        )
        print(f"기존 SYNTH_SOP {existing}건 삭제 → 재 INSERT")
        await conn.execute(
            'DELETE FROM public."AI_FAQ" WHERE "SOURCE_TAG"=\'SYNTH_SOP\''
        )

    # 배치 임베딩
    texts = [f"{c['question']} {c['answer']}"[:2000] for c in chunks]
    embs = model.encode(texts, batch_size=32, normalize_embeddings=True, show_progress_bar=False)

    async with pool.acquire() as conn:
        async with conn.transaction():
            for c, emb in zip(chunks, embs):
                emb_str = "[" + ",".join(f"{v:.6f}" for v in emb) + "]"
                await conn.execute(
                    'INSERT INTO public."AI_FAQ" '
                    '  ("CATEGORY","QUESTION","ANSWER","EMBEDDING",'
                    '   "STATUS_CD","AUDIENCE_CD","SOURCE_TAG","DELETE_YN","CREATED_BY") '
                    "VALUES ($1,$2,$3,$4::vector,'ACTIVE',$5,'SYNTH_SOP','N','SEED_ADMIN')",
                    c["category"],
                    c["question"],
                    c["answer"],
                    emb_str,
                    c.get("audience", "ADMIN"),
                )

    print(f"\n=== DONE — {len(chunks)} SYNTH_SOP rows inserted ===")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
