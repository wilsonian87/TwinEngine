# TwinEngine Schema Ontology

This document describes the TwinEngine data model for AI agents. It defines entities, relationships, and valid query patterns.

## Core Domain: HCP Engagement Analytics

TwinEngine is a pharmaceutical HCP (Healthcare Professional) engagement analytics platform. It helps brand teams optimize their omnichannel engagement strategies with physicians.

---

## Primary Entities

### HCP Profile (`hcp_profiles`)

The central entity representing a healthcare professional.

**Key Attributes:**
| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | string | Unique identifier |
| `npi` | string | National Provider Identifier (10 digits) |
| `firstName`, `lastName` | string | HCP name |
| `specialty` | string | Medical specialty (e.g., "Oncology", "Cardiology") |
| `tier` | string | Value tier ("Tier 1", "Tier 2", "Tier 3") |
| `segment` | string | Behavioral segment (e.g., "High Prescriber", "Digital Native") |
| `organization` | string | Primary affiliation |
| `city`, `state` | string | Location |
| `overallEngagementScore` | number | 0-100 engagement index |
| `channelPreference` | string | Preferred communication channel |
| `conversionLikelihood` | number | 0-100 probability of conversion |
| `churnRisk` | number | 0-100 probability of disengagement |
| `adoptionStage` | enum | "awareness" | "consideration" | "trial" | "loyalty" |

**Relationships:**
- Has many `channel_engagements` (nested in profile)
- Has many `competitive_signals`
- Has many `message_exposures`
- Has many `nbo_recommendations`
- Belongs to many `campaigns` (via `campaign_participation`)
- Belongs to many `territories` (via `territory_assignments`)

**Channel Engagements (embedded):**
Each HCP has an array of channel-specific engagement data:
```typescript
{
  channel: "email" | "rep_visit" | "webinar" | "phone" | "conference" | "digital_ad" | "social"
  engagementScore: number // 0-100
  lastContact: string // ISO date
  responseRate: number // 0-100 percentage
  preferenceRank: number // 1-7 preference order
  touchCount: number // total interactions
}
```

---

### Competitor (`competitor_dim`)

External competitive entities affecting HCP prescribing behavior.

**Key Attributes:**
| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Competitor name |
| `type` | enum | "brand" | "therapeutic_class_peer" |
| `therapeuticArea` | string | TA focus |
| `marketShare` | number | Overall market share % |
| `color` | string | Hex color for visualization |

---

### Competitive Signal (`hcp_competitive_signal_fact`)

Point-in-time measurement of competitive pressure for an HCP-Competitor pair.

**Key Attributes:**
| Attribute | Type | Description |
|-----------|------|-------------|
| `hcpId` | string | FK to HCP |
| `competitorId` | string | FK to Competitor |
| `shareOfBrand` | number | Competitor's share with this HCP (%) |
| `shareChangeQoQ` | number | Quarter-over-quarter share change (%) |
| `cpi` | number | Competitive Pressure Index (0-100) |
| `cpiDirection` | enum | "increasing" | "stable" | "decreasing" |
| `riskLevel` | enum | "low" | "medium" | "high" | "critical" |

**CPI Formula:**
```
CPI = ShareComponent + VelocityComponent + EngagementComponent + TrendComponent

Where each component contributes 0-25 points:
- ShareComponent = (shareOfBrand / 100) * 25
- VelocityComponent = normalized velocity differential
- EngagementComponent = normalized engagement asymmetry
- TrendComponent = normalized QoQ change
```

---

### Message Theme (`message_theme_dim`)

Content themes used in HCP communications.

**Key Attributes:**
| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Theme name |
| `category` | enum | "efficacy" | "safety" | "RWE" | "peer_validation" | "cost_value" |
| `therapeuticArea` | string | TA association |
| `description` | string | Theme description |

---

### Message Exposure (`message_exposure_fact`)

HCP exposure to specific message themes over time.

**Key Attributes:**
| Attribute | Type | Description |
|-----------|------|-------------|
| `hcpId` | string | FK to HCP |
| `messageThemeId` | string | FK to Message Theme |
| `touchFrequency` | number | Number of exposures |
| `channelDiversity` | number | 0-1 entropy score |
| `engagementDecay` | number | Rate of engagement decline |
| `msi` | number | Message Saturation Index (0-100) |
| `adoptionStage` | string | HCP's adoption stage at measurement |

**MSI Formula:**
```
MSI = f(touchFrequency, channelDiversity, engagementDecay, adoptionStage)

Higher MSI = higher saturation risk (message fatigue)
Thresholds vary by adoption stage:
- Awareness: higher tolerance (MSI < 80 acceptable)
- Loyalty: lower tolerance (MSI > 60 concerning)
```

---

### NBO Recommendation (`next_best_orbit_recommendation_fact`)

AI-generated engagement recommendations.

**Key Attributes:**
| Attribute | Type | Description |
|-----------|------|-------------|
| `hcpId` | string | FK to HCP |
| `actionType` | enum | "engage" | "reinforce" | "defend" | "nurture" | "expand" | "pause" | "reactivate" |
| `recommendedChannel` | string | Suggested channel |
| `recommendedTheme` | string | Suggested message theme |
| `confidence` | number | 0-1 confidence score |
| `confidenceLevel` | enum | "high" | "medium" | "low" |
| `rationale` | string | Human-readable explanation |
| `urgency` | enum | "high" | "medium" | "low" |
| `compositeScore` | number | Weighted composite of all inputs |

**Decision Inputs (weighted):**
| Input | Weight | Description |
|-------|--------|-------------|
| Engagement trajectory | 20% | Trend in engagement score |
| Adoption stage | 15% | Current position in adoption journey |
| Channel affinity | 20% | Historical channel response rates |
| Message saturation (MSI) | 20% | Current saturation level |
| Competitive pressure (CPI) | 15% | Competitive threat level |
| Recent touch history | 10% | Days since last contact |

---

### Campaign (`campaigns`)

Marketing campaigns targeting HCP groups.

**Key Attributes:**
| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Campaign name |
| `campaignType` | string | "launch" | "maintenance" | "awareness" | "retention" |
| `therapeuticArea` | string | TA focus |
| `startDate`, `endDate` | date | Campaign duration |
| `status` | enum | "draft" | "active" | "paused" | "completed" |
| `targetHcpCount` | number | Number of targeted HCPs |

---

### Simulation Scenario (`simulation_scenarios`)

What-if analysis scenarios for campaign planning.

**Key Attributes:**
| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Scenario name |
| `hcpId` | string | Target HCP (for individual simulations) |
| `stimulusType` | string | Type of intervention |
| `stimulusValue` | number | Magnitude of intervention |
| `currentState` | object | HCP state before simulation |
| `predictedEngagement` | number | Predicted engagement change |
| `confidenceInterval` | object | Prediction uncertainty |

---

## Key Metrics & Indices

### Competitive Pressure Index (CPI)
- **Range:** 0-100
- **Risk Levels:** low (0-25), medium (26-50), high (51-75), critical (76-100)
- **Interpretation:** Higher = more competitive threat
- **Action Trigger:** CPI > 70 suggests defensive intervention

### Message Saturation Index (MSI)
- **Range:** 0-100
- **Risk Levels:** Varies by adoption stage
- **Interpretation:** Higher = more message fatigue risk
- **Action Trigger:** MSI > 80 suggests pause messaging on that theme

### Engagement Score
- **Range:** 0-100
- **Components:** Overall + per-channel scores
- **Interpretation:** Higher = more engaged HCP
- **Trend:** Track trajectory (improving/stable/declining)

### Confidence Levels
- **High:** >= 0.75 (strong signal alignment)
- **Medium:** 0.50-0.74 (mixed signals)
- **Low:** < 0.50 (insufficient data or conflicts)

---

## Valid Query Patterns

### 1. Single HCP Analysis
```
"Tell me about Dr. [Name]'s engagement profile"
"What's the competitive pressure on HCP [ID]?"
"Why is [HCP] disengaging?"
```

### 2. Cohort Analysis
```
"Show me high-risk HCPs in Oncology"
"Compare Tier 1 vs Tier 2 engagement"
"Which HCPs have MSI > 70?"
```

### 3. Recommendation Queries
```
"What's the next best action for [HCP]?"
"Generate recommendations for my territory"
"Which HCPs need defensive intervention?"
```

### 4. Simulation Queries
```
"What if we increase email frequency by 20%?"
"Simulate a rep visit for [HCP]"
"Project engagement change for this cohort"
```

### 5. Competitive Intelligence
```
"Who are the top competitive threats?"
"Which HCPs are at risk from [Competitor]?"
"Show competitive orbit for [TA]"
```

---

## Business Rules & Constraints

### Contact Limits
- HCPs have configurable contact limits per channel per month
- System enforces saturation thresholds
- Compliance windows restrict contact timing

### Approval Workflows
- High-impact actions (affecting >50 HCPs) require approval
- Defensive interventions are auto-flagged for review
- Budget allocations follow governance rules

### Data Privacy
- NPI is the canonical HCP identifier
- PHI is never exposed in external integrations
- Audit logs track all data access

---

## Therapeutic Areas (Supported)

- Oncology
- Cardiology
- Neurology
- Immunology
- Endocrinology
- Gastroenterology
- Pulmonology
- Rheumatology
- Dermatology
- Infectious Disease

---

## Channels (Supported)

| Channel | Description |
|---------|-------------|
| `email` | Email communications |
| `rep_visit` | In-person sales rep visits |
| `webinar` | Virtual educational events |
| `phone` | Phone calls |
| `conference` | Conference/congress interactions |
| `digital_ad` | Digital advertising |
| `social` | Social media engagement |

---

*Last updated: 2026-01-19*
*Schema version: Phase 12*
