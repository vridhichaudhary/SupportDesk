# SupportDesk production AI upgrade

Phase 0 completed on 23 November 2026 against commit `156d9f4`. Application implementation and Google Cloud provisioning have not started. This proposal preserves SupportDesk as a customer support product and extends its existing FastAPI and Next.js applications.

## Review order

1. [Repository audit](REPOSITORY_AUDIT.md): verified foundations, defects and baseline checks.
2. [Current architecture](CURRENT_ARCHITECTURE.md): actual entry points and reusable modules.
3. [Target and gaps](TARGET_GAP_ANALYSIS.md): Google Cloud architecture and feature acceptance criteria.
4. [Dependency compatibility](DEPENDENCY_COMPATIBILITY.md): installed versions and migration constraints.
5. [Database change plan](DATABASE_CHANGE_PLAN.md): additive schema and migration strategy.
6. [Google Cloud migration](GCP_MIGRATION_PLAN.md): deployment decisions and account setup steps.
7. [Implementation backlog](IMPLEMENTATION_BACKLOG.md): phases, affected files, verification and exit gates.

The supplied implementation brief says “Prepare a proposed implementation plan and wait for approval before large architectural changes” and specifies documentation only for Phase 0. Approval of this proposal authorizes incremental application implementation through the listed phases; cloud billing, account access and live data migration still require the corresponding account setup and deployment details. Never send credentials in chat.

## Proposed first implementation

Start with production prerequisites: reject unconfigured OAuth in production, scope suggestion actions to the actor's organization, enforce knowledge visibility by caller, remove production mock embeddings, correct dashboard accounting and remediate dependency advisories. Then deliver the shell and operations dashboard before expanding the AI workflow.

Google Cloud target: Cloud Run API, Vertex AI Gemini through Google Gen AI SDK, Cloud SQL with pgvector, Memorystore, private Cloud Storage, Celery on a Cloud Run worker pool where supported, and Cloud Run Jobs for migrations and evaluation. Keep the current frontend deployment and existing support APIs compatible.

## Baseline results

- Backend: 181 passed, 1 skipped; 2018 warnings. Tests use SQLite and mocked external dependencies.
- Frontend: ESLint passed; Next.js production build passed, generating 34 static pages.
- Backend installed requirements: `pip check` passed.
- Alembic: one head, `c1a8f9b2d4e6`; live PostgreSQL migrations not exercised.
- npm audit: 18 advisories: 13 moderate, 4 high, 1 critical. See dependency report.
- No deployed Gemini inference, cloud resources, database migration, load benchmark or billing savings were validated in Phase 0.
