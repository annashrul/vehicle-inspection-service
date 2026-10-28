You are a Senior Fullstack Engineer and Technical Assessment Implementation Agent.

Build the LOGIQUE Fullstack Engineer Technical Test: **Vehicle Inspection Service**.

Your objective is to deliver a complete, testable, maintainable solution that follows the supplied technical assessment specification exactly.

Work autonomously through implementation, verification, and documentation. Do not stop after scaffolding. Do not claim completion without executing verification.

## 1. Read the assessment files first

Read all available documents in the project directory:

- `Technical Test - Fullstack #ASL.pdf`
- `Technical_Test_Fullstack_v2_Lite.pdf`
- `checklist.json`
- `seed_via_api.py`
- `SUBMISSION_TEMPLATE (1).md`

The latest assessment PDF is the primary reference. Compare it with the earlier PDF and report any differences that affect implementation.

The actual supplied files take precedence over this prompt.

If files are missing, report them explicitly. Never fabricate official assessment files, performance measurements, or test results.

Before writing code:
1. Extract all requirements.
2. Create `IMPLEMENTATION_PLAN.md`.
3. Create a requirement checklist covering E1–E8, R1–R7, S1–S5, performance, frontend, and submission.
4. Identify ambiguities and document assumptions.
5. Begin implementation without waiting for approval on routine technical decisions.

## 2. Mandatory technology stack

Backend:
- Java 21
- Quarkus 3.x
- Maven
- Hibernate ORM with Panache
- PostgreSQL
- MongoDB
- Flyway
- SmallRye OpenAPI
- SmallRye Health
- JUnit 5

Frontend:
- React + TypeScript
- Vite
- React Router
- Custom API hooks
- Responsive CSS

Infrastructure:
- Docker Compose
- Dockerfile
- Environment variables
- `.env.example`

Use conventional synchronous Quarkus architecture unless the required implementation is complete and there is a compelling reason to implement the optional reactive bonus.

## 3. Project structure

Create:

```text
backend/
  src/main/java/
  src/main/resources/
  src/test/
  pom.xml
  mvnw
  Dockerfile

frontend/
  src/
    components/
    pages/
    hooks/
    services/
    types/
    utils/
  package.json

scripts/
  seed_via_api.py

checklist.json
docker-compose.yml
.env.example
.gitignore
README.md
SUBMISSION.md
IMPLEMENTATION_PLAN.md
```

Preserve the original seed script without changing its expected API contract.

## 4. Database design

PostgreSQL entities:

Vehicle:
- id
- plate_number (unique)
- type
- brand
- model
- year

Inspection:
- id
- vehicle_id
- client_id (nullable unique UUID)
- inspector_name
- has_key
- status
- version
- created_at
- updated_at

InspectionItem:
- inspection_id
- point_code
- condition
- note
- photo_refs

Use normalized inspection items rather than one database column per checklist point.

Create Flyway migrations and seed exactly 20 vehicles with IDs 1–20.

Use MongoDB for append-only audit documents:
- inspection_id
- action
- from_status
- to_status
- actor
- at
- meta

Implement appropriate database constraints, transaction boundaries, and concurrency control.

## 5. Backend API

Implement all eight endpoints:

E1 GET /api/v1/vehicles

E2 POST /api/v1/inspections

E3 PUT /api/v1/inspections/{id}

E4 GET /api/v1/inspections/{id}

E5 GET /api/v1/inspections

E6 POST /api/v1/inspections/{id}/transition

E7 POST /api/v1/inspections/sync

E8 GET /api/v1/inspections/{id}/audit

Follow the exact request and response contracts in the PDF.

Use snake_case JSON fields.

Successful responses must use:
- success
- message
- data
- meta (for paginated lists)

Error responses must use:
- success
- message
- errors[] with field and reason

Return the specified HTTP codes: 200, 201, 400, 404, and 409.

Implement pagination, filters, deterministic ordering, and consistent exception handling.

## 6. Business rules

Implement and test all rules:

R1:
Validate point_code, condition, and vehicle_id. Unknown vehicle returns 404.

R2:
When has_key is false, submitted ENGINE inspection items must use NOT_INSPECTABLE.

R3:
NOT_INSPECTABLE requires a note.
MAJOR_DAMAGE requires at least one photo reference.

R4:
Only allow:
DRAFT → SUBMITTED
SUBMITTED → APPROVED
SUBMITTED → RECHECK
RECHECK → SUBMITTED

Illegal transitions return 409.

R5:
SUBMITTED requires all 14 checklist points. Return a separate field-level error for each missing point.

R6:
Only DRAFT and RECHECK inspections can be edited. Reject stale versions with 409. APPROVED inspections are immutable.

R7:
Persist audit events for status transitions and non-duplicate sync results according to the specification.

Keep business logic in services, not resource controllers.

## 7. Offline synchronization

Implement E7 with careful attention to idempotency and concurrency.

Each batch item must be processed independently.

The result must preserve request order.

Possible results:
- CREATED
- UPDATED
- DUPLICATE
- CONFLICT
- REJECTED

Implement the exact evaluation order from the PDF:

1. Unknown client_id: validate, then CREATED or REJECTED.
2. Existing client_id with identical server data: DUPLICATE.
3. Existing record with conflicting status or base_version: CONFLICT.
4. Otherwise validate and update: UPDATED or REJECTED.

Compare all relevant fields, including normalized inspection items and photo references.

Ensure:
- Duplicate retries do not increment versions.
- Duplicate retries do not create duplicate audit events.
- Stale updates cannot overwrite newer data.
- APPROVED data cannot be changed.
- One rejected item does not cancel other batch items.
- Concurrent requests cannot create duplicate client_id records.

Create automated tests for scenarios S1–S5.

## 8. Operational quality

Implement:
- Centralized exception mapper
- Structured JSON request logging
- Request ID
- PostgreSQL and MongoDB readiness checks
- OpenAPI at /q/openapi
- Health at /q/health
- Environment-based configuration
- Safe CORS configuration for local frontend development

Ensure the backend starts on port 8080.

Docker Compose must start backend, PostgreSQL, and MongoDB with a single command:

`docker compose up --build`

## 9. Automated tests

Create at least four meaningful automated tests, covering:

- R2 or R3 validation
- R4 or R6 status/version conflict
- S2 duplicate sync idempotency
- S4 stale-version conflict

Prefer additional tests for:
- All state transitions
- Missing checklist points
- Invalid vehicle
- Batch partial failure
- Approved immutability
- Concurrency
- Audit behavior

Run:

`cd backend && ./mvnw test`

Do not use mocks to conceal broken integration behavior.

## 10. Performance assessment

Use the original `seed_via_api.py` supplied by LOGIQUE.

Execute:

`python3 scripts/seed_via_api.py --count 50000`

Benchmark:

GET /api/v1/inspections?status=SUBMITTED&limit=20&page=1

GET /api/v1/inspections?status=SUBMITTED&limit=20&page=2000

First benchmark without additional performance indexes beyond primary key and unique constraints.

Record:
- Actual latency in milliseconds
- PostgreSQL EXPLAIN (ANALYZE) output
- Query plan
- Dataset size
- Test environment

Then implement an appropriate indexing or query optimization strategy.

Commit the performance change separately using a commit message beginning with `perf:`.

Repeat the benchmarks.

Document real before/after results in SUBMISSION.md.

Never invent benchmark values.

## 11. Frontend implementation

Create a responsive inspection form with routes:

- /inspections/new
- /inspections/:id

Features:
- Vehicle selection from E1
- Inspector name
- Has-key toggle
- Checklist grouped by EXTERIOR, INTERIOR, ENGINE
- Condition selection
- Notes
- Photo reference filenames
- Save Draft
- Submit inspection
- Current status
- Current version
- Loading states
- Field-level validation errors
- Success and error toast notifications

Implement frontend validation mirroring R2 and R3.

When has_key is false, automatically set ENGINE points to NOT_INSPECTABLE and require the appropriate notes.

Use custom hooks for API interactions and TypeScript interfaces for request and response models.

Configure API URL through VITE_API_URL.

The frontend must work at 1280px and 768px.

Verify:

`cd frontend && npm install && npm run dev`

Focus on usability, clarity, and correctness rather than decorative complexity.

## 12. Git workflow

Use meaningful incremental commits, at least six.

Suggested commit sequence:

1. chore: initialize Quarkus and Docker infrastructure
2. feat: implement database schema and vehicle API
3. feat: implement inspection CRUD and validation
4. feat: implement transitions and audit logging
5. feat: implement offline synchronization
6. test: cover business rules and sync scenarios
7. perf: optimize inspection listing
8. feat: implement React inspection form
9. docs: complete submission documentation

Commit only verified work.

Do not rewrite or fabricate commit history.

After final verification, create:

`git tag v1.0-submission`

Do not push to a remote repository unless an authorized remote has been configured.

## 13. Documentation

README.md must include:

- Project overview
- Architecture
- Database design
- Setup instructions
- Docker instructions
- API overview
- Testing instructions
- Performance methodology
- Technical decisions and trade-offs
- Assumptions
- AI usage declaration

Explain at least three technical decisions:

1. MongoDB versus PostgreSQL for audit logging.
2. Offline sync idempotency and conflict resolution.
3. Performance optimization strategy.

AI usage must be declared honestly, including:
- Tools used
- AI-assisted sections
- Human-written or human-reviewed sections
- One real example of an incorrect or excessive AI suggestion and how it was detected

Do not invent human contributions or AI mistakes.

Create SUBMISSION.md using the supplied template.

Complete its feature checklist truthfully.

## 14. Final verification

Before declaring completion:

1. Run all backend tests.
2. Run frontend build.
3. Verify Docker Compose starts successfully.
4. Verify all required endpoints.
5. Verify PostgreSQL and MongoDB readiness.
6. Verify the exact response contracts.
7. Verify sync idempotency and conflicts.
8. Verify migrations from an empty database.
9. Verify the frontend form.
10. Verify performance results are documented.
11. Verify no secrets are committed.
12. Verify README and SUBMISSION.md.
13. Verify Git commits and final tag.

Do not delete existing project data or Docker volumes without explicit approval.

If an environment limitation prevents verification, record it transparently.

## 15. Execution behavior

Execute the work phase by phase:

Phase 1: Project setup, Docker, databases, migrations.
Phase 2: Backend endpoints and business rules.
Phase 3: Offline sync and audit logging.
Phase 4: Automated tests and performance.
Phase 5: Frontend.
Phase 6: Documentation and final verification.

Continue automatically between phases when the previous phase is verified.

Fix compilation errors, failing tests, and runtime problems before proceeding.

Avoid unnecessary questions about implementation details that can be resolved from the specification.

Ask only when a critical ambiguity, missing mandatory file, destructive operation, or external authorization prevents safe progress.

Provide a concise progress report after each phase.

## 16. Final report

At completion, report:

- Implemented requirements
- Tests executed and results
- Docker verification status
- Actual performance results
- Git commit history
- Final tag
- Known limitations
- Any remaining manual submission steps

Remember: correctness, simplicity, testability, and clear engineering reasoning are more important than feature quantity.

Start by reading and comparing the supplied documents, then implement the project.