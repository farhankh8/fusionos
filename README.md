# FusionOS by ZORVEXA

**AI-native Business Operating System / ERP SaaS**

FusionOS is a serious multi-tenant Business Operating System built with NestJS, Next.js, Prisma, and PostgreSQL. It features AI-powered intelligence through local Ollama integration, enterprise automation, and cross-module business orchestration.

---

## Architecture

```
FusionOS
├── apps/api/          # NestJS backend (modular monolith)
├── apps/web/          # Next.js frontend
├── packages/
│   ├── database/      # Prisma schema & migrations
│   ├── shared/        # Shared utilities
│   ├── types/         # TypeScript types
│   ├── config/        # Configuration
│   └── ui/            # Shared UI components
└── docs/              # Documentation
```

### Tech Stack

- **Backend**: NestJS, Prisma ORM, PostgreSQL
- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **AI**: Ollama (local LLM runtime), provider-agnostic architecture
- **Testing**: Vitest (data-integrity + application-layer E2E against the real HTTP stack)
- **CI/CD**: GitHub Actions
- **Containerization**: Docker, Docker Compose

### Modules

| Module | Description |
|--------|-------------|
| Auth | JWT authentication, RBAC |
| Organization | Companies, branches, departments, teams |
| Employees | Employee lifecycle management |
| Attendance | Time tracking, exceptions |
| Leave | Leave requests, approvals |
| Payroll | Payroll processing |
| Finance | Invoices, bills, journal entries |
| CRM | Leads, customers, opportunities |
| Projects | Project management, tasks |
| Documents | Document management |
| Assets | Asset tracking |
| Analytics | Business intelligence (read-only) |
| Automation | Workflow engine, triggers, actions |
| AI Command Center | Natural-language business queries |
| AI Agents | Intelligent task execution |
| Intelligence | Cross-module orchestration |

---

## Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+ (optional, for caching/rate limiting)
- Ollama (optional, for AI features)

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/zorvexa/fusionos.git
cd fusionos
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

### 3. Database Setup

```bash
# Start PostgreSQL (using Docker)
docker-compose up -d postgres

# Run migrations
npx prisma migrate dev

# Seed database (if seed file exists)
npx tsx packages/database/prisma/seed.ts
```

### 4. Start Development

```bash
# Start all services
npm run dev

# Or start individually
npm run dev:api    # API on port 3001
npm run dev:web    # Web on port 3000
```

### 5. AI Setup (Optional)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama3.2

# Verify
ollama list
```

---

## Testing

```bash
# Run all tests
npm test

# Run API tests only
cd apps/api && npm test

# Run specific test file
cd apps/api && npx vitest run src/__tests__/auth/auth.test.ts

# Run with coverage
cd apps/api && npx vitest run --coverage
```

---

## Docker

### Development

```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Production Build

```bash
# Build API image
docker build -f apps/api/Dockerfile -t fusionos-api .

# Build Web image
docker build -f apps/web/Dockerfile -t fusionos-web .
```

---

## API Documentation

When running in development mode, Swagger documentation is available at:

```
http://localhost:3001/api/docs
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | development | Environment mode |
| `PORT` | No | 3001 | API port |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `REDIS_URL` | No | - | Redis connection string |
| `JWT_SECRET` | Yes | - | JWT signing secret |
| `JWT_EXPIRES_IN` | No | 15m | JWT expiration |
| `JWT_REFRESH_EXPIRES_IN` | No | 7d | Refresh token expiration |
| `CORS_ORIGIN` | No | http://localhost:3000 | Allowed CORS origins |
| `AI_PROVIDER` | No | ollama | AI provider |
| `AI_BASE_URL` | No | http://localhost:11434 | Ollama base URL |
| `AI_MODEL` | No | llama3.2 | AI model name |
| `AI_TIMEOUT` | No | 60000 | AI request timeout (ms) |

---

## CI/CD

GitHub Actions CI pipeline runs on every push and PR:

1. **Lint & Typecheck** — Prisma validation, TypeScript checks
2. **Build** — Compile all packages
3. **Tests** — Unit and integration tests with PostgreSQL
4. **Docker** — Build and verify container images
5. **Security** — Secret scanning, vulnerability checks

---

## Security

- JWT authentication with refresh tokens
- Granular RBAC (Role-Based Access Control)
- Multi-tenant isolation at database level
- IDOR protection on all endpoints
- Rate limiting on authentication endpoints
- Helmet security headers
- CORS protection
- Input validation via DTOs
- No eval() or dynamic code execution
- AI prompt injection defense

---

## Documentation

- [Architecture](docs/architecture.md)
- [Development Guide](docs/development-guide.md)
- [Testing Strategy](docs/testing-strategy.md)
- [Security](docs/security.md)
- [Operations](docs/operations.md)
- [Phase Reports](docs/)

---

## License

Proprietary — ZORVEXA
