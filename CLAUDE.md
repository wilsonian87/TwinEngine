# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HCP Digital Twin Simulation Engine - an enterprise analytics platform for pharmaceutical companies to simulate and optimize healthcare professional (HCP) engagement strategies. The platform enables HCP profile exploration, predictive simulation scenarios for omnichannel campaigns, and engagement performance dashboards.

## Development Commands

```bash
npm run dev          # Start development server (runs on PORT env var or 3000)
npm run build        # Build for production (client via Vite, server via esbuild)
npm run start        # Run production build
npm run check        # TypeScript type checking
npm run db:push      # Push schema changes to PostgreSQL via Drizzle
```

## Local Development Setup

```bash
# Install PostgreSQL (macOS)
brew install postgresql@16
brew services start postgresql@16

# Create database
/opt/homebrew/opt/postgresql@16/bin/createdb twinengine

# Copy environment file and install dependencies
cp .env.example .env
npm install

# Push database schema
npm run db:push

# Start dev server (auto-seeds 100 HCP profiles on first run)
npm run dev
```

## Architecture

### Monorepo Structure

The project is organized into three main directories with shared types:

- **client/src/** - React frontend (Vite build)
- **server/** - Express backend (esbuild build)
- **shared/** - Shared schemas and types (Zod + Drizzle)

### Path Aliases

- `@/*` → `client/src/*` (frontend code)
- `@shared/*` → `shared/*` (shared types/schemas)
- `@assets/*` → `attached_assets/*` (static assets)

### Frontend Stack

- React 18 with TypeScript
- Wouter for routing (lightweight alternative to React Router)
- TanStack Query (React Query) v5 for server state
- shadcn/ui components (built on Radix UI primitives)
- Tailwind CSS with Carbon Design System principles
- Recharts for data visualization

### Backend Stack

- Express.js with TypeScript
- PostgreSQL with standard `pg` driver
- Drizzle ORM for type-safe database queries (`drizzle-orm/node-postgres`)
- Schema-first approach: all types flow from `shared/schema.ts`

### Data Flow

1. Types defined in `shared/schema.ts` (Drizzle tables + Zod schemas)
2. Server uses these types in `server/storage.ts` (implements `IStorage` interface)
3. API routes in `server/routes.ts` validate requests with Zod schemas
4. Frontend fetches via React Query, types match server responses

## Key Files

- **shared/schema.ts** - Single source of truth for all types. Contains PostgreSQL table definitions (Drizzle), Zod validation schemas, and TypeScript types. Add new data models here.
- **server/db.ts** - Database connection using `pg` Pool and Drizzle ORM.
- **server/storage.ts** - Database operations layer implementing `IStorage` interface. Auto-seeds mock HCP data on first startup.
- **server/routes.ts** - RESTful API endpoints. All request validation uses schemas from `shared/schema.ts`.
- **client/src/App.tsx** - Root component with routing, providers (Query, Theme, Tooltip), and layout.

## API Domains

The API is organized by domain:
- `/api/hcps` - HCP profiles (CRUD, filtering, lookalike search)
- `/api/simulations` - Campaign simulation scenarios
- `/api/dashboard` - Aggregated metrics
- `/api/stimuli` - Stimuli impact prediction events
- `/api/counterfactuals` - What-if backtesting analysis
- `/api/nl-query` - Natural language query processing
- `/api/model-evaluation` - Model accuracy tracking
- `/api/audit-logs` - Governance/compliance logging

## Design System

Follows Carbon Design System (IBM) principles:
- Typography: IBM Plex Sans
- Spacing: Tailwind units 2, 4, 6, 8, 12, 16, 20
- Components: shadcn/ui (New York variant)
- Theme: Light/dark mode via CSS custom properties

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (required)
- `PORT` - Server port (defaults to 3000)
- `NODE_ENV` - development or production
