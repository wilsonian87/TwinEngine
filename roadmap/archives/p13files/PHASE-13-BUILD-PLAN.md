# PHASE 13 BUILD PLAN: Integration & Design System Overhaul

**Generated:** 2026-01-22 (PROJECT-AGENT Session)
**Source:** Phase 13 Master Roadmap, User Journey Audit, Design System Reconciliation
**Mode:** Milestone-based (Supervised Autonomous)
**Domain Anchor:** Pharma HCP Commercial (loaded)

---

## Implementation Overview

This build plan translates the Phase 13 roadmap documentation into executable code changes with specific file targets, component states, and acceptance criteria.

**HANDOFF-QUICKREF Applied:**
- Design tokens mapped to CSS variables
- Component state checklists included
- Design ambiguity flags resolved

---

## Pre-Flight Checklist

Before starting Phase 13:

- [x] Phase 12 complete and stable (795 tests passing)
- [x] 3D Constellation removed (1.3MB bundle savings)
- [x] Authentication working (PostgreSQL sessions)
- [x] CODE-MECHANIC audit complete (B+ rating)
- [ ] Fresh `npm install` after pulling latest
- [ ] Database seeded and running
- [ ] `.env` configured

```bash
# Verification commands
cd /Users/wilsonmacstudio/Documents/TwinEngine
npm run check && npm test
npm run build
```

---

## Phase 13.0: Foundation

**Goal:** Global changes that enable all subsequent work
**Estimated Effort:** 6-8 hours
**Dependencies:** None

### M13.0.1: Module Rename (Global)

**Files to Modify:**

| File | Changes |
|------|---------|
| `client/src/components/app-sidebar.tsx` | Update `navigationItems` and `systemItems` arrays |
| `client/src/components/ui/command-palette.tsx` | Update `navigationItems` array |
| `client/src/components/onboarding/feature-tooltip.tsx` | Reverse `NOMENCLATURE_TOOLTIPS` (new → old becomes old → new) |
| `client/src/components/onboarding/first-run-guide.tsx` | Update guide step labels |
| `client/src/lib/brand-copy.ts` | Update any hardcoded module names |

**Rename Mapping:**

```typescript
// Old → New
const MODULE_RENAMES = {
  'Signal Index': 'HCP Explorer',
  'Cohort Lab': 'Audience Builder',
  'Scenario Lab': 'Simulation Studio',
  'Catalyst Queue': 'Action Queue',
  'Nerve Center': 'Dashboard',
  'Cohort Compare': 'Audience Comparison',
  'Feature Store': 'Channel Health',
  'Signal Diagnostic': 'Channel Health',
  'Agent Orchestrator': 'Agent Manager',
  'Constraint Surface': 'Constraints',
  'Allocation Lab': 'Portfolio Optimizer',
};
```

**app-sidebar.tsx Changes:**

```typescript
// BEFORE (line 50-103)
const navigationItems = [
  { title: "Signal Index", url: "/", icon: Search, ... },
  { title: "Cohort Lab", url: "/audience-builder", ... },
  ...
];

// AFTER
const navigationItems = [
  { title: "HCP Explorer", url: "/", icon: Users, ... },
  { title: "Audience Builder", url: "/audience-builder", icon: UsersPlus, ... },
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, ... },
  { title: "Audience Comparison", url: "/cohort-compare", icon: GitCompare, ... },
  { title: "Channel Health", url: "/feature-store", icon: Activity, ... },
  { title: "Simulation Studio", url: "/simulations", icon: FlaskConical, ... },
  { title: "Action Queue", url: "/action-queue", icon: ListTodo, ... },
  { title: "Portfolio Optimizer", url: "/allocation-lab", icon: PieChart, ... },
  { title: "Message Saturation", url: "/message-saturation", icon: Flame, ... },
  { title: "Next Best Orbit", url: "/next-best-orbit", icon: Target, ... },
];

const systemItems = [
  { title: "Channel Health", url: "/feature-store", icon: Activity, ... },
  { title: "Model Evaluation", url: "/model-evaluation", icon: BarChart3, ... },
  { title: "Agent Manager", url: "/agents", icon: Bot, ... },
  { title: "Constraints", url: "/constraints", icon: Sliders, ... },
  { title: "Portfolio Optimizer", url: "/allocation-lab", icon: PieChart, ... },
];
```

**Acceptance Criteria:**
- [ ] All user-facing module names use new terminology
- [ ] No "Signal Index", "Cohort Lab", "Catalyst Queue", "Nerve Center" visible in UI
- [ ] Command palette reflects new names
- [ ] Onboarding guides reflect new names
- [ ] TypeScript compiles clean
- [ ] All tests pass

---

### M13.0.2: Sidebar Reorganization

**New Section Structure:**

```typescript
// client/src/components/app-sidebar.tsx
const sidebarSections = {
  explore: {
    label: "Explore",
    items: [
      { name: "HCP Explorer", path: "/", icon: Users },
      { name: "Audience Builder", path: "/audience-builder", icon: UsersPlus },
    ]
  },
  analyze: {
    label: "Analyze",
    items: [
      { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { name: "Audience Comparison", path: "/cohort-compare", icon: GitCompare },
      { name: "Channel Health", path: "/feature-store", icon: Activity },
      { name: "Message Saturation", path: "/message-saturation", icon: Flame },
    ]
  },
  activate: {
    label: "Activate",
    items: [
      { name: "Simulation Studio", path: "/simulations", icon: FlaskConical },
      { name: "Action Queue", path: "/action-queue", icon: ListTodo },
      { name: "Next Best Orbit", path: "/next-best-orbit", icon: Target },
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

**Icon Imports to Add:**

```typescript
import {
  Users,
  UsersPlus,
  LayoutDashboard,
  GitCompare,
  Activity,
  FlaskConical,
  ListTodo,
  Target,
  PieChart,
  Bot,
  Sliders,
  BarChart3,
  Settings,
  Flame,
} from "lucide-react";
```

**Acceptance Criteria:**
- [ ] Sidebar groups modules logically: Explore → Analyze → Activate → System
- [ ] Section headers visible with labels
- [ ] All routes still function
- [ ] Active state highlights correctly

---

### M13.0.3: Design System CSS Variables (Light Mode)

**File:** `client/src/index.css`

**Current Issue:** Light mode variables in `:root` use blue-ish primary (#207/85%/42%), not OmniVor brand purple.

**Changes Required:**

```css
/* BEFORE: Lines 46-128 - Replace light mode block */

/* AFTER: OmniVor Light Mode (Default) */
:root {
  /* Backgrounds */
  --background: 0 0% 98%;           /* #fafafa - Off-white page bg */
  --foreground: 240 10% 10%;        /* #18181b - Primary text */

  --card: 0 0% 100%;                /* #ffffff - Card background */
  --card-foreground: 240 10% 10%;

  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 10%;

  /* Muted/Secondary */
  --muted: 240 5% 96%;              /* #f4f4f5 */
  --muted-foreground: 240 4% 46%;   /* #71717a */

  /* Borders */
  --border: 240 6% 90%;             /* #e4e4e7 */
  --input: 240 6% 90%;
  --ring: 270 70% 45%;              /* #9333ea - Purple focus ring */

  /* Brand Colors - OmniVor Purple */
  --primary: 270 70% 40%;           /* #6b21a8 - Consumption Purple */
  --primary-foreground: 0 0% 98%;

  --secondary: 240 5% 96%;
  --secondary-foreground: 240 10% 10%;

  --accent: 30 95% 44%;             /* #d97706 - Catalyst Gold */
  --accent-foreground: 240 10% 10%;

  /* Semantic */
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 98%;

  /* Chart Colors - Brand palette */
  --chart-1: 270 70% 40%;           /* Purple */
  --chart-2: 30 95% 44%;            /* Gold */
  --chart-3: 262 83% 58%;           /* Violet */
  --chart-4: 240 5% 46%;            /* Gray */
  --chart-5: 270 70% 60%;           /* Light purple */

  /* Sidebar (Light) */
  --sidebar-background: 0 0% 100%;
  --sidebar-foreground: 240 10% 10%;
  --sidebar-primary: 270 70% 40%;
  --sidebar-primary-foreground: 0 0% 98%;
  --sidebar-accent: 240 5% 96%;
  --sidebar-accent-foreground: 240 10% 10%;
  --sidebar-border: 240 6% 90%;
  --sidebar-ring: 270 70% 45%;

  /* Shadow scale for light mode */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-hover: 0 10px 40px -10px rgb(107 33 168 / 0.15);
}
```

**Acceptance Criteria:**
- [ ] CSS variables reflect OmniVor brand colors in light mode
- [ ] Dark mode toggle still produces correct dark theme
- [ ] No visual breaks on page load
- [ ] Primary buttons use purple, not blue

---

### M13.0.4: Theme Default Switch

**File:** `client/src/components/theme-provider.tsx`

**Current:** `defaultTheme = "system"` (line 27)

**Change:**

```typescript
// BEFORE (line 27)
defaultTheme = "system",

// AFTER
defaultTheme = "light",

// Also update useState initialization (line 29-31)
const [theme, setTheme] = useState<Theme>(
  () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
);
```

**Acceptance Criteria:**
- [ ] New users see light mode by default
- [ ] Users who previously chose dark mode retain preference
- [ ] Toggle works correctly in both directions

---

## Phase 13.1: Navigation Architecture

**Goal:** Create reusable patterns for contextual navigation
**Estimated Effort:** 8-10 hours
**Dependencies:** Phase 13.0 complete

### M13.1.1: Contextual Action Bar Component

**New File:** `client/src/components/ui/contextual-action-bar.tsx`

**Component States (HANDOFF-QUICKREF):**

| State | Behavior |
|-------|----------|
| Hidden | No selection (count = 0) |
| Visible | Selection > 0, animate in from bottom |
| Hover | Individual action buttons highlight |
| Loading | Actions disabled, show spinner on active action |

**Props Interface:**

```typescript
interface ContextualActionBarProps {
  selectionCount: number;
  selectionLabel: string; // "HCPs", "Audiences", etc.
  actions: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
    icon?: React.ReactNode;
    loading?: boolean;
  }>;
  onClear: () => void;
}
```

**Design Tokens:**

```css
/* Position: fixed bottom-4 left-1/2 -translate-x-1/2 */
/* Background: bg-card border border-border shadow-lg */
/* Border radius: rounded-full for pill shape */
/* Animation: slide-up with opacity fade */
```

**Acceptance Criteria:**
- [ ] Bar appears when selection > 0
- [ ] Bar animates smoothly (300ms ease-out)
- [ ] Actions are clickable and functional
- [ ] Clear button resets selection
- [ ] Keyboard navigable (Tab through actions)

---

### M13.1.2: Post-Action Menu Component

**New File:** `client/src/components/ui/post-action-menu.tsx`

**Props Interface:**

```typescript
interface PostActionMenuProps {
  title: string;           // "Audience saved"
  subtitle?: string;       // "Q1 Targets"
  actions: Array<{
    label: string;
    description?: string;
    onClick: () => void;
    icon?: React.ReactNode;
  }>;
  onDismiss?: () => void;
  variant?: 'modal' | 'drawer' | 'inline';
}
```

**Acceptance Criteria:**
- [ ] Appears after save/create actions
- [ ] Shows relevant next steps
- [ ] Dismissible without action
- [ ] Keyboard accessible (Escape to close)

---

### M13.1.3: HCP Profile Drawer

**New File:** `client/src/components/hcp-profile-drawer.tsx`

**Content Sections:**

1. Header: Name, Specialty, Tier badge
2. Quick stats row: Engagement score, Rx trend, Last touch
3. Channel health mini-radial (reuse existing component)
4. Recent touches timeline (last 5)
5. CTAs: "View Full Profile", "View in Ecosystem", "Add to Audience"

**Props Interface:**

```typescript
interface HCPProfileDrawerProps {
  hcpId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onAction?: (action: 'view' | 'ecosystem' | 'audience') => void;
}
```

**Data Fetching:**

```typescript
// Use existing React Query hooks
const { data: hcp, isLoading } = useQuery({
  queryKey: ['hcp', hcpId],
  queryFn: () => fetch(`/api/hcps/${hcpId}`).then(r => r.json()),
  enabled: !!hcpId && isOpen,
});
```

**Acceptance Criteria:**
- [ ] Drawer slides in from right (Sheet component)
- [ ] Shows HCP summary data
- [ ] CTAs navigate to correct destinations
- [ ] Closes on outside click or Escape
- [ ] Loading and error states handled

---

### M13.1.4: Breadcrumb Context System

**New Files:**
- `client/src/contexts/navigation-context.tsx`
- `client/src/components/ui/breadcrumb-bar.tsx`

**Context Interface:**

```typescript
interface NavigationContext {
  path: Array<{
    label: string;
    href: string;
    params?: Record<string, string>;
  }>;
  push: (item: PathItem) => void;
  pop: () => void;
  clear: () => void;
  setContext: (label: string, params?: Record<string, string>) => void;
}
```

**Acceptance Criteria:**
- [ ] Breadcrumbs reflect navigation path
- [ ] Clicking breadcrumb navigates back
- [ ] Context preserved when drilling down
- [ ] Integrates with wouter navigation

---

## Phase 13.2: Explore Integration

**Goal:** Enable flow from HCP Explorer → Audience Builder
**Estimated Effort:** 8-10 hours
**Dependencies:** Phase 13.1 complete

### M13.2.1: HCP Explorer Multi-Select

**File:** `client/src/pages/hcp-explorer.tsx`

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
const selectVisible = () => selectAll(hcps.map(h => h.id));
```

**HCP Card Changes:**

- Add checkbox (top-left corner, absolute positioned)
- Checkbox visible on hover OR when any selection active
- Selected state: blue border highlight

**Acceptance Criteria:**
- [ ] Checkboxes visible on HCP cards
- [ ] Selection count shown in action bar
- [ ] "Select All" option (current page)
- [ ] Selection persists during filter changes

---

### M13.2.2: Create Audience from Selection

**Flow:**

1. User selects HCPs in Explorer
2. Clicks "Create Audience" in ContextualActionBar
3. Drawer opens with:
   - Audience name input (required)
   - Optional description
   - Selected HCP count
   - Preview of first 5 HCPs
4. User saves
5. PostActionMenu appears with next steps

**API Integration:**

```typescript
// Uses existing endpoint
const createAudience = useMutation({
  mutationFn: (data: { name: string; description?: string; hcpIds: string[] }) =>
    fetch('/api/audiences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, source: 'hcp-explorer' }),
    }).then(r => r.json()),
  onSuccess: (audience) => {
    // Show PostActionMenu
    setCreatedAudience(audience);
    setShowPostAction(true);
    clearSelection();
  },
});
```

**Acceptance Criteria:**
- [ ] Can create audience from Explorer selection
- [ ] Audience appears in Audience Builder list
- [ ] PostActionMenu offers "Run Simulation", "Generate NBOs"

---

### M13.2.3: Export from HCP Explorer

**Implementation:**

```typescript
const exportToCsv = () => {
  const hcpsToExport = selectedHcpIds.size > 0
    ? hcps.filter(h => selectedHcpIds.has(h.id))
    : hcps; // Export all if none selected

  const csv = Papa.unparse(hcpsToExport.map(h => ({
    npi: h.npi,
    name: `${h.firstName} ${h.lastName}`,
    specialty: h.specialty,
    tier: h.tier,
    engagement: h.engagementScore,
    state: h.state,
  })));

  const date = new Date().toISOString().split('T')[0];
  downloadFile(csv, `hcp-export-${date}.csv`, 'text/csv');
};
```

**Acceptance Criteria:**
- [ ] Can export selection or filtered results
- [ ] CSV downloads with correct data
- [ ] Filename includes date

---

## Phase 13.3: Analyze Integration

**Goal:** Enable flow from Dashboard → Investigation → Action
**Estimated Effort:** 6-8 hours
**Dependencies:** Phase 13.2 complete

### M13.3.1: Dashboard Metric Drill-Down

**File:** `client/src/components/dashboard/metric-card.tsx`

**Metric → Destination Mapping:**

```typescript
const METRIC_DRILLDOWNS: Record<string, { path: string; params: Record<string, string> }> = {
  'total-hcps': { path: '/hcp-explorer', params: {} },
  'avg-engagement': { path: '/hcp-explorer', params: { sort: 'engagement', order: 'desc' } },
  'active-hcps': { path: '/hcp-explorer', params: { filter: 'engagement_gt_50' } },
  'declining-hcps': { path: '/hcp-explorer', params: { filter: 'engagement_declining' } },
  'email-fatigue': { path: '/feature-store', params: { channel: 'email' } },
  'field-coverage': { path: '/feature-store', params: { channel: 'field' } },
};
```

**MetricCard Changes:**

```typescript
// Add onClick handler and cursor-pointer
<Card
  className="cursor-pointer hover:shadow-md transition-shadow"
  onClick={() => handleDrillDown(metric.id)}
>
```

**Acceptance Criteria:**
- [ ] Clicking metric navigates to relevant view
- [ ] Destination shows filtered/sorted data
- [ ] Breadcrumb shows drill-down path
- [ ] MetricCard shows clickable affordance (hover state)

---

### M13.3.2: Audience Comparison Entry Improvement

**File:** `client/src/pages/audience-builder.tsx`

**Changes:**

- Add multi-select mode to audience list
- Show "Compare" button when exactly 2 audiences selected
- Navigate to `/cohort-compare?a={id1}&b={id2}`

**Acceptance Criteria:**
- [ ] Can initiate comparison from Audience Builder
- [ ] Comparison view shows both audiences immediately
- [ ] Breadcrumb reflects source

---

### M13.3.3: Comparison Insight → Action CTAs

**File:** `client/src/pages/cohort-compare.tsx`

**Insight Patterns with CTAs:**

```typescript
const INSIGHT_CTAS: Record<string, (audienceId: string) => ReactNode> = {
  'webinar-engagement': (id) => (
    <Button onClick={() => navigate(`/simulations?audience=${id}&channel=webinar`)}>
      Simulate Webinar Campaign
    </Button>
  ),
  'email-fatigue': (id) => (
    <Button onClick={() => navigate(`/feature-store?audience=${id}&channel=email`)}>
      View Email Channel Health
    </Button>
  ),
  'field-coverage-gap': (id) => (
    <Button onClick={() => navigate(`/action-queue?audience=${id}&type=field`)}>
      Generate Field Recommendations
    </Button>
  ),
};
```

**Acceptance Criteria:**
- [ ] Key differences have action CTAs
- [ ] CTAs navigate with context
- [ ] At least 3 insight patterns implemented

---

## Phase 13.4: Activate Integration

**Goal:** Enable flow from Simulation → Recommendations → Export
**Estimated Effort:** 8-10 hours
**Dependencies:** Phase 13.3 complete

### M13.4.1: Simulation Context Persistence

**File:** `client/src/pages/simulations.tsx`

**Implementation:**

```typescript
const [searchParams] = useSearchParams();
const preselectedAudience = searchParams.get('audience');

useEffect(() => {
  if (preselectedAudience) {
    setSelectedAudienceId(preselectedAudience);
  }
}, [preselectedAudience]);

// Show context banner when pre-selected
{preselectedAudience && (
  <Alert className="mb-4">
    <span>Simulating for: <strong>{audienceName}</strong></span>
    <Button variant="ghost" size="sm" onClick={() => setSelectedAudienceId(null)}>
      Change
    </Button>
  </Alert>
)}
```

**Acceptance Criteria:**
- [ ] Audience pre-selected when navigating with context
- [ ] User can still change selection
- [ ] Context banner visible

---

### M13.4.2: Simulation Results → Action Queue

**File:** `client/src/pages/simulations.tsx` (results section)

**Add CTA to results view:**

```typescript
const handleGenerateRecommendations = async () => {
  setGeneratingNbos(true);
  await fetch('/api/nbo/generate', {
    method: 'POST',
    body: JSON.stringify({ audienceId: selectedAudienceId, simulationId: results.id }),
  });
  navigate(`/action-queue?simulation=${results.id}`);
};

// In results section
<Button onClick={handleGenerateRecommendations} disabled={generatingNbos}>
  {generatingNbos ? <Loader2 className="animate-spin" /> : <Zap />}
  Generate Recommendations
</Button>
```

**Acceptance Criteria:**
- [ ] CTA visible on simulation results
- [ ] Recommendations generated for audience
- [ ] Action Queue shows new recommendations

---

### M13.4.3: Action Queue HCP Links

**File:** `client/src/pages/action-queue.tsx`

**Make HCP names clickable:**

```typescript
// Replace plain HCP name text with:
<button
  className="text-primary hover:underline"
  onClick={() => setSelectedHcpId(action.hcpId)}
>
  {action.hcpName}
</button>

// Add HCPProfileDrawer to page
<HCPProfileDrawer
  hcpId={selectedHcpId}
  isOpen={!!selectedHcpId}
  onClose={() => setSelectedHcpId(null)}
/>
```

**Acceptance Criteria:**
- [ ] HCP names are clickable links
- [ ] Profile Drawer opens on click
- [ ] Can navigate to full profile from drawer

---

### M13.4.4: Bulk Operations in Action Queue

**Add to Action Queue:**

```typescript
// Header checkbox for select all
<Checkbox
  checked={selectedAll}
  onCheckedChange={toggleSelectAll}
  aria-label="Select all recommendations"
/>

// Bulk action buttons (visible when selection > 0)
{selectedIds.size > 0 && (
  <ContextualActionBar
    selectionCount={selectedIds.size}
    selectionLabel="recommendations"
    actions={[
      { label: 'Approve All', onClick: bulkApprove, variant: 'primary' },
      { label: 'Reject All', onClick: bulkReject, variant: 'ghost' },
    ]}
    onClear={clearSelection}
  />
)}

// Confidence filter
<Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
  <SelectItem value="all">All Confidence</SelectItem>
  <SelectItem value="high">High Only (&gt;75%)</SelectItem>
  <SelectItem value="medium">Medium+ (&gt;50%)</SelectItem>
</Select>
```

**Acceptance Criteria:**
- [ ] Can bulk select/deselect
- [ ] Can bulk approve/reject
- [ ] Can filter by confidence level

---

## Phase 13.5: Polish & QA

**Goal:** Ensure quality across all changes
**Estimated Effort:** 8-10 hours
**Dependencies:** Phase 13.4 complete

### M13.5.1: End-to-End Journey Testing

**Test Scripts:**

| Journey | Steps | Pass Criteria |
|---------|-------|---------------|
| Find & Build | Search HCPs → Select → Create Audience → Save | Audience exists, no manual re-entry |
| Simulate | Audience Builder → Run Sim → View Results | Pre-selection works, results actionable |
| Generate NBOs | Sim Results → Generate → Review → Export | Full flow without sidebar nav |
| Dashboard Drill | Dashboard → Metric → HCPs → Audience | Context preserved, breadcrumbs work |
| Understand Why | Action Queue → HCP → Profile | Drawer shows, CTAs work |

### M13.5.2: Responsive Audit

**Breakpoints:**
- Desktop: 1440px+
- Laptop: 1024px
- Tablet: 768px
- Mobile: deferred (not in scope)

**Focus Areas:**
- ContextualActionBar positioning
- HCPProfileDrawer width
- Table horizontal scroll
- Sidebar collapse behavior

### M13.5.3: Performance Check

**Targets:**
- Page load: < 2s
- Navigation: < 500ms
- Action response: < 300ms
- Bundle size: within 10% of Phase 12

**Commands:**
```bash
npm run build
# Check dist/public/assets for bundle sizes
# Run Lighthouse on key pages
```

### M13.5.4: Empty States with Forward Actions

**Audit each page for empty states:**

| Page | Empty State Message | CTA |
|------|---------------------|-----|
| HCP Explorer (no results) | "No HCPs match your filters." | [Clear Filters], [Try Audience Builder] |
| Audience Builder (no audiences) | "You haven't created any audiences yet." | [Create Your First Audience] |
| Action Queue (no recommendations) | "No recommendations yet." | [Run a Simulation] |
| Simulation Studio (no simulations) | "No simulations run yet." | [Create Your First Simulation] |

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

## Execution Checklist

### Per-Milestone Completion:

- [ ] All tasks completed
- [ ] TypeScript compiles clean (`npm run check`)
- [ ] Tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] STATUS.md updated
- [ ] Visual regression checked (screenshot key pages)

### Milestone Pause Points:

At the end of each phase (13.0, 13.1, etc.):

1. Run full test suite
2. Build production bundle
3. Manual smoke test of affected pages
4. Update STATUS.md with completion status
5. **PAUSE for user review before proceeding**

---

*Build Plan Generated: 2026-01-22*
*Project: TwinEngine (OmniVor)*
*Mode: Milestone-based (Supervised Autonomous)*
