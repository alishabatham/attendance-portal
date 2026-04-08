# Smart Attendance & Student Profiling Portal

## Overview

A full-stack attendance management system for educational institutions. Students log in, complete their academic profile once, and mark attendance daily with one click. Admins get a data-rich panel with student insights and attendance reports.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS (artifacts/attendance-portal)
- **Backend**: Express 5 + Node.js (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM (lib/db)
- **Auth**: JWT (jsonwebtoken) + bcryptjs for password hashing
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec in lib/api-spec/openapi.yaml)
- **Build**: esbuild (CJS bundle for backend)

## Features

### Authentication
- JWT-based auth with bcrypt password hashing
- Student signup/login
- Admin role support
- Token stored in localStorage as `attendance_token`

### Student Flow
1. Sign up with email/password
2. Complete onboarding (academic profile)
3. Mark daily attendance (one click, once per day)
4. View monthly attendance report

### Admin Panel
- Overview stats (total students, present/absent today)
- Branch/year/interest breakdowns
- Student list with filters (branch, year, interest, search)
- Individual student profile + attendance history
- Date-based attendance view

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/attendance-portal run dev` — run frontend locally

## Demo Credentials

- **Admin**: admin@portal.com / Admin@123
- **Student**: alice@student.com / Pass@123
- **Student**: bob@student.com / Pass@123

## Database Schema

- `users` — students and admins with full academic profile
- `attendance` — daily attendance records (userId, date, time, status)

## API Routes

- `POST /api/auth/signup` — register student
- `POST /api/auth/login` — login
- `GET /api/user/profile` — get own profile
- `POST /api/user/profile` — save onboarding data
- `POST /api/attendance/mark` — mark today's attendance
- `GET /api/attendance/today` — check today's status
- `GET /api/attendance/report/:userId` — monthly report with present/absent breakdown
- `GET /api/attendance/history/:userId` — full attendance history
- `GET /api/admin/students` — list all students (filterable)
- `GET /api/admin/students/:userId` — student profile
- `GET /api/admin/attendance` — attendance by date
- `GET /api/admin/stats` — dashboard stats

## File Structure

```
artifacts/
  api-server/src/
    routes/       — auth.ts, user.ts, attendance.ts, admin.ts
    middlewares/  — authenticate.ts (JWT middleware)
    lib/          — auth.ts (JWT/bcrypt helpers)
  attendance-portal/src/
    pages/        — Login, Signup, Onboarding, Dashboard, Report
    pages/admin/  — AdminDashboard, AdminStudents, AdminStudentDetail, AdminAttendance
    components/   — AppLayout (sidebar + nav)
    lib/          — auth.ts (token helpers + setAuthTokenGetter)
lib/
  api-spec/     — openapi.yaml (source of truth)
  api-client-react/ — generated React Query hooks
  api-zod/      — generated Zod validation schemas
  db/           — Drizzle ORM schema (users, attendance tables)
```
