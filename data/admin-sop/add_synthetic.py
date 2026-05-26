"""합성 SOP markdown 10개를 청크화해서 chunks.jsonl 에 추가."""
import json, re
from pathlib import Path

SOP_DIR = Path(__file__).parent / "synthetic"
OUT = Path(__file__).parent / "chunks.jsonl"

CATEGORY_MAP = {
    "01-kyc-cdd":           "KYC",
    "02-aml-str":           "AML",
    "03-voice-phishing":    "VOICE_PHISHING",
    "04-complaint-handling":"COMPLAINT",
    "05-lost-fraud":        "SECURITY_OPS",
    "06-settlement-failure":"SYSTEM_OPS",
    "07-credit-loan-ops":   "LOAN_OPS",
    "08-privacy-security":  "PRIVACY",
    "09-foreign-exchange":  "FX",
    "10-system-ops":        "SYSTEM_OPS",
    "11-deposit-termination": "DEPOSIT_OPS",
}


def chunk_sop(text: str, base_id: str, category: str, title: str) -> list:
    """## 헤더 단위로 분할. 1 청크 = 1 섹션 (너무 길면 split)."""
    sections = []
    current_h2 = title  # 처음 ## 가 없는 시작 부분은 doc title 사용
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
        # 너무 길면 1500자 단위 split
        for k in range(0, len(body), 1400):
            piece = body[k:k + 1500]
            if len(piece) < 100:
                continue
            out.append({
                "audience_cd": "ADMIN",
                "category": category,
                "doc_id": f"SOP_{base_id}",
                "doc_title": f"{title} — {sec_title}",
                "doc_source": "다온뱅크 내부 SOP (합성)",
                "doc_published": "20260526",
                "context_id": f"SOP_{base_id}_{i}_{k}",
                "context": piece,
                "qas": [],   # 합성 SOP 는 QA pair 없음
            })
    return out


added = []
for mdfile in sorted(SOP_DIR.glob("*.md")):
    base_id = mdfile.stem  # '01-kyc-cdd'
    category = CATEGORY_MAP.get(base_id, "GENERAL")
    text = mdfile.read_text(encoding="utf-8")
    # 첫 줄 # title 추출
    first_h1 = next((l for l in text.splitlines() if l.startswith("# ")), "")
    title = first_h1[2:].strip().split(" (")[0]  # "KYC·CDD 본인확인 표준 절차"
    chunks = chunk_sop(text, base_id, category, title)
    added.extend(chunks)
    print(f"  {mdfile.name}: {len(chunks)} chunks → {category}")

# append to chunks.jsonl
with open(OUT, "a", encoding="utf-8") as f:
    for c in added:
        f.write(json.dumps(c, ensure_ascii=False) + "\n")

# Count total
with open(OUT, encoding="utf-8") as f:
    total = sum(1 for _ in f)
print(f"\n→ {OUT.name}: total {total:,} chunks now")
