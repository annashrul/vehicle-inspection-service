# Evidence status technical test — 29 Oktober 2026

Evidence baru untuk [STATUS_TECHNICAL_TEST.md](../../STATUS_TECHNICAL_TEST.md).

- [checks.json](checks.json): perintah, waktu mulai UTC, exit code, dan lokasi log aktual.
- [frontend-build.txt](frontend-build.txt): build produksi frontend dan service worker.
- [frontend-unit.txt](frontend-unit.txt): Vitest/RTL.
- [frontend-lint.txt](frontend-lint.txt): ESLint.
- [offline-browser.txt](offline-browser.txt) dan [offline-browser.json](offline-browser.json): lima skenario browser offline dengan API simulasi pada preview port 4173.
- [backend-test-attempt.txt](backend-test-attempt.txt): hasil percobaan tes backend; jangan dianggap lulus jika exit code bukan 0.
- [migration-versions.json](migration-versions.json): inventaris versi migrasi dari nama file, termasuk versi ganda. Tidak menjalankan Flyway.
- [git-status.txt](git-status.txt), [git-history.txt](git-history.txt), [git-tags.txt](git-tags.txt): snapshot Git saat pengumpulan evidence dimulai; bukan konfirmasi push remote.

Pengujian terbaru tidak menggantikan bukti historis di folder induk. Backend terbaru dan suite PWA penuh belum diklaim lolos. Screenshot historis ditautkan pada laporan utama dan berada di `../redesign/`.

File `.log` dapat diabaikan oleh aturan Git proyek. Saat folder ini disertakan dalam pengumpulan, pastikan file log ikut dibawa; salinan `.txt` juga disediakan untuk log eksekusi terbaru.
