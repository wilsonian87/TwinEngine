# PHASE 6 INITIATION PROMPT

Use this prompt to begin a new Claude Code session for Phase 6 development.

---

## Session Initiation Prompt

```
I'm continuing development on TwinEngine, an HCP Digital Twin platform for pharmaceutical marketing. We're beginning Phase 6: Agentic Ecosystem & Enterprise Integrations.

## Project Context

Please read these files to understand the project:
- CLAUDE.md (project overview, patterns, commands)
- PHASE6_AGENTIC_ROADMAP.md (detailed phase specification)
- schema-additions.ts (new database tables to add)
- shared/schema.ts (existing schema for reference)

## Current State

- Phases 1-5 complete: Core platform with HCP Explorer, Audience Builder, Simulations, Dashboard, Channel Health Diagnostic, NBA Engine
- 165+ tests passing
- GenAI integration working (Claude-powered NL queries)
- Ready for Phase 6: Agentic capabilities and enterprise integrations

## Phase 6 Goals

Transform TwinEngine from analytics platform to agentic intelligence hub:
1. MCP-first integration layer (Slack, Jira, Box, Teams)
2. Autonomous agents (Channel Health Monitor, Insight Synthesizer)
3. Human-in-the-loop approval workflows
4. AI-generated strategic documents (briefs, POVs, reports)

## Starting Point

Begin with **Phase 6A: Integration Foundation** (4-6 hours):
- Add integration schema tables
- Create MCP client wrapper service
- Implement Slack integration
- Add "Export to Slack" to NBA Queue

## Key Constraints

- Follow existing patterns in the codebase
- Schema-first: Add types to shared/schema.ts
- Extract services to server/services/
- Use React Query for server state
- shadcn/ui components (New York variant)
- Add tests for new services
- Maintain existing test coverage

## Commands

npm run dev          # Start development server
npm run check        # TypeScript type checking
npm run db:push      # Push schema changes
npm test             # Run tests

## Ready?

1. Read the context files
2. Confirm understanding of Phase 6A scope
3. Begin with schema additions for integration tables
4. Create the integration service layer
5. Implement Slack integration
6. Update NBA Queue UI with export action
```

---

## Alternative: Resume Mid-Phase Prompt

If resuming after partial progress:

```
I'm continuing Phase 6 development on TwinEngine. 

Please read:
- CLAUDE.md
- PHASE6_AGENTIC_ROADMAP.md  
- STATUS.md (for current progress)

Last session completed: [DESCRIBE LAST MILESTONE]

Continue with: [NEXT MILESTONE FROM ROADMAP]

Run `npm run check && npm test` to verify current state before proceeding.
```

---

## Sub-Phase Specific Prompts

### Phase 6B: Jira Integration

```
Continuing TwinEngine Phase 6. Phase 6A (Integration Foundation) is complete.

Read: CLAUDE.md, PHASE6_AGENTIC_ROADMAP.md, STATUS.md

Begin Phase 6B: Jira Integration (6-8 hours)
- Create Jira MCP client in server/services/integrations/jira.ts
- Implement ticket creation from NBA recommendations
- Add bi-directional status sync
- Add "Create Jira Ticket" action to NBA Queue and Simulation Results

Reference the existing Slack integration pattern in server/services/integrations/slack.ts
```

### Phase 6C: Channel Health Monitor Agent

```
Continuing TwinEngine Phase 6. Phases 6A-6B complete.

Read: CLAUDE.md, PHASE6_AGENTIC_ROADMAP.md, STATUS.md

Begin Phase 6C: Channel Health Monitor Agent (8-10 hours)
- Add agent schema tables (agentDefinitions, agentRuns)
- Create base agent class in server/services/agents/base-agent.ts
- Implement Channel Health Monitor agent
- Add scheduler for automated runs
- Create Agents Dashboard UI
- Integrate with Slack for external alerts

This is our first autonomous agent - focus on:
1. Clean agent abstraction that can be reused
2. Comprehensive logging for debugging
3. Human-in-the-loop before external actions
```

### Phase 6D: Insight Synthesizer Agent

```
Continuing TwinEngine Phase 6. Phases 6A-6C complete.

Read: CLAUDE.md, PHASE6_AGENTIC_ROADMAP.md, STATUS.md

Begin Phase 6D: Insight Synthesizer Agent (10-12 hours)
- Add generatedDocuments table
- Create Insight Synthesizer agent leveraging Claude
- Implement document templates (brief, POV, report, health assessment)
- Create Document Generator wizard UI
- Add PDF export capability
- Integrate with Box for document storage

Focus on:
1. Quality document generation with Claude
2. Template flexibility
3. Beautiful in-platform preview
```

### Phase 6E: Orchestrator & Approval Workflow

```
Continuing TwinEngine Phase 6. Phases 6A-6D complete.

Read: CLAUDE.md, PHASE6_AGENTIC_ROADMAP.md, STATUS.md

Begin Phase 6E: Orchestrator & Approval Workflow (8-10 hours)
- Add agentActions and approvalRules tables
- Create orchestrator service to coordinate agents
- Implement approval queue with auto-approval rules
- Create Action Queue UI for reviewing pending actions
- Add comprehensive audit logging
- Add notification system for pending approvals

This is the governance layer - critical for enterprise pharma:
1. All actions must be auditable
2. Auto-approval must be safe and configurable
3. Clear UI for reviewing and approving actions
```

---

## Progress Tracking Template

Update STATUS.md after each session:

```markdown
# STATUS.md

## Current Phase: 6 - Agentic Ecosystem

### Phase 6A: Integration Foundation
- [x] Schema: integrationConfigs table
- [x] Schema: actionExports table
- [x] Service: mcp-client.ts wrapper
- [x] Service: slack.ts integration
- [x] API: /api/integrations CRUD
- [x] API: /api/integrations/slack/send
- [x] UI: IntegrationManager component
- [x] UI: Export to Slack on NBA Queue
- [x] Tests: Integration service tests
- **Status: COMPLETE** | **Date: YYYY-MM-DD**

### Phase 6B: Jira Integration
- [ ] Service: jira.ts MCP client
- [ ] API: /api/integrations/jira/create-ticket
- [ ] API: /api/integrations/jira/sync-status
- [ ] UI: Create Jira Ticket action
- [ ] Tests: Jira integration tests
- **Status: IN PROGRESS** | **Started: YYYY-MM-DD**

### Blockers
- None

### Notes
- [Session notes here]
```

---

## Verification Checklist

Before ending each session:

```bash
# 1. Type check
npm run check

# 2. Run tests
npm test

# 3. Build verification
npm run build

# 4. Manual smoke test
npm run dev
# Visit key pages, verify no regressions

# 5. Update STATUS.md with progress
```

---

## Key File Locations

```
# New files to create (Phase 6)
server/services/integrations/mcp-client.ts
server/services/integrations/slack.ts
server/services/integrations/jira.ts
server/services/integrations/box.ts
server/services/agents/base-agent.ts
server/services/agents/orchestrator.ts
server/services/agents/scheduler.ts
server/services/agents/channel-health-monitor.ts
server/services/agents/insight-synthesizer.ts
server/routes/integrations.ts
server/routes/agents.ts
server/routes/actions.ts
server/routes/documents.ts
client/src/pages/AgentsDashboard.tsx
client/src/pages/ActionQueue.tsx
client/src/pages/DocumentGenerator.tsx
client/src/pages/IntegrationsAdmin.tsx
client/src/components/AlertBanner.tsx
client/src/components/agents/*
client/src/components/actions/*
client/src/components/documents/*
client/src/components/integrations/*

# Files to modify
shared/schema.ts (add new tables from schema-additions.ts)
server/routes.ts (mount new route modules)
client/src/App.tsx (add new routes)
client/src/components/Sidebar.tsx (add nav items)
```

---

## Environment Setup

Ensure these are configured before starting integration work:

```bash
# .env additions for Phase 6
SLACK_BOT_TOKEN=        # From Slack App
SLACK_SIGNING_SECRET=   # From Slack App
JIRA_BASE_URL=          # https://yourcompany.atlassian.net
JIRA_EMAIL=             # Atlassian account email
JIRA_API_TOKEN=         # From Atlassian API tokens
BOX_CLIENT_ID=          # From Box Developer Console
BOX_CLIENT_SECRET=      # From Box Developer Console
AGENT_SCHEDULER_ENABLED=true
```

For development without real integrations, the services should gracefully handle missing credentials and provide mock responses.
