# SUBMISSION

Salin ke root repository dengan nama `SUBMISSION.md`, lalu isi semua bagian.
Jawab jujur dan ringkas. Bagian yang tidak sempat dikerjakan boleh ditandai
"Tidak", dan itu tidak mengurangi nilai bila alasannya jelas.

| Item | Isi |
|---|---|
| Nama kandidat | |
| URL repository | |
| Tag final | `v1.0-submission` |
| Tanggal selesai | |
| Total jam kerja (perkiraan jujur) | |

## 1. Cara verifikasi

Ubah perintah di bawah bila berbeda dari yang Anda siapkan.

| Langkah | Perintah / URL |
|---|---|
| Backend + database | `docker compose up --build` (http://localhost:8080) |
| OpenAPI | `http://localhost:8080/q/openapi` |
| Health | `http://localhost:8080/q/health` |
| Tes backend | `cd backend && ./mvnw test` |
| Seed data 50.000 inspeksi | `python3 scripts/seed_via_api.py --count 50000` |
| Frontend | `cd frontend && npm install && npm run dev` |

## 2. Status fitur

Isi Status dengan **Selesai**, **Sebagian**, atau **Tidak**.
Beri catatan singkat bila Sebagian/Tidak.

| Item | Status | Catatan |
|---|---|---|
| E1 GET /api/v1/vehicles (20 kendaraan dari migrasi) | | |
| E2 POST /api/v1/inspections | | |
| E3 PUT /api/v1/inspections/{id} | | |
| E4 GET /api/v1/inspections/{id} | | |
| E5 GET /api/v1/inspections | | |
| E6 POST /api/v1/inspections/{id}/transition | | |
| E7 POST /api/v1/inspections/sync | | |
| E8 GET /api/v1/inspections/{id}/audit | | |
| R1 point_code, condition, dan vehicle_id valid | | |
| R2 tanpa kunci, titik ENGINE wajib NOT_INSPECTABLE | | |
| R3 NOT_INSPECTABLE wajib note, MAJOR_DAMAGE wajib foto | | |
| R4 transisi status sah (selain itu 409) | | |
| R5 SUBMITTED hanya bila 14 titik terisi | | |
| R6 hanya DRAFT/RECHECK yang bisa diubah, version basi ditolak (409) | | |
| R7 audit log tercatat di MongoDB | | |
| S1 sync: client_id baru, CREATED | | |
| S2 sync: kirim ulang batch sama, DUPLICATE | | |
| S3 sync: base_version sesuai, UPDATED | | |
| S4 sync: data basi atau APPROVED, CONFLICT | | |
| S5 sync: satu item invalid, item lain tetap diproses | | |
| Health check memeriksa PostgreSQL dan MongoDB | | |
| Migrasi database dan index | | |
| Tes otomatis (minimal 4) | | |
| Frontend: halaman form inspeksi | | |
| Bonus (maksimal 1, sebutkan yang dikerjakan) | | |

## 3. Performa (sebelum dan sesudah)

Gunakan data seed 50.000 inspeksi. Ukur "sebelum" **sebelum** Anda menambah
index selain primary key/unique, lalu commit index sebagai commit terpisah
dengan awalan `perf:`. Cantumkan ringkasan `EXPLAIN (ANALYZE)` (tidak perlu
seluruh output).

| Query / endpoint | Sebelum (ms) | Sesudah (ms) | Perubahan | Ringkasan EXPLAIN |
|---|---|---|---|---|
| `GET /inspections?status=SUBMITTED&limit=20&page=1` | | | | |
| `GET /inspections?status=SUBMITTED&limit=20&page=2000` | | | | |

## 4. Refleksi (maksimal 3 kalimat per jawaban)

**Q1.** Bagian mana dari implementasi Anda yang paling berisiko, dan mengapa?

**Q2.** Jika Anda punya satu hari tambahan, apa yang Anda perbaiki lebih dulu?

## 5. Asumsi dan keputusan di luar kontrak

-

## 6. Belum dikerjakan atau diketahui bermasalah (beserta alasan)

-

## 7. Deklarasi AI (ringkas; detail lengkap di README.md)

- Tools yang dipakai:
- Bagian yang dibantu AI:
- Bagian yang ditulis sendiri:
- Satu contoh saat hasil AI salah atau berlebihan, dan bagaimana Anda menyadarinya:
