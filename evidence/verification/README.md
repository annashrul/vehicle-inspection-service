# Verifikasi penyesuaian technical test 30 Oktober 2026

Seluruh tes berikut dijalankan pada sumber yang checksum-nya tercatat di [checks.json](checks.json). Bukti benchmark/seed tanggal 28 Oktober dan audit sebelum perbaikan disimpan terpisah.

| Pemeriksaan | Hasil | Evidence |
|---|---|---|
| Backend pada database PostgreSQL/MongoDB test baru | 11 lulus, 0 gagal/error/skipped; migrasi V1–V4 berhasil | [backend-tests.txt](backend-tests.txt) |
| Vitest/RTL | 20 lulus | [frontend-unit.txt](frontend-unit.txt) |
| ESLint | Berhasil | [frontend-lint.txt](frontend-lint.txt) |
| Build produksi dan seluruh browser suite | 29 lulus, tidak ada skip/retry | [browser-tests.txt](browser-tests.txt), [browser-tests.json](browser-tests.json) |
| Readiness dua database | UP | [health.json](health.json) |
| OpenAPI audit, required/enum/nullable | Sesuai schema yang diperiksa dan tes respons aktual | [openapi.json](openapi.json) |

Rincian 29 tes: 16 form online/viewport, 5 offline dengan API simulasi, 3 offline dengan backend nyata, dan 5 PWA. Tes backend nyata mencakup respons sync hilang lalu DUPLICATE tanpa audit ganda, update draft E2 dengan UUID yang sama, dan konflik yang mempertahankan data lokal. Playwright otomatis menjalankan build dan preview produksi pada port 5173, dengan backend 8080 tetap berjalan.

Screenshot terbaru: [1280px](viewport-1280.png), [768px](viewport-768.png), serta delapan viewport lain dalam folder ini. Screenshot historis di `evidence/redesign/` tidak ditimpa.

Tes backend menggunakan database baru `inspection_submission_final`, bukan database aplikasi. Volume aplikasi tidak dihapus. Percobaan awal sempat terhenti akibat DNS Maven; setelah koneksi pulih, pengujian berhasil. Tes sentuh juga menemukan kelas ukuran toggle yang hilang; setelah dipulihkan seluruh 29 tes lulus. Angka performa tidak diulang untuk mengklaim hasil baru.

[clean-clone.json](clean-clone.json) mencatat instalasi dari clone GitHub commit `6ca097f`, database kosong, migrasi V1–V4, health UP, 20 kendaraan, npm install/dev, HTTP frontend 200, serta kecocokan checksum seluruh sumber dengan hasil pengujian. Commit setelahnya hanya mencatat evidence/dokumentasi.
