# SupportDesk AI Observability Guide

Observability is a first-class citizen in SupportDesk AI. The platform uses a combination of structured logging, Prometheus metrics, Grafana dashboards, and Sentry for error tracking.

## 1. Metrics & Grafana

We expose metrics via the `/metrics` endpoint on the backend. Prometheus scrapes this every 15 seconds.

### Accessing Grafana
- URL: `https://your-domain.com/grafana/`
- Default Login: `admin` / (check `GRAFANA_PASSWORD` in `.env.production`)

### Included Dashboards
- **API Performance:** Request rate (RPS), latency (p50, p90, p99), error rate (5xx responses)
- **Database:** Connection pool size, active connections, query duration
- **Host Metrics:** CPU, Memory, Disk usage (via Node Exporter)

## 2. Structured Logging

The backend uses `structlog` to output JSON-formatted logs in production.

Example log:
```json
{
  "event": "Ticket created",
  "ticket_id": "TKT-1234",
  "customer_id": "CUST-5678",
  "request_id": "req_abc123",
  "level": "info",
  "timestamp": "2026-08-05T12:00:00Z"
}
```
*Note: Every log includes a `request_id` that traces the request from Nginx to the backend.*

## 3. Error Tracking (Sentry)

Sentry captures unhandled exceptions in both the FastAPI backend and Celery workers.

To enable Sentry:
1. Create a project in Sentry
2. Add the DSN to `.env.production`: `SENTRY_DSN=https://your-dsn@sentry.io/123`
3. Restart the containers

## 4. Health Probes

SupportDesk exposes three health probes for orchestration systems (like Kubernetes or Docker Compose):
- `/live`: Returns 200 if the Python process is running.
- `/ready`: Returns 200 only if the DB and Redis are reachable.
- `/health`: Comprehensive health check including disk, memory, and Celery status.
