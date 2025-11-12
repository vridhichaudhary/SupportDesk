1. Project Title
SupportDesk – Customer Support Portal

2. Problem Statement
Most companies receive dozens to hundreds of support queries daily. Managing these queries manually through email or scattered tools leads to delays, poor customer experience, and inefficient agent utilization.
SupportDesk solves this by providing a centralized support ticketing platform where customers can raise cases, track their status, and get AI-powered suggestions before escalation.
 For the support team, it offers real-time dashboards, automatic case assignment, and faster resolution through intelligent recommendations.

3. System Architecture
Frontend (Next.js + Tailwind)
Backend (Node.js + Express.js REST APIs)
Database (MongoDB)
AI Layer (Gemini API )
Authentication:  JWT-based secure login and role-based access (User / Support Agent / Admin)
Hosting:
Frontend: Vercel
Backend: Railway or Render
Database: MongoDB Atlas

4. User Roles & Use Cases
Role
Capabilities
End User
Sign up / Login, raise support cases, view status (Open / In Progress / Closed), interact with chatbot to get instant help
Support Agent
View assigned/unassigned cases, update status, add comments, mark resolution, get AI-suggested solutions
Admin
Manage users and agents, view overall ticket stats, set assignment rules, monitor dashboard

5. Key Features
Category
Features
Authentication & Authorization
JWT-based login, Signup, Logout, Forgot Password, Role-based access (User / Agent / Admin)
Ticket Management
Create, view, update,delete
AI Chatbot
Chatbot gives probable solutions
Real-time Dashboard
Agents and Admin can see number of Open / In Progress / Closed cases
Search & Filter
Agents can filter tickets by priority, date, and status
Frontend Routing
Ticket Browsing Enhancements
Pages: Login, Signup, User Dashboard, Agent Dashboard, Admin Panel, Raise Ticket Page

- Search tickets by keywords or ticket ID
- Sort by date, priority, and status
- Filter by status, priority, assigned/ unassigned
- Pagination for efficient large-ticket handling
  
Hosting
Fully deployed backend + frontend with live database

6. Tech Stack
Layer
Technologies
Frontend
React.js, TailwindCSS
Backend
Node.js, Express.js
Database
MongoDB 
Authentication
AI
JWT 
Gemini
Hosting
Vercel, Render, Netlify, Railway


