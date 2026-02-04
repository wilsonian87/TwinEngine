# PHASE 13: Integration & Design System Overhaul — Master Roadmap

**Generated:** 2026-01-20  
**Goal:** Transform disconnected modules into cohesive platform with intuitive flow, light-mode-first design, white-label-ready naming  
**Predecessor:** Phase 12 (Multi-Roadmap Consolidation)  
**Mode:** Milestone-based (Supervised Autonomous)

---

## Strategic Overview

Phase 13 addresses three interconnected challenges:

| Challenge | Solution | Deliverable |
|-----------|----------|-------------|
| Disconnected modules | Contextual CTAs + handoffs | Seamless user journeys |
| Brand-heavy naming | Self-descriptive renames | White-label ready |
| Dark-mode-first design | Light mode default + system | Premium, accessible UI |

**Guiding Principle:** Users should complete end-to-end workflows without sidebar navigation. Every screen should answer "What can I do next?"

---

## Phase Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   PHASE 13                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│  13.0: FOUNDATION                                                               │
│  ├── Module Rename (global)                                                     │
│  ├── Sidebar Reorganization                                                     │
│  ├── Design System CSS Variables (light mode)                                   │
│  └── Theme Default Switch                                                       │
├──────────────────┬──────────────────┬──────────────────┬────────────────────────┤
│   13.1: NAV      │   13.2: EXPLORE  │   13.3: ANALYZE  │   13.4: ACTIVATE       │
│   Architecture   │   Integration    │   Integration    │   Integration          │
├──────────────────┼──────────────────┼──────────────────┼────────────────────────┤
│ Contextual CTA   │ HCP multi-select │ Dashboard drill  │ Sim → NBO flow         │
│ system           │ Create Audience  │ Metric links     │ Results → Action       │
│ Profile drawer   │ Export from view │ Comparison entry │ Bulk operations        │
│ Breadcrumbs      │ Ecosystem links  │ Insight → Action │ HCP drawer links       │
└──────────────────┴──────────────────┴──────────────────┴────────────────────────┘
│                                                                                 │
│   13.5: POLISH                                                                  │
│   ├── End-to-end journey testing                                               │
│   ├── Responsive audit (tablet)                                                │
│   ├── Performance check                                                        │
│   └── Empty states with forward actions                                        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 13.0: Foundation

**Goal:** Global changes that enable all subsequent work  
**Effort Estimate:** 6-8 hours  
**Dependencies:** None

---

### M13.0.1: Module Rename (Global)

**Tasks:**

- [ ] Update sidebar labels in `client/src/components/app-sidebar.tsx`:
  
  | Old Label | New Label | Section |
  |-----------|-----------|---------|
  | Signal Index | HCP Explorer | Explore |
  | Cohort Lab | Audience Builder | Explore |
  | Nerve Center | Dashboard | Analyze |
  | Cohort Compare | Audience Comparison | Analyze |
  | Signal Diagnostic | Channel Health | Analyze |
  | Scenario Lab | Simulation Studio | Activate |
  | Catalyst Queue | Action Queue | Activate |
  | Allocation Lab | Portfolio Optimizer | Activate |
  | Agent Orchestrator | Agent Manager | System |
  | Constraint Surface | Constraints | System |

- [ ] Update page headers in each page component:
  - `hcp-explorer.tsx` — "HCP Explorer"
  - `audience-builder.tsx` — "Audience Builder"
  - `dashboard.tsx` — "Dashboard"
  - `cohort-compare.tsx` — "Audience Comparison"
  - `feature-store.tsx` — "Channel Health"
  - `simulations.tsx` — "Simulation Studio"
  - `action-queue.tsx` — "Action Queue"
  - `allocation-lab.tsx` — "Portfolio Optimizer"
  - `agents.tsx` — "Agent Manager"
  - `constraints.tsx` — "Constraints"

- [ ] Update command palette items in `client/src/components/ui/command-palette.tsx`

- [ ] Update onboarding content:
  - `client/src/components/onboarding/feature-tooltip.tsx`
  - `client/src/components/onboarding/first-run-guide.tsx`

- [ ] Update any hardcoded references in:
  - `client/src/lib/brand-copy.ts`
  - Any component with navigation labels

**Acceptance Criteria:**
- All user-facing module names use new terminology
- No "Signal Index", "Cohort Lab", "Catalyst Queue", "Nerve Center" visible in UI
- Command palette reflects new names
- Onboarding guides reflect new names

---

### M13.0.2: Sidebar Reorganization

**New Structure:**

```typescript
const sidebarItems = {
  explore: {
    label: "Explore",
    items: [
      { name: "HCP Explorer", path: "/hcp-explorer", icon: Users },
      { name: "Ecosystem Explorer", path: "/ecosystem", icon: Network },
      { name: "Audience Builder", path: "/audience-builder", icon: UsersPlus },
    ]
  },
  analyze: {
    label: "Analyze", 
    items: [
      { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { name: "Audience Comparison", path: "/cohort-compare", icon: GitCompare },
      { name: "Channel Health", path: "/feature-store", icon: Activity },
    ]
  },
  activate: {
    label: "Activate",
    items: [
      { name: "Simulation Studio", path: "/simulations", icon: FlaskConical },
      { name: "Action Queue", path: "/action-queue", icon: ListTodo },
      { name: "Portfolio Optimizer", path: "/allocation-lab", icon: PieChart },
    ]
  },
  system: {
    label: "System",
    items: [
      { name: "Agent Manager", path: "/agents", icon: Bot },
      { name: "Constraints", path: "/constraints", icon: Sliders },
      { name: "Model Evaluation", path: "/model-evaluation", icon: BarChart3 },
      { name: "Settings", path: "/settings", icon: Settings },
    ]
  }
};
```

**Tasks:**
- [ ] Restructure sidebar component with section headers
- [ ] Add section dividers/labels
- [ ] Update icon imports if needed
- [ ] Test navigation still works

**Acceptance Criteria:**
- Sidebar groups modules logically: Explore → Analyze → Activate → System
- Section headers visible
- All routes still function

---

### M13.0.3: Design System CSS Variables

**Tasks:**
- [ ] Update `client/src/index.css` with light-mode-first variables (see Phase 13.2 document)
- [ ] Add shadow scale variables
- [ ] Ensure dark mode variables still work under `[data-theme="dark"]` or `.dark`

**Files to modify:**
```
client/src/index.css          # Primary CSS variables
tailwind.config.js            # If custom colors defined
```

**Acceptance Criteria:**
- CSS variables reflect light-mode-first palette
- Dark mode toggle still produces correct dark theme
- No visual breaks on page load

---

### M13.0.4: Theme Default Switch

**Tasks:**
- [ ] Update `client/src/components/theme-provider.tsx`:
  - Change default from 'system' or 'dark' to 'light'
  - Ensure localStorage respects user preference if set
  
- [ ] Test theme toggle in both directions

**Code Change:**
```typescript
// In theme-provider.tsx
const [theme, setTheme] = useState<'light' | 'dark'>(() => {
  const stored = localStorage.getItem('theme');
  return (stored === 'dark') ? 'dark' : 'light'; // Default to light
});
```

**Acceptance Criteria:**
- New users see light mode by default
- Users who previously chose dark mode retain preference
- Toggle works correctly in both directions

---

## Phase 13.1: Navigation Architecture

**Goal:** Create reusable patterns for contextual navigation  
**Effort Estimate:** 8-10 hours  
**Dependencies:** 13.0 complete

---

### M13.1.1: Contextual CTA System

**Component:** `client/src/components/ui/contextual-action-bar.tsx`

**Purpose:** When user has active selection/context, show floating action bar.

**Design:**
```
┌─────────────────────────────────────────────────────────────┐
│ 12 HCPs selected   [Create Audience] [Export CSV] [Clear]   │
└─────────────────────────────────────────────────────────────┘
```

**Props:**
```typescript
interface ContextualActionBarProps {
  selectionCount: number;
  selectionLabel: string; // "HCPs", "Audiences", etc.
  actions: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
    icon?: React.ReactNode;
  }>;
  onClear: () => void;
}
```

**Tasks:**
- [ ] Create ContextualActionBar component
- [ ] Sticky positioning at bottom of viewport
- [ ] Animate in/out based on selection state
- [ ] Accessible (keyboard navigable)

**Acceptance Criteria:**
- Bar appears when selection > 0
- Bar animates smoothly
- Actions are clickable and functional
- Clear button resets selection

---

### M13.1.2: Post-Action Menu Component

**Component:** `client/src/components/ui/post-action-menu.tsx`

**Purpose:** After completing an action (save, create), offer next steps.

**Design:**
```
┌─────────────────────────────────────────────────────────────┐
│ ✓ Audience "Q1 Targets" saved                               │
│                                                             │
│ What's next?                                                │
│ [Run Simulation]  [Generate Recommendations]  [Compare]     │
└─────────────────────────────────────────────────────────────┘
```

**Props:**
```typescript
interface PostActionMenuProps {
  title: string; // "Audience saved"
  subtitle?: string; // "Q1 Targets"
  actions: Array<{
    label: string;
    description?: string;
    onClick: () => void;
    icon?: React.ReactNode;
  }>;
  onDismiss?: () => void;
}
```

**Tasks:**
- [ ] Create PostActionMenu component
- [ ] Can be used as modal, drawer, or inline
- [ ] Track dismissal to avoid repetition
- [ ] Support keyboard navigation

**Acceptance Criteria:**
- Appears after save/create actions
- Shows relevant next steps
- Dismissible without action
- Keyboard accessible

---

### M13.1.3: HCP Profile Drawer

**Component:** `client/src/components/hcp-profile-drawer.tsx`

**Purpose:** Click any HCP name anywhere → Slide-in drawer with quick profile.

**Content:**
- Header: Name, Specialty, Tier badge
- Quick stats row: Engagement score, Rx trend, Last touch
- Channel health mini-radial (existing component)
- Recent touches timeline (last 5)
- CTAs: "View Full Profile", "View Ecosystem", "Add to Audience"

**Props:**
```typescript
interface HCPProfileDrawerProps {
  hcpId: string;
  isOpen: boolean;
  onClose: () => void;
  onAction?: (action: 'view' | 'ecosystem' | 'audience') => void;
}
```

**Tasks:**
- [ ] Create HCPProfileDrawer component
- [ ] Fetch HCP data on open (React Query)
- [ ] Include ChannelHealthRadial component
- [ ] Wire CTAs to navigation
- [ ] Loading and error states

**Acceptance Criteria:**
- Drawer slides in from right
- Shows HCP summary data
- CTAs navigate to correct destinations
- Closes on outside click or escape

---

### M13.1.4: Breadcrumb Context System

**Component:** `client/src/components/ui/breadcrumb-context.tsx`

**Purpose:** Show navigation path, enable quick jumps.

**Design:**
```
Dashboard > Email Fatigue > HCP Explorer (filtered) > Dr. Smith
```

**Implementation:**
```typescript
// Context provider tracks navigation history
interface NavigationContext {
  path: Array<{
    label: string;
    href: string;
    params?: Record<string, string>;
  }>;
  push: (item: PathItem) => void;
  pop: () => void;
  clear: () => void;
}
```

**Tasks:**
- [ ] Create NavigationContextProvider
- [ ] Create BreadcrumbBar component
- [ ] Integrate with wouter navigation
- [ ] Persist minimal state for back navigation

**Acceptance Criteria:**
- Breadcrumbs reflect navigation path
- Clicking breadcrumb navigates back
- Context preserved when drilling down

---

## Phase 13.2: Explore Integration

**Goal:** Enable flow from HCP Explorer → Audience Builder  
**Effort Estimate:** 8-10 hours  
**Dependencies:** 13.1 complete

---

### M13.2.1: HCP Explorer Multi-Select

**Tasks:**
- [ ] Add checkbox to HCP cards (top-left corner)
- [ ] Track selected HCP IDs in component state
- [ ] Show ContextualActionBar when selection > 0
- [ ] Selection survives pagination/filtering

**State Management:**
```typescript
const [selectedHcpIds, setSelectedHcpIds] = useState<Set<string>>(new Set());

const toggleSelection = (id: string) => {
  setSelectedHcpIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
};

const clearSelection = () => setSelectedHcpIds(new Set());
const selectAll = (ids: string[]) => setSelectedHcpIds(new Set(ids));
```

**Acceptance Criteria:**
- Checkboxes visible on HCP cards
- Selection count shown in action bar
- "Select All" option (current page)
- Selection persists during filter changes

---

### M13.2.2: Create Audience from Selection

**Flow:**
1. User selects HCPs in Explorer
2. Clicks "Create Audience" in action bar
3. Drawer/modal opens with:
   - Audience name input
   - Optional description
   - Selected HCP count
   - Preview of first 5 HCPs
4. User saves
5. PostActionMenu appears with next steps

**Tasks:**
- [ ] Create "Create Audience" flow
- [ ] Call existing audience save API
- [ ] Show PostActionMenu on success
- [ ] Clear selection after save

**API Integration:**
```typescript
// Uses existing endpoint
POST /api/audiences
{
  name: "Q1 Targets",
  description: "Selected from HCP Explorer",
  hcpIds: ["id1", "id2", ...],
  source: "hcp-explorer"
}
```

**Acceptance Criteria:**
- Can create audience from Explorer selection
- Audience appears in Audience Builder list
- PostActionMenu offers "Run Simulation", "Generate NBOs"

---

### M13.2.3: Export from HCP Explorer

**Tasks:**
- [ ] Add "Export CSV" to ContextualActionBar
- [ ] Export selected HCPs (or all if none selected)
- [ ] CSV columns: NPI, Name, Specialty, Tier, Engagement, State

**Implementation:**
```typescript
const exportToCsv = (hcps: HCP[]) => {
  const csv = Papa.unparse(hcps.map(h => ({
    npi: h.npi,
    name: `${h.firstName} ${h.lastName}`,
    specialty: h.specialty,
    tier: h.tier,
    engagement: h.engagementScore,
    state: h.state
  })));
  downloadFile(csv, 'hcp-export.csv', 'text/csv');
};
```

**Acceptance Criteria:**
- Can export selection or filtered results
- CSV downloads with correct data
- Filename includes date

---

### M13.2.4: Ecosystem Explorer Links

**Tasks:**
- [ ] Add "View in Ecosystem" link to HCP card hover state
- [ ] Add same link to HCP Profile Drawer
- [ ] Navigation passes HCP context to Ecosystem view

**Acceptance Criteria:**
- Can navigate from HCP card → Ecosystem Explorer
- Ecosystem focuses on selected HCP (Phase 14 will implement focus)
- Link visible but functional navigation deferred if needed

---

## Phase 13.3: Analyze Integration

**Goal:** Enable flow from Dashboard → Investigation → Action  
**Effort Estimate:** 6-8 hours  
**Dependencies:** 13.2 complete

---

### M13.3.1: Dashboard Metric Drill-Down

**Current State:** Dashboard shows metrics but they're not clickable.

**Desired State:** Click metric → Navigate to filtered view.

**Metric → Destination Mapping:**

| Metric | Destination | Filter Applied |
|--------|-------------|----------------|
| Total HCPs | HCP Explorer | None |
| Avg Engagement | HCP Explorer | Sort by engagement |
| Active HCPs | HCP Explorer | Engagement > 50 |
| Declining HCPs | HCP Explorer | Engagement declining |
| Email Fatigue | Channel Health | Email channel |
| Field Coverage | Channel Health | Field channel |

**Tasks:**
- [ ] Make MetricCard clickable
- [ ] Define metric → route + params mapping
- [ ] Update BreadcrumbContext on drill-down
- [ ] Show "Viewing: [context]" banner on destination

**Acceptance Criteria:**
- Clicking metric navigates to relevant view
- Destination shows filtered/sorted data
- Breadcrumb shows drill-down path

---

### M13.3.2: Audience Comparison Entry Improvement

**Current State:** Must navigate to Cohort Compare, then select two audiences.

**Desired State:** Select two audiences in Audience Builder → Click "Compare"

**Tasks:**
- [ ] Add multi-select mode to Audience Builder list
- [ ] Show "Compare" button when 2 audiences selected
- [ ] Navigate to Audience Comparison with both pre-loaded

**Acceptance Criteria:**
- Can initiate comparison from Audience Builder
- Comparison view shows both audiences immediately
- Breadcrumb reflects source

---

### M13.3.3: Comparison Insight → Action

**Current State:** Comparison shows insights but no next steps.

**Desired State:** Insights suggest actions with CTAs.

**Example Insight + CTA:**
```
"Audience A has 2.3x more webinar engagement than Audience B"
[Simulate Webinar Campaign for B]  [View Webinar Attendees in A]
```

**Tasks:**
- [ ] Identify 3-5 actionable insight patterns
- [ ] Add CTA buttons to insight cards
- [ ] Wire to Simulation Studio or HCP Explorer

**Acceptance Criteria:**
- Key differences have action CTAs
- CTAs navigate with context
- At least 3 insight patterns implemented

---

## Phase 13.4: Activate Integration

**Goal:** Enable flow from Simulation → Recommendations → Export  
**Effort Estimate:** 8-10 hours  
**Dependencies:** 13.3 complete

---

### M13.4.1: Simulation Context Persistence

**Current State:** User must select audience in Simulation Studio dropdown.

**Desired State:** If navigating from Audience Builder, audience pre-selected.

**Implementation:**
```typescript
// Navigation with context
navigate(`/simulations?audienceId=${audienceId}`);

// In Simulation Studio
const [searchParams] = useSearchParams();
const preselectedAudience = searchParams.get('audienceId');

useEffect(() => {
  if (preselectedAudience) {
    setSelectedAudience(preselectedAudience);
  }
}, [preselectedAudience]);
```

**Tasks:**
- [ ] Accept audienceId query param in Simulation Studio
- [ ] Pre-select audience if provided
- [ ] Show context banner: "Simulating for: [Audience Name]"

**Acceptance Criteria:**
- Audience pre-selected when navigating with context
- User can still change selection
- Context banner visible

---

### M13.4.2: Simulation Results → Action Queue

**Current State:** Simulation results are terminal.

**Desired State:** Results offer "Generate Recommendations" CTA.

**Flow:**
1. Simulation completes
2. Results show with "Generate Recommendations" button
3. Click triggers NBO generation for simulated audience
4. Navigate to Action Queue with results

**Tasks:**
- [ ] Add CTA to simulation results view
- [ ] Call NBO generation API
- [ ] Navigate to Action Queue on success
- [ ] Pass simulation context for reference

**Acceptance Criteria:**
- CTA visible on simulation results
- Recommendations generated for audience
- Action Queue shows new recommendations

---

### M13.4.3: Action Queue HCP Links

**Current State:** HCP names in queue are plain text.

**Desired State:** HCP names open Profile Drawer.

**Tasks:**
- [ ] Make HCP names clickable
- [ ] Open HCPProfileDrawer on click
- [ ] Drawer shows relevant context (why recommended)

**Acceptance Criteria:**
- HCP names are links
- Profile Drawer opens
- Can navigate to full profile from drawer

---

### M13.4.4: Bulk Operations in Action Queue

**Tasks:**
- [ ] Add "Select All" checkbox in header
- [ ] Add "Approve All" / "Reject All" buttons
- [ ] Add confidence threshold filter (e.g., "Show High Confidence Only")

**Acceptance Criteria:**
- Can bulk select/deselect
- Can bulk approve/reject
- Can filter by confidence level

---

## Phase 13.5: Polish & QA

**Goal:** Ensure quality across all changes  
**Effort Estimate:** 8-10 hours  
**Dependencies:** 13.4 complete

---

### M13.5.1: End-to-End Journey Testing

**Test each journey documented in Phase 13.1 Audit:**

| Journey | Test Steps | Pass Criteria |
|---------|------------|---------------|
| Find & Build | Search HCPs → Select → Create Audience → Save | Audience exists, no manual re-entry |
| Simulate | Audience Builder → Run Sim → View Results | Pre-selection works, results actionable |
| Generate NBOs | Sim Results → Generate → Review → Export | Full flow without sidebar nav |
| Dashboard Drill | Dashboard → Metric → HCPs → Audience | Context preserved, breadcrumbs work |
| Understand Why | Action Queue → HCP → Profile | Drawer shows, CTAs work |

**Tasks:**
- [ ] Write manual test scripts for each journey
- [ ] Execute tests
- [ ] Log issues
- [ ] Fix blockers

**Acceptance Criteria:**
- All 5 platform journeys completable without sidebar navigation
- No dead-ends in core flows

---

### M13.5.2: Responsive Audit

**Breakpoints to test:**
- Desktop (1440px+)
- Laptop (1024px)
- Tablet (768px)
- Mobile (defer — not in scope)

**Tasks:**
- [ ] Test all pages at each breakpoint
- [ ] Fix layout breaks
- [ ] Ensure ContextualActionBar works on tablet
- [ ] Ensure Profile Drawer works on tablet

**Acceptance Criteria:**
- No horizontal scroll on tablet
- All CTAs accessible
- Tables readable (may need horizontal scroll)

---

### M13.5.3: Performance Check

**Targets:**
- Page load: < 2s
- Navigation: < 500ms
- Action response: < 300ms

**Tasks:**
- [ ] Profile key pages with Lighthouse
- [ ] Identify slow components
- [ ] Apply lazy loading where beneficial
- [ ] Check bundle size hasn't grown significantly

**Acceptance Criteria:**
- Lighthouse performance score ≥ 80
- No noticeable lag in navigation
- Bundle size within 10% of Phase 12

---

### M13.5.4: Empty States with Forward Actions

**Current State:** Empty states say "No data" with no guidance.

**Desired State:** Empty states suggest next action.

**Examples:**
- HCP Explorer (no results): "No HCPs match your filters. [Clear Filters] or [Try Audience Builder]"
- Audience Builder (no audiences): "You haven't created any audiences yet. [Create Your First Audience]"
- Action Queue (no recommendations): "No recommendations yet. [Run a Simulation] to generate recommendations."

**Tasks:**
- [ ] Audit all empty states
- [ ] Add contextual copy
- [ ] Add CTAs where appropriate

**Acceptance Criteria:**
- Empty states guide users forward
- CTAs are actionable
- Copy is helpful, not just decorative

---

## Effort Summary

| Phase | Effort | Duration |
|-------|--------|----------|
| 13.0 Foundation | 6-8h | Week 1 |
| 13.1 Navigation Architecture | 8-10h | Week 1-2 |
| 13.2 Explore Integration | 8-10h | Week 2-3 |
| 13.3 Analyze Integration | 6-8h | Week 3 |
| 13.4 Activate Integration | 8-10h | Week 3-4 |
| 13.5 Polish & QA | 8-10h | Week 4-5 |
| **Total** | **44-56h** | **~5 weeks** |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Rename breaks existing links/bookmarks | Medium | Low | Routes unchanged, only labels |
| Light mode reveals contrast issues | High | Medium | Thorough component audit |
| Performance regression from new components | Low | Medium | Profile before/after |
| User confusion from reorganized sidebar | Medium | Low | Onboarding update + tooltips |
| Scope creep into Ecosystem Explorer | Medium | High | Explicit deferral to Phase 14 |

---

## Success Criteria

### Phase 13 Complete When:

- [ ] All modules use new names (no brand jargon in UI)
- [ ] Light mode is default, dark mode works via toggle
- [ ] Can complete "Find → Build → Simulate → Act" without sidebar
- [ ] Dashboard metrics drill down to filtered views
- [ ] HCP names link to profile drawer everywhere
- [ ] All 5 platform journeys pass QA
- [ ] Performance within targets
- [ ] Documentation updated (STATUS.md, CHANGELOG.md)

### Demo Readiness:

- [ ] First-time user can discover core flow without training
- [ ] No dead-ends in primary use cases
- [ ] UI feels cohesive across all modules
- [ ] Light/dark toggle works without glitches

---

## Execution Notes

### For Claude Code Sessions

1. Start each session by reading: `CLAUDE.md`, `STATUS.md`, this roadmap
2. Work one milestone at a time within phase order
3. Update `STATUS.md` after each milestone
4. Run tests after significant changes: `npm run check && npm test`
5. Build verification: `npm run build`

### Milestone Completion Checklist

- [ ] All tasks completed
- [ ] Tests added/passing
- [ ] TypeScript compiles clean
- [ ] Build succeeds
- [ ] STATUS.md updated
- [ ] Visual regression checked (screenshot key pages)

---

## Related Documents

- `PHASE-13-1-USER-JOURNEY-AUDIT.md` — Full journey mapping and gap analysis
- `PHASE-13-2-DESIGN-SYSTEM-RECONCILIATION.md` — CSS variables and color system
- `OMNIVOR-LABS-STYLE-GUIDE.md` — Brand guide (to be updated)
- `OMNIVOR_LABS___Brand_BibleVersion1_1.md` — Brand bible (to be updated)

---

*Roadmap generated: 2026-01-20*  
*Project: OmniVor — HCP Digital Twin Platform*  
*Predecessor: Phase 12 Multi-Roadmap Consolidation*
