# BookEase Monorepo

## Tech Stack
- **Monorepo Management**: npm Workspaces + TurboRepo
- **Backend**: Node.js + Express + TypeScript + Prisma (PostgreSQL)
- **Frontend**: React + Vite (planned)
- **Shared Packages**:
  - `@bookease/types`: Shared TypeScript interfaces and types
  - `@bookease/logger`: Unified logger configuration

## Getting Started

### Prerequisites
- Node.js (v18+)
- Docker & Docker Compose (for database)

### Installation
```bash
npm install
```

### Running Locally
```bash
docker-compose up -d  # Start PostgreSQL
npm run dev           # Start all applications
```

## Production Checklist
- [ ] All env vars set (no defaults in production)
- [ ] JWT_SECRET min 32 chars
- [ ] HTTPS enforced
- [ ] Rate limiting active
- [ ] DB connection pooling configured
- [ ] Backup schedule configured
- [ ] Error tracking configured (Sentry or similar)
- [ ] Log aggregation configured
- [ ] All tests passing
- [ ] Load test run and passing
