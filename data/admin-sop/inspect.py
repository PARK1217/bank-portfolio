import zipfile, sys
from pathlib import Path

root = Path(__file__).parent / "extracted"
for z_path in sorted(root.rglob("*.zip")):
    print(f"=== {z_path.name} ({z_path.stat().st_size:,} bytes) ===")
    with zipfile.ZipFile(z_path) as z:
        names = z.namelist()
        print(f"  total entries: {len(names)}")
        for n in names[:5]:
            try:
                decoded = n.encode("cp437").decode("cp949")
            except UnicodeDecodeError:
                decoded = n
            info = z.getinfo(n)
            print(f"    {info.file_size:>14,} bytes  {decoded!r}")
        if len(names) > 5:
            print(f"    ... ({len(names) - 5} more)")
