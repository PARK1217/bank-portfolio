"""각 JSON 의 doc_class, doc_source, 키워드 분포 + qas 형식 확인."""
import json, re
from pathlib import Path
from collections import Counter

JSON_DIR = Path(__file__).parent / "json"

# 시연용 — 직원 챗봇에 유용한 키워드 (금융·은행·대출·민원·보안·소비자보호)
KEYWORDS = re.compile(
    r"은행|예금|대출|이체|송금|환전|외환|신용|적금|"
    r"금융|증권|보험|투자|상품|약관|"
    r"세무|세금|부가가치세|소득세|"
    r"소비자|민원|분쟁|구제|"
    r"개인정보|보안|인증|신원|"
    r"자금세탁|AML|STR|CTR|FATCA|"
    r"비대면|모바일뱅킹|핀테크"
)

for jp in sorted(JSON_DIR.glob("*.json")):
    print(f"\n===== {jp.name} =====")
    with open(jp, encoding="utf-8-sig") as f:
        d = json.load(f)
    data = d.get("data", [])
    print(f"  총 문서: {len(data):,}")

    cls = Counter(doc["doc_class"]["class"] for doc in data if doc.get("doc_class"))
    code = Counter(doc["doc_class"]["code"] for doc in data if doc.get("doc_class"))
    src = Counter(doc.get("doc_source") for doc in data)

    # 키워드 매칭 문서 수
    hit = sum(1 for doc in data if KEYWORDS.search(doc.get("doc_title", "")))

    # 청크(paragraph) 통계
    paras = sum(len(doc.get("paragraphs", [])) for doc in data)
    avg_ctx_len = 0
    qas_per_para = 0
    sample_qas = None
    para_sample_count = 0
    for doc in data[:1000]:
        for p in doc.get("paragraphs", []):
            avg_ctx_len += len(p.get("context", ""))
            qas_per_para += len(p.get("qas", []))
            para_sample_count += 1
            if sample_qas is None and p.get("qas"):
                sample_qas = p["qas"][0]
    if para_sample_count:
        avg_ctx_len //= para_sample_count
        qas_per_para = round(qas_per_para / para_sample_count, 2)

    print(f"  paragraph 수: {paras:,}")
    print(f"  평균 context 길이: ~{avg_ctx_len}자")
    print(f"  qas/paragraph 평균: {qas_per_para}")
    print(f"  키워드(금융·은행·민원·보안 등) 매칭 doc_title: {hit:,} ({hit*100//max(1,len(data))}%)")
    print(f"  doc_class 상위 5:")
    for k, v in cls.most_common(5):
        print(f"    {v:>6,}  {k}")
    print(f"  doc_class.code 상위 5:")
    for k, v in code.most_common(5):
        print(f"    {v:>6,}  {k}")
    print(f"  doc_source 상위 5:")
    for k, v in src.most_common(5):
        print(f"    {v:>6,}  {k}")
    if sample_qas:
        print(f"  qas 샘플: {json.dumps(sample_qas, ensure_ascii=False)[:300]}")
