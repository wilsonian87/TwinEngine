# PHASE 6: Agentic Ecosystem & Enterprise Integrations

**Goal:** Transform TwinEngine from analytics platform to agentic intelligence hub with enterprise workflow integrations  
**Target Users:** Professional strategists generating reports, POVs, diagrams, and briefs  
**Architecture Pattern:** MCP-first, human-in-the-loop, multi-agent orchestration  
**Estimated Total Effort:** 40-50 hours across 5 sub-phases

---

## Strategic Context

### Market Positioning
- 40% of enterprise applications will integrate task-specific AI agents by 2026 (Gartner)
- 75-85% of pharma workflows have tasks that could be automated by agents (McKinsey)
- MCP (Model Context Protocol) is emerging as the HTTP-equivalent standard for agentic AI
- Pharma is shifting from "analysis to action" in 2026 — TwinEngine's NBA engine positions us perfectly

### Competitive Differentiators
1. **MCP-Native** — Interoperable by design, not retrofitted
2. **Human-Augmented** — Agents as teammates, not replacements
3. **Pharma-Aware** — Governance, audit trails, approval workflows baked in
4. **Strategist-Centric** — Output artifacts match actual workflow needs

### Key Design Principles
- Agents propose, humans approve (configurable auto-approval for low-risk actions)
- All agent actions are auditable and reversible where possible
- Integrations use MCP where available, graceful fallback to REST APIs
- Outputs flow to where work happens (Slack, Jira, Box, Teams)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TWINENGINE AGENTIC LAYER                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        AGENT ORCHESTRATOR                            │   │
│  │  • Coordinates multi-agent workflows                                 │   │
│  │  • Routes actions to approval queue                                  │   │
│  │  • Manages agent lifecycle and scheduling                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│         ┌──────────────────────────┼──────────────────────────┐            │
│         │                          │                          │            │
│         ▼                          ▼                          ▼            │
│  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐        │
│  │  SENSING    │          │  ANALYSIS   │          │   OUTPUT    │        │
│  │  AGENTS     │          │  AGENTS     │          │   AGENTS    │        │
│  ├─────────────┤          ├─────────────┤          ├─────────────┤        │
│  │ • Channel   │          │ • Pattern   │          │ • Brief     │        │
│  │   Health    │    →     │   Detector  │    →     │   Generator │        │
│  │   Monitor   │          │ • Anomaly   │          │ • POV       │        │
│  │ • Engagement│          │   Assessor  │          │   Drafter   │        │
│  │   Drift     │          │ • Root Cause│          │ • Diagram   │        │
│  │   Detector  │          │   Analyzer  │          │   Builder   │        │
│  └─────────────┘          └─────────────┘          └─────────────┘        │
│                                    │                                        │
│  ══════════════════════════════════╪════════════════════════════════════   │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      HUMAN-IN-THE-LOOP LAYER                         │   │
│  │  • Action approval queue                                             │   │
│  │  • Auto-approval rules engine                                        │   │
│  │  • Audit trail & compliance logging                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ══════════════════════════════════╪════════════════════════════════════   │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      MCP INTEGRATION LAYER                           │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │   │
│  │  │  Slack  │  │  Jira   │  │  Teams  │  │   Box   │  │  Veeva  │   │   │
│  │  │   MCP   │  │   MCP   │  │   MCP   │  │   API   │  │   API   │   │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Model Additions

### New Tables Summary

| Table | Purpose |
|-------|---------|
| `integration_configs` | Store OAuth credentials and MCP endpoints for external services |
| `action_exports` | Track what got pushed where (audit trail for integrations) |
| `agent_definitions` | Configurable agent parameters and schedules |
| `agent_actions` | Queue of proposed/executed agent actions |
| `approval_rules` | Auto-approval conditions per agent/action type |
| `generated_documents` | Store AI-generated briefs, POVs, reports |
| `agent_runs` | Execution history and performance metrics |

### Schema Details

See `schema-additions.ts` for complete TypeScript/Drizzle definitions.

---

## Phase 6A: Integration Foundation (4-6 hours)

**Goal:** Establish MCP client infrastructure and first integration (Slack)

### Tasks

- [ ] **M6A.1:** Add `integrationConfigs` table to schema.ts
- [ ] **M6A.2:** Add `actionExports` table to schema.ts  
- [ ] **M6A.3:** Create storage methods for integration CRUD
- [ ] **M6A.4:** Create `server/services/integrations/mcp-client.ts` — generic MCP client wrapper
- [ ] **M6A.5:** Create `server/services/integrations/slack.ts` — Slack-specific integration
- [ ] **M6A.6:** Create `/api/integrations` CRUD endpoints (admin-protected)
- [ ] **M6A.7:** Create `/api/integrations/slack/send` POST endpoint
- [ ] **M6A.8:** Add "Export to Slack" button on NBA Queue page
- [ ] **M6A.9:** Create `client/src/components/IntegrationManager.tsx` — admin UI for configuring integrations
- [ ] **M6A.10:** Add tests for integration service layer

### Acceptance Criteria

- Admin can configure Slack workspace connection via UI
- User can push NBA recommendation to configured Slack channel
- Action export is logged with destination reference
- Integration status (connected/error) visible in admin panel

### API Contracts

```typescript
// POST /api/integrations
{
  type: "slack" | "jira" | "teams" | "box",
  name: string,
  credentials: {
    // Slack: botToken, signingSecret
    // Jira: email, apiToken, baseUrl
    // etc.
  },
  defaultChannel?: string  // Slack channel ID
}

// POST /api/integrations/slack/send
{
  integrationId: string,
  channel?: string,  // Override default
  message: {
    text: string,
    blocks?: SlackBlock[],  // Rich formatting
    attachments?: SlackAttachment[]
  },
  sourceType: "nba" | "simulation" | "audience" | "alert",
  sourceId: string
}
```

---

## Phase 6B: Jira Integration (6-8 hours)

**Goal:** Enable bi-directional Jira integration for NBA workflow management

### Tasks

- [ ] **M6B.1:** Create `server/services/integrations/jira.ts` — Jira MCP client
- [ ] **M6B.2:** Implement `createIssue()` — create Jira ticket from NBA
- [ ] **M6B.3:** Implement `getIssue()` — fetch ticket status
- [ ] **M6B.4:** Implement `updateIssue()` — update ticket fields
- [ ] **M6B.5:** Create `/api/integrations/jira/create-ticket` POST endpoint
- [ ] **M6B.6:** Create `/api/integrations/jira/sync-status` POST endpoint
- [ ] **M6B.7:** Add "Create Jira Ticket" action to NBA Queue
- [ ] **M6B.8:** Add "Create Jira Ticket" action to Simulation Results
- [ ] **M6B.9:** Create ticket template configuration (map NBA fields to Jira fields)
- [ ] **M6B.10:** Add webhook endpoint for Jira status updates (optional, enhances bi-directional sync)
- [ ] **M6B.11:** Add tests for Jira integration

### Jira Ticket Mapping

```typescript
// NBA → Jira Issue mapping
{
  summary: `[NBA] ${hcp.firstName} ${hcp.lastName} - ${nba.recommendedChannel}`,
  description: nba.reasoning,
  issueType: "Task",  // Configurable
  priority: mapConfidenceToPriority(nba.confidence),
  labels: ["twinengine", "nba", nba.channel],
  customFields: {
    hcpId: nba.hcpId,
    npi: hcp.npi,
    recommendedAction: nba.actionType,
    confidenceScore: nba.confidence
  }
}
```

### Acceptance Criteria

- User can create Jira ticket from any NBA recommendation
- Ticket includes all relevant HCP context and reasoning
- Created ticket ID is stored in `actionExports` table
- User can view linked Jira ticket status from NBA Queue
- Simulation results can spawn Jira tickets for follow-up actions

---

## Phase 6C: Channel Health Monitor Agent (8-10 hours)

**Goal:** First autonomous agent — monitors channel health and generates alerts

### Agent Specification

```typescript
interface ChannelHealthMonitorAgent {
  id: "channel_health_monitor",
  name: "Channel Health Monitor",
  description: "Continuously monitors channel health across audiences and generates alerts when thresholds are breached",
  
  // Trigger configuration
  triggers: {
    scheduled: {
      enabled: true,
      cron: "0 */6 * * *"  // Every 6 hours
    },
    onDemand: true,
    eventDriven: {
      enabled: true,
      events: ["audience_updated", "simulation_completed"]
    }
  },
  
  // Input parameters
  inputs: {
    audienceIds: string[] | "all",
    thresholds: {
      decliningChannelsPct: number,   // Alert if > X% of HCPs have declining channel
      darkChannelsPct: number,        // Alert if > X% of HCPs have dark channel
      blockedChannelsPct: number,     // Alert if > X% of HCPs have blocked channel
      opportunityChannelsPct: number  // Highlight if > X% have opportunity
    }
  },
  
  // Output types
  outputs: {
    alerts: Alert[],
    healthReport: CohortHealthSummary,
    recommendations: NextBestAction[]
  },
  
  // Destination routing
  destinations: {
    inPlatform: ["alert_banner", "notification_center"],
    external: ["slack", "jira", "email"]
  }
}
```

### Tasks

- [ ] **M6C.1:** Add `agentDefinitions` table to schema.ts
- [ ] **M6C.2:** Add `agentRuns` table to schema.ts
- [ ] **M6C.3:** Create `server/services/agents/base-agent.ts` — abstract agent class
- [ ] **M6C.4:** Create `server/services/agents/channel-health-monitor.ts`
- [ ] **M6C.5:** Implement health assessment logic (leverage existing `channel-health.ts`)
- [ ] **M6C.6:** Implement alert generation with severity levels
- [ ] **M6C.7:** Create `server/services/agents/scheduler.ts` — cron-based agent scheduler
- [ ] **M6C.8:** Create `/api/agents` CRUD endpoints
- [ ] **M6C.9:** Create `/api/agents/:id/run` POST endpoint (manual trigger)
- [ ] **M6C.10:** Create `/api/agents/:id/history` GET endpoint
- [ ] **M6C.11:** Create `client/src/pages/AgentsDashboard.tsx` — agent management UI
- [ ] **M6C.12:** Create `client/src/components/AlertBanner.tsx` — in-platform alert display
- [ ] **M6C.13:** Integrate with Slack for external alerts
- [ ] **M6C.14:** Add tests for agent execution

### Alert Schema

```typescript
interface Alert {
  id: string,
  agentId: string,
  severity: "critical" | "warning" | "info",
  title: string,
  message: string,
  affectedEntities: {
    type: "audience" | "hcp" | "channel",
    ids: string[],
    count: number
  },
  metrics: {
    current: number,
    threshold: number,
    trend: "improving" | "stable" | "declining"
  },
  suggestedActions: NextBestAction[],
  acknowledgedAt?: string,
  acknowledgedBy?: string,
  createdAt: string
}
```

### Acceptance Criteria

- Agent runs on configured schedule (default: every 6 hours)
- Agent can be triggered manually from UI
- Alerts appear in-platform as dismissible banner
- Critical alerts push to configured Slack channel
- Agent run history is viewable with performance metrics
- Alerts link to relevant audience/HCP views

---

## Phase 6D: Insight Synthesizer Agent (10-12 hours)

**Goal:** AI-powered document generation for briefs, POVs, and executive summaries

### Agent Specification

```typescript
interface InsightSynthesizerAgent {
  id: "insight_synthesizer",
  name: "Insight Synthesizer",
  description: "Generates strategic documents from platform data using Claude",
  
  triggers: {
    onDemand: true,  // Primary trigger
    scheduled: false  // Could enable for recurring reports
  },
  
  inputs: {
    documentType: "brief" | "pov" | "executive_summary" | "campaign_report" | "health_assessment",
    context: {
      audiences?: string[],      // Audience IDs to include
      simulations?: string[],    // Simulation IDs to include
      timeframe?: DateRange,
      focusAreas?: string[]      // e.g., ["channel_health", "engagement_trends"]
    },
    formatting: {
      tone: "strategic" | "tactical" | "executive",
      length: "concise" | "standard" | "comprehensive",
      includeVisualizations: boolean,
      includeSupportingData: boolean
    },
    customPrompt?: string  // Additional instructions
  },
  
  outputs: {
    document: {
      title: string,
      content: string,  // Markdown
      sections: DocumentSection[],
      keyFindings: string[],
      recommendations: string[],
      visualizations?: Chart[]
    },
    metadata: {
      generatedAt: string,
      modelUsed: string,
      tokensUsed: number,
      sourcesReferenced: string[]
    }
  },
  
  destinations: {
    inPlatform: ["document_viewer", "download"],
    external: ["box", "confluence", "email"]
  }
}
```

### Document Templates

```typescript
const documentTemplates = {
  brief: {
    name: "Strategic Brief",
    sections: [
      "Executive Summary",
      "Key Findings",
      "Audience Analysis",
      "Recommendations",
      "Next Steps"
    ],
    targetLength: 800,  // words
    tone: "executive"
  },
  pov: {
    name: "Point of View",
    sections: [
      "Situation Overview",
      "Analysis",
      "Strategic Position",
      "Supporting Evidence",
      "Recommended Approach"
    ],
    targetLength: 1200,
    tone: "strategic"
  },
  campaign_report: {
    name: "Campaign Performance Report",
    sections: [
      "Campaign Summary",
      "Audience Performance",
      "Channel Effectiveness",
      "Simulation Results",
      "Optimization Opportunities",
      "Appendix: Detailed Metrics"
    ],
    targetLength: 2000,
    tone: "tactical"
  },
  health_assessment: {
    name: "Channel Health Assessment",
    sections: [
      "Overall Health Score",
      "Channel-by-Channel Analysis",
      "At-Risk Segments",
      "Opportunity Highlights",
      "Recommended Interventions"
    ],
    targetLength: 1500,
    tone: "tactical"
  }
}
```

### Tasks

- [ ] **M6D.1:** Add `generatedDocuments` table to schema.ts
- [ ] **M6D.2:** Create `server/services/agents/insight-synthesizer.ts`
- [ ] **M6D.3:** Create document template definitions
- [ ] **M6D.4:** Implement context gathering (fetch audiences, simulations, health data)
- [ ] **M6D.5:** Implement Claude-powered document generation
- [ ] **M6D.6:** Create `/api/agents/synthesizer/generate` POST endpoint
- [ ] **M6D.7:** Create `/api/documents` CRUD endpoints
- [ ] **M6D.8:** Create `client/src/pages/DocumentGenerator.tsx` — document creation wizard
- [ ] **M6D.9:** Create `client/src/components/DocumentViewer.tsx` — markdown preview with export
- [ ] **M6D.10:** Implement PDF export for generated documents
- [ ] **M6D.11:** Create `server/services/integrations/box.ts` — Box API integration
- [ ] **M6D.12:** Add "Generate Report" action to Audience detail view
- [ ] **M6D.13:** Add "Generate Summary" action to Simulation results
- [ ] **M6D.14:** Add tests for document generation

### Acceptance Criteria

- User can generate documents from multiple entry points (Audience, Simulation, dedicated page)
- Document generation wizard allows customization (type, tone, length, focus areas)
- Generated documents render beautifully in-platform
- Documents can be downloaded as PDF or Markdown
- Documents can be pushed to Box folder
- Generation history is preserved with regeneration option

---

## Phase 6E: Orchestrator & Approval Workflow (8-10 hours)

**Goal:** Unified agent coordination with human-in-the-loop governance

### Tasks

- [ ] **M6E.1:** Add `agentActions` table to schema.ts
- [ ] **M6E.2:** Add `approvalRules` table to schema.ts
- [ ] **M6E.3:** Create `server/services/agents/orchestrator.ts` — central coordinator
- [ ] **M6E.4:** Implement action queue management
- [ ] **M6E.5:** Implement auto-approval rules engine
- [ ] **M6E.6:** Create `/api/actions` endpoints (list, approve, reject, modify)
- [ ] **M6E.7:** Create `/api/approval-rules` CRUD endpoints
- [ ] **M6E.8:** Create `client/src/pages/ActionQueue.tsx` — pending action review UI
- [ ] **M6E.9:** Create `client/src/components/ActionCard.tsx` — individual action display
- [ ] **M6E.10:** Create `client/src/pages/ApprovalRulesConfig.tsx` — admin rule configuration
- [ ] **M6E.11:** Add notification system for pending approvals
- [ ] **M6E.12:** Implement action execution engine
- [ ] **M6E.13:** Add comprehensive audit logging for all agent actions
- [ ] **M6E.14:** Add tests for orchestrator and approval workflow

### Approval Rules Configuration

```typescript
interface ApprovalRule {
  id: string,
  agentType: string,
  actionType: string,
  
  // Auto-approval conditions (all must be met)
  autoApproveConditions: {
    confidenceThreshold: number,     // e.g., 0.85 = auto-approve if confidence >= 85%
    impactScope: "individual" | "segment" | "portfolio",
    maxAffectedEntities: number,     // e.g., 10 = auto-approve if affects <= 10 HCPs
    allowedDestinations: string[],   // e.g., ["slack"] = auto-approve Slack only
    excludeHighRisk: boolean         // Never auto-approve actions marked high-risk
  },
  
  // Manual approval settings
  requiredApprovers: string[],       // User IDs or roles
  escalationAfterHours: number,      // Escalate if not reviewed within N hours
  
  // Notifications
  notifyOnProposal: string[],        // Who to notify when action proposed
  notifyOnExecution: string[]        // Who to notify when action executed
}
```

### Action Queue UI

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ACTION QUEUE                                          [Filter ▾] [⚙️]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 🟡 PENDING REVIEW                                    12 actions │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ [!] Channel Health Alert                          Confidence: 92%│   │
│  │     Agent: Channel Health Monitor                                │   │
│  │     Action: Push alert to #hcp-alerts Slack channel              │   │
│  │     Affects: 47 HCPs in "High Value Oncologists" audience        │   │
│  │     Reasoning: 23% of cohort shows declining email engagement    │   │
│  │                                                                   │   │
│  │     [✓ Approve]  [✗ Reject]  [✎ Modify]  [View Details]         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ [!] Create Jira Ticket                            Confidence: 88%│   │
│  │     Agent: NBA Engine                                            │   │
│  │     Action: Create follow-up ticket for Dr. Smith engagement     │   │
│  │     ...                                                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 🟢 RECENTLY EXECUTED                                 24 actions │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ...                                                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Acceptance Criteria

- All agent-proposed actions flow through approval queue
- Auto-approval rules can be configured per agent/action type
- Pending actions display with full context and reasoning
- Approvers can approve, reject, or modify actions
- Executed actions are logged with full audit trail
- Notifications alert relevant users to pending approvals
- Dashboard shows action queue statistics

---

## File Structure

```
server/
├── services/
│   ├── agents/
│   │   ├── base-agent.ts           # Abstract agent class
│   │   ├── orchestrator.ts         # Central coordinator
│   │   ├── scheduler.ts            # Cron-based scheduling
│   │   ├── channel-health-monitor.ts
│   │   └── insight-synthesizer.ts
│   ├── integrations/
│   │   ├── mcp-client.ts           # Generic MCP wrapper
│   │   ├── slack.ts
│   │   ├── jira.ts
│   │   ├── teams.ts
│   │   └── box.ts
│   └── ... (existing services)
├── routes/
│   ├── agents.ts                   # Agent management routes
│   ├── integrations.ts             # Integration config routes
│   ├── actions.ts                  # Action queue routes
│   └── documents.ts                # Generated document routes
└── ... (existing files)

client/src/
├── pages/
│   ├── AgentsDashboard.tsx         # Agent overview and management
│   ├── ActionQueue.tsx             # Pending action review
│   ├── DocumentGenerator.tsx       # Document creation wizard
│   └── IntegrationsAdmin.tsx       # Integration configuration
├── components/
│   ├── agents/
│   │   ├── AgentCard.tsx
│   │   ├── AgentRunHistory.tsx
│   │   └── AgentConfigForm.tsx
│   ├── actions/
│   │   ├── ActionCard.tsx
│   │   ├── ApprovalButtons.tsx
│   │   └── ActionTimeline.tsx
│   ├── documents/
│   │   ├── DocumentViewer.tsx
│   │   ├── DocumentExport.tsx
│   │   └── TemplateSelector.tsx
│   ├── integrations/
│   │   ├── IntegrationCard.tsx
│   │   ├── SlackConfig.tsx
│   │   ├── JiraConfig.tsx
│   │   └── BoxConfig.tsx
│   └── AlertBanner.tsx
└── ... (existing files)
```

---

## Testing Strategy

### Unit Tests
- Agent logic (health assessment, threshold detection)
- Approval rules evaluation
- Document template rendering
- Integration payload formatting

### Integration Tests
- MCP client communication (mock servers)
- Agent scheduler execution
- Action queue workflow
- Document generation with Claude

### E2E Tests
- Full agent cycle: trigger → propose → approve → execute → audit
- Integration flow: NBA → Jira ticket creation → status sync
- Document generation wizard → preview → export

---

## Environment Variables (New)

```bash
# Slack Integration
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_DEFAULT_CHANNEL=C...

# Jira Integration  
JIRA_BASE_URL=https://yourcompany.atlassian.net
JIRA_EMAIL=...
JIRA_API_TOKEN=...
JIRA_PROJECT_KEY=...

# Box Integration
BOX_CLIENT_ID=...
BOX_CLIENT_SECRET=...
BOX_ENTERPRISE_ID=...

# Agent Configuration
AGENT_SCHEDULER_ENABLED=true
AGENT_DEFAULT_TIMEZONE=America/New_York
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time to push NBA to Jira | < 3 clicks |
| Document generation time | < 30 seconds |
| Agent alert latency | < 5 minutes from trigger |
| Auto-approval accuracy | > 95% appropriate |
| Integration uptime | > 99.5% |

---

## Future Considerations (Post Phase 6)

- [ ] Teams MCP integration (when stable)
- [ ] Veeva CRM custom MCP server
- [ ] Multi-agent workflows (chain sensing → analysis → output)
- [ ] Agent marketplace (community-contributed agents)
- [ ] Webhook-based external triggers
- [ ] Agent A/B testing framework
- [ ] Natural language agent configuration

---

*Phase 6 Roadmap generated: 2025-01-15*  
*Source: Claude.ai strategic planning session*  
*Project: TwinEngine — HCP Digital Twin Platform*
