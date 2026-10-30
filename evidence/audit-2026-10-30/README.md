# Evidence audit technical test 30 Oktober 2026

Audit terhadap commit GitHub `6ae9935`, bukan perubahan workspace yang belum di-commit. Hasil lengkap dan interpretasinya ada di [laporan audit](../../AUDIT_TECHNICAL_TEST.md).

| Bukti | Hasil |
|---|---|
| [backend-tests.log](backend-tests.log) | 10 tes, 0 gagal/error/skipped, database test terpisah |
| [contract-checks.json](contract-checks.json) | 34 pemeriksaan API langsung lulus; termasuk contoh respons audit aktual |
| [frontend-build.log](frontend-build.log) | TypeScript/Vite production build berhasil |
| [frontend-unit.log](frontend-unit.log) | 20 tes Vitest/RTL lulus |
| [frontend-lint.log](frontend-lint.log) | ESLint berhasil |
| [browser-online.log](browser-online.log) | 16 tes lulus, termasuk integrasi backend dan 10 viewport |
| [browser-pwa.log](browser-pwa.log) | 5 tes PWA lulus, preview produksi port 5173 |
| [browser-offline-created.log](browser-offline-created.log) | 1 skenario offline CREATED gagal: Submit disabled; ini tes fitur tambahan |
| [openapi-runtime.json](openapi-runtime.json) | OpenAPI runtime untuk memeriksa schema audit dan field wajib |
| [scope.json](scope.json) | Commit, target tag, hasil, dan checksum log |

Pemeriksaan offline menggunakan preview produksi port 4173 dan API mock milik tes. Pemeriksaan PWA menggunakan port 5173 sesuai README dan CORS default backend. Percobaan awal PWA pada port 4173 dihentikan karena origin itu tidak diizinkan konfigurasi default; tidak dimasukkan sebagai kegagalan produk. Seed 50.000 dan benchmark tidak dijalankan ulang; laporan menilai bukti historis yang sudah ada.

Tes API membuat inspeksi sintetis pada database clone baru. Tes Maven memakai `inspection_test`; volume database project asli tidak dihapus. Kode aplikasi tidak diperbaiki dalam audit ini.
