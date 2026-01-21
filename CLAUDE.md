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
- **server/auth.ts** - Authentication module with Passport.js local strategy, session management, and password hashing.
- **server/services/** - Extracted service modules:
  - `prediction-engine.ts` - Stimuli impact prediction, simulation engine, counterfactual analysis
  - `nl-query-parser.ts` - Rule-based NL query parsing and intent detection
  - `genai-service.ts` - Claude-powered NL query parsing with rate limiting and fallback
- **client/src/App.tsx** - Root component with routing, providers (Query, Theme, Tooltip), and layout.

## API Domains

The API is organized by domain:
- `/api/auth` - Authentication (register, login, logout, user session)
- `/api/hcps` - HCP profiles (CRUD, filtering, lookalike search)
- `/api/simulations` - Campaign simulation scenarios
- `/api/dashboard` - Aggregated metrics
- `/api/stimuli` - Stimuli impact prediction events
- `/api/counterfactuals` - What-if backtesting analysis
- `/api/nl-query` - Natural language query processing (Claude-powered with rule-based fallback)
- `/api/model-evaluation` - Model accuracy tracking
- `/api/audit-logs` - Governance/compliance logging

All API endpoints except `/api/auth/*` require authentication.

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
- `ANTHROPIC_API_KEY` - Anthropic API key for GenAI-powered NL query processing (optional, falls back to rule-based parsing if not set)


## Phase 6: Agentic Ecosystem

### Overview

Phase 6 transforms TwinEngine from an analytics platform into an agentic intelligence hub with:
- MCP-first enterprise integrations (Slack, Jira, Box, Teams)
- Autonomous agents (Channel Health Monitor, Insight Synthesizer)
- Human-in-the-loop approval workflows
- AI-generated strategic documents

### New Architecture Patterns

#### Agent Service Pattern

```typescript
// server/services/agents/base-agent.ts
export abstract class BaseAgent<TInput, TOutput> {
  abstract readonly id: string;
  abstract readonly type: AgentType;
  abstract readonly name: string;
  
  abstract execute(input: TInput): Promise<TOutput>;
  abstract validate(input: TInput): boolean;
  
  protected async proposeAction(action: ProposedAction): Promise<AgentAction> {
    // All actions go through approval workflow
  }
  
  protected async log(level: string, message: string, data?: unknown): Promise<void> {
    // Structured logging for agent runs
  }
}
```

#### Integration Service Pattern

```typescript
// server/services/integrations/slack.ts
export class SlackIntegration {
  constructor(private config: IntegrationConfig) {}
  
  async sendMessage(request: SlackSendRequest): Promise<ActionExport> {
    // 1. Validate config and request
    // 2. Send via MCP or direct API
    // 3. Log to actionExports
    // 4. Return audit record
  }
  
  async healthCheck(): Promise<IntegrationStatus> {
    // Verify connection is working
  }
}
```

#### Approval Workflow Pattern

```typescript
// All agent actions flow through:
// 1. Agent proposes action
// 2. Orchestrator evaluates against approval rules
// 3. If auto-approve eligible → execute immediately
// 4. Otherwise → queue for human review
// 5. Human approves/rejects/modifies
// 6. Execute and log result
```

### New API Domains

- `/api/integrations` - Integration configuration CRUD
- `/api/integrations/:type/:action` - Integration-specific actions (e.g., slack/send)
- `/api/agents` - Agent definition CRUD
- `/api/agents/:id/run` - Trigger agent execution
- `/api/agents/:id/history` - Agent run history
- `/api/actions` - Pending action queue
- `/api/actions/:id/approve` - Approve/reject actions
- `/api/documents` - Generated document CRUD
- `/api/documents/generate` - Trigger document generation
- `/api/alerts` - In-platform alert management

### New Environment Variables

```bash
# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...

# Jira
JIRA_BASE_URL=https://company.atlassian.net
JIRA_EMAIL=...
JIRA_API_TOKEN=...

# Box
BOX_CLIENT_ID=...
BOX_CLIENT_SECRET=...

# Agent Runtime
AGENT_SCHEDULER_ENABLED=true
AGENT_DEFAULT_TIMEZONE=America/New_York
```

### Key Dependencies (Phase 6)

```json
{
  "@slack/web-api": "^7.0.0",
  "jira.js": "^4.0.0",
  "box-node-sdk": "^3.0.0",
  "node-cron": "^3.0.0",
  "@modelcontextprotocol/sdk": "^1.0.0"
}
```

### Testing Strategy

- **Unit**: Agent logic, approval rules, payload formatting
- **Integration**: MCP communication (mock servers), action workflows
- **E2E**: Full agent cycle from trigger to execution

### File Structure (New)

```
server/services/
├── agents/
│   ├── base-agent.ts
│   ├── orchestrator.ts
│   ├── scheduler.ts
│   ├── channel-health-monitor.ts
│   └── insight-synthesizer.ts
├── integrations/
│   ├── mcp-client.ts
│   ├── slack.ts
│   ├── jira.ts
│   └── box.ts
└── ...

client/src/
├── pages/
│   ├── AgentsDashboard.tsx
│   ├── ActionQueue.tsx
│   ├── DocumentGenerator.tsx
│   └── IntegrationsAdmin.tsx
├── components/
│   ├── agents/
│   ├── actions/
│   ├── documents/
│   └── integrations/
└── ...
```

---

## MCP Integration Notes

### What is MCP?

Model Context Protocol (MCP) is an open standard for AI-to-tool communication. Think of it as a "USB adapter" for AI integrations.

### MCP vs Direct API

- **Use MCP when**: Official MCP server exists (Atlassian, Slack via community)
- **Use Direct API when**: No MCP server, or MCP server is immature

### Current MCP Availability

| Service | MCP Status | Approach |
|---------|------------|----------|
| Jira | ✅ Official Atlassian MCP | MCP-first |
| Confluence | ✅ Official Atlassian MCP | MCP-first |
| Slack | ⚠️ Community servers | Direct API with MCP wrapper |
| Teams | ⚠️ Emerging | Direct API |
| Box | ❌ None | Direct API |

### MCP Client Pattern

```typescript
// server/services/integrations/mcp-client.ts
export class MCPClient {
  async connect(endpoint: string): Promise<void>;
  async callTool(name: string, params: unknown): Promise<unknown>;
  async listTools(): Promise<Tool[]>;
  async disconnect(): Promise<void>;
}
```

---

## Governance & Compliance Notes

### Audit Requirements

All agent actions MUST be logged with:
- Who/what triggered the action
- What was proposed
- Reasoning/confidence
- Approval decision and reviewer
- Execution result
- Timestamps throughout

### PHI Considerations

- Never include PHI in external integrations without explicit configuration
- Default to NPI + de-identified HCP references
- Slack/Jira payloads should use entity IDs, not names unless configured

### Auto-Approval Safety

Auto-approval should ONLY be enabled for:
- Low-risk actions (alerts to internal channels)
- High-confidence recommendations (>90%)
- Limited scope (individual HCPs, not portfolio-wide)

Never auto-approve:
- External communications to HCPs
- Document generation with PHI
- High-impact actions affecting >50 entities

---

## Phase 12: Multi-Roadmap Consolidation

### Overview

Phase 12 exposes competitive pressure, message saturation, and next-best-orbit decisioning as first-class platform capabilities with a "stacked value curve":

| Layer | Capability | Outcome |
|-------|-----------|---------|
| 1. Visualization | Competitive Orbit + Saturation Heatmap | Comprehension |
| 2. Judgment | CPI + MSI Metrics | Context-aware decisions |
| 3. Action | Next Best Orbit | Prescriptive guidance |
| 4. Scale | Agent Prompt Pack | Autonomous adaptation |

### New API Domains

- `/api/competitors` - Competitor definitions
- `/api/competitive/*` - CPI signals, alerts, governance
- `/api/message-themes` - Message theme taxonomy
- `/api/message-saturation/*` - MSI, heatmap, benchmarks
- `/api/nbo/*` - Recommendations, feedback, metrics
- `/api/msi-benchmarks` - MSI benchmarks by therapeutic area

### Key Services

#### Competitive Pressure Index (CPI)

```typescript
// server/storage/competitive-storage.ts
// CPI = Share + Velocity + Engagement + Trend (0-100)
export function calculateCPI(signal: CompetitiveSignalInput): CPIResult {
  const shareComponent = (signal.shareOfBrand / 100) * 25;
  const velocityComponent = clamp((signal.competitiveRxVelocity - signal.ourRxVelocity + 50) / 100, 0, 1) * 25;
  const engagementComponent = clamp((signal.engagementAsymmetry + 50) / 100, 0, 1) * 25;
  const trendComponent = clamp((signal.shareChangeQoQ + 25) / 50, 0, 1) * 25;
  return { cpi: shareComponent + velocityComponent + engagementComponent + trendComponent, ... };
}

// Risk levels: low (0-25), medium (26-50), high (51-75), critical (76-100)
```

#### Message Saturation Index (MSI)

```typescript
// server/storage/message-saturation-storage.ts
// MSI = (Frequency + Diversity + Decay) × StageModifier (0-100)
export function calculateMsi(exposure: MessageExposureInput): MSIResult {
  const stageModifiers = { awareness: 0.7, consideration: 0.85, trial: 0.9, loyalty: 1.1 };
  const frequencyComponent = (exposure.touchFrequency / threshold) * 40;
  const diversityComponent = (1 - exposure.channelDiversity) * 20;
  const decayComponent = exposure.engagementDecay * 40;
  return { msi: (frequencyComponent + diversityComponent + decayComponent) * stageModifiers[stage], ... };
}

// Risk levels: low (0-25), medium (26-50), high (51-75), critical (76-100)
```

#### Next Best Orbit (NBO)

```typescript
// server/services/next-best-orbit-engine.ts
// Decision weights: Engagement (20%), Adoption (15%), Channel (20%), MSI (20%), CPI (15%), Touch (10%)
export function generateNBORecommendation(input: NBOEngineInput): NBORecommendation {
  // 1. Rule-based fast path for clear cases (defend-critical, reactivate, etc.)
  // 2. Weighted scoring for ambiguous cases
  // 3. Generate human-readable rationale
  // 4. Return confidence level (high >0.75, medium 0.50-0.75, low <0.50)
}
```

### Storage Module Pattern

```
server/storage/
├── index.ts              # Re-exports, backward compatibility
├── utils.ts              # Shared utilities
├── converters.ts         # DB row → API type converters
├── hcp-storage.ts        # HCP CRUD, search, filtering
├── competitive-storage.ts # CPI, competitors, alerts, governance
├── message-saturation-storage.ts # MSI, themes, exposures
├── simulation-storage.ts # Simulations, dashboard, audit
├── user-storage.ts       # Users, invite codes
└── audience-storage.ts   # Saved audiences
```

### Agent Prompt Pack Structure

```
agent/prompts/
├── base/
│   ├── system-prompt.md        # Platform context and capabilities
│   └── schema-context.md       # Data model for agent reasoning
├── roles/
│   ├── brand-lead.md           # Strategic analysis persona
│   ├── field-ops.md            # Territory optimization persona
│   ├── analytics.md            # Data exploration persona
│   ├── medical.md              # Evidence synthesis persona
│   └── platform-admin.md       # System health persona
├── tasks/
│   ├── reasoning-patterns.md   # Canonical reasoning patterns
│   ├── cohort-analysis.md      # Cohort investigation task
│   ├── competitive-assessment.md # Competitive evaluation task
│   ├── campaign-planning.md    # Campaign design task
│   └── anomaly-investigation.md # Anomaly investigation task
└── guardrails/
    ├── compliance-rules.md     # MLR, PHI, regulatory constraints
    └── output-constraints.md   # Format, length, citation requirements
```

### Testing Pattern

```bash
# Run all tests
npm test

# Run specific Phase 12 tests
npm test -- competitive
npm test -- saturation
npm test -- nbo

# Current coverage
# - 795 total tests
# - Competitive: 88 tests
# - Saturation: 58 tests
# - NBO: 43 tests
```
