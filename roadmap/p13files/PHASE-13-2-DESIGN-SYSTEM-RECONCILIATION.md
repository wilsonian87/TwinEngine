# PHASE 13.2: Design System Reconciliation — Light Mode Default

**Generated:** 2026-01-20  
**Purpose:** Define light-mode-first design system, reconcile with existing brand guide, establish OmniVor Labs + OmniVor sister branding  
**Predecessor:** Brand Bible v1.1 (dark-mode-first)

---

## Executive Summary

Current brand guide establishes Void Black (#0a0a0b) as primary background. This update shifts to **light mode default** with dark mode available via toggle. The goal is premium simplicity (Apple, Lululemon reference) — high-gloss accents where they count, not overwhelming.

**Key Changes:**
- Off-white (#fafafa) as default page background
- White (#ffffff) for content cards and containers
- Dark elements reserved for: nav bar, tooltips, overlays, modals (optional)
- Purple and Gold as accents, not dominant
- Sister branding for OmniVor Labs (company) and OmniVor (platform)

---

## Part 1: Brand Hierarchy — Sister Branding

### Brand Architecture

```
OMNIVOR LABS (Company/Parent)
    │
    └── OMNIVOR (Platform/Product)
```

**Usage Guidelines:**

| Context | Brand to Use | Example |
|---------|--------------|---------|
| Legal, copyright, company references | OMNIVOR LABS | "© 2026 OMNIVOR LABS" |
| Marketing, website, splash pages | OMNIVOR LABS | "OMNIVOR LABS — Strategic Intelligence" |
| In-app, product UI, features | OMNIVOR | "OMNIVOR has processed 847 signals" |
| API documentation, technical | OMNIVOR | "Connect to the OMNIVOR API" |
| White-label contexts | Client brand | Configurable |

### Visual Identity — Matching Luggage

Both brands share core visual DNA but with hierarchy-appropriate weight:

| Element | OMNIVOR LABS | OMNIVOR |
|---------|--------------|---------|
| Wordmark weight | OMNIVOR (900) + LABS (300) | OMNIVOR (700) alone |
| Primary color | Consumption Purple (#6b21a8) | Consumption Purple (#6b21a8) |
| Accent color | Catalyst Gold (#d97706) | Catalyst Gold (#d97706) |
| Typography | Inter | Inter |
| Tone | Corporate, authoritative | Product, capable |

### Logo Variants

**OMNIVOR LABS (Primary — Company)**
```
OMNIVOR LABS
  Black    Light
  (900)    (300)
```
- On light backgrounds: OMNIVOR in Void Black, LABS in Purple
- On dark backgrounds: OMNIVOR in Signal White, LABS in Purple
- On purple backgrounds: OMNIVOR in Signal White, LABS in Gold

**OMNIVOR (Secondary — Product)**
```
OMNIVOR
  Bold (700)
```
- Standalone product mark
- Used in app chrome, product UI
- Same color rules as company mark (minus "LABS")

---

## Part 2: Color System — Light Mode Default

### Background Hierarchy

| Layer | Light Mode (Default) | Dark Mode (Toggle) | Usage |
|-------|---------------------|-------------------|-------|
| Page background | Off-white `#fafafa` | Void Black `#0a0a0b` | Body, main content area |
| Card background | White `#ffffff` | Zinc 900 `#18181b` | Content cards, panels |
| Elevated surface | White `#ffffff` + shadow | Zinc 800 `#27272a` | Modals, dropdowns, drawers |
| Inset/well | Zinc 50 `#fafafa` | Zinc 950 `#09090b` | Table rows, input backgrounds |

### Text Colors

| Role | Light Mode | Dark Mode |
|------|-----------|-----------|
| Primary text | Zinc 900 `#18181b` | Signal White `#fafafa` |
| Secondary text | Zinc 500 `#71717a` | Zinc 400 `#a1a1aa` |
| Muted text | Zinc 400 `#a1a1aa` | Zinc 500 `#71717a` |
| Placeholder | Zinc 400 `#a1a1aa` | Zinc 600 `#52525b` |

### Border Colors

| Role | Light Mode | Dark Mode |
|------|-----------|-----------|
| Default border | Zinc 200 `#e4e4e7` | Zinc 800 `#27272a` |
| Strong border | Zinc 300 `#d4d4d8` | Zinc 700 `#3f3f46` |
| Focus ring | Purple 600 `#9333ea` | Purple 500 `#a855f7` |

### Accent Application

**Consumption Purple (#6b21a8):**
- ✅ Primary buttons (background)
- ✅ Links (text color)
- ✅ Active navigation items
- ✅ Focus rings
- ✅ Progress indicators
- ❌ NOT for: backgrounds of containers, dominant page sections

**Catalyst Gold (#d97706):**
- ✅ CTA buttons (sparingly)
- ✅ Key metrics and KPIs
- ✅ Success states
- ✅ Highlights requiring attention
- ❌ NOT for: general UI, non-critical elements

**Process Violet (#a855f7):**
- ✅ Hover states on purple elements
- ✅ Gradients (purple → violet)
- ✅ Secondary emphasis

### Dark Elements (Preserved)

These elements remain dark in both modes:
- Navigation sidebar (optional — see variants below)
- Tooltips
- Dropdown menus
- Command palette overlay
- Toast notifications (dark variant)

---

## Part 3: CSS Custom Properties

### Updated Variables

```css
:root {
  /* ============================================
     LIGHT MODE (DEFAULT)
     ============================================ */
  
  /* Backgrounds */
  --background: 0 0% 98%;           /* #fafafa - Off-white page bg */
  --foreground: 240 10% 10%;        /* #18181b - Primary text */
  
  --card: 0 0% 100%;                /* #ffffff - Card background */
  --card-foreground: 240 10% 10%;   /* #18181b */
  
  --popover: 0 0% 100%;             /* #ffffff */
  --popover-foreground: 240 10% 10%;
  
  /* Muted/Secondary */
  --muted: 240 5% 96%;              /* #f4f4f5 - Muted background */
  --muted-foreground: 240 4% 46%;   /* #71717a - Secondary text */
  
  /* Borders */
  --border: 240 6% 90%;             /* #e4e4e7 - Subtle border */
  --input: 240 6% 90%;              /* #e4e4e7 - Input border */
  --ring: 270 70% 45%;              /* #9333ea - Focus ring (purple) */
  
  /* Brand Colors */
  --primary: 270 70% 40%;           /* #6b21a8 - Consumption Purple */
  --primary-foreground: 0 0% 98%;   /* #fafafa - White on purple */
  
  --secondary: 240 5% 96%;          /* #f4f4f5 - Light gray */
  --secondary-foreground: 240 10% 10%;
  
  --accent: 30 95% 44%;             /* #d97706 - Catalyst Gold */
  --accent-foreground: 240 10% 10%; /* Dark text on gold */
  
  /* Semantic */
  --destructive: 0 84% 60%;         /* #ef4444 - Error red */
  --destructive-foreground: 0 0% 98%;
  
  /* Chart Colors */
  --chart-1: 270 70% 40%;           /* Purple */
  --chart-2: 30 95% 44%;            /* Gold */
  --chart-3: 262 83% 58%;           /* Violet */
  --chart-4: 240 5% 46%;            /* Gray */
  --chart-5: 270 70% 60%;           /* Light purple */
  
  /* Radius */
  --radius: 0.5rem;
  
  /* Sidebar (Light variant) */
  --sidebar-background: 0 0% 100%;
  --sidebar-foreground: 240 10% 10%;
  --sidebar-primary: 270 70% 40%;
  --sidebar-primary-foreground: 0 0% 98%;
  --sidebar-accent: 240 5% 96%;
  --sidebar-accent-foreground: 240 10% 10%;
  --sidebar-border: 240 6% 90%;
  --sidebar-ring: 270 70% 45%;
}

[data-theme="dark"],
.dark {
  /* ============================================
     DARK MODE (TOGGLE)
     ============================================ */
  
  /* Backgrounds */
  --background: 240 10% 4%;         /* #0a0a0b - Void Black */
  --foreground: 0 0% 98%;           /* #fafafa - Signal White */
  
  --card: 240 6% 10%;               /* #18181b - Zinc 900 */
  --card-foreground: 0 0% 98%;
  
  --popover: 240 6% 10%;
  --popover-foreground: 0 0% 98%;
  
  /* Muted/Secondary */
  --muted: 240 4% 16%;              /* #27272a */
  --muted-foreground: 240 5% 65%;   /* #a1a1aa */
  
  /* Borders */
  --border: 240 4% 16%;             /* #27272a */
  --input: 240 4% 16%;
  --ring: 270 60% 60%;              /* #a855f7 - Lighter purple for visibility */
  
  /* Brand Colors (same hues, adjusted for dark) */
  --primary: 270 60% 60%;           /* #a855f7 - Process Violet (lighter) */
  --primary-foreground: 240 10% 4%;
  
  --secondary: 240 4% 16%;
  --secondary-foreground: 0 0% 98%;
  
  --accent: 30 95% 50%;             /* Slightly lighter gold */
  --accent-foreground: 240 10% 4%;
  
  /* Semantic */
  --destructive: 0 62% 50%;         /* Adjusted for dark */
  --destructive-foreground: 0 0% 98%;
  
  /* Chart Colors (adjusted for dark bg) */
  --chart-1: 270 60% 60%;
  --chart-2: 30 95% 55%;
  --chart-3: 262 83% 68%;
  --chart-4: 240 5% 65%;
  --chart-5: 270 60% 75%;
  
  /* Sidebar (Dark) */
  --sidebar-background: 240 10% 4%;
  --sidebar-foreground: 0 0% 98%;
  --sidebar-primary: 270 60% 60%;
  --sidebar-primary-foreground: 0 0% 98%;
  --sidebar-accent: 240 4% 16%;
  --sidebar-accent-foreground: 0 0% 98%;
  --sidebar-border: 240 4% 16%;
  --sidebar-ring: 270 60% 60%;
}
```

### Theme Toggle Implementation

```tsx
// client/src/components/theme-provider.tsx
// Ensure default is 'light' not 'system' or 'dark'

const defaultTheme = 'light'; // Changed from 'system'

// On mount, check localStorage or default to light
useEffect(() => {
  const stored = localStorage.getItem('theme');
  if (!stored) {
    setTheme('light');
    document.documentElement.classList.remove('dark');
  }
}, []);
```

---

## Part 4: Component Audit Checklist

### Components Requiring Light Mode Updates

#### High Priority (Visible on every page)

- [ ] **AppSidebar** — Currently uses dark background
  - Option A: Keep dark sidebar (provides contrast, anchors interface)
  - Option B: Light sidebar matching page background
  - **Recommendation:** Keep dark sidebar as anchor element
  
- [ ] **Header bar** — Check background color
  
- [ ] **Card components** — Ensure white background, not transparent
  - `SignalCard`
  - `MetricCard`
  - Generic `Card` from shadcn

- [ ] **Table rows** — Add subtle alternating backgrounds or borders

- [ ] **Form inputs** — White background, visible border

#### Medium Priority (Feature-specific)

- [ ] **HCP Profile Card** — Update hover states, shadows
- [ ] **Dashboard metrics** — Ensure chart backgrounds work on light
- [ ] **Channel health radial** — Check SVG colors
- [ ] **Simulation results** — Card styling
- [ ] **Action queue rows** — Zebra striping or card approach

#### Low Priority (System/Admin)

- [ ] **Settings page** — Form styling
- [ ] **Agent manager** — Card styling
- [ ] **Constraints page** — Form styling

### Shadow System (Light Mode)

Add depth without dark backgrounds:

```css
/* Shadow scale for light mode */
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

/* Card hover lift */
--shadow-hover: 0 10px 40px -10px rgb(107 33 168 / 0.15);
```

---

## Part 5: High-Impact Visual Wins (Low Effort)

### 1. Card Shadow + Hover Lift
**Effort:** 1 hour  
**Impact:** Immediately premium feel

```css
.card {
  background: white;
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.2s, transform 0.2s;
}

.card:hover {
  box-shadow: var(--shadow-hover);
  transform: translateY(-2px);
}
```

### 2. Increased Whitespace in Data Tables
**Effort:** 30 minutes  
**Impact:** Reduces visual noise, improves scannability

```css
.table td {
  padding: 16px 12px; /* Up from 8px 12px */
}

.table th {
  padding: 12px;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
}
```

### 3. Subtle Page Background Gradient
**Effort:** 15 minutes  
**Impact:** Adds depth without being distracting

```css
body {
  background: linear-gradient(
    180deg,
    hsl(var(--background)) 0%,
    hsl(240 5% 95%) 100%
  );
  min-height: 100vh;
}
```

### 4. Purple Focus Rings (Consistent Brand Touch)
**Effort:** 15 minutes  
**Impact:** Every interaction feels branded

```css
*:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}
```

### 5. Metric Cards with Gold Accent Border
**Effort:** 30 minutes  
**Impact:** KPIs stand out, guides eye to important numbers

```css
.metric-card {
  border-left: 3px solid hsl(var(--accent));
  /* Rest of card styling */
}

.metric-value {
  color: hsl(var(--accent));
  font-variant-numeric: tabular-nums;
}
```

---

## Part 6: Brand Guide Addendum

### Logo Usage on Light Backgrounds

**OMNIVOR LABS:**
- OMNIVOR: Void Black (#0a0a0b)
- LABS: Consumption Purple (#6b21a8)

**OMNIVOR (standalone):**
- Void Black (#0a0a0b) or Consumption Purple (#6b21a8)

### Logo Clear Space

Minimum clear space = height of the "O" in OMNIVOR

### Color Application Matrix

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Page background | Off-white #fafafa | Void Black #0a0a0b |
| Cards | White #ffffff | Zinc 900 #18181b |
| Primary text | Zinc 900 #18181b | Signal White #fafafa |
| Secondary text | Zinc 500 #71717a | Zinc 400 #a1a1aa |
| Primary button bg | Purple #6b21a8 | Violet #a855f7 |
| Primary button text | White | Dark |
| Accent button bg | Gold #d97706 | Gold (slightly lighter) |
| Links | Purple #6b21a8 | Violet #a855f7 |
| Borders | Zinc 200 #e4e4e7 | Zinc 800 #27272a |
| Focus ring | Purple | Violet |

### Photography on Light Backgrounds

Since brand guide specified dark photography (abstract, selective lighting), provide guidance for light contexts:

**Do:**
- Abstract data visualization with dark elements
- White space as breathing room
- Purple/gold accent shapes
- Subtle gradients

**Don't:**
- Busy patterns
- Stock photos of people
- Bright, saturated colors competing with UI
- Low-contrast images that blend with background

---

## Part 7: Migration Checklist

### CSS Files to Update

- [ ] `client/src/index.css` — Root CSS variables
- [ ] `tailwind.config.js` — If custom colors defined there
- [ ] `client/src/components/theme-provider.tsx` — Default theme = 'light'

### Components to Audit

#### Critical (Update First)
- [ ] `client/src/components/ui/card.tsx`
- [ ] `client/src/components/ui/button.tsx`
- [ ] `client/src/components/ui/input.tsx`
- [ ] `client/src/components/ui/table.tsx`
- [ ] `client/src/components/app-sidebar.tsx`

#### High Priority
- [ ] `client/src/components/ui/signal-card.tsx`
- [ ] `client/src/components/hcp-profile-card.tsx`
- [ ] `client/src/components/dashboard-metrics.tsx`
- [ ] `client/src/pages/landing.tsx` — May need light variant

#### Medium Priority
- [ ] All page components — Check hardcoded dark classes
- [ ] Chart components — Verify colors work on light background
- [ ] Form components — Ensure visibility

### Testing Protocol

1. Toggle to light mode
2. Visit every page
3. Screenshot any visibility issues
4. Check:
   - Text readability (contrast)
   - Border visibility
   - Button states (hover, active, disabled)
   - Chart colors
   - Form inputs
5. Toggle to dark mode
6. Verify dark mode still works

---

## Part 8: Implementation Order

### Week 1: Foundation
1. Update CSS custom properties in `index.css`
2. Change default theme to 'light' in theme provider
3. Test base pages for obvious breaks
4. Fix critical visibility issues

### Week 2: Component Updates
1. Update Card component family
2. Update Table styling
3. Update Form inputs
4. Update Button variants if needed

### Week 3: Page-by-Page Audit
1. HCP Explorer
2. Audience Builder
3. Dashboard
4. Simulation Studio
5. Action Queue
6. (Ecosystem Explorer — skip, Phase 14)

### Week 4: Polish
1. Shadow system refinement
2. Hover states
3. Transition polish
4. Final dark mode regression test

---

*End of Phase 13.2 Design System Reconciliation*
