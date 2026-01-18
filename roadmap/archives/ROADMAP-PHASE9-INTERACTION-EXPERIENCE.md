# ROADMAP: OmniVor Phase 9 — Interaction & Experience Design

**Goal:** Transform OmniVor from visually branded to experientially differentiated through motion, data visualization, and power-user features  
**Target:** A product that *feels* like the consumption → transformation → intelligence metaphor  
**Mode:** Milestone-based (Supervised Autonomous)  
**Prerequisite:** Phase 8 Complete (UI/Design Polish & Branding)  
**Generated:** 2026-01-16

---

## Executive Summary

Phase 8 established *how OmniVor looks*. Phase 9 establishes *how OmniVor feels*.

The brand metaphor—"consumption → transformation → intelligence"—must be experienced through interaction, not just read in copy. When data moves between views, when charts animate to reveal insight, when a user's intent is anticipated by a command palette—these moments create the "this is different" feeling that wins demos and builds loyalty.

**Key Outcomes:**
1. **Data Visualization System** — Charts that embody the brand, not just use brand colors
2. **Page Transitions** — Data flows visually between contexts, reinforcing transformation metaphor
3. **Command Palette** — Power-user navigation that makes complexity feel manageable
4. **Empty/Loading/Error States** — Every state is a brand moment, not a gap
5. **Nerve Center Redesign** — Dashboard becomes mission control, not metrics dump
6. **Notification System** — Feedback that feels considered, not default
7. **Keyboard Navigation** — Power-user signal throughout
8. **Onboarding & Contextual Help** — Guide users through new nomenclature gracefully

---

## Design Philosophy for Phase 9

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   "The interface should feel like watching raw data get metabolized        │
│    into insight in real-time. Every transition, every animation,           │
│    every reveal should reinforce: complexity in, clarity out."             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Motion Principles (extend from brand bible)

| Principle | Implementation |
|-----------|----------------|
| **Purposeful, not decorative** | Every animation communicates something—data flowing, state changing, attention directing |
| **Intake → Process → Output** | Visual rhythm: gather (converge) → transform (pulse/glow) → reveal (expand/fade-in) |
| **Smooth, never bouncy** | Ease-out for entrances, ease-in for exits. No spring physics. Professional, not playful. |
| **Progressive disclosure** | Content reveals in sequence, guiding the eye. Never everything at once. |

### Timing Reference

| Context | Duration | Easing |
|---------|----------|--------|
| Micro-interactions (hover, press) | 150-200ms | ease-out |
| UI transitions (panels, modals) | 250-300ms | ease-in-out |
| Page transitions | 300-400ms | ease-out |
| Data reveals (charts, numbers) | 600-800ms | ease-out |
| Hero moments (dashboard load) | 800-1200ms | ease-out with stagger |

---

## Context for Claude Code

### Session Startup
```bash
# Read these files in order at session start:
cat CLAUDE.md STATUS.md ROADMAP.md ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md

# Also reference for brand values:
cat /mnt/project/OMNIVOR-LABS-STYLE-GUIDE.md
```

### Key Dependencies
- **Framer Motion** — Page transitions, layout animations, AnimatePresence
- **cmdk** — Command palette foundation
- **Recharts** — Already in stack, needs brand theming layer
- **clsx/tailwind-merge** — Conditional styling

### Files to Create/Modify
```
client/src/
├── lib/
│   ├── brand-config.ts          # Extended with motion/viz config
│   ├── chart-theme.ts           # NEW: Recharts brand theme
│   └── motion-config.ts         # NEW: Framer Motion presets
├── components/
│   ├── ui/
│   │   ├── command-palette.tsx  # NEW
│   │   ├── toast.tsx            # UPDATE: Brand styling
│   │   ├── skeleton.tsx         # UPDATE: Brand shimmer
│   │   └── empty-state.tsx      # NEW
│   ├── charts/
│   │   ├── branded-bar-chart.tsx    # NEW
│   │   ├── branded-line-chart.tsx   # NEW
│   │   ├── engagement-heatmap.tsx   # NEW
│   │   ├── animated-number.tsx      # NEW
│   │   └── spark-line.tsx           # NEW
│   ├── transitions/
│   │   ├── page-transition.tsx      # NEW
│   │   └── data-flow-transition.tsx # NEW
│   └── onboarding/
│       ├── feature-tooltip.tsx      # NEW
│       └── first-run-guide.tsx      # NEW
├── pages/
│   └── dashboard.tsx            # UPDATE: Nerve Center redesign
└── hooks/
    ├── use-keyboard-navigation.ts   # NEW
    └── use-command-palette.ts       # NEW
```

---

## Phase 9A: Data Visualization System

**Goal:** Charts that embody brand identity and create "aha moments"  
**Effort Estimate:** 10-14 hours  
**Dependencies:** Phase 8A (brand config) complete

### Why This First

The product *is* data visualization. If charts look generic, the brand polish elsewhere feels superficial. This is where users form judgments about product sophistication.

---

### M9A.1: Chart Theme Configuration

**File Creation** (`client/src/lib/chart-theme.ts`):

```typescript
import { BRAND_CONFIG } from './brand-config';

export const CHART_THEME = {
  // Color scales
  colors: {
    primary: [
      BRAND_CONFIG.colors.consumptionPurple,
      BRAND_CONFIG.colors.processViolet,
      '#c084fc', // purple-400
      '#e879f9', // fuchsia-400
    ],
    secondary: [
      BRAND_CONFIG.colors.catalystGold,
      '#fbbf24', // amber-400
      '#fb923c', // orange-400
      '#f87171', // red-400
    ],
    diverging: [
      BRAND_CONFIG.colors.consumptionPurple,
      BRAND_CONFIG.colors.dataGray,
      BRAND_CONFIG.colors.catalystGold,
    ],
    sequential: {
      purple: ['#1e1b4b', '#3730a3', '#6b21a8', '#a855f7', '#d8b4fe'],
      gold: ['#451a03', '#92400e', '#d97706', '#fbbf24', '#fef3c7'],
    },
  },
  
  // Typography
  text: {
    fontFamily: BRAND_CONFIG.typography.fontFamily,
    fill: BRAND_CONFIG.colors.dataGray,
    fontSize: 12,
  },
  
  // Axis styling
  axis: {
    stroke: BRAND_CONFIG.colors.borderGray,
    strokeWidth: 1,
  },
  
  // Grid
  grid: {
    stroke: BRAND_CONFIG.colors.borderGray,
    strokeDasharray: '3 3',
    opacity: 0.3,
  },
  
  // Tooltip
  tooltip: {
    background: 'rgba(10, 10, 11, 0.9)',
    border: `1px solid ${BRAND_CONFIG.colors.borderGray}`,
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },
  
  // Animation
  animation: {
    duration: 800,
    easing: 'ease-out',
  },
} as const;

// Recharts custom tooltip component
export const BrandedTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div style={CHART_THEME.tooltip} className="p-3">
      <p className="text-signal-white text-sm font-medium">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-data-gray text-xs">
          <span style={{ color: entry.color }}>●</span> {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
};
```

**Tasks:**
- [ ] Create `client/src/lib/chart-theme.ts`
- [ ] Define color scales (primary, secondary, diverging, sequential)
- [ ] Define typography, axis, grid, tooltip styles
- [ ] Create reusable tooltip component
- [ ] Export animation timing constants

**Acceptance Criteria:**
- Single source of truth for all chart styling
- Colors derive from brand-config.ts
- Theme is importable by all chart components

---

### M9A.2: Animated Number Counter

**File Creation** (`client/src/components/charts/animated-number.tsx`):

```typescript
interface AnimatedNumberProps {
  value: number;
  duration?: number;
  format?: 'number' | 'currency' | 'percent';
  prefix?: string;
  suffix?: string;
  className?: string;
  highlightColor?: 'gold' | 'purple' | 'white';
}

// Smoothly animates from 0 (or previous value) to target
// Uses requestAnimationFrame for 60fps
// Applies brand styling based on highlightColor
```

**Visual Specification:**
- Numbers count up on mount/value change
- Large numbers use Catalyst Gold (#d97706)
- Easing: ease-out over 800ms
- Format with locale-aware separators

**Tasks:**
- [ ] Create animated number component
- [ ] Implement RAF-based animation loop
- [ ] Add number formatting (toLocaleString, currency, percent)
- [ ] Add optional prefix/suffix
- [ ] Support value change re-animation

**Acceptance Criteria:**
- Numbers animate smoothly (60fps)
- Large metrics feel impactful
- Re-animates when value changes

---

### M9A.3: Branded Bar Chart

**File Creation** (`client/src/components/charts/branded-bar-chart.tsx`):

```typescript
interface BrandedBarChartProps {
  data: Array<{ name: string; value: number; [key: string]: any }>;
  dataKey: string;
  xAxisKey?: string;
  height?: number;
  showGrid?: boolean;
  animate?: boolean;
  gradient?: boolean;
  onBarClick?: (data: any) => void;
}
```

**Visual Specifications:**
- Bars use brand gradient (purple to violet) or solid purple
- Hover state: bar glows, tooltip appears
- Click state: bar scales slightly (0.98)
- Entrance animation: bars grow from bottom, staggered

**Gradient Definition:**
```tsx
<defs>
  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor="#a855f7" />
    <stop offset="100%" stopColor="#6b21a8" />
  </linearGradient>
</defs>
```

**Tasks:**
- [ ] Create branded bar chart wrapper
- [ ] Add gradient fill option
- [ ] Implement hover glow effect
- [ ] Add entrance animation (staggered bar growth)
- [ ] Integrate branded tooltip
- [ ] Add click handler support

**Acceptance Criteria:**
- Chart feels premium, not default
- Animations are smooth
- Consistent with brand aesthetic

---

### M9A.4: Branded Line Chart

**File Creation** (`client/src/components/charts/branded-line-chart.tsx`):

```typescript
interface BrandedLineChartProps {
  data: Array<{ [key: string]: any }>;
  lines: Array<{
    dataKey: string;
    name: string;
    color?: string;
    dashed?: boolean;
  }>;
  xAxisKey: string;
  height?: number;
  showDots?: boolean;
  showArea?: boolean;
  animate?: boolean;
}
```

**Visual Specifications:**
- Primary line: Consumption Purple, 2px stroke
- Secondary lines: Process Violet, Catalyst Gold
- Area fill: gradient from line color to transparent
- Dots: appear on hover only (reduce clutter)
- Entrance: line draws from left to right

**Tasks:**
- [ ] Create branded line chart wrapper
- [ ] Add area gradient fill option
- [ ] Implement line draw animation
- [ ] Add hover dot reveal
- [ ] Support multiple lines with legend
- [ ] Integrate branded tooltip

**Acceptance Criteria:**
- Line charts feel cohesive with brand
- Draw animation reinforces "data flow" metaphor
- Multiple lines are distinguishable

---

### M9A.5: Engagement Heatmap

**File Creation** (`client/src/components/charts/engagement-heatmap.tsx`):

```typescript
interface EngagementHeatmapProps {
  data: Array<{
    hcpId: string;
    channel: string;
    score: number;
  }>;
  channels: string[];
  onCellClick?: (hcpId: string, channel: string) => void;
}
```

**Visual Specifications:**
- Grid of cells, rows = HCPs, columns = channels
- Color scale: Void Black (0) → Purple (50) → Gold (100)
- Hover: cell border glows, tooltip shows exact value
- Entrance: cells fade in with stagger (top-left to bottom-right)

**Color Scale:**
```typescript
const heatmapScale = (value: number) => {
  if (value < 30) return 'rgba(10, 10, 11, 0.8)';     // Dark
  if (value < 50) return 'rgba(107, 33, 168, 0.5)';   // Purple low
  if (value < 70) return 'rgba(107, 33, 168, 0.8)';   // Purple mid
  if (value < 85) return 'rgba(168, 85, 247, 0.9)';   // Violet
  return 'rgba(217, 119, 6, 0.9)';                     // Gold (high)
};
```

**Tasks:**
- [ ] Create engagement heatmap component
- [ ] Implement color scale mapping
- [ ] Add cell hover states
- [ ] Add staggered entrance animation
- [ ] Support click handler for drill-down
- [ ] Add row/column labels with brand typography

**Acceptance Criteria:**
- Heatmap is immediately readable
- High engagement (gold) pops visually
- Feels like "signal processing" visualization

---

### M9A.6: Spark Line

**File Creation** (`client/src/components/charts/spark-line.tsx`):

```typescript
interface SparkLineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: 'purple' | 'gold' | 'gray';
  showEndDot?: boolean;
  trend?: 'up' | 'down' | 'flat';
}
```

**Visual Specifications:**
- Minimal line chart for inline/card use
- No axes, no labels—pure shape
- End dot in accent color if positive trend
- Subtle gradient fill below line

**Tasks:**
- [ ] Create spark line component (SVG-based, lightweight)
- [ ] Add color variants
- [ ] Add trend indicator (end dot color)
- [ ] Optional area fill
- [ ] Ensure tiny bundle size (no Recharts dependency)

**Acceptance Criteria:**
- Renders in <5ms
- Usable in cards, tables, tight spaces
- Communicates trend at a glance

---

### M9A.7: Chart Animation Utilities

**File Creation** (`client/src/lib/chart-animations.ts`):

```typescript
// Staggered entrance for multiple elements
export function staggeredEntrance(index: number, total: number): MotionProps {
  return {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: 0.5,
      delay: index * (0.8 / total), // Spread over 800ms
      ease: [0.16, 1, 0.3, 1],
    },
  };
}

// Number counting animation
export function useCountAnimation(target: number, duration = 800): number {
  // RAF-based counter implementation
}

// Chart draw animation (for line/path elements)
export function useDrawAnimation(pathLength: number): { strokeDashoffset: number } {
  // Animate from pathLength to 0
}
```

**Tasks:**
- [ ] Create chart animation utilities
- [ ] Implement staggered entrance helper
- [ ] Implement number counting hook
- [ ] Implement path draw animation hook

**Acceptance Criteria:**
- Reusable animation primitives
- Consistent timing across all charts
- Performant (60fps)

---

## Phase 9B: Page Transitions & Data Flow

**Goal:** Reinforce transformation metaphor through motion between views  
**Effort Estimate:** 8-10 hours  
**Dependencies:** Phase 9A animation utilities

### Why This Matters

This is the signature differentiator. When navigating from Cohort Lab → Scenario Lab, the audience count should visually *travel* to its new context. This creates the feeling of a living system, not disconnected pages.

---

### M9B.1: Motion Configuration

**File Creation** (`client/src/lib/motion-config.ts`):

```typescript
import { Variants, Transition } from 'framer-motion';

// Standard page transition
export const pageTransition: Transition = {
  duration: 0.35,
  ease: [0.16, 1, 0.3, 1], // ease-out
};

// Page variants
export const pageVariants: Variants = {
  initial: { 
    opacity: 0, 
    y: 8,
    filter: 'blur(4px)',
  },
  enter: { 
    opacity: 1, 
    y: 0,
    filter: 'blur(0px)',
    transition: pageTransition,
  },
  exit: { 
    opacity: 0, 
    y: -8,
    filter: 'blur(4px)',
    transition: { duration: 0.2 },
  },
};

// Shared element transition (for data flow)
export const sharedElementTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

// Stagger children
export const staggerContainer: Variants = {
  enter: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerChild: Variants = {
  initial: { opacity: 0, y: 12 },
  enter: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};
```

**Tasks:**
- [ ] Create motion config with all transition presets
- [ ] Define page variants (enter, exit)
- [ ] Define shared element transition config
- [ ] Define stagger presets for lists/grids

**Acceptance Criteria:**
- All motion timing centralized
- Presets are importable and reusable
- Consistent feel across app

---

### M9B.2: Page Transition Wrapper

**File Creation** (`client/src/components/transitions/page-transition.tsx`):

```typescript
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants } from '@/lib/motion-config';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={pageVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

**Tasks:**
- [ ] Create PageTransition wrapper component
- [ ] Integrate with router (Wouter)
- [ ] Add AnimatePresence at App level
- [ ] Ensure exit animations work correctly
- [ ] Test with all existing pages

**Implementation in App.tsx:**
```tsx
<AnimatePresence mode="wait">
  <Route path="/dashboard">
    <PageTransition key="dashboard">
      <Dashboard />
    </PageTransition>
  </Route>
  {/* ... */}
</AnimatePresence>
```

**Acceptance Criteria:**
- Pages fade/slide smoothly
- No flash of unstyled content
- Exit animations complete before enter

---

### M9B.3: Shared Element Transitions (Data Flow)

**File Creation** (`client/src/components/transitions/data-flow-transition.tsx`):

```typescript
import { motion } from 'framer-motion';

interface DataFlowElementProps {
  layoutId: string;
  children: React.ReactNode;
  className?: string;
}

// Wrap elements that should "travel" between pages
export function DataFlowElement({ layoutId, children, className }: DataFlowElementProps) {
  return (
    <motion.div
      layoutId={layoutId}
      className={className}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
    >
      {children}
    </motion.div>
  );
}
```

**Use Cases:**
1. **Audience count** in Cohort Lab → count travels to Scenario Lab header
2. **HCP card** in Signal Index → expands into detail view
3. **Metric value** on Nerve Center → travels to detail page

**Example Implementation:**
```tsx
// In Cohort Lab
<DataFlowElement layoutId="audience-count">
  <span className="text-catalyst-gold text-2xl">{audienceCount}</span>
</DataFlowElement>

// In Scenario Lab header
<DataFlowElement layoutId="audience-count">
  <span className="text-catalyst-gold text-lg">{audienceCount} HCPs</span>
</DataFlowElement>
```

**Tasks:**
- [ ] Create DataFlowElement wrapper
- [ ] Identify key data points that flow between views
- [ ] Implement audience count flow (Cohort Lab → Scenario Lab)
- [ ] Implement HCP card expansion (Signal Index → HCP Detail)
- [ ] Test transitions across navigation paths

**Acceptance Criteria:**
- Data visually "travels" between contexts
- Reinforces transformation metaphor
- Doesn't break if elements aren't both mounted

---

### M9B.4: Content Stagger Animations

**File Creation** (`client/src/components/transitions/stagger-container.tsx`):

```typescript
import { motion } from 'framer-motion';
import { staggerContainer, staggerChild } from '@/lib/motion-config';

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggerContainer({ children, className, staggerDelay = 0.05 }: StaggerContainerProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="enter"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerChild} className={className}>
      {children}
    </motion.div>
  );
}
```

**Tasks:**
- [ ] Create StaggerContainer and StaggerItem components
- [ ] Apply to Signal Index card grid
- [ ] Apply to Nerve Center metrics
- [ ] Apply to list views throughout app

**Acceptance Criteria:**
- Lists/grids animate in with stagger
- Feels like content is "revealing"
- Performant with large lists (virtualize if needed)

---

## Phase 9C: Command Palette

**Goal:** Power-user navigation that makes complexity manageable  
**Effort Estimate:** 6-8 hours  
**Dependencies:** Brand config, navigation structure

### Why This Matters

Every modern power tool has ⌘K. It signals sophistication and provides escape hatch when users forget the new nomenclature. "What was HCP Explorer called again?" → just type "HCP" and it's there.

---

### M9C.1: Command Palette Foundation

**File Creation** (`client/src/components/ui/command-palette.tsx`):

```typescript
import { Command } from 'cmdk';
import { useBrand } from '@/contexts/BrandContext';

// Categories:
// - Navigation (go to pages)
// - Actions (create, export, etc.)
// - Recent (recently viewed HCPs, audiences)
// - Search (find HCPs, audiences by name)

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const { config } = useBrand();
  
  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      className="command-palette"
    >
      <Command.Input 
        placeholder="Type a command or search..."
        className="..."
      />
      <Command.List>
        <Command.Group heading="Navigation">
          {Object.entries(config.modules).map(([key, module]) => (
            <Command.Item
              key={key}
              onSelect={() => navigate(`/${module.id}`)}
            >
              <Icon name={module.icon} />
              <span>{module.label}</span>
              <span className="text-muted-gray text-xs">
                {getModuleDescription(key)}
              </span>
            </Command.Item>
          ))}
        </Command.Group>
        
        <Command.Group heading="Actions">
          <Command.Item onSelect={createNewAudience}>
            <Icon name="plus" />
            Create New Audience
          </Command.Item>
          <Command.Item onSelect={exportData}>
            <Icon name="download" />
            Export Data
          </Command.Item>
        </Command.Group>
        
        <Command.Group heading="Recent">
          {/* Dynamically populated */}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
```

**Styling (brand-aligned):**
```css
.command-palette {
  background: rgba(10, 10, 11, 0.95);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border-gray);
  border-radius: 16px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
  max-width: 640px;
  width: 90vw;
}

.command-palette [cmdk-input] {
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border-gray);
  padding: 16px 20px;
  font-size: 1.125rem;
  color: var(--signal-white);
}

.command-palette [cmdk-item] {
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
}

.command-palette [cmdk-item][aria-selected="true"] {
  background: rgba(107, 33, 168, 0.2);
}
```

**Tasks:**
- [ ] Install cmdk: `npm install cmdk`
- [ ] Create CommandPalette component
- [ ] Add navigation commands (all modules with old/new name searchable)
- [ ] Add action commands (create, export, etc.)
- [ ] Add recent items section
- [ ] Style per brand spec (glass effect, purple highlight)

**Acceptance Criteria:**
- ⌘K (Mac) / Ctrl+K (Win) opens palette
- Can navigate to any module
- Can search by old names ("HCP Explorer") AND new names ("Signal Index")
- Feels fast and responsive

---

### M9C.2: Global Keyboard Handler

**File Creation** (`client/src/hooks/use-command-palette.ts`):

```typescript
import { useEffect, useState } from 'react';

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  return { open, setOpen };
}
```

**Tasks:**
- [ ] Create keyboard handler hook
- [ ] Integrate at App level
- [ ] Handle Escape to close
- [ ] Prevent default browser behavior

**Acceptance Criteria:**
- Keyboard shortcut works globally
- Doesn't interfere with text inputs
- Escape closes cleanly

---

### M9C.3: Search Integration

**Extend command palette with real search:**

```typescript
// Search HCPs by name
<Command.Group heading="HCPs">
  {searchResults.hcps.map(hcp => (
    <Command.Item 
      key={hcp.id}
      onSelect={() => navigate(`/signal-index/${hcp.id}`)}
    >
      <Avatar name={hcp.name} size="sm" />
      <div>
        <span>{hcp.name}</span>
        <span className="text-muted-gray text-xs">{hcp.specialty}</span>
      </div>
    </Command.Item>
  ))}
</Command.Group>

// Search Audiences
<Command.Group heading="Audiences">
  {searchResults.audiences.map(audience => (
    <Command.Item
      key={audience.id}
      onSelect={() => navigate(`/cohort-lab/${audience.id}`)}
    >
      <Icon name="users" />
      <span>{audience.name}</span>
      <span className="text-muted-gray text-xs">{audience.hcpCount} HCPs</span>
    </Command.Item>
  ))}
</Command.Group>
```

**Tasks:**
- [ ] Add debounced search query
- [ ] Search HCPs by name
- [ ] Search saved audiences by name
- [ ] Show results in grouped sections
- [ ] Handle empty state ("No results for...")

**Acceptance Criteria:**
- Real-time search as user types
- Results appear fast (<200ms perceived)
- Clear grouping of result types

---

## Phase 9D: Empty, Loading & Error States

**Goal:** Every state is a brand moment  
**Effort Estimate:** 4-6 hours  
**Dependencies:** Brand config, animation utilities

### Why This Matters

Users spend significant time in loading/empty states, especially on first use. These are prime moments to reinforce brand quality, not show generic spinners.

---

### M9D.1: Branded Skeleton Loader

**File Update** (`client/src/components/ui/skeleton.tsx`):

```typescript
interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'card' | 'text' | 'avatar';
}

export function Skeleton({ className, variant = 'default' }: SkeletonProps) {
  return (
    <div 
      className={cn(
        'animate-shimmer bg-gradient-to-r from-border-gray via-muted-gray/20 to-border-gray bg-[length:200%_100%]',
        variantStyles[variant],
        className
      )}
    />
  );
}
```

**Shimmer Animation:**
```css
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.animate-shimmer {
  animation: shimmer 1.5s ease-in-out infinite;
}
```

**Color:** Use purple-tinted gradient, not gray:
```css
background: linear-gradient(
  90deg,
  rgba(39, 39, 42, 1) 0%,
  rgba(107, 33, 168, 0.1) 50%,
  rgba(39, 39, 42, 1) 100%
);
```

**Tasks:**
- [ ] Update skeleton component with brand shimmer
- [ ] Add variant shapes (card, text line, avatar circle)
- [ ] Create skeleton presets for common layouts (HCP card, metric card)
- [ ] Test animation performance

**Acceptance Criteria:**
- Skeletons have purple tint, not plain gray
- Shimmer animation is smooth
- Feels premium, not generic

---

### M9D.2: Empty State Component

**File Creation** (`client/src/components/ui/empty-state.tsx`):

```typescript
interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'search' | 'error';
}

export function EmptyState({ title, description, icon, action, variant = 'default' }: EmptyStateProps) {
  return (
    <motion.div 
      className="flex flex-col items-center justify-center py-16"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Convergence animation background */}
      <div className="relative mb-6">
        <ConvergenceAnimation size="sm" />
        <Icon name={icon || 'inbox'} className="absolute inset-0 m-auto text-muted-gray" size={32} />
      </div>
      
      <h3 className="text-signal-white text-lg font-semibold mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-data-gray text-sm max-w-sm text-center mb-6">
          {description}
        </p>
      )}
      
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}
```

**Brand Copy for Empty States:**
```typescript
export const EMPTY_STATE_COPY = {
  signalIndex: {
    title: "No signals yet.",
    description: "Connect your data sources and let OmniVor feed.",
    action: "Connect Channels",
  },
  cohortLab: {
    title: "No audiences captured.",
    description: "Build your first audience using natural language queries.",
    action: "Create Audience",
  },
  searchNoResults: {
    title: "No signals match.",
    description: "Try adjusting your filters or search terms.",
  },
  scenarioLab: {
    title: "No scenarios projected.",
    description: "Select an audience and define your engagement strategy.",
    action: "New Scenario",
  },
};
```

**Tasks:**
- [ ] Create EmptyState component with animation
- [ ] Add convergence animation element
- [ ] Define brand copy for all empty states
- [ ] Add action button option
- [ ] Create variant styles (default, search, error)

**Acceptance Criteria:**
- Empty states feel intentional, not broken
- Brand voice is consistent
- Clear path to action

---

### M9D.3: Convergence Loading Animation

**File Creation** (`client/src/components/ui/convergence-animation.tsx`):

```typescript
interface ConvergenceAnimationProps {
  size?: 'sm' | 'md' | 'lg';
  speed?: 'slow' | 'normal' | 'fast';
}

// CSS-based animation of dots/signals converging to center
// Represents data being "consumed" and processed
```

**Animation Concept:**
- 6-8 small dots arranged in a circle
- Dots pulse inward toward center
- Center point glows gold briefly when dots converge
- Repeats continuously

**Tasks:**
- [ ] Create convergence animation component
- [ ] Implement with CSS keyframes (not JS for performance)
- [ ] Add size variants
- [ ] Add speed control
- [ ] Use as loading indicator throughout app

**Acceptance Criteria:**
- Animation reinforces brand metaphor
- Performant (pure CSS)
- Usable in multiple contexts

---

### M9D.4: Error State Component

**File Creation** (`client/src/components/ui/error-state.tsx`):

```typescript
interface ErrorStateProps {
  title?: string;
  message?: string;
  retry?: () => void;
}

export function ErrorState({ 
  title = "Connection interrupted.", 
  message = "Reconnecting now.",
  retry 
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <Icon name="alert-circle" className="text-red-400" size={24} />
      </div>
      
      <h3 className="text-signal-white font-semibold mb-1">{title}</h3>
      <p className="text-data-gray text-sm mb-4">{message}</p>
      
      {retry && (
        <Button variant="ghost" onClick={retry} size="sm">
          Try Again
        </Button>
      )}
    </div>
  );
}
```

**Tasks:**
- [ ] Create ErrorState component
- [ ] Style with subtle red accent (not alarming)
- [ ] Add retry option
- [ ] Use brand voice (never apologetic)

**Acceptance Criteria:**
- Errors feel recoverable
- Brand voice maintained (no "Oops!" or "Sorry!")
- Clear action to retry

---

## Phase 9E: Nerve Center (Dashboard) Redesign

**Goal:** Transform dashboard into branded mission control  
**Effort Estimate:** 8-10 hours  
**Dependencies:** Phase 9A charts, 9B transitions, 9D states

### Why This Matters

This is the first screen after login. Signal Index got Phase 8's attention—Dashboard needs the same treatment to complete the story.

---

### M9E.1: Welcome Message Component

**File Creation** (`client/src/components/dashboard/welcome-message.tsx`):

```typescript
interface WelcomeMessageProps {
  signalCount: number;
  patternCount: number;
  userName?: string;
}

export function WelcomeMessage({ signalCount, patternCount, userName }: WelcomeMessageProps) {
  return (
    <motion.div 
      className="mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <h1 className="text-2xl font-bold text-signal-white mb-2">
        {userName ? `Welcome back, ${userName}.` : 'Welcome back.'}
      </h1>
      <p className="text-data-gray">
        OmniVor has processed{' '}
        <AnimatedNumber value={signalCount} highlightColor="gold" />{' '}
        signals since your last session.{' '}
        <AnimatedNumber value={patternCount} highlightColor="purple" />{' '}
        patterns have crystallized.
      </p>
    </motion.div>
  );
}
```

**Tasks:**
- [ ] Create welcome message component
- [ ] Integrate AnimatedNumber for signal/pattern counts
- [ ] Add entrance animation
- [ ] Fetch actual metrics from API

**Acceptance Criteria:**
- Personalized, data-driven welcome
- Numbers animate on load
- Sets tone for session

---

### M9E.2: Metric Cards Grid

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ SIGNALS PROCESSED│  │ ACTIVE AUDIENCES│  │ SCENARIOS RUN  │             │
│  │     12,847       │  │       23        │  │       8        │             │
│  │  ↑ 14% vs last   │  │  3 need action  │  │  2 pending     │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ PATTERNS FOUND  │  │ CHANNEL HEALTH  │  │ ACTIONS QUEUED │             │
│  │       47        │  │    72% HEALTHY  │  │       156      │             │
│  │  5 new today    │  │  2 channels low │  │  24 high-pri   │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Tasks:**
- [ ] Create MetricCard component per brand spec
- [ ] Implement 6-card grid layout
- [ ] Add animated number counters
- [ ] Add trend indicators (↑↓)
- [ ] Add secondary metric line
- [ ] Stagger entrance animation

**Acceptance Criteria:**
- Metrics are scannable at a glance
- Numbers animate on load
- Trends are clear (green up, red down)

---

### M9E.3: Activity Feed / Pattern Highlights

**Section:** "Patterns Crystallized" — Recent insights surfaced by OmniVor

```typescript
interface PatternHighlight {
  id: string;
  title: string;
  description: string;
  severity: 'insight' | 'warning' | 'opportunity';
  timestamp: Date;
  relatedHcpCount?: number;
}

export function PatternHighlights({ patterns }: { patterns: PatternHighlight[] }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-signal-white mb-4">
        Patterns Crystallized
      </h2>
      
      <StaggerContainer className="space-y-3">
        {patterns.map(pattern => (
          <StaggerItem key={pattern.id}>
            <PatternCard pattern={pattern} />
          </StaggerItem>
        ))}
      </StaggerContainer>
    </section>
  );
}
```

**Pattern Card Design:**
- Left border accent (purple for insight, gold for opportunity, orange for warning)
- Title + description
- Timestamp (relative: "3 hours ago")
- Action: "View Details →"

**Tasks:**
- [ ] Create PatternCard component
- [ ] Create PatternHighlights section
- [ ] Style severity variants
- [ ] Add click to expand/navigate
- [ ] Connect to real insight data (or mock for demo)

**Acceptance Criteria:**
- Dashboard shows actionable intelligence
- Patterns feel surfaced, not listed
- Clear path to drill down

---

### M9E.4: Quick Actions Panel

**Section:** Fast access to common workflows

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  QUICK ACTIONS                                                              │
│                                                                             │
│  [+ New Audience]  [Run Scenario]  [Export Report]  [Signal Diagnostic]    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Tasks:**
- [ ] Create QuickActions component
- [ ] Add 4-5 common action buttons
- [ ] Style as secondary/ghost buttons
- [ ] Connect to navigation/modals

**Acceptance Criteria:**
- Common actions are one click away
- Doesn't clutter the page

---

### M9E.5: Dashboard Page Assembly

**File Update** (`client/src/pages/dashboard.tsx`):

**Tasks:**
- [ ] Compose all new components into dashboard
- [ ] Add PageTransition wrapper
- [ ] Ensure data fetching with loading states
- [ ] Test full animation sequence
- [ ] Mobile responsive layout

**Acceptance Criteria:**
- Dashboard feels like mission control
- All animations play in sequence
- Data is real (or convincingly mocked)

---

## Phase 9F: Notification & Toast System

**Goal:** Feedback that feels considered  
**Effort Estimate:** 3-4 hours  
**Dependencies:** Brand config

---

### M9F.1: Branded Toast Component

**File Update** (`client/src/components/ui/toast.tsx`):

```typescript
const toastVariants = {
  success: {
    background: 'rgba(10, 10, 11, 0.95)',
    border: '1px solid rgba(217, 119, 6, 0.3)',
    icon: 'check-circle',
    iconColor: 'text-catalyst-gold',
  },
  error: {
    background: 'rgba(10, 10, 11, 0.95)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    icon: 'alert-circle',
    iconColor: 'text-red-400',
  },
  info: {
    background: 'rgba(10, 10, 11, 0.95)',
    border: '1px solid rgba(107, 33, 168, 0.3)',
    icon: 'info',
    iconColor: 'text-consumption-purple',
  },
  loading: {
    background: 'rgba(10, 10, 11, 0.95)',
    border: '1px solid rgba(113, 113, 122, 0.3)',
    icon: 'loader', // animated
    iconColor: 'text-data-gray',
  },
};
```

**Animation:**
- Slide in from bottom-right
- Subtle scale (0.95 → 1)
- Auto-dismiss with progress bar
- Hover pauses auto-dismiss

**Tasks:**
- [ ] Update toast component with brand styling
- [ ] Add variant styles (success, error, info, loading)
- [ ] Add entrance/exit animations
- [ ] Add progress bar for auto-dismiss
- [ ] Test all variants

**Acceptance Criteria:**
- Toasts match brand aesthetic
- Animations are smooth
- Clear visual distinction between types

---

## Phase 9G: Keyboard Navigation

**Goal:** Power-user signal throughout the app  
**Effort Estimate:** 4-5 hours  
**Dependencies:** Command palette

---

### M9G.1: Keyboard Navigation Hook

**File Creation** (`client/src/hooks/use-keyboard-navigation.ts`):

```typescript
interface KeyboardNavigationOptions {
  items: string[]; // IDs of navigable items
  onSelect: (id: string) => void;
  onAction?: (id: string, action: 'edit' | 'delete' | 'view') => void;
  enabled?: boolean;
}

export function useKeyboardNavigation({
  items,
  onSelect,
  onAction,
  enabled = true,
}: KeyboardNavigationOptions) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  
  useEffect(() => {
    if (!enabled) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => Math.min(prev + 1, items.length - 1));
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          onSelect(items[focusedIndex]);
          break;
        case 'e':
          if (onAction) onAction(items[focusedIndex], 'edit');
          break;
        // etc.
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, items, focusedIndex, onSelect, onAction]);
  
  return { focusedIndex, setFocusedIndex };
}
```

**Shortcuts:**
| Key | Action |
|-----|--------|
| `j` / `↓` | Next item |
| `k` / `↑` | Previous item |
| `Enter` | Select/Open |
| `e` | Edit |
| `d` | Delete (with confirm) |
| `/` | Focus search |
| `?` | Show shortcuts help |

**Tasks:**
- [ ] Create keyboard navigation hook
- [ ] Implement J/K navigation for lists
- [ ] Add visual focus indicator
- [ ] Create shortcuts help modal (`?`)
- [ ] Apply to Signal Index, Cohort Lab lists

**Acceptance Criteria:**
- Can navigate lists without mouse
- Focus state is clearly visible
- `?` shows available shortcuts

---

## Phase 9H: Onboarding & Contextual Help

**Goal:** Guide users through new nomenclature gracefully  
**Effort Estimate:** 5-6 hours  
**Dependencies:** All prior Phase 9 work

---

### M9H.1: Feature Tooltip Component

**File Creation** (`client/src/components/onboarding/feature-tooltip.tsx`):

```typescript
interface FeatureTooltipProps {
  id: string; // For tracking dismissal
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
}

export function FeatureTooltip({ id, title, description, position = 'bottom', children }: FeatureTooltipProps) {
  const [dismissed, setDismissed] = useState(() => 
    localStorage.getItem(`tooltip_dismissed_${id}`) === 'true'
  );
  
  if (dismissed) return <>{children}</>;
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={position} className="max-w-xs">
        <div className="space-y-2">
          <p className="font-semibold text-signal-white">{title}</p>
          <p className="text-data-gray text-sm">{description}</p>
          <button 
            onClick={() => {
              localStorage.setItem(`tooltip_dismissed_${id}`, 'true');
              setDismissed(true);
            }}
            className="text-xs text-consumption-purple hover:underline"
          >
            Got it
          </button>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
```

**Use Case:** Explain new nomenclature
```tsx
<FeatureTooltip
  id="signal-index-rename"
  title="Signal Index"
  description="Formerly HCP Explorer. Browse and search your complete HCP ecosystem."
>
  <NavItem icon="search" label="Signal Index" />
</FeatureTooltip>
```

**Tasks:**
- [ ] Create FeatureTooltip component
- [ ] Track dismissal in localStorage
- [ ] Add to renamed navigation items
- [ ] Style per brand spec

**Acceptance Criteria:**
- First-time users get context
- Tooltips don't repeat after dismissal
- Non-intrusive

---

### M9H.2: Keyboard Shortcuts Help Modal

**File Creation** (`client/src/components/onboarding/shortcuts-modal.tsx`):

```typescript
const SHORTCUTS = [
  { key: '⌘ K', description: 'Open command palette' },
  { key: 'J / K', description: 'Navigate up/down in lists' },
  { key: 'Enter', description: 'Select item' },
  { key: '/', description: 'Focus search' },
  { key: '?', description: 'Show this help' },
  { key: 'Esc', description: 'Close modal/palette' },
];

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-modal">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4">
          {SHORTCUTS.map(({ key, description }) => (
            <div key={key} className="flex items-center gap-3">
              <kbd className="bg-border-gray px-2 py-1 rounded text-sm font-mono">
                {key}
              </kbd>
              <span className="text-data-gray text-sm">{description}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Tasks:**
- [ ] Create shortcuts help modal
- [ ] Trigger on `?` key
- [ ] Style per brand spec
- [ ] Keep list updated as shortcuts evolve

**Acceptance Criteria:**
- `?` opens help anywhere in app
- All shortcuts documented
- Easy to scan

---

## Summary: Phase 9 Effort Estimates

| Sub-Phase | Description | Effort | Dependencies |
|-----------|-------------|--------|--------------|
| 9A | Data Visualization System | 10-14h | Phase 8A |
| 9B | Page Transitions & Data Flow | 8-10h | 9A animations |
| 9C | Command Palette | 6-8h | Brand config |
| 9D | Empty/Loading/Error States | 4-6h | Brand config |
| 9E | Nerve Center Redesign | 8-10h | 9A, 9B, 9D |
| 9F | Notification System | 3-4h | Brand config |
| 9G | Keyboard Navigation | 4-5h | 9C |
| 9H | Onboarding & Contextual Help | 5-6h | All |
| **Total** | | **48-63h** | |

---

## Execution Notes

### For Claude Code Sessions

1. **Start each session:** `cat CLAUDE.md STATUS.md ROADMAP.md ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md`
2. **Phase 9A first** — Charts are foundational for dashboard
3. **Test animations** in browser after each component (60fps target)
4. **Update STATUS.md** after each milestone
5. **Run checks:** `npm run check && npm test && npm run build`

### Animation Performance Checklist

Before completing any animation task:
- [ ] Uses CSS transforms (not layout properties)
- [ ] Uses `will-change` sparingly
- [ ] Tests smooth on 2x CPU throttle in DevTools
- [ ] Respects `prefers-reduced-motion`

### Sub-Phase Completion Checklist

- [ ] All milestones completed
- [ ] Animations verified at 60fps
- [ ] TypeScript compiles clean
- [ ] Build succeeds
- [ ] STATUS.md updated
- [ ] Browser tested (Chrome, Safari at minimum)

---

## Future Reference: Deferred Items

### Sound Design (Phase 10+)
Save for v2 when product-market fit is validated. Considerations:
- Subtle confirmation sounds (success, send, complete)
- Optional/off-by-default
- Test with enterprise users before committing
- Reference: Stripe Dashboard, Linear (both do this well)

### Tablet/Responsive (Veeva Integration Phase)
When preparing for Veeva/Salesforce integrations:
- Touch target optimization (44px minimum)
- Swipe gestures for navigation
- Landscape optimization for iPad
- Offline-first considerations for field reps
- Reference existing pharma field tools for conventions

### Print/Export Styling (Client Request)
Implement when client specifically requests:
- Branded PDF headers/footers
- Chart export with brand colors
- Report templates
- Consider using Puppeteer for server-side PDF generation

---

*Roadmap generated: 2026-01-16*  
*Source: Claude.ai analysis session*  
*Project: OmniVor — Strategic Intelligence Platform*  
*Phase: 9 — Interaction & Experience Design*
