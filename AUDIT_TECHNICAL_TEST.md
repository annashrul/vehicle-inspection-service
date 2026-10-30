# Audit kesesuaian technical test

**Catatan historis:** laporan ini menilai commit `6ae9935` sebelum perbaikan lanjutan. Status penyelesaian terbaru ada di [STATUS_TECHNICAL_TEST.md](STATUS_TECHNICAL_TEST.md).

Tanggal pemeriksaan: 30 Oktober 2026. Acuan: [Technical Test - Fullstack #ASL.pdf](Technical%20Test%20-%20Fullstack%20%23ASL.pdf), termasuk tiga file yang tertanam sebagai lampiran PDF.

**Kesimpulan: fitur wajib utama berfungsi dan pengujian inti lulus, tetapi belum seluruhnya siap sebagai submission versi terbaru.** Temuan utamanya adalah tag pengumpulan yang masih lama, schema OpenAPI audit yang tidak menggambarkan respons aktual, serta suite browser default yang memasukkan tes offline untuk fitur yang belum diaktifkan pada versi GitHub.

## 1. Lingkup yang benar-benar diperiksa

- Versi GitHub `main`: commit `6ae99351bc4179fc92b41e20249411aa67326e8a`.
- Pengujian runtime dilakukan pada clone terpisah `/home/elqantara/Projects/vehicle-inspection-service-fresh-install`, memakai volume database baru. Perubahan lokal project `logique-technical-test` yang belum di-commit tidak dihitung sebagai fitur yang sudah tersedia di GitHub.
- Tag remote `v1.0-submission` adalah annotated tag; objek tag `1023197` menunjuk commit **`c157a80`**, bukan commit `6ae9935`. Nomor objek tag dan nomor commit dibedakan dalam audit ini.
- Tidak ada perbaikan kode, push, atau pemindahan tag dalam audit ini. Berkas baru hanya laporan dan salinan evidence pemeriksaan.
- Seed 50.000 dan benchmark tidak diulang. Bukti historis, konsistensi angka, kode skrip, baseline indeks, dan commit performa diperiksa.

## 2. Temuan yang perlu ditindaklanjuti

### F1 — Tag pengumpulan belum mencakup versi terbaru

**Prioritas: tinggi untuk pengumpulan. Acuan: soal 5.2.** Soal menyatakan isi pada tag `v1.0-submission` yang dinilai. Tag remote masih menunjuk `c157a80`, sedangkan `main` sudah `6ae9935`. Ada enam commit sesudah target tag, termasuk redesign, PWA, tambahan berkas offline, dan perbaikan migrasi.

Ini tidak membuktikan versi lama gagal memenuhi soal. Dampaknya adalah reviewer yang memakai tag tidak akan menilai versi terbaru yang baru diuji. `SUBMISSION.md` juga secara eksplisit menyatakan tag dipertahankan sebagai snapshot awal. Tentukan snapshot final yang hendak dikumpulkan, selesaikan temuan lain, lalu selaraskan tag serta dokumen pengumpulan. Tag tidak dipindahkan otomatis dalam audit.

### F2 — Perintah tes browser default mencakup fitur offline yang belum aktif

**Prioritas: tinggi untuk keandalan verifikasi. Acuan: petunjuk tes README dan kualitas pengujian.** `npx playwright test --list` menemukan **21 tes**: 16 tes form online dan 5 tes offline. Konfigurasi hanya mengecualikan `pwa.spec.ts`, sehingga `offline.spec.ts` ikut pada `npm run test:e2e`/`npx playwright test`.

Pada versi GitHub, `InspectionFormPage.tsx:198` menolak penyimpanan saat `!online`, dan baris 391 menonaktifkan tombol. `main.tsx` tidak memasang `OfflineQueue`. Satu skenario offline CREATED benar-benar diuji pada preview produksi dengan service worker aktif: gagal karena tombol Submit disabled. Pada dev server yang disarankan alur tes umum, service worker juga tidak aktif, padahal tes offline menunggu service worker.

Enam belas tes form online lulus jika dijalankan secara eksplisit dengan `npx playwright test inspection.spec.ts`. Pilih tindakan yang konsisten: tuntaskan dan verifikasi integrasi offline, atau pisahkan tes fitur yang belum didukung dari suite default dan jelaskan lingkupnya. Keberadaan file `offline.ts` sendiri belum membuktikan fitur bisa dipakai.

**Batas interpretasi:** Bagian 3 soal tidak secara eksplisit mewajibkan IndexedDB atau auto-sync browser. E7 backend adalah kewajiban dan lulus verifikasi. Temuan ini adalah ketidaksesuaian suite tes dan fitur tambahan, bukan alasan menyatakan seluruh persyaratan frontend gagal.

### F3 — Schema OpenAPI E8 berbeda dari struktur audit aktual

**Prioritas: menengah, terkait persyaratan wajib. Acuan: soal 2.1, OpenAPI harus sesuai implementasi.** `InspectionResource.java:46` mengembalikan `Envelope<List<Document>>`. Schema `Document` yang dihasilkan berisi properti `documentAsMap` dan `empty`.

Respons aktual E8 berisi `inspection_id`, `action`, `from_status`, `to_status`, `actor`, `at`, dan `meta`. Jadi schema yang dilihat pembaca Swagger atau pembuat client tidak mendokumentasikan field audit yang sebenarnya. Gunakan DTO audit yang eksplisit atau schema OpenAPI khusus sesuai respons.

Selain itu, schema request `Write`, `Transition`, dan `SyncInput` belum menjelaskan field wajib dan batas nilai secara lengkap: misalnya `version` wajib pada PUT, target transisi/status/condition yang sah, dan kewajiban `client_id` pada sync. DTO `Write` yang dipakai bersama POST/PUT perlu dokumentasi terpisah atau anotasi operasi supaya aturan wajib berbeda terlihat. Tes yang ada baru memeriksa keberadaan schema dan resolusi `$ref`; itu belum menguji kesesuaian field/constraint dengan respons dan validasi runtime.

### F4 — Implementasi lokal dan klaim dokumentasi perlu diselaraskan dengan snapshot final

**Prioritas: menengah.** Project lokal masih memiliki perubahan belum di-commit pada `InspectionService.java`, `main.tsx`, `useInspection.ts`, `InspectionFormPage.tsx`, `PwaProvider.tsx`, dan lainnya. Perubahan ini menghubungkan antrean offline, cache IndexedDB, dan UUID pada pembuatan inspeksi E2. Perubahan README lokal menjelaskan fitur tersebut, tetapi belum menjadi isi GitHub `6ae9935`.

README GitHub dan `FRONTEND_REDESIGN.md` masih menyatakan IndexedDB/E7 offline belum aktif; pernyataan itu sesuai runtime GitHub. Namun commit `24eae26` sudah menambahkan berkas antrean, tes offline, dan bukti historis lima tes offline lulus dari snapshot workspace yang berbeda. Bukti itu tidak cukup untuk menyatakan implementasi GitHub saat ini lulus tes offline.

Dokumen tambahan lokal `STATUS_TECHNICAL_TEST.md` masih menyebut konflik dua migrasi V2 dan backend belum diuji ulang; dua catatan itu sudah kedaluwarsa. `SUBMISSION.md` juga masih menyebut migrasi V1/V2, hasil historis empat tes browser pada tabel awal, dan tidak mencatat pemeriksaan clone terbaru. Beberapa bagian sudah berlabel historis, sehingga jangan mengganti angka lama seolah hasil pengukuran baru. Tambahkan ringkasan snapshot final yang jelas dan samakan versi yang dimaksud semua dokumen.

### F5 — Metadata pengumpulan belum lengkap untuk dinyatakan final

**Prioritas: administratif. Acuan: soal 5 dan 7, Lampiran B.** `SUBMISSION.md` masih memakai identitas Git `annashrul`, mengungkapkan bahwa nama lengkap kandidat dan total waktu keseluruhan belum tersedia. Isi informasi sebenarnya sebelum dikirim. Tanggal selesai 28 Oktober juga perlu ditinjau bila snapshot final mencakup perubahan sesudah tanggal tersebut.

Deadline dua hari sejak email diterima, akses reviewer, format subjek email, dan pengiriman email tidak dapat diverifikasi dari repo. Itu tidak dinyatakan gagal; perlu diverifikasi oleh kandidat. Tidak ada email yang dikirim selama audit.

## 3. Matriks kesesuaian persyaratan

| Persyaratan | Penilaian | Dasar pemeriksaan |
|---|---|---|
| Java 21, Quarkus 3, PostgreSQL, MongoDB, Docker Compose, React/TypeScript | Sesuai | pom.xml, Dockerfile, Compose, package.json, runtime |
| E1 daftar 20 kendaraan | Sesuai | Data id 1–20, field sesuai, dimuat lewat migrasi |
| E2 buat DRAFT, HTTP 201, version 1 | Sesuai | JUnit dan pemeriksaan API langsung |
| E3 PUT, seluruh items diganti, version wajib | Sesuai | Tes penggantian menjadi kosong/penuh, stale 409 |
| E4 detail dengan items | Sesuai | Tes API dan reload form browser |
| E5 filter, pagination, meta, updated_at DESC | Sesuai pada skenario diuji | Default 1/10, batas limit, filter dan urutan diverifikasi; tie di kode id DESC |
| E6 transisi, target tak dikenal 400 | Sesuai | Empat transisi sah dan penolakan diuji |
| E7 sync batch | Sesuai pada skenario wajib | Transaksi per item, urutan hasil, HTTP dan payload diverifikasi |
| E8 audit MongoDB, urutan waktu naik | Runtime sesuai; OpenAPI perlu perbaikan | Empat kejadian transisi dan riwayat sync diuji; F3 |
| R1 point/condition/vehicle | Sesuai | 400/404 dan errors[] diverifikasi |
| R2 ENGINE tanpa kunci | Sesuai | Backend dan validasi UI |
| R3 note/foto | Sesuai | Backend, unit schema, form foto |
| R4 transisi sah | Sesuai | DRAFT→SUBMITTED→RECHECK→SUBMITTED→APPROVED dan transisi ilegal |
| R5 kelengkapan 14 titik | Sesuai | Respons berisi tiap field items.<POINT_CODE> yang kurang |
| R6 status editable, stale version, APPROVED final | Sesuai pada skenario diuji | Tes PUT stale, locked status, read-only browser |
| R7 setiap status/sync selain DUPLICATE diaudit | Sesuai pada skenario diuji | Outbox, MongoDB, tes riwayat CREATED/UPDATED/CONFLICT dan tanpa audit DUPLICATE |
| S1 CREATED version 1 | Sesuai | JUnit + API langsung |
| S2 DUPLICATE tanpa perubahan/audit ganda | Sesuai | Payload kanonis, version stabil, audit sekali, tes UUID bersamaan |
| S3 UPDATED version naik 1 | Sesuai | JUnit + API langsung |
| S4 CONFLICT server_version/server_status | Sesuai | Stale, SUBMITTED terkunci, APPROVED pada JUnit |
| S5 satu invalid tidak membatalkan item lain | Sesuai | REJECTED lalu CREATED sesuai urutan |
| Envelope success/error snake_case | Sesuai pada skenario diuji | HTTP 200/201/400/404/409, data/meta/errors |
| Arsitektur resource→service→repository | Tersedia; detail penempatan validasi berbeda | Parsing query di resource; sebagian besar validasi DTO berada di service/Rules, bukan resource sebagaimana redaksi soal |
| Exception mapper, logging JSON, request ID | Sesuai | Implementasi terpusat, header dalam JUnit, log runtime |
| Env dan .env.example, tidak commit .env | Sesuai | Root/frontend example tersedia; .env tidak dilacak Git |
| Migrasi + 20 kendaraan | Sesuai | V1/V2/V3 pada database kosong lulus; konflik V2 telah diperbaiki |
| Readiness PostgreSQL + MongoDB | Sesuai | Health UP untuk kedua koneksi; kegagalan Mongo punya bukti historis |
| Minimal 4 tes backend untuk aturan dan sync | Sesuai | 10 JUnit lulus pada audit, mencakup kelompok wajib |
| Skrip seed asli scripts/seed_via_api.py | Sesuai | SHA-256 identik lampiran PDF, sintaks valid |
| Seed 50.000 via E7, sekitar 90% SUBMITTED | Ada bukti historis yang konsisten | Log 50.000 CREATED/0 gagal; dataset benchmark 45.076 SUBMITTED dari 50.007 total |
| Before/after, page 1 dan 2000, EXPLAIN | Ada bukti historis yang konsisten | 30 sampel/fase, baseline PK/unique, identitas JVM sama |
| Commit terpisah perf: | Sesuai | 74fe2e6 perf: index inspection filters and record before-after measurements |
| Form /inspections/new dan /inspections/:id | Sesuai | Router, tes browser dengan backend nyata |
| Kendaraan, nama inspektur, toggle kunci | Sesuai | Unit dan browser |
| Checklist per section, condition, note, photo_refs | Sesuai | Checklist asli, unit dan browser |
| Validasi klien R2/R3 | Sesuai | ENGINE otomatis NOT_INSPECTABLE; note/foto divalidasi |
| Draft E2/E3, Submit E6, status/version | Sesuai | Integrasi browser melihat POST/PUT/PUT/POST, version dan read-only |
| Custom hook, tipe API, loading/error/toast | Sesuai | useApi/useInspection, types, unit dan tes field-level/409 |
| Responsif 1280/768, npm install/dev, VITE_API_URL | Sesuai | Instalasi clone bersih + browser pada 10 viewport |
| Bonus maksimal satu | Tidak dikerjakan; bukan kekurangan wajib | Tidak ada B1–B4 yang diklaim; PWA bukan bonus formal pada soal |
| Struktur repository | Sesuai | backend/frontend/scripts/checklist/Compose/env/README/SUBMISSION |
| Minimal 6 commit bermakna | Sesuai | 19 commit pada main |
| Tag final pada snapshot terbaru yang hendak dinilai | Belum selaras | F1 |
| README: arsitektur, run, tes, seed, 3 trade-off, AI, asumsi | Substansi tersedia; tes perlu diselaraskan | Audit MongoDB vs PostgreSQL, idempotensi, performa, AI dan asumsi tertulis; F2/F4 |
| SUBMISSION dari template | Ada dan sebagian besar terisi | Struktur template PDF diikuti; F4/F5 |
| Clone bersih dan Docker startup | Lulus lokal | Clone commit GitHub dengan database baru; bukan klaim mesin fisik kedua |

## 4. Hasil pengujian aktual

| Pemeriksaan | Hasil |
|---|---|
| Backend Compose dan migrasi V1–V3 | Berhasil |
| Health backend/PostgreSQL/MongoDB | UP |
| JUnit melalui service tests Docker, DB inspection_test | 10 lulus, 0 gagal/error/skipped |
| Pemeriksaan API tambahan E1–E8/R/S | 34 lulus, 0 gagal |
| TypeScript/Vite build | Berhasil |
| Vitest/RTL | 20 lulus |
| ESLint | Berhasil |
| inspection.spec.ts pada dev server | 16 lulus, termasuk 768/1280 dan integrasi backend |
| pwa.spec.ts pada preview produksi port 5173 | 5 lulus |
| offline.spec.ts, hanya skenario CREATED, preview produksi + API mock | 1 gagal: Submit dinonaktifkan saat offline |
| Perbandingan checklist/seed dengan lampiran asli PDF | Hash identik |
| Hitung ulang median/sampel benchmark historis | Cocok dengan JSON dan SUBMISSION |

Skenario offline lain tidak dijalankan ulang setelah satu kegagalan tersebut dibuktikan dan penyebabnya ditemukan pada kode. Seluruh suite default tidak diklaim lulus. Percobaan awal PWA pada preview port 4173 dihentikan karena origin di luar CORS default; hasil PWA yang dinilai di tabel adalah pengulangan pada port 5173 sesuai README, seluruhnya lulus.

[Evidence audit dan log pengujian](evidence/audit-2026-10-30/README.md).

## 5. Performa dan batas penilaian

| Endpoint SUBMITTED limit=20 | Median sebelum | Median sesudah | p95 sebelum | p95 sesudah |
|---|---:|---:|---:|---:|
| page=1 | 47,77 ms | 24,13 ms | 64,46 ms | 35,13 ms |
| page=2000 | 46,82 ms | 30,87 ms | 61,41 ms | 77,37 ms |

Angka tersebut berasal dari 28 Oktober, bukan pengukuran ulang audit ini. Identitas backend/container/startup before–after sama, masing-masing 30 sampel dengan 5 warmup, dan total filter sama 45.076. Median yang dihitung dari sampel mentah cocok. Baseline tidak memiliki indeks bisnis tambahan selain primary/unique. EXPLAIN query ID menunjukkan Seq Scan + Sort menjadi Index Only Scan.

p95 halaman 2000 memburuk; keterbatasan ini sudah diungkap secara jujur dan bukan alasan menggugurkan seluruh pekerjaan performa. Keyset tidak wajib. Rekomendasinya mempertahankan penjelasan tail latency tersebut, bukan mengklaim semua metrik membaik.

Audit ini tidak membuktikan bebas bug untuk semua input atau semua kondisi kegagalan. Pengujian perangkat fisik, browser selain Chromium, crash lintas database, akses reviewer dan deadline email belum diverifikasi ulang. Kegagalan/pemulihan MongoDB memiliki bukti historis; tidak disimulasikan ulang pada audit ini.

## 6. Urutan penyelesaian yang disarankan

1. Putuskan apakah snapshot final hanya fitur wajib + PWA, atau juga offline browser. Selaraskan implementasi, tes default, dan dokumentasinya.
2. Perbaiki DTO/schema OpenAPI audit serta dokumentasi required/enum request, lalu verifikasi schema terhadap payload nyata.
3. Perbarui ringkasan SUBMISSION dan status lokal berdasarkan commit final, lengkapi identitas dan tanggal/waktu yang sebenarnya.
4. Pastikan perubahan yang hendak dikumpulkan sudah di-commit/push, jalankan verifikasi yang sesuai, lalu selaraskan tag pengumpulan dengan snapshot final yang dipilih.
