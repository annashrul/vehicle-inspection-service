#!/usr/bin/env python3
"""Non-destructive HTTP latency and PostgreSQL EXPLAIN measurement."""
import argparse, json, statistics, subprocess, time, urllib.request
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument('phase', choices=['before','after'])
p.add_argument('--samples',type=int,default=30)
a=p.parse_args()
result={'phase':a.phase,'samples':a.samples,'warmups':5,'pages':{}}
for page in (1,2000):
    url=f'http://localhost:8080/api/v1/inspections?status=SUBMITTED&limit=20&page={page}'
    times=[]
    for n in range(a.samples+5):
        start=time.perf_counter()
        with urllib.request.urlopen(url) as response:
            body=json.load(response)
        assert body['success'] and len(body['data'])==20, body
        if n>=5: times.append((time.perf_counter()-start)*1000)
    result['pages'][str(page)]={'median_ms':statistics.median(times),'p95_ms':sorted(times)[int(.95*(len(times)-1))], 'min_ms':min(times),'max_ms':max(times),'total':body['meta']['total'],'latencies_ms':times}
    sql=f"EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM inspections WHERE status='SUBMITTED' ORDER BY updated_at DESC,id DESC LIMIT 20 OFFSET {(page-1)*20}; EXPLAIN (ANALYZE, BUFFERS) SELECT count(*) FROM inspections WHERE status='SUBMITTED';"
    output=subprocess.check_output(['docker','compose','exec','-T','postgres','psql','-U','inspection','-d','inspection','-c',sql],text=True)
    Path(f'performance/{a.phase}-page-{page}-explain.txt').write_text(output)
Path(f'performance/{a.phase}.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
