# SupportDesk dependency compatibility

Recorded 23 November 2026 from the repository at `156d9f4` and an isolated baseline install. The proposed AI stack still needs runtime contract tests; a resolver success alone does not prove SDK interoperability.

## Current inventory

| Component | Declared or resolved version | Implication |
| --- | --- | --- |
| Python | Render/CI 3.13; local 3.13.2 | Keep Python 3.13 parity for builds and binary wheels |
| FastAPI / Starlette | 0.141.1 / 1.3.1 | Baseline installs and tests pass; preserve pinned pair until compatibility checks |
| Pydantic / settings | 2.13.4 / 2.14.2 | Use validated structured contracts |
| SQLAlchemy / Alembic | 2.0.51 / 1.18.5 | Preserve existing session/repository style and migration graph |
| pgvector | Python 0.3.6, DB column width 768 | Embedding model/dimension changes require explicit reindexing |
| Redis / Celery | 5.2.0 / 5.4.0 | Existing queues and Beat schedules remain; test shutdown and redelivery |
| Gemini SDK | `google-generativeai==0.8.3` | Direct Developer API integration; replace through shared Google Gen AI adapter |
| Sentry / Prometheus instrumentator | Backend 2.19.2 / 6.1.0 | Preserve error reporting while avoiding duplicate telemetry/export |
| Next.js | Declared `^16.4.1`, lock 16.4.6 | Production build passes locally; use lockfile |
| React / React DOM | 19.2.0 | Preserve current component behavior |
| Recharts | Lock 3.10.1 | Reuse for all analytics |
| Frontend Sentry | Lock 10.69.0 | Current audit reports critical advisory; remediation required |
| Axios | Lock 1.19.0 | Current audit reports high advisory; remediation required |
| ESLint Next config | 15.5.3 vs Next 16.4.6 | Align supported tooling deliberately; local lint currently passes |

Frontend source is JavaScript/JSX with `jsconfig.json`. Add TypeScript incrementally around API contracts and new modules; do not rename the full frontend at once. Local verification used Node 25.1.0; repeat on the repository's CI Node 20 before merging.

## Baseline security results

`npm audit --json` reports 18 advisories: 13 moderate, 4 high, 1 critical. Affected high/critical packages include direct `@sentry/nextjs` and `axios`, and transitive `brace-expansion`, `follow-redirects`, `source-map-js`. Audit output reports fixes available, but upgrades still require dependency-path review and full frontend checks. Results are point-in-time and must be rerun after changes. Do not use blanket overrides or `npm audit fix --force` without inspecting resulting API and lockfile changes.

Python `pip check` reports no broken requirements. That checks dependency consistency, not vulnerabilities; backend image scans and dependency advisory scanning remain required. Existing tests emitted deprecation warnings including naive UTC datetime usage. Existing CI makes mypy non-blocking, so a green pipeline is not proof of type correctness.

## Proposed dependency validation

Use `google-genai`, `langgraph`, `opentelemetry-sdk`, FastAPI/Celery instrumentors and a Cloud Trace exporter or collector path. Pin a compatible resolved set only after successful provider, graph and instrumentation tests. Google recommends its [Google Gen AI SDK](https://cloud.google.com/vertex-ai/generative-ai/docs/sdks/overview); verify the installed version's Vertex client configuration, structured outputs and response usage fields against its reference before coding. Keep provider differences out of business services.

A non-mutating `pip install --dry-run -r requirements.txt google-genai langgraph opentelemetry-sdk opentelemetry-instrumentation-fastapi opentelemetry-instrumentation-celery opentelemetry-exporter-gcp-trace` was run; its final outcome is recorded in `BASELINE_CHECKS.md`. The resolver permits legacy and new SDKs to coexist during adapter migration; remove the old SDK only after every generation/classification/embedding caller has moved.

## Compatibility exit gates

1. Clean Python 3.13 install with lock/constraints, `pip check` and dependency advisory scan.
2. Provider tests for structured response parsing, safety-blocked/empty output, 429/5xx bounded retry, timeout, cancellation and absent usage.
3. Live Vertex invocation under the runtime service account; real embedding width is exactly the configured vector width.
4. Re-embed all sources when changing embedding model, even if dimensions match. Never compare vectors from unrelated model spaces.
5. Graph tests for both evidence and escalation paths, total attempt budget, idempotency and human review.
6. API-to-Celery parent/child trace propagation and exporter shutdown without duplicate spans or raw prompt capture.
7. Clean `npm ci`, lint, production build and browser checks using the selected Node version; preserve a reviewed lockfile.
8. PostgreSQL/pgvector and Redis integration tests separate from SQLite/mocked unit tests.
