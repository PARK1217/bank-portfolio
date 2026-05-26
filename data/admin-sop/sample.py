"""각 JSON 의 구조 + 샘플 1~2 row 출력."""
import json
from pathlib import Path

JSON_DIR = Path(__file__).parent / "json"

for jp in sorted(JSON_DIR.glob("*.json")):
    print(f"\n========== {jp.name} ({jp.stat().st_size:,} B) ==========")
    with open(jp, encoding="utf-8-sig") as f:
        data = json.load(f)
    if isinstance(data, dict):
        print(f"  top-level type=dict, keys={list(data.keys())}")
        for k in list(data.keys())[:5]:
            v = data[k]
            print(f"    {k!r}: {type(v).__name__}", end="")
            if isinstance(v, list):
                print(f" len={len(v)}")
                if v:
                    print(f"      first elem keys: {list(v[0].keys()) if isinstance(v[0], dict) else type(v[0]).__name__}")
                    print(f"      sample: {json.dumps(v[0], ensure_ascii=False)[:400]}")
            else:
                print(f"  value preview: {json.dumps(v, ensure_ascii=False)[:200]}")
    elif isinstance(data, list):
        print(f"  top-level type=list, len={len(data)}")
        if data:
            print(f"  first elem type: {type(data[0]).__name__}, keys: {list(data[0].keys()) if isinstance(data[0], dict) else '-'}")
            print(f"  sample: {json.dumps(data[0], ensure_ascii=False)[:500]}")
