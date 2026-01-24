🎫 Support Desk – Role-Based Ticketing System

A full-stack role-based support ticketing system designed to replace inefficient email-based support workflows.
The platform enables users to raise and track support tickets while allowing admins to manage, respond, and resolve issues through a structured dashboard.

This project focuses on real-world system design, authentication, authorization, and clean API-driven architecture.

🚀 Features
👤 User Features

Secure authentication using JWT

Create support tickets with structured metadata

View and track ticket status (Open, In Progress, Resolved)

Access ticket history in a centralized dashboard

🛠️ Admin Features

Role-based access control (Admin vs User)

View all user-generated tickets

Update ticket status and manage lifecycle

Respond to tickets via admin interface

🔐 Security & Access Control

JWT-based authentication

Role-based authorization middleware

Protected routes for admin-only actions

🧠 System Design Highlights

Separation of concerns between frontend, backend, and database layers

RESTful API architecture for scalability and maintainability

Role-based access control (RBAC) implemented at API level

Designed to support future extensibility (SLA tracking, priority levels, notifications)

🧰 Tech Stack
Frontend

Next.js

React.js

Tailwind CSS

Axios for API communication

Backend

Node.js

Express.js

JWT Authentication

RESTful APIs

Database

MongoDB

Mongoose ODM

Tools & Platforms

Git & GitHub

Postman (API testing)

Figma (UI planning)

🔄 Ticket Lifecycle

User creates ticket

Ticket stored with status Open

Admin reviews ticket

Admin updates status:

In Progress

Resolved

User can track updates in real time via dashboard

🧪 API Overview
Auth

POST /auth/register

POST /auth/login

User

POST /tickets – Create ticket

GET /tickets/my – View user tickets

Admin

GET /tickets – View all tickets

PATCH /tickets/:id – Update ticket status

(All protected via JWT + role middleware)

🧩 Why This Project Matters

Unlike toy CRUD apps, Support Desk simulates a real production system:

Multi-role users

Secure access control

State-driven workflows

Scalable backend structure

This makes it directly relevant to backend, full-stack, and product-focused engineering roles.