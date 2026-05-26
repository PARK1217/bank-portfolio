"""AI Hub 5종 JSON → 시연용 관리자 챗봇 RAG 청크 생성.

정제 규칙:
- 도메인 키워드 매칭(은행·금융·민원·보안 등) 우선
- context 길이 200~1500자
- 짧은 doc 제외
- TL_5(절차형) 비중 강화 — 직원 SOP 답변에 가장 적합

출력: data/admin-sop/chunks.jsonl
  {audience_cd, category, doc_id, doc_title, doc_source, context, qas: [...]}
"""
import json, re
from pathlib import Path
from collections import Counter

JSON_DIR = Path(__file__).parent / "json"
OUT = Path(__file__).parent / "chunks.jsonl"

# 1차 필터 — 도메인 키워드
DOMAIN_KW = re.compile(
    r"은행|예금|적금|대출|이체|송금|환전|외환|신용|"
    r"금융|증권|보험|투자|상품|약관|"
    r"세무|세금|"
    r"소비자|민원|분쟁|구제|"
    r"개인정보|보안|인증|"
    r"자금세탁|AML|STR|CTR|FATCA|"
    r"비대면|모바일뱅킹|핀테크|결제|카드"
)

# 카테고리 매핑(doc_title 키워드 → ADMIN_SOP 카테고리)
CATEGORY_RULES = [
    (re.compile(r"개인정보|정보보호|프라이버시"), "PRIVACY"),
    (re.compile(r"자금세탁|AML|STR|CTR|FATCA|의심거래|고액"), "AML"),
    (re.compile(r"소비자|민원|분쟁|구제|불완전판매|약관"), "COMPLAINT"),
    (re.compile(r"신용|대출|여신|채권|채무"), "LOAN_OPS"),
    (re.compile(r"외환|환전|FX|국제|해외"), "FX"),
    (re.compile(r"보안|인증|OTP|생체|비대면"), "SECURITY_OPS"),
    (re.compile(r"세무|세금|부가|소득|법인세"), "TAX"),
    (re.compile(r"보험|투자|증권|펀드|자산운용"), "INVEST"),
    (re.compile(r"카드|결제|페이|간편결제"), "PAYMENT"),
    (re.compile(r"은행|예금|적금|이체|송금"), "BANKING_OPS"),
]


def classify(title: str) -> str:
    for pat, cat in CATEGORY_RULES:
        if pat.search(title):
            return cat
    return "GENERAL"


def collect_from(jp: Path, audience: str = "ADMIN", max_chunks_per_cat: int = 350) -> list:
    """파일 1개에서 정제된 청크 리스트 반환."""
    with open(jp, encoding="utf-8-sig") as f:
        data = json.load(f)["data"]

    chunks = []
    per_cat = Counter()
    for doc in data:
        title = doc.get("doc_title", "")
        if not DOMAIN_KW.search(title):
            continue
        cat = classify(title)
        if per_cat[cat] >= max_chunks_per_cat:
            continue

        for p in doc.get("paragraphs", []):
            ctx = (p.get("context") or "").strip()
            ctx = re.sub(r"\s+", " ", ctx)
            if not (200 <= len(ctx) <= 1500):
                continue

            qas = []
            for q in p.get("qas", []) or []:
                question = (q.get("question") or "").strip()
                ans_text = (q.get("answer") or {}).get("text") or ""
                if question and ans_text:
                    qas.append({"question": question, "answer": ans_text.strip()})

            if not qas:
                continue

            chunks.append({
                "audience_cd": audience,
                "category": cat,
                "doc_id": doc.get("doc_id"),
                "doc_title": title.strip(),
                "doc_source": doc.get("doc_source", "").strip(),
                "doc_published": doc.get("doc_published"),
                "context_id": p.get("context_id"),
                "context": ctx,
                "qas": qas,
            })
            per_cat[cat] += 1
            break  # paragraph 1개만 (doc 당 1청크)

        if per_cat[cat] >= max_chunks_per_cat:
            continue

    print(f"  {jp.name}: kept={len(chunks):,}  / per-category:")
    for k, v in per_cat.most_common():
        print(f"    {v:>4}  {k}")
    return chunks


# TL_5 (절차형) 가 직원 SOP 에 핵심 → 더 많이
# TL_1 (정답경계) 일반 본문
# TL_3 (테이블) 보너스
# VL_* 추가 다양성
out_chunks = []
for jp, cap in [
    (JSON_DIR / "TL_5_span_extraction_how.json", 400),
    (JSON_DIR / "TL_1_span_extraction.json", 300),
    (JSON_DIR / "TL_3_tableqa.json", 200),
    (JSON_DIR / "VL_5_span_extraction_how.json", 150),
    (JSON_DIR / "VL_1_span_extraction.json", 100),
]:
    print(f"\n=== {jp.name} (cap={cap}) ===")
    out_chunks.extend(collect_from(jp, max_chunks_per_cat=cap))

# 중복 제거 (doc_id + context_id 단위)
seen = set()
deduped = []
for c in out_chunks:
    key = (c["doc_id"], c["context_id"])
    if key in seen:
        continue
    seen.add(key)
    deduped.append(c)

print(f"\n=== TOTAL: {len(deduped):,} chunks (after dedup) ===")
cat_dist = Counter(c["category"] for c in deduped)
for k, v in cat_dist.most_common():
    print(f"  {v:>5}  {k}")

with open(OUT, "w", encoding="utf-8") as f:
    for c in deduped:
        f.write(json.dumps(c, ensure_ascii=False) + "\n")
print(f"\n→ {OUT} ({OUT.stat().st_size:,} bytes)")
