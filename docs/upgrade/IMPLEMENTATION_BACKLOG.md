# SupportDesk phased implementation backlog

Status: Phase 0 complete; Phases 1–9 proposed and not implemented. Each phase is a separate reviewable delivery with tests, a commit and pushed feature branch. Preserve all current support flows. The detailed schemas/API behavior are in the target and database plans. No UI exposes a feature before its backend works.

## Phase 0 Repository audit

Delivered the audit, current architecture, target gaps and specifications, dependency compatibility, database plan, Google Cloud migration instructions and this backlog. Baseline checks are in `BASELINE_CHECKS.md`. Exit: review the findings and approve incremental implementation before architectural changes, as requested in the supplied brief.

## Phase 1 Production prerequisites and application shell

Begin with prerequisite fixes from SEC-01/02/03, AI-01 and DEP-01 before adding any new AI surface. Fail closed for unconfigured OAuth and embeddings outside tests; tenant-scope suggestion actions; enforce knowledge visibility; remediate dependency advisories. Then align existing sidebar, top bar and shared components with the white/blue-gray support design. Keep existing URLs and responsive navigation. Add typed contracts incrementally; defer organization switching and notifications until real APIs exist.

Affected paths: backend `src/services/oauth.py`, `ticket_copilot.py`, `retrieval.py`, `embeddings.py`, `src/api/v1/ai.py`, permission definitions and security tests; frontend `components/AdminSidebar.jsx`, `app/admin/layoutClient.jsx`, `app/globals.css`, package/lockfile and new shared UI/API types.

API/database: reuse current routes; visibility-aware retrieval accepts authenticated actor scope; explicit unavailable-provider errors; no new product tables needed for shell. Add role permission migration only if required by stricter AI action policy.

Verification: missing credentials cannot authenticate mock users; other-tenant suggestion mutations fail; customer cannot retrieve internal evidence; missing model cannot persist zero vectors. Existing auth/RBAC/ticket suites and security audit pass. Lint/build and browser mobile/desktop keyboard navigation pass.

Manual verification: log in as Owner, Agent and Customer; check permitted navigation and error states, create/reply to a ticket, try an unavailable OAuth provider, and verify denied cross-tenant paths using isolated test tenants. Report results before Phase 2.

## Phase 2 Support operations dashboard

Replace fixed metrics and incorrect cohort calculations with real aggregates. Define created/resolved date cohorts, active backlog, public first response, SLA eligibility, accepted AI-assisted resolutions and unavailable CSAT. Add trends, priority/category breakdowns, workload and recent activity with one consistent date filter and exports.

Affected paths: `src/services/analytics.py`, `src/api/v1/analytics.py`, `src/schemas/`, `tests/test_analytics.py`, new API isolation tests, frontend `app/admin/dashboard/page.jsx` and reusable chart/state components.

API/database: validated date ranges (bounded), timezone and stable filters; nullable unavailable metrics plus sample sizes. Use current tickets/threads/timeline/assignment/suggestion records first. No fabricated survey values; survey schema follows only with working collection flow.

Verification: compare aggregates against deterministic multi-tenant fixtures; test deleted records, no-data denominators, SLA absence, first-response exclusions and filter/export parity. Run backend suite, frontend lint/build and responsive chart checks.

Manual verification: create, assign, publicly reply and resolve known test tickets; confirm each count, SLA denominator and date filter updates. CSAT displays unavailable until actual responses exist. Report results before Phase 3.

## Phase 3 Advanced ticket management

Improve the existing list/detail experience before creating duplicate screens. Keep state transitions, notes, merges and bulk operations. Add saved filters, links and mentions with authorized targets; expose existing routing recommendations and SLA; add similar/duplicate recommendations without automatic merges. Summaries depend on the shared provider in Phase 4 and remain hidden until ready.

Affected paths: `src/services/ticket.py`, `routing_engine.py`, ticket repository/schema/router, additive migrations, ticket/security tests, frontend ticket list/detail and assignment controls.

API/database: saved-filter and link/mention tables; tenant-validated link endpoints; paginated filters and explicit bulk partial-failure responses. Both sides of every merge/link are authorized; preserve internal-note visibility.

Verification: lifecycle regression, concurrent assignment, bulk RBAC, tenant-isolated link/merge/mention, pagination and mobile detail usability. Full backend checks and frontend build.

Manual verification: save/reopen a filter, assign and reply, add an internal note, link/merge authorized test tickets, and check customer cannot see internal content. Report results before Phase 4.

## Phase 4 Vertex AI support assistant

Implement shared provider and the real LangGraph classify/retrieve/respond/gate/escalate workflow. Wire existing draft endpoints to it with compatibility adapters. Introduce traces, per-attempt accounting and budgets with the first live provider call; the administrative visualization follows in Phase 8. Extend chat with controlled read-only ticket/knowledge/analytics tools, bounded conversation history, streaming status and feedback. Add summaries, translation and tone through validated operations, not arbitrary prompts/actions.

Affected paths: new `src/ai/providers/`, `workflows/`, `prompts/`, `observability/`, `cost/`; existing copilot, routing and embedding service adapters; `src/api/v1/ai.py`, new AI schemas/repositories; additive AI tables/permissions; frontend `app/admin/ai/page.jsx`, ticket assistant panel and typed streaming client.

API/database: workflow/model-call/cost/span/prompt/feedback tables and budget reservation; run detail/history, trace, feedback and streaming contracts from target plan. Idempotency is tenant/actor/purpose scoped, tied to a request hash. Existing chat and suggestion data remain accessible.

Verification: deterministic graph paths, no-evidence escalation, invalid citation rejection, model safety/error handling, total call/deadline limits, exact Decimal accounting, absent usage/pricing states, simultaneous budget reservations, read-only tool authorization and retry idempotency. With configured GCP identity, execute a small live generation/embedding test; no mocked response is labeled live.

Manual verification: request a draft from a published test article, inspect citation and trace, edit/accept, then explicitly send through existing reply action. Ask assistant for an authorized ticket and verify unknown/cross-tenant lookups fail. Remove model access and confirm explicit failure/escalation. Report results before Phase 5.

## Phase 5 Reliable workflow automation

Extend current rules with typed conditions, allowlisted actions, branches, scheduling/delay, durable event dispatch, versioned execution history, bounded retry and failure replay. Start templates for priority/assignment/SLA escalation using current services. Add a visual builder only after the execution model works.

Affected paths: `src/services/automation.py`, `event_bus.py`, `routing_engine.py`, `src/workers/`, Celery configuration, automation schema/router, outbox/rule-version/execution migrations and new automation UI.

API/database: durable outbox and unique `(organization, event, rule_version, action)` key; validate action targets and preserve event schema version. API exposes paginated executions/failure detail/retry with automation permissions. Separate scheduler ownership from action execution.

Verification: broker down after commit, duplicate/reordered delivery, delayed execution after restart, action failure/backoff/exhaustion, bounded retry, loop/depth limits, tenant isolation and safe manual replay. Full backend checks and frontend build.

Manual verification: enable a template, create a matching/nonmatching ticket, inspect execution outcomes, stop broker and recover, replay failed action without duplicate ticket effects. Report results before Phase 6.

## Phase 6 Knowledge and customer intelligence

Replace local uploads with private Cloud Storage, version ingestion, implement retry-safe vector writes and lexical/vector hybrid search, and inspect source provenance. Build customer detail and interaction timeline from current records. Derive knowledge gaps from missing-evidence runs and keep generated articles as drafts.

Affected paths: `src/services/storage.py`, `retrieval.py`, `kb_vector.py`, document/KB workers and routers, customer service/router/schema, storage/vector migrations, frontend knowledge/documents/customer pages.

API/database: private object references, source/embedding version, unique ingestion generation; authorized downloads and bounded search; customer timeline pagination; article feedback reuses existing vote/version models. Reindex across a new model generation with rollback.

Verification: isolated API/worker instances process the same object, instance replacement retains files, unauthorized object access fails, repeat ingestion adds no duplicates, unpublished/internal/deleted sources stay excluded, source edits invalidate cache. Compare real retrieval recall before/after hybrid search.

Manual verification: upload an article/document, process through worker, open authorized citation, edit/reindex, retry processing, inspect customer history and verify no cross-tenant sources. Report results before Phase 7.

## Phase 7 Workforce analytics and reporting

Build real team/agent reports, capacity and SLA/response/resolution/reassignment metrics; preserve skills, hours and presence. Add actual CSAT survey collection only with authorized delivery and response handling. Derive customer sentiment trends from measured classifications with date/sample disclosure.

Affected paths: analytics, customer/agent/team services and routers, survey schema/migration if implemented, frontend workforce/reports/customer views and exports.

API/database: shared date/cohort definitions, expiring presence and actual survey responses. Existing assignment history and thread timestamps are reused. Personal agents cannot read tenant-wide administrative metrics without permission.

Verification: metric fixtures, timezone/SLA boundaries, inactive agents, reassignment attribution, survey deduplication and report/export parity. Full backend checks and frontend build.

Manual verification: compare two agents with known ticket histories and expired presence; submit a real test survey and confirm sample-size/CSAT updates. Report results before Phase 8.

## Phase 8 AI Insights evaluation and optimization

Expose actual run/trace/token/latency/failure/cost data from Phase 4 in an administrative UI. Build versioned offline evaluation and model/prompt experiments, sampled asynchronous online review, human feedback and pricing management. Keep mocked regression and live quality benchmarks clearly separate.

Affected paths: `src/ai/evaluation/`, AI analytics repositories/router/schema, evaluation tasks/CLI and Job entrypoint, dataset/results/experiment/pricing migrations, frontend new AI Insights route/components; `.github/workflows/evaluation.yml`.

API/database: immutable evaluation dataset and model/prompt/source snapshots, case-level outcomes and experiment pairs; usage completeness and currency retained in aggregates; no double counting span and model-call cost. All new administrative permissions seeded deliberately.

Verification: stable dataset hashes, expected outcomes excluded from prompts, paired-run regression calculation, cost sum parity, asynchronous judge budget, restricted source/trace access and deterministic CI gates. Run actual small-batch Vertex benchmark with configured account; increase toward 160 reviewed cases. Measure caching/context/model tradeoffs against the same baseline before claiming optimization.

Manual verification: execute both evidence and escalation tickets, inspect their traces and accounting; run A/B prompt experiment, inspect individual regressions and measured cost/latency, submit feedback. Confirm raw prompts are absent from Cloud Trace. Report results before Phase 9.

## Phase 9 Production hardening and deployment

Implement reviewed Terraform, Artifact Registry builds, Cloud Run API and worker pool, Cloud SQL, Memorystore, private storage, Secret Manager, tracing/monitoring, migration/evaluation Jobs and GitHub WIF. Follow the migration plan's account, backup, staging, canary and rollback sequence. Do not retire Render before recovery/cutover checks.

Affected paths: `infrastructure/gcp/`, `infrastructure/scripts/`, backend Dockerfile/entrypoints/settings, new Cloud Run deployment workflows, existing health/observability modules and `docs/runbooks/`.

API/database: backwards-compatible rollout, isolated migration identity and private network access. Pool budget must consider instance count × Uvicorn workers × `(pool_size + max_overflow)` for API, plus Celery and Jobs; cap at database connection capacity.

Verification: clean PostgreSQL migrations and upgrade snapshot; actual Redis failure recovery; workload/load and p95 baseline; graceful termination, duplicate delivery and rollback; runtime Vertex IAM; private object/RBAC tests; exact source→draft→human reply flow in deployed browser; alert delivery, backup restore and billing review.

Manual verification: use the new frontend with separate Owner/Agent/Customer test identities; ticket CRUD, routing, notes/reply, knowledge ingestion/retrieval, chat, automation, reports and AI Insights all work. Trigger a controlled model failure and verify trace/alert/escalation. Record evidence, actual operating cost and architecture walkthrough. Only measured improvements go into resume bullets.

## Delivery protocol for every phase

Explain scope and API/schema changes before implementation. Keep each phase in a focused commit or small commit series; run meaningful security/unit/integration checks plus frontend lint/build, fix failures, then report changed behavior, verification and outstanding external setup. Provide manual verification steps and report results before proceeding to the next phase. Keep the roadmap status truthful when a credential-dependent live test remains blocked; do not label it complete based solely on mocks.

The initial architectural approval is the explicit gate from the supplied brief. Routine implementation and reversible fixes within the approved plan can then proceed without repeated approval requests. Destructive cleanup, real data cutover or a material architecture change gets a concrete reviewable proposal before execution.
