# Rencana redesign frontend

Sumber: PDF Fullstack #ASL, checklist.json, kontrak resource/service backend dan IMPLEMENTATION_PLAN.md. PDF v2 Lite tetap tidak tersedia. Endpoint/JSON dan aturan R1–R7/S1–S5 dipertahankan; backend tidak diubah.

1. Fondasi React 19, Tailwind 4, shadcn/ui berbasis Radix, tokens aksesibel, struktur form reusable.
2. RHF + Zod: 14 slot beridentitas point_code, draft parsial mengirim hanya item yang diisi, submit memvalidasi semua titik; E2/E3 terpisah dari E6. Kondisi awal kosong.
3. Layout mobile single column dan safe-area action bar; tablet progress horizontal; desktop form + sticky summary. Accordion multi-open, touch target 44px.
4. Registry callback ref untuk membuka Accordion dan fokus/scroll setelah input mounted; error lokal dan API dipetakan ke field RHF dan summary terurut.
5. Status read-only, conflict/refresh tanpa overwrite, loading/error/retry/network states. Referensi foto berupa daftar teks, bukan upload.
6. Vitest/RTL untuk aturan dan interaksi; Playwright untuk integrasi backend, keyboard, seluruh 10 viewport, serta bukti screenshot.
7. Sesudah kebutuhan inti lulus: manifest/icons original berbasis SVG kode, service worker hanya shell/assets, prompt update. Draft IndexedDB/E7 offline ditunda secara eksplisit; tidak mengklaim autosave/sync offline.
8. Dokumentasi hasil nyata dan commit bertahap. Tag submission sebelumnya dipertahankan.

## Hasil akhir yang dieksekusi

- Fondasi/komponen dan draft/submit selesai; API backend tidak diubah.
- Native Tab/Space, fokus Accordion dan mapping error diuji, termasuk koreksi override tabIndex.
- Build dan lint lulus; 20 tes Vitest/RTL, 16 tes browser utama, dan 5 tes PWA lulus.
- 10 viewport diuji dan screenshot ditinjau; tidak ada horizontal overflow.
- PWA shell/installability/update tersedia; IndexedDB/E7 offline ditunda dengan alasan konsistensi pada laporan.
- Data/volume dipertahankan, bukti lama dipisahkan dari hasil baru di evidence/redesign.
