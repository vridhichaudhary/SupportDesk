# SupportDesk Phase 0 verification record

Date: 23 November 2026. Repository baseline: `156d9f4`. Scope: documentation-only audit and implementation proposal. These results were executed for this audit; historical reports were not reused as current results.

| Check | Outcome | Meaning |
| --- | --- | --- |
| Isolated backend requirements installation | Passed | Current pins resolve on Python 3.13.2/macOS |
| `python -m pip check` | Passed | No broken installed requirements |
| `python -m pytest tests -q` | 181 passed, 1 skipped, 2018 warnings in 9.18s | SQLite/MockRedis/mocked worker baseline; live model not proven |
| `python -m alembic heads` | `c1a8f9b2d4e6 (head)` | One migration head; no live migration execution |
| Python source parsing | 158 files parsed | Syntax check only, including migrations/tests/evaluation helpers |
| `npm ci --ignore-scripts` using workspace cache | Passed | Lockfile install, scripts deliberately not run at install time |
| `npm run lint` | Passed, exit 0 | Existing ESLint configuration |
| `NEXT_TELEMETRY_DISABLED=1 npm run build` | Passed, exit 0 | Next 16.4.6; 34 static pages generated |
| `npm audit --json` | Exit 1 | 18 advisories: 13 moderate, 4 high, 1 critical |
| New AI dependency dry-run against current requirements | Passed, exit 0 | Resolver-compatible candidate set; not installed or runtime-verified |
| Local document links and code fences | Passed | Proposal links resolve; fenced blocks balanced |
| `git diff --check` | Passed | No whitespace errors in reviewed diff |

## Candidate AI dependency set

Resolver output selected `google-genai==3.6.1`, `langgraph==1.2.24`, `langchain-core==1.8.4`, `opentelemetry-api==1.45.2`, `opentelemetry-sdk==1.45.2`, FastAPI/Celery instrumentors `0.66b2`, and `opentelemetry-exporter-gcp-trace==1.15.0`, alongside other transitive packages. This is a proposed compatible resolution, not an application lock or a security assessment. Runtime/provider usage tests precede adoption; Google API client configuration must match this SDK generation.

## Audit tooling observations

The default npm cache had ownership/write errors. Installation succeeded with a workspace-local cache; no privileged cache ownership changes were made. The first pytest attempt using a global SQLite URL failed because application engine settings pass PostgreSQL pool arguments; tests succeeded with the normal configured PostgreSQL URL while fixtures injected SQLite sessions. This did not require connecting to a live PostgreSQL database.

Node 25.1.0/npm 11.6.2 were available locally, while current CI uses Node 20. Google Cloud CLI and GitHub CLI are not installed. Docker daemon was reachable, but no production container deployment, PostgreSQL/Redis integration environment or cloud resources were started for this audit. Tracked bytecode modified by test imports was restored to baseline, so it is excluded from the audit commit.

## Required follow-up

Critical/high advisories and audit security defects remain unresolved in this documentation-only phase. No frontend interaction audit in a browser, deployed GCP smoke test, real model quality benchmark, load result or measured cost reduction is claimed. Use the implementation backlog gates to establish those results before describing the upgraded system as production-ready.
