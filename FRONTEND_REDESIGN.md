# Laporan redesign frontend LOGIQUE

Redesign mempertahankan `/inspections/new`, `/inspections/:id`, seluruh endpoint/field JSON dan business rules backend. Sumber utama adalah `Technical Test - Fullstack #ASL.pdf`, `checklist.json`, kontrak Java resource/service, dan implementation plan. PDF v2 Lite tidak tersedia. Hasil backend/seed/benchmark sesi awal tetap historis; tidak diukur ulang untuk perubahan frontend ini.

## 1. Struktur terbaru

```text
frontend/
  components.json                 # registry shadcn/ui
  vite.config.ts                  # React, Tailwind, alias, PWA/cache policy
  vitest.config.ts
  playwright.config.ts
  public/icons/                   # SVG asli, PNG 192/512, maskable 512
  scripts/generate-icons.py
  src/
    main.tsx                      # router lazy, provider PWA, Sonner
    style.css                     # tokens + mobile/tablet/desktop adaptation
    types/api.ts                  # kontrak snake_case
    lib/
      checklist.ts                # satu import checklist.json dari root
      inspection-schema.ts        # schema draft/submit, normalisasi UI/payload
      utils.ts
    hooks/
      useApi.ts                   # status HTTP, no-store, error aman
      useInspection.ts            # load, abort, refresh, status jaringan
      useErrorNavigation.ts       # urutan error, mapping, registry ref/focus
    pages/InspectionFormPage.tsx   # create/edit, transaksi UI, conflict handling
    components/
      inspection/                 # informasi, Accordion, kartu titik, progress
      ui/                         # komponen shadcn/ui berbasis Radix
      pwa/                        # install instructions, update consent, cross-tab safety
    test/setup.ts
  tests/inspection.spec.ts         # responsive, API nyata, keyboard/touch
  tests/pwa.spec.ts                # SW nyata, offline, update/multiple tabs
```

`shared.tsx` menyediakan AppHeader, PageHeader, StatusBadge, FormSection, FormField, FieldError, ValidationSummary, StickyActionBar, LoadingState, EmptyState dan ErrorState. ChecklistProgress dan InspectionItemCard berada pada file masing-masing. Salinan checklist frontend yang tidak digunakan dihapus; sumber canonical root tetap utuh, demikian juga konfigurasi backend.

## 2. Komponen shadcn/ui

Seluruh 17 komponen yang diminta digunakan: Button, Card, Input, Label, Select, Switch, RadioGroup, Textarea, Accordion, Badge, Alert, Progress, Skeleton, Dialog, Sheet, Separator, dan Sonner. Komponen diambil melalui CLI registry shadcn/ui, lalu disesuaikan untuk utilitas lokal, target sentuh, label Indonesia dan tema terang. Lucide menyediakan ikon antarmuka.

Stack terpasang dan diuji: React 19.3.1, Tailwind 4.3.3, React Hook Form 7.91.0, Zod 4.6.7, resolver 6.0.2, Vite 6.4.5, Vitest 5.0.5, vite-plugin-pwa 2.0.0. Node pengujian 24.21.0; versi Node yang didukung mengikuti `package.json#engines` (LTS 22.12+/24, atau 26+). TanStack Query tidak diperlukan untuk dua pembacaan awal dan refresh eksplisit; tidak ada UI library tambahan di luar kebutuhan tersebut.

## 3. Desktop, tablet, mobile

| Kategori | Pengalaman |
|---|---|
| Mobile 320–430 | Single column; pilihan kondisi 2×2; kartu per titik; progress ringkas sticky dan Sheet ringkasan; action bar bawah dengan safe-area; referensi foto per baris dengan tambah/hapus. |
| Tablet 768–1024 | Satu area kerja lebar; informasi dua kolom terbatas; progress horizontal; pilihan kondisi dapat empat kolom; kontrol sentuh dan aksi bawah mudah dijangkau; portrait serta landscape diuji. |
| Desktop 1280–1920 | Grid form + sidebar ringkasan sticky; max-width 1280; field tidak membentang mengikuti monitor; progress/status/ringkasan terpisah; action bar mengikuti area form. |

CSS dimulai dari mobile dan ditingkatkan pada breakpoint 768/1200/1440. Kontrol utama memiliki target sekitar 44px atau lebih; pilihan radio menggunakan label besar sebagai target. VisualViewport dipakai untuk menyembunyikan action bar ketika area keyboard menyempit. Kejadian viewport keyboard diuji melalui simulasi browser; keyboard OS fisik belum diuji.

Design tokens berbasis CSS variables mengatur primary, background, foreground, border, muted, destructive, radius, dan ring. Tidak ada font eksternal yang perlu diunduh. Error memakai teks/ikon, tidak hanya warna. Focus visible, skip link, banner/main landmarks, label dan reduced-motion dipertahankan.

## 4. Accordion

Tiga section berasal dari checklist: Eksterior 7, Interior 5, Mesin 2. Accordion `type="multiple"` memungkinkan beberapa section terbuka; tidak ada wizard atau penguncian urutan. Header memuat jumlah valid, status error dan indikator lengkap; status ikut dijelaskan dengan aria-describedby. Nilai tetap ada di RHF saat panel ditutup, dan halaman edit dihidrasi dari detail server berdasarkan point_code.

## 5. React Hook Form + Zod

FormProvider adalah sumber state input. Controller dipakai untuk Select, Switch dan RadioGroup; useFieldArray untuk item/daftar referensi foto, dengan field.id sebagai React key dan point_code sebagai identitas bisnis. useWatch dibatasi ke kartu dan progress; useFormState membatasi langganan error. Tidak ada useState per input atau duplikasi isi form.

14 slot UI dimulai dengan condition kosong. Zod memvalidasi scalar, identitas kendaraan dari E1, point_code/condition, R2 dan R3. Progress menghitung item yang benar-benar valid, termasuk note dan foto wajib. File foto hanya string referensi, tidak ada file upload.

## 6. Auto-focus error

1. Gabungkan error dan urutkan sesuai urutan visual: kendaraan, nama, kunci, lalu titik checklist/kondisi/catatan/foto.
2. Map `items.<POINT_CODE>` dari backend ke index canonical yang benar; error tanpa field UI masuk summary server.
3. Buka section yang diperlukan.
4. Callback ref mendaftarkan DOM yang sudah mounted. Navigasi menunggu field terlihat, aktif dan geometri panel stabil melalui animation frames; tidak memakai setTimeout acak.
5. Fokuskan field dan panggil setFocus RHF, lalu scrollIntoView secara instan agar target tidak bergeser saat Accordion terbuka. Gerakan ini juga aman untuk reduced motion.
6. aria-invalid dan aria-describedby menunjuk pesan error milik field yang benar. Summary dapat diklik untuk berpindah ke setiap error; Sheet mobile menutup lebih dahulu sebelum fokus dipindahkan.

Error server ganda pada field yang sama digabung agar alasan tidak hilang. RadioGroup memakai urutan Tab native Radix; override tabIndex yang sempat menghalangi entry keyboard sudah dihapus dan diuji dengan Tab nyata, bukan hanya pemanggilan focus programatis.

## 7. Save Draft dan Submit

- Draft: kendaraan/nama/kunci valid; hanya item yang mulai diisi diperiksa dan dikirim. Tidak memaksa 14 kondisi terisi. Item tanpa condition, note atau foto tidak dikirim.
- Submit: seluruh 14 titik valid, termasuk dependent required fields; tampilkan Dialog konfirmasi, simpan E2/E3 dengan version yang dikonfirmasi server, kemudian E6 ke SUBMITTED. Tidak menyisipkan status ke create.
- Tanpa kunci: ENGINE diatur NOT_INSPECTABLE; note tetap kosong sampai diisi inspektur. Kunci tersedia lagi mengembalikan pilihan aktual sebelumnya atau mengosongkan kondisi otomatis; catatan disimpan untuk ditinjau, tidak dihapus diam-diam.
- DRAFT/RECHECK editable; SUBMITTED/APPROVED hanya baca dan aksi perubahan nonaktif.
- Ref in-flight dan busy state mencegah klik ganda. Hanya konfirmasi server yang memperbarui id/version/status.

HTTP 400 dipetakan ke field dan summary; 404 menampilkan not-found state; 409 mempertahankan perubahan lokal dan meminta konfirmasi sebelum memuat versi server; 500 memakai pesan aman; kegagalan jaringan menyediakan retry pembacaan. Mutasi dengan respons jaringan yang hilang ditandai belum pasti, karena E2 tidak memiliki idempotency key; pengiriman ulang memerlukan pemeriksaan eksplisit pengguna. Tidak ada overwrite atau retry mutasi otomatis.

## 8. Status PWA

Manifest, nama/short name, standalone, start URL, theme color, SVG/PNG 192/512 dan ikon maskable 512 tersedia. Ikon geometris dibuat di repository melalui script Pillow, bukan logo resmi LOGIQUE. Aset PNG dikomit, sehingga build tidak membutuhkan Python.

Service worker produksi hanya precache application shell, JS/CSS dan ikon. Runtime caching API tidak digunakan; fetch API juga memakai `cache: no-store`. Tidak ada cache respons inspeksi, mutation replay, background sync, atau penyimpanan data pengguna oleh SW.

Update memakai prompt: notifikasi persisten dan Dialog, diblokir jika form masih dirty. Reload terjadi hanya setelah pengguna menyetujui dan controller baru aktif. Aktivasi worker dari tab lain tidak otomatis me-reload tab yang memiliki input. Regenerasi SW nyata, waiting/activation, controller change dan reload diuji dalam browser; file SW hasil build yang dimodifikasi sementara saat tes selalu dipulihkan.

PWA diuji melalui build/preview pada localhost:5173. SW tidak diaktifkan di dev server. Suite Playwright kini menyiapkan build dan preview produksi otomatis di port 5173; backend harus tetap berjalan. Di hosting nyata diperlukan HTTPS dan SPA fallback ke index.html. Kriteria teknis installability diuji; pemasangan melalui antarmuka OS Android/iOS belum diuji.

## 9. Draft offline dan E7 sync

Draft dan submit offline disimpan ke IndexedDB `logique-offline` setelah pengguna menekan tombol simpan/submit. UUID dan base_version dipertahankan untuk sinkronisasi E7 otomatis saat aplikasi terbuka dan jaringan tersedia. Perubahan yang belum disimpan tetap hanya di memori. Data kendaraan dan inspeksi yang pernah dibuka disimpan untuk pemulihan offline.

E2 kini memberi UUID saat create; migrasi V3/V4 mengisi UUID inspeksi lama. Retry memakai UUID dan payload yang sama. CREATED/UPDATED/DUPLICATE menandai antrean sebagai synced; CONFLICT/REJECTED mempertahankan data lokal dan menampilkan kesalahan untuk ditinjau. Antrean tidak dihapus ketika jaringan atau server gagal. Web Locks menserialkan simpan/sync lintas tab pada browser yang mendukungnya. Sinkronisasi dilanjutkan saat aplikasi dibuka kembali; tidak berjalan saat aplikasi tertutup.

## 10. Hasil pengujian historis redesign

Tabel berikut mencatat sesi redesign 28 Oktober. Hasil snapshot terbaru dicatat di [STATUS_TECHNICAL_TEST.md](STATUS_TECHNICAL_TEST.md) dan `evidence/verification/`.

| Pemeriksaan | Hasil akhir |
|---|---|
| npm run build | Berhasil, termasuk generateSW dan precache aset |
| npm run test | 20 tes Vitest + RTL lulus |
| npm run lint | Lulus tanpa error/warning ESLint |
| npm run test:e2e | 16 tes browser lulus |
| npm run test:pwa | 5 tes browser PWA lulus |
| Viewport | 320, 375, 390, 430, 768, 820, 1024, 1280, 1440, 1920px; tidak ada horizontal overflow |
| Visual QA | Screenshot seluruh 10 viewport ditinjau; ukuran dan interaksi diverifikasi di Chromium headless |
| Integrasi backend nyata | Create draft parsial, update/version, foto, submit, reload detail dan APPROVED melalui data sintetis baru |
| Error/aksesibilitas | 400 mapping + fokus, 404, 409 preserve/refresh, 500/network retry; Tab/Space/arrow entry, sentuhan, fokus setelah mount, viewport keyboard |
| PWA | PNG aktual, manifest, worker aktif, offline shell, cache API kosong, retry online, update dirty/pristine, perlindungan lintas tab |

Bukti aktual berada di [evidence/redesign](evidence/redesign/README.md). Browser pengujian adalah Chromium, bukan perangkat fisik. Tidak ada klaim Lighthouse, audit screen reader, instalasi OS atau pengujian Safari/Firefox. Hasil seed/backend/benchmark awal tidak dibuat ulang atau diganti dengan angka frontend.

## 11. File yang berubah

Daftar lengkap: [changed-files.txt](evidence/redesign/changed-files.txt). Pada sesi redesign awal, perubahan inti ada pada frontend dan backend belum berubah. Pembaruan 30 Oktober juga mencakup UUID E2, migrasi V4, dan schema OpenAPI audit. README, SUBMISSION, implementation plan dan laporan ini diperbarui untuk menunjuk hasil baru tanpa menghapus bukti historis.

## 12. Git

Commit dipisah menurut implementasi adaptive form, perbaikan aksesibilitas keyboard, PWA dan dokumentasi/bukti. Daftar hash aktual dicatat pada [git-commits.txt](evidence/redesign/git-commits.txt) dan laporan akhir. Tag publik `v1.0-submission` digunakan untuk snapshot pengumpulan final setelah verifikasi. Snapshot awal dipertahankan pada tag arsip `v1.0-submission-initial`; branch main tidak ditulis ulang.

## 13. Belum selesai dan catatan dependensi

- Perubahan form perlu disimpan secara eksplisit; sinkronisasi offline berjalan selama aplikasi terbuka.
- Instalasi OS, keyboard virtual perangkat fisik dan pengujian lintas browser belum dilakukan; viewport, touch dan lifecycle SW diuji melalui Chromium automation.
- npm audit runtime (`--omit=dev`) tidak menemukan kerentanan. Audit lengkap masih melaporkan 4 temuan low pada rantai build Workbox/deepmerge; versi patched deepmerge belum tersedia saat verifikasi. Temuan critical/moderate pada tool tes awal ditangani dengan upgrade Vitest ke 5.0.5 yang kompatibel dengan Vite/Node yang digunakan. Tidak dilakukan downgrade paksa plugin PWA atau klaim seluruh dependency bebas advisory.
- Benchmark backend tetap hasil sesi awal; tidak ada klaim angka performa frontend yang belum diukur. Bundle dipecah untuk route dan workbox; ukuran aktual tercantum pada build.log.

## Menjalankan

Backend dan database mengikuti [README](README.md). Untuk frontend:

```bash
cd frontend
npm install
npm run dev                         # localhost:5173; Ctrl+C sebelum tes browser
```

Dengan backend tetap berjalan dan port frontend 5173 tersedia:

```bash
npm run test
npm run lint
npx playwright install chromium
npm run test:e2e                     # build + preview produksi otomatis, seluruh suite
# Subset opsional, dijalankan sendiri-sendiri:
npm run test:offline
npm run test:pwa
```

Untuk mencoba PWA secara manual: `npm run build` lalu `npm run preview -- --port 5173 --strictPort`. `VITE_API_URL` mengikuti `.env.example`. Jangan menjalankan build bersamaan dengan tes update PWA, karena tes sementara mengubah `dist/sw.js` dan memulihkannya di `finally`. Preview untuk tes dijalankan dan dihentikan oleh Playwright; tidak perlu terminal frontend kedua.

## Referensi teknis dan AI

Implementasi mengikuti [shadcn Tailwind 4/React 19](https://ui.shadcn.com/docs/tailwind-v4), [RHF setFocus](https://react-hook-form.com/docs/useform/setfocus), [Vite PWA prompt untuk aplikasi form](https://vite-pwa-org.netlify.app/guide/auto-update), dan [migrasi Vitest](https://vitest.dev/guide/migration/). Kodifikasi dan pengujian sesi ini dibantu OpenAI Codex. Contoh koreksi nyata: override tabIndex awal membuat RadioGroup terlewati oleh Tab; tes urutan Tab nyata menemukan masalah tersebut, lalu override dihapus. Kandidat tetap perlu memahami dan meninjau hasil sebelum submission.

## Pembaruan verifikasi 30 Oktober 2026

Tes browser default kini mencakup form online, PWA, antrean offline dengan API simulasi, serta integrasi backend nyata. `npm run test:e2e` menyiapkan build/preview produksi otomatis; `npm run test:offline` dan `npm run test:pwa` menjalankan subset. Hasil yang berlaku untuk snapshot terbaru ada di [STATUS_TECHNICAL_TEST.md](STATUS_TECHNICAL_TEST.md); angka dan screenshot redesign sebelumnya tetap historis.
