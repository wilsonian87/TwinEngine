# Creative Handoff: TwinEngine UI Update

Technical requirements document for visual redesign implementation.

---

## Quick Reference

| Item | Location | Format |
|------|----------|--------|
| Color Tokens | `client/src/index.css` | CSS Custom Properties (HSL) |
| Tailwind Config | `tailwind.config.ts` | TypeScript |
| UI Components | `client/src/components/ui/` | React/shadcn |
| Design Guidelines | `design_guidelines.md` | Markdown |
| Fonts | Google Fonts (IBM Plex) | CDN |

---

## 1. Theming Architecture

### How Theming Works

The application uses a **CSS Custom Properties** system with HSL color values. All colors flow through three layers:

```
CSS Variables (index.css)
    ↓
Tailwind Config (tailwind.config.ts)
    ↓
React Components (shadcn/ui)
```

### Color Token Format

Colors are defined in **HSL format without the `hsl()` wrapper**:

```css
/* In index.css - Note: just the values, no hsl() */
--primary: 207 85% 42%;        /* H S% L% */
--primary-foreground: 0 0% 100%;
```

This allows Tailwind to apply alpha values:
```tsx
// In components
<div className="bg-primary/50" />  // 50% opacity primary
```

---

## 2. Color Tokens Reference

### Core Semantic Tokens

Update these in `client/src/index.css`:

```css
:root {
  /* Background & Surface */
  --background: 210 20% 98%;      /* Page background */
  --foreground: 222 47% 11%;      /* Primary text */

  /* Cards & Panels */
  --card: 0 0% 100%;              /* Card background */
  --card-foreground: 222 47% 11%; /* Card text */
  --card-border: 220 13% 91%;     /* Card borders */

  /* Primary Brand */
  --primary: 207 85% 42%;         /* Primary buttons/links */
  --primary-foreground: 0 0% 100%;/* Text on primary */

  /* Secondary */
  --secondary: 210 20% 96%;       /* Secondary buttons */
  --secondary-foreground: 222 47% 11%;

  /* Muted/Subtle */
  --muted: 210 20% 96%;           /* Muted backgrounds */
  --muted-foreground: 220 9% 46%; /* Muted text */

  /* Accent */
  --accent: 210 20% 96%;          /* Hover states */
  --accent-foreground: 222 47% 11%;

  /* Destructive/Error */
  --destructive: 0 84% 60%;       /* Error states */
  --destructive-foreground: 0 0% 100%;

  /* Input & Border */
  --input: 220 13% 91%;           /* Input borders */
  --border: 220 13% 91%;          /* General borders */
  --ring: 207 85% 42%;            /* Focus rings */
}
```

### Chart Colors

For data visualizations:

```css
:root {
  --chart-1: 207 85% 42%;   /* Blue - primary data */
  --chart-2: 160 84% 39%;   /* Green - positive */
  --chart-3: 38 92% 50%;    /* Yellow/Orange - warning */
  --chart-4: 280 68% 50%;   /* Purple - accent */
  --chart-5: 0 84% 60%;     /* Red - negative */
}
```

### Dark Mode

Dark mode tokens are in the `.dark` selector:

```css
.dark {
  --background: 222 47% 8%;
  --foreground: 210 20% 98%;
  /* ... all tokens redefined for dark */
}
```

---

## 3. Typography System

### Fonts

- **Primary:** IBM Plex Sans (Google Fonts)
- **Monospace:** IBM Plex Mono (for data values)

Fonts are loaded in `client/index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Typography Scale

| Element | Size | Weight | Class |
|---------|------|--------|-------|
| Page Title | 32px | 600 | `text-3xl font-semibold` |
| Section Header | 24px | 500 | `text-2xl font-medium` |
| Card Title | 18px | 500 | `text-lg font-medium` |
| Body | 14px | 400 | `text-sm` (default) |
| Label | 12px | 400 | `text-xs` |
| Metadata | 11px | 400 | `text-[11px]` |
| Data Value | 16-20px | 500 | `font-mono text-base font-medium` |

### Tailwind Font Config

In `tailwind.config.ts`:
```typescript
fontFamily: {
  sans: ["IBM Plex Sans", "var(--font-sans)"],
  mono: ["IBM Plex Mono", "var(--font-mono)"],
}
```

---

## 4. Component Library (shadcn/ui)

### Component Inventory

47 UI components in `client/src/components/ui/`:

**Layout:** card, sidebar, sheet, drawer, dialog, tabs, accordion, collapsible, resizable

**Data Display:** table, badge, avatar, skeleton, progress, chart, calendar, carousel

**Forms:** input, textarea, select, checkbox, radio-group, switch, slider, toggle, form, label

**Navigation:** button, navigation-menu, menubar, breadcrumb, pagination, dropdown-menu, context-menu, command

**Feedback:** alert, alert-dialog, toast, toaster, tooltip, hover-card, popover

### Modifying Components

Components use Tailwind classes with CSS variable references. Example from `button.tsx`:

```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground...",
        outline: "border border-input bg-background hover:bg-accent...",
        secondary: "bg-secondary text-secondary-foreground...",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
  }
)
```

**To update styling:** Modify the CSS variables in `index.css`, not the component files.

---

## 5. Spacing & Layout

### Spacing Scale

Standard Tailwind spacing (4px base unit):
- `2` = 8px
- `4` = 16px
- `6` = 24px
- `8` = 32px
- `12` = 48px
- `16` = 64px
- `20` = 80px

### Border Radius

Custom values in `tailwind.config.ts`:
```typescript
borderRadius: {
  lg: ".5625rem",  /* 9px */
  md: ".375rem",   /* 6px */
  sm: ".1875rem",  /* 3px */
}
```

Also defined as CSS variable:
```css
--radius: 0.375rem;
```

### Shadows

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
```

---

## 6. Breakpoints

```typescript
// Tailwind defaults
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

---

## 7. Implementation Workflow

### For Color/Theme Updates

1. **Edit CSS Variables** in `client/src/index.css`
2. **Test both light and dark modes**
3. No component changes needed if using semantic tokens

### For New Colors

1. Add variable in `index.css` (both `:root` and `.dark`)
2. Add to `tailwind.config.ts` color map
3. Use in components: `bg-[newcolor]` or `text-[newcolor]`

### For Typography Changes

1. Update Google Fonts link in `client/index.html`
2. Update `fontFamily` in `tailwind.config.ts`
3. Fonts cascade through all components automatically

### For Component Styling

1. Prefer CSS variable changes over component edits
2. If structural changes needed, edit files in `client/src/components/ui/`
3. Run `npm run check` to verify TypeScript validity

---

## 8. Recommended Handoff Formats

### Design Tokens JSON (Preferred)

```json
{
  "colors": {
    "primary": { "hue": 207, "saturation": 85, "lightness": 42 },
    "background": { "hue": 210, "saturation": 20, "lightness": 98 }
  },
  "typography": {
    "fontFamily": "IBM Plex Sans",
    "scale": {
      "pageTitle": { "size": "32px", "weight": 600 },
      "body": { "size": "14px", "weight": 400 }
    }
  },
  "spacing": {
    "base": "4px",
    "scale": [8, 16, 24, 32, 48, 64, 80]
  },
  "borderRadius": {
    "sm": "3px",
    "md": "6px",
    "lg": "9px"
  }
}
```

### Figma Variables

Export Figma variables with matching names:
- `--primary` → `primary`
- `--background` → `background`
- Map to HSL values

### Style Dictionary

If using Style Dictionary, output CSS custom properties format.

---

## 9. Files to Deliver

| Deliverable | Format | Notes |
|-------------|--------|-------|
| Color palette | HSL values | Include light + dark mode |
| Typography | Font files or CDN links | With weight variants |
| Spacing scale | Pixel values | Based on 4px unit |
| Border radius | Pixel values | sm/md/lg tokens |
| Component states | Figma/Sketch | Hover, focus, active, disabled |
| Icon set | SVG or icon font | Lucide React compatible |

---

## 10. Development Commands

```bash
# Start dev server with hot reload
export $(grep -v '^#' .env | xargs) && npm run dev

# Type check after changes
npm run check

# Build for production
npm run build
```

---

## 11. Key Page Files

| Page | File | Notes |
|------|------|-------|
| Landing/Gate | `client/src/pages/landing.tsx` | Pre-auth splash |
| HCP Explorer | `client/src/pages/hcp-explorer.tsx` | Main grid view |
| Dashboard | `client/src/pages/dashboard.tsx` | Analytics overview |
| Simulation | `client/src/pages/simulation-builder.tsx` | Scenario config |
| Settings | `client/src/pages/settings.tsx` | User preferences |
| Cohort Compare | `client/src/pages/cohort-compare.tsx` | Side-by-side analysis |
| Action Queue | `client/src/pages/action-queue.tsx` | NBA review |

---

## 12. Contact Points

For technical questions during implementation:
- CSS/Theming: Modify `client/src/index.css`
- Component behavior: Check `client/src/components/ui/`
- Layout structure: Review `client/src/pages/`
- Design system: Reference `design_guidelines.md`
