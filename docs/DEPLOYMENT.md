# SupportDesk AI Deployment Guide

This guide explains how to deploy SupportDesk AI in a production environment using Docker Compose.

## Prerequisites

- A Linux server (Ubuntu 22.04 recommended)
- Minimum 4GB RAM, 2 vCPUs (8GB recommended)
- Docker and Docker Compose installed
- A domain name pointing to the server IP

## 1. Initial Setup

Clone the repository and prepare the environment:

```bash
git clone https://github.com/your-org/supportdesk.git /opt/supportdesk
cd /opt/supportdesk
```

Create the production environment file:

```bash
cp .env.example .env.production
nano .env.production
```

**Critical `.env.production` Variables:**
- `SECRET_KEY`: Must be a long, random string (e.g., `openssl rand -hex 32`)
- `POSTGRES_PASSWORD`: Strong database password
- `REDIS_PASSWORD`: Strong Redis password
- `ENVIRONMENT`: Must be set to `production`
- `FRONTEND_URL`: Your public domain (e.g., `https://support.example.com`)
- `NEXT_PUBLIC_API_BASE_URL`: `https://support.example.com/api/v1`

## 2. Generate SSL Certificates

We use Nginx as a reverse proxy. Before starting Nginx, generate SSL certificates using Let's Encrypt:

```bash
sudo apt install certbot
sudo certbot certonly --standalone -d support.example.com
```

Update `docker-compose.prod.yml` to mount the certificates into the Nginx container (uncomment the SSL volume mounts).

## 3. Deploy

Start the production stack:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

Verify everything is running:

```bash
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f backend
```

## 4. Run Migrations

Initialize the database schema:

```bash
docker exec -it supportdesk_backend alembic upgrade head
```

## 5. Automated Deployments (CI/CD)

The repository includes GitHub Actions for CI/CD (`deploy.yml`).
To enable auto-deployments, add these secrets to your GitHub repository:
- `SERVER_HOST`: The IP address of your server
- `SERVER_USER`: SSH user (e.g., `ubuntu`)
- `SERVER_SSH_KEY`: Private SSH key for access

On every push to `main`, the pipeline will build images, push to GHCR, SSH into the server, and restart the containers.
