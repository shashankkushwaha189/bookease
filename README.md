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
