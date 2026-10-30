# Vehicle Inspection Service — LOGIQUE

Repository: https://github.com/annashrul/vehicle-inspection-service

Java 21 / Quarkus 3, PostgreSQL 16, MongoDB 7, React + TypeScript. Kontrak berasal dari `Technical Test - Fullstack #ASL.pdf` dan checklist 14 titik yang disertakan. File `Technical_Test_Fullstack_v2_Lite.pdf` tidak tersedia.

## Menjalankan

Prasyarat: Git, Docker Engine dengan daemon aktif, Docker Compose, serta Node.js `^22.12.0`, `^24.0.0`, atau `>=26.0.0` dan npm. Java/Maven di host tidak diperlukan untuk instalasi melalui Docker.

Clone repositori, lalu jalankan backend dan database dari root project:

```bash
git clone https://github.com/annashrul/vehicle-inspection-service.git
cd vehicle-inspection-service
docker info
docker compose version
docker compose up --build -d
docker compose ps -a
curl --retry 30 --retry-delay 2 --retry-all-errors --fail http://localhost:8080/q/health
```

Build pertama mengunduh image dan dependensi Maven. Backend masih memerlukan waktu startup setelah Compose selesai; health check harus menampilkan status `UP` dengan pemeriksaan PostgreSQL dan MongoDB `UP`.

Setelah backend siap, jalankan frontend di terminal terpisah dari root project:

```bash
cd frontend
npm install
npm run dev
```

Port `5432`, `27017`, `8080`, dan `5173` harus tersedia. Jika instalasi lain project ini sedang berjalan, hentikan layanan instalasi tersebut terlebih dahulu agar port tidak bentrok.

Jika backend gagal startup, periksa `docker compose logs --tail=100 backend`. Migrasi Flyway dijalankan otomatis dan memiliki versi unik: V1 membuat skema dan data kendaraan, V2 membuat indeks query, V3 mengisi UUID `client_id` pada inspeksi lama yang belum memilikinya. Versi sebelumnya memiliki dua file V2 sehingga startup gagal dengan `Found more than one migration with version 2`; migrasi UUID kini bernama `V3__offline_client_ids.sql`. Untuk memperbarui instalasi lama, jalankan kembali `docker compose up --build -d` dari kode terbaru. Tidak perlu menghapus volume database atau menjalankan Flyway repair untuk konflik versi ini.

Untuk menghentikan backend dan database tanpa menghapus data:

```bash
docker compose down
```

Hentikan frontend dengan Ctrl+C di terminal Vite.

Buka http://localhost:5173/inspections/new atau `/inspections/:id`. Backend tersedia di http://localhost:8080/api/v1, OpenAPI di `/q/openapi`, Swagger UI di `/q/swagger-ui`.

Konfigurasi lokal ada di `.env.example`; salin ke `.env` jika perlu mengubah nilai Compose. Kredensial contoh hanya untuk development lokal. PostgreSQL dan MongoDB diikat ke loopback. Untuk frontend, salin `frontend/.env.example` ke `frontend/.env` untuk mengganti `VITE_API_URL`. Java/Maven di host tidak diperlukan untuk Compose.

## Pengujian

Dengan Java 21 dan Docker di host:

```bash
cd backend
./mvnw test
```

Quarkus Dev Services membuat database test tersendiri. Alternatif tanpa Java host, gunakan database tambahan di Compose (buat sekali; bila sudah ada, tidak perlu dibuat ulang):

```bash
docker compose exec -T postgres createdb -U inspection inspection_test
docker compose --profile test run --build --rm tests
```

Service `tests` menjalankan `mvn -B test`, memakai PostgreSQL `inspection_test` dan MongoDB `inspection_test`. Tes tidak membersihkan database aplikasi. Bukti hasil aktual dan keterbatasan ada di `SUBMISSION.md` dan `evidence/`.

```bash
cd frontend
npm run build
npx playwright install chromium
npx playwright test
```

Tes browser membutuhkan backend dan Vite yang sudah berjalan. Empat tes browser mencakup pula kegagalan koneksi awal dan tombol coba lagi. Tes membuat inspeksi baru, menguji validasi R2/R3, E2/E3/E6/E4, pesan error API, dan viewport 1280/768.

## Seed dan benchmark

```bash
python3 scripts/seed_via_api.py --count 50000
python3 scripts/benchmark.py before
# Terapkan DDL V2 pada instance yang sama setelah baseline:
# docker compose exec -T postgres psql -U inspection -d inspection < backend/src/main/resources/db/migration/V2__inspection_query_indexes.sql
# Jalankan ANALYZE inspections; lalu:
python3 scripts/benchmark.py after
```

Seed asli memakai API E7, rasio SUBMITTED sekitar 90%, dan menghasilkan UUID baru pada setiap eksekusi: menjalankannya lagi akan menambah 50.000 baris. Tidak ada penghapusan data otomatis.

Untuk mereproduksi baseline dari kode final pada database **baru**, jalankan `FLYWAY_TARGET=1 docker compose up --build -d` sebelum seed. Ukur baseline, hilangkan pengaturan `FLYWAY_TARGET` (termasuk dari `.env` jika diatur di sana), lalu jalankan `docker compose up -d --force-recreate backend` agar V2 dan V3 diterapkan. Jangan menurunkan target pada database yang telah menerapkan V2. Skrip benchmark melakukan 5 warmup dan 30 pengukuran per endpoint, menyimpan median/p95 dan seluruh latensi, serta EXPLAIN ANALYZE BUFFERS untuk query ID dan count. Benchmark tidak menjatuhkan index atau menghapus database.

## Arsitektur dan keputusan

Alur resource → service → repository memisahkan kontrak HTTP dari transaksi dan aturan bisnis. Flyway membuat vehicles, inspections, inspection_items, dan audit_outbox. Item adalah baris checklist, bukan 14 kolom; photo_refs berupa JSONB untuk daftar referensi sederhana. Hibernate imperative dipilih untuk kejelasan transaksi per item, bukan bonus reactive.

1. **Audit MongoDB.** Dokumen audit menyimpan metadata kejadian yang dapat berkembang tanpa mengubah skema transaksi. Dibanding PostgreSQL, ini menambah biaya operasi dan tidak menyediakan commit atomik lintas database. Karena itu kejadian terlebih dahulu ditulis ke outbox PostgreSQL dalam transaksi bisnis yang sama, lalu dispatcher mengirimkannya ke MongoDB; UUID event dan `$setOnInsert` mencegah audit ganda saat retry. Index MongoDB inspection_id/at/_id mendukung pembacaan riwayat. Endpoint audit mengirim pending event untuk inspeksi terkait sebelum membaca riwayat. Outbox yang sudah terkirim dipertahankan.
2. **Idempotensi dan konflik.** Unique client_id plus advisory transaction lock PostgreSQL menserialisasi sync untuk UUID yang sama, termasuk UUID baru. Perbandingan payload kanonis mengabaikan urutan item/foto; identitas diperiksa sebelum version/status sehingga retry persis tidak menaikkan version atau membuat audit. Perubahan editable memerlukan base_version cocok. Setiap item memakai REQUIRES_NEW agar penolakan satu item tidak membatalkan yang lain. Gangguan infrastruktur menghasilkan 500 agar tidak disamarkan sebagai kesalahan validasi.
3. **Performa.** Query ID menggunakan filter dan pagination sebelum fetch item; count terpisah menjaga total benar. Index komposit mendukung filter status dan urutan updated_at/id, tetapi offset halaman dalam tetap memindai baris yang dilewati. Keyset tidak ditambahkan karena kontrak mewajibkan page dan bonus tidak diprioritaskan.

Readiness memeriksa PostgreSQL dan MongoDB. Log JSON mencatat metode/path/status/durasi serta request_id; header X-Request-ID diterima bila formatnya aman atau dibuat otomatis. Aplikasi tidak memerlukan layanan eksternal untuk data checklist.

## Asumsi

- PUT mengganti seluruh items; items yang tidak dikirim berarti kosong. PUT tidak mengganti vehicle_id; sync pada data editable boleh menggantinya.
- Note null/tidak dikirim setara; photo_refs null/tidak dikirim setara daftar kosong. Urutan item/foto tidak memengaruhi identitas; point_code ganda ditolak.
- Scalar wajib tidak boleh kosong; status sync hanya DRAFT/SUBMITTED. Perbandingan duplicate/conflict didahulukan mengikuti urutan kontrak.
- Urutan list menggunakan updated_at DESC, id DESC agar tie deterministik. Parameter filter/pagination tidak valid ditolak.
- Kejadian sync tanpa inspeksi dikenal menyimpan inspection_id null dan client_id di meta.
- Tidak ada autentikasi karena tidak termasuk kontrak; deployment ini untuk technical test lokal.

## Deklarasi AI

Tools: OpenAI Codex. AI membantu meninjau kontrak, melengkapi backend, frontend, tes, skrip benchmark, troubleshooting, dan dokumentasi. Tidak ada klaim bahwa bagian yang dihasilkan dalam sesi ini ditulis manual oleh kandidat; kandidat perlu meninjau dan memahami kode sebelum mengirim.

Contoh koreksi: rencana awal mencatat Docker tidak dapat diakses dan Git tidak tersedia. Pemeriksaan nyata pada lingkungan baru membuktikan daemon dapat diakses dan direktori `.git` kosong dapat diinisialisasi. Catatan tersebut diganti berdasarkan hasil command, dan tes/benchmark hanya diisi setelah dijalankan. Pemeriksaan OpenAPI lanjutan juga menemukan anotasi error global menutupi schema sukses dan menghasilkan referensi yang tidak terdefinisi. Error dipindahkan ke filter setelah scanning, dan tes penelusuran seluruh `$ref` ditambahkan. Perbaikan lain: input foto terkontrol yang langsung memangkas koma menghambat pengetikan banyak nama file; input diperbaiki agar teks dapat diketik sebelum daftar referensi dinormalisasi.


## Redesign frontend (28 Oktober 2026)

Frontend terbaru menggunakan React Hook Form/Zod, Tailwind 4, 17 komponen shadcn/ui, layout adaptive desktop/tablet/mobile, Accordion multi-open, progress valid dan fokus error yang membuka panel tertutup. Kondisi awal kosong dan Save Draft mendukung checklist parsial. Semua endpoint dan JSON backend dipertahankan.

Laporan lengkap, struktur, 10 viewport, aksesibilitas, PWA dan batas offline: [FRONTEND_REDESIGN.md](FRONTEND_REDESIGN.md). Bukti baru dipisahkan di [evidence/redesign](evidence/redesign/README.md); bukti dan benchmark sesi awal tetap historis. Node LTS 22.12/24 atau versi yang sesuai engines diperlukan.

Tes frontend terbaru: `npm run test` (Vitest/RTL), `npm run lint`, `npm run test:e2e`, dan `npm run test:pwa`. PWA memakai `npm run build` lalu `npm run preview -- --port 5173 --strictPort`, dengan backend tetap di 8080. Dev server dan preview tidak dapat memakai port 5173 bersamaan. Tidak ada IndexedDB draft atau sync E7 offline; application shell dapat dibuka offline, sedangkan data inspeksi memerlukan jaringan.
