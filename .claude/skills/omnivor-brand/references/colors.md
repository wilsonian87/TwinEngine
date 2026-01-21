# OmniVor Color System

## Primary Palette

| Name | Hex | RGB | Role |
|------|-----|-----|------|
| **Void Black** | #0a0a0b | 10, 10, 11 | Primary background, text on light |
| **Consumption Purple** | #6b21a8 | 107, 33, 168 | Brand primary, LABS text, key accents |

## Secondary Palette

| Name | Hex | RGB | Role |
|------|-----|-----|------|
| **Process Violet** | #a855f7 | 168, 85, 247 | Lighter purple, gradients, hover states |
| **Catalyst Gold** | #d97706 | 217, 119, 6 | CTAs, metrics, success states, refined output |
| **Signal White** | #fafafa | 250, 250, 250 | Primary text on dark, light backgrounds |

## Supporting Palette

| Name | Hex | RGB | Role |
|------|-----|-----|------|
| **Data Gray** | #71717a | 113, 113, 122 | Secondary text, borders |
| **Muted Gray** | #52525b | 82, 82, 91 | Tertiary text, labels, captions |
| **Border Gray** | #27272a | 39, 39, 42 | Subtle borders on dark backgrounds |

## Contrast Ratios (WCAG)

| Combination | Ratio | Grade |
|-------------|-------|-------|
| White on Void Black | 21:1 | AAA |
| Purple on Void Black | 4.5:1 | AA |
| Gold on Void Black | 7.2:1 | AAA |
| Black on White | 21:1 | AAA |
| Purple on White | 5.1:1 | AA |

## Dark Mode (Primary)

```css
--background: #0a0a0b;
--foreground: #fafafa;
--muted: #71717a;
--accent: #6b21a8;
--accent-foreground: #fafafa;
--highlight: #d97706;
```

## Light Mode (Secondary)

```css
--background: #fafafa;
--foreground: #0a0a0b;
--muted: #71717a;
--accent: #6b21a8;
--accent-foreground: #fafafa;
--highlight: #d97706;
```

## Gradients

### Brand Gradient
```css
background: linear-gradient(135deg, #6b21a8 0%, #4c1d95 100%);
```

### Hero Glow
```css
background: radial-gradient(ellipse at center, rgba(107, 33, 168, 0.15) 0%, transparent 70%);
```

### Transformation Gradient (pipeline visuals)
```css
background: linear-gradient(90deg, rgba(107, 33, 168, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%);
```

## CSS Variables (Copy-Paste)

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

## Tailwind Config Extension

```js
colors: {
  'void': '#0a0a0b',
  'consumption': '#6b21a8',
  'process': '#a855f7',
  'catalyst': '#d97706',
  'signal': '#fafafa',
  'data': '#71717a',
  'muted': '#52525b',
  'border': '#27272a',
}
```

## Usage Rules

1. **Never use pure black (#000000)** — always Void Black (#0a0a0b)
2. **Catalyst Gold for numbers and metrics** — draws attention to key values
3. **Consumption Purple for brand moments** — not for data visualization
4. **Process Violet for interactive states** — hovers, focus rings
5. **Dark mode is the PRIMARY mode** — light mode is secondary
