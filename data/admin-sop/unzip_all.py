"""AI Hub 한글 cp949 인코딩 zip 일괄 추출. leading '/' strip 처리."""
import os, zipfile
from pathlib import Path

ROOT = Path(__file__).parent / "extracted"
OUT = Path(__file__).parent / "json"
OUT.mkdir(exist_ok=True)

# zip → output JSON 매핑
NAMES = {
    "TL_1": "TL_1_span_extraction.json",
    "TL_3": "TL_3_tableqa.json",
    "TL_5": "TL_5_span_extraction_how.json",
    "VL_1": "VL_1_span_extraction.json",
    "VL_5": "VL_5_span_extraction_how.json",
}

for z_path in sorted(ROOT.rglob("*.zip")):
    stem = z_path.stem
    prefix = stem.split(".", 1)[0]  # 'TL_1', 'TL_3', ...
    out_name = NAMES.get(prefix)
    if not out_name:
        print(f"  skip {z_path.name}")
        continue
    out_path = OUT / out_name
    print(f"=== {z_path.name} → {out_path.name} ===")
    with zipfile.ZipFile(z_path) as z:
        for entry in z.namelist():
            if entry.endswith("/"):
                continue
            with z.open(entry) as src, open(out_path, "wb") as dst:
                while True:
                    chunk = src.read(1024 * 1024)
                    if not chunk:
                        break
                    dst.write(chunk)
            break  # 한 zip = 한 json
    sz = out_path.stat().st_size
    print(f"  → {sz:,} bytes")

print(f"\nAll JSON files in: {OUT}")
for p in sorted(OUT.iterdir()):
    print(f"  {p.stat().st_size:>14,} bytes  {p.name}")
