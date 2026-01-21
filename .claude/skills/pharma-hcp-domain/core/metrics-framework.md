# Metrics Framework

> Engagement metrics, KPI definitions, and measurement concepts for HCP marketing.

---

## Engagement Score

A composite metric representing an HCP's overall engagement level across channels.

### Concept

The Engagement Score (0-100) synthesizes multiple signals into a single measure of HCP engagement health.

### Typical Components

| Component | Description | Weight Consideration |
|-----------|-------------|---------------------|
| **Recency** | Days since last interaction | Recent = higher score |
| **Frequency** | Interaction count over period | More (within reason) = higher |
| **Depth** | Quality of interactions | Opens < Clicks < Downloads < Calls |
| **Breadth** | Channel diversity | Multi-channel = higher score |
| **Progression** | Movement through content journey | Advancing = higher score |

### Score Interpretation

| Range | Label | Implication |
|-------|-------|-------------|
| 80-100 | High | Strong engagement, maintain/expand |
| 60-79 | Medium | Healthy, optimize opportunities |
| 40-59 | Low | Needs attention, re-engagement |
| 0-39 | Critical | At risk, intervention required |

*Note: Specific weights and formulas are implementation-dependent. Document in PROJECT-CONTEXT, not here.*

---

## Channel-Specific KPIs

### Email KPIs

| KPI | Definition | Good | Warning |
|-----|------------|------|---------|
| **Open Rate** | Opens / Delivered | ≥35% | <25% |
| **CTR** | Clicks / Delivered | ≥8% | <4% |
| **Reach** | Unique HCPs contacted | — | — |
| **Fatigue Index** | Composite overexposure measure | <30% | >50% |

### Field KPIs

| KPI | Definition | Good | Warning |
|-----|------------|------|---------|
| **Call Reach** | Completed calls / Attempted | — | — |
| **Frequency** | Avg touches per HCP per period | ~3.0 | <1.5 |
| **Access Rate** | HCPs seen / HCPs targeted | ≥70% | <50% |

### Congress KPIs

| KPI | Definition | Good | Warning |
|-----|------------|------|---------|
| **Attendance** | HCPs at event/booth | — | — |
| **Booth Engagement** | Badge scans, interactions | — | — |
| **Follow-Up Rate** | Post-event touches / Attendees | ≥45% | <30% |

### Webinar KPIs

| KPI | Definition | Good | Warning |
|-----|------------|------|---------|
| **Registration Rate** | Registrations / Invites | ≥60% | <40% |
| **Attendance %** | Attendees / Registrations | ≥70% | <50% |
| **Engagement Score** | Polls, Q&A, time watched | ≥75 | <55 |

### Paid Digital KPIs

| KPI | Definition | Good | Warning |
|-----|------------|------|---------|
| **CTR** | Clicks / Impressions | ≥2% | <1% |
| **Cost per Visit** | Spend / Site visits | Lower = better | — |
| **Viewability** | Viewable impressions / Total | ≥75% | <60% |

### Web KPIs

| KPI | Definition | Good | Warning |
|-----|------------|------|---------|
| **Time on Site** | Avg session duration (seconds) | ≥120s | <60s |
| **Content Downloads** | Resources downloaded | — | — |
| **Pages per Session** | Depth of engagement | — | — |

---

## Fatigue Index

Measures overexposure risk on a channel.

### Concept

High frequency + declining response = fatigue. The Fatigue Index helps prevent diminishing returns and opt-outs.

### Signals

- Declining open/response rates over time
- Increased unsubscribes or opt-outs
- Decreasing time spent on content
- Repeat exposure without action

### Thresholds (Email Example)

| Fatigue Index | Status | Action |
|---------------|--------|--------|
| <30% | Healthy | Continue normal cadence |
| 30-50% | Warning | Monitor, consider reducing frequency |
| >50% | Critical | Reduce frequency, refresh content |

---

## Channel Affinity

Identifies an HCP's preferred engagement channel.

### Concept

Each HCP has natural preferences for certain channels. Aligning outreach to affinity improves response rates.

### Calculation Approaches

1. **Stated preference:** Explicitly captured during registration/profiling
2. **Behavioral:** Channel with highest response rate
3. **Composite:** Weighted combination of engagement signals

### Usage

- NBA engine prioritizes affinity-aligned channels
- Campaign targeting uses affinity for channel selection
- Low-affinity channels may be deprioritized

---

## Response Rate

Percentage of touches that generate a response.

### Definition

```
Response Rate = (Responses / Total Touches) × 100
```

### What Counts as Response

| Channel | Response Actions |
|---------|-----------------|
| Email | Open, click, reply |
| Field | Meeting held, call completed |
| Webinar | Attended, engaged |
| Paid Digital | Click, conversion |
| Web | Return visit, download |

---

## Signal Index

Behavioral trajectory indicator — trending up, stable, or declining.

### Concept

Unlike Engagement Score (point-in-time), Signal Index captures **direction of change**.

### Categories

| Signal | Description |
|--------|-------------|
| **Growing** | Engagement metrics improving |
| **Stable** | Consistent engagement pattern |
| **Declining** | Engagement metrics worsening |
| **At Risk** | Multiple negative signals converging |

### Calculation Inputs

- Engagement Score delta (30-day vs prior 30-day)
- Response rate trend
- Channel diversity change
- Rx trend (if available)

---

## Rx Metrics (via Crossix)

When integrated with Veeva Crossix DIFA:

| Metric | Definition |
|--------|------------|
| **TRx** | Total prescriptions (new + refills) |
| **NRx** | New prescriptions only |
| **NBRx** | New-to-brand prescriptions |
| **Market Share** | Brand Rx / Total category Rx |
| **Rx Lift** | Post-exposure Rx change vs control |

### Privacy Note

Crossix data is privacy-safe (micro-cohort level, not individual). Attribution is statistical, not deterministic.

---

## Decile/Tier Definitions

HCPs are often tiered by prescribing volume:

| Decile | Description | Typical Targeting |
|--------|-------------|-------------------|
| 1-3 | High prescribers (top 30%) | Priority targeting, field focus |
| 4-6 | Medium prescribers | Balanced approach |
| 7-10 | Low prescribers | Digital-first, efficient reach |

### Alternative Tiering

| Tier | Criteria |
|------|----------|
| **A / Priority** | High Rx + High engagement |
| **B / Core** | Medium Rx or high potential |
| **C / Maintenance** | Low Rx, digital-only |

---

## Benchmark Sources

- **Industry benchmarks:** Veeva, IQVIA reports
- **Internal benchmarks:** Prior campaign performance
- **Competitive benchmarks:** Share of voice analysis

### Benchmark Application

```
IF metric >= good_benchmark:
  → Status: Healthy
ELSE IF metric >= warning_benchmark:
  → Status: Warning
ELSE:
  → Status: Critical
```
