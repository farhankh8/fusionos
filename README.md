# FusionOS by ZORVEXA

**«AI-Native Business Operating System / ERP SaaS»**

FusionOS is a unified, multi-tenant business platform designed to bring a company's core operations into one connected system.

Instead of using separate tools for HR, attendance, payroll, finance, CRM, projects, assets, analytics, and automation, FusionOS connects them through a shared business data model.

> **Enter data once. Connect everything. Understand everything.**
> **Automate what can safely be automated.**
> **Keep humans in control of sensitive decisions. Record everything.**

---

## 🚀 Core Modules

- 🏢 Company & Organization Management
- 👥 Users, Roles & RBAC
- 👨‍💼 HR & Employee Management
- 🕐 Attendance & Verification
- 🏖️ Leave Management
- 💰 Payroll — Attendance-based, Manual & Hybrid
- 📊 Finance & Double-Entry Accounting
- 🤝 CRM & Client Management
- 📁 Projects & Tasks
- 💻 Asset / Equipment Management
- 🔔 Notifications & Communication
- 📈 Analytics & Business Intelligence
- 🤖 AI Command Center
- ⚙️ Event-Driven Automation
- 🧠 AI Agents & Controlled AI Tools
- 📋 Audit & Security

---

## 🔗 One Connected System

```
Company
  → Employees
    → Attendance
      → Leave
        → Payroll
          → Finance
            → CRM
              → Projects
                → Assets
                  → AI
                    → Automation
                      → Analytics
                        → Audit
```

---

## 🤖 AI-Native Architecture

FusionOS uses AI to understand authorized business data, provide insights, assist users, detect potential anomalies, and support controlled automation.

AI does not directly access the database or bypass permissions.

```
Business Data
  → Business Rules
    → Events
      → AI / Automation
        → Human Approval (when required)
          → Action
            → Audit
```

---

## 🛠️ Technology

| Layer | Technology |
|---|---|
| **Frontend** | Next.js, React, TypeScript, Tailwind CSS v4 |
| **Backend** | NestJS modular monolith (TypeScript) |
| **Database** | PostgreSQL, Prisma ORM |
| **Cache/Queue** | Redis |
| **Infrastructure** | Docker, Git |
| **Desktop** | Electron, React, TypeScript (Phase 22) |

The architecture follows a **modular monolith** approach with strong domain boundaries.

---

## 📁 Project Structure

```
fusionos/
├── apps/
│   ├── web/            # Next.js frontend
│   ├── api/            # NestJS backend API
│   └── desktop/        # Electron desktop app (Phase 22)
├── packages/
│   ├── shared/         # Shared utilities and constants
│   ├── types/          # Shared TypeScript types
│   ├── validation/     # Shared Zod validation schemas
│   ├── config/         # Environment configuration
│   ├── database/       # Prisma schema and client
│   └── ui/             # Shared design system components
├── infrastructure/
│   └── docker/         # Docker Compose configuration
├── docs/               # Project documentation
└── tests/              # Integration and E2E tests (Phase 24)
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Docker (optional, for PostgreSQL and Redis)

### Installation

```bash
npm install
```

### Development

```bash
# Start API server (port 3001)
npm run dev:api

# Start web application (port 3000)
npm run dev:web
```

### Infrastructure

```bash
# Start PostgreSQL and Redis (requires Docker)
docker compose up -d
```

### Quality Gates

```bash
npm run typecheck    # Type checking across all packages
npm run build        # Build all packages and apps
npm run lint         # Lint all packages
```

### Health Check

Once the API is running:

```
GET http://localhost:3001/api/v1/health
```

Returns application health status, database connectivity, and Redis status.

---

## 🎯 Core MVP

The first major milestone focuses on:

```
Company → Users → Employees → Attendance → Leave → Payroll → Finance → AI → Automation → Analytics
```

Payroll supports:

- Attendance-based calculation
- Manual payroll
- Hybrid payroll
- Configurable earnings and deductions
- Approval workflow
- Audit trail

---

## 🔐 Security

FusionOS is designed with:

- Multi-tenant isolation
- Backend-enforced RBAC
- Secure authentication with MFA
- Input validation at every boundary
- Audit logging for all sensitive operations
- Secure file handling
- AI permission boundaries
- Human approval for sensitive operations

---

## 🗺️ Roadmap

| Phase | Focus |
|---|---|
| 1 | Foundation & Architecture ✅ |
| 2 | Database |
| 3 | Authentication |
| 4 | Multi-Tenancy |
| 5 | Organization & Employees |
| 6 | Attendance & Leave |
| 7 | Payroll |
| 8 | Finance |
| 9 | CRM & Projects |
| 10 | Assets & Notifications |
| 11 | AI Platform |
| 12 | Event Infrastructure & Automation |
| 13 | AI Agents & Automation Studio |
| 14 | Analytics & Executive Intelligence |
| 15 | Desktop Application |
| 16 | Security Hardening & Testing |
| 17 | CI/CD, Cloud & Production |

---

## 📌 Project Status

**Phase 1 — Foundation: COMPLETE** ✅

The monorepo foundation is established with:

- Working NestJS API with health endpoint
- Working Next.js application with navigation shell
- Shared packages (types, validation, config, database, UI components)
- Design system foundation
- Docker Compose configuration
- Quality gates (typecheck, build)

**Next Phase:** Phase 2 — Database Foundation

---

## 📚 Documentation

- [Master Blueprint](docs/00-fusionos-master-blueprint.md) — Complete project specification
- [Documentation Suite](docs/README.md) — Full documentation index
- [Project State](docs/project-state.md) — Current development status

---

## License

Proprietary — ZORVEXA
