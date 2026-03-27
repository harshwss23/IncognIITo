<div align="center">
  <h1>IncognIITo</h1>
  <p><em>An anonymous social-matching platform for IIT Kanpur students, combining institute-only onboarding, one-to-one live video interaction, realtime chat, and moderation-first safety controls.</em></p>

  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](#)
  [![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](#)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](#)
  [![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)](#)
</div>

---

## Table of Contents
- [Table of Contents](#table-of-contents)
- [Why This Project Exists](#why-this-project-exists)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Local Setup](#local-setup)
  - [1. Prerequisites](#1-prerequisites)
  - [2. Environment Variables](#2-environment-variables)
  - [3. Installation \& Database Initialization](#3-installation--database-initialization)
  - [4. Run the Servers](#4-run-the-servers)
- [Architecture \& Flows](#architecture--flows)
  - [Core Architecture](#core-architecture)
  - [Primary User Flows](#primary-user-flows)
- [Realtime Socket Events](#realtime-socket-events)
- [Route Map](#route-map)
- [Troubleshooting](#troubleshooting)
- [Security \& Deployment](#security--deployment)
  - [Production Checklist](#production-checklist)
- [Team \& Ownership](#team--ownership)
  - [License](#license)

---

## Why This Project Exists


IncognIITo is designed for low-friction, privacy-aware interaction exclusively within the IIT Kanpur community.

- **Verified access, anonymous interaction:** IITK email-based OTP onboarding ensures institute-only access while keeping user interactions anonymous during matching and live sessions.
- **Session control:** the system includes duplicate-session protection to reduce abuse and unintended concurrent usage.
- **Built-in moderation:** reporting, blocking, and admin controls are part of the core platform design.

---

## Key Features


- **Authentication:** IITK email OTP registration, secure login, password reset, and JWT-based session handling.
- **Matchmaking:** Redis-backed queue system for pairing users in anonymous live sessions.
- **Realtime Chat:** Socket.IO-based messaging with typing indicators, persisted chat history, and session-aware connection handling.
- **User Profiles:** interest tags and avatar uploads powered by Cloudinary.
- **Moderation and Safety:** block/report functionality, connection request workflows, and admin moderation tools.
- **Live Video Interaction:** one-to-one live sessions coordinated through signaling events alongside parallel text chat.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React, React Router, Vite, Tailwind CSS, Radix UI, MUI |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | PostgreSQL |
| **Realtime** | Socket.IO |
| **Cache/Queue** | Redis |
| **Media** | Cloudinary |
| **Email** | Nodemailer (via SMTP) |
| **Security** | JWT, bcrypt |

---
## Repository Structure

| Path | Purpose |
| --- | --- |
| `src/` | Frontend source code |
| `backend/src/` | Backend APIs, services, and socket logic |
| `schema.sql` | Database schema/setup |
| `reset_db.sh`, `reset_db.ps1` | Local database reset scripts |

---

## Local Setup

Follow the steps below to run the project locally.

### 1. Prerequisites
* Node.js 20.x (LTS recommended)
* PostgreSQL 14+
* Redis 6+
* *(Optional)* Cloudinary Account & SMTP Credentials for full feature support.

### 2. Environment Variables
Create `.env` files in both the root and `backend` directories.

**Frontend (`/.env`)**
```env
VITE_API_BASE_URL=http://localhost:5050
VITE_SOCKET_URL=http://localhost:5050
```

**Backend (`/backend/.env`)**
```env
PORT=5050
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=incogniito_db
DB_USER=incogniito_user
DB_PASSWORD=CS253_69_7

# Secrets
JWT_SECRET=replace_with_secure_secret

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_smtp_app_password
EMAIL_FROM=your_email@example.com

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Cloudinary
CLOUD_NAME=your_cloud_name
CLOUD_API_KEY=your_cloud_api_key
CLOUD_SECRET_KEY=your_cloud_secret
```

### 3. Installation & Database Initialization
```bash
# Install frontend and backend dependencies
npm install
cd backend && npm install

# Initialize PostgreSQL Database (Idempotent schema)
psql -U postgres -d postgres -f schema.sql
```

⚠️ **Destructive Reset:** To completely drop and recreate the local database, run `./reset_db.sh` (or the PowerShell equivalent reset_db.ps1 on Windows).

### 4. Run the Servers
Open two terminal windows:

**Terminal 1 (Backend)**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend)**
```bash
npm run dev
```

You can verify backend availability at: http://localhost:5050/health

---

## Architecture & Flows

### Core Architecture
1. **Frontend** communicates with backend REST APIs for authentication, profiles, matchmaking, and moderation workflows.
2. **Backend** validates authentication, executes application logic, and persists core state in PostgreSQL.
3. **Redis** maintains high-speed queue and session states for matchmaking coordination.
4. **Socket.IO** handles realtime messaging and signaling events for live session coordination.
5. **SMTP Service** delivers OTP and password-reset emails.

> **Session Note:** The backend includes duplicate-tab/session protection logic to reduce concurrent active session conflicts for a single user identity.

### Primary User Flows
* **Onboarding:** Request OTP (IITK email) → Verify email and set password → Login and receive authenticated session tokens
* **Matchmaking:** Join queue → Backend pairs users → Enter live session → End and optionally rate the session
* **Connections:** Send request → Accept or reject → If accepted, continue through persistent chat
* **Moderation:** Report user → Pair is blocked or disconnected as applicable → Admin reviews and applies action

---

## Realtime Socket Events

The server relies on token-authenticated socket connections. 

**Core Event Contract:**
* **Room Lifecycle:** `join_chat`, `leave_chat`
* **Messaging:** `send_message` ➔ `new_message` (broadcasted & persisted)
* **UX Indicators:** `typing`, `stop_typing`, `typing_status`
* **Signaling:** `offer`, `answer`, `ice_candidate`
* **State Control:** Session conflict and duplicate-tab disconnect signals.

---

## Route Map

| Type | Routes |
| :--- | :--- |
| **Public** | `/`, `/register`, `/login`, `/forgot` |
| **Protected** | `/homepage`, `/dashboard`, `/matchmaking`, `/match-waiting`, `/live`, `/live/:roomId`, `/chat`, `/requests`, `/profile`, `/profile/:id`, `/users/:id`, `/user/:id`, `/active-users`, `/session/:roomid` |
| **Admin/Special** | `/blocked`, `/admin` |

---

## Troubleshooting

* **Port Mismatch / Connection Refused:** Frontend defaults to port `5050` for APIs. Ensure `VITE_API_BASE_URL` matches your backend `PORT`. *(Note: 5050 is recommended on macOS where 5000 is often occupied).*
* **CORS Errors:** Ensure `FRONTEND_URL` in `backend/.env` exactly matches your Vite origin (e.g., `http://localhost:5173`).
* **OTP Email Not Sending:** Verify SMTP credentials. If using Gmail, ensure you are using an **App Password**, not your primary account password.
* **Matchmaking Issues:** Verify Redis is actively running on `localhost:6379`.
* **Avatar Upload Failures:** Re-check Cloudinary credentials and ensure the environment variable names match backend configuration.
* **Admin API Forbidden:** Manually set `users.is_admin = true` for your account in the PostgreSQL database.

---

## Security & Deployment

> **Note that the `.env` file is not committed to version control.** A platform secret manager has been used for production environments.

### Production Checklist
1. **Secrets:** Replace default local DB passwords and use a strong, rotated `JWT_SECRET`.
2. **Network:** Enforce HTTPS everywhere and strictly lock down CORS (`FRONTEND_URL`).
3. **Database:** Configure managed PostgreSQL/Redis with automated backups and point-in-time recovery.
4. **Security Hardening:** Implement API rate-limiting (especially on auth/OTP routes) and use secure/HttpOnly cookies if transitioning from local storage.
5. **Monitoring:** Add uptime monitoring and centralized logging (e.g., Sentry, Datadog) for error tracking.

**Suggested Hosting Stack:**
* **Frontend:** Vercel, Netlify, or Nginx
* **Backend:** Render, Fly.io, Railway, or AWS EC2
* **Data:** Managed PostgreSQL & Redis (e.g., Supabase, Aiven, or AWS RDS/ElastiCache)

---

## Team & Ownership

This repository follows a domain-based ownership model.
* `src/` ➔ **Frontend Owners** (UI routes, state, UX flows)
* `backend/src/` ➔ **Backend Owners** (APIs, WebSockets, Service logic)
* `schema.sql` ➔ **Data Owners** (DB Schema, migrations)

### License
No formal license file is currently included in the repository.