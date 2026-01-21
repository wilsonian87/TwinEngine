---
name: omnivor-brand
description: Apply OmniVor Labs brand guidelines to UI components, copy, documentation, and marketing materials. Use when creating React components, writing microcopy, generating presentations, or styling any user-facing output for TwinEngine.
---

# OmniVor Brand Skill

## When to Use

Activate this skill when:
- Creating or modifying React/UI components
- Writing UI copy, error messages, or empty states
- Generating marketing materials or documentation
- Styling dashboards, cards, buttons, or data displays
- Naming new features or modules

## Brand Essence

**"Feeds on complexity."**

OMNIVOR LABS transforms complexity into clarity. We consume every signal across every channel and metabolize it into refined, actionable intelligence.

### Etymology
- **OMNI** (Latin) — All, every, total
- **VÖR** (Norse) — Goddess from whom nothing is hidden
- **VOR** (Acronym) — Virtualization, Orchestration, Reporting

### Core Metaphor
**Consumption → Transformation → Intelligence**

Raw signals go in. Refined insight comes out. We don't analyze—we metabolize.

---

## Color System

### Primary Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--void-black` | #0a0a0b | Primary background, text on light |
| `--consumption-purple` | #6b21a8 | Brand primary, LABS text, accents |

### Secondary Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--process-violet` | #a855f7 | Lighter purple, gradients, hovers |
| `--catalyst-gold` | #d97706 | CTAs, metrics, success, refined output |
| `--signal-white` | #fafafa | Primary text on dark, backgrounds |

### Supporting Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--data-gray` | #71717a | Secondary text, borders |
| `--muted-gray` | #52525b | Tertiary text, labels, captions |
| `--border-gray` | #27272a | Subtle borders on dark |

### Color Rules
- Dark mode is PRIMARY (Void Black background)
- Never use pure black (#000000)—always Void Black (#0a0a0b)
- Catalyst Gold for metrics, numbers, CTAs
- Consumption Purple for brand accents, not for data

### Gradients

```css
/* Brand Gradient */
background: linear-gradient(135deg, #6b21a8 0%, #4c1d95 100%);

/* Hero Glow */
background: radial-gradient(ellipse at center, rgba(107, 33, 168, 0.15) 0%, transparent 70%);
```

---

## Typography

### Typeface: Inter

Import: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&display=swap');`

### Weight Usage

| Weight | Name | Usage |
|--------|------|-------|
| 900 | Black | OMNIVOR in wordmark, display headlines |
| 700 | Bold | H1-H2, emphasis |
| 600 | Semi-bold | H3, buttons, labels |
| 500 | Medium | Body emphasis, nav |
| 400 | Regular | Body text |
| 300 | Light | LABS in wordmark only (never below 18px) |

### Type Scale

| Level | Size | Weight | Letter-spacing |
|-------|------|--------|----------------|
| Display | 4rem+ | 900 | 0.1em |
| H1 | 2.5rem | 700 | 0.02em |
| H2 | 1.75rem | 700 | 0.02em |
| H3 | 1.25rem | 600 | 0.01em |
| Body | 1rem | 400 | 0 |
| Small | 0.875rem | 400 | 0 |
| Caption | 0.75rem | 500 | 0.05em |
| Label | 0.625rem | 600 | 0.15em (ALL CAPS) |

### Typography Rules
- Labels: ALL CAPS with wide letter-spacing
- Max line length: 65-75 characters
- Never center-align body text
- Never use decorative or script fonts

---

## Voice & Tone

### Brand Attributes

| Attribute | Expression |
|-----------|------------|
| **Confident** | States facts without hedging. "Here's what's happening." |
| **Direct** | Short sentences. No fluff. Every word works. |
| **Transformational** | Raw becomes refined. Chaos becomes clarity. |
| **Knowing** | Slightly ahead—already sees what you're about to ask. |

### Voice Do's
- Use active voice
- Lead with insight, not process
- Be specific with numbers
- Speak to marketers, not data scientists

### Voice Don'ts
- Never apologetic or uncertain
- Never use "please" or "sorry" in UI copy
- Never explain the metaphor literally ("like an omnivore...")
- Never be cute or whimsical

### Copy Patterns

**Instead of → Write:**
- "We think there might be..." → "OMNIVOR identified..."
- "Please wait while we process..." → "Processing..."
- "Sorry, something went wrong" → "Connection interrupted. Reconnecting."
- "Your data" → "Your signals"
- "Click here to download" → "Extract data"
- "No results found" → "No signals match."

### Sample UI Copy

| State | Copy |
|-------|------|
| Welcome | "OMNIVOR has processed 847 signals since your last session. Three patterns have crystallized." |
| Empty | "No data yet. Connect your channels and let OMNIVOR feed." |
| Loading | "Processing..." or "Consuming signals..." or "Metabolizing..." |
| Error | "Connection interrupted. Reconnecting now." |
| Success | "Analysis complete. 14 insights ready." |

---

## UI Components

### Buttons

**Primary:**
- Background: #6b21a8 (Consumption Purple)
- Text: #fafafa, Semi-bold (600)
- Border-radius: 8px
- Padding: 14px 32px

**Secondary:**
- Background: transparent
- Border: 1px solid #6b21a8
- Text: #6b21a8

**Accent (High-priority CTAs):**
- Background: #d97706 (Catalyst Gold)
- Text: #0a0a0b, Semi-bold (600)

**Ghost:**
- Background: transparent
- Border: 1px solid rgba(255, 255, 255, 0.1)
- Text: #fafafa

### Cards

- Background: #0a0a0b or rgba(107, 33, 168, 0.1)
- Border: 1px solid rgba(107, 33, 168, 0.2)
- Border-radius: 16px (large), 12px (medium), 8px (small)
- Padding: 24px standard, 32px feature cards

### Metrics Display

```
┌─────────────────────────────┐
│ SIGNALS PROCESSED           │  ← Label: 0.625rem, #52525b, uppercase
│ 2,847                       │  ← Value: 2.5rem, #d97706, weight 800
│ 14 patterns crystallized    │  ← Subtext: 0.875rem, #a1a1aa
└─────────────────────────────┘
```

### Border Radii

| Size | Value | Usage |
|------|-------|-------|
| Small | 4px | Tags, badges |
| Medium | 8px | Buttons, inputs |
| Large | 12px | Small cards |
| XL | 16px | Standard cards |
| 2XL | 20px | Feature cards |

---

## Product Naming

### Feature Names

| Generic | OMNIVOR Name |
|---------|--------------|
| Dashboard | **Nerve Center** |
| HCP Explorer | **Signal Index** |
| Audience Builder | **Cohort Lab** |
| Simulations | **Scenario Lab** |
| Channel Diagnostic | **Signal Diagnostic** |
| NBA Queue | **Catalyst Queue** |

### Naming Principles

**Do:**
- "Signal" over "data" or "information"
- "Lab" for experimental/builder features
- "Queue" for action-oriented features
- Transformation/science language

**Don't:**
- Hunting/predator language
- "Studio" or "Workshop"
- "List" or "Backlog"
- "Report" or "Analysis"

---

## Iconography

### Style
- Geometric, sharp angles
- 2px stroke weight (at 24px)
- Rounded caps and joins
- Subtle movement toward center

### Colors
- Default (dark bg): Signal White (#fafafa)
- Default (light bg): Void Black (#0a0a0b)
- Active/Selected: Catalyst Gold (#d97706)
- Brand accent: Consumption Purple (#6b21a8)

### Avoid
- Organic or curved shapes
- Filled icons (prefer stroked)
- Overly complex or detailed
- Friendly/playful styles

---

## Motion

### Timing

| Type | Duration | Easing |
|------|----------|--------|
| Micro-interactions | 150-200ms | ease-out |
| UI transitions | 200-300ms | ease-in-out |
| Page transitions | 300-400ms | ease-out |
| Hero animations | 800-1000ms | ease-out |

### Patterns
- **Loading:** Convergence pattern, signals flowing inward
- **Success:** Gold pulse radiating outward
- **Data refresh:** Subtle purple pulse
- **Card entrance:** Fade up with scale (0.98 → 1.0)

### Rules
- Purposeful, not decorative
- Never bouncy or playful
- Suggests intake → processing → output

---

## Logo Rules

### Wordmark: Split Emphasis (Primary)
- OMNIVOR: Inter Black (900), Signal White
- LABS: Inter Light (300), Consumption Purple
- Letter-spacing: 0.1em both

### Don'ts
- Never hyphenate: "OMNIVOR-LABS"
- Never combine: "OMNIVORLABS"
- Never use "The" before: "The OMNIVOR platform"
- Never add effects (shadows, glows)
- Never change weight relationship

---

## Quick Reference

### CSS Variables

```css
:root {
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
}
```

### Tailwind Mapping

| Token | Tailwind Equivalent |
|-------|---------------------|
| Void Black | zinc-950 (close) |
| Consumption Purple | purple-800 |
| Process Violet | purple-400 |
| Catalyst Gold | amber-600 |
| Signal White | zinc-50 |

---

## References

For complete specifications, see:
- `references/colors.md` — Full color system with contrast ratios
- `references/typography.md` — Complete type scale and rules
- `references/voice.md` — Extended copy examples
- `references/components.md` — Full component specifications

Source documents:
- `/brand/OMNIVOR LABS — Brand BibleVersion1.1.md`
- `/brand/OMNIVOR-LABS-STYLE-GUIDE.md`
