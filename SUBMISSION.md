# SUBMISSION

| Item | Isi |
|---|---|
| Nama kandidat | annashrul (identitas Git/GitHub yang tersedia) |
| URL repository | https://github.com/annashrul/vehicle-inspection-service |
| Tag final | `v1.0-submission` |
| Tanggal selesai | 28 Oktober 2026 |
| Total jam kerja | Sesi lanjutan sekitar 1 jam 10 menit (mulai sekitar 14:35 WIB); durasi pengerjaan sebelumnya tidak tersedia, sehingga total keseluruhan tidak diklaim. |

## 1. Cara verifikasi

| Langkah | Perintah / URL |
|---|---|
| Backend + database | `docker compose up --build -d` — http://localhost:8080 |
| OpenAPI / Swagger | `/q/openapi` / `/q/swagger-ui` |
| Health | `http://localhost:8080/q/health` |
| Tes backend dengan Java 21 | `cd backend && ./mvnw test` |
| Tes backend tanpa Java host | Buat `inspection_test` sekali, lalu `docker compose --profile test run --build --rm tests` |
| Seed 50.000 | `python3 scripts/seed_via_api.py --count 50000` |
| Frontend | `cd frontend && npm install && npm run dev` — http://localhost:5173/inspections/new |
| Build frontend | `cd frontend && npm run build` |
| Tes browser | Backend + Vite berjalan, `cd frontend && npx playwright install chromium && npx playwright test` |
| Benchmark | `python3 scripts/benchmark.py before` / `after`; lihat README untuk baseline database baru |

Detail konfigurasi, asumsi, arsitektur dan reproduksi: [README.md](README.md). Bukti command/tes: [evidence](evidence/README.md).

## 2. Status fitur

| Item | Status | Catatan |
|---|---|---|
| E1 GET vehicles | Selesai | 20 kendaraan dari migrasi |
| E2 POST inspections | Selesai | 201, DRAFT, version 1 |
| E3 PUT inspection | Selesai | Replace items, editable + version check |
| E4 GET detail | Selesai | Item checklist dan metadata |
| E5 GET list | Selesai | Filter status/vehicle, page/limit, updated_at DESC/id DESC |
| E6 POST transition | Selesai | Empat transisi sah, invalid 400/409 |
| E7 POST sync | Selesai | Transaksi per item, advisory lock UUID, urutan hasil |
| E8 GET audit | Selesai | MongoDB, urutan at/_id naik |
| R1 validasi point/condition/vehicle | Selesai | 400 errors, kendaraan tidak ada 404 |
| R2 aturan tanpa kunci | Selesai | ENGINE wajib NOT_INSPECTABLE |
| R3 catatan/foto | Selesai | Note dan photo_refs sesuai kondisi |
| R4 transisi sah | Selesai | Transisi ilegal 409 |
| R5 semua 14 titik | Selesai | Error terpisah per titik yang kurang |
| R6 editable/version/APPROVED final | Selesai | PUT stale dan perubahan final ditolak |
| R7 audit append-only | Selesai | Outbox PostgreSQL → MongoDB, retry idempotent |
| S1 CREATED | Selesai | Version 1 |
| S2 DUPLICATE | Selesai | Payload kanonis, tanpa perubahan version/audit |
| S3 UPDATED | Selesai | Base version sesuai, version naik |
| S4 CONFLICT | Selesai | Stale atau status server final/submitted |
| S5 partial failure | Selesai | REJECTED tetap memproses item valid lainnya |
| Health PostgreSQL dan MongoDB | Selesai | Readiness keduanya UP |
| Migrasi database dan index | Selesai | V1/V2 pada database kosong lulus; V2 dan index diuji |
| Tes otomatis minimal 4 | Selesai | 10 tes backend final lulus; 9 tes pada database kosong juga lulus |
| Frontend form inspeksi | Selesai | 4 tes browser: dua viewport, pesan error API, retry koneksi awal |
| Bonus | Tidak | Prioritas pada persyaratan wajib; tidak ada bonus yang diklaim. |

## 3. Performa sebelum dan sesudah

Seed asli berhasil membuat **50.000 inspeksi, 0 gagal, dalam 2.218,0 detik** (sekitar 22,54 inspeksi/detik). Dataset benchmark berisi **50.007 inspeksi**: 50.000 hasil sync dan 7 data form yang dipertahankan; 45.076 SUBMITTED, 4.931 DRAFT, 700.098 item. Outbox pending 0 sebelum pengukuran.

30 request per endpoint setelah 5 warmup; p95 menggunakan lower quantile pada sampel terurut. Berikut median latensi HTTP lokal; p95 dilaporkan terpisah agar variasi tidak disembunyikan.

| Endpoint | Sebelum median (ms) | Sesudah median (ms) | Perubahan median | Ringkasan EXPLAIN query ID |
|---|---|---|---|---|
| SUBMITTED, limit=20, page=1 | 47.77 | 24.13 | turun 49.5% | Seq Scan + Sort 23.243 ms → Index Only Scan 0.155 ms |
| SUBMITTED, limit=20, page=2000 | 46.82 | 30.87 | turun 34.1% | Seq Scan + Sort 28.289 ms → Index Only Scan 10.236 ms |

| Endpoint | p95 sebelum (ms) | p95 sesudah (ms) |
|---|---|---|
| page=1 | 64.46 | 35.13 |
| page=2000 | 61.41 | 77.37 |

**Batas hasil:** median kedua endpoint membaik, tetapi p95 halaman 2000 naik; optimasi ini belum memperbaiki tail latency halaman dalam. OFFSET halaman 2000 masih membaca 40.000 entry index dan exact count tetap memilih Seq Scan karena sekitar 90% data berstatus SUBMITTED. Penyebab variasi p95 belum diprofilkan; angka tidak diulang atau dipilih ulang untuk menyembunyikan hasil tersebut.

Sebelum/sesudah memakai container, image, waktu startup, database dan JVM yang sama (identitas tersimpan di JSON). DDL diterapkan dengan psql setelah baseline, lalu Flyway mencatat V2 pada startup final. Tidak ada index yang dijatuhkan atau data yang dihapus. Bukti mentah: [performance/README.md](performance/README.md), before/after JSON, serta empat berkas EXPLAIN.

## 4. Refleksi

**Q1. Bagian paling berisiko?** Pengiriman audit lintas PostgreSQL dan MongoDB karena tidak ada transaksi atomik lintas database. Outbox dan event ID deterministik mencegah kehilangan kejadian bisnis atau audit ganda pada retry, tetapi pengiriman dapat tertunda saat MongoDB tidak tersedia.

**Q2. Jika punya satu hari tambahan?** Tambahkan simulasi crash tepat setelah MongoDB menerima audit sebelum outbox ditandai delivered, beserta metrik backlog dan alert. Untuk skala data lebih besar, evaluasi keyset pagination dan biaya exact count menggunakan beban yang mewakili produksi.

## 5. Asumsi dan keputusan di luar kontrak

- Payload identik diperiksa sebelum conflict; urutan items/photo_refs diabaikan, point_code ganda ditolak.
- PUT tidak mengubah kendaraan; items tidak dikirim berarti daftar kosong. Sync editable dapat mengubah kendaraan.
- Audit REJECTED tanpa inspeksi dikenal memakai inspection_id null dan client_id pada meta.
- Tie pagination diurutkan id DESC; parameter numerik tidak valid dibalas 400.
- Data pengujian dipertahankan. Test Maven memakai database PostgreSQL/MongoDB terpisah; browser menggunakan aplikasi utama dan menambah inspeksi sintetis.
- Alasan MongoDB dibanding PostgreSQL, strategi konflik, dan trade-off index dijelaskan di README.

## 6. Belum selesai atau keterbatasan

- Seluruh E1–E8, R1–R7, S1–S5 telah diimplementasikan dan diverifikasi. Maven final: 10 tes lulus; browser: 4 tes lulus; build frontend berhasil.
- Simulasi MongoDB berhenti membuktikan readiness 503/DOWN, sync tetap CREATED dengan 1 outbox pending, dan audit muncul sekali setelah pemulihan. PostgreSQL/MongoDB kembali UP.
- Snapshot akhir sesi backend sebelum redesign: 50.010 inspeksi, 700.126 item, 50.010 event audit PostgreSQL dan MongoDB, 50.000 audit seed-script, outbox pending 0. Data tambahan pengujian dipertahankan.
- Tail latency halaman 2000 belum membaik; keyset dan optimasi exact count belum dikerjakan.
- Nama lengkap kandidat dan total jam pengerjaan sebelum sesi lanjutan tidak disediakan; identitas Git dipakai tanpa mengarang data.
- Bonus tidak dikerjakan. Autentikasi, TLS deployment dan kebijakan retensi outbox tidak termasuk lingkup technical test ini.
- Clone bersih pada mesin kedua belum diuji. Startup Compose dan migrasi pada database kosong lokal telah diuji.

## 7. Deklarasi AI

- Tools: OpenAI Codex.
- Bantuan AI: implementasi backend/frontend, tes, troubleshooting Docker, seed/benchmark dan dokumentasi sesi ini.
- Bagian ditulis sendiri oleh kandidat: tidak diklaim untuk hasil generasi sesi ini; kandidat perlu melakukan review dan memahami keputusan desain.
- Contoh kesalahan AI: parsing otomatis query parameter ternyata menghasilkan 404 untuk page nonnumerik, terungkap oleh tes yang mengharapkan 400. Parsing eksplisit ditambahkan, lalu tes dijalankan ulang; schema OpenAPI juga diperiksa karena konfigurasi JSON runtime tidak otomatis menjamin nama schema snake_case.


## Pembaruan frontend setelah submission awal

Redesign berada pada branch main; tag v1.0-submission dipertahankan sebagai snapshot awal. Backend, hasil seed dan benchmark di atas tidak diubah atau diuji ulang untuk mengklaim angka baru. Pengujian integrasi frontend memakai inspeksi sintetis baru dan mempertahankan seluruh data yang sudah ada.

Frontend baru: RHF/Zod, shadcn/ui/Tailwind/Lucide, Accordion multi-open, partial draft, progress valid, navigasi/fokus error, conflict/read-only/error recovery, desktop/tablet/mobile dan PWA shell dengan update terkonfirmasi. Draft lokal IndexedDB/E7 offline belum diaktifkan; alasan dan batas keamanan/konsistensi dijelaskan pada [FRONTEND_REDESIGN.md](FRONTEND_REDESIGN.md).

Verifikasi terbaru: build dan lint berhasil, 20 tes unit, 16 tes browser pada 10 viewport, dan 5 tes PWA lulus. Bukti berada di [evidence/redesign](evidence/redesign/README.md). Pengujian perangkat fisik, browser selain Chromium dan instalasi OS belum dilakukan. Audit runtime bersih; 4 temuan low pada dependency build masih dicatat secara eksplisit.
