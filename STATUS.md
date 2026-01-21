# STATUS.md

**Last Updated:** 2026-01-20
**Project:** TwinEngine - HCP Digital Twin Platform (OmniVor)
**Current Phase:** 12 Complete - Multi-Roadmap Consolidation
**Overall Status:** Phase 12 Complete (Demo Ready)

---

## Phase Summary

| Phase | Name | Status | Completion |
|-------|------|--------|------------|
| 1 | Foundation (Invite Codes, Saved Audiences) | Complete | 100% |
| 2 | Explorer & Audience Builder Polish | Complete | 100% |
| 3 | Simulation Enhancements | Complete | 100% |
| 4 | Channel Health Diagnostic | Complete | 100% |
| 5 | Advanced Features & Polish | Complete | 100% |
| 6A | Integration Foundation | Complete | 100% |
| 6B | Jira Integration | Complete | 100% |
| 6C | Channel Health Monitor Agent | Complete | 100% |
| 6D | Insight Synthesizer Agent | Complete | 100% |
| 6E | Orchestrator & Approval Workflow | Complete | 100% |
| 7A | Constraint Surfaces | Complete | 100% |
| 7B | Outcome Stream & Attribution | Complete | 100% |
| 7C | Uncertainty Quantification | Complete | 100% |
| 7D | Campaign Coordination | Complete | 100% |
| 7E | Simulation Composability | Complete | 100% |
| 7F | Portfolio Optimizer (Capstone) | Complete | 100% |
| 8 | UI Polish & OmniVor Rebrand | Complete | 100% |
| 9A | Data Visualization System | Complete | 100% |
| 9B | Page Transitions & Data Flow | Complete | 100% |
| 9C | Command Palette | Complete | 100% |
| 9D | Empty/Loading/Error States | Complete | 100% |
| 9E | Nerve Center Redesign | Complete | 100% |
| 9F | Notification System | Complete | 100% |
| 9G | Keyboard Navigation | Complete | 100% |
| 9H | Onboarding & Contextual Help | Complete | 100% |
| 10A-H | Constellation Visualization | Complete | 100% |
| 11A-G | HCP-Centric Visualization | Complete | 100% |
| **12.0** | **Technical Hardening** | **Complete** | 100% |
| **12A** | **Competitive Orbit View** | **Complete** | 100% |
| **12B** | **Message Saturation Heatmap** | **Complete** | 100% |
| **12C** | **Next Best Orbit (NBO)** | **Complete** | 100% |
| **12D.1-2** | **Agent Prompt Pack** | **Complete** | 100% |
| **12D.3-4** | **Agent Tool Invocation** | **Planned** | 0% |
| **12E** | **Cleanup & Polish** | **Optional** | 0% |

---

## Phase 12: Multi-Roadmap Consolidation - Complete (Demo Ready)

### Overview

Phase 12 exposes competitive pressure, message saturation, next-best-orbit decisioning, and agent intelligence as first-class platform capabilities. This is the "stacked value curve" that differentiates TwinEngine from competitors.

### Completed Milestones

#### Phase 12.0: Technical Hardening ✓
- Test coverage foundation: 795 tests total, 166 new tests
- Authentication integration: PostgreSQL session store
- Storage layer refactor: Modular architecture

#### Phase 12A: Competitive Orbit View ✓
- CPI (Competitive Pressure Index) calculation with 4-component formula
- 3D orbit ring visualization integrated with constellation
- Alert generation with 6 alert types
- Governance audit trail and TA-specific views
- PNG/CSV export functionality

#### Phase 12B: Message Saturation Heatmap ✓
- MSI (Message Saturation Index) calculation with stage modifiers
- HCP × Theme heatmap visualization
- Saturation-aware NBA integration with 5 warning types
- Theme simulation and decay curves
- Pre-campaign saturation reports
- MSI benchmarks by therapeutic area

#### Phase 12C: Next Best Orbit (NBO) ✓
- Decision logic with 6 weighted inputs (engagement, adoption, channel, MSI, CPI, history)
- Recommendation generation with rich rationale
- NBO Dashboard page
- Learning loop with feedback and outcome tracking
- Model performance metrics

#### Phase 12D.1-2: Agent Prompt Pack ✓
- Schema context documentation
- 5 persona-specific role prompts
- 5 task-specific prompts (cohort, competitive, campaign, anomaly, reasoning)
- 2 guardrail prompts (compliance, output constraints)

### Test Coverage

| Module | Tests |
|--------|-------|
| Competitive Storage | 48 |
| Competitive Insight Engine | 40 |
| Message Saturation Storage | 23 |
| Saturation-Aware NBA | 35 |
| NBO Engine | 24 |
| NBO Learning | 10 |
| NBO Routes | 9 |
| **Total Phase 12** | **189** |

### API Endpoints Added

~50 new endpoints across:
- `/api/competitive/*` - CPI, alerts, governance
- `/api/message-saturation/*` - MSI, heatmap, benchmarks
- `/api/nbo/*` - Recommendations, feedback, metrics
- `/api/message-themes/*` - Theme CRUD

### Files Created

```
server/storage/
├── competitive-storage.ts (700+ lines)
├── message-saturation-storage.ts (400+ lines)
└── index.ts (re-exports)

server/services/
├── competitive-insight-engine.ts (520 lines)
├── saturation-aware-nba.ts (300+ lines)
├── next-best-orbit-engine.ts (500+ lines)
├── nbo-learning.ts (200+ lines)
└── campaign-planning.ts (800+ lines)

client/src/
├── pages/
│   ├── message-saturation.tsx
│   └── NBODashboard.tsx
├── components/
│   ├── constellation/CompetitiveOrbitRings.tsx
│   ├── constellation/CompetitiveLegend.tsx
│   ├── message-saturation/MessageSaturationHeatmap.tsx
│   ├── message-saturation/ThemeSaturationAlert.tsx
│   └── nbo/NBORecommendationCard.tsx
└── lib/constellation/export.ts

agent/prompts/
├── base/ (2 files)
├── roles/ (5 files)
├── tasks/ (5 files)
└── guardrails/ (2 files)
```

### Build Status

- TypeScript: ✅ Clean
- Tests: ✅ 795 passing
- Build: ✅ Success

---

## Phase 11: HCP-Centric Visualization Hierarchy - Complete

### Overview

Phase 11 reorients the Ecosystem Explorer from a channel-centric to an HCP-centric "Solar System" model. This isn't just a visual refactor—it's a conceptual reorientation where HCPs are the center of gravity and channels/campaigns orbit as layers of influence.

### The Shift

| Dimension | Before (Phase 10) | After (Phase 11) |
|-----------|-------------------|------------------|
| Mental Model | "Where are we reaching people?" | "What does this HCP believe, and what pressure acts on that belief?" |
| Center of Gravity | Channels | HCPs |
| Navigation | Ecosystem → Channel → HCP | HCP Nucleus → Channel → Campaign → HCP Constellation |
| Edge Semantics | Visual grouping | Actual HCP overlap (shared audience) |

### Completed Milestones

#### Phase 11A: Data Layer & Mock Generation ✓
- Added schema tables: `messagingThemes`, `campaignThemes`, `channelOverlap`
- Added API schemas: `L1SolarSystemData`, `L2CampaignOrbitData`, `L3HcpConstellationData`
- Created mock data: themes.json, campaigns.json (24 campaigns), channelOverlap.json, channelKPIs.json
- Created data service abstraction layer
- Created channel colors system (6 channels with distinct identities)
- Created specialty icons mapping (15 specialties)

#### Phase 11B: L1 Solar System View ✓
- HCPNucleus with GLSL shader noise texture
- ChannelPlanet components (sized by reach, colored by channel)
- ChannelEdges showing HCP overlap between channels
- Radial positioning algorithm
- Channel tooltips with reach/engagement/health

#### Phase 11C: L2 Campaign Orbit View ✓
- L2CampaignOrbit container with contextual nucleus
- CampaignNode components (theme-colored)
- Channel-specific KPI tooltips (Email: OR/CTR/Fatigue, Field: Reach/Freq/Access, etc.)

#### Phase 11D: L3 HCP Constellation View ✓
- L3HCPConstellation with specialty clustering
- HCPNode components with specialty colors
- Golden ratio spiral positioning algorithm
- Signal Index tooltips (sparkline, Rx trend, adoption stage)

#### Phase 11E: Navigation & Transitions ✓
- Phase11CameraController with spring animations
- usePhase11Keyboard hook (Esc/Backspace/Home)
- LevelIndicator breadcrumb component
- Navigation context state management

#### Phase 11F: Story Mode Integration ✓
- Updated StoryBeat interface with level awareness
- 6-beat "Inverted Narrative" story:
  - Beat 1 (L1): Universe overview
  - Beat 2 (L1): Webinar strength
  - Beat 3 (L1): Email fatigue warning
  - Beat 4 (L2): Campaign decomposition
  - Beat 5 (L3): HCP human stories
  - Beat 6 (L1): Optimization path
- usePhase11Story hook for level sync
- Rich deep dive content structure

### New Files Created

```
client/src/lib/constellation/
├── mockData/ (4 JSON files)
├── dataService.ts
├── channelColors.ts
├── specialtyIcons.ts
├── types.ts (extended)
└── shaders/ (2 GLSL files)

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

### Build Status

- TypeScript: ✅ Clean
- Build: ✅ Success
- Phase 11 chunk: ~66KB (lazy-loaded)

---

## Phase 9A Progress: Data Visualization System

### Completed Milestones

- [x] **M9A.1**: Chart Theme Configuration
  - Created `client/src/lib/chart-theme.tsx`
  - Color scales (primary, secondary, diverging, sequential, categorical)
  - Typography, axis, grid, tooltip styles
  - BrandedTooltip component for Recharts
  - Animation timing constants
  - SVG gradient definitions
  - Helper functions (getPrimaryColor, formatChartValue, renderChartGradients)

- [x] **M9A.2**: Motion Configuration
  - Created `client/src/lib/motion-config.ts`
  - Page transition variants (pageVariants, fadePageVariants)
  - Shared element transitions for data flow
  - Stagger container/child variants
  - Modal/dialog variants
  - Micro-interaction presets (buttonPress, cardHover, glowHover)
  - Data animation presets (numberReveal, barGrow, lineDraw)
  - Toast/accordion variants

- [x] **M9A.3**: Chart Animation Utilities
  - Created `client/src/lib/chart-animations.ts`
  - Easing functions (easeOut, easeInOut, linear, bounce)
  - useCountAnimation hook for number animations
  - useDrawAnimation hook for SVG path draw
  - staggeredEntrance utility for grid animations
  - useInViewAnimation hook for intersection observer
  - useReducedMotion hook for accessibility
  - useBarAnimation hook for bar chart animations
  - interpolate and interpolateColor utilities

- [x] **M9A.4**: AnimatedNumber Component
  - Created `client/src/components/charts/animated-number.tsx`
  - RAF-based 60fps animation
  - Format options: number, currency, percent, compact
  - Size variants: sm, md, lg, xl, 2xl
  - Color variants: gold, purple, white, gray
  - Trend indicator support
  - Respects prefers-reduced-motion
  - Variants: MetricNumber, InlineNumber, CurrencyNumber, PercentNumber

- [x] **M9A.5**: BrandedBarChart Component
  - Created `client/src/components/charts/branded-bar-chart.tsx`
  - Recharts wrapper with brand theming
  - Gradient fill support
  - Hover/click interactions
  - Staggered entrance animation
  - Color variants: primary (purple), gold, secondary
  - Variants: CompactBarChart, RankingBarChart

- [x] **M9A.6**: BrandedLineChart Component
  - Created `client/src/components/charts/branded-line-chart.tsx`
  - Multi-line support with legend
  - Area fill under lines
  - Custom active dot with glow
  - Draw animation on mount
  - Variants: SimpleLineChart, ComparisonLineChart

- [x] **M9A.7**: EngagementHeatmap Component
  - Created `client/src/components/charts/engagement-heatmap.tsx`
  - CSS Grid-based heatmap
  - Brand color scale (void → purple → gold)
  - Staggered cell entrance animation
  - Hover tooltips with metadata
  - Row/column labels
  - Variants: CompactHeatmap, ChannelHeatmap

- [x] **M9A.8**: SparkLine Component
  - Created `client/src/components/charts/spark-line.tsx`
  - Pure SVG implementation (no Recharts dependency)
  - Lightweight for tables/cards
  - Trend-based coloring (green/red)
  - Area fill with gradient
  - Variants: TrendSparkLine, MinimalSparkLine, CardSparkLine, TableSparkLine

### New Files Created (Phase 9A)

```
client/src/lib/
├── chart-theme.tsx        # Chart theming and gradients (~400 lines)
├── motion-config.ts       # Framer Motion presets (~350 lines)
└── chart-animations.ts    # Animation utilities (~380 lines)

client/src/components/charts/
├── index.ts               # Barrel exports
├── animated-number.tsx    # Animated number counter (~250 lines)
├── branded-bar-chart.tsx  # Brand bar chart (~330 lines)
├── branded-line-chart.tsx # Brand line chart (~320 lines)
├── engagement-heatmap.tsx # Engagement heatmap (~350 lines)
└── spark-line.tsx         # Inline sparkline (~280 lines)
```

### Build Status

- TypeScript: Clean
- Build: Success (1.5MB client, 1.4MB server)

---

## Phase 9B Progress: Page Transitions & Data Flow

### Completed Milestones

- [x] **M9B.1**: Motion Configuration (completed in Phase 9A)
  - Page transition variants in `motion-config.ts`
  - Shared element transition config
  - Stagger presets for lists/grids

- [x] **M9B.2**: Page Transition Wrapper
  - Created `client/src/components/transitions/page-transition.tsx`
  - PageTransition component with enter/exit animations
  - RouteTransition wrapper for AnimatePresence
  - SectionTransition for conditional content
  - LoadingTransition for loading/loaded states
  - Supports variants: default, fade, slide-up, slide-left
  - Respects prefers-reduced-motion

- [x] **M9B.3**: Shared Element Transitions (Data Flow)
  - Created `client/src/components/transitions/data-flow-transition.tsx`
  - DataFlowElement for layoutId-based morphing
  - DataFlowGroup for isolating animation groups
  - DataFlowValue for formatted values that travel
  - DataFlowCard for expandable card transitions
  - DataFlowMetric with label and trend badge
  - HeroValue for inline-to-hero transitions

- [x] **M9B.4**: Content Stagger Animations
  - Created `client/src/components/transitions/stagger-container.tsx`
  - StaggerContainer with timing presets (default, fast, slow)
  - StaggerItem with variants (default, card, fade, scale)
  - StaggerGrid for responsive grid layouts
  - StaggerList for list animations with dividers
  - AnimatedList for add/remove animations

- [x] **M9B.5**: App.tsx Integration
  - Added AnimatePresence wrapper around routes
  - Integrated PageTransition with route location key
  - Pages now animate smoothly on navigation

### New Files Created (Phase 9B)

```
client/src/components/transitions/
├── index.ts                  # Barrel exports
├── page-transition.tsx       # Page transition components (~220 lines)
├── data-flow-transition.tsx  # Shared element transitions (~330 lines)
└── stagger-container.tsx     # Stagger animation components (~340 lines)
```

### Modified Files (Phase 9B)

```
client/src/App.tsx            # AnimatePresence + PageTransition integration
```

### Build Status

- TypeScript: Clean
- Build: Success (1.5MB client, 1.4MB server)

---

## Phase 9C Progress: Command Palette

### Completed Milestones

- [x] **M9C.1**: Command Palette Hook
  - Created `client/src/hooks/use-command-palette.ts`
  - Global keyboard handler (⌘K / Ctrl+K / Escape / /)
  - Open/close/toggle state management
  - Search query state
  - Recent items with localStorage persistence (max 5 items)
  - Navigation utilities with wouter integration
  - Context provider pattern for app-wide access
  - Keyboard navigation hook for lists (j/k, arrow keys, Enter, Home/End)

- [x] **M9C.2**: Command Palette Component
  - Created `client/src/components/ui/command-palette.tsx`
  - Built on cmdk library for accessible command menu
  - Framer Motion animations (overlay fade, modal scale)
  - Navigation items organized by category:
    - Intelligence: Signal Index, Cohort Lab, Nerve Center
    - Activation: Scenario Lab, Catalyst Queue, Cohort Compare
    - System: Signal Diagnostic, Agent Orchestrator, Constraint Surface, Allocation Lab
    - Settings: Settings
  - Quick actions: Create New Audience, Run Simulation, Export Data
  - Recent items section with history
  - Search with keyword matching
  - Keyboard hints in footer (↑↓ Navigate, ↵ Select, esc Close)
  - CommandPaletteTrigger button with ⌘K badge

- [x] **M9C.3**: Command Palette Styling
  - Added CSS styles to `client/src/index.css`
  - cmdk group headings with OmniVor label styling
  - Command items with hover/selected states (purple highlight)
  - Custom scrollbar styling
  - Brand-aligned transitions using --duration-micro

- [x] **M9C.4**: App.tsx Integration
  - CommandPaletteWrapper component with context provider
  - CommandPalette rendered at app level
  - CommandPaletteTrigger added to header

### New Files Created (Phase 9C)

```
client/src/hooks/
└── use-command-palette.ts    # Command palette hook (~325 lines)

client/src/components/ui/
└── command-palette.tsx       # Command palette component (~450 lines)
```

### Modified Files (Phase 9C)

```
client/src/index.css          # Added command palette CSS styles
client/src/App.tsx            # Integrated CommandPalette with provider
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘K / Ctrl+K | Toggle command palette |
| / | Open command palette (when not in input) |
| Escape | Close command palette |
| ↑ / ↓ | Navigate items |
| Enter | Select item |

### Build Status

- TypeScript: Clean
- Build: Success (1.5MB client, 1.4MB server)

---

## Phase 9D Progress: Empty/Loading/Error States

### Completed Milestones

- [x] **M9D.1**: Branded Skeleton Loader
  - Updated `client/src/components/ui/skeleton.tsx`
  - Purple-tinted shimmer gradient animation
  - Variant shapes: default, card, text, avatar, button, badge
  - Preset skeletons: HCPCardSkeleton, MetricCardSkeleton, TableRowSkeleton, ListItemSkeleton, ChartSkeleton
  - Added `animate-shimmer` keyframe to Tailwind config

- [x] **M9D.2**: Empty State Component
  - Created `client/src/components/ui/empty-state.tsx`
  - Framer Motion entrance animation (scale + fade)
  - Icon mapping for common use cases
  - Variants: default, search, error, minimal
  - Size variants: sm, md, lg
  - Primary and secondary action buttons
  - Brand copy presets: signalIndex, cohortLab, scenarioLab, catalystQueue, etc.
  - Preset components: SignalIndexEmptyState, SearchEmptyState, CohortLabEmptyState, etc.

- [x] **M9D.3**: Convergence Loading Animation
  - Created `client/src/components/ui/convergence-animation.tsx`
  - Pure CSS animation (8 dots converging to center)
  - Center glow effect with Catalyst Gold
  - Size variants: sm, md, lg
  - Speed variants: slow, normal, fast
  - Additional components: InlineLoader, FullPageLoader, SectionLoader
  - Added `animate-convergence` and `animate-pulse-glow` to Tailwind config

- [x] **M9D.4**: Error State Component
  - Created `client/src/components/ui/error-state.tsx`
  - Error type detection: network, server, auth, notFound, generic
  - Custom icons per error type
  - Retry button with refresh icon
  - Brand voice (no apologetic language)
  - Additional components: InlineError, ErrorBoundaryFallback, OfflineIndicator, QueryError

- [x] **M9D.5**: Tailwind Configuration Updates
  - Added OmniVor brand color utilities
  - Added shimmer, convergence, pulse-glow keyframes
  - Added corresponding animation utilities

### New Files Created (Phase 9D)

```
client/src/components/ui/
├── skeleton.tsx              # Updated with brand shimmer (~200 lines)
├── convergence-animation.tsx # Loading animation component (~180 lines)
├── empty-state.tsx           # Empty state component (~320 lines)
└── error-state.tsx           # Error state component (~280 lines)
```

### Modified Files (Phase 9D)

```
tailwind.config.ts            # Brand colors, shimmer/convergence/pulse-glow animations
```

### Component Variants

| Component | Variants |
|-----------|----------|
| Skeleton | default, card, text, avatar, button, badge |
| EmptyState | default, search, error, minimal |
| ErrorState | network, server, auth, notFound, generic |
| ConvergenceAnimation | sm, md, lg sizes; slow, normal, fast speeds |

### Brand Copy Presets

| Module | Title | Description |
|--------|-------|-------------|
| Signal Index | "No signals yet." | "Connect your data sources and let OmniVor feed." |
| Search | "No signals match." | "Try adjusting your filters or search terms." |
| Cohort Lab | "No audiences captured." | "Build your first audience using natural language queries." |
| Scenario Lab | "No scenarios projected." | "Select an audience and define your engagement strategy." |
| Catalyst Queue | "Queue empty." | "All recommended actions have been processed." |

### Build Status

- TypeScript: Clean
- Build: Success (1.5MB client, 1.4MB server)

---

## Phase 9E Progress: Nerve Center Redesign

### Completed Milestones

- [x] **M9E.1**: Welcome Message Component
  - Created `client/src/components/dashboard/welcome-message.tsx`
  - Personalized greeting with time-based salutation
  - Animated signal count (gold highlight)
  - Animated pattern count (purple highlight)
  - Uses AnimatedNumber component from Phase 9A
  - CompactWelcome variant for mobile

- [x] **M9E.2**: Metric Card Component
  - Created `client/src/components/dashboard/metric-card.tsx`
  - Animated number counters with stagger delays
  - Trend indicators (up/down/flat with colors)
  - SparkLine integration for trends
  - Tooltip support for metric descriptions
  - Icon support (Lucide icons)
  - Click handlers for drill-down navigation
  - Variants: MetricCard, HighlightMetricCard, CompactMetricCard
  - MetricsGrid container with responsive columns

- [x] **M9E.3**: Pattern Highlights Component
  - Created `client/src/components/dashboard/pattern-highlights.tsx`
  - "Patterns Crystallized" section header
  - Severity-based left border accent:
    - Purple for insight
    - Gold for opportunity
    - Amber for warning
  - Relative timestamps (2h ago, 1d ago)
  - Related HCP count badges
  - Category icons (engagement, audience, channel, trend)
  - Stagger animation on mount
  - Click-to-navigate to related module
  - CompactPatternList variant

- [x] **M9E.4**: Quick Actions Component
  - Created `client/src/components/dashboard/quick-actions.tsx`
  - Default actions: New Audience, Run Scenario, Export Report, Diagnostic
  - Primary/outline button variants
  - Navigation handler integration
  - ExpandedQuickActions variant with descriptions

- [x] **M9E.5**: Dashboard Page Assembly
  - Redesigned `client/src/pages/dashboard.tsx`
  - 6-metric card grid layout
  - Three-column layout: charts (2) + patterns (1)
  - Loading skeleton with shimmer animation
  - Error state with retry option
  - Empty state for no data
  - Mock pattern data for demo

### New Files Created (Phase 9E)

```
client/src/components/dashboard/
├── index.ts                # Barrel exports
├── welcome-message.tsx     # Personalized welcome (~115 lines)
├── metric-card.tsx         # Metric cards with animations (~240 lines)
├── pattern-highlights.tsx  # Pattern insights section (~280 lines)
└── quick-actions.tsx       # Quick action buttons (~190 lines)
```

### Modified Files (Phase 9E)

```
client/src/pages/dashboard.tsx  # Complete redesign (~335 lines)
```

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HEADER: Nerve Center | Time Range | Refresh | Export                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ Welcome back, {User}. OmniVor has processed 12,847 signals...               │
│                                                                             │
│ QUICK ACTIONS: [+ New Audience] [Run Scenario] [Export] [Diagnostic]        │
│                                                                             │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ │ SIGNALS    │ │ AUDIENCES  │ │ SCENARIOS  │ │ PATTERNS   │ │ CHANNEL    │ │ ACTIONS    │
│ │ 12,847     │ │    23      │ │     8      │ │     4      │ │   72%      │ │   156      │
│ │ ↑ 14%      │ │ 3 need act │ │ 2 pending  │ │ 5 new today│ │ ↓ -3%      │ │ 24 high-pri│
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘
│                                                                             │
│ ┌─────────────────────────────────────────┐ ┌─────────────────────────────┐ │
│ │ CHARTS (existing DashboardMetrics)      │ │ PATTERNS CRYSTALLIZED       │ │
│ │ - Segment Distribution (pie)            │ │ ┌─────────────────────────┐ │ │
│ │ - Channel Effectiveness (bar)           │ │ │ ◆ Engagement spike...   │ │ │
│ │ - Tier Breakdown (bar)                  │ │ │ 142 HCPs • 2h ago       │ │ │
│ │ - Engagement Trend (line)               │ │ └─────────────────────────┘ │ │
│ │                                         │ │ ┌─────────────────────────┐ │ │
│ │                                         │ │ │ ⚠ Rep visit declining.. │ │ │
│ │                                         │ │ │ 89 HCPs • 5h ago        │ │ │
│ │                                         │ │ └─────────────────────────┘ │ │
│ └─────────────────────────────────────────┘ └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Build Status

- TypeScript: Clean
- Build: Success (1.5MB client, 1.4MB server)

---

## Phase 9F Progress: Notification System

### Completed Milestones

- [x] **M9F.1**: Brand-Aligned Toast System
  - Updated `client/src/components/ui/toast.tsx`
  - Variants: default, success, error, warning, info, loading, destructive
  - Variant icons: CheckCircle, AlertCircle, AlertTriangle, Info, Loader2
  - Progress bar with pause-on-hover
  - Brand border colors per variant
  - Slide-in/slide-out animations
  - Icon colors matching variant theme

- [x] **M9F.2**: Toast Hook Enhancement
  - Updated `client/src/hooks/use-toast.ts`
  - Default durations by variant (success: 4s, error: 6s, loading: Infinity)
  - Helper functions:
    - `toast.success(title, description)` - Green success toast
    - `toast.error(title, description)` - Red error toast
    - `toast.warning(title, description)` - Amber warning toast
    - `toast.info(title, description)` - Purple info toast
    - `toast.loading(title, description)` - Loading spinner, no auto-dismiss
    - `toast.promise(promise, { loading, success, error })` - Promise-based toast
  - Progress bar support (showProgress: true/false)

- [x] **M9F.3**: Toaster Component Update
  - Updated `client/src/components/ui/toaster.tsx`
  - Passes variant, showProgress, duration to Toast component
  - Maintains existing structure with new props

- [x] **M9F.4**: Toast CSS Animations
  - Updated `tailwind.config.ts`
  - Added `toast-slide-in` keyframe (translateX 100% → 0)
  - Added `toast-slide-out` keyframe (translateX 0 → 100%)
  - Added animation utilities for both animations

- [x] **M9F.5**: Notification Center Component
  - Created `client/src/components/ui/notification-center.tsx`
  - Popover-based notification drawer
  - NotificationItem with type-based styling:
    - Success: emerald border/icon
    - Error: red border/icon
    - Warning: amber border/icon
    - Info: purple border/icon
  - Relative timestamps (Just now, 5m ago, 2h ago, Yesterday)
  - Unread indicator dots
  - Mark as read / Mark all read
  - Dismiss individual notifications
  - Clear all notifications
  - Settings button slot
  - NotificationBadge component for unread count
  - AnimatePresence for enter/exit animations

### New Files Created (Phase 9F)

```
client/src/components/ui/
└── notification-center.tsx   # In-app notification center (~340 lines)
```

### Modified Files (Phase 9F)

```
client/src/components/ui/toast.tsx      # Brand variants, icons, progress bar (~310 lines)
client/src/components/ui/toaster.tsx    # Variant props passthrough (~47 lines)
client/src/hooks/use-toast.ts           # Helper functions (~347 lines)
tailwind.config.ts                      # Toast slide animations
```

### Toast Variants

| Variant | Icon | Border Color | Duration |
|---------|------|--------------|----------|
| default | - | border-gray | 5000ms |
| success | CheckCircle | emerald-500/30 | 4000ms |
| error | AlertCircle | red-500/30 | 6000ms |
| warning | AlertTriangle | amber-500/30 | 5000ms |
| info | Info | consumption-purple/30 | 5000ms |
| loading | Loader2 (spin) | border-gray | Infinity |
| destructive | AlertCircle | red-500/30 | 6000ms |

### Usage Examples

```typescript
// Simple toasts
toast.success('Profile saved', 'Your changes have been applied.');
toast.error('Upload failed', 'Please try again.');
toast.warning('Storage low', 'Consider cleaning up old files.');
toast.info('New features', 'Check out the latest updates.');

// Loading toast (manual dismiss)
const { dismiss } = toast.loading('Processing...');
// Later: dismiss();

// Promise-based toast
await toast.promise(fetchData(), {
  loading: 'Fetching data...',
  success: 'Data loaded successfully',
  error: 'Failed to fetch data',
});
```

### Build Status

- TypeScript: Clean
- Build: Success (1.5MB client, 1.4MB server)

---

## Phase 9G Progress: Keyboard Navigation

### Completed Milestones

- [x] **M9G.1**: Keyboard Shortcuts Modal
  - Created `client/src/components/ui/shortcuts-modal.tsx`
  - Brand-aligned modal design (glass effect, purple accents)
  - Grouped shortcuts: Navigation, List Navigation, Item Actions
  - KeyBadge component for styled keyboard keys
  - Escape to close, AnimatePresence for animations
  - Footer hint for `?` shortcut

- [x] **M9G.2**: Global Keyboard Handler
  - Created `client/src/hooks/use-keyboard-shortcuts.ts`
  - `?` key opens shortcuts help modal globally
  - Ignores keypresses when in input fields
  - Context provider for keyboard state
  - Utility functions: `isInputFocused()`, `isModalOpen()`
  - `usePrefersReducedMotion()` hook for accessibility

- [x] **M9G.3**: Focus Indicator Components
  - Created `client/src/components/ui/focus-indicator.tsx`
  - `FocusIndicator` wrapper component with focus ring
  - Variants: default (white), purple, gold
  - Glow effect on focus
  - `FocusOutline` absolute-positioned outline
  - `KeyboardNavItem` list item wrapper with auto-scroll
  - `KeyboardNavHint` visual hint component

- [x] **M9G.4**: Keyboard Navigation Hook (Phase 9C extended)
  - Extended `client/src/hooks/use-command-palette.ts`
  - `useKeyboardNavigation` hook with:
    - J/K and arrow key navigation
    - Enter to select
    - E for edit, V for view, D for delete actions
    - Home/End for first/last item
    - Wrap-around option
    - Input field detection

- [x] **M9G.5**: Signal Index Integration
  - Updated `client/src/pages/hcp-explorer.tsx`
  - Keyboard navigation for HCP card grid
  - Focus state passed to `HCPProfileCard`
  - Navigation disabled when detail panel or dialog open
  - `KeyboardNavHint` shown at bottom of list

- [x] **M9G.6**: HCP Card Focus Styling
  - Updated `client/src/components/hcp-profile-card.tsx`
  - `isKeyboardFocused` prop for focus state
  - Purple ring and glow on keyboard focus
  - Auto-scroll into view when focused
  - Works for both compact and full card views

- [x] **M9G.7**: App Integration
  - Updated `client/src/App.tsx`
  - `KeyboardShortcutsProvider` wrapping app
  - `ShortcutsModal` rendered at app level
  - Global `?` shortcut accessible everywhere

### New Files Created (Phase 9G)

```
client/src/components/ui/
├── shortcuts-modal.tsx        # Keyboard shortcuts help modal (~210 lines)
└── focus-indicator.tsx        # Focus indicator components (~180 lines)

client/src/hooks/
└── use-keyboard-shortcuts.ts  # Global keyboard context (~120 lines)
```

### Modified Files (Phase 9G)

```
client/src/App.tsx                          # KeyboardShortcutsProvider, ShortcutsModal
client/src/pages/hcp-explorer.tsx           # Keyboard navigation for HCP grid
client/src/components/hcp-profile-card.tsx  # isKeyboardFocused prop, focus styling
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `⌘ K` / `Ctrl K` | Open command palette |
| `/` | Open command palette |
| `?` | Show keyboard shortcuts help |
| `J` / `↓` | Move down in list |
| `K` / `↑` | Move up in list |
| `Enter` | Select/view item |
| `E` | Edit selected item |
| `V` | View selected item |
| `D` | Delete selected item |
| `Home` | Go to first item |
| `End` | Go to last item |
| `Esc` | Close modal or palette |

### Build Status

- TypeScript: Clean
- Build: Success (1.5MB client, 1.4MB server)

---

## Phase 9H Progress: Onboarding & Contextual Help

### Completed Milestones

- [x] **M9H.1**: Feature Tooltip Component
  - Created `client/src/components/onboarding/feature-tooltip.tsx`
  - Contextual tooltips for explaining new nomenclature
  - Dismissal tracking in localStorage (per tooltip ID)
  - Brand-aligned styling with sparkle icon
  - `formerName` prop for showing old names
  - `FeatureHighlight` component with pulse animation
  - `NOMENCLATURE_TOOLTIPS` predefined content:
    - Signal Index (formerly HCP Explorer)
    - Cohort Lab (formerly Audience Builder)
    - Scenario Lab (formerly Simulations)
    - Nerve Center (formerly Dashboard)
    - Allocation Lab (formerly Portfolio Optimizer)
  - Utility functions: `resetAllTooltips()`, `resetTooltip()`

- [x] **M9H.2**: First-Run Welcome Guide
  - Created `client/src/components/onboarding/first-run-guide.tsx`
  - Multi-step onboarding modal for new users
  - 6 steps: Welcome, Signal Index, Cohort Lab, Scenario Lab, Nerve Center, Power User Tips
  - Step indicator with animated progress dots
  - Skip/Next/Back navigation
  - Stores completion state in localStorage
  - AnimatePresence for smooth transitions
  - `useFirstRunGuide()` hook for programmatic control
  - `resetFirstRun()` utility for testing

- [x] **M9H.3**: Sidebar Integration
  - Updated `client/src/components/app-sidebar.tsx`
  - Feature tooltips on primary navigation items:
    - Signal Index
    - Cohort Lab
    - Scenario Lab
    - Nerve Center
  - Feature tooltip on Allocation Lab (System section)
  - Tooltips appear on hover, dismissible with "Got it"

- [x] **M9H.4**: App Integration
  - Updated `client/src/App.tsx`
  - `FirstRunGuide` component rendered in AppLayout
  - Shows on first app load (with 800ms delay)
  - Never shows again after completion/skip

- [x] **M9H.5**: Index Exports
  - Created `client/src/components/onboarding/index.ts`
  - Barrel exports for all onboarding components

### New Files Created (Phase 9H)

```
client/src/components/onboarding/
├── feature-tooltip.tsx   # Contextual tooltips (~230 lines)
├── first-run-guide.tsx   # Welcome guide modal (~340 lines)
└── index.ts              # Barrel exports
```

### Modified Files (Phase 9H)

```
client/src/App.tsx                  # FirstRunGuide integration
client/src/components/app-sidebar.tsx  # FeatureTooltip on nav items
```

### Onboarding Flow

1. **First Visit**: Welcome guide modal appears automatically
2. **Guide Steps**:
   - Welcome to OmniVor
   - Signal Index (HCP exploration)
   - Cohort Lab (audience building)
   - Scenario Lab (simulations)
   - Nerve Center (dashboard)
   - Keyboard shortcuts tips
3. **Navigation Tooltips**: Hover over renamed nav items for context
4. **Dismiss & Remember**: All tooltips track dismissal state

### Build Status

- TypeScript: Clean
- Build: Success (1.5MB client, 1.4MB server)

---

## Phase 9 Complete Summary

Phase 9 (Interaction & Experience Design) has been fully implemented with all 8 sub-phases complete:

| Sub-Phase | Description | Key Deliverables |
|-----------|-------------|------------------|
| 9A | Data Visualization System | Chart theme, animated numbers, branded charts, sparklines |
| 9B | Page Transitions | Motion config, PageTransition, DataFlowElement, stagger animations |
| 9C | Command Palette | cmdk integration, global search, recent items |
| 9D | Empty/Loading/Error States | Brand shimmer, convergence animation, empty states |
| 9E | Nerve Center Redesign | Welcome message, metric cards, pattern highlights, quick actions |
| 9F | Notification System | Toast variants, progress bar, notification center |
| 9G | Keyboard Navigation | Shortcuts modal, J/K navigation, focus indicators |
| 9H | Onboarding & Contextual Help | Feature tooltips, first-run guide, nomenclature explanations |

**Total New Files Created in Phase 9:** 25+
**Total Lines of Code:** ~5,000+

The platform now delivers a premium, experientially differentiated user experience that embodies the OmniVor brand metaphor: "consumption → transformation → intelligence".

---

## Phase 7F Progress: Portfolio Optimizer (Capstone)

### Completed Milestones

- [x] **M7F.1**: Phase 7F optimization schema already in place
  - `optimizationProblems` table for defining optimization problems
  - `optimizationResults` table for solver outputs
  - `optimizationAllocations` table for individual HCP/channel allocations
  - `executionPlans` table for converting results into actionable plans
  - Solver types: greedy, local_search, simulated_annealing
  - Objective metrics: engagement_rate, response_rate, rx_lift, efficiency_score
  - Plan statuses: draft, scheduled, executing, paused, completed, cancelled
  - Rebalance triggers: manual, schedule, outcome_deviation, budget_change, constraint_violation
- [x] **M7F.2**: Portfolio Optimizer Service already existed (`server/services/portfolio-optimizer.ts`)
  - Constraint-aware allocation optimization
  - Multiple solver algorithms (greedy, local search, simulated annealing)
  - UCB-style exploration value calculation
  - Budget and capacity constraint enforcement
  - HCP contact limit compliance
  - Compliance window (blackout) checking
  - Integration with prediction engine for stimulus impact
- [x] **M7F.3**: Created Execution Planner Service (`server/services/execution-planner.ts`)
  - Convert optimization results into executable plans (~850 lines)
  - Plan lifecycle management: create → schedule → execute → complete/cancel
  - Resource booking with conflict detection
  - Progress tracking with completion percentage
  - Budget utilization monitoring
  - Performance tracking: predicted vs actual lift
  - Rebalance suggestions based on outcome deviation
  - Rebalance execution with action modifications
- [x] **M7F.4**: Created Optimization API endpoints (30+ endpoints)
  - `/api/optimization/problems` - CRUD for optimization problems
  - `/api/optimization/problems/:id/solve` - Run solver on problem
  - `/api/optimization/results` - List optimization results
  - `/api/optimization/results/:id` - Get result details
  - `/api/optimization/results/:id/allocations` - Get allocations for result
  - `/api/execution-plans` - CRUD for execution plans
  - `/api/execution-plans/:id/book` - Book resources for plan
  - `/api/execution-plans/:id/execute` - Start plan execution
  - `/api/execution-plans/:id/pause` - Pause executing plan
  - `/api/execution-plans/:id/resume` - Resume paused plan
  - `/api/execution-plans/:id/complete` - Mark plan complete
  - `/api/execution-plans/:id/cancel` - Cancel plan
  - `/api/execution-plans/:id/check-rebalance` - Check if rebalance needed
  - `/api/execution-plans/:id/rebalance` - Execute rebalance
- [x] **M7F.5**: Created Allocation Lab UI (`client/src/pages/allocation-lab.tsx`)
  - Three-tab interface: Optimization Problems, Results & Allocations, Execution Plans
  - Create optimization problem dialog with objective, budget, horizon, solver selection
  - Results display with channel breakdown pie chart
  - Allocations table with HCP, channel, predicted lift, budget, status
  - Constraint violation warnings
  - Execution plan management with status badges
  - Book/Execute/Pause/Resume action buttons
  - Progress tracking with completion percentage
  - Budget utilization display
- [x] **M7F.6**: Created Optimization Agent (`server/services/agents/optimization-agent.ts`)
  - Autonomous monitoring of execution plan performance
  - Underperformance detection (< 80% of predicted outcomes)
  - Critical underperformance alerts (< 60% of predicted)
  - Automatic rebalance suggestions when variance > 20%
  - Portfolio health metrics aggregation
  - Failure rate monitoring with alerts
  - Integration with agent registry and scheduler

### New Files Created (Phase 7F)

```
server/services/
├── execution-planner.ts        # Execution Planner Service (~850 lines)
└── agents/
    └── optimization-agent.ts   # Optimization Agent (~380 lines)

client/src/pages/
└── allocation-lab.tsx          # Allocation Lab UI (~700 lines)
```

### Schema Tables (Phase 7F)

```
shared/schema.ts (already existed):
├── optimizationProblems table
├── optimizationResults table
├── optimizationAllocations table
├── executionPlans table
└── Related enums and types
```

### API Endpoints Added (Phase 7F)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/optimization/problems` | List optimization problems |
| GET | `/api/optimization/problems/:id` | Get single problem |
| POST | `/api/optimization/problems` | Create optimization problem |
| PATCH | `/api/optimization/problems/:id` | Update problem |
| DELETE | `/api/optimization/problems/:id` | Delete problem |
| POST | `/api/optimization/problems/:id/solve` | Run solver |
| GET | `/api/optimization/results` | List results |
| GET | `/api/optimization/results/:id` | Get result details |
| GET | `/api/optimization/results/:id/allocations` | Get allocations |
| POST | `/api/execution-plans` | Create execution plan |
| GET | `/api/execution-plans` | List execution plans |
| GET | `/api/execution-plans/:id` | Get single plan |
| PATCH | `/api/execution-plans/:id` | Update plan |
| DELETE | `/api/execution-plans/:id` | Delete draft plan |
| POST | `/api/execution-plans/:id/book` | Book resources |
| POST | `/api/execution-plans/:id/execute` | Start execution |
| POST | `/api/execution-plans/:id/pause` | Pause plan |
| POST | `/api/execution-plans/:id/resume` | Resume plan |
| POST | `/api/execution-plans/:id/complete` | Complete plan |
| POST | `/api/execution-plans/:id/cancel` | Cancel plan |
| GET | `/api/execution-plans/:id/check-rebalance` | Check rebalance need |
| POST | `/api/execution-plans/:id/rebalance` | Execute rebalance |

### Solver Algorithms

| Solver | Description |
|--------|-------------|
| `greedy` | Fast O(n) allocation by predicted impact ranking |
| `local_search` | Iterative improvement with neighbor swaps |
| `simulated_annealing` | Probabilistic optimization with temperature schedule |

### Key Features

- **Constraint-Aware Optimization**: Respects budget, capacity, contact limits, and compliance windows
- **Exploration vs Exploitation**: UCB-style exploration value for uncertain HCPs
- **Execution Plans**: Convert optimization results into tracked, executable plans
- **Resource Booking**: Reserve capacity and budget before execution
- **Performance Monitoring**: Track predicted vs actual lift variance
- **Automatic Rebalancing**: Detect underperformance and suggest plan modifications
- **Agent Integration**: Optimization Agent monitors plans and proposes actions

---

## Phase 7E Progress: Simulation Composability

### Completed Milestones

- [x] **M7E.1**: Added Phase 7E simulation composability schema
  - `simulationBatches` table for batch simulation management
  - `simulationVariants` table for individual variant tracking
  - Batch statuses: pending, running, completed, failed, cancelled
  - Variant statuses: pending, running, completed, failed, skipped
  - Variant strategies: grid_search, random_search, bayesian, manual
  - Optimization metrics: engagement_rate, response_rate, rx_lift, efficiency_score
  - API types: SimulationBatchApi, SimulationVariantApi, BatchProgress, BatchResultSummary
  - Request schemas: createBatchRequestSchema, runBatchRequestSchema, generateVariantsRequestSchema, etc.
  - Response schemas: batchProgressSchema, batchResultSummarySchema, variantSpecSchema, differentialResultSchema
- [x] **M7E.2**: Created Composable Simulation Service (`server/services/composable-simulation.ts`)
  - Batch creation with variant generation (grid search, random search, Bayesian)
  - Batch execution with configurable concurrency control
  - Progress tracking with estimated completion time
  - Variant scoring and ranking based on optimization metrics
  - Incremental simulation: extend or subtract HCPs from existing results
  - Differential simulation: compare two scenarios and compute deltas
  - Channel-level performance comparison
  - Grid search using Cartesian product of parameter ranges
  - Random search with configurable max variants
  - Helper functions for parameter application to scenarios
- [x] **M7E.3**: Created Batch Simulation API endpoints (12 endpoints)
  - `/api/simulations/batch` POST - Create simulation batch
  - `/api/simulations/batches` GET - List all batches
  - `/api/simulations/batch/:id` GET - Get batch details
  - `/api/simulations/batch/:id/progress` GET - Get batch progress
  - `/api/simulations/batch/:id/run` POST - Run batch simulation
  - `/api/simulations/batch/:id/results` GET - Get batch results summary
  - `/api/simulations/batch/:id/best` GET - Get best variant
  - `/api/simulations/batch/:id/variants` GET - Get batch variants with pagination
  - `/api/simulations/batch/:id` DELETE - Delete batch
  - `/api/simulations/generate-variants` POST - Generate variant specs
  - `/api/simulations/incremental` POST - Incremental simulation (extend/subtract)
  - `/api/simulations/compare` POST - Differential simulation

### New Files Created (Phase 7E)

```
server/services/
└── composable-simulation.ts      # Composable Simulation Service (~1050 lines)
```

### Schema Changes (Phase 7E)

```
shared/schema.ts additions:
├── simulationBatches table (new)
├── simulationVariants table (new)
├── Batch statuses, variant statuses, strategies, optimization metrics
└── 15+ API/request/response schemas
```

### API Endpoints Added (Phase 7E)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/simulations/batch` | Create new simulation batch |
| GET | `/api/simulations/batches` | List all batches |
| GET | `/api/simulations/batch/:id` | Get batch details |
| GET | `/api/simulations/batch/:id/progress` | Get batch execution progress |
| POST | `/api/simulations/batch/:id/run` | Run batch simulation |
| GET | `/api/simulations/batch/:id/results` | Get batch results summary |
| GET | `/api/simulations/batch/:id/best` | Get best performing variant |
| GET | `/api/simulations/batch/:id/variants` | Get variants with pagination |
| DELETE | `/api/simulations/batch/:id` | Delete batch and variants |
| POST | `/api/simulations/generate-variants` | Generate variant specs without creating batch |
| POST | `/api/simulations/incremental` | Extend or subtract HCPs from simulation |
| POST | `/api/simulations/compare` | Compare two scenarios (differential simulation) |

### Variant Generation Strategies

| Strategy | Description |
|----------|-------------|
| `grid_search` | Cartesian product of all parameter values (exhaustive) |
| `random_search` | Random sampling from parameter ranges |
| `bayesian` | Bayesian optimization (guided search, not yet implemented) |
| `manual` | User-specified variants |

### Optimization Metrics

| Metric | Description |
|--------|-------------|
| `engagement_rate` | Predicted engagement rate (default) |
| `response_rate` | Predicted response rate |
| `rx_lift` | Predicted Rx volume lift |
| `efficiency_score` | Budget efficiency score |

### Key Features

- **Batch Simulation**: Run 1000+ variants to find optimal parameters
- **Incremental Simulation**: Extend/subtract HCPs without full recompute
- **Differential Simulation**: Compute delta between scenarios efficiently
- **Concurrency Control**: Configurable parallel variant execution
- **Progress Tracking**: Real-time batch progress with ETA
- **Variant Ranking**: Automatic scoring and ranking by metric

---

## Phase 7D Progress: Campaign Coordination

### Completed Milestones

- [x] **M7D.1**: Added Phase 7D campaign coordination schema
  - Extended `campaigns` table with Phase 7D fields (brand, businessUnit, priority, targetAudienceId, createdBy)
  - Added `hcpReservations` table for HCP channel reservations with priority-based preemption
  - Added `conflictLog` table for tracking and resolving campaign conflicts
  - Reservation types: exclusive, priority, soft
  - Reservation statuses: active, released, executed, expired, preempted
  - Conflict types: overlap, frequency, preemption, budget, capacity
  - Conflict resolutions: campaign1_wins, campaign2_wins, merged, deferred, cancelled
  - API types: CampaignApi, ReservationApi, ConflictApi, TimeSlot
  - Request schemas: createCampaignRequestSchema, reserveHcpRequestSchema, batchReserveRequestSchema, etc.
  - Response schemas: CampaignSummary, ReservationResult, BatchReservationResult, AvailabilityResult, etc.
- [x] **M7D.2**: Created Campaign Coordinator Service (`server/services/campaign-coordinator.ts`)
  - Campaign lifecycle management (create, activate, pause, complete, delete)
  - HCP reservation management with conflict detection
  - Batch reservation support for campaign rollouts
  - Time slot availability checking
  - Conflict detection for reservations, campaigns, and HCPs
  - Manual conflict resolution with audit trail
  - Auto-resolution strategies: priority, first_come, budget_efficiency
  - Priority-based preemption support
  - Campaign and HCP view aggregations
  - Stale reservation expiration
- [x] **M7D.3**: Created Campaign Coordination API endpoints (20+ endpoints)
  - Campaign CRUD: GET/POST/PATCH/DELETE `/api/campaigns`, `/api/campaigns/:id`
  - Campaign lifecycle: `/api/campaigns/:id/activate`, `/pause`, `/complete`
  - Campaign summary: `/api/campaigns/summary`
  - Reservation CRUD: POST `/api/reservations`, `/api/reservations/batch`
  - Availability: POST `/api/reservations/check-availability`
  - Reservation actions: `/api/reservations/:id/release`, `/execute`
  - HCP views: `/api/hcps/:hcpId/reservations`, `/api/hcps/:hcpId/campaigns`
  - Conflict management: GET `/api/conflicts`, POST `/api/conflicts/:id/resolve`, `/api/conflicts/auto-resolve`
  - Admin: `/api/reservations/expire-stale`

### New Files Created (Phase 7D)

```
server/services/
└── campaign-coordinator.ts      # Campaign Coordinator Service (~1300 lines)
```

### Schema Changes (Phase 7D)

```
shared/schema.ts additions:
├── campaigns table extended with: brand, businessUnit, priority, targetAudienceId, createdBy
├── hcpReservations table (new)
├── conflictLog table (new)
├── Reservation types, statuses, conflict types, resolutions
└── 15+ API/request/response schemas
```

### API Endpoints Added (Phase 7D)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/campaigns/summary` | Get campaign summary statistics |
| GET | `/api/campaigns` | List campaigns with filters |
| GET | `/api/campaigns/:id` | Get single campaign |
| POST | `/api/campaigns` | Create campaign |
| PATCH | `/api/campaigns/:id` | Update campaign |
| POST | `/api/campaigns/:id/activate` | Activate campaign |
| POST | `/api/campaigns/:id/pause` | Pause campaign |
| POST | `/api/campaigns/:id/complete` | Complete campaign |
| DELETE | `/api/campaigns/:id` | Delete draft campaign |
| GET | `/api/campaigns/:id/reservations` | Get campaign reservations |
| GET | `/api/campaigns/:id/conflicts` | Detect campaign conflicts |
| POST | `/api/reservations` | Reserve HCP for campaign |
| POST | `/api/reservations/batch` | Batch reserve HCPs |
| POST | `/api/reservations/check-availability` | Check HCP availability |
| POST | `/api/reservations/:id/release` | Release reservation |
| POST | `/api/reservations/:id/execute` | Mark reservation executed |
| GET | `/api/hcps/:hcpId/reservations` | Get HCP reservations |
| GET | `/api/hcps/:hcpId/campaigns` | Get HCP campaign view |
| GET | `/api/conflicts` | List unresolved conflicts |
| GET | `/api/hcps/:hcpId/conflicts` | Detect HCP conflicts |
| POST | `/api/conflicts/:id/resolve` | Resolve conflict manually |
| POST | `/api/conflicts/auto-resolve` | Auto-resolve conflicts |
| POST | `/api/reservations/expire-stale` | Expire stale reservations |

### Conflict Resolution Strategies

| Strategy | Description |
|----------|-------------|
| `priority` | Higher priority campaign wins |
| `first_come` | Earlier created campaign wins |
| `budget_efficiency` | Better budget utilization wins |

### Reservation Types

| Type | Description |
|------|-------------|
| `exclusive` | No other campaigns can target this HCP/channel during reservation |
| `priority` | Higher priority campaigns can preempt |
| `soft` | Advisory only, no enforcement |

---

## Phase 7C Progress: Uncertainty Quantification

### Completed Milestones

- [x] **M7C.1**: Added Phase 7C uncertainty schema tables
  - `uncertaintyMetrics` table for full uncertainty decomposition per HCP/channel
  - `explorationHistory` table for tracking exploration outcomes and information gain
  - `explorationConfig` table for exploration strategy settings
  - API types: UncertaintyMetricsApi, DataQualityReport, DriftReport, ExplorationDecision, ExplorationAction
  - Request schemas: calculateUncertaintyRequestSchema, batchUncertaintyRequestSchema, explorationDecisionRequestSchema
  - Response schemas: uncertaintySummarySchema, explorationStatisticsSchema
- [x] **M7C.2**: Created Uncertainty Calculator Service (`server/services/uncertainty-calculator.ts`)
  - Epistemic uncertainty calculation (1/√(n+1) formula for model uncertainty)
  - Aleatoric uncertainty calculation (based on prediction error variance)
  - Data quality assessment (profile completeness, engagement history, channel coverage)
  - Feature drift detection (compares current values to historical baselines)
  - UCB-style exploration value calculation
  - Batch uncertainty calculation support
  - Summary statistics and exploration statistics methods
- [x] **M7C.3**: Created Exploration Strategy Service (`server/services/exploration-strategy.ts`)
  - Three exploration modes: epsilon_greedy, ucb, thompson_sampling
  - `shouldExplore()` decision function with adaptive strategies
  - `suggestExplorationAction()` finds channels with highest exploration value
  - `calculateExplorationBudget()` allocates budget between exploration/exploitation
  - `recordExplorationOutcome()` tracks outcomes and information gain
  - `adaptExplorationRate()` decays epsilon over time
  - Exploration config management (get, upsert)
  - Thompson Sampling with Beta distribution via Gamma trick
- [x] **M7C.4**: Created Uncertainty & Exploration API endpoints (12 endpoints)
  - `/api/uncertainty/:hcpId` - Calculate uncertainty for single HCP
  - `/api/uncertainty/batch` - Batch uncertainty calculation
  - `/api/uncertainty/summary` - Get uncertainty summary statistics
  - `/api/uncertainty/:hcpId/data-quality` - Get data quality report
  - `/api/uncertainty/:hcpId/drift` - Get feature drift report
  - `/api/exploration/decision` - Get exploration decision
  - `/api/exploration/suggest/:hcpId` - Suggest exploration action for HCP
  - `/api/exploration/statistics` - Get exploration statistics
  - `/api/exploration/config` - Get/update exploration config
  - `/api/exploration/adapt-rate` - Adapt exploration rate
  - `/api/exploration/budget` - Calculate exploration budget

### New Files Created (Phase 7C)

```
shared/schema.ts                    # Added uncertaintyMetrics, explorationHistory, explorationConfig tables
server/services/
├── uncertainty-calculator.ts       # Uncertainty Calculator Service
└── exploration-strategy.ts         # Exploration Strategy Service
```

### API Endpoints Added (Phase 7C)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/uncertainty/:hcpId` | Calculate uncertainty for HCP |
| POST | `/api/uncertainty/batch` | Batch uncertainty calculation |
| GET | `/api/uncertainty/summary` | Get uncertainty summary statistics |
| GET | `/api/uncertainty/:hcpId/data-quality` | Get data quality report for HCP |
| GET | `/api/uncertainty/:hcpId/drift` | Get feature drift report for HCP |
| POST | `/api/exploration/decision` | Get exploration decision |
| GET | `/api/exploration/suggest/:hcpId` | Suggest exploration action |
| GET | `/api/exploration/statistics` | Get exploration statistics |
| GET | `/api/exploration/config` | Get exploration config |
| POST | `/api/exploration/config` | Update exploration config |
| POST | `/api/exploration/adapt-rate` | Adapt exploration rate |
| POST | `/api/exploration/budget` | Calculate exploration budget |

### Exploration Strategies Supported

| Strategy | Description |
|----------|-------------|
| `epsilon_greedy` | Explore with probability ε, exploit with 1-ε |
| `ucb` | Upper Confidence Bound - balances uncertainty with exploration bonus |
| `thompson_sampling` | Bayesian approach with Beta distribution sampling |

### Uncertainty Types

| Type | Description |
|------|-------------|
| Epistemic | Model uncertainty - reducible with more data (1/√(n+1)) |
| Aleatoric | Irreducible noise in the data (based on prediction error variance) |
| Total | Combined uncertainty used for decision making |

---

## Phase 7B Progress: Outcome Stream & Attribution

### Completed Milestones

- [x] **M7B.1**: Added Phase 7B attribution schema tables
  - `attributionConfig` table for per-channel attribution settings
  - `predictionStaleness` table for tracking prediction freshness
  - `outcomeAttributions` table for detailed attribution records
  - API types and Zod schemas for attribution results
- [x] **M7B.2**: Created Attribution Engine Service (`server/services/attribution-engine.ts`)
  - Multi-touch attribution models (first_touch, last_touch, linear, position_based, time_decay)
  - Decay functions (none, linear, exponential)
  - Automatic outcome attribution to prior stimuli events
  - Prediction staleness calculation and tracking
  - Attribution config management
  - Outcome velocity metrics
- [x] **M7B.3**: Created Outcome Ingestion API endpoints (15+ endpoints)
  - `/api/outcomes` - Record single outcome with attribution
  - `/api/outcomes/batch` - Batch outcome ingestion
  - `/api/outcomes/webhook` - Webhook endpoint for external systems
  - `/api/outcomes/velocity` - Outcome velocity metrics
  - `/api/attribution-config/*` - Attribution config CRUD
  - `/api/staleness/*` - Prediction staleness endpoints
  - `/api/attributions/*` - Attribution record queries
- [x] **M7B.4**: Integrated Feedback Loop with prediction engine
  - `updateStimulusWithOutcome` to close prediction-outcome loop
  - `registerPrediction` for staleness tracking
  - `getAttributionStatistics` for model calibration
  - `refreshAllStalenessScores` for batch staleness updates
  - Automatic staleness updating after outcome recording

### New Files Created (Phase 7B)

```
shared/schema.ts              # Added attributionConfig, predictionStaleness, outcomeAttributions tables
server/services/
└── attribution-engine.ts     # Attribution Engine Service
```

### API Endpoints Added (Phase 7B)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/outcomes` | Record outcome with automatic attribution |
| POST | `/api/outcomes/batch` | Batch outcome ingestion |
| POST | `/api/outcomes/webhook` | Webhook for external systems |
| GET | `/api/outcomes/velocity` | Get outcome velocity metrics |
| GET | `/api/outcomes/hcp/:hcpId` | Get outcomes for an HCP |
| GET | `/api/attribution-config` | List all attribution configs |
| GET | `/api/attribution-config/:channel` | Get config for channel |
| POST | `/api/attribution-config` | Create/update attribution config |
| GET | `/api/staleness/report` | Get staleness report |
| GET | `/api/staleness/hcp/:hcpId` | Get staleness for HCP |
| POST | `/api/staleness/calculate` | Calculate staleness score |
| POST | `/api/staleness/mark-refresh` | Mark for refresh |
| GET | `/api/staleness/needs-refresh` | List HCPs needing refresh |
| GET | `/api/attributions/outcome/:outcomeId` | Get attributions for outcome |
| GET | `/api/attributions/stimulus/:stimulusId` | Get attributions for stimulus |

### Attribution Models Supported

| Model | Description |
|-------|-------------|
| `first_touch` | All credit to first action in window |
| `last_touch` | All credit to most recent action |
| `linear` | Equal credit distributed across all actions |
| `position_based` | Configurable weights for first/last/middle touches |
| `time_decay` | More recent actions get higher weight via decay function |

### Decay Functions Available

| Function | Description |
|----------|-------------|
| `none` | No decay applied |
| `linear` | Linear decay from 1.0 to 0.0 over half-life |
| `exponential` | Exponential decay with configurable half-life |

---

## Phase 7A Progress: Constraint Surfaces

### Completed Milestones

- [x] **M7A.1**: Added Phase 7A constraint schema tables
  - `complianceWindows` table for blackout/restriction periods
  - `budgetAllocations` table for campaign/channel budget tracking
  - API types and Zod schemas for constraint checking
- [x] **M7A.2**: Created constraint-manager service (`server/services/constraint-manager.ts`)
  - Channel capacity management (get, consume, release, reset)
  - HCP contact limits checking and recording
  - Compliance window validation (blackout checking)
  - Budget allocation management (commit, release, spend)
  - Territory assignment validation
  - Aggregate constraint checking for proposed actions
  - Constraint summary for dashboard
- [x] **M7A.3**: Created constraint API endpoints (30+ endpoints)
  - `/api/constraints/summary` - Dashboard view
  - `/api/constraints/check` - Check constraints for action
  - `/api/constraints/capacity/*` - Channel capacity CRUD
  - `/api/constraints/contact-limits/*` - HCP contact limits
  - `/api/constraints/compliance-windows/*` - Compliance window CRUD
  - `/api/constraints/budget/*` - Budget allocation CRUD
  - `/api/constraints/territories/*` - Territory assignment CRUD
- [x] **M7A.4**: Created Constraint Diagnostic UI (`client/src/pages/constraints.tsx`)
  - Overview tab with summary cards (capacity, budget, compliance, contacts)
  - Channel Capacity tab with utilization progress bars
  - Budget tab with allocation management
  - Compliance Windows tab with CRUD dialogs
  - Contact Limits tab with HCP limit statistics
- [x] **M7A.5**: Integrated constraints with NBA engine
  - Added `validateNBAConstraints` function
  - Added `validateNBAsWithConstraints` for batch validation
  - Added `generateConstraintAwareNBA` for constraint-respecting recommendations
  - Added `ConstrainedNBA` type with constraint check results
  - Added `getConstraintAwareNBASummary` for reporting

### New Files Created (Phase 7A)

```
shared/schema.ts         # Added complianceWindows, budgetAllocations tables + types
server/services/
└── constraint-manager.ts  # Constraint Manager Service
client/src/pages/
└── constraints.tsx      # Constraint Diagnostic UI
```

### API Endpoints Added (Phase 7A)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/constraints/summary` | Get constraint summary for dashboard |
| POST | `/api/constraints/check` | Check constraints for proposed action |
| GET | `/api/constraints/capacity` | List all channel capacity records |
| GET | `/api/constraints/capacity/:channel` | Get capacity for specific channel |
| POST | `/api/constraints/capacity` | Create/update channel capacity |
| POST | `/api/constraints/capacity/:channel/reset` | Reset capacity counters |
| GET | `/api/constraints/contact-limits` | List HCP contact limits |
| GET | `/api/constraints/contact-limits/:hcpId/check` | Check HCP contact eligibility |
| POST | `/api/constraints/contact-limits/:hcpId/record` | Record contact with HCP |
| PATCH | `/api/constraints/contact-limits/:hcpId` | Update HCP contact limits |
| GET | `/api/constraints/compliance-windows` | List compliance windows |
| GET | `/api/constraints/compliance-windows/upcoming` | Get upcoming windows |
| GET | `/api/constraints/compliance-windows/blackout-check` | Check if in blackout |
| POST | `/api/constraints/compliance-windows` | Create compliance window |
| PATCH | `/api/constraints/compliance-windows/:id` | Update compliance window |
| DELETE | `/api/constraints/compliance-windows/:id` | Delete compliance window |
| GET | `/api/constraints/budget` | List budget allocations |
| GET | `/api/constraints/budget/status` | Get budget status |
| POST | `/api/constraints/budget` | Create budget allocation |
| PATCH | `/api/constraints/budget/:id` | Update budget allocation |
| POST | `/api/constraints/budget/:id/commit` | Commit budget |
| POST | `/api/constraints/budget/:id/release` | Release committed budget |
| POST | `/api/constraints/budget/:id/spend` | Record spend |
| DELETE | `/api/constraints/budget/:id` | Delete budget allocation |
| GET | `/api/constraints/territories` | List territory assignments |
| GET | `/api/constraints/territories/hcp/:hcpId` | Get reps for HCP |
| GET | `/api/constraints/territories/check` | Check rep-HCP assignment |
| POST | `/api/constraints/territories` | Create territory assignment |
| PATCH | `/api/constraints/territories/:id` | Update territory assignment |
| DELETE | `/api/constraints/territories/:id` | Delete territory assignment |

---

## Phase 6E Progress: Orchestrator & Approval Workflow

### Completed Milestones

- [x] **M6E.1**: Created Orchestrator Agent (`server/services/agents/orchestrator.ts`)
  - Coordinates execution of other agents
  - Processes pending action queue
  - Evaluates actions against approval rules
  - Executes approved actions
- [x] **M6E.2**: Implemented Approval Workflow Service
  - Rule-based action evaluation with priority ordering
  - Condition operators: eq, neq, gt, gte, lt, lte, in, not_in, contains
  - Actions: auto_approve, require_review, escalate, reject
  - Rate limiting for auto-approvals per rule
- [x] **M6E.3**: Added default approval rules (6 rules)
  - Auto-approve low risk actions (confidence >= 80%)
  - Auto-approve notification-only actions
  - Require review for medium risk actions
  - Escalate large batch operations (>= 100 entities)
  - Require review for high risk actions
  - Reject very low confidence actions (< 30%)
- [x] **M6E.4**: Added batch action processing
  - Batch approve multiple actions
  - Batch reject multiple actions
  - Queue statistics endpoint
- [x] **M6E.5**: Added orchestrator API endpoints (10 new endpoints)
  - Batch approve/reject
  - Queue statistics
  - Approval rules CRUD
  - Orchestrator run and status
- [x] **M6E.6**: Added 30 new orchestrator and approval workflow tests

### New Files/Modifications (Phase 6E)

```
server/services/agents/
└── orchestrator.ts  # Orchestrator Agent + Approval Workflow Service
```

### Orchestrator Capabilities

| Feature | Description |
|---------|-------------|
| Agent Coordination | Triggers and monitors other agents |
| Action Evaluation | Evaluates proposed actions against configurable rules |
| Auto-Approval | Automatically approves low-risk, high-confidence actions |
| Escalation | Escalates large-impact actions to senior reviewers |
| Batch Processing | Process multiple actions in single operations |
| Rate Limiting | Limits auto-approvals per rule per hour |

### API Endpoints Added (Phase 6E)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agent-actions/batch/approve` | Batch approve multiple actions |
| POST | `/api/agent-actions/batch/reject` | Batch reject multiple actions |
| GET | `/api/agent-actions/stats` | Get queue statistics |
| GET | `/api/approval-rules` | List all approval rules |
| GET | `/api/approval-rules/enabled` | List enabled rules |
| POST | `/api/approval-rules` | Create new rule |
| PATCH | `/api/approval-rules/:id` | Update rule |
| DELETE | `/api/approval-rules/:id` | Delete rule |
| POST | `/api/orchestrator/run` | Run orchestrator |
| GET | `/api/orchestrator/status` | Get orchestrator status |

---

## Phase 6D Progress: Insight Synthesizer Agent

### Completed Milestones

- [x] **M6D.1**: Created Insight Synthesizer Agent (`server/services/agents/insight-synthesizer.ts`)
  - Aggregates insights from channel health, NBAs, alerts, and simulations
  - Identifies strategic patterns (risks, opportunities, trends, anomalies)
  - Generates strategic recommendations with priority ranking
  - Creates executive summary documents
- [x] **M6D.2**: Integrated with NBA Engine
  - Generates NBAs for portfolio analysis
  - Incorporates urgency analysis into recommendations
  - Uses NBA summary statistics for pattern identification
- [x] **M6D.3**: Added document generation capabilities
  - Executive summary structure with key findings
  - Action priorities categorized by urgency
  - Portfolio overview with health scores
- [x] **M6D.4**: Updated scheduler for insight synthesizer
  - Loads HCP data, alerts, agent runs, and simulations
  - Supports scheduled execution
- [x] **M6D.5**: Added 18 new insight synthesizer tests
  - Agent properties, input schema, validation
  - Execution with empty data handling
  - Definition generation

### New Files Created (Phase 6D)

```
server/services/agents/
└── insight-synthesizer.ts  # Insight Synthesizer Agent
```

### Agent Capabilities

| Feature | Description |
|---------|-------------|
| Pattern Identification | Identifies channel_fatigue, engagement_decline, untapped_potential, urgent_actions, re_engagement, recurring_issues, tier1_health patterns |
| Strategic Recommendations | Prioritized recommendations with action items, metrics, and urgency levels |
| Executive Summary | Comprehensive document with portfolio overview, key findings, risks, opportunities |
| NBA Integration | Leverages NBA engine for personalized HCP recommendations |
| Multi-source Aggregation | Combines data from channel health, NBAs, alerts, simulations |

---

## Phase 6C Progress: Channel Health Monitor Agent

### Completed Milestones

- [x] **M6C.1**: Created base agent class (`server/services/agents/base-agent.ts`)
  - BaseAgent abstract class with lifecycle management
  - AgentRegistry singleton for managing agents
  - createAgentRunRecord helper function
  - Type definitions: AgentInput, AgentOutput, AgentContext, AgentInsight, AgentAlert
- [x] **M6C.2**: Created Channel Health Monitor Agent (`server/services/agents/channel-health-monitor.ts`)
  - Monitors channel engagement health across HCP portfolio
  - Identifies declining, blocked, dark, and opportunity channels
  - Generates insights and alerts based on configurable thresholds
  - Proposes remediation actions
- [x] **M6C.3**: Created agent storage methods in `server/storage.ts`
  - Agent definition CRUD (create, get, list, update, delete)
  - Agent run management (create, get, list, status updates)
  - Agent action queue (create, approve, reject, execute)
  - Alert management (create, acknowledge, dismiss, resolve)
- [x] **M6C.4**: Created agent API endpoints in `server/routes.ts`
  - `/api/agents` - List all registered agents
  - `/api/agents/:type` - Get agent details
  - `/api/agents/:type/run` - Trigger agent execution
  - `/api/agents/:type/history` - Get run history
  - `/api/agent-runs/:id` - Get specific run
  - `/api/agent-actions` - Approval queue management
  - `/api/alerts` - Alert management
- [x] **M6C.5**: Implemented agent scheduling (`server/services/agents/scheduler.ts`)
  - node-cron based scheduling
  - Configurable cron expressions per agent
  - Concurrent execution management
  - Start/stop/trigger controls
  - `/api/scheduler/*` endpoints
- [x] **M6C.6**: Integrated with Jira for automated ticket creation
  - Auto-creates Jira tickets for critical/warning alerts
  - Configurable severity thresholds
  - Uses channel_alert template
- [x] **M6C.7**: Added 36 new agent tests
- [x] **M6C.8**: Added agent dashboard UI (`client/src/pages/agents.tsx`)
  - Scheduler status card with start/stop controls
  - Agents tab with run buttons and configuration display
  - Alerts tab with acknowledge/dismiss actions
  - Run history tab with filtering

### New Files Created

```
server/services/agents/
├── index.ts               # Module exports
├── base-agent.ts          # Base agent class and registry
├── channel-health-monitor.ts  # Channel health agent
└── scheduler.ts           # Agent scheduler with node-cron

client/src/pages/
└── agents.tsx             # Agent dashboard UI

test/server/
└── agents.test.ts         # 36 agent tests
```

### API Endpoints Added (Phase 6C)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List all registered agents |
| GET | `/api/agents/:type` | Get agent by type with recent runs |
| POST | `/api/agents/:type/run` | Trigger agent execution |
| GET | `/api/agents/:type/history` | Get agent run history |
| GET | `/api/agent-runs/:id` | Get specific agent run |
| GET | `/api/agent-actions` | List agent actions (approval queue) |
| GET | `/api/agent-actions/pending` | Get pending actions |
| GET | `/api/agent-actions/:id` | Get specific action |
| POST | `/api/agent-actions/:id/approve` | Approve an action |
| POST | `/api/agent-actions/:id/reject` | Reject an action |
| GET | `/api/alerts` | List alerts |
| GET | `/api/alerts/count` | Get active alert count |
| GET | `/api/alerts/:id` | Get specific alert |
| POST | `/api/alerts/:id/acknowledge` | Acknowledge an alert |
| POST | `/api/alerts/:id/dismiss` | Dismiss an alert |
| POST | `/api/alerts/:id/resolve` | Resolve an alert |
| GET | `/api/scheduler/status` | Get scheduler status |
| POST | `/api/scheduler/start` | Start the scheduler |
| POST | `/api/scheduler/stop` | Stop the scheduler |
| POST | `/api/scheduler/trigger/:agentType` | Trigger agent manually |

---

## Test Status

```
Last Run: 2026-01-16
Total Tests: 358
Passing: 358
Failing: 0
New Tests (Phase 6E): 30 (orchestrator + approval workflow)
Previous Tests (Phase 6D): 18 (insight synthesizer)
Previous Tests (Phase 6C): 36 (agent infrastructure)
Previous Tests (Phase 6B): 23 (Jira integration)
Previous Tests (Phase 6A): 35 (integration services)
```

---

## Build Health

| Check | Status |
|-------|--------|
| TypeScript | Clean |
| Tests | 358 passing |
| Build | Passes |

---

## Next Steps (Future Phases)

Phase 6 (Agentic Ecosystem) is now complete. Potential future enhancements:

1. Enhanced approval queue UI with rule management
2. Additional agent types (e.g., Compliance Monitor, Campaign Optimizer)
3. Teams integration (Microsoft Graph API)
4. Box integration for document storage
5. Agent performance analytics dashboard
6. Custom agent builder interface

---

## Quick Reference

### Commands
```bash
npm run dev          # Start dev server
npm run check        # TypeScript check
npm run db:push      # Push schema
npm test             # Run tests
npm run build        # Production build

# Data Generation
npm run generate:data -- --seed=42 --hcps=2000 --months=12 --wipe   # Generate 2000 HCPs
npm run generate:data -- --seed=42 --hcps=2500 --months=12 --wipe   # Scale to 2500 HCPs
npm run generate:data -- --validate-only                             # Validate data only
```

### Environment Variables (Phase 6)
```bash
# Slack (optional - dev mode works without)
SLACK_BOT_TOKEN=xoxb-...

# Jira (optional - dev mode works without)
JIRA_BASE_URL=https://company.atlassian.net
JIRA_EMAIL=...
JIRA_API_TOKEN=...

# Agent Scheduler
AGENT_SCHEDULER_ENABLED=true
AGENT_DEFAULT_TIMEZONE=America/New_York
AGENT_MAX_CONCURRENT_RUNS=3
AGENT_RUN_ON_STARTUP=false
AGENT_JIRA_AUTO_TICKET=true
AGENT_JIRA_SEVERITIES=critical,warning
JIRA_PROJECT_KEY=TWIN
```

### Key Files
```
# Data Generation
server/services/data-generation/
├── DATA-GENERATION-GUIDE.md  # Quick reference for data generation
├── index.ts               # CLI entry point
├── config.ts              # Distribution weights and constants
├── rng.ts                 # Seeded random number generator
├── generators/            # Entity generators (HCPs, campaigns, etc.)
└── validators/            # Data integrity validators

# Agent Services
server/services/agents/
├── index.ts               # Module exports
├── base-agent.ts          # Base agent class and registry
├── channel-health-monitor.ts  # Channel health agent
├── insight-synthesizer.ts # Insight synthesizer agent
├── orchestrator.ts        # Orchestrator agent + approval workflow
└── scheduler.ts           # Agent scheduler

# Integration Services
server/services/integrations/
├── index.ts           # Module exports
├── mcp-client.ts      # MCP protocol wrapper
├── slack.ts           # Slack integration
└── jira.ts            # Jira integration

# API Routes
server/routes.ts       # All API endpoints including agents

# Tests
test/server/agents.test.ts  # Agent infrastructure tests
```

---

## Session Log

### Session: 2026-01-16 (Phase 7F)
**Focus:** Portfolio Optimizer (Capstone) Implementation
**Completed:**
- Verified Phase 7F schema tables already in place (optimizationProblems, optimizationResults, optimizationAllocations, executionPlans)
- Verified Portfolio Optimizer Service already existed (~1200 lines)
- Created Execution Planner Service (~850 lines):
  - Plan lifecycle management (create, schedule, execute, pause, resume, complete, cancel)
  - Resource booking with conflict detection
  - Progress tracking with completion percentage
  - Budget utilization monitoring
  - Performance tracking (predicted vs actual lift)
  - Rebalance suggestions based on outcome deviation
  - Rebalance execution with action modifications
- Created 30+ Optimization API endpoints:
  - Optimization problem CRUD and solve
  - Optimization result queries
  - Execution plan CRUD and lifecycle management
  - Rebalance checking and execution
- Created Allocation Lab UI (~700 lines):
  - Three-tab interface: Problems, Results & Allocations, Execution Plans
  - Create optimization problem dialog with objective, budget, horizon, solver
  - Results display with channel breakdown and allocations table
  - Execution plan management with status badges and action buttons
  - Progress tracking and budget utilization display
- Created Optimization Agent (~380 lines):
  - Autonomous monitoring of execution plan performance
  - Underperformance detection (< 80% of predicted)
  - Critical underperformance alerts (< 60% of predicted)
  - Automatic rebalance suggestions when variance > 20%
  - Portfolio health metrics aggregation
  - Failure rate monitoring with alerts
- Fixed multiple type errors in portfolio-optimizer.ts:
  - Import name corrections (budgetAllocations, channelCapacity, hcpContactLimits)
  - Function name fix (predictStimuliImpact)
  - HCP name property access fix (firstName + lastName)
  - Compliance window field access fix (affectedHcpIds array)
  - Contact limits field name fix (maxTouchesPerMonth)
  - predictStimuliImpact API call fix (positional arguments)
  - Confidence field calculation from interval
  - Execution plan status type casting
- Build verified clean (TypeScript + production build)

**Notes:**
- Phase 7F completes the Portfolio Optimizer Capstone, the final milestone of Phase 7
- Optimization Agent integrates with agent registry for autonomous plan monitoring
- Allocation Lab UI accessible at /allocation-lab route in sidebar
- Three solver algorithms available: greedy (fast), local_search (iterative), simulated_annealing (probabilistic)
- Execution plans track predicted vs actual lift for performance monitoring
- Automatic rebalance suggestions when plans underperform by >20%

### Session: 2026-01-16 (Phase 7D)
**Focus:** Campaign Coordination Implementation
**Completed:**
- Extended campaigns table with Phase 7D fields (brand, businessUnit, priority, targetAudienceId, createdBy)
- Created `hcpReservations` table for HCP channel reservations with priority-based preemption
- Created `conflictLog` table for tracking and resolving campaign conflicts
- Created Campaign Coordinator Service (~1300 lines):
  - Campaign lifecycle management (create, activate, pause, complete, delete)
  - HCP reservation management with automatic conflict detection
  - Batch reservation support for campaign rollouts
  - Time slot availability checking
  - Conflict detection for reservations, campaigns, and HCPs
  - Manual conflict resolution with audit trail
  - Auto-resolution strategies: priority, first_come, budget_efficiency
  - Priority-based preemption support
  - Campaign and HCP view aggregations
  - Stale reservation expiration
- Created 20+ API endpoints for campaign coordination:
  - Campaign CRUD and lifecycle management
  - Reservation management (single and batch)
  - Availability checking
  - Conflict detection and resolution
- Build verified clean (TypeScript + production build)

**Notes:**
- Campaign coordination prevents conflicts between concurrent campaigns targeting overlapping HCPs
- Three reservation types: exclusive (no overlap), priority (can preempt), soft (advisory)
- Auto-resolution strategies allow automated conflict handling based on priority, first_come, or budget_efficiency
- HCP campaign view provides visibility into all campaigns targeting a specific HCP
- Integration with existing NBA engine allows reservation-aware recommendations

### Session: 2026-01-16 (Phase 7C)
**Focus:** Uncertainty Quantification Implementation
**Completed:**
- Created Phase 7C schema additions:
  - `uncertaintyMetrics` table for full uncertainty decomposition per HCP/channel
  - `explorationHistory` table for tracking exploration outcomes and information gain
  - `explorationConfig` table for exploration strategy settings (epsilon, UCB params, Thompson Sampling priors)
  - API types and Zod schemas for uncertainty calculation and exploration decisions
- Created Uncertainty Calculator Service:
  - Epistemic uncertainty calculation (1/√(n+1) formula - model uncertainty reducible with data)
  - Aleatoric uncertainty calculation (prediction error variance - irreducible noise)
  - Data quality assessment (profile completeness, engagement history, channel coverage)
  - Feature drift detection (comparing current values to historical baselines)
  - UCB-style exploration value calculation
  - Batch calculation support and summary statistics
- Created Exploration Strategy Service:
  - Three exploration modes: epsilon_greedy, ucb, thompson_sampling
  - `shouldExplore()` decision function with adaptive strategies
  - `suggestExplorationAction()` finds channels with highest exploration value
  - `calculateExplorationBudget()` allocates budget between exploration/exploitation
  - `recordExplorationOutcome()` tracks outcomes and information gain
  - `adaptExplorationRate()` decays epsilon over time
  - Thompson Sampling with Beta distribution via Gamma trick
- Created 12 uncertainty and exploration API endpoints
- Build verified clean (TypeScript + production build)

**Notes:**
- Uncertainty calculator provides richer uncertainty modeling for exploration vs. exploitation decisions
- Exploration strategy service supports three algorithmic approaches for balancing known vs. unknown
- Services integrate with existing NBA engine for enhanced recommendation generation
- UCB exploration bonus helps prioritize HCPs/channels with high uncertainty for data collection

### Session: 2026-01-16 (Phase 7A)
**Focus:** Constraint Surfaces Implementation
**Completed:**
- Created Phase 7A schema additions:
  - `complianceWindows` table for blackout/restriction periods
  - `budgetAllocations` table for campaign/channel budget tracking
  - API types for constraint checking (ConstraintCheckResult, ContactEligibility, ConstraintSummary)
- Created Constraint Manager Service:
  - Channel capacity management (get, consume, release, reset)
  - HCP contact limits (canContact, recordContact, getNextEligible)
  - Compliance window validation (isInBlackout, getActiveWindows)
  - Budget allocation management (getBudgetStatus, commit, release, recordSpend)
  - Territory assignment validation (getAssignedReps, canRepContactHcp)
  - Aggregate constraint checking for proposed actions
  - Dashboard summary generation
- Created 30+ constraint API endpoints
- Created Constraint Diagnostic UI:
  - Overview tab with summary cards
  - Channel Capacity tab with utilization bars
  - Budget tab with allocation management
  - Compliance Windows tab with CRUD dialogs
  - Contact Limits tab with HCP statistics
- Integrated constraints with NBA engine:
  - validateNBAConstraints for single NBA validation
  - validateNBAsWithConstraints for batch validation
  - generateConstraintAwareNBA for constraint-respecting recommendations
  - getConstraintAwareNBASummary for reporting
- Build verified clean (TypeScript + production build)

**Notes:**
- Constraint manager is now available for orchestrator and agents to validate actions before execution
- NBA engine can generate constraint-aware recommendations that automatically try alternative channels
- UI accessible at /constraints route in sidebar under "Constraints"
- Uses existing Phase 7-PREP tables (channelCapacity, hcpContactLimits, territoryAssignments) plus new tables

### Session: 2026-01-16 (Data Generation Documentation)
**Focus:** Data Generation Quick Reference Guide
**Completed:**
- Created `DATA-GENERATION-GUIDE.md` in `server/services/data-generation/`
- Documented CLI options: `--seed`, `--hcps`, `--months`, `--wipe`, `--validate-only`
- Documented scaling guide with expected data volumes
- Explained wipe-and-regenerate pattern and why it's the right approach for synthetic test data
- Added seed strategy documentation (reproducibility, superset behavior)
- Added troubleshooting section with common questions
- Tested generation at 2000 HCPs (76K stimuli, 16.5K outcomes, 24K Rx)
- Tested scaling to 2500 HCPs (96K stimuli, 21K outcomes, 30K Rx)
- Verified all 12 validation checks pass at both scales

**Data Generation Ratios (Observed):**
| HCPs | Stimuli | Outcomes | Rx History | Territories |
|------|---------|----------|------------|-------------|
| 2000 | 76,502 | 16,500 | 24,000 | 2,400 |
| 2500 | 96,267 | 21,124 | 30,000 | 3,000 |

### Session: 2026-01-16 (Phase 6E)
**Focus:** Orchestrator & Approval Workflow Implementation
**Completed:**
- Created Orchestrator Agent:
  - Coordinates other agents (channel health, insight synthesizer)
  - Processes pending action queue
  - Evaluates and executes approved actions
- Created Approval Workflow Service:
  - Rule-based action evaluation with priority ordering
  - Support for 9 condition operators
  - 4 action types (auto_approve, require_review, escalate, reject)
  - Rate limiting for auto-approvals
- Added 6 default approval rules
- Added batch action processing (approve/reject multiple)
- Added queue statistics endpoint
- Added 10 new API endpoints for orchestrator and approval rules
- Added 30 new tests (358 total passing)

**Notes:**
- Orchestrator runs as alert_manager agent type
- Default rules prioritize safety (low risk auto-approve, high risk requires review)
- Escalation rule triggers for operations affecting 100+ entities
- Very low confidence actions (<30%) are automatically rejected

### Session: 2026-01-16 (Phase 6D)
**Focus:** Insight Synthesizer Agent Implementation
**Completed:**
- Created Insight Synthesizer Agent:
  - Multi-source data aggregation (channel health, NBAs, alerts, simulations)
  - Strategic pattern identification (7 pattern types)
  - Recommendation generation with priority ranking
  - Executive summary document generation
- Integrated with NBA engine for portfolio-wide analysis
- Updated scheduler to load data for insight synthesizer
- Added 18 new tests (328 total passing)

**Notes:**
- Agent synthesizes insights from channel health monitor runs
- Patterns include risks (channel_fatigue, engagement_decline, tier1_health) and opportunities (untapped_potential, re_engagement)
- Executive summary includes portfolio overview, key findings, action priorities
- Recommendations categorized by urgency (immediate, short_term, medium_term)

### Session: 2026-01-16 (Phase 6C)
**Focus:** Channel Health Monitor Agent Implementation
**Completed:**
- Created base agent infrastructure:
  - BaseAgent abstract class with run lifecycle
  - AgentRegistry singleton pattern
  - Type definitions for inputs, outputs, insights, alerts
- Created Channel Health Monitor agent:
  - Monitors channel health across HCP portfolio
  - Generates insights based on engagement patterns
  - Creates alerts when thresholds exceeded
  - Configurable via input parameters
- Created agent storage methods:
  - Agent definitions CRUD
  - Agent runs tracking
  - Agent actions (approval queue)
  - Alert management
- Created agent API endpoints (20 new endpoints)
- Implemented agent scheduler:
  - node-cron based scheduling
  - Concurrent execution limits
  - Runtime control (start/stop)
- Integrated Jira for automated alerts:
  - Auto-creates tickets for critical/warning alerts
  - Configurable severity filtering
- Added 36 new agent tests

**Notes:**
- Agent scheduler uses node-cron v4
- Jira tickets auto-created for critical alerts when enabled
- All agent runs are stored for audit/history
- Scheduler can be controlled via API or environment variables
- Agent dashboard UI accessible at /agents route

### Session: 2026-01-16 (Phase 6B)
**Focus:** Jira Integration Implementation
**Completed:**
- Created full Jira integration service
- Created ticket templates for NBA, simulation, alerts
- Added Jira API endpoints
- Added Jira ticket buttons to UI
- Added 23 Jira tests

### Session: 2025-01-16 (Phase 6A)
**Focus:** Phase 6A Implementation
**Completed:**
- Fixed schema.ts duplicate imports
- Pushed database schema with Phase 6 tables
- Implemented integration storage methods
- Created MCP client wrapper
- Created Slack integration service
- Created integration API endpoints
- Added IntegrationManager UI component
- Added 35 integration tests

### Session: 2026-01-17 (Phase 8: UI Polish & OmniVor Rebrand)
**Focus:** Premium UI Overhaul & Brand System Implementation
**Completed:**

**Phase 8A: Brand Configuration Infrastructure**
- Created `client/src/lib/brand-config.ts` - Central brand tokens
  - Colors: voidBlack, consumptionPurple, processViolet, catalystGold, signalWhite
  - Module naming system, typography, animations, gradients
  - Helper functions: getModuleLabel, getColor, getRandomTagline
- Updated `client/src/index.css` - Brand CSS variables & animations
  - CSS custom properties for entire palette
  - Keyframes: omnivor-converge, omnivor-pulse-glow, omnivor-shimmer
  - Utility classes: .omnivor-glow, .omnivor-glass, .omnivor-card-elevated
- Created `client/src/contexts/BrandContext.tsx` - React context
  - BrandProvider with session-based tagline rotation
  - Hooks: useBrand, useTagline, useModuleName, useBrandColors, useBrandCopy
- Modified `client/src/App.tsx` - BrandProvider wrapper, dark theme default

**Phase 8B: Splash Page Rebrand**
- Created `client/src/components/brand/Wordmark.tsx`
  - Variants: split (OMNIVOR + LABS), heavy (both bold)
  - Sizes: sm, md, lg, xl, 2xl, display
  - WordmarkDisplay, WordmarkCompact, LogoIcon components
- Created `client/src/components/brand/index.ts` - Barrel export
- Rewrote `client/src/pages/landing.tsx` - Full OmniVor branded splash
  - Heavy wordmark with hero glow animation
  - Rotating taglines per session
  - Glass-morphism access form with catalyst-gold CTA

**Phase 8C: Navigation & Module Naming**
- Rewrote `client/src/components/app-sidebar.tsx` - OmniVor nomenclature
  - Intelligence: Signal Index, Cohort Lab
  - Activation: Catalyst Queue, Scenario Lab
  - Analytics: Nerve Center
  - System: Agent Orchestrator, Constraint Surface, Allocation Lab
  - OmniVor Labs footer with purple accent
- Updated page headers:
  - hcp-explorer.tsx → "Signal Index"
  - dashboard.tsx → "Nerve Center"
  - audience-builder.tsx → "Cohort Lab"
  - simulations.tsx → "Scenario Lab"
  - action-queue.tsx → "Catalyst Queue"

**Phase 8D: Signal Index Premium UI**
- Created `client/src/components/ui/signal-card.tsx` - Premium card system
  - Variants: default, elevated, glass, accent
  - Props: glowOnHover, liftOnHover, selected, clickable
  - Sub-components: SignalCardHeader, SignalCardContent, SignalCardFooter
- Created `client/src/components/view-customizer.tsx` - View settings popover
  - ViewSettings interface: mode, density, gridColumns, sortField, sortDirection
  - useViewSettings hook with localStorage persistence
  - Dynamic grid classes generation
- Created `client/src/components/ui/glass-dialog.tsx` - Glass-morphism dialog
  - Backdrop blur, brand border accents, smooth animations
  - Full dialog component suite (Header, Body, Footer, Title, Description)
- Rewrote `client/src/components/hcp-profile-card.tsx`
  - Uses SignalCard with glowOnHover, liftOnHover
  - Channel engagement mini-bars visualization
  - Specialty icons with color coding
  - Renamed "Engagement" → "Signal"
- Modified `client/src/pages/hcp-explorer.tsx`
  - Integrated ViewCustomizer component
  - Dynamic grid layout based on view settings

**Phase 8E: Global UI Polish (Partial)**
- Modified `client/src/components/dashboard-metrics.tsx`
  - Brand-aligned COLORS array
  - MetricCard uses SignalCard with brand styling
  - Catalyst-gold metric values

**Phase 8E: Global UI Polish (Complete)**
- Button system: Brand variants (primary purple, accent gold), hover glow, press states
- Form elements: Input, Select, Checkbox, Textarea with purple focus rings
- Scenario Lab: SignalCard styling with glow/lift effects
- Created `client/src/lib/brand-copy.ts` - Centralized UI copy strings
- Updated empty/error states with brand voice ("No signals match.", "Connection interrupted.")

**Phase 8F: White-Label Preparation (Complete)**
- Created `client/src/lib/white-label.ts`:
  - WhiteLabelConfig interface for client overrides
  - mergeWhiteLabelConfig() function for deep merging
  - applyWhiteLabelColors() for runtime CSS variable injection
  - applyWhiteLabelTypography() for font customization
  - initWhiteLabel() initialization function
  - Example client configuration (EXAMPLE_CLIENT_CONFIG)
- Created `docs/WHITE-LABEL-GUIDE.md`:
  - Complete customization reference
  - Color mapping table
  - Module name overrides
  - Build process documentation
  - Deployment checklist

**Build Status:**
- TypeScript: Clean (no errors)
- Build: Success (1.4MB client, 1.4MB server)
- Tests: 358 passing

**Notes:**
- Phase 8 UI Polish & Rebrand COMPLETE
- OmniVor Labs brand system fully implemented
- White-label ready for client customization
- SignalCard provides consistent premium styling
- Dark theme set as default for brand cohesion
