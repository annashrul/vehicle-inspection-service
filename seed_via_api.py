#!/usr/bin/env python3
"""Seed data inspeksi lewat endpoint sync (E7).
Tidak bergantung pada skema database kandidat.

Hanya memakai library standar Python 3.8+. Contoh:

    python3 scripts/seed_via_api.py --count 50000
    python3 scripts/seed_via_api.py --count 1000 \
        --base-url http://localhost:8080 --batch-size 100

Syarat: backend berjalan, 20 kendaraan (id 1-20) sudah ada, dan E7 mengikuti kontrak.
Skrip ini bukan bagian dari penilaian.
Hasil throughput di akhir boleh dipakai di SUBMISSION.md.
"""
import argparse
import json
import random
import sys
import time
import urllib.error
import urllib.request
import uuid

CAR_POINTS = [
    ("EXT_FRONT", "EXTERIOR"), ("EXT_FRONT_RIGHT", "EXTERIOR"),
    ("EXT_REAR_RIGHT", "EXTERIOR"), ("EXT_REAR", "EXTERIOR"),
    ("EXT_REAR_LEFT", "EXTERIOR"), ("EXT_FRONT_LEFT", "EXTERIOR"),
    ("EXT_ROOF", "EXTERIOR"), ("INT_DRIVER_AREA", "INTERIOR"),
    ("INT_FRONT_PASSENGER", "INTERIOR"),
    ("INT_REAR_DRIVER_SIDE", "INTERIOR"), ("INT_REAR_PASSENGER_SIDE", "INTERIOR"),
    ("INT_TRUNK", "INTERIOR"), ("ENG_STARTUP", "ENGINE"), ("ENG_BAY", "ENGINE"),
]
NAMES = ["Rina", "Budi", "Sari", "Andi", "Dewi", "Fajar", "Maya", "Rudi"]


def make_inspection(rng, status):
    has_key = rng.random() > 0.1
    items = []
    for code, section in CAR_POINTS:
        if section == "ENGINE" and not has_key:
            items.append({"point_code": code, "condition": "NOT_INSPECTABLE",
                          "note": "Kunci tidak tersedia", "photo_refs": []})
            continue
        cond = rng.choices(["GOOD", "MINOR_DAMAGE", "MAJOR_DAMAGE"],
                           weights=[80, 15, 5])[0]
        item = {"point_code": code, "condition": cond, "note": None, "photo_refs": []}
        if cond == "MINOR_DAMAGE":
            item["note"] = "Lecet ringan"
        if cond == "MAJOR_DAMAGE":
            item["note"] = "Kerusakan besar"
            item["photo_refs"] = ["photo-%s.jpg" % uuid.uuid4().hex[:8]]
        items.append(item)
    return {
        "client_id": str(uuid.uuid4()),
        "base_version": None,
        "vehicle_id": rng.randint(1, 20),
        "inspector_name": rng.choice(NAMES),
        "has_key": has_key,
        "status": status,
        "items": items,
    }


def post(url, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST",
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, {"raw": e.read().decode(errors="replace")}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", default="http://localhost:8080")
    ap.add_argument("--count", type=int, default=50000)
    ap.add_argument("--batch-size", type=int, default=200)
    ap.add_argument("--submitted-ratio", type=float, default=0.9)
    ap.add_argument("--seed", type=int, default=42)
    a = ap.parse_args()

    rng = random.Random(a.seed)
    url = a.base_url.rstrip("/") + "/api/v1/inspections/sync"
    done = created = failed = 0
    t0 = time.time()
    while done < a.count:
        n = min(a.batch_size, a.count - done)
        batch = []
        for _ in range(n):
            st = "SUBMITTED" if rng.random() < a.submitted_ratio else "DRAFT"
            batch.append(make_inspection(rng, st))
        status, resp = post(url, {"device_id": "seed-script", "inspections": batch})
        if status != 200:
            print("Gagal di batch mulai %d: HTTP %s %s"
                  % (done, status, str(resp)[:300]))
            sys.exit(1)
        results = (resp.get("data") or {}).get("results", [])
        for r in results:
            if r.get("result") == "CREATED":
                created += 1
            else:
                failed += 1
        done += n
        if done % (a.batch_size * 10) == 0 or done == a.count:
            print("%d/%d  dibuat=%d  tidak-dibuat=%d  %.0f inspeksi/detik" %
                  (done, a.count, created, failed, done / max(time.time() - t0, 0.001)))
    print("Selesai dalam %.1f detik. Dibuat: %d, tidak dibuat: %d"
          % (time.time() - t0, created, failed))
    if failed:
        print("Ada item yang tidak berstatus CREATED.")
        print("Periksa implementasi E7 atau validasi Anda.")
        sys.exit(2)


if __name__ == "__main__":
    main()
