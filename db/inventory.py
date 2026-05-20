import json, urllib.request
d = json.loads(urllib.request.urlopen('http://localhost:8001/openapi.json').read())
items = [(m.upper(), p) for p, ms in d.get('paths', {}).items() for m in ms.keys()]
items.sort(key=lambda x: x[1])
print(f'TOTAL {len(items)}')
prev = ''
for m, p in items:
    parts = p.split('/')
    head = parts[2] if p.startswith('/api/') and len(parts) > 2 else (parts[1] if len(parts) > 1 else p)
    if head != prev:
        print(f'\n[{head}]')
        prev = head
    print(f'  {m:7s} {p}')