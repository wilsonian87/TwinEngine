# ROADMAP: TwinEngine Production Launch

**Goal:** Client demo-ready platform with invite code access, UI polish, and advanced diagnostic features
**Target:** Pharma brand team demo / Portfolio piece fallback
**Mode:** Milestone-based (Supervised Autonomous)
**Handoff from:** Claude.ai ideation session 2025-01-15

---

## ✅ Completed Phases

| Phase | Name | Status | Documentation |
|-------|------|--------|---------------|
| 1-5 | Foundation through Advanced Features | Complete | This document |
| 6A-E | Agentic Ecosystem | Complete | `PHASE6_AGENTIC_ROADMAP.md` |
| 7A-F | Simulation Intelligence | Complete | `roadmap/archives/ROADMAP-PHASE7.md` |
| 8 | UI Polish & OmniVor Rebrand | Complete | `roadmap/archives/ROADMAP-PHASE8-UI-POLISH.md` |
| 9A-H | Interaction & Experience Design | Complete | `roadmap/archives/ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md` |
| 10A-H | Constellation Visualization | Complete | `roadmap/archives/ROADMAP-PHASE10-CONSTELLATION.md` |
| **11A-F** | **HCP-Centric Visualization Hierarchy** | **Complete** | `roadmap/phase-11/ROADMAP-PHASE11-HCP-CENTRIC-HIERARCHY.md` |

### Phase 11 Summary (2026-01-18)

Phase 11 reoriented the Ecosystem Explorer from channel-centric to HCP-centric:
- **L1 Solar System**: HCP nucleus with orbiting channel planets
- **L2 Campaign Orbit**: Channel drill-down showing campaign nodes
- **L3 HCP Constellation**: Individual HCPs with specialty clustering
- **Story Mode**: 6-beat narrative tour through L1→L2→L3 hierarchy

See `roadmap/phase-11/ROADMAP-PHASE11-HCP-CENTRIC-HIERARCHY.md` for full details.

---

## Context for Claude Code

### Project State
- Codebase is healthy: 165 tests passing, recent refactor complete
- GenAI integration working (Claude-powered NL queries with rule-based fallback)
- Authentication exists but switching to invite-code model for demo simplicity
- All core features functional: HCP Explorer, Audience Builder (NL Query), Simulations, Dashboard

### Patterns to Follow
- Schema-first: Define types in `shared/schema.ts`, flow to server and client
- Services extraction: Complex logic goes in `server/services/` (see prediction-engine.ts pattern)
- React Query for server state, Wouter for routing
- shadcn/ui components (New York variant), Tailwind CSS
- Zod validation on all API inputs

### Constraints
- No per-user auth complexity—invite codes gate access, session tracks usage
- Marketer-friendly UI—avoid data scientist aesthetics
- Maintain test coverage—add tests for new services
- Keep bundle size reasonable—prefer recharts over heavy d3 unless necessary

### Key Files Reference
- `shared/schema.ts` — Add new tables here (invite codes, saved audiences)
- `server/routes.ts` — API endpoints
- `server/storage.ts` — Database operations (IStorage interface)
- `server/services/` — Extracted business logic
- `client/src/pages/` — Page components
- `client/src/components/` — Reusable UI components

---

## Architecture Addition: Saved Audiences

Central data object enabling cross-feature portability:

```
┌─────────────────────────────────────────────────────────────┐
│                        TWINENGINE                           │
├──────────────┬──────────────┬──────────────┬───────────────┤
│   Explorer   │   Audience   │  Simulation  │   Diagnostic  │
│              │   Builder    │              │               │
│  Find HCPs   │  NL Query    │  What-If     │  Channel      │
│  Filter      │  Iterate     │  How-To      │  Health Viz   │
│  Multi-select│  Save        │  Predict     │  NBA Queue    │
└──────┬───────┴──────┬───────┴──────┬───────┴───────┬───────┘
       │              │              │               │
       └──────────────┴──────┬───────┴───────────────┘
                             │
                    ┌────────▼────────┐
                    │ Saved Audiences │  ← Central data object
                    │ (portable)      │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         CSV Export    Cohort Compare   Orchestration Push
```

---

## Phase 1: Foundation

**Goal:** Access control + infrastructure for cross-feature data portability  
**Effort Estimate:** 6-8 hours

### M1.1: Invite Code System

**Schema Addition** (`shared/schema.ts`):
```typescript
export const inviteCodes = pgTable("invite_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 20 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  label: varchar("label", { length: 100 }), // "Pfizer Demo", "Portfolio Review"
  maxUses: integer("max_uses").default(1),
  useCount: integer("use_count").default(0),
  expiresAt: timestamp("expires_at"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

**Tasks:**
- [ ] Add `inviteCodes` table to schema.ts with Zod validation schemas
- [ ] Add storage methods: `validateInviteCode()`, `useInviteCode()`, `createInviteCode()`, `listInviteCodes()`
- [ ] Create `/api/invite/validate` POST endpoint (public)
- [ ] Create `/api/admin/codes` CRUD endpoints (protected by env secret or header)
- [ ] Modify session handling: successful invite validation sets session, tracks code used
- [ ] Update auth middleware: check for valid session from invite code
- [ ] Add tests for invite code validation (expired, max uses, invalid)

**Acceptance Criteria:**
- User can enter email + code on splash page
- Valid code sets session cookie, increments useCount
- Invalid/expired/maxed codes return appropriate errors
- Admin can generate codes via API with Insomnia/curl

---

### M1.2: Splash Page + Gate

**Tasks:**
- [ ] Create `client/src/pages/Landing.tsx` — splash/gate page
- [ ] Hero section: headline, subhead, value prop (copy TBD, placeholder fine)
- [ ] Trust signals area: "Built for Life Sciences" badge, logo placeholder grid
- [ ] Gate form: email input + invite code input, validation feedback
- [ ] Optional: blurred/dimmed dashboard preview behind gate (screenshot or live blur)
- [ ] Update routing: unauthenticated users → Landing, authenticated → Dashboard
- [ ] Add subtle animation: gradient background, particle effect, or data viz motion (keep lightweight)
- [ ] Mobile responsive

**Acceptance Criteria:**
- Clean, modern landing page that signals enterprise credibility
- Form validates and redirects on success
- Appropriate error states for invalid codes
- Works on mobile

---

### M1.3: Saved Audiences System

**Schema Addition** (`shared/schema.ts`):
```typescript
export const savedAudiences = pgTable("saved_audiences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  hcpIds: jsonb("hcp_ids").notNull().$type<string[]>(),
  hcpCount: integer("hcp_count").notNull(),
  filters: jsonb("filters").$type<Record<string, unknown>>(), // Original query/filters used
  source: varchar("source", { length: 50 }).notNull(), // "explorer", "audience_builder", "import"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

**Tasks:**
- [ ] Add `savedAudiences` table to schema.ts with Zod schemas
- [ ] Add storage methods: `createAudience()`, `getAudience()`, `listAudiences()`, `updateAudience()`, `deleteAudience()`
- [ ] Create `/api/audiences` CRUD endpoints
- [ ] Create `client/src/components/AudienceManager.tsx` — reusable component for save/load
- [ ] Add "Saved Audiences" to sidebar navigation (or as modal/drawer accessible from multiple pages)
- [ ] Add tests for audience CRUD operations

**Acceptance Criteria:**
- Can save a list of HCP IDs with name/description
- Can list all saved audiences
- Can load an audience (returns full HCP profiles)
- Audiences accessible from Explorer, Audience Builder, and Simulations

---

## Phase 2: Explorer & Audience Builder Polish

**Goal:** Modernize UI, add filtering power, enable iterative audience building  
**Effort Estimate:** 10-14 hours

### M2.1: Explorer UI Modernization

**Tasks:**
- [ ] Redesign HCP cards in grid view:
  - Add specialty icon/color accent in top-right corner (create icon map for 10 specialties)
  - Subtle gradient or shadow depth
  - Cleaner typography hierarchy
  - Hover state with quick-action hints
- [ ] Add location filters to left sidebar:
  - State dropdown (multi-select)
  - Region dropdown (derive regions from states: Northeast, Southeast, Midwest, Southwest, West)
- [ ] Add engagement score toggle:
  - Switch between "Min Engagement" and "Max Engagement" filter modes
  - Default to "Max" (find low engagers)
- [ ] Improve HCP profile detail view:
  - Card-based layout instead of table-heavy
  - Avatar placeholder (initials-based)
  - Quick stats row with visual indicators
  - Channel engagement mini-chart

**Acceptance Criteria:**
- Cards are visually scannable by specialty at a glance
- Can filter by state/region
- Can find low-engagement HCPs easily
- Profile view feels modern, not clinical

---

### M2.2: Explorer Multi-Select + Export

**Tasks:**
- [ ] Add selection mode toggle to top nav ("Select Multiple")
- [ ] When active: cards show checkbox, selection count badge in nav
- [ ] Selection actions toolbar:
  - "Save as Audience" → opens save modal (name, description)
  - "Export CSV" → downloads selected HCPs
  - "Clear Selection"
- [ ] Implement CSV export utility (`client/src/lib/export.ts`):
  - Configurable columns
  - Proper escaping
  - Filename with timestamp
- [ ] Persist selection in React state (not URL—would get unwieldy)

**Acceptance Criteria:**
- Can select 1-100+ HCPs from grid
- Can save selection as named audience
- Can export selection to CSV
- Selection persists while navigating within Explorer (clears on tab change)

---

### M2.3: Audience Builder Layout Overhaul

**Current Problem:** Results load below fold, under static "try these examples" content.

**Tasks:**
- [ ] Redesign layout to three-panel or dynamic split:
  - Option A: Query input top, results fill remaining viewport (examples collapse/hide on query)
  - Option B: Left panel = query + examples (collapsible), Right panel = results
  - Option C: Command-palette style modal for query, results in main area
- [ ] Results should show immediately on query, above fold
- [ ] "Try these examples" becomes collapsible or moves to empty state only
- [ ] Add result count and query summary header
- [ ] Loading state: skeleton cards or shimmer

**Acceptance Criteria:**
- Query → Results visible without scrolling
- Layout feels responsive and dynamic
- Clear visual hierarchy: input → output

---

### M2.4: Audience Builder Iterative Workflow

**Workflow:** Query → Output → Curate (keep/discard) → Iterate → Save

**Tasks:**
- [ ] Add selection checkboxes to result cards
- [ ] Add "keeper" staging area (could be sidebar drawer or bottom tray):
  - Shows running count of kept HCPs
  - Can remove individual HCPs from keepers
  - Persists across queries within session
- [ ] Action buttons per result card: "Add to Keepers" / "Dismiss"
- [ ] Bulk actions on results: "Add All" / "Clear Results"
- [ ] When keepers > 0, show "Finalize Audience" CTA:
  - Opens save modal
  - Saves keepers as audience
  - Option to continue building or clear
- [ ] Add CSV export for finalized audience

**Acceptance Criteria:**
- Can run multiple queries, curate results each time
- Keepers accumulate across queries
- Can save final curated list as audience
- Can export to CSV

---

### M2.5: Audience Builder AI Enhancement

**Tasks:**
- [ ] Improve result card display:
  - Show "match reason" or "relevance" indicator where possible
  - Claude-generated one-liner explaining why HCP matches query
- [ ] Add "Refine Query" suggestion:
  - After results, show 2-3 suggested follow-up queries based on results
  - e.g., "Narrow to Tier 1 only" or "Expand to include Cardiology"
- [ ] Optional: Add query history within session (quick re-run)

**Acceptance Criteria:**
- Results feel intelligent, not just filtered
- User has clear path to iterate/refine
- AI additions feel helpful, not gimmicky

---

## Phase 3: Simulation Enhancements

**Goal:** Add "How-To" reverse simulation, persona presets, audience integration  
**Effort Estimate:** 10-12 hours

### M3.1: Simulation UI Polish

**Tasks:**
- [ ] Audit current simulation builder UI for marketer-friendliness:
  - Reduce jargon
  - Add tooltips explaining each parameter
  - Group related controls logically
- [ ] Consider stepped wizard vs. single form (wizard may be friendlier)
- [ ] Improve results display:
  - Lead with headline metric ("Projected 23% lift in engagement")
  - Support with detail charts
  - Clear comparison to baseline
- [ ] Add "Run Another" and "Save Results" CTAs

**Acceptance Criteria:**
- Non-technical marketer can build simulation without confusion
- Results tell a clear story
- Easy to iterate and compare

---

### M3.2: Persona Presets for Channel Mix

**Personas:**
1. **Pre-Launch** — Heavy on awareness channels: digital_ad (35%), webinar (25%), email (20%), conference (15%), rep_visit (5%), phone (0%)
2. **Launching** — Balanced push: rep_visit (30%), email (25%), webinar (20%), digital_ad (15%), conference (5%), phone (5%)
3. **Mature** — Relationship maintenance: rep_visit (35%), email (30%), phone (15%), webinar (10%), digital_ad (5%), conference (5%)

**Tasks:**
- [ ] Create persona definitions (can be config file or constants)
- [ ] Add "Quick Start: Apply Persona" dropdown/buttons above channel sliders
- [ ] Selecting persona populates sliders, user can still adjust
- [ ] Show persona name as tag if unmodified, "Custom" if adjusted

**Acceptance Criteria:**
- One-click channel mix setup for common scenarios
- Clear what each persona represents
- User retains full control to customize

---

### M3.3: Import Saved Audiences to Simulation

**Tasks:**
- [ ] Add "Select Target Audience" step/section to simulation builder
- [ ] Options: "All HCPs", "Filter" (existing), "Saved Audience" (new)
- [ ] Saved Audience picker: dropdown or modal showing saved audiences with counts
- [ ] On selection, populate targetHcpIds from audience
- [ ] Show selected audience summary (name, count) in simulation config

**Acceptance Criteria:**
- Can run simulation against a previously saved audience
- Seamless flow from Explorer/Audience Builder → Simulation

---

### M3.4: "How-To" Reverse Simulation

**Concept:** User sets a target outcome (e.g., "50% engagement rate" or "25% Rx lift"), system reverse-engineers what channel mix and frequency would achieve it for the selected audience.

**Tasks:**
- [ ] Design input UI:
  - Target metric selector (engagement rate, response rate, Rx lift)
  - Target value input (percentage)
  - Audience selection (saved audience or current filters)
- [ ] Create `server/services/reverse-simulation.ts`:
  - Given target outcome and audience, work backward through prediction model
  - Output: recommended channel mix, frequency, confidence level
  - Flag if target is unrealistic ("Target exceeds 95th percentile of historical outcomes")
- [ ] Design results UI:
  - "To achieve X, we recommend:"
  - Channel mix visualization
  - Key drivers explanation
  - Confidence/feasibility indicator
- [ ] Add tests for reverse simulation logic

**Acceptance Criteria:**
- User can input desired outcome
- System provides actionable channel strategy recommendation
- Unrealistic targets are flagged gracefully
- Results are marketer-readable

---

## Phase 4: Channel Health Diagnostic

**Goal:** Visual diagnostic tool showing channel ecosystem health, NBA generation  
**Effort Estimate:** 12-16 hours

### M4.1: Channel Health Classification Service

**Health Statuses:**
- 🟢 **Active** — Recent engagement, positive response rate
- 🟡 **Declining** — Engagement trending down, or stale (no touch in 60+ days)
- ⚫ **Dark** — Low historical engagement, underutilized channel
- 🔴 **Blocked** — High touch frequency + low response (being ignored)
- ✨ **Opportunity** — High affinity score but underutilized (gap)

**Tasks:**
- [ ] Create `server/services/channel-health.ts`:
  - `classifyChannelHealth(hcp: HCPProfile): ChannelHealth[]`
  - Returns health status per channel with reasoning
  - Uses: channelEngagements (score, lastContact, totalTouches, responseRate)
- [ ] Define thresholds (configurable):
  - Stale: >60 days since lastContact
  - Blocked: responseRate <10% AND totalTouches >5
  - Opportunity: score >70 AND totalTouches <3
- [ ] Add aggregate version: `classifyCohortChannelHealth(hcps: HCPProfile[])`
  - Returns distribution of health statuses per channel
- [ ] Add tests for classification logic

**Acceptance Criteria:**
- Every HCP can have their 6 channels classified
- Classification logic is sensible and tunable
- Works at individual and cohort level

---

### M4.2: Individual Channel Health Visualization

**Layout:** Hub-and-spoke radial diagram, HCP at center, 6 channels radiating out

**Visual Encoding:**
- Spoke thickness = engagement strength (score)
- Spoke color = health status (green/yellow/gray/red)
- Glow/highlight = opportunity
- Optional animation: pulse for declining, static for dark

**Tasks:**
- [ ] Create `client/src/components/ChannelHealthRadial.tsx`:
  - Props: hcpId or channelHealth data
  - Use recharts RadialBarChart or custom SVG
- [ ] Add to HCP profile detail view (prominent placement)
- [ ] Add legend explaining color codes
- [ ] Tooltip on hover: channel name, status, key metrics, recommendation
- [ ] Ensure responsive sizing

**Acceptance Criteria:**
- At-a-glance understanding of channel health for any HCP
- Visually striking (demo-worthy)
- Actionable: user knows where to focus

---

### M4.3: Cohort Channel Health Aggregate View

**Layout Options:**
- Radial: Same spoke layout, but thickness = % of cohort in that status
- Matrix: Channels × Status heatmap with counts
- Bar: Grouped bar chart per channel showing status distribution

**Tasks:**
- [ ] Create `client/src/components/CohortHealthView.tsx`
- [ ] Add to Audience detail view (when viewing saved audience)
- [ ] Summary stats: "62% of cohort has dark email pathway"
- [ ] Drill-down: click a segment to see which HCPs

**Acceptance Criteria:**
- Can assess channel health across a saved audience
- Identifies systemic issues (e.g., "email is broken for this cohort")
- Links back to individual HCPs for action

---

### M4.4: Next Best Action Engine

**Tasks:**
- [ ] Create `server/services/nba-engine.ts`:
  - `generateNBA(hcp: HCPProfile, channelHealth: ChannelHealth[]): NextBestAction`
  - Logic: prioritize opportunity channels, address declining/blocked, suggest timing
  - Return: channel, action type, confidence score, reasoning
- [ ] Claude enhancement: generate human-readable rationale for each NBA
  - "Email recommended: 89% historical response rate, 45 days since last touch"
- [ ] Batch version: `generateNBAs(hcps: HCPProfile[]): NextBestAction[]`
- [ ] Add tests

**Acceptance Criteria:**
- Every HCP gets a recommended next action
- Recommendations are sensible and explainable
- Works at scale (can generate for full audience)

---

### M4.5: NBA Review Queue + Export

**Workflow:** Generate → Review → Curate → Export/Push

**Tasks:**
- [ ] Create `client/src/pages/ActionQueue.tsx`:
  - Load NBA for selected audience
  - Table/card view: HCP name, recommended action, channel, confidence, rationale
  - Bulk select, approve/reject individual
  - Filter by channel, confidence level
- [ ] Export approved actions:
  - CSV: HCP ID, NPI, name, recommended_channel, action_type, confidence, rationale
  - Formatted for orchestration engine ingestion
- [ ] Optional: save action queue as "Action Plan" (new entity, future phase)

**Acceptance Criteria:**
- User can review all recommended actions for an audience
- Can curate (approve/reject) before export
- Clean CSV export suitable for orchestration engine import

---

## Phase 5: Advanced Features & Polish

**Goal:** Cohort comparison, system QoL, final polish  
**Effort Estimate:** 8-10 hours

### M5.1: Side-by-Side Cohort Comparison

**Tasks:**
- [ ] Create `client/src/pages/CohortCompare.tsx`:
  - Select two saved audiences
  - Two-column layout with mirrored metrics
- [ ] Comparison metrics:
  - Size and overlap
  - Avg engagement score distribution
  - Specialty breakdown
  - Tier distribution
  - Channel preference distribution
  - Channel health comparison
- [ ] Highlight divergences: "Cohort A has 3x more digital-preferred HCPs"
- [ ] Export comparison summary

**Acceptance Criteria:**
- Can meaningfully compare two audiences
- Differences are highlighted, not buried in tables
- Actionable: "What makes high performers different?"

---

### M5.2: System & Settings Polish

**Tasks:**
- [ ] Review System tab for QoL improvements (TBD based on other changes)
- [ ] Add environment indicator (dev/staging/prod badge)
- [ ] Add data freshness indicator ("Data as of: [date]")
- [ ] Audit log viewer improvements (if needed)
- [ ] Performance check: lazy load heavy components, optimize queries

**Acceptance Criteria:**
- System tab is useful for admin/demo purposes
- No obvious performance issues
- Clean, polished feel throughout

---

### M5.3: Final Demo Polish

**Tasks:**
- [ ] End-to-end walkthrough: Splash → Explorer → Audience Builder → Simulation → Diagnostic
- [ ] Fix any UX papercuts discovered
- [ ] Ensure consistent styling across all pages
- [ ] Add subtle micro-interactions where appropriate
- [ ] Screenshot/demo mode: seed compelling sample data if needed
- [ ] Mobile responsiveness check (at least tablet)

**Acceptance Criteria:**
- Demo flows smoothly without hiccups
- Every screen looks polished and intentional
- Tells a coherent product story

---

## Appendix: Future Considerations (Out of Scope)

Captured for later phases:
- [ ] Webhook/API push for NBA export (v2 integration)
- [ ] External file upload for audiences (v3 ETL)
- [ ] User accounts with permissions (if moving beyond demo)
- [ ] SSO integration
- [ ] Audit trail enhancements
- [ ] A/B testing simulation variants

---

## Execution Notes

### For Claude Code Sessions

1. Start each session by reading: `CLAUDE.md`, `STATUS.md`, `ROADMAP.md`
2. Work one milestone at a time
3. Update `STATUS.md` after each milestone completion
4. Run tests after each significant change: `npm run check && npm test`
5. Build verification: `npm run build`

### Milestone Completion Checklist

- [ ] All tasks completed
- [ ] Tests added/passing
- [ ] TypeScript compiles clean
- [ ] Build succeeds
- [ ] STATUS.md updated

---

*Roadmap generated: 2025-01-15*  
*Source: Claude.ai ideation session*  
*Project: TwinEngine — HCP Digital Twin Platform*
