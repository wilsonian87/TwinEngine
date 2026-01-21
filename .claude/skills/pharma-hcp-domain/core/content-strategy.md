# Content Strategy & Messaging

> Content pillars, messaging themes, and journey-aligned content guidance.

---

## Content Pillars

Instead of hardcoded theme codes, think in terms of **Content Pillars**:

| Pillar | Description | Typical Placement |
|--------|-------------|-------------------|
| **Safety** | Tolerability, side effects, warnings, contraindications | ISI, PI, fair balance sections |
| **Efficacy** | Clinical outcomes, data, endpoints, superiority | Core claims, detail aids, key visuals |
| **Access** | Reimbursement, copay, formulary, prior auth | Payer materials, FRM support, HUB info |
| **Resource** | Patient support, HUB services, adherence | Below-the-line, digital, patient materials |
| **Disease Education** | MOA, pathophysiology, unmet need | Pre-commercial, medical, awareness |
| **Competitive Differentiation** | Head-to-head, positioning, unique attributes | Rep training, objection handling |

---

## TwinEngine Messaging Themes (MT01-MT10)

Current implementation uses 10 coded themes:

| ID | Name | Description | Lifecycle Stage |
|----|------|-------------|-----------------|
| MT01 | Efficacy | Clinical effectiveness vs SOC or competitors | Launch → Mature |
| MT02 | Safety & Tolerability | AE profile, long-term safety, contraindications | Launch → LOE |
| MT03 | Mechanism of Action | Scientific rationale, pathway targeting | Pre-Launch → Early Launch |
| MT04 | Differentiation | Competitive positioning, unique attributes | Launch → Growth |
| MT05 | Patient Selection | Which patients, biomarkers, phenotypes | Growth → Mature |
| MT06 | Dosing & Administration | Convenience, regimen, device | Growth → Mature |
| MT07 | Access & Reimbursement | Payer coverage, affordability | Launch → Mature |
| MT08 | Guidelines & Evidence | Inclusion in NCCN, ADA, ACC, etc. | Growth → Mature |
| MT09 | Real-World Evidence | Post-marketing, outcomes data | Mature |
| MT10 | Awareness / Disease State | Unbranded education | Pre-Launch |

### Theme-to-Pillar Mapping

| Theme | Primary Pillar | Secondary Pillar |
|-------|----------------|------------------|
| MT01 Efficacy | Efficacy | — |
| MT02 Safety | Safety | — |
| MT03 MOA | Disease Education | Efficacy |
| MT04 Differentiation | Competitive | Efficacy |
| MT05 Patient Selection | Efficacy | Resource |
| MT06 Dosing | Resource | Efficacy |
| MT07 Access | Access | Resource |
| MT08 Guidelines | Efficacy | Disease Education |
| MT09 RWE | Efficacy | Safety |
| MT10 Awareness | Disease Education | — |

### Theme Color Coding (TwinEngine)

| Theme | Color | Hex |
|-------|-------|-----|
| MT01 Efficacy | Green | #22C55E |
| MT02 Safety | Red | #EF4444 |
| MT03 MOA | Blue | #3B82F6 |
| MT04 Differentiation | Purple | #8B5CF6 |
| MT05 Patient Selection | Amber | #F59E0B |
| MT06 Dosing | Cyan | #06B6D4 |
| MT07 Access | Pink | #EC4899 |
| MT08 Guidelines | Teal | #14B8A6 |
| MT09 RWE | Indigo | #6366F1 |
| MT10 Awareness | Slate | #64748B |

---

## Journey-Aligned Messaging Phases

| Phase | Timing | Message Focus | Primary Themes |
|-------|--------|---------------|----------------|
| **Pre-commercial** | Before approval | Disease awareness, unmet need | MT10, MT03 |
| **Launch Readiness** | T-90 to T-0 | Internal alignment, field training | MT01, MT02, MT03 |
| **Day 0 / Now Approved** | Approval date | Regulatory milestone, availability | MT01, MT02 |
| **Launch Push** | T+0 to T+90 | Trial generation, early adopters | MT01, MT04, MT05 |
| **Growth** | T+90 to T+365 | Broadening, competitive defense | MT04, MT08, MT09 |
| **Mature** | T+365+ | Loyalty, lifecycle management | MT07, MT09, MT06 |
| **LOE Prep** | Pre-LOE | Value reinforcement, access defense | MT07, MT09 |

---

## Content Strategy Research Method

> "Use HCP.com sitemaps to inform content strategy"

When analyzing a brand's content strategy:

1. **Review brand website IA** — What's in the main nav?
2. **Identify content hierarchy** — What's featured vs. buried?
3. **Map to pillars** — Which pillars are emphasized?
4. **Identify gaps** — What's missing or underweight?
5. **Competitive comparison** — How does competitor.com differ?

---

## Channel-Content Fit

### Email
- Short, scannable content
- Single CTA focus
- Fragments for personalization
- Links to deeper content

### Field/Rep
- Detail aids, leave-behinds
- Objection handling guides
- Patient case discussions
- Sample requests

### Webinar
- Educational, longer-form
- Expert speakers (KOL)
- Q&A interaction
- CME potential

### Congress
- Booth materials, key visuals
- Data presentations
- Meet-the-expert sessions
- Post-event follow-up

### Paid Digital
- Awareness/reach focused
- Branded or unbranded
- Drive to deeper engagement
- Retargeting eligible

### Web/Portal
- Comprehensive resources
- Self-service content
- Gated for HCP verification
- Analytics-rich

---

## Content Fatigue Indicators

### By Theme
- Same theme repeated >3x in 30 days
- No theme rotation in campaigns
- Declining engagement on theme-specific content

### By Channel
- Email: Open rate declining, unsubscribes rising
- Field: Access declining, shorter calls
- Digital: CTR dropping, frequency capping hit

### Mitigation
1. Rotate themes within content pillar
2. Introduce new content formats
3. Shift channels for variety
4. Test message refresh

---

## Fair Balance Requirements

Every promotional piece must include appropriate safety information:

### Required Elements
- **ISI (Important Safety Information):** Condensed safety for ads
- **PI (Prescribing Information):** Full label, linked or attached
- **Black Box Warning:** If applicable, prominent placement
- **Indication Statement:** Approved use only

### Placement Rules
- ISI must be "comparable prominence" to efficacy claims
- Scrolling ISI must be readable speed
- PI link required on digital
- Fair Balance = risk info proportional to benefit claims

---

## Modular Content Approach

Veeva PromoMats supports modular content:

### Benefits
- Pre-approved modules reduce MLR time
- Consistent messaging across channels
- Faster content assembly
- Reduced review burden (only new/changed content)

### Module Types
- Claims (efficacy statements)
- Safety blocks (ISI, warnings)
- Brand elements (logo, tagline)
- CTAs (standard actions)
- Data visualizations (charts, graphs)

### Best Practice
- Build module library by pillar
- Tag with metadata (theme, channel, audience)
- Track module performance
- Retire underperforming modules
