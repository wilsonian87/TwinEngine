# HCP Digital Twin Simulation Engine

## Overview

The HCP Digital Twin Simulation Engine is an enterprise-grade analytics platform designed for pharmaceutical companies to simulate and optimize healthcare professional (HCP) engagement strategies. The application enables users to explore HCP profiles, run predictive simulation scenarios for omnichannel campaigns, and analyze engagement performance through comprehensive dashboards. Built with a focus on data clarity and clinical professionalism, the platform supports data-intensive workflows for marketing teams, field representatives, and analytics professionals working with ~10,000 HCP profiles.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18+ with TypeScript for type-safe component development
- Vite as the build tool and development server, configured for fast HMR and optimized production builds
- Wouter for lightweight client-side routing
- Path aliases configured for clean imports (@/ for client code, @shared for shared schemas)

**UI Component Strategy**
- shadcn/ui component library (New York style variant) built on Radix UI primitives for accessible, unstyled components
- Tailwind CSS v4 for utility-first styling with custom design tokens aligned to Carbon Design System principles
- Design system emphasizes IBM Plex Sans typography, professional spacing scale (Tailwind units: 2, 4, 6, 8, 12, 16, 20), and clinical-grade data visualization
- Theme system supporting light/dark modes with CSS custom properties for color tokens

**State Management & Data Fetching**
- TanStack Query (React Query) v5 for server state management, caching, and data synchronization
- Custom query client configured with infinite stale time to minimize refetches
- React Hook Form with Zod resolvers for type-safe form validation
- Local component state with React hooks for UI interactions

**Data Visualization**
- Recharts library for analytics dashboards and simulation result visualizations
- Custom chart components for prescribing trends, channel engagement metrics, and simulation outcomes

### Backend Architecture

**Server Framework**
- Express.js HTTP server with TypeScript
- Custom middleware for request logging with formatted timestamps
- JSON body parsing with raw body capture for webhook verification if needed
- Static file serving for production builds

**API Design Pattern**
- RESTful endpoints organized by domain (HCPs, simulations, dashboard metrics)
- Consistent error handling with appropriate HTTP status codes
- Request validation using Zod schemas shared between client and server

**Build & Deployment**
- esbuild for server bundling with selective dependency bundling (allowlist approach to reduce syscalls)
- Separate client (Vite) and server (esbuild) build processes
- Production mode serves pre-built static assets from dist/public

### Data Storage Solutions

**Database Technology**
- PostgreSQL as the primary database (via Neon serverless)
- Drizzle ORM for type-safe database queries and schema management
- Database migrations managed through drizzle-kit
- Schema defined in shared/schema.ts for type consistency across stack

**Data Model Design**
- HCP profiles with specialty, tier, segment classifications
- Channel engagement tracking (email, rep visits, webinars, conferences, digital ads, phone)
- Prescribing trends with temporal data
- Simulation scenarios and results for campaign planning
- Dashboard metrics aggregations

**Current Implementation Note**
- In-memory storage implementation in server/storage.ts with mock data generation
- Designed to be swapped with database-backed storage implementing the IStorage interface
- Mock data includes realistic HCP profiles, engagement scores, and prescribing patterns

### External Dependencies

**Database & ORM**
- @neondatabase/serverless: Serverless PostgreSQL driver optimized for edge environments
- drizzle-orm: TypeScript ORM with compile-time query validation
- drizzle-zod: Automatic Zod schema generation from Drizzle schemas
- connect-pg-simple: PostgreSQL session store for Express (configured but not yet actively used)

**Validation & Type Safety**
- zod: Runtime type validation and schema definition
- zod-validation-error: Enhanced error formatting for Zod validation failures
- Shared schema definitions ensure type consistency between frontend and backend

**UI & Interaction Libraries**
- @radix-ui/*: Comprehensive set of unstyled, accessible UI primitives (40+ packages including accordion, dialog, dropdown, tooltip, etc.)
- @tanstack/react-query: Async state management for server data
- @hookform/resolvers: React Hook Form integration with Zod validation
- recharts: Composable charting library for data visualization
- embla-carousel-react: Touch-friendly carousel component
- cmdk: Command palette component for power user interactions
- date-fns: Date manipulation and formatting

**Development Tools**
- Replit-specific plugins for vite: runtime error overlay, cartographer (dependency visualization), dev banner
- TypeScript strict mode with ESNext module resolution
- PostCSS with Tailwind and Autoprefixer

**Styling & Theming**
- tailwindcss: Utility-first CSS framework
- class-variance-authority: Type-safe variant styling for components
- clsx & tailwind-merge: Utility for conditional className merging

**Planned Integrations (Not Yet Implemented)**
- Sessions management infrastructure (express-session, memorystore) configured but not active
- Authentication scaffolding (passport, passport-local, jsonwebtoken) present but not integrated
- Potential external data sources: IQVIA prescription data, promotional response tracking, market access data, KOL engagement metrics (referenced in feature store UI)