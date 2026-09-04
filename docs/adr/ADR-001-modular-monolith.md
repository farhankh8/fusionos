# ADR-001: Modular Monolith Architecture

## Status

Accepted

## Context

FusionOS needs a backend architecture that supports:
- Multiple business domains (HR, Finance, CRM, Projects, etc.)
- Multi-tenancy
- RBAC
- AI integration
- Automation
- Cross-module orchestration

## Decision

Use a **modular monolith** architecture with NestJS.

Each business domain is a separate NestJS module with its own:
- Controller
- Service
- DTOs
- Tests

Modules communicate through:
- Shared Prisma client
- Event outbox
- Direct service imports (for cross-module reads)

## Consequences

### Positive
- Simple deployment (single process)
- Easy debugging
- Strong type safety across modules
- Shared database transactions
- No network overhead between modules

### Negative
- Single process scaling limit
- All modules deployed together
- Larger build times

### Mitigation
- Horizontal scaling via multiple instances behind load balancer
- Module-level code splitting within the monolith
- CI/CD pipeline with caching

## Alternatives Considered

1. **Microservices**: Rejected due to operational complexity, network latency, and distributed transaction challenges for a portfolio project.
2. **Serverless**: Rejected due to cold start issues and difficulty with database connections.
