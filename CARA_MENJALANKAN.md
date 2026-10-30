# Panduan Menjalankan Aplikasi

Aplikasi inspeksi kendaraan ini menggunakan React + TypeScript untuk frontend, Java 21 / Quarkus untuk backend, PostgreSQL 16 untuk data utama, dan MongoDB 7 untuk audit.

Panduan ini menjalankan backend dan database melalui Docker Compose, serta frontend melalui npm. Jalankan perintah dari folder utama proyek kecuali disebutkan lain.

## 1. Prasyarat

Siapkan:

- Docker dengan daemon aktif dan plugin Docker Compose (`docker compose`).
- Node.js sesuai `frontend/package.json`: `^22.12.0 || ^24.0.0 || >=26.0.0`, beserta npm.
- Koneksi internet untuk mengunduh image Docker dan dependency saat pertama kali menjalankan.

Java dan Maven di komputer tidak diperlukan untuk cara menjalankan melalui Docker ini.

Periksa instalasi:

```bash
docker info
docker compose version
node --version
npm --version
```

Pastikan port `5432`, `27017`, `8080`, dan `5173` tersedia.

## 2. Konfigurasi Environment

Untuk pertama kali, salin konfigurasi contoh berikut. Lewati perintah salin jika file tujuan sudah ada agar konfigurasi sendiri tidak tertimpa.

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

Nilai bawaan sudah dapat dipakai untuk development lokal. Konfigurasi utama di `.env`:

```dotenv
POSTGRES_USER=inspection
POSTGRES_PASSWORD=inspection_local
CORS_ORIGINS=http://localhost:5173
FLYWAY_TARGET=latest
```

Konfigurasi frontend di `frontend/.env`:

```dotenv
VITE_API_URL=http://localhost:8080
```

Compose mengatur alamat koneksi database backend ke nama service internal `postgres` dan `mongo`. Variabel `JDBC_URL`, `MONGODB_URI`, dan `MONGODB_DATABASE` dalam `.env.example` tidak menggantikan nilai koneksi yang sudah ditentukan dalam `docker-compose.yml`.

## 3. Jalankan Backend dan Database — Terminal Pertama

Dari folder utama proyek:

```bash
docker compose up --build -d
docker compose ps
```

Proses pertama memerlukan waktu untuk mengunduh image, dependency Maven, dan membangun backend. PostgreSQL dan MongoDB harus sehat sebelum backend dimulai. Migrasi database dijalankan otomatis oleh Flyway.

Periksa kesehatan backend:

```bash
curl --retry 30 --retry-delay 2 --retry-all-errors --fail http://localhost:8080/q/health
```

Backend siap ketika status kesehatan menunjukkan `UP`. Jika belum siap, lihat log:

```bash
docker compose logs --tail=100 backend
```

## 4. Jalankan Frontend — Terminal Kedua

Buka terminal baru dari folder utama proyek:

```bash
cd frontend
npm ci
npm run dev -- --port 5173 --strictPort
```

Biarkan terminal ini tetap berjalan, lalu buka:

**http://localhost:5173/inspections/new**

`npm ci` memasang dependency sesuai `package-lock.json`. Untuk penggunaan berikutnya, cukup jalankan `npm run dev -- --port 5173 --strictPort` selama dependency belum berubah.

## 5. Alamat Layanan

| Layanan | Alamat |
| --- | --- |
| Form inspeksi baru | http://localhost:5173/inspections/new |
| Detail inspeksi | `http://localhost:5173/inspections/<id>` (ganti `<id>` dengan ID inspeksi) |
| Backend API | http://localhost:8080/api/v1 |
| Health check | http://localhost:8080/q/health |
| Swagger UI | http://localhost:8080/q/swagger-ui |
| OpenAPI | http://localhost:8080/q/openapi |
| PostgreSQL dari komputer lokal | `localhost:5432`, database `inspection` |
| MongoDB dari komputer lokal | `mongodb://localhost:27017`, database `inspection` |

Aplikasi tidak memerlukan login. Kredensial PostgreSQL bawaan adalah pengguna `inspection` dan password `inspection_local`, kecuali diubah melalui `.env`.

## 6. Menghentikan dan Menjalankan Kembali

Hentikan frontend dengan `Ctrl+C` di terminal frontend.

Hentikan backend dan database dari folder utama proyek:

```bash
docker compose down
```

Data tersimpan dalam volume Docker dan tetap tersedia setelah perintah tersebut. Hindari menambahkan opsi `-v` jika ingin mempertahankan data.

Untuk menjalankan kembali:

```bash
# Terminal pertama, dari folder utama proyek
docker compose up -d
```

```bash
# Terminal kedua, dari folder utama proyek
cd frontend
npm run dev -- --port 5173 --strictPort
```

Jika kode backend atau Dockerfile berubah, jalankan kembali `docker compose up --build -d`.

## 7. Build Frontend dan Preview PWA (Opsional)

Hentikan dev server frontend terlebih dahulu agar port `5173` tersedia. Backend dan database harus tetap berjalan.

```bash
cd frontend
npm run build
npm run preview -- --port 5173 --strictPort
```

Buka http://localhost:5173/inspections/new. Preview menggunakan hasil build dan mendukung pemeriksaan PWA. Setelah dibuka online sekali, shell dan data kendaraan tersedia untuk bekerja offline. Klik Simpan Draft atau Submit untuk menyimpan inspeksi di IndexedDB; antrean dikirim melalui E7 saat aplikasi terbuka dan koneksi kembali. Perubahan yang belum disimpan tidak dipersist otomatis. Konflik dan penolakan ditampilkan tanpa menimpa data server.

## 8. Pemeriksaan Frontend (Opsional)

Dari folder `frontend`, setelah `npm ci`:

```bash
npm run lint
npm run test
npm run build
```

Untuk tes browser, biarkan backend di port `8080` berjalan dan hentikan dev server/preview lain di port `5173`. Playwright membangun frontend dan menjalankan preview produksi otomatis:

```bash
npx playwright install chromium
npm run test:e2e
```

Tes browser dapat membuat data inspeksi baru. Panduan pengujian backend tersedia di [README.md](README.md#pengujian).

## 9. Mengatasi Kendala Umum

### Docker tidak dapat terhubung

Jalankan Docker Desktop atau service Docker, lalu ulangi `docker info`. Pastikan akun pengguna memiliki izin mengakses Docker.

### Port sudah digunakan

Hentikan aplikasi lain yang menggunakan port terkait. Perintah frontend memakai `--strictPort` agar gagal dengan jelas ketika port `5173` terpakai.

Jika sengaja memakai port frontend lain, sesuaikan `CORS_ORIGINS` dalam `.env`, lalu terapkan ulang konfigurasi backend dengan `docker compose up -d backend`.

### Frontend muncul, tetapi API gagal diakses

1. Periksa `docker compose ps` dari folder utama proyek.
2. Pastikan health check backend berstatus `UP`.
3. Pastikan `frontend/.env` berisi `VITE_API_URL=http://localhost:8080`.
4. Akses frontend menggunakan `localhost` sesuai `CORS_ORIGINS`.
5. Restart dev server setelah mengubah environment frontend. Untuk preview, build ulang sebelum menjalankan preview lagi.

### Backend gagal dimulai

Dari folder utama proyek, periksa log semua service:

```bash
docker compose logs --tail=100 backend postgres mongo
```

Gunakan `FLYWAY_TARGET=latest` untuk menjalankan aplikasi biasa. Mengubah kredensial PostgreSQL di `.env` tidak otomatis mengubah pengguna/password dalam volume database yang sudah dibuat; gunakan kredensial yang sesuai dengan database tersebut.

### npm menampilkan error versi Node

Gunakan versi Node yang memenuhi `engines` pada `frontend/package.json`, kemudian jalankan ulang `npm ci` dari folder `frontend`.

---

Hasil verifikasi terbaru dicatat di [STATUS_TECHNICAL_TEST.md](STATUS_TECHNICAL_TEST.md). Bukti instalasi dan pengujian dipisahkan menurut tanggal eksekusi.
