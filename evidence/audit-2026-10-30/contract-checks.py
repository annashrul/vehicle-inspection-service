import json, uuid, urllib.request, urllib.error, pathlib
BASE='http://localhost:8080/api/v1'
checks=[]
def call(method,path,payload=None):
    data=None if payload is None else json.dumps(payload).encode()
    req=urllib.request.Request(BASE+path,data=data,headers={'Content-Type':'application/json'},method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as r: return r.status,json.load(r)
    except urllib.error.HTTPError as e: return e.code,json.load(e)
def expect(label,condition,detail=None):
    checks.append({'check':label,'passed':bool(condition),'detail':detail})
def draft(**extra): return {'vehicle_id':1,'inspector_name':'Audit 2026-10-30','has_key':True,'items':[],**extra}
def sync(items):
    status,body=call('POST','/inspections/sync',{'device_id':'audit-contract','inspections':items})
    assert status==200,body
    return body['data']['results']
points=json.load(open('/home/elqantara/Projects/vehicle-inspection-service-fresh-install/checklist.json'))['vehicle_types']['CAR']
items=[{'point_code':p['point_code'],'condition':'GOOD','note':None,'photo_refs':[]} for p in points]
s,b=call('GET','/vehicles'); expect('E1: 20 kendaraan, id 1..20',s==200 and [v['id'] for v in b['data']]==list(range(1,21)))
s,b=call('POST','/inspections',draft()); i=b['data']; ident=i['id']; expect('E2: DRAFT version 1',s==201 and i['status']=='DRAFT' and i['version']==1)
s,b=call('POST',f'/inspections/{ident}/transition',{'to':'SUBMITTED','actor':'audit'}); expect('R5: 14 error untuk titik kosong',s==400 and {e['field'] for e in b['errors']}=={'items.'+p['point_code'] for p in points})
s,b=call('PUT',f'/inspections/{ident}',draft(items=items,version=1)); expect('E3: replace items, version 2',s==200 and b['data']['version']==2 and len(b['data']['items'])==14)
s,b=call('PUT',f'/inspections/{ident}',draft(items=[],version=1)); expect('R6: stale PUT ditolak 409',s==409)
s,b=call('GET',f'/inspections/{ident}'); expect('E4: PUT stale tidak mengubah data',s==200 and len(b['data']['items'])==14 and b['data']['version']==2)
s,b=call('PUT',f'/inspections/{ident}',draft(version=2)); expect('E3: PUT mengganti seluruh items menjadi kosong',s==200 and b['data']['items']==[] and b['data']['version']==3)
s,b=call('PUT',f'/inspections/{ident}',draft(items=items,version=3)); assert s==200
for target in ['SUBMITTED','RECHECK','SUBMITTED','APPROVED']:
 s,b=call('POST',f'/inspections/{ident}/transition',{'to':target,'actor':'audit','note':'contract probe'})
 expect('R4: transisi ke '+target,s==200 and b['data']['status']==target)
s,b=call('PUT',f'/inspections/{ident}',draft(version=8)); expect('R6: APPROVED final',s==409)
s,b=call('POST',f'/inspections/{ident}/transition',{'to':'DRAFT','actor':'audit'}); expect('R4: APPROVED ke DRAFT ditolak',s==409)
s,b=call('GET',f'/inspections/{ident}/audit'); expect('R7/E8: 4 audit status berurut',s==200 and len(b['data'])==4 and [e['at'] for e in b['data']]==sorted(e['at'] for e in b['data']))
audit_sample=b
for label,payload,status in [
 ('R1: vehicle tidak ada',draft(vehicle_id=999999),404),
 ('R1: point dan condition invalid',draft(items=[{'point_code':'BAD','condition':'BAD'}]),400),
 ('R2: ENGINE tanpa kunci',draft(has_key=False,items=[{'point_code':'ENG_BAY','condition':'GOOD'}]),400),
 ('R3: NOT_INSPECTABLE tanpa note',draft(items=[{'point_code':'EXT_FRONT','condition':'NOT_INSPECTABLE'}]),400),
 ('R3: MAJOR_DAMAGE tanpa foto',draft(items=[{'point_code':'EXT_FRONT','condition':'MAJOR_DAMAGE'}]),400)]:
 s,b=call('POST','/inspections',payload); expect(label,s==status and not b['success'] and bool(b['errors']))
client=str(uuid.uuid4()); x=draft(client_id=client,status='DRAFT',base_version=None)
r=sync([x])[0]; sid=r['inspection_id']; expect('S1: CREATED version 1',r['result']=='CREATED' and r['server_version']==1)
r=sync([x])[0]; expect('S2: DUPLICATE',r['result']=='DUPLICATE' and r['server_version']==1)
s,b=call('GET',f'/inspections/{sid}/audit'); expect('S2: tanpa audit ganda',len(b['data'])==1)
x.update(base_version=1,inspector_name='Audit update'); r=sync([x])[0]; expect('S3: UPDATED version 2',r['result']=='UPDATED' and r['server_version']==2)
x['inspector_name']='Audit stale'; r=sync([x])[0]; expect('S4: CONFLICT mencakup server_status/version',r['result']=='CONFLICT' and r['server_status']=='DRAFT' and r['server_version']==2)
x.update(base_version=2,status='SUBMITTED',items=items); r=sync([x])[0]; expect('Sync SUBMITTED lengkap berhasil',r['result']=='UPDATED')
x['inspector_name']='Change locked'; x['base_version']=r['server_version']; r=sync([x])[0]; expect('Sync server SUBMITTED terkunci',r['result']=='CONFLICT' and r['server_status']=='SUBMITTED')
invalid=draft(client_id=str(uuid.uuid4()),status='DRAFT',items=[{'point_code':'BAD','condition':'GOOD'}]); valid=draft(client_id=str(uuid.uuid4()),status='DRAFT')
r=sync([invalid,valid]); expect('S5: REJECTED lalu CREATED dalam urutan request',[e['result'] for e in r]==['REJECTED','CREATED'])
s,b=call('POST','/inspections/sync',{'device_id':'audit'}); expect('Sync tanpa inspections: 400',s==400)
s,b=call('GET','/inspections?status=APPROVED&vehicle_id=1&page=1&limit=2'); expect('E5: filter, meta, urutan updated_at',s==200 and b['meta']['page']==1 and b['meta']['limit']==2 and all(v['vehicle_id']==1 and v['status']=='APPROVED' for v in b['data']) and [v['updated_at'] for v in b['data']]==sorted([v['updated_at'] for v in b['data']],reverse=True))
s,b=call('GET','/inspections'); expect('E5: default page 1 limit 10',s==200 and b['meta']['page']==1 and b['meta']['limit']==10)
for suffix in ['limit=101','page=0','page=bad','status=BAD']:
 s,b=call('GET','/inspections?'+suffix); expect('E5 invalid '+suffix,s==400 and not b['success'])
pathlib.Path('/tmp/logique-audit-contract.json').write_text(json.dumps({'checks':checks,'passed':sum(c['passed'] for c in checks),'failed':sum(not c['passed'] for c in checks),'sample_audit_response':audit_sample},indent=2))
print(json.dumps({'passed':sum(c['passed'] for c in checks),'failed':[c for c in checks if not c['passed']],'audit_fields':list(audit_sample['data'][0])},indent=2))
