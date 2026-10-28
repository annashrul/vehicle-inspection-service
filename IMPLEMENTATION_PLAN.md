# Implementation plan

## Source assessment
Read `Technical Test - Fullstack #ASL.pdf`, checklist.json, seed_via_api.py and SUBMISSION_TEMPLATE (1).md. The requested `Technical_Test_Fullstack_v2_Lite.pdf` is absent; no version comparison is possible. The available PDF governs implementation. Original support files are preserved.

## Phases
1. Infrastructure, Java 21/Quarkus Maven project, PostgreSQL normalized schema and 20 vehicles, MongoDB audit outbox.
2. E1–E6, validation R1–R6, request/error envelopes and deterministic pagination.
3. E7–E8, isolated per-item transactions, advisory client-id locks, canonical duplicate comparison, durable audit delivery.
4. Integration tests R1–R7/S1–S5; seed and before/after performance measurement when runtime is available.
5. React TypeScript form, custom hooks, responsive layout and client validation.
6. Documentation, verification evidence and honest limitations.

## Assumptions
- PUT replaces all items; omitted items means empty. Required scalar fields must be supplied.
- Item order and photo reference order do not affect duplicate identity; duplicate point codes are invalid. Null/omitted photo_refs normalize to empty, null/omitted note normalize to null.
- Sync only accepts DRAFT/SUBMITTED. Duplicate evaluation precedes status/version conflict, as specified.
- Vehicle cannot change through PUT; sync can change vehicle_id on editable records.
- Pagination ties use id descending. Invalid filter/page/limit returns 400.
- Sync REJECTED/CONFLICT events without a known inspection carry null inspection_id and client_id in meta.
- MongoDB delivery uses transactional PostgreSQL outbox; deterministic event IDs make retries safe. E8 drains pending events before reading. Cross-database atomic commits are not claimed.
- No bonus until mandatory work is verified.

## Environment preflight
Java/Maven absent. Docker daemon access denied. Network disabled by sandbox. .git is an empty read-only mount (not a repository); commits/tags cannot be created here. Do not fabricate history, tests, or benchmarks. Recheck commands at final verification.

## Requirement checklist
Status: [ ] not verified; [x] executed successfully. Source implementation is tracked separately in SUBMISSION.md.
- [ ] E1 vehicles
- [ ] E2 create DRAFT
- [ ] E3 replace editable inspection, version check
- [ ] E4 detail
- [ ] E5 filters, pagination, stable ordering
- [ ] E6 transition
- [ ] E7 isolated sync batch
- [ ] E8 ascending audit
- [ ] R1 valid points, conditions, vehicle
- [ ] R2 no-key engine rule
- [ ] R3 notes/photos
- [ ] R4 legal transitions
- [ ] R5 14 points and separate missing errors
- [ ] R6 editable states, stale version, approved immutability
- [ ] R7 durable append-only MongoDB audit
- [ ] S1 CREATED
- [ ] S2 DUPLICATE, no version/audit changes
- [ ] S3 UPDATED
- [ ] S4 CONFLICT
- [ ] S5 partial failure
- [ ] PostgreSQL/Mongo readiness, JSON logging, request ID, OpenAPI
- [ ] Empty database migrations and Compose startup
- [ ] Backend automated tests
- [ ] Original seed 50,000, baseline/optimized latency and EXPLAIN
- [ ] Frontend routes, R2/R3, field errors/toasts, 1280px/768px
- [ ] Frontend build and dev startup
- [ ] README, submission, AI disclosure, no committed secrets
- [ ] Six incremental commits, separate perf commit, main tag v1.0-submission
