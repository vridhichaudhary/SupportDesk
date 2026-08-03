# Enterprise Team & Agent Management Module
**Status**: Implemented (Phase 4C / SPEC-008)

This document provides a comprehensive overview of the architecture, API endpoints, and detailed manual verification steps to test the Team, Department, Agent, Skill, Availability, and Presence workflows end-to-end.

---

## 🏗 Architecture Overview

The module provides robust multi-tenant organizational structuring and real-time agent presence.

- **Departments**: High-level functional units (e.g., "Customer Support", "IT Infrastructure").
- **Teams**: Sub-units within departments handling specific queues (e.g., "Tier 1 Support"). Teams have defined `max_capacity` and SLAs.
- **Agent Profiles**: Extended user data tracking skills, max ticket loads, languages, and working hours.
- **Skills Matrix**: Granular skill tracking (`AgentSkill`) with proficiency levels, allowing AI to route tickets intelligently.
- **Presence Engine**: A high-performance Redis-backed stateless engine tracking real-time status. Frontend clients emit a heartbeat every ~30s. If heartbeats stop for 90s, the agent is marked `OFFLINE`.

![Architecture Diagram](https://placehold.co/800x400/1C1917/FFFFFF/png?text=Architecture:+Redis+Presence+Engine+%2B+PostgreSQL)

---

## 🌐 API Summary

All endpoints are prefixed with `/api/v1` and require Bearer Token authentication.
They are secured by the RBAC Permission Engine (e.g., `manage_teams`, `view_agent_profiles`).

### Departments API (`/departments`)
- `GET /` - List all departments (paginated).
- `POST /` - Create a department.
- `GET /{id}` - Get department details.
- `PATCH /{id}` - Update department.
- `DELETE /{id}` - Soft-delete department.

### Teams API (`/teams`)
- `GET /` - List all teams (optionally filter by `department_id`).
- `POST /` - Create a new team.
- `GET /{id}` - Get team details.
- `PATCH /{id}` - Update team details and capacity limits.
- `DELETE /{id}` - Soft-delete team.
- `GET /{id}/members` - List agents in a team.
- `POST /{id}/members` - Add an agent to a team.
- `DELETE /{id}/members/{user_id}` - Remove an agent from a team.

### Agents API (`/agents`)
- `GET /skills` - List all skills in the organization.
- `POST /skills` - Create a new org-wide skill.
- `GET /me/profile` - Get logged-in agent profile.
- `PATCH /me/profile` - Update profile metadata (languages, limits).
- `POST /me/heartbeat` - Refresh Redis TTL & fetch current presence status.
- `PUT /me/availability` - Set status explicitly (e.g., Break, Meeting).
- `GET /presence/team?user_ids=...` - Bulk fetch real-time statuses.

---

## 🔍 Detailed Manual Verification & Playbook

To manually verify the complete flow, you will simulate an Admin setting up the organizational structure, and an Agent updating their status.

### 1. Setup & Environment
Ensure your backend, frontend, and Redis server are running.

```bash
# Terminal 1: Start Redis (if not running natively)
docker run -p 6379:6379 -d redis:alpine

# Terminal 2: Start Backend
cd support-portal-backend
source venv/bin/activate
uvicorn src.main:app --reload

# Terminal 3: Start Frontend
cd support-portal-frontend
npm run dev
```

### 2. Retrieve an Auth Token
You will need a valid JWT token. You can get this by logging in via the frontend (`http://localhost:3000/login`) and inspecting the LocalStorage or Network tab, OR by calling the API directly.

```bash
# Call this and copy the access_token
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com", "password":"password123"}'

# Export it to your terminal for easy testing
export TOKEN="your.jwt.token.here"
```

### 3. Department Flow
**Objective:** Create and list a department.

1. **Create Department**:
```bash
curl -X POST http://localhost:8000/api/v1/departments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Global Support",
    "description": "Primary customer-facing support",
    "color": "#3b82f6"
  }'
```
*Expected Output*: `201 Created` with department JSON. Copy the `id`.

2. **List Departments**:
```bash
curl -X GET http://localhost:8000/api/v1/departments \
  -H "Authorization: Bearer $TOKEN"
```
*Expected Output*: `200 OK` showing a paginated list of departments.

### 4. Team Flow
**Objective:** Create a team inside the department and add capacity limits.

1. **Create Team**:
```bash
# Use the department_id from the previous step
curl -X POST http://localhost:8000/api/v1/teams \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tier 1 Support",
    "department_id": "<DEPARTMENT_ID_HERE>",
    "max_capacity": 50,
    "default_sla": 4,
    "color": "#22c55e"
  }'
```
*Expected Output*: `201 Created` with team JSON. Copy the team `id`.

2. **Add Member to Team**:
```bash
# Add yourself (or another user_id) to the team
curl -X POST http://localhost:8000/api/v1/teams/<TEAM_ID_HERE>/members \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "<YOUR_USER_ID_HERE>", "is_primary": true}'
```
*Expected Output*: `201 Created`. The team's `current_capacity` in the DB will automatically increment.

### 5. Skills Flow
**Objective:** Create a skill and assign it to an agent.

1. **Create Org Skill**:
```bash
curl -X POST http://localhost:8000/api/v1/agents/skills \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Python Diagnostics", "category": "TECHNICAL"}'
```
*Expected Output*: `201 Created`. Copy the skill `id`.

2. **Assign to Self**:
```bash
curl -X POST http://localhost:8000/api/v1/agents/me/skills \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "skill_id": "<SKILL_ID_HERE>", 
    "proficiency_level": "EXPERT",
    "years_of_experience": 4
  }'
```
*Expected Output*: `201 Created` with AgentSkill relationship.

### 6. Presence & Availability Flow (The Engine)
**Objective:** Test the Redis heartbeat and explicit availability overrides.

1. **Send Heartbeat (Simulate Frontend Polling)**:
```bash
curl -X POST http://localhost:8000/api/v1/agents/me/heartbeat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"device_info": "MacBook Pro - Chrome"}'
```
*Expected Output*: `200 OK` with `{"status": "AVAILABLE", "is_online": true, ...}`. The Redis TTL is set to 90s.

2. **Set Explicit Availability (e.g., Going on Break)**:
```bash
curl -X PUT http://localhost:8000/api/v1/agents/me/availability \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "BREAK"}'
```
*Expected Output*: `200 OK` returning `BREAK`.

3. **Verify Bulk Presence**:
```bash
# Query the team presence endpoint
curl -X GET "http://localhost:8000/api/v1/agents/presence/team?user_ids=<YOUR_USER_ID_HERE>" \
  -H "Authorization: Bearer $TOKEN"
```
*Expected Output*: `200 OK` showing a dictionary mapping user IDs to their real-time Redis presence (will show `BREAK` and `is_online: true`).

---

## 🐞 Troubleshooting & Debugging Guide

If you encounter issues during verification, check the following:

### 1. Redis Connection Errors
**Symptom**: 500 Internal Server Error when calling `/me/heartbeat`. Logs show `ConnectionRefusedError`.
**Fix**: Ensure Redis is running. Check `src/core/config.py` for `REDIS_URL`. It defaults to `redis://localhost:6379/0`.
```bash
# Check if Redis is alive
redis-cli ping
# Should return PONG
```

### 2. Authorization (403 Forbidden)
**Symptom**: 403 Forbidden on `/departments` or `/teams`.
**Fix**: Your user account does not have the required permissions. Ensure your account is assigned the `ADMIN` or `OWNER` system role.
```sql
-- Connect to Postgres and force update your role
UPDATE user_role_assignments 
SET role_id = (SELECT id FROM roles WHERE name = 'OWNER') 
WHERE user_id = '<YOUR_USER_ID>';
```

### 3. Missing Fields / 422 Unprocessable Entity
**Symptom**: Pydantic validation fails.
**Fix**: Review the exact JSON schema defined in `src/schemas/`. Ensure Enum strings exactly match (e.g., "AVAILABLE", "BREAK", "TECHNICAL"). Check the Uvicorn terminal output for the exact Pydantic `loc` error pointing to the missing/invalid field.

### 4. Database Migrations Out of Sync
**Symptom**: 500 errors referencing missing columns (e.g., `column "max_capacity" of relation "teams" does not exist`).
**Fix**: You need to run Alembic upgrades.
```bash
source venv/bin/activate
alembic upgrade head
```

---

## 🎨 UI Verification

Navigate to the frontend at `http://localhost:3000/admin/departments` and `http://localhost:3000/admin/teams`.

**Checklist:**
- [ ] Ensure sidebar contains new links.
- [ ] Verify pages render without React hydration errors.
- [ ] Verify aesthetic alignment (premium styling, progress bars for capacity).
- [ ] Verify responsive grid breaks correctly on mobile.

![Departments UI Placeholder](https://placehold.co/800x400/1C1917/FFFFFF/png?text=Departments+UI+Verification)
![Teams UI Placeholder](https://placehold.co/800x400/1C1917/FFFFFF/png?text=Teams+Capacity+UI+Verification)
