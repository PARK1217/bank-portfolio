"""chunks.jsonl 통계 + 샘플 출력."""
import json
from pathlib import Path
from collections import Counter

CHUNKS = Path(__file__).parent / "chunks.jsonl"

cat = Counter()
src = Counter()
ctx_lens = []
qas_counts = []
total = 0

with open(CHUNKS, encoding="utf-8") as f:
    for line in f:
        d = json.loads(line)
        cat[d["category"]] += 1
        src[d["doc_source"]] += 1
        ctx_lens.append(len(d["context"]))
        qas_counts.append(len(d.get("qas", [])))
        total += 1

print(f"총 청크: {total:,}")
print(f"평균 context 길이: {sum(ctx_lens) // len(ctx_lens)} 자")
print(f"평균 qas/chunk: {sum(qas_counts) / len(qas_counts):.2f}")
print(f"\n카테고리 분포:")
for k, v in cat.most_common():
    bar = "#" * (v // 100)
    print(f"  {v:>5}  {k:<20} {bar}")
print(f"\n출처 Top 10:")
for k, v in src.most_common(10):
    print(f"  {v:>5}  {k}")
