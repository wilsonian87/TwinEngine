# HCP Lifecycle & Health States

> Journey stages, health classifications, and transition signals for HCP engagement.

---

## HCP Journey Stages

### Full Journey Framework

```
Unaware → Aware → Considering → Interest → Decision → Adoption → Advocacy
   │         │          │           │          │          │          │
   │         │          │           │          │          │          └── KOL/DOL, P2P speaker
   │         │          │           │          │          └── Regular prescriber
   │         │          │           │          └── First Rx (Trial)
   │         │          │           └── Proof points, peer influence
   │         │          └── Field force push, early adopter targeting
   │         └── Product awareness, Day 0
   └── Pre-commercial, disease education only
```

### Stage Definitions

| Stage | Definition | Typical Engagement |
|-------|------------|-------------------|
| **Unaware** | Doesn't know product exists | Pre-commercial: disease state education only |
| **Aware** | Knows product, hasn't prescribed | Launch content, MOA, efficacy data |
| **Considering** | Evaluating for specific patients | Field detailing, competitive differentiation |
| **Interest** | Actively interested, seeking proof | RWE, peer influence, case studies |
| **Decision** | Ready to trial | Patient selection, dosing, access support |
| **Adoption** | Regular prescriber | Maintenance, new indications, loyalty |
| **Advocacy** | Recommends to peers, speaks | P2P programs, speaker opportunities |

### Simplified Stages (TwinEngine)

TwinEngine uses a 3-stage model:

| Stage | Maps To | Behavioral Signals |
|-------|---------|-------------------|
| **Aware** | Aware + Considering | Content views, webinar attendance |
| **Trial** | Interest + Decision | First Rx, sample requests |
| **Regular** | Adoption + Advocacy | Steady Rx volume, repeat engagement |

---

## Health State Classifications

### Status Definitions

| Status | Label | Description | Color |
|--------|-------|-------------|-------|
| `active` | Active | Recent engagement with positive response rate | Green |
| `declining` | Declining | Engagement trending down or stale (60+ days) | Yellow |
| `dark` | Dark | Low historical engagement, underutilized | Gray |
| `blocked` | Blocked | High touch frequency but low response | Red |
| `opportunity` | Opportunity | High affinity but underutilized | Purple |

### Classification Thresholds (TwinEngine Defaults)

```typescript
const defaultThresholds = {
  staleThresholdDays: 60,        // Days without contact → declining
  blockedResponseRate: 10,       // % response below this + high touches → blocked
  blockedMinTouches: 5,          // Min touches to consider blocked
  opportunityMinScore: 70,       // Min affinity score for opportunity
  opportunityMaxTouches: 3,      // Max touches for opportunity (underutilized)
  activeMinResponseRate: 30,     // Min response rate for active
  activeMaxDaysSinceContact: 30, // Max days since contact for active
};
```

### Classification Logic

```
IF responseRate < 10% AND totalTouches >= 5:
  → BLOCKED (being ignored)

ELSE IF affinityScore >= 70 AND totalTouches < 3:
  → OPPORTUNITY (high potential, underutilized)

ELSE IF responseRate >= 30% AND lastContactDays <= 30:
  → ACTIVE (healthy engagement)

ELSE IF lastContactDays > 60:
  → DECLINING (stale)

ELSE IF responseRate < 30% AND totalTouches > 0:
  → DECLINING (trending down)

ELSE:
  → DARK (minimal/no engagement)
```

---

## KOL vs DOL Distinction

### Key Opinion Leader (KOL)
- Traditional academic influence
- Congress speakers, publication authors
- Institutional affiliations
- Peer recognition in specialty
- **Engagement:** MSL, Speaker Programs, Advisory Boards

### Digital Opinion Leader (DOL)
- Social media influence
- Online engagement, content creation
- May overlap with KOL but digitally active
- Growing importance for HCP reach
- **Engagement:** Digital channels, P2P online, social

### Identification Signals

| Type | Signals |
|------|---------|
| KOL | Publication count, congress presentations, trial PI |
| DOL | Social followers, content shares, online engagement |
| Both | High influence + digital presence |

---

## Stage Transition Triggers

### Aware → Considering
- Multiple content engagements
- Rep visit completed
- Webinar attendance
- Portal registration

### Considering → Interest
- Sample request
- Deep content engagement (detail aids, PI)
- Peer consultation
- Follow-up request

### Interest → Decision
- First Rx written
- Access/coverage inquiry
- Patient identification discussion

### Decision → Adoption
- Repeat Rx (3+ patients)
- Consistent prescribing pattern
- Positive response rate maintained

### Adoption → Advocacy
- P2P participation
- Speaker interest/qualification
- Referral behavior
- High engagement sustained

---

## Lapsed/At-Risk Indicators

### Lapsed Definition
Previously regular prescriber now showing:
- Rx volume decline >30%
- Engagement drop-off
- Channel going dark

### At-Risk Signals
- Response rate declining
- Email fatigue indicators
- Missed rep appointments
- Competitor activity detected

### Win-Back Strategy
1. Identify root cause (access? efficacy concerns? fatigue?)
2. Channel shift if current channel blocked
3. Fresh content approach
4. Peer influence if appropriate

---

## Signal Index Concept

The Signal Index represents behavioral trajectory:

| Signal | Meaning |
|--------|---------|
| **Growing** | Engagement trending up, positive signals |
| **Stable** | Consistent engagement pattern |
| **Declining** | Engagement trending down |
| **At Risk** | Multiple negative signals |

### Typical Calculation Components
- Recency trend (improving or worsening?)
- Frequency trend (more or fewer touches?)
- Response trend (better or worse rates?)
- Channel diversity (expanding or contracting?)

*Note: Specific weights are implementation-dependent. Document in PROJECT-CONTEXT.*

---

## Rx Trend Indicators

| Trend | Visual | Meaning |
|-------|--------|---------|
| `up` | ↑ | Prescribing increasing |
| `flat` | → | Prescribing stable |
| `down` | ↓ | Prescribing declining |

---

## Health Summary Generation

For a given HCP's channel health array:

```
healthyChannels: count where status = "active"
issueChannels: count where status in ["blocked", "declining"]
opportunityChannels: count where status = "opportunity"

IF opportunityChannels > 0:
  → "Expand engagement on [opportunity channels]"
ELSE IF issueChannels > healthyChannels:
  → "Multiple channels need attention. Consider re-engagement."
ELSE IF healthyChannels >= 4:
  → "Strong multi-channel engagement. Maintain strategy."
ELSE:
  → "Focus on strengthening top-performing channels."
```
