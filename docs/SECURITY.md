# SupportDesk AI Security Guide

Security is enforced at multiple layers of the application.

## 1. Network Level (Nginx)

Nginx is configured with strict rate limits to prevent abuse:
- **API Endpoints:** 30 requests/second per IP (burst 60)
- **Auth Endpoints:** 5 requests/minute per IP (prevents brute forcing)
- **Static Assets:** 100 requests/second

Nginx also strips internal headers and enforces connection timeouts.

## 2. Application Level (Next.js & FastAPI)

### Security Headers
The Next.js frontend injects strict security headers on all responses:
- `Content-Security-Policy`: Restricts where scripts, images, and fonts can load from.
- `X-Frame-Options: DENY`: Prevents Clickjacking.
- `Strict-Transport-Security` (HSTS): Enforces HTTPS.
- `X-Content-Type-Options: nosniff`: Prevents MIME-sniffing.

### Cross-Origin Resource Sharing (CORS)
The FastAPI backend strictly validates the `Origin` header. Only domains listed in the `BACKEND_CORS_ORIGINS` environment variable are allowed.

### Trusted Hosts
The FastAPI backend enforces the `ALLOWED_HOSTS` variable to prevent HTTP Host Header attacks.

## 3. Container Security

- **Non-root Users:** Both the `backend` and `frontend` Docker images run as non-root users (`appuser` and `nextjs` respectively).
- **Minimal Images:** We use Alpine and Slim variants to reduce the attack surface.
- **No Source Code Mounting:** In production, source code is copied into the image, not mounted from the host.

## 4. Secret Management

Secrets must never be committed to source control. They should be injected via the CI/CD pipeline or directly on the host using the `.env.production` file.
