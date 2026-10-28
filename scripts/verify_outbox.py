#!/usr/bin/env python3
"""Verify durable Mongo delivery across a temporary Mongo service outage (no data deletion)."""
import json, subprocess, time, urllib.request, urllib.error, uuid
from pathlib import Path
base='http://localhost:8080'
def api(path,body=None):
    request=urllib.request.Request(base+path,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(request,timeout=60) as response: return json.load(response)
record={'client_id':str(uuid.uuid4()),'vehicle_id':1,'inspector_name':'Outbox recovery test','has_key':True,'status':'DRAFT','items':[]}
result={}
try:
    subprocess.run(['docker','compose','stop','mongo'],check=True)
    try:
        api('/q/health/ready')
        raise AssertionError('Readiness should fail while MongoDB is stopped')
    except urllib.error.HTTPError as error:
        assert error.code==503,error.code
        result['readiness_during_outage']=json.load(error)
        assert result['readiness_during_outage']['status']=='DOWN'
    response=api('/api/v1/inspections/sync',{'device_id':'outage-test','inspections':[record]})
    item=response['data']['results'][0]
    assert item['result']=='CREATED',response
    result['during_outage']=response
    pending=subprocess.check_output(['docker','compose','exec','-T','postgres','psql','-U','inspection','-d','inspection','-Atc',f"select count(*) from audit_outbox where inspection_id={item['inspection_id']} and delivered_at is null"],text=True).strip()
    assert pending=='1',pending
    result['pending_during_outage']=int(pending)
finally:
    subprocess.run(['docker','compose','start','mongo'],check=True)
for n in range(60):
    try:
        history=api(f"/api/v1/inspections/{item['inspection_id']}/audit")
        if len(history['data'])==1: break
    except (urllib.error.URLError, TimeoutError): pass
    time.sleep(1)
else: raise RuntimeError('Audit was not recovered')
result['after_recovery']=history
assert history['data'][0]['action']=='SYNC_CREATED'
Path('evidence/outbox-recovery.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
