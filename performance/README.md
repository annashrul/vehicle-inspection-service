# Metode benchmark

Endpoint yang diukur:

- `/api/v1/inspections?status=SUBMITTED&limit=20&page=1`
- `/api/v1/inspections?status=SUBMITTED&limit=20&page=2000`

`python3 scripts/benchmark.py before|after` menjalankan 5 warmup dan 30 request serial pada setiap endpoint. Latensi mencakup HTTP lokal, count, pemilihan ID, fetch item dan serialisasi respons. Median dan p95 dilaporkan; nilai mentah disimpan di JSON. EXPLAIN ANALYZE BUFFERS dijalankan terpisah untuk query pemilihan ID dan count, sehingga durasinya bukan durasi seluruh endpoint.

Baseline memakai hanya primary key/unique pada tabel bisnis. Index otomatis pada tabel metadata Flyway tidak digunakan query inspeksi. Seluruh 50.000 inspeksi seed dimasukkan lewat skrip asli E7; baris browser test yang sudah ada tetap dipertahankan dan total aktual dicatat di JSON/SQL.

DDL dalam V2 diterapkan setelah baseline dengan psql pada database yang sama. Backend tetap hidup selama pengukuran before/after sehingga tidak ada restart/JIT ulang di antaranya. ANALYZE dijalankan pada kedua fase. Setelah pengukuran, image final dijalankan agar Flyway mencatat V2; IF NOT EXISTS menghindari duplikasi index.

Lingkungan: Intel Core i5-3320M @ 2.60GHz, 4 CPU logis; RAM host 11,49 GiB; Docker Engine 29.8.1, Compose 5.5.1; PostgreSQL 16.15, MongoDB 7.0.45. PostgreSQL menggunakan konfigurasi durability default. Waktu seed per item dipengaruhi WALSync pada disk host. Hasil lokal ini bukan SLA produksi, dan p95 dipengaruhi penjadwalan OS serta cache.

Tidak ada DROP INDEX, TRUNCATE, DELETE, penghapusan volume, atau penghapusan database dalam prosedur pengukuran.
