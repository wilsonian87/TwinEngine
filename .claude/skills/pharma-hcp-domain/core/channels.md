# Channel Taxonomy

> Comprehensive channel definitions for pharma HCP omnichannel marketing.

---

## Channel Groupings

```
Digital Channels
├── Email (Veeva Approved Email)
├── Web (Owned properties, portals)
├── Paid Digital (Display, Social, Programmatic)
├── SMS/Text (TCPA compliance critical)
└── Social Media (organic)

Field Resources
├── Traditional Field Sales (Reps)
├── MSL (Medical Science Liaison - Medical Affairs)
└── FRM (Field Reimbursement Manager - Payer/Market Access)

Personal/Live Channels
├── Congress/Medical Meetings
├── Webinar
├── Speaker Programs (compliance-heavy)
├── Peer-to-Peer Programs (HCP-to-HCP)
└── Sampling (physical product distribution)
```

---

## Channel Definitions

### Digital Channels

#### Email (Veeva Approved Email)
- **Category:** Digital
- **Description:** MLR-approved templated email sent by reps or automated
- **KPIs:** Open Rate, CTR, Reach, Fatigue Index
- **Benchmarks:** OR ≥35% (good), ≥25% (warning); CTR ≥8% (good), ≥4% (warning)
- **Compliance:** Consent required, unsubscribe mandatory, ISI placement
- **Fatigue Risk:** HIGH - monitor Fatigue Index, cap frequency

#### Web (Owned Properties)
- **Category:** Digital
- **Description:** Brand websites, HCP portals, resource centers
- **KPIs:** Time on Site, Content Downloads, Logins
- **Benchmarks:** ToS ≥120s (good), ≥60s (warning)
- **Notes:** Self-directed engagement, content must be MLR-approved

#### Paid Digital
- **Category:** Digital
- **Description:** Display ads, programmatic, paid social, endemic placements
- **KPIs:** CTR, Cost per Visit, Viewability
- **Benchmarks:** CTR ≥2% (good), ≥1% (warning); Viewability ≥75% (good)
- **Notes:** Often measured via Crossix DIFA for Rx attribution

#### SMS/Text
- **Category:** Digital
- **Description:** Text message communications to HCPs
- **KPIs:** Delivery Rate, Response Rate, Opt-out Rate
- **Compliance:** TCPA critical - explicit opt-in required
- **Notes:** Not currently in TwinEngine, high-impact when compliant

### Field Resources

#### Field Sales (Reps)
- **Category:** Field
- **Description:** In-person rep visits, detailing, sample drops
- **KPIs:** Call Reach, Frequency, Access Rate
- **Benchmarks:** Frequency ~3.0 (good), ≥1.5 (warning); Access ≥70% (good)
- **Notes:** Highest impact per touch, limited scale, declining access

#### MSL (Medical Science Liaison)
- **Category:** Field / Medical Affairs
- **Description:** Non-promotional scientific exchange with KOLs
- **KPIs:** Scientific Exchange Meetings, KOL Coverage, Follow-up Rate
- **Compliance:** Must be non-promotional, scientific only
- **Notes:** Critical for specialty/oncology, separate from sales

#### FRM (Field Reimbursement Manager)
- **Category:** Field / Payer-Market Access
- **Description:** Support for access, reimbursement, prior auth
- **KPIs:** Coverage Rate, PA Support Volume, Time to Access
- **Notes:** Often grouped under "field" in reporting

### Personal/Live Channels

#### Congress/Medical Meetings
- **Category:** Events
- **Description:** Medical conferences, symposia, booth presence
- **KPIs:** Attendance, Booth Engagement (Scans), Follow-Up Rate
- **Benchmarks:** Follow-up ≥45% (good), ≥30% (warning)
- **Notes:** Brand moments, high-value touchpoints, seasonal

#### Webinar
- **Category:** Digital / Events
- **Description:** Live or on-demand virtual educational sessions
- **KPIs:** Registration Rate, Attendance %, Engagement Score
- **Benchmarks:** Reg ≥60% (good); Attend ≥70% (good), ≥50% (warning)
- **Notes:** Grew significantly post-COVID, peer influence driver

#### Speaker Programs
- **Category:** Personal
- **Description:** Branded speaker events, dinner programs
- **KPIs:** Attendance, Speaker Engagement, Post-Event Rx Lift
- **Compliance:** Heavy - Sunshine Act reporting, fair market value
- **Notes:** Separate compliance rules from Congress

#### Peer-to-Peer (P2P)
- **Category:** Personal
- **Description:** HCP-to-HCP engagement programs
- **KPIs:** Participation Rate, Referrals, Advocacy Score
- **Notes:** Advocacy driver, involves KOLs/DOLs

#### Sampling
- **Category:** Field
- **Description:** Physical product sample distribution
- **KPIs:** Sample Request Rate, Conversion to Rx
- **Compliance:** PDMA regulations, lot tracking required
- **Notes:** Trial catalyst, declining due to digital alternatives

---

## TwinEngine Channel Mapping

| TwinEngine ID | Display Name | Category |
|---------------|--------------|----------|
| `email` | Email | Digital |
| `field` | Field/MSL | Field |
| `congress` | Congress | Events |
| `webinar` | Webinar | Digital/Events |
| `paid_media` | Paid Digital | Digital |
| `web` | Web | Digital |

### Color Coding (TwinEngine)

| Channel | Primary Color | Hex |
|---------|---------------|-----|
| email | Blue | #3B82F6 |
| field | Orange | #F97316 |
| congress | Purple | #8B5CF6 |
| webinar | Green | #22C55E |
| paid_media | Pink | #EC4899 |
| web | Cyan | #06B6D4 |

---

## Channel Selection Guidance

### By HCP Preference
- **Digital-first HCPs:** Email, Webinar, Web
- **Access-restricted HCPs:** Email, Paid Digital (no rep access)
- **High-value/KOLs:** Field, Congress, Speaker Programs, MSL

### By Lifecycle Stage
- **Aware:** Disease education (Web, Webinar), MOA content
- **Trial:** Field detailing, Sampling, Peer influence
- **Regular:** Maintenance (Email cadence), Access support (FRM)
- **Advocacy:** P2P programs, Speaker opportunities

### By Therapeutic Area
- **Oncology/Specialty:** MSL-heavy, Congress-focused, longer cycles
- **Primary Care:** Higher volume, digital-first, rep efficiency critical

---

## Constraints and Frequency Caps

| Channel | Typical Cap | Rationale |
|---------|-------------|-----------|
| Email | 2-4/month | Fatigue prevention |
| Field | 6-12/year | Access limitations, call plan |
| SMS | 1-2/month | TCPA, high opt-out risk |
| Paid Digital | Impression caps | Budget, frequency fatigue |

---

## Channel Health Classification

→ See `hcp-lifecycle.md` for full health state definitions

| Status | Channel Implication |
|--------|---------------------|
| active | Continue current cadence |
| declining | Re-engagement campaign needed |
| dark | Channel underutilized, test receptivity |
| blocked | Reduce frequency, try alternative |
| opportunity | Expand - high affinity, low touches |
