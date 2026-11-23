# SupportDesk repository audit

Audit date: 23 November 2026. Baseline: `156d9f4` on `main`. Scope includes tracked source structure, API contracts, schemas and migrations, frontend routes, auth and RBAC, ticket and knowledge services, AI providers, workers, tests and deployment configuration. Findings below distinguish static source review from executed checks. The older root audit contains historical results; those are not current verification evidence.

## Existing capabilities to retain

| Area | Evidence | Reuse |
| --- | --- | --- |
| Application backend | `src/main.py`, `src/core/factory.py` | FastAPI factory and `/api/v1` routers |
| Authentication | `src/api/v1/auth.py`, `src/core/security.py` | JWT, sessions, OAuth state and Redis nonce protection |
| Authorization | `src/core/authorization.py`, `src/core/permissions.py` | Permission registry and Owner/Admin/Agent/Customer roles |
| Tickets | `src/api/v1/tickets.py`, `src/services/ticket.py`, `src/core/ticket_states.py` | State machine, replies, internal notes, timeline, merge and bulk actions |
| Workforce | agents, teams and departments routers and services | Skills, availability, working hours, presence and membership |
| Routing | `src/services/routing_engine.py`, `src/workers/routing_tasks.py` | Classification, condition rules, agent ranking, assignment history and SLA checks |
| Knowledge | knowledge/documents routers, `kb_article.py`, `kb_vector.py` | Article lifecycle, versions, feedback, documents and vectorization |
| Retrieval | `src/services/retrieval.py` | Organization-scoped vectors and published/completed source filters |
| Ticket assistant | `src/services/ticket_copilot.py` | Draft persistence, citations and human acceptance/edit/rejection |
| Conversational assistant | `src/services/ai_copilot.py` | User and tenant scoped sessions and persisted messages |
| Analytics | `src/services/analytics.py`, dashboard page | Recharts, database aggregates and CSV export |
| Operations | root probes, structlog, Sentry, Prometheus, Docker, Render blueprint | Preserve existing health and operational integrations |

## Priority findings

Paths in this section are relative to `support-portal-backend/` unless specified.

| ID | Priority | Finding and source evidence | Required resolution |
| --- | --- | --- | --- |
| SEC-01 | P0 | `src/services/oauth.py` returns fixed Google/GitHub identities when client IDs are missing, without an environment guard. Signed OAuth state does not make these fabricated identities safe. | Disable unavailable providers and fail closed outside explicit tests; never authenticate a mock identity in production. Add missing-config API tests. |
| SEC-02 | P0 | `TicketCopilotService.record_draft_action` queries suggestion and ticket IDs without joining the ticket to `actor.organization_id`; its endpoint does not first fetch an authorized ticket. | Join and scope the ticket before reading or mutating a suggestion. Add cross-tenant accept/edit/reject denial tests and action permission checks. |
| SEC-03 | P1 | Retrieval scopes vectors by organization and source status, but does not take caller visibility or role into account. `/ai/ask` accepts any authenticated user, including customer identities; customer portal exposes the assistant. | Apply article visibility and document access rules for each caller, not only organization filters. Prove customer users cannot retrieve internal knowledge. |
| AI-01 | P1 | `MockEmbeddingProvider` produces 768-dimensional zero vectors when no key is configured; document ingestion can store them as ordinary embeddings. | Explicit unconfigured state outside tests; block indexing and queries, surface retryable configuration errors. Find and rebuild invalid vectors. |
| DATA-01 | P1 | Local storage and public `/static` mount serve uploads; document workers resolve API-local paths. Separate Cloud Run instances cannot share these files. | Private Cloud Storage objects with authorized download, tenant keys and worker reads; migrate objects before cutover. Review existing document URLs for public exposure. |
| MET-01 | P1 | Analytics returns fixed CSAT 92.5, knowledge usage 150, utilization 75, escalations 12, routing accuracy 88.5, resolution time 12.5, rating 4.8 and accepted suggestions 34. | Compute supported metrics from records and return unavailable values for missing measurements. |
| MET-02 | P1 | “AI resolution rate” counts routing decisions, not resolved tickets with accepted assistance. SLA denominator includes tickets without SLA. `Ticket.assigned_user_id is None` is a Python boolean instead of a SQL null predicate. | Define cohorts and denominators, use `.is_(None)`, exclude deleted tickets and test real aggregates. |
| AI-02 | P1 | Generation, routing and embeddings directly use `google.generativeai`; no Vertex project/location configuration. Usage metadata is not durably accounted for. | Shared Vertex provider, application default credentials, validated outputs, bounded timeouts/retries and per-attempt usage ledger. |
| AI-03 | P1 | Ticket confidence is derived from vector similarity and clamped to 50–98; it is not calibrated correctness. Citation numbers in returned text are not deterministically validated. | Separate retrieval score from quality decision; reject unknown citations and escalate on absent evidence or policy failure. |
| EVAL-01 | P1 | `evals/evaluate_copilot.py` patches generation and embeddings; response content is chosen using expected outcomes. | Keep as mocked regression coverage; add separately labeled live-model evaluation with versioned data and no expected-answer leakage into generation. |
| OPS-01 | P1 | Docker command runs migrations on every API start and uses fixed port 8000. A new Cloud Run revision may create several starts concurrently. | Dedicated migration Job, deploy ordering, advisory lock and runtime `$PORT`. |
| OPS-02 | P1 | Event publication commits then enqueues Redis delivery; enqueue failure is logged without durable dispatch retry. Worker tasks have retries, but document retries can append chunks without a unique content/version constraint. | Transactional outbox, idempotent effects, bounded redelivery and persistent failure/replay records. |
| DEP-01 | P1 | Current frontend audit reports critical/high advisories despite security upgrade commit messages. | Review current advisory paths, update compatible versions, rerun lint/build and security scans. |
| UX-01 | P2 | Frontend is JavaScript/JSX, not TypeScript. Portal profile simulates save; top-bar search has no search handler; shell uses terminal/root terminology. | Incremental typed contracts; real profile save/search or remove unusable controls; cohesive support vocabulary. |
| DOC-01 | P2 | Root README describes the legacy Node/Express/MongoDB stack. JS prototype code coexists with active Python backend. Tracked bytecode and uploaded PDFs remain in Git. | Correct setup docs, distinguish legacy paths, review artifacts before removal. Do not delete uploads without migration/backup. |

These are source findings, not a claim that deployed customer data was accessed. SEC-02 is directly visible in the action path; exploitability of existing production deployment was not tested.

## Executed baseline

Python 3.13.2. Node 25.1.0/npm 11.6.2 were available locally; CI uses Python 3.13 and Node 20, so CI parity remains a gate. Dependency installation used a separate virtual environment and workspace npm cache; global npm cache permissions did not need changing.

```bash
# From support-portal-backend with requirements.txt installed in an isolated environment
ENVIRONMENT=testing TESTING=1 \
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5433/supportdesk \
SECRET_KEY=audit-test-secret-at-least-32-characters \
GEMINI_API_KEY=ci-dummy-key-for-test python -m pytest tests -q
python -m pip check
python -m alembic heads

# From support-portal-frontend
npm ci --ignore-scripts --cache /tmp/supportdesk-npm-cache
npm run lint
NEXT_TELEMETRY_DISABLED=1 npm run build
npm audit --json --cache /tmp/supportdesk-npm-cache
```

Tests: **181 passed, 1 skipped, 2018 warnings**, 9.18 seconds. Frontend lint and build passed, 34 static pages generated. `pip check` passed; Alembic reports the single head `c1a8f9b2d4e6`. npm audit reports 18 advisories. Initial pytest invocation with `DATABASE_URL=sqlite://` failed at global engine creation because `max_overflow` is not valid for that SQLite pool. The successful invocation above preserves the configured PostgreSQL engine while fixtures inject their in-memory SQLite session.

The tests do not establish production readiness: fixtures use SQLite, MockRedis, mocked queue submission and dummy Gemini credentials; live Gemini test is skipped. Fresh/upgrade PostgreSQL migration tests, live Redis behavior, Cloud Run identity, real retrieval quality, load, billing reconciliation and deployed browser verification remain required. No application code changed during Phase 0.
