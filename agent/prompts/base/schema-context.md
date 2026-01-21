# TwinEngine Schema Context

This document provides the data model context for AI agents working with TwinEngine.

> **Canonical Reference:** For implementation details, field-level constraints, and architectural
> implications, see **DOMAIN-ANCHOR** (`claude-brain/templates/DOMAIN-ANCHOR.md`).
> This document is a quick reference; DOMAIN-ANCHOR provides the authoritative domain context.

## Core Entities

### HCP (Healthcare Professional)
The central entity representing a physician or prescriber.

**Key Fields:**
- `id`: Unique identifier
- `npi`: National Provider Identifier (10-digit)
- `firstName`, `lastName`: Name
- `specialty`: Medical specialty (Oncology, Cardiology, etc.)
- `tier`: Engagement tier (Tier 1, Tier 2, Tier 3)
- `segment`: Behavioral segment (High Prescriber, Growth Potential, etc.)
- `overallEngagementScore`: 0-100 composite score
- `channelPreference`: Preferred communication channel
- `channelEngagements`: Array of per-channel metrics
- `conversionLikelihood`: 0-100 prediction score
- `churnRisk`: 0-100 risk score

### Channel Engagement
Tracks HCP interaction by channel.

**Channels:** email, rep_visit, webinar, conference, digital_ad, phone

**Metrics per channel:**
- `score`: 0-100 engagement score
- `responseRate`: 0-100 response rate
- `totalTouches`: Contact count
- `lastContact`: ISO date string

### Competitive Signal
Tracks competitive pressure on HCPs.

**Key Fields:**
- `competitorId`: Reference to competitor
- `cpi`: Competitive Pressure Index (0-100)
- `shareOfBrand`: Competitor's share percentage
- `cpiDirection`: increasing | stable | decreasing
- `riskLevel`: low | medium | high | critical

### Message Saturation
Tracks messaging fatigue.

**Key Fields:**
- `messageThemeId`: Reference to message theme
- `msi`: Message Saturation Index (0-100)
- `touchFrequency`: Contact count in period
- `channelDiversity`: 0-1 entropy score
- `engagementDecay`: Rate of declining engagement

## Relationships

```
HCP ─┬─< ChannelEngagement
     ├─< CompetitiveSignal >─ Competitor
     ├─< MessageExposure >─ MessageTheme
     └─< NBORecommendation
```

## Index Categories

| Index | Range | Meaning |
|-------|-------|---------|
| CPI | 0-25 | Low competitive pressure |
| CPI | 26-50 | Medium pressure |
| CPI | 51-75 | High pressure |
| CPI | 76-100 | Critical pressure |
| MSI | 0-40 | Safe to message |
| MSI | 41-70 | Caution zone |
| MSI | 71-100 | Saturated - pause messaging |

## Query Patterns

### Filter HCPs
```json
{
  "specialty": ["Oncology"],
  "tier": ["Tier 1", "Tier 2"],
  "minEngagement": 50,
  "maxChurnRisk": 30
}
```

### Aggregate by Segment
Group HCPs by segment and calculate averages for engagement, churn risk, and conversion likelihood.

### Time-Series Analysis
Compare metrics across periods (MoM, QoQ) to identify trends.

---

## DOMAIN-ANCHOR Cross-Reference

For deeper context, consult these DOMAIN-ANCHOR sections:

| Topic | DOMAIN-ANCHOR Section |
|-------|----------------------|
| Entity definitions, business meaning | Part 1: Entity Glossary |
| CPI, MSI, Adoption Stage formulas | Part 2: Metric Definitions |
| Entity relationships diagram | Part 3: Relationship Map |
| Field-level constraints (NPI, tier, etc.) | Part 4: Field-Level Context |
| SQL query patterns | Part 5: Query Patterns |
| Anti-patterns to avoid | Part 6: Anti-Patterns |
| Compliance/regulatory context | Part 7: Regulatory & Compliance |
| Synthetic data distributions | Part 8: Synthetic Data Guidelines |
| TwinEngine file mapping | Part 10: TwinEngine Implementation |

**Location:** `claude-brain/templates/DOMAIN-ANCHOR.md`
