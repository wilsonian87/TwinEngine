# Changelog

All notable changes to TwinEngine are documented in this file.

## [1.11.0] - 2026-01-18 (In Development)

### Phase 11: HCP-Centric Visualization Hierarchy - Stable

This major release reorients the Ecosystem Explorer from channel-centric to HCP-centric, introducing a three-level "Solar System" model where HCPs are the nucleus and channels/campaigns orbit as layers of influence.

**Status:** Core features complete and stable. Ongoing refinement and testing.

### Conceptual Shift

| Dimension | Phase 10 (Previous) | Phase 11 (Current) |
|-----------|---------------------|-------------------|
| **Mental Model** | "Where are we reaching people?" | "What does this HCP believe, and what pressure acts on that belief?" |
| **Center of Gravity** | Channels | HCPs |
| **Navigation Flow** | Ecosystem → Channel → HCP | HCP Nucleus → Channel → Campaign → HCP Constellation |
| **Edge Semantics** | Visual grouping | Actual HCP overlap (shared audience) |

### Added

#### Phase 11A - Data Layer & Mock Generation
- Messaging themes table (`messagingThemes`) with 10 theme types
- Campaign themes junction table (`campaignThemes`)
- Channel overlap table (`channelOverlap`) for HCP audience overlap
- Mock data files: themes.json, campaigns.json (24 campaigns), channelOverlap.json, channelKPIs.json
- Data service abstraction layer (`dataService.ts`) for L1/L2/L3 data
- Channel color system with 6 distinct channel identities
- Specialty icons mapping for 15 medical specialties

#### Phase 11B - L1 Solar System View
- HCPNucleus component with GLSL shader noise texture (granular "many HCPs" effect)
- ChannelPlanet components orbiting nucleus (sized by reach, colored by channel identity)
- ChannelEdges showing HCP overlap between channels (dashed lines, opacity by overlap strength)
- Radial positioning algorithm for orbital layout
- Channel tooltips with reach, engagement, and health status

#### Phase 11C - L2 Campaign Orbit View
- L2CampaignOrbit container with contextual nucleus (channel-specific HCP count)
- CampaignNode components (sized by reach, colored by messaging theme)
- Campaign tooltips with channel-specific KPIs:
  - Email: Open Rate, CTR, Reach, Fatigue Index
  - Field: Call Reach, Frequency, Access Rate
  - Congress: Attendance, Booth Engagement, Follow-Up Rate
  - Webinar: Registration Rate, Attendance %, Engagement Score
  - Paid Digital: CTR, Cost per Visit, Viewability
  - Web: Time on Site, Content Downloads

#### Phase 11D - L3 HCP Constellation View
- L3HCPConstellation with campaign nucleus
- HCPNode components with specialty-based coloring and clustering
- Golden ratio spiral algorithm for specialty group positioning
- Signal Index tooltips with:
  - Name + Specialty (with abbreviation badge)
  - Engagement Score with sparkline
  - Rx Trend indicator (↑↓→)
  - Channel Affinity
  - Adoption Stage (Aware/Trial/Regular)
  - Last Touch Date

#### Phase 11E - Navigation & Transitions
- Phase11CameraController with spring-based camera animations (0.8s transitions)
- usePhase11Keyboard hook (Esc/Backspace = back, Home = L1, ⌘1 = jump to L1)
- LevelIndicator component (bottom-left breadcrumb showing L1/L2/L3)
- Navigation context in constellation store (level, channelId, campaignId tracking)

#### Phase 11F - Story Mode Integration
- Updated StoryBeat interface with level-aware navigation (`level`, `channelContext`, `campaignContext`)
- 6-beat HCP-centric narrative ("The Inverted Narrative"):
  1. Beat 1 (L1): "2,500 HCPs. Five Channels. One Truth." - Orientation
  2. Beat 2 (L1): "Webinars: Your Highest-Signal Channel" - Identify strength
  3. Beat 3 (L1): "Email: 1,925 HCPs, But Fatigue is Building" - Identify weakness
  4. Beat 4 (L2): "Six Campaigns. Uneven Performance." - Drill into Email
  5. Beat 5 (L3): "560 HCPs. 40% Haven't Opened in 60 Days." - See the humans
  6. Beat 6 (L1): "The Optimization: Shift Pressure, Recover Attention" - Action path
- usePhase11Story hook for syncing story beats with level navigation
- Rich deep dive content: paragraphs, keyStats, campaignTable, sampleHCPs, actionItems

### Fixed

#### Phase 11G - Bug Fixes & Stabilization (In Progress)
- **React hooks violation fix** (`L2CampaignOrbit.tsx`): Moved `healthColor` useMemo before early return to comply with React hooks rules. Previously caused "Rendered more hooks than during the previous render" error when navigating between levels.
- **Error boundary** (`Phase11ErrorBoundary.tsx`): Added error boundary wrapper around Phase 11 Canvas to catch and recover from 3D rendering errors gracefully.
- **Defensive click handlers**: Added try/catch wrappers to click handlers in HCPNode, CampaignNode, and L3HCPConstellation to prevent uncaught errors from crashing the canvas.

### Technical Details

#### New Files (35+ files, ~4,000 lines)
```
client/src/lib/constellation/
├── mockData/
│   ├── themes.json
│   ├── campaigns.json
│   ├── channelOverlap.json
│   └── channelKPIs.json
├── dataService.ts
├── channelColors.ts
├── specialtyIcons.ts
└── shaders/
    ├── nucleusVertex.glsl
    └── nucleusFragment.glsl

client/src/components/constellation/
├── HCPNucleus.tsx
├── ChannelPlanet.tsx
├── ChannelEdgesL1.tsx
├── ChannelTooltip.tsx
├── L1SolarSystem.tsx
├── CampaignNode.tsx
├── L2CampaignOrbit.tsx
├── HCPNode.tsx
├── L3HCPConstellation.tsx
├── Phase11Canvas.tsx
├── Phase11CameraController.tsx
├── LevelIndicator.tsx
└── NavigationBreadcrumb.tsx

client/src/hooks/
├── usePhase11Keyboard.ts
└── usePhase11Story.ts
```

#### Modified Files
- `shared/schema.ts` - Added Phase 11 tables and API schemas
- `client/src/stores/constellationStore.ts` - Added navigation context and level actions
- `client/src/stores/storyStore.ts` - Updated story beats for HCP-centric narrative
- `client/src/pages/ecosystem-explorer.tsx` - View toggle, story mode integration

#### Performance
- 60fps maintained with three-level hierarchy
- Lazy-loaded Phase 11 components (~66KB chunk)
- Spring-based camera transitions for smooth level changes

---

## [1.10.0] - 2026-01-17

### Phase 10: Constellation Visualization - Complete

This major release introduces a WebGL-powered 3D constellation visualization that renders 2,500+ HCP nodes at 60fps. This is the "wow factor" differentiator positioning TwinEngine as the "Figma of pharma marketing."

### Added

#### Phase 10A - Foundation Infrastructure
- React Three Fiber (R3F) canvas integration with Three.js
- Web Worker physics simulation using d3-force-3d
- Zustand stores for constellation and story state management
- Mock data generator (2,500 HCP nodes with channel distribution)
- Custom type declarations for d3-force-3d
- New "Ecosystem Explorer" page with lazy-loaded 3D components
- Navigation entry in sidebar (Compass icon, `/ecosystem` route)

#### Phase 10B - Node Rendering
- InstancedMesh renderer for 2,500+ nodes (single GPU call)
- Status-based coloring (green/amber/red for healthy/warning/critical)
- Hover highlight with scale and brightness effects
- Pulse animation for healthy nodes
- Shiver effect for critical nodes
- HCP Detail Panel (glassmorphic overlay with engagement metrics)
- Channel hub nodes with floating labels

#### Phase 10C - Edge Rendering & Flow
- BufferGeometry edge lines connecting HCPs to channel hubs
- Status-based edge coloring
- Story mode focus (dim non-focused edges)
- EdgeFlow animated particles along connections

#### Phase 10D - Environment & Polish
- Dynamic fog based on zoom level
- Semantic zoom system (ecosystem/campaign/hcp levels)
- Zoom level indicator UI
- Accent lighting based on story state

#### Phase 10E - Story Mode Integration
- 5-beat narrative tour ("Digital Fatigue vs. Physical Access")
- Animated camera transitions between beats
- Headline/Deep Dive narrative pattern (60-char headlines + expandable details)
- Auto-advance playback with progress indicator
- Keyboard navigation (arrows, space, D for details, Esc to exit)
- Visual state synchronization (node emphasis based on beat)

#### Phase 10F - Light Theme Conversion (Polish)
- Converted from dark "space" theme to professional light analytics theme
- GA4/Tableau-inspired color palette
- Saturated status colors for light background contrast
- White UI cards with light borders
- Removed starfield (dark theme only)

#### Phase 10G - Layout Fix
- Fixed `PageTransition` component missing `h-full` class
- Visualization now renders full-screen within module window

#### Phase 10H - Navigation QoL Mini-Sprint
- Zoom Controls Overlay (+/- buttons for discrete L1↔L2↔L3 zoom)
- North Star / Reorient button (context-aware "return to center")
- Mac keyboard shortcuts (`⌘+`/`⌘-` zoom, `⌘0` reset, `Esc` clear)
- Dockable Story Panel (toggle between bottom, top, or right sidebar)
- Panel position persisted to localStorage
- Camera animation system for smooth zoom transitions
- Focus context tracking for intelligent reorientation

### Technical Details

#### New Dependencies
- `three` ^0.182.0 - 3D rendering engine
- `@react-three/fiber` ^8.17.10 - React renderer for Three.js (React 18 compatible)
- `@react-three/drei` ^9.115.0 - R3F helpers
- `d3-force-3d` ^3.0.6 - 3D force simulation
- `zustand` ^5.0.10 - Lightweight state management

#### New Files (33 files, ~6,500 lines)
```
client/src/
├── pages/ecosystem-explorer.tsx
├── components/constellation/ (17 components)
│   ├── ... (13 from Phase 10A-10G)
│   ├── ZoomControlsOverlay.tsx (10H.1)
│   ├── ZoomCameraController.tsx (10H.1)
│   ├── NorthStarButton.tsx (10H.2)
│   └── StoryPanelPositionToggle.tsx (10H.4)
├── stores/ (2 stores, extended)
├── hooks/useKeyboardShortcuts.ts (10H.3)
├── workers/physics.worker.ts
├── lib/constellation/ (types, mockData, shaders, utils)
└── types/d3-force-3d.d.ts
```

#### Performance
- 60fps with 2,500 nodes on M1+ Macs
- Physics runs in Web Worker (no main thread blocking)
- Lazy-loaded (~880KB chunk, acceptable for Three.js)

---

## [1.6.1] - 2026-01-16

### Documentation

#### Data Generation Quick Reference
- Added `DATA-GENERATION-GUIDE.md` to `server/services/data-generation/`
- Documented CLI commands for data generation and scaling
- Explained wipe-and-regenerate pattern (not incremental) and why it's the correct approach for synthetic test data
- Added scaling guide with expected data volumes at various HCP counts
- Documented seed strategy for reproducibility
- Added troubleshooting FAQ

#### Key Points Documented
- Same seed + same params = identical data (reproducible)
- Scaling up regenerates all data (e.g., 2000→2500 HCPs requires `--wipe`)
- Data ratios: ~38x stimuli, ~8x outcomes, 12x Rx history per HCP
- Custom test fixtures should go in `seed-data/` files, not DB mutations

---

## [1.6.0] - 2026-01-16

### Phase 6: Agentic Ecosystem - Complete

This major release transforms TwinEngine from an analytics platform into an agentic intelligence hub with autonomous agents, enterprise integrations, and human-in-the-loop approval workflows.

### Added

#### Phase 6A - Integration Foundation
- MCP (Model Context Protocol) client wrapper for AI-to-tool communication
- Slack integration service with message sending capabilities
- Integration configuration storage and management
- Integration API endpoints (`/api/integrations/*`)
- IntegrationManager UI component in settings

#### Phase 6B - Jira Integration
- Full Jira integration service with ticket creation
- Ticket templates for NBA recommendations, simulations, and channel alerts
- Jira API endpoints (`/api/integrations/jira/*`)
- Jira ticket creation buttons in simulation builder UI

#### Phase 6C - Channel Health Monitor Agent
- Base agent class (`BaseAgent`) with lifecycle management
- `AgentRegistry` singleton for managing agent instances
- Channel Health Monitor agent for portfolio-wide engagement monitoring
- Agent scheduler with node-cron for automated execution
- Agent storage methods (definitions, runs, actions, alerts)
- Agent API endpoints (`/api/agents/*`, `/api/scheduler/*`, `/api/alerts/*`)
- Agent dashboard UI (`/agents` route) with:
  - Scheduler status and controls
  - Agent run history
  - Alert management (acknowledge, dismiss, resolve)
- Jira auto-ticket creation for critical/warning alerts

#### Phase 6D - Insight Synthesizer Agent
- Insight Synthesizer agent for strategic analysis
- Multi-source data aggregation (channel health, NBAs, alerts, simulations)
- Strategic pattern identification (7 pattern types):
  - `channel_fatigue`, `engagement_decline`, `tier1_health` (risks)
  - `untapped_potential`, `re_engagement` (opportunities)
  - `urgent_actions`, `recurring_issues` (operational)
- Recommendation generation with priority ranking
- Executive summary document generation
- NBA engine integration for portfolio-wide analysis

#### Phase 6E - Orchestrator & Approval Workflow
- Orchestrator agent for coordinating other agents
- Approval Workflow Service with rule-based action evaluation
- 9 condition operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `not_in`, `contains`
- 4 action types: `auto_approve`, `require_review`, `escalate`, `reject`
- 6 default approval rules with priority ordering
- Batch action processing (approve/reject multiple actions)
- Queue statistics endpoint
- Rate limiting for auto-approvals per rule
- Orchestrator API endpoints (`/api/orchestrator/*`, `/api/approval-rules/*`)

### Technical Details

#### New Dependencies
- `node-cron` ^4.0.0 - Agent scheduling

#### New Database Tables
- `integrationConfigs` - Integration configuration storage
- `actionExports` - Action export audit log
- `agentDefinitions` - Agent metadata and configuration
- `agentRuns` - Agent execution history
- `agentActions` - Proposed action queue (approval workflow)
- `alerts` - System alerts from agents

#### Test Coverage
- 358 total tests (93 new for Phase 6)
- Phase 6A: 35 tests (integration services)
- Phase 6B: 23 tests (Jira integration)
- Phase 6C: 36 tests (agent infrastructure)
- Phase 6D: 18 tests (insight synthesizer)
- Phase 6E: 30 tests (orchestrator + approval workflow)

---

## [1.5.0] - 2026-01-15

### Phase 5: Advanced Features & Polish

- NBA (Next Best Action) engine with personalized recommendations
- Action queue UI for managing recommendations
- Cohort comparison visualization
- System-wide UI polish and refinements

---

## [1.4.0] - 2026-01-14

### Phase 4: Channel Health Diagnostic

- Channel health scoring and visualization
- Individual HCP channel health views
- Cohort-level channel health aggregates
- Channel trend analysis

---

## [1.3.0] - 2026-01-13

### Phase 3: Simulation Enhancements

- Enhanced simulation builder with multi-channel support
- Counterfactual analysis (what-if backtesting)
- Stimuli impact prediction
- Model evaluation tracking

---

## [1.2.0] - 2026-01-12

### Phase 2: Explorer & Audience Builder Polish

- HCP Explorer with advanced filtering
- Saved audience management
- Lookalike search functionality
- Natural language query support (Claude-powered)

---

## [1.1.0] - 2026-01-11

### Phase 1: Foundation

- Invite code system for user onboarding
- Saved audience persistence
- Authentication with Passport.js
- Core HCP data model and seeding

---

## [1.0.0] - 2026-01-10

### Initial Release

- HCP Digital Twin platform foundation
- React frontend with shadcn/ui components
- Express backend with PostgreSQL
- Drizzle ORM with type-safe queries
- Basic HCP profile management
- Dashboard with engagement metrics
