# Bukti verifikasi

Data di folder ini berasal dari command, tes HTTP/Maven, dan browser otomatis yang benar-benar dijalankan pada 28 Oktober 2026. Inspector dan kendaraan adalah data sintetis technical test.

- `maven-tests.log` dan `test-reports/*.txt`: eksekusi Maven terakhir; `fresh-database-tests.log` membuktikan dua migrasi pada database kosong dan suite saat itu. `maven-tests-first-attempt.txt` / `maven-first-failure.txt` mempertahankan kegagalan page=bad sebelum perbaikan.
- `frontend-tests.log`, `frontend-tests.json`: hasil browser terakhir; `frontend-tests-*-attempt.txt` menyimpan kegagalan awal. Screenshot `frontend-1280.png` dan `frontend-768.png` menunjukkan hasil akhir alur form.
- `frontend-build.log`: build TypeScript/Vite; warning directive React Router tidak menghentikan build.
- `seed-50000.log`: stdout asli skrip seed.
- `health-*.json`, `vehicles.json`, `openapi.json`: respons endpoint aktual. File openapi-before-final mencatat kondisi dokumentasi sebelum koreksi schema terakhir.
- `outbox-recovery.json`: pembuktian kesiapan DOWN selama MongoDB berhenti, commit sync ke PostgreSQL, lalu audit terkirim setelah MongoDB dijalankan kembali.
- `final-database-checks.txt`, `final-containers.txt`: pemeriksaan akhir.

Angka benchmark mentah dan EXPLAIN berada di `../performance/`. Log build/start dan log backend saat simulasi gangguan disimpan lokal; ringkasan hasil, keterbatasan dan metode ukur berada di `../SUBMISSION.md`.
