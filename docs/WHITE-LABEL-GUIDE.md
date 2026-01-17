# OmniVor White-Label Customization Guide

This guide explains how to customize the OmniVor platform for client-specific branding.

## Overview

The OmniVor platform supports full white-label customization through a configuration-driven approach. All brand elements—colors, typography, module names, and copy—can be overridden without modifying core application code.

**Customization Time:** ~1-2 hours for full rebrand

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WHITE-LABEL CONFIGURATION                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  client/src/lib/brand-config.ts    ←── Base OmniVor configuration          │
│           │                                                                 │
│           ▼                                                                 │
│  client/src/lib/white-label.ts     ←── Merge & override utilities          │
│           │                                                                 │
│           ▼                                                                 │
│  Client Config (JSON/TS)           ←── Client-specific overrides           │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────┐       ┌─────────────────────────┐                     │
│  │  CSS Variables  │       │  React Context (Brand)  │                     │
│  │  (runtime)      │       │  (component access)     │                     │
│  └─────────────────┘       └─────────────────────────┘                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Create Client Configuration

Create a new file for your client's configuration:

```typescript
// client/src/config/client-acme.ts
import type { WhiteLabelConfig } from "@/lib/white-label";

export const ACME_CONFIG: WhiteLabelConfig = {
  company: {
    name: "Acme Pharma Analytics",
    legalName: "Acme Pharmaceuticals, Inc.",
    shortName: "ACME",
    logoUrl: "/assets/acme-logo.svg",
  },
  product: {
    name: "Acme Insights",
    tagline: "Precision analytics for healthcare.",
  },
  colors: {
    primary: "#1e40af",      // Replace purple with blue
    accent: "#16a34a",       // Replace gold with green
  },
};
```

### 2. Initialize at App Startup

In your `App.tsx` or entry point:

```typescript
import { initWhiteLabel } from "@/lib/white-label";
import { ACME_CONFIG } from "@/config/client-acme";

// Initialize white-label before rendering
const brandConfig = initWhiteLabel(ACME_CONFIG);

// Pass to BrandProvider
<BrandProvider config={brandConfig}>
  <App />
</BrandProvider>
```

### 3. Build Client-Specific Bundle

```bash
# Set environment variable for client
CLIENT_ID=acme npm run build

# Or use build script
./scripts/build-client.sh acme
```

---

## Customization Reference

### Company Branding

Controls splash page, footer, and legal text.

```typescript
company: {
  name: string;        // "OMNIVOR LABS" → "Acme Analytics"
  legalName: string;   // Legal entity name for copyright
  shortName: string;   // Abbreviated name for tight spaces
  logoUrl?: string;    // Path to logo image
  faviconUrl?: string; // Path to favicon
  copyright?: string;  // Custom copyright text
}
```

### Product Branding

Controls in-app product identity.

```typescript
product: {
  name: string;        // "OmniVor" → "Acme Insights"
  displayName: string; // Full display name
  tagline: string;     // Primary product tagline
}
```

### Color Customization

All colors use hex format. Override specific colors or provide a complete palette.

```typescript
colors: {
  primary: "#1e40af",      // Main brand color (buttons, links, accents)
  primaryHover: "#3b82f6", // Hover state for primary
  accent: "#16a34a",       // CTAs, highlights, metrics
  background: "#0f172a",   // Page background
  foreground: "#f8fafc",   // Primary text
  textSecondary: "#94a3b8",// Secondary text
  textMuted: "#64748b",    // Muted/helper text
  border: "#334155",       // Borders and dividers
}
```

**Color Mapping:**

| Client Config Key | OmniVor Variable | CSS Variable |
|-------------------|------------------|--------------|
| `primary` | consumptionPurple | `--consumption-purple` |
| `primaryHover` | processViolet | `--process-violet` |
| `accent` | catalystGold | `--catalyst-gold` |
| `background` | voidBlack | `--void-black` |
| `foreground` | signalWhite | `--signal-white` |
| `textSecondary` | dataGray | `--data-gray` |
| `textMuted` | mutedGray | `--muted-gray` |
| `border` | borderGray | `--border-gray` |

### Module Names

Rename any navigation module to match client terminology.

```typescript
modules: {
  signalIndex: {
    label: "HCP Directory",
    description: "Browse healthcare professionals",
  },
  cohortLab: {
    label: "Audience Builder",
  },
  scenarioLab: {
    label: "Campaign Simulator",
  },
  catalystQueue: {
    label: "Action Items",
  },
  nerveCenter: {
    label: "Dashboard",
  },
}
```

**Available Module Keys:**

- `signalIndex` - HCP Explorer
- `cohortLab` - Audience Builder
- `scenarioLab` - Simulations
- `catalystQueue` - NBA/Action Queue
- `nerveCenter` - Dashboard
- `agentOrchestrator` - Agent Management
- `constraintSurface` - Constraint Manager
- `allocationLab` - Allocation Tool

### Taglines

Custom taglines for splash page rotation.

```typescript
taglines: [
  { text: "Precision analytics for healthcare.", tone: "primary" },
  { text: "Data-driven HCP engagement.", tone: "conservative" },
  { text: "Intelligent prescriber insights.", tone: "technical" },
]
```

### Typography

Override the default font family.

```typescript
typography: {
  fontFamily: "'Roboto', -apple-system, BlinkMacSystemFont, sans-serif",
  fontImport: "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;600;700&display=swap",
}
```

### Feature Flags

Control feature availability per client.

```typescript
features: {
  hideModules: ["agentOrchestrator"], // Hide specific nav items
  enableAI: true,                      // Enable/disable AI features
  supportUrl: "https://support.acme.com",
  docsUrl: "https://docs.acme.com",
}
```

---

## Logo Replacement

### Wordmark Component

The `Wordmark` component in `client/src/components/brand/Wordmark.tsx` renders the text-based logo. For image logos:

1. Add logo to `public/assets/`
2. Create a logo component:

```typescript
// client/src/components/brand/ClientLogo.tsx
export function ClientLogo({ className }: { className?: string }) {
  return (
    <img
      src="/assets/client-logo.svg"
      alt="Client Logo"
      className={className}
    />
  );
}
```

3. Replace Wordmark usage in:
   - `client/src/pages/landing.tsx` (splash page)
   - `client/src/components/app-sidebar.tsx` (navigation header)

### Favicon

1. Place favicon in `public/`
2. Update `index.html`:

```html
<link rel="icon" type="image/svg+xml" href="/client-favicon.svg" />
```

---

## Copy/Voice Customization

UI copy is centralized in `client/src/lib/brand-copy.ts`. To customize:

1. Create client-specific copy file:

```typescript
// client/src/config/client-acme-copy.ts
import { BRAND_COPY } from "@/lib/brand-copy";

export const ACME_COPY = {
  ...BRAND_COPY,
  labels: {
    ...BRAND_COPY.labels,
    engagement: "Engagement Score",  // Override "Signal Score"
    hcp: "Prescriber",               // Override "HCP"
  },
  modules: {
    ...BRAND_COPY.modules,
    signalIndex: "Browse and analyze prescriber profiles",
  },
};
```

2. Import in components as needed.

---

## Build Process

### Single Client Build

```bash
# Set client ID
export CLIENT_ID=acme

# Build
npm run build

# Output in dist/
```

### Multi-Client CI/CD

```yaml
# .github/workflows/build-clients.yml
jobs:
  build:
    strategy:
      matrix:
        client: [acme, pharmax, medco]
    steps:
      - run: CLIENT_ID=${{ matrix.client }} npm run build
      - uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.client }}-build
          path: dist/
```

### Environment-Based Loading

For runtime client detection:

```typescript
// Detect client from subdomain or env
const clientId = window.location.hostname.split('.')[0];

// Load config dynamically
const clientConfig = await import(`./config/client-${clientId}.ts`);
initWhiteLabel(clientConfig.default);
```

---

## Checklist

Before deploying a white-labeled instance:

- [ ] Company name and legal text updated
- [ ] Product name and tagline customized
- [ ] Colors match client brand guidelines
- [ ] Logo/wordmark replaced
- [ ] Favicon updated
- [ ] Module names use client terminology
- [ ] Copy/voice matches client preferences
- [ ] Feature flags configured
- [ ] Build tested in staging
- [ ] Visual QA completed

---

## Support

For questions about white-label customization:

- Review `client/src/lib/white-label.ts` for full API
- Check `client/src/lib/brand-config.ts` for default values
- See `EXAMPLE_CLIENT_CONFIG` in white-label.ts for reference

---

*Last updated: 2026-01-17*
*OmniVor Platform v8.0*
