# SupportDesk database change plan

Use additive Alembic migrations extending the current single head `c1a8f9b2d4e6`. Keep `src/models.py` and existing repository conventions initially. Existing `WorkflowExecution` means business automation execution; new AI runs must not be conflated with it.

## Proposed new AI records

All tenant-owned rows use UUID IDs, organization foreign keys, UTC-aware timestamps and tenant/time indexes. Global model pricing is centrally managed and readable only through administrative application paths. Explicit cross-tenant composite constraints supplement service-layer query scoping.

| Table | Principal fields and constraints |
| --- | --- |
| `ai_workflows` | organization, actor, ticket or identified system operation, trace ID, purpose, status, model/prompt/config snapshot, input hash, idempotency key, start/end and failure class. Unique `(organization_id, actor_id, purpose, idempotency_key)`; terminal status constraints. |
| `ai_model_calls` | organization, workflow, attempt UUID, operation/agent/model/region, provider request ID when reported, usage JSON categories, usage completeness, latency, status, error class, prompt version. Unique attempt ID. Composite parent FK prevents cross-tenant association. |
| `ai_trace_spans` | organization, workflow, trace/span/parent IDs, name, status, start/end and allowlisted attributes. Unique `(workflow_id, span_id)`; never store raw model payloads. |
| `ai_prompt_versions` | organization or controlled system template, name/version, content hash, template and parameter schema, approval and activation metadata. Activated versions immutable. |
| `ai_model_pricing` | provider/model/operation/region/tier/currency, immutable version, effective dates, category rates, source URL and verification date. Reject overlapping active intervals for the same pricing key. |
| `ai_cost_records` | organization, model call, pricing version, usage snapshot, estimated amount `NUMERIC(20,10)`, currency and completeness/reconciliation state. Unique model-call FK; unknown values nullable, never zero-filled. |
| `ai_budget_reservations` | organization, workflow/attempt key, reserved/settled amount, currency, state and expiry. Atomic locking and unique attempt prevent concurrent overspend. Uncertain usage requires reconciliation before release. |
| `ai_evaluation_datasets` | organization, name/version, content/source snapshot hash, provenance, review status and immutable metadata. |
| `ai_evaluation_cases` | organization, dataset, stable case key, input fixture, authorized source references, expected labels/criteria and tags. Expected labels are never model input. |
| `ai_evaluation_runs` | organization, dataset version, model/prompt/config/evaluator versions, status, requester, trace, start/end and aggregate results. |
| `ai_evaluation_results` | organization, run, case, workflow, scores/findings, latency, cost completeness and reviewer labels. Unique `(run_id, case_id)`. |
| `ai_feedback` | organization, workflow/suggestion, actor, accepted/edited/rejected, rating/reason and separately controlled edited text. Preserve original suggestion. |
| `ai_experiments` | organization, dataset snapshot, A/B configurations, linked evaluation runs, paired regression results and quality/cost/latency deltas. |

## Extend existing support records

- `AISuggestion`: link workflow, retain original draft, prompt version and explicit review state. Scope through its ticket on every query. Do not treat acceptance as a sent reply.
- `KnowledgeVector`: embedding provider/model/dimensions and source version/content hash; unique source/chunk/model version prevents retry duplicates. The existing 768-dimensional embedding column remains until a verified migration requires changing it.
- Documents: private object key, storage provider, content hash and ingestion version. Keep old path references during the copy-and-verify period.
- Automation rules/executions: immutable rule version, trigger event ID, action index, scheduled time, attempt count, next retry, terminal failure reason and unique execution key. Keep existing rule CRUD compatible.
- Event outbox: organization, event ID/type, schema version, payload, dispatch status, retry/lease and next attempt. Write business change and outbox in one transaction, dispatch separately.
- Customer satisfaction: add actual survey invitations/responses before displaying CSAT. Add unique ticket/respondent constraints and opt-in retention rules.
- Saved filters, ticket links and mentions: owner/organization, validated targets and filter schema. Existing ticket merge model remains the authority for merges.
- First response and workload metrics: derive from public threads, lifecycle and assignment history where possible. Backfill materialized fields only when measured query cost warrants it.

## Migration sequence

1. Snapshot the current database and confirm `alembic current` matches expected head. Test restoring that backup to a separate PostgreSQL instance.
2. Add telemetry, pricing, evaluation and outbox tables without changing existing API behavior. Seed explicit permissions through a migration, using current role defaults.
3. Add nullable linkage and storage/version fields. Deploy code capable of reading old and new representations.
4. Backfill in tenant-scoped batches with resumable checkpoints, counts, checksums and transaction bounds. Do not send real customer data to an evaluation dataset.
5. Re-embed sources into a separate model/version generation. Equal vector dimensions do not make embeddings from different models compatible. Validate retrieval quality and isolation before switching reads.
6. Add required uniqueness/foreign keys after cleanup; create large PostgreSQL indexes with appropriate non-blocking strategy. Validate on PostgreSQL, since SQLite cannot verify pgvector, enum or PostgreSQL locking behavior.
7. Run migrations as a single Cloud Run Job with an advisory lock. Runtime APIs do not apply schema on startup. Roll out code after migration success.
8. Retain old objects/index generation for a documented rollback window, then remove only after explicit cleanup review. Avoid destructive downgrades of production data; prefer application rollback and forward schema repairs.

## Isolation and retention

Every list/detail/export query starts with `organization_id` and appropriate actor scope; child objects are joined through the authorized parent. Tenant identity always comes from authenticated context, never an LLM response or trusted request body. Composite `(organization_id, id)` keys and tenant/parent foreign keys prevent accidental cross-tenant references. Public customer retrieval applies visibility in addition to organization scope.

Proposed starting retention policy for review: detailed sanitized spans 30 days, run and feedback metadata 90 days, aggregate cost/accounting and evaluation summaries 365 days; full prompts/responses are not collected by default. Implement deletion by organization and separate minimal accounting retention obligations from customer content. Make durations configuration, document archival and execute retention through bounded jobs. Enable backups and verify tenant erasure does not leave source text in caches, objects or evaluation exports.

## Required verification

Fresh PostgreSQL plus pgvector migration to head; upgrade from a representative old snapshot; schema/model parity; parallel migration exclusion; backfill restart; uniqueness under concurrent retry; foreign-key tenant rejection; original ticket/KB tests; precise Decimal cost sums; UTC range boundaries; deletion/cascade and retention behavior. Compare cost totals to unique model-call records and report incomplete usage separately.
