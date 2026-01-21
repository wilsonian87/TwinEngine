# Pharma HCP Domain Skill

> **Purpose:** Domain knowledge for pharma HCP omnichannel marketing, targeting, and engagement.
> **Version:** 1.0.0
> **Last Updated:** 2026-01-18
> **Enrichment Status:** Baseline (TwinEngine extraction + Veeva research)

---

## When to Load This Skill

Claude should read this skill when working on:

- HCP engagement, targeting, or segmentation
- Omnichannel marketing or channel orchestration
- Content strategy or messaging theme selection
- Veeva integration or pharma martech
- NBA (Next Best Action) logic
- Agent rules involving pharma compliance
- TwinEngine/OmniVor development
- Any pharma life sciences marketing technology

---

## Quick Reference

### Channel Categories
→ See `core/channels.md`

| Category | Channels |
|----------|----------|
| Digital | Email (VAE), Web, Paid Digital, SMS/Text |
| Field | Sales Reps, MSL, FRM |
| Personal/Live | Congress, Webinar, Speaker Programs, P2P, Sampling |

### HCP Journey Stages
→ See `core/hcp-lifecycle.md`

```
Unaware → Aware → Considering → Interest → Decision → Adoption → Advocacy
```

Simplified (TwinEngine): `Aware → Trial → Regular`

### Health States
→ See `core/hcp-lifecycle.md`

| Status | Meaning |
|--------|---------|
| active | Recent engagement, positive response |
| declining | Trending down or stale (60+ days) |
| dark | Low/no historical engagement |
| blocked | High touches, low response (being ignored) |
| opportunity | High affinity, underutilized |

### Content Pillars
→ See `core/content-strategy.md`

| Pillar | Focus |
|--------|-------|
| Safety | Tolerability, AEs, warnings, ISI |
| Efficacy | Clinical outcomes, endpoints |
| Access | Reimbursement, copay, formulary |
| Differentiation | Competitive positioning |
| Disease Education | MOA, pathophysiology, unmet need |

### Veeva Integration (Core)
→ See `integrations/veeva-ecosystem.md`

| Product | Purpose |
|---------|---------|
| Vault CRM | HCP/Account management, call reporting |
| Vault PromoMats | MLR workflow, asset lifecycle |
| Approved Email | Compliant HCP email with templates/fragments |
| Crossix DIFA | Privacy-safe Rx attribution |

---

## Channel-Specific KPIs

| Channel | Primary KPIs | Good Benchmarks |
|---------|--------------|-----------------|
| Email | Open Rate, CTR, Fatigue Index | OR ≥35%, CTR ≥8% |
| Field | Call Reach, Frequency, Access Rate | Freq ~3.0, Access ≥70% |
| Congress | Attendance, Booth Scans, Follow-Up | Follow-up ≥45% |
| Webinar | Registration, Attendance, Engagement | Reg ≥60%, Attend ≥70% |
| Paid Digital | CTR, Cost/Visit, Viewability | CTR ≥2%, View ≥75% |
| Web | Time on Site, Downloads | ToS ≥120s |

---

## NBA Action Types

| Action | When to Use |
|--------|-------------|
| reach_out | Initiate contact on preferred channel |
| follow_up | Continue recent conversation |
| re_engage | Win back declining HCP |
| expand | Leverage high-affinity opportunity channel |
| maintain | Continue successful pattern |
| reduce_frequency | Scale back on blocked/fatigued channel |

---

## Compliance Essentials

→ See `compliance/regulatory-overview.md` and `compliance/adverse-events.md`

### MLR Review
- **Medical**: Clinical claims validity
- **Legal**: Advertising compliance
- **Regulatory**: FDA/EMA alignment, Fair Balance

### Fair Balance
Every efficacy claim must be balanced with appropriate safety information.

### Adverse Events
Report if: identifiable patient + reporter + drug + symptom
Serious AEs: Fatal, life-threatening, hospitalization, disability

---

## Integration Points

### With TENZING-METHODOLOGY

When running TKO for pharma projects:
```
TKO: Web App | HCP engagement portal | Veeva CRM, HIPAA-adjacent | Doing
```

This skill provides:
- Channel constraint defaults
- Schema patterns for HCP entities
- Validation rules for engagement data
- Compliance guardrails for agent behavior

### With omnivor-brand

When building TwinEngine UI:
- Use OmniVor brand colors/typography
- Apply pharma terminology from this skill
- Follow voice guidelines for HCP-facing copy

---

## File Index

| File | Purpose |
|------|---------|
| `core/channels.md` | Channel taxonomy, KPIs, groupings |
| `core/hcp-lifecycle.md` | Journey stages, health states, transitions |
| `core/content-strategy.md` | Message pillars, journey-aligned content |
| `core/metrics-framework.md` | Engagement concepts, KPI definitions |
| `compliance/regulatory-overview.md` | MLR, fair balance, channel rules |
| `compliance/adverse-events.md` | AE handling requirements |
| `integrations/veeva-ecosystem.md` | CRM, Vault, VAE, Crossix patterns |
| `integrations/data-sources.md` | NPI, specialty codes, Rx data |
| `glossary.md` | Industry + Veeva terminology |
| `twinengine/` | Implementation-specific patterns |

---

## Enrichment Protocol

When production data reveals patterns not in this skill:

1. Document finding in PROJECT-CONTEXT for specific project
2. Evaluate generalizability — Universal or client-specific?
3. If universal AND proven across 2+ implementations → PR to skill
4. If client-specific → Keep in project context
5. Update this file's version and Last Updated date

---

*Skill created: 2026-01-18*
*Based on: TwinEngine/OmniVor implementation + Veeva ecosystem research*
*Enrichment status: Baseline*
