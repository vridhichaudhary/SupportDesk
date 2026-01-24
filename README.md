# 🎫 SupportDesk – Role-Based Support Ticketing System

## Project Title
**SupportDesk – Role-Based Support Ticketing System**

---

## Problem Statement

Traditional support systems often rely on scattered email threads, making it difficult to track issues, assign responsibility, and manage resolution timelines. Users lack visibility into ticket progress, while administrators struggle with prioritization and accountability.

**SupportDesk** solves this problem by providing a centralized, role-based ticket management platform where users can raise issues, track their status, and receive updates, while admins can manage, respond to, and resolve tickets through a structured workflow.

---

## System Architecture

### Architecture Flow
**Frontend (Next.js)** → **Backend (Node.js + Express APIs)** → **Database (MongoDB)**

---

## Frontend

- Next.js  
- React.js  
- Tailwind CSS  
- Axios for API requests  

---

## Backend

- Node.js  
- Express.js  
- JWT authentication  
- Role-based authorization middleware  

---

## Database

- MongoDB  
- Mongoose ODM  

---

## Hosting

- Frontend: Vercel  
- Backend: Render / Railway  
- Database: MongoDB Atlas  

---

## Key Features

### 🔐 Authentication & Authorization
- Secure login and signup using **JWT**
- Role-based access control (User / Admin)
- Protected routes using middleware

### 🎫 Ticket Management
- Users can create support tickets
- Tickets include structured metadata (title, description, status)
- Ticket lifecycle management:  
  **Open → In Progress → Resolved**

### 🛠️ Admin Dashboard
- View all user-submitted tickets
- Update ticket status
- Manage ticket resolution flow

### 👤 User Dashboard
- View personal ticket history
- Track real-time ticket status updates

### 🧱 Scalable Architecture
- Clean separation between frontend, backend, and database
- RESTful API design
- Easily extendable for future features (SLA, priority, notifications)

---

## Tech Stack

### Frontend
- Next.js  
- React.js  
- Tailwind CSS  

### Backend
- Node.js  
- Express.js  
- JWT Authentication  

### Database
- MongoDB  
- Mongoose  

### Tools
- Git & GitHub  
- Postman  
- Figma  

---

## API Overview

All API routes are mounted under `/api`.  
Protected routes require a valid JWT.

---

### Authentication

| Endpoint | Method | Description | Access |
|--------|--------|------------|--------|
| `/api/auth/register` | POST | Register a new user | Public |
| `/api/auth/login` | POST | Authenticate user | Public |

---

### Tickets (User)

| Endpoint | Method | Description | Access |
|--------|--------|------------|--------|
| `/api/tickets` | POST | Create a new ticket | User |
| `/api/tickets/my` | GET | Get user's tickets | User |

---

### Tickets (Admin)

| Endpoint | Method | Description | Access |
|--------|--------|------------|--------|
| `/api/tickets` | GET | Get all tickets | Admin |
| `/api/tickets/:id` | PATCH | Update ticket status | Admin |

---

## Ticket Lifecycle

1. User creates a ticket  
2. Ticket status set to **Open**  
3. Admin reviews and marks **In Progress**  
4. Ticket resolved and marked **Resolved**  
5. User can track status throughout the lifecycle  

---


---

## How to Run Locally

### Prerequisites
- Node.js v18+
- MongoDB Atlas / Local MongoDB

---

### Installation

```bash
git clone https://github.com/your-username/supportdesk.git
cd supportdesk
npm install


Environment Variables

Create a .env file in the root directory:

MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000

Run Development Server
npm run dev


Open:
http://localhost:3000