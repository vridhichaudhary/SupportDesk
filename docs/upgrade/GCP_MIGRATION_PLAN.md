# SupportDesk Google Cloud migration

This is a deployment plan and account preparation guide, not a record of deployed resources. Cloud Run and Vertex AI are the target. No project ID, billing account, region, cloud credentials or cloud access was supplied; the local `gcloud` CLI is not installed. Complete the account steps below privately when ready. Application development can proceed after plan approval without sharing secrets.

## Manual account preparation

1. Sign in to [Google Cloud Console](https://console.cloud.google.com/) with the account that will own SupportDesk. Create or select a dedicated development project. Record its project ID and project number; they are identifiers, not credentials.
2. Link a billing account in Billing. Choose a monthly development budget you can afford; configure actual and forecast alerts at 50%, 80% and 100%. Budget alerts do not cap spending. See [budget setup](https://cloud.google.com/billing/docs/how-to/budgets). Do not provision Cloud SQL, Memorystore or an always-on worker until their estimate fits that budget.
3. Choose the deployment/data region based on data residency, Gemini/embedding availability, worker-pool availability and latency. `us-central1` is a candidate to verify, not a presumed user preference or final selection. Keep SQL, Redis, storage and API colocated when supported; verify global model endpoints against residency requirements.
4. Install Google Cloud CLI using Google's [installation instructions](https://cloud.google.com/sdk/docs/install), or open Cloud Shell in the project. In a private local terminal run:

   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   gcloud auth application-default login
   gcloud auth application-default set-quota-project YOUR_PROJECT_ID
   gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)'
   ```

   Application default login is for local development. Deployed containers use service-account identity; do not create or upload service-account JSON keys.

5. With a project administrator, enable the APIs needed for the reviewed deployment:

   ```bash
   gcloud services enable \
     run.googleapis.com aiplatform.googleapis.com \
     artifactregistry.googleapis.com cloudbuild.googleapis.com \
     sqladmin.googleapis.com redis.googleapis.com \
     secretmanager.googleapis.com storage.googleapis.com \
     compute.googleapis.com servicenetworking.googleapis.com \
     cloudtrace.googleapis.com logging.googleapis.com monitoring.googleapis.com \
     iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com \
     cloudscheduler.googleapis.com
   ```

   Billing export reconciliation additionally needs BigQuery configuration. API enablement does not prove model access; verify the chosen Gemini and embedding model in the project's console and execute a small authenticated test after the provider adapter exists.

6. Supply project ID, selected region, frontend URL and development budget as plain configuration. Keep database URLs, signing keys, OAuth secrets and any current production credentials in Secret Manager/local ignored environment files, never in chat or Git.
7. Register exact frontend OAuth callback URLs in Google/GitHub provider consoles and enable only configured providers. If frontend origin remains unchanged, keep callback URLs stable. Verify production login and refresh against the new API before cutover.

## Infrastructure to implement after approval

Use `infrastructure/gcp/` Terraform with separate development and production variables and a versioned remote state bucket. No secret plaintext belongs in checked-in tfvars or outputs. Terraform state is sensitive and needs private access. Prepare a plan before applying resources.

| Resource | Design and validation |
| --- | --- |
| Artifact Registry | Private Docker repository, immutable commit/digest image references and retention policy |
| API Cloud Run service | Existing FastAPI image, runtime `$PORT`, non-root, explicit concurrency/max instances, startup/liveness probes, min instances zero initially if latency permits |
| Cloud SQL PostgreSQL | pgvector extension, backups/PITR where supported, encrypted connections and no unrestricted public access. Verify supported [extensions](https://cloud.google.com/sql/docs/postgres/extensions). Size from measured need. |
| Memorystore Redis | Private VPC access, compatible auth/TLS configuration, persistence/HA choice and explicit queue/cache namespaces. Match task visibility timeout to execution limits. |
| Cloud Storage | Private bucket, uniform access, public access prevention, organization-prefixed keys, controlled signed downloads and lifecycle rules |
| Celery worker pool | Existing queues, explicit capacity, private network, graceful SIGTERM and tested task redelivery. Never assume Celery process autoscale changes Cloud Run instance count. |
| Scheduler | Keep exactly one Beat during transition, or replace each periodic trigger with authenticated Scheduler-to-Job invocation. Never run both schedulers for the same task. |
| Jobs | Separate bounded migration, evaluation, retention and optional scheduled operations; explicit retries/parallelism and execution identity |
| Secret Manager | Per-secret runtime access, version pinning/rotation procedure; see [Cloud Run secrets](https://cloud.google.com/run/docs/configuring/services/secrets) |
| Monitoring | API error/latency, model 429/5xx, queue age, worker health, stuck runs, incomplete accounting and budget pressure alerts with an actionable runbook |

Cloud Run [filesystems are disposable](https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run); document object migration precedes splitting API and workers. Direct VPC egress/private networking for SQL/Redis must be validated from both runtime identities.

## Identity boundaries

Separate API, worker, migration/evaluation and deployment identities. Runtime identities receive Vertex invocation permissions, scoped SQL access, Trace/Logging/Monitoring write and only the necessary bucket/secret permissions. Workers read relevant objects; API upload/delete permissions are explicit. The migration identity may alter schema; ordinary runtime database roles should not. Avoid project Owner/Editor for runtime.

GitHub Actions uses [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines), constrained to this repository and approved deployment branch/environment. Grant the deploy identity only image-push/deploy and specific service-account act-as permissions. Configure GitHub environment variables for project, region, registry, WIF provider and deployment service account. No long-lived cloud key is needed.

Browser clients cannot supply a private Cloud Run service identity. For the current direct Vercel-to-API design, public transport invocation must still require existing application authentication and endpoint RBAC. Administrative jobs and scheduler calls stay IAM authenticated. If the API later becomes private, introduce a reviewed server-side proxy that authenticates [service-to-service](https://cloud.google.com/run/docs/authenticating/service-to-service); do not expose an identity token to the browser.

## Deployment and data cutover

1. Build/scan immutable image; run unit, PostgreSQL/Redis integration, frontend and evaluation gates. Separate deployment workflow from the old GHCR/SSH workflow to avoid accidental dual deployment.
2. Create development infrastructure using reviewed Terraform plan. Configure Secret Manager references and exact CORS origins. Run the migration Job once; do not migrate from API startup.
3. Deploy an API revision with no production traffic. Confirm `/live`, dependency readiness, auth denial, tenant isolation and Vertex inference from its runtime identity. Confirm matching Cloud Trace and durable usage/cost records.
4. Test private document upload, separate-worker ingestion, authorized source download and retrieval after instance replacement. Verify query and document embedding model/version alignment.
5. Run a bounded evaluation Job with a fixed source snapshot and dataset; record real quality, cost and latency. Run a small concurrency test within budget.
6. Rehearse database/object backup and restore. Copy historical objects with hashes; migrate DB using a tested export/import or managed migration strategy appropriate to actual size and permitted downtime.
7. During final cutover use a maintenance/read-only window unless a separately reviewed replication plan exists. Stop old writes and duplicate schedulers, drain/transfer queues safely, synchronize data and verify counts/checksums. Avoid split-brain writes to old and new databases.
8. Point the frontend API variable to the verified Cloud Run endpoint and redeploy frontend. Canary traffic, verify OAuth/replies/uploads and observe error rate, latency, queues and budget. Record revision digest and database head.
9. Roll back application traffic to a known-good compatible revision if needed. After new writes begin, do not point clients at an outdated database without reconciliation. Retain migration backups and old objects for the agreed rollback window.

## Evidence needed before production claims

Authenticated Vertex generation and embeddings from runtime IAM; denied unauthenticated private jobs; isolated tenants/customers; non-public objects; trace continuity API-to-worker; usage and price completeness; deterministic retry accounting; real evaluation report; bounded cost/load test; migration recovery rehearsal; alert delivery; and an executed rollback procedure. Cloud SQL/Memorystore/worker baseline expenses must appear separately from token estimates.
