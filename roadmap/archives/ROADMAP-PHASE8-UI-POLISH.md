# ROADMAP: OmniVor Phase 8 — UI/Design Polish & Branding

**Goal:** Transform TwinEngine into a fully-branded OmniVor platform with premium UI finishes and white-label readiness  
**Target:** Demo-ready product with distinctive visual identity  
**Mode:** Milestone-based (Supervised Autonomous)  
**Prerequisite:** Phase 7 Complete (Orchestration Intelligence)  
**Generated:** 2026-01-16

---

## Executive Summary

Phase 8 applies the OmniVor Labs brand system comprehensively across the platform. This phase transforms the functional TwinEngine codebase into a polished, differentiated product that communicates sophistication and strategic intelligence—the "Figma/Linear/Notion of pharma marketing."

**Key Outcomes:**
1. Platform renamed to **OmniVor** (product) under **OMNIVOR LABS** (company)
2. Splash page showcases brand with rotating taglines
3. All modules renamed per brand nomenclature (conservative approach)
4. White-label architecture for future client customization
5. Premium HCP Explorer (Signal Index) with high-end UI finishes
6. OmniVor Labs section in navigation for company/product info

---

## Brand Reference Quick Card

```
╔═══════════════════════════════════════════════════════════════════════════╗
║  OMNIVOR LABS BRAND QUICK REFERENCE                                       ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  COLORS                                                                   ║
║  ├─ Void Black:         #0a0a0b  (primary background)                    ║
║  ├─ Consumption Purple: #6b21a8  (brand primary, LABS text)              ║
║  ├─ Process Violet:     #a855f7  (hover states, gradients)               ║
║  ├─ Catalyst Gold:      #d97706  (CTAs, metrics, accent)                 ║
║  ├─ Signal White:       #fafafa  (primary text on dark)                  ║
║  ├─ Data Gray:          #71717a  (secondary text)                        ║
║  ├─ Muted Gray:         #52525b  (tertiary text, labels)                 ║
║  └─ Border Gray:        #27272a  (subtle borders)                        ║
║                                                                           ║
║  TYPOGRAPHY: Inter                                                        ║
║  ├─ OMNIVOR wordmark:   900 weight, 0.1em spacing                        ║
║  ├─ LABS wordmark:      300 weight, 0.1em spacing, purple                ║
║  ├─ Display:            900 weight, 0.1em spacing                        ║
║  ├─ H1:                 700 weight, 2.5rem                               ║
║  ├─ Body:               400 weight, 1rem                                 ║
║  └─ Labels:             600 weight, 0.625rem, ALL CAPS                   ║
║                                                                           ║
║  TAGLINES (for rotation)                                                  ║
║  ├─ "Feeds on complexity." (primary)                                     ║
║  ├─ "Nothing wasted. Nothing missed."                                    ║
║  ├─ "Complexity, metabolized."                                           ║
║  └─ "Raw data in. Evolved insight out."                                  ║
║                                                                           ║
║  MODULE NAMING                                                            ║
║  ├─ Dashboard        → Nerve Center                                      ║
║  ├─ HCP Explorer     → Signal Index                                      ║
║  ├─ Audience Builder → Cohort Lab                                        ║
║  ├─ Simulations      → Scenario Lab                                      ║
║  ├─ Diagnostics      → Signal Diagnostic                                 ║
║  └─ NBA Queue        → Catalyst Queue                                    ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## Context for Claude Code

### Session Startup
```bash
# Read these files in order at session start:
cat CLAUDE.md STATUS.md ROADMAP.md ROADMAP-PHASE8-UI-POLISH.md
```

### Brand Asset Files
- `/mnt/project/OMNIVOR_LABS___Brand_BibleVersion1_1.md` — Complete brand bible
- `/mnt/project/OMNIVOR-LABS-STYLE-GUIDE.md` — Style guide reference

### Key Patterns
- **Centralized theming:** All brand values in `client/src/lib/brand-config.ts`
- **White-label ready:** Use CSS variables and config objects, never hardcode brand strings
- **Component-level tokens:** Theme tokens flow through shadcn/ui theme provider
- **Animation timing:** 200-400ms for UI, up to 1s for hero animations, ease-out curves

### Constraints
- Maintain test coverage (add visual regression tests where possible)
- Bundle size discipline (prefer CSS animations over JS when equivalent)
- Accessibility: all interactive elements need focus states, 4.5:1 contrast minimum
- Mobile responsive for all new components

---

## Architecture: White-Label Brand System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BRAND CONFIGURATION LAYER                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  client/src/lib/brand-config.ts                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  export const BRAND_CONFIG = {                                       │    │
│  │    company: { name, legalName, taglines[], logoUrl, ... },          │    │
│  │    product: { name, displayName, ... },                             │    │
│  │    modules: { signalIndex, cohortLab, scenarioLab, ... },           │    │
│  │    colors: { voidBlack, consumptionPurple, catalystGold, ... },     │    │
│  │    typography: { fontFamily, weights, sizes },                       │    │
│  │    copy: { welcomeMessage, emptyStates, loadingStates, ... },       │    │
│  │  }                                                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                    ┌───────────────┴───────────────┐                        │
│                    ▼                               ▼                        │
│         CSS Variables (runtime)           React Context (components)        │
│         ┌─────────────────┐               ┌─────────────────────┐          │
│         │ :root {         │               │ <BrandProvider>     │          │
│         │   --void-black  │               │   useBrand()        │          │
│         │   --purple      │               │   useModuleName()   │          │
│         │   --gold        │               │   useTagline()      │          │
│         │ }               │               │ </BrandProvider>    │          │
│         └─────────────────┘               └─────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 8A: Brand Configuration Infrastructure

**Goal:** Create centralized, white-label-ready brand configuration system  
**Effort Estimate:** 4-6 hours  
**Dependencies:** None (foundational)

### Why This First

Every subsequent task references brand values. A centralized config prevents scattered magic strings and makes future white-labeling trivial.

---

### M8A.1: Brand Configuration Module

**File Creation** (`client/src/lib/brand-config.ts`):

```typescript
// Core brand configuration - single source of truth
export const BRAND_CONFIG = {
  // Company (appears on splash, footer, legal)
  company: {
    name: "OMNIVOR LABS",
    legalName: "OMNIVOR LABS",
    shortName: "OMNIVOR",
    copyright: `© ${new Date().getFullYear()} OMNIVOR LABS`,
  },
  
  // Product (appears in-app after login)
  product: {
    name: "OmniVor",
    displayName: "OmniVor",
    tagline: "Feeds on complexity.",
  },
  
  // Rotating taglines for splash page
  taglines: [
    { text: "Feeds on complexity.", tone: "primary" },
    { text: "Nothing wasted. Nothing missed.", tone: "conservative" },
    { text: "Complexity, metabolized.", tone: "technical" },
    { text: "Raw data in. Evolved insight out.", tone: "explanatory" },
  ],
  
  // Module names (brand nomenclature)
  modules: {
    dashboard: { id: "nerve-center", label: "Nerve Center", icon: "activity" },
    hcpExplorer: { id: "signal-index", label: "Signal Index", icon: "search" },
    audienceBuilder: { id: "cohort-lab", label: "Cohort Lab", icon: "users" },
    simulations: { id: "scenario-lab", label: "Scenario Lab", icon: "flask" },
    diagnostics: { id: "signal-diagnostic", label: "Signal Diagnostic", icon: "stethoscope" },
    actionQueue: { id: "catalyst-queue", label: "Catalyst Queue", icon: "zap" },
    omnivorLabs: { id: "omnivor-labs", label: "OmniVor Labs", icon: "hexagon" },
  },
  
  // Colors (CSS variable names for easy swap)
  colors: {
    voidBlack: "#0a0a0b",
    consumptionPurple: "#6b21a8",
    processViolet: "#a855f7",
    catalystGold: "#d97706",
    signalWhite: "#fafafa",
    dataGray: "#71717a",
    mutedGray: "#52525b",
    borderGray: "#27272a",
  },
  
  // Typography
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontImport: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap",
  },
  
  // Brand voice copy patterns
  copy: {
    loading: "Processing...",
    loadingAlt: "Consuming signals...",
    empty: "No signals yet.",
    emptyConnect: "Connect channels to begin.",
    error: "Connection interrupted. Reconnecting.",
    success: (n: number) => `Analysis complete. ${n} insights ready.`,
    welcome: (signals: number, patterns: number) => 
      `OmniVor has processed ${signals.toLocaleString()} signals since your last session. ${patterns} patterns have crystallized.`,
  },
} as const;

// Type exports for strong typing throughout app
export type BrandConfig = typeof BRAND_CONFIG;
export type ModuleKey = keyof typeof BRAND_CONFIG.modules;
export type ColorKey = keyof typeof BRAND_CONFIG.colors;
```

**Tasks:**
- [ ] Create `client/src/lib/brand-config.ts` with complete brand configuration
- [ ] Add JSDoc comments for white-label documentation
- [ ] Export helper functions: `getModuleName()`, `getColor()`, `getRandomTagline()`
- [ ] Add config validation (Zod schema for type safety)

**Acceptance Criteria:**
- All brand values accessible from single import
- TypeScript provides autocomplete for all brand keys
- No magic strings in component code

---

### M8A.2: CSS Variable System

**File Updates** (`client/src/index.css`):

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

:root {
  /* === OMNIVOR LABS BRAND PALETTE === */
  
  /* Primary */
  --void-black: #0a0a0b;
  --consumption-purple: #6b21a8;
  
  /* Secondary */
  --process-violet: #a855f7;
  --catalyst-gold: #d97706;
  --signal-white: #fafafa;
  
  /* Supporting */
  --data-gray: #71717a;
  --muted-gray: #52525b;
  --border-gray: #27272a;
  
  /* Semantic mappings (for shadcn/ui integration) */
  --background: var(--void-black);
  --foreground: var(--signal-white);
  --card: var(--void-black);
  --card-foreground: var(--signal-white);
  --primary: var(--consumption-purple);
  --primary-foreground: var(--signal-white);
  --secondary: var(--border-gray);
  --secondary-foreground: var(--signal-white);
  --accent: var(--catalyst-gold);
  --accent-foreground: var(--void-black);
  --muted: var(--muted-gray);
  --muted-foreground: var(--data-gray);
  --border: var(--border-gray);
  --ring: var(--consumption-purple);
  
  /* Typography */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  
  /* Animation timings (brand spec) */
  --duration-micro: 150ms;
  --duration-ui: 250ms;
  --duration-page: 350ms;
  --duration-hero: 800ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  
  /* Gradients */
  --gradient-brand: linear-gradient(135deg, var(--consumption-purple) 0%, #4c1d95 100%);
  --gradient-glow: radial-gradient(ellipse at center, rgba(107, 33, 168, 0.15) 0%, transparent 70%);
  --gradient-transform: linear-gradient(90deg, rgba(107, 33, 168, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%);
}

/* Light mode overrides (secondary, keep for accessibility) */
.light {
  --background: var(--signal-white);
  --foreground: var(--void-black);
  --card: var(--signal-white);
  --card-foreground: var(--void-black);
}
```

**Tasks:**
- [ ] Update `client/src/index.css` with complete brand CSS variables
- [ ] Map brand colors to shadcn/ui semantic tokens
- [ ] Add animation timing variables
- [ ] Add gradient definitions
- [ ] Test all existing components still render correctly

**Acceptance Criteria:**
- Brand colors available throughout app via CSS variables
- Existing shadcn/ui components inherit brand colors
- Dark mode is primary, light mode secondary

---

### M8A.3: Brand Context Provider

**File Creation** (`client/src/contexts/BrandContext.tsx`):

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { BRAND_CONFIG, ModuleKey } from '@/lib/brand-config';

interface BrandContextValue {
  config: typeof BRAND_CONFIG;
  currentTagline: string;
  rotateTagline: () => void;
  getModuleName: (key: ModuleKey) => string;
}

const BrandContext = createContext<BrandContextValue | null>(null);

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [taglineIndex, setTaglineIndex] = useState(0);
  
  // Rotate tagline on mount (session-based rotation)
  useEffect(() => {
    const stored = sessionStorage.getItem('omnivor_tagline_index');
    if (stored) {
      setTaglineIndex((parseInt(stored, 10) + 1) % BRAND_CONFIG.taglines.length);
    }
    sessionStorage.setItem('omnivor_tagline_index', String(taglineIndex));
  }, []);
  
  const rotateTagline = () => {
    setTaglineIndex((prev) => (prev + 1) % BRAND_CONFIG.taglines.length);
  };
  
  const getModuleName = (key: ModuleKey): string => {
    return BRAND_CONFIG.modules[key]?.label ?? key;
  };
  
  return (
    <BrandContext.Provider value={{
      config: BRAND_CONFIG,
      currentTagline: BRAND_CONFIG.taglines[taglineIndex].text,
      rotateTagline,
      getModuleName,
    }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (!context) throw new Error('useBrand must be used within BrandProvider');
  return context;
}
```

**Tasks:**
- [ ] Create `client/src/contexts/BrandContext.tsx`
- [ ] Implement session-based tagline rotation
- [ ] Add helper hooks: `useBrand()`, `useModuleName()`, `useTagline()`
- [ ] Wrap App with BrandProvider
- [ ] Add tests for tagline rotation logic

**Acceptance Criteria:**
- Tagline rotates across sessions (not page refreshes within session)
- Components can access brand config via hooks
- TypeScript provides full type safety

---

## Phase 8B: Splash Page Rebrand

**Goal:** Transform splash/login page into branded OmniVor experience  
**Effort Estimate:** 6-8 hours  
**Dependencies:** Phase 8A complete

### Why This Matters

First impression. The splash page must immediately communicate: sophisticated, intelligent, enterprise-grade. No generic SaaS vibes.

---

### M8B.1: Wordmark Component

**File Creation** (`client/src/components/brand/Wordmark.tsx`):

```typescript
interface WordmarkProps {
  variant: 'split' | 'heavy';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Split: OMNIVOR (black 900) LABS (light 300 purple)
// Heavy: OMNIVOR LABS (both black 900, LABS purple)
export function Wordmark({ variant, size = 'md', className }: WordmarkProps) {
  // Implementation per brand spec
}
```

**Tasks:**
- [ ] Create `client/src/components/brand/Wordmark.tsx`
- [ ] Implement "Split Emphasis" variant (primary)
- [ ] Implement "Heavy Extended" variant (splash pages)
- [ ] Add size variants (responsive)
- [ ] Ensure correct Inter weights and letter-spacing

**Acceptance Criteria:**
- Wordmark matches brand bible spec exactly
- Both variants available
- Responsive sizing

---

### M8B.2: Splash Page Redesign

**File Update** (`client/src/pages/login.tsx` or equivalent):

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          [Hero Glow Gradient BG]                            │
│                                                                             │
│                     ┌────────────────────────────┐                          │
│                     │                            │                          │
│                     │     OMNIVOR LABS           │  ← Heavy Extended        │
│                     │                            │    Wordmark              │
│                     │    "Feeds on complexity."  │  ← Rotating tagline      │
│                     │                            │                          │
│                     │   ┌──────────────────────┐ │                          │
│                     │   │  Enter invite code   │ │  ← Invite code input     │
│                     │   └──────────────────────┘ │                          │
│                     │                            │                          │
│                     │   [  Access OmniVor  ]     │  ← CTA button (gold)     │
│                     │                            │                          │
│                     └────────────────────────────┘                          │
│                                                                             │
│                     Processing. Transforming. Delivering.                   │
│                     ──────────────────────────────────────                  │
│                     [subtle animation: signals converging]                  │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  © 2026 OMNIVOR LABS                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Visual Specifications:**
- Background: Void Black (#0a0a0b) with Hero Glow gradient
- Wordmark: Heavy Extended variant, centered
- Tagline: Inter Light (300), 1.25rem, Signal White, subtle fade animation
- Input: Dark input with purple focus ring
- CTA: Catalyst Gold background, Void Black text
- Animation: Convergence pattern (signals flowing inward) — subtle, CSS-based

**Tasks:**
- [ ] Redesign splash page layout per wireframe
- [ ] Integrate Wordmark component (Heavy Extended)
- [ ] Add rotating tagline with cross-fade animation
- [ ] Style invite code input per brand spec
- [ ] Style CTA button (Catalyst Gold accent)
- [ ] Add hero glow background gradient
- [ ] Add subtle convergence animation (CSS keyframes, not JS)
- [ ] Add footer with copyright
- [ ] Mobile responsive

**CSS Animation (convergence pattern):**
```css
@keyframes converge {
  0% { transform: scale(1.1); opacity: 0.3; }
  50% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(0.9); opacity: 0.3; }
}

.hero-glow {
  background: radial-gradient(ellipse at center, rgba(107, 33, 168, 0.15) 0%, transparent 70%);
  animation: converge 8s ease-in-out infinite;
}
```

**Acceptance Criteria:**
- Splash page matches brand aesthetic
- Tagline rotates across sessions
- All elements properly branded
- Mobile responsive
- Performant (no jank on animations)

---

### M8B.3: Tagline Rotation System

**Implementation Details:**

```typescript
// Session-based rotation (different tagline each visit)
useEffect(() => {
  const stored = sessionStorage.getItem('omnivor_tagline_index');
  const newIndex = stored 
    ? (parseInt(stored, 10) + 1) % BRAND_CONFIG.taglines.length 
    : 0;
  sessionStorage.setItem('omnivor_tagline_index', String(newIndex));
  setTaglineIndex(newIndex);
}, []);
```

**Tagline display with animation:**
```tsx
<motion.p
  key={currentTagline}
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -10 }}
  transition={{ duration: 0.5, ease: "easeOut" }}
  className="text-signal-white/80 text-lg tracking-wide"
>
  {currentTagline}
</motion.p>
```

**Tasks:**
- [ ] Implement session-based tagline rotation
- [ ] Add cross-fade animation between taglines
- [ ] Store rotation state in sessionStorage
- [ ] Add Framer Motion AnimatePresence for smooth transitions

**Acceptance Criteria:**
- Each session shows different tagline
- Transition animation is smooth
- All four taglines cycle through

---

## Phase 8C: Navigation & Module Naming

**Goal:** Apply brand nomenclature to all navigation and module headers  
**Effort Estimate:** 4-6 hours  
**Dependencies:** Phase 8A complete

---

### M8C.1: Left Navigation Rebrand

**Current → Branded:**
| Current | Branded | Icon |
|---------|---------|------|
| Dashboard | Nerve Center | activity |
| HCP Explorer | Signal Index | search |
| Audience Builder | Cohort Lab | users |
| Simulations | Scenario Lab | flask-conical |
| Diagnostics | Signal Diagnostic | stethoscope |
| Action Queue | Catalyst Queue | zap |
| **NEW** | OmniVor Labs | hexagon |

**Tasks:**
- [ ] Update `client/src/components/Navigation.tsx` (or equivalent)
- [ ] Replace hardcoded labels with `useBrand().getModuleName()`
- [ ] Update icon mappings per brand spec
- [ ] Add "OmniVor Labs" section at bottom of nav
- [ ] Style active state: Consumption Purple background, Signal White text
- [ ] Style hover state: subtle purple glow

**Nav Item Styling:**
```css
.nav-item {
  padding: 12px 16px;
  border-radius: 8px;
  transition: all var(--duration-ui) var(--ease-out);
}

.nav-item:hover {
  background: rgba(107, 33, 168, 0.1);
}

.nav-item.active {
  background: var(--consumption-purple);
  color: var(--signal-white);
}
```

**Acceptance Criteria:**
- All nav items use brand nomenclature
- OmniVor Labs section added
- Styling matches brand spec

---

### M8C.2: OmniVor Labs Section

**Purpose:** Company/product info, settings, help — distinct from data modules

**Content:**
- About OmniVor (brief product description)
- Version info
- Support/Help links
- Settings (theme toggle, preferences)

**Tasks:**
- [ ] Add "OmniVor Labs" nav section (collapsible)
- [ ] Create `client/src/pages/omnivor-labs.tsx` landing page
- [ ] Add sub-items: About, Settings, Help
- [ ] Style with brand accent (different from data modules)

**Acceptance Criteria:**
- OmniVor Labs section distinct in nav
- Landing page provides product context
- Settings accessible

---

### M8C.3: Page Headers & Breadcrumbs

**Tasks:**
- [ ] Update all page headers to use branded module names
- [ ] Add breadcrumb component with brand styling
- [ ] Ensure consistent header typography (H1: 700 weight, 2.5rem)

**Acceptance Criteria:**
- All pages show correct branded names
- Consistent header styling throughout

---

## Phase 8D: Signal Index (HCP Explorer) Premium Redesign

**Goal:** Transform HCP Explorer into a showcase module with high-end UI finishes  
**Effort Estimate:** 12-16 hours  
**Dependencies:** Phase 8A, 8C complete

### Why Signal Index

This is the primary data exploration interface. Making it visually impressive demonstrates product sophistication.

---

### M8D.1: Card Component System

**New Card Variants:**

```typescript
interface SignalCardProps {
  variant: 'default' | 'elevated' | 'accent' | 'glass';
  glowOnHover?: boolean;
  selected?: boolean;
}
```

**Styling per variant:**

```css
/* Default Card */
.signal-card-default {
  background: var(--void-black);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
}

/* Elevated Card (for featured HCPs) */
.signal-card-elevated {
  background: linear-gradient(135deg, rgba(107, 33, 168, 0.1) 0%, var(--void-black) 100%);
  border: 1px solid rgba(107, 33, 168, 0.2);
  border-radius: 20px;
  box-shadow: 0 4px 24px rgba(107, 33, 168, 0.1);
}

/* Glass Card (modals, overlays) */
.signal-card-glass {
  background: rgba(10, 10, 11, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
}

/* Hover Glow Effect */
.signal-card[data-glow="true"]:hover {
  border-color: rgba(107, 33, 168, 0.4);
  box-shadow: 0 0 20px rgba(107, 33, 168, 0.15);
}
```

**Tasks:**
- [ ] Create `client/src/components/ui/signal-card.tsx`
- [ ] Implement all four variants
- [ ] Add hover glow effect (toggle via prop)
- [ ] Add selected state styling
- [ ] Add entrance animation (Framer Motion)

**Acceptance Criteria:**
- All card variants match brand spec
- Hover states feel premium
- Animations are smooth (60fps)

---

### M8D.2: HCP Profile Cards Redesign

**New Card Layout:**
```
┌────────────────────────────────────────────────────────────────┐
│  [Specialty Icon]                              [Engagement ●●○] │
│                                                                 │
│  Dr. Sarah Chen                                                 │
│  Oncology • Boston, MA                                          │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Email    Rep     Digital    Events    Webinar    Content │ │
│  │   72      45        81         --        63         55    │ │
│  │  ████    ███      █████       --       ████       ███    │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Last Contact: 3 days ago                     [View Profile →] │
└────────────────────────────────────────────────────────────────┘
```

**Visual Specifications:**
- Specialty icon with accent color in top-left
- Engagement indicator (dots or mini-bar)
- Channel engagement mini-bars (gold for high, gray for low)
- Hover: card lifts slightly, glow edge appears

**Tasks:**
- [ ] Redesign HCP card component
- [ ] Add specialty icon system (10 specialties)
- [ ] Add channel engagement mini-visualization
- [ ] Implement hover state (lift + glow)
- [ ] Add selection checkbox (for multi-select mode)

**Acceptance Criteria:**
- Cards are visually scannable
- Specialty visible at a glance
- Channel health visible without clicking
- Hover feels premium

---

### M8D.3: View Customization Pane

**New Feature:** Module-level view customization panel

**Location:** Top of Signal Index, collapsible panel

**Controls:**
- View mode toggle: Grid / List / Compact
- Sort by: Name / Engagement Score / Last Contact / Specialty
- Visible columns (for list view)
- Density: Comfortable / Compact
- Save as default view

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ▼ Customize View                                          [Save as Default] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  VIEW      [Grid ●] [List] [Compact]     SORT BY   [Engagement Score ▼]    │
│                                                                             │
│  DENSITY   [Comfortable ●] [Compact]     SHOW      ☑ Email  ☑ Rep  ☑ Dig  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Tasks:**
- [ ] Create `client/src/components/ViewCustomizer.tsx`
- [ ] Implement view mode toggles
- [ ] Implement sort controls
- [ ] Implement column visibility (list view)
- [ ] Persist preferences to localStorage
- [ ] Animate panel expand/collapse

**Acceptance Criteria:**
- Users can customize their view
- Preferences persist
- Panel animates smoothly

---

### M8D.4: Interactive Hover States & Micro-interactions

**Hover Effects:**
- Card lift (translateY -2px)
- Glow edge (purple border glow)
- Content reveal (quick actions fade in)

**Micro-interactions:**
- Button press: scale 0.98, spring back
- Selection: checkbox pulse + card border highlight
- Filter apply: subtle shake on filtered results
- Loading: skeleton shimmer (purple tint)

**Tasks:**
- [ ] Implement card hover states
- [ ] Add button press animations
- [ ] Add selection micro-interactions
- [ ] Add loading skeleton with brand-colored shimmer
- [ ] Ensure all animations respect `prefers-reduced-motion`

**Acceptance Criteria:**
- All interactive elements have feedback
- Animations feel premium but not distracting
- Reduced motion is respected

---

### M8D.5: Glass Modals & Overlays

**Styling for modals:**
```css
.glass-modal {
  background: rgba(10, 10, 11, 0.85);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(107, 33, 168, 0.2);
  border-radius: 20px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
}

.glass-modal-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
```

**Tasks:**
- [ ] Update modal component with glass styling
- [ ] Add entrance animation (fade + scale from 0.95)
- [ ] Add backdrop blur
- [ ] Ensure focus trapping works correctly

**Acceptance Criteria:**
- Modals feel premium and modern
- Glass effect is subtle but visible
- Animations are smooth

---

## Phase 8E: Global UI Polish

**Goal:** Apply brand finishes across all modules consistently  
**Effort Estimate:** 8-10 hours  
**Dependencies:** Phase 8A-8D patterns established

---

### M8E.1: Button System Update

**Button Variants (per brand spec):**

| Variant | Background | Text | Border | Use |
|---------|------------|------|--------|-----|
| Primary | #6b21a8 | #fafafa | none | Main actions |
| Secondary | transparent | #6b21a8 | 1px #6b21a8 | Alternative actions |
| Accent | #d97706 | #0a0a0b | none | High-priority CTAs |
| Ghost | transparent | #fafafa | 1px rgba(255,255,255,0.1) | Subtle actions |

**Tasks:**
- [ ] Update shadcn Button component variants
- [ ] Add hover states (scale, glow)
- [ ] Add press states (scale 0.98)
- [ ] Audit all buttons in app, apply correct variant

**Acceptance Criteria:**
- All buttons match brand spec
- Consistent styling throughout app

---

### M8E.2: Form Elements

**Input styling:**
```css
.brand-input {
  background: var(--void-black);
  border: 1px solid var(--border-gray);
  border-radius: 8px;
  padding: 12px 16px;
  color: var(--signal-white);
  transition: all var(--duration-ui) var(--ease-out);
}

.brand-input:focus {
  border-color: var(--consumption-purple);
  box-shadow: 0 0 0 2px rgba(107, 33, 168, 0.2);
  outline: none;
}
```

**Tasks:**
- [ ] Update Input component styling
- [ ] Update Select component styling
- [ ] Update Checkbox/Radio styling
- [ ] Audit all forms in app

**Acceptance Criteria:**
- All form elements match brand spec
- Focus states are clear and branded

---

### M8E.3: Metrics Display Components

**Metric Card Pattern:**
```
┌─────────────────────────┐
│  SIGNALS PROCESSED      │  ← Label: 0.625rem, #52525b, uppercase
│  2,847                  │  ← Value: 2.5rem, #d97706, weight 800
│  14 patterns crystallized│  ← Subtext: 0.875rem, #71717a
└─────────────────────────┘
```

**Tasks:**
- [ ] Create `client/src/components/ui/metric-card.tsx`
- [ ] Implement standard metric display pattern
- [ ] Add animated number counting (on mount)
- [ ] Add delta indicators (up/down arrows, green/red)

**Acceptance Criteria:**
- Metrics display consistently
- Numbers animate on load
- Deltas are clear

---

### M8E.4: Copy Voice Update

**Replace generic copy with brand voice:**

| Before | After |
|--------|-------|
| "Loading..." | "Processing..." |
| "No results found" | "No signals match." |
| "Download" | "Extract data" |
| "Save" | "Capture" |
| "Error occurred" | "Connection interrupted." |
| "Welcome back" | "OmniVor has processed X signals since your last session." |

**Tasks:**
- [ ] Audit all UI copy strings
- [ ] Create `client/src/lib/brand-copy.ts` for centralized strings
- [ ] Replace hardcoded strings with brand copy
- [ ] Test all states (loading, error, empty, success)

**Acceptance Criteria:**
- All UI copy matches brand voice
- No generic/apologetic language
- Copy is confident and direct

---

## Phase 8F: White-Label Preparation

**Goal:** Document and structure for future white-label customization  
**Effort Estimate:** 3-4 hours  
**Dependencies:** All prior Phase 8 work

---

### M8F.1: White-Label Configuration Schema

**File Creation** (`client/src/lib/white-label.ts`):

```typescript
// Schema for white-label override
export interface WhiteLabelConfig {
  company: {
    name: string;
    legalName: string;
    logoUrl?: string;
    faviconUrl?: string;
  };
  product: {
    name: string;
    tagline: string;
  };
  colors: {
    primary: string;    // Replaces consumption-purple
    accent: string;     // Replaces catalyst-gold
    background: string; // Replaces void-black
    foreground: string; // Replaces signal-white
  };
  modules?: {
    [key: string]: { label: string; icon?: string };
  };
}

// Merge function: overlay client config on base brand
export function mergeWhiteLabelConfig(
  baseConfig: typeof BRAND_CONFIG,
  clientConfig: Partial<WhiteLabelConfig>
): typeof BRAND_CONFIG {
  // Deep merge implementation
}
```

**Tasks:**
- [ ] Create white-label config schema
- [ ] Implement config merge function
- [ ] Document white-label customization process
- [ ] Add example client config file

**Acceptance Criteria:**
- Clear path for client customization
- Documentation for handoff
- No hardcoded brand references in core components

---

### M8F.2: White-Label Documentation

**File Creation** (`docs/WHITE-LABEL-GUIDE.md`):

**Contents:**
1. Overview of customization points
2. Color replacement guide
3. Logo/wordmark replacement
4. Module naming customization
5. Copy/voice customization
6. Build process for white-label version

**Tasks:**
- [ ] Create comprehensive white-label guide
- [ ] Include code examples
- [ ] Document all touchpoints

**Acceptance Criteria:**
- Developer can customize for new client in <2 hours
- All customization points documented

---

## Summary: Phase 8 Effort Estimates

| Sub-Phase | Description | Effort | Dependencies |
|-----------|-------------|--------|--------------|
| 8A | Brand Configuration | 4-6h | None |
| 8B | Splash Page Rebrand | 6-8h | 8A |
| 8C | Navigation & Naming | 4-6h | 8A |
| 8D | Signal Index Premium UI | 12-16h | 8A, 8C |
| 8E | Global UI Polish | 8-10h | 8A-8D patterns |
| 8F | White-Label Prep | 3-4h | All |
| **Total** | | **37-50h** | |

---

## Execution Notes

### For Claude Code Sessions

1. **Start each session by reading:** `CLAUDE.md`, `STATUS.md`, `ROADMAP.md`, `ROADMAP-PHASE8-UI-POLISH.md`
2. **Work one milestone at a time** within each sub-phase
3. **Update `STATUS.md`** after each milestone completion
4. **Run tests after each significant change:** `npm run check && npm test`
5. **Build verification:** `npm run build`
6. **Visual verification:** Check splash page and Signal Index in browser after each UI change

### Sub-Phase Completion Checklist

- [ ] All milestones completed
- [ ] Visual QA passed (check in browser, mobile viewport)
- [ ] TypeScript compiles clean
- [ ] Build succeeds
- [ ] STATUS.md updated
- [ ] Screenshots captured for documentation

### Brand Consistency Checklist

Before marking any UI task complete:
- [ ] Colors match brand palette (no off-brand colors)
- [ ] Typography uses Inter with correct weights
- [ ] Animations use brand timing (200-400ms UI, up to 1s hero)
- [ ] Copy uses brand voice (confident, direct, no apologies)
- [ ] Module names use brand nomenclature

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Brand consistency drift | Use brand-config.ts for all values, no magic strings |
| Animation performance | Prefer CSS animations, test on low-end devices |
| White-label complexity | Document thoroughly, test merge function |
| Visual regression | Consider adding visual regression tests (Percy, Chromatic) |

---

## Appendix A: Brand Color CSS Variables Reference

```css
/* Copy-paste ready */
:root {
  --void-black: #0a0a0b;
  --consumption-purple: #6b21a8;
  --process-violet: #a855f7;
  --catalyst-gold: #d97706;
  --signal-white: #fafafa;
  --data-gray: #71717a;
  --muted-gray: #52525b;
  --border-gray: #27272a;
}
```

## Appendix B: Typography Quick Reference

```css
/* Wordmark - Split Emphasis */
.wordmark-omnivor { font-weight: 900; letter-spacing: 0.1em; }
.wordmark-labs { font-weight: 300; letter-spacing: 0.1em; color: #6b21a8; }

/* Wordmark - Heavy Extended */
.wordmark-heavy { font-weight: 900; letter-spacing: 0.18em; }
.wordmark-heavy .labs { color: #6b21a8; }

/* Display */
.display { font-size: 4rem; font-weight: 900; letter-spacing: 0.1em; line-height: 1.1; }

/* H1 */
.h1 { font-size: 2.5rem; font-weight: 700; letter-spacing: 0.02em; line-height: 1.2; }

/* Body */
.body { font-size: 1rem; font-weight: 400; line-height: 1.6; }

/* Label */
.label { font-size: 0.625rem; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; }
```

## Appendix C: Animation Timing

```css
:root {
  --duration-micro: 150ms;   /* Micro-interactions */
  --duration-ui: 250ms;      /* UI transitions */
  --duration-page: 350ms;    /* Page transitions */
  --duration-hero: 800ms;    /* Hero animations */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
}
```

---

*Roadmap generated: 2026-01-16*  
*Source: Claude.ai analysis session*  
*Project: OmniVor — Strategic Intelligence Platform*  
*Phase: 8 — UI/Design Polish & Branding*
