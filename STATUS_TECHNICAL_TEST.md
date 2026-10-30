# Status technical test 30 Oktober 2026

Kandidat: **annashrul yusuf**. Durasi pengerjaan yang dikonfirmasi kandidat: **2 hari**; jam efektif tidak dirinci. Acuan: `Technical Test - Fullstack #ASL.pdf` dan lampiran aslinya. Dokumen ini menggantikan status pengembangan 29 Oktober; log lama tetap menjadi bukti historis.

## Implementasi saat ini

| Kelompok | Implementasi |
|---|---|
| E1–E8 | Kendaraan, CRUD inspeksi yang diwajibkan, list/filter/pagination, transisi, sync batch dan audit MongoDB |
| R1–R7 | Validasi checklist/kondisi/kendaraan, aturan kunci/catatan/foto, kelengkapan 14 titik, status/version dan audit |
| S1–S5 | CREATED, DUPLICATE, UPDATED, CONFLICT dan REJECTED dengan transaksi per item dan UUID tetap |
| Operasional | Java 21/Quarkus 3, PostgreSQL 16, MongoDB 7, Compose, readiness dua database, logging JSON/request ID |
| Migrasi | V1 skema/20 kendaraan; V2 indeks; V3/V4 backfill UUID lama. E2 baru langsung memberi UUID |
| OpenAPI | DTO AuditEntry sesuai field respons; schema POST/PUT terpisah, field wajib dan enum didokumentasikan |
| Frontend wajib | Form new/detail, custom hook, validasi R2/R3, draft/submit, status/version, error/toast, loading dan responsif |
| Tambahan offline | PWA, IndexedDB, cache kendaraan/detail, simpan eksplisit, antrean E7, retry UUID tetap, konflik mempertahankan data lokal |
| Performa | Seed dan benchmark historis 50.000 data, commit perf terpisah, before/after serta EXPLAIN tersedia |
| Bonus formal B1–B4 | Tidak diklaim; PWA/offline adalah tambahan, bukan bonus formal soal |

## Penyesuaian setelah audit

| Temuan | Penyelesaian |
|---|---|
| F1 tag snapshot lama | Snapshot final dan arsip tag awal diselaraskan setelah seluruh verifikasi selesai; periksa tag remote untuk commit yang dikumpulkan |
| F2 suite offline tidak tersambung | OfflineQueue, IndexedDB dan handler form diaktifkan; Playwright membangun dan menjalankan preview produksi otomatis |
| F3 schema audit berbeda | Endpoint E8 memakai DTO AuditEntry; tes membandingkan schema, required/enum, dan field respons aktual |
| F4 dokumentasi/workspace berbeda | README, SUBMISSION, panduan, status dan laporan redesign diperbarui. Evidence lama tetap berlabel historis |
| F5 identitas/durasi | Nama lengkap dan durasi 2 hari diisi sesuai konfirmasi kandidat |

## Verifikasi

| Pemeriksaan aktual | Hasil |
|---|---|
| Backend, database test baru, V1–V4 | 11 tes lulus, 0 gagal/error/skipped |
| Unit frontend | 20 tes lulus |
| ESLint | Lulus |
| Build produksi dan seluruh browser suite | 29 tes lulus, 0 gagal/skip/retry |
| Form online/viewport | 16 tes lulus |
| Offline API simulasi | 5 tes lulus |
| Offline backend nyata | 3 tes lulus |
| PWA | 5 tes lulus |


Hasil akhir pengujian dan laporan browser disimpan di [evidence/verification](evidence/verification/README.md). Pemeriksaan mencakup backend pada database test terpisah, build produksi, lint/unit, form online, PWA, lima skenario offline dengan API simulasi, dan tiga skenario offline dengan backend nyata.

Tiga skenario backend nyata menguji: respons sync hilang lalu retry DUPLICATE tanpa audit ganda; draft E2 diperbarui offline dengan UUID/id yang sama; serta konflik versi yang tidak menimpa server dan mempertahankan data lokal. Tes sentuh juga memeriksa target toggle kunci minimal 44px.

Cara menjalankan seluruh suite: ikuti [README bagian Pengujian](README.md#pengujian). Backend harus berjalan; hentikan server frontend lain di 5173. Playwright menyiapkan preview produksi sendiri dan menjalankan seluruh tes tanpa mengecualikan skenario offline/PWA.

## Bukti historis dan batasan

- Seed asli: 50.000 CREATED, 0 gagal, 2.218 detik; file skrip dan checklist identik dengan lampiran tertanam PDF.
- Median HTTP SUBMITTED halaman 1: 47,77 → 24,13 ms; halaman 2000: 46,82 → 30,87 ms. p95 halaman 2000 memburuk 61,41 → 77,37 ms dan tetap diungkapkan. Bukti: [performance](performance/README.md).
- Seed/benchmark tidak dijalankan ulang untuk perubahan offline/OpenAPI ini. Angka tersebut bukan klaim pengukuran versi baru.
- Laporan audit [AUDIT_TECHNICAL_TEST.md](AUDIT_TECHNICAL_TEST.md) menilai commit 6ae9935 sebelum perbaikan; jangan memakainya sebagai status kegagalan versi terbaru.
- Draft harus disimpan secara eksplisit. Auto-sync berjalan saat aplikasi terbuka; data blocked tetap tersimpan untuk ditinjau. Browser/perangkat lain tidak mendapatkan IndexedDB perangkat ini secara otomatis.
- Pengujian memakai Chromium dan mesin lokal. Browser lain, pemasangan OS/perangkat fisik, dan mesin fisik kedua belum diuji.
- Akses reviewer, waktu penerimaan email/deadline, dan pengiriman email tetap perlu diperiksa kandidat. Tidak ada email yang dikirim oleh agent.
