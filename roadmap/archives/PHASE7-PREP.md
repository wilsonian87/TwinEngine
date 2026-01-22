# Phase 7-PREP: Data Foundation

## Objective
Generate synthetic interaction history data to enable Phase 7 development. Transform the current sparse dataset (100 HCPs, 0 events) into a rich foundation for orchestration intelligence.

## Current → Target State

| Table | Current | Target | Notes |
|-------|---------|--------|-------|
| hcp_profiles | 100 | 2,000 | Diverse specialties, tiers, geographies |
| stimuli_events | 0 | 80,000 | 12 months history, ~40 touches/HCP avg |
| outcome_events | 0 | 16,000 | ~20% response rate on stimuli |
| prescribing_history | embedded | 24,000 | Monthly snapshots, 12 months × 2000 HCPs |
| territory_assignments | 0 | 2,500 | 200 reps, ~10-12 HCPs each |
| campaigns | 0 | 50 | Historical campaigns with participation |

---

## Execution Tasks

### Task 1: Schema Migration
Add new tables to `shared/schema.ts`:

```typescript
// 1. Prescribing History - Monthly snapshots
export const prescribingHistory = pgTable("prescribing_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hcpId: varchar("hcp_id").notNull().references(() => hcpProfiles.id),
  month: timestamp("month").notNull(),
  rxCount: integer("rx_count").notNull(),
  marketShare: real("market_share").notNull(),
  productMix: jsonb("product_mix").$type<Record<string, number>>(),
  dataSource: varchar("data_source", { length: 50 }).default("synthetic"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 2. Territory Assignments - Rep to HCP mappings
export const territoryAssignments = pgTable("territory_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  repId: varchar("rep_id", { length: 100 }).notNull(),
  repName: varchar("rep_name", { length: 200 }).notNull(),
  hcpId: varchar("hcp_id").notNull().references(() => hcpProfiles.id),
  territory: varchar("territory", { length: 100 }).notNull(),
  region: varchar("region", { length: 100 }).notNull(),
  assignedAt: timestamp("assigned_at").notNull(),
  isPrimary: integer("is_primary").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 3. Campaigns - Historical campaign definitions
export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  campaignType: varchar("campaign_type", { length: 50 }).notNull(),
  channels: jsonb("channels").notNull().$type<string[]>(),
  targetSegments: jsonb("target_segments").$type<string[]>(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  budget: real("budget"),
  status: varchar("status", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 4. Campaign Participation - HCP enrollment tracking
export const campaignParticipation = pgTable("campaign_participation", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id),
  hcpId: varchar("hcp_id").notNull().references(() => hcpProfiles.id),
  enrolledAt: timestamp("enrolled_at").notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  touchCount: integer("touch_count").notNull().default(0),
  responseCount: integer("response_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 5. Stimuli Events - Interaction history
export const stimuliEvents = pgTable("stimuli_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hcpId: varchar("hcp_id").notNull().references(() => hcpProfiles.id),
  campaignId: varchar("campaign_id").references(() => campaigns.id),
  channel: varchar("channel", { length: 20 }).notNull(),
  stimulusType: varchar("stimulus_type", { length: 50 }).notNull(),
  contentCategory: varchar("content_category", { length: 50 }),
  eventDate: timestamp("event_date").notNull(),
  repId: varchar("rep_id", { length: 100 }),
  deliveryStatus: varchar("delivery_status", { length: 20 }).notNull().default("delivered"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 6. Outcome Events - Response tracking with attribution
export const outcomeEvents = pgTable("outcome_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hcpId: varchar("hcp_id").notNull().references(() => hcpProfiles.id),
  stimulusId: varchar("stimulus_id").references(() => stimuliEvents.id),
  outcomeType: varchar("outcome_type", { length: 50 }).notNull(),
  outcomeValue: real("outcome_value"),
  eventDate: timestamp("event_date").notNull(),
  attributionConfidence: real("attribution_confidence"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 7. Channel Capacity - Daily/weekly limits (Phase 7A prep)
export const channelCapacity = pgTable("channel_capacity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channel: varchar("channel", { length: 20 }).notNull(),
  capacityType: varchar("capacity_type", { length: 20 }).notNull(),
  limitValue: integer("limit_value").notNull(),
  period: varchar("period", { length: 20 }).notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 8. HCP Contact Limits - Per-HCP contact constraints
export const hcpContactLimits = pgTable("hcp_contact_limits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hcpId: varchar("hcp_id").notNull().references(() => hcpProfiles.id),
  channel: varchar("channel", { length: 20 }).notNull(),
  maxContactsPerMonth: integer("max_contacts_per_month").notNull(),
  minDaysBetweenContacts: integer("min_days_between_contacts").notNull(),
  preferredDays: jsonb("preferred_days").$type<number[]>(),
  blackoutDates: jsonb("blackout_dates").$type<string[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

**Verification:** Run `npm run db:push` successfully.

---

### Task 2: Create Generator Framework

**File structure:**
```
server/services/data-generation/
├── index.ts                    # Main entry, CLI interface
├── config.ts                   # Distribution weights and rules
├── generators/
│   ├── persona-generator.ts    # HCP personas
│   ├── territory-generator.ts  # Rep assignments
│   ├── campaign-generator.ts   # Historical campaigns
│   ├── stimuli-generator.ts    # Interaction events
│   ├── outcome-generator.ts    # Response events
│   └── rx-generator.ts         # Prescribing history
├── validators/
│   └── integrity-validator.ts  # FK, temporal, aggregation checks
└── seed-data/
    ├── organizations.json      # 500 org names
    └── cities.json             # City/state/region mappings
```

---

### Task 3: config.ts - Distribution Rules

```typescript
export const SPECIALTY_WEIGHTS = {
  Oncology: 0.15,
  Cardiology: 0.12,
  Neurology: 0.10,
  Endocrinology: 0.10,
  Rheumatology: 0.08,
  Pulmonology: 0.08,
  Gastroenterology: 0.10,
  Nephrology: 0.08,
  Dermatology: 0.10,
  Psychiatry: 0.09,
};

export const TIER_BY_SPECIALTY = {
  Oncology: { "Tier 1": 0.30, "Tier 2": 0.40, "Tier 3": 0.30 },
  Cardiology: { "Tier 1": 0.25, "Tier 2": 0.35, "Tier 3": 0.40 },
  default: { "Tier 1": 0.20, "Tier 2": 0.35, "Tier 3": 0.45 },
};

export const SEGMENT_BY_TIER = {
  "Tier 1": { "High Prescriber": 0.50, "Academic Leader": 0.30, "Growth Potential": 0.20 },
  "Tier 2": { "Growth Potential": 0.40, "Engaged Digital": 0.30, "High Prescriber": 0.30 },
  "Tier 3": { "New Target": 0.40, "Traditional Preference": 0.35, "Engaged Digital": 0.25 },
};

export const CHANNEL_FREQUENCY = {
  email: { min: 2, max: 6 },
  rep_visit: { min: 0, max: 2 },
  phone: { min: 0, max: 1 },
  webinar: { min: 0, max: 1 },
  digital_ad: { min: 5, max: 15 },
  conference: { min: 0, max: 0.25 },
};

export const CONTENT_CATEGORIES = {
  clinical_data: 0.30,
  patient_outcomes: 0.25,
  access_savings: 0.20,
  peer_perspective: 0.15,
  product_update: 0.10,
};

export const BASE_RESPONSE_RATES = {
  email_send: { email_open: 0.25, email_click: 0.08 },
  email_open: { email_click: 0.30 },
  rep_visit: { meeting_scheduled: 0.60, sample_request: 0.40 },
  webinar_invite: { webinar_attend: 0.15 },
  phone_call: { meeting_scheduled: 0.20 },
};

export const TIER_MODIFIERS = { "Tier 1": 1.3, "Tier 2": 1.0, "Tier 3": 0.7 };
```

---

### Task 4: persona-generator.ts

Generate 2,000 HCPs with:
- **Identity:** Unique NPI (Luhn-valid 10-digit), first/last name
- **Classification:** Specialty, tier, segment (using weighted distributions)
- **Geography:** State (population-weighted), city, organization
- **Behavioral DNA:** Channel affinities, response latency, engagement volatility, base conversion rate

**Key rules:**
- NPIs must be unique and Luhn-valid
- Segment must correlate with tier per `SEGMENT_BY_TIER`
- Channel preference derived from highest affinity

---

### Task 5: territory-generator.ts

Generate 200 reps with 10-12 HCPs each:
- Cluster assignments geographically (same state/region)
- Each HCP has exactly one primary rep
- Rep visits HCPs in same city on same day (realistic pattern)

---

### Task 6: campaign-generator.ts

Generate 40-50 historical campaigns spanning 12 months:
- Mix of campaign types: email_nurture, product_launch, conference, peer_engagement
- Varying durations: 2 weeks to 3 months
- Channel mix per campaign type
- Realistic overlaps (max 3 concurrent)

---

### Task 7: stimuli-generator.ts

Generate ~80,000 stimuli events:
- Date range: 12 months ago → today
- Per-HCP monthly volume based on channel frequency + affinity modifier
- **Temporal patterns to encode:**
  1. Rep visits cluster geographically (same day, same city)
  2. Email campaigns batched (500 HCPs, same day)
  3. Webinar invites 14 days before event
  4. Conference touches spike around event dates
  5. Quarter-end push (Mar, Jun, Sep, Dec)
- **Blackouts:** No touches on major holidays
- Link to campaigns when applicable

---

### Task 8: outcome-generator.ts

Generate ~16,000 outcome events (~20% response rate):
- **Response types:** email_open, email_click, meeting_scheduled, webinar_attend, sample_request
- **Latency distributions:**
  - email_open: mean 0.5 days
  - email_click: mean 1 day
  - meeting_scheduled: mean 3 days
  - webinar_attend: fixed to event date
- **Modifiers applied:** tier, channel affinity, fatigue (touches this month), content match
- **Constraint:** outcome date > stimulus date, within attribution window

---

### Task 9: rx-generator.ts

Generate prescribing history (24,000 records = 2,000 HCPs × 12 months):
- Monthly Rx = baseline × engagement lift × seasonality × noise
- Baseline from HCP persona's `baseConversionRate × 50`
- Engagement lift: good engagement in last 30 days → +10-30%
- Seasonality: Q1 high, Q3 low, Q4 high

---

### Task 10: Aggregation Recalculator

After all data generated, recalculate `hcp_profiles.channelEngagements`:
```typescript
function calculateChannelEngagements(hcpId: string, stimuli: StimuliEvent[], outcomes: OutcomeEvent[]) {
  return channels.map(channel => {
    const channelStimuli = stimuli.filter(s => s.channel === channel);
    const channelOutcomes = outcomes.filter(o => linkedToChannel(o, channel, stimuli));
    return {
      channel,
      score: calculateEngagementScore(channelStimuli, channelOutcomes),
      lastContact: formatRelativeDate(maxBy(channelStimuli, 'eventDate')?.eventDate),
      totalTouches: channelStimuli.length,
      responseRate: channelStimuli.length > 0 ? (channelOutcomes.length / channelStimuli.length) * 100 : 0,
    };
  });
}
```

---

### Task 11: Integrity Validator

Validate before committing:
- [ ] NPI uniqueness
- [ ] All FKs resolve (hcpId, campaignId, stimulusId)
- [ ] Temporal order: outcome.eventDate > stimulus.eventDate
- [ ] Attribution windows respected
- [ ] No duplicate event IDs
- [ ] Channel engagement scores match calculated values

---

### Task 12: CLI Interface

Add to `package.json`:
```json
{
  "scripts": {
    "generate:data": "npx tsx server/services/data-generation/index.ts"
  }
}
```

**Usage:**
```bash
npm run generate:data -- --seed=42 --hcps=2000 --months=12 --wipe
npm run generate:data -- --validate-only
```

---

## Generation Order (Dependencies)

```
1. HCP Personas           → validates: NPI unique, specialty/tier/segment combos
2. Territory Assignments  → requires: HCPs → validates: each HCP has 1 primary rep
3. Campaigns              → validates: date ranges plausible
4. Stimuli Events         → requires: HCPs, Campaigns → validates: dates in range
5. Outcome Events         → requires: Stimuli → validates: outcome > stimulus date
6. Prescribing History    → requires: HCPs, Stimuli, Outcomes
7. Aggregation Update     → requires: all above → updates: hcp_profiles scores
```

---

## Verification Checklist

After generation completes:
- [ ] `SELECT COUNT(*) FROM hcp_profiles` → ~2,000
- [ ] `SELECT COUNT(*) FROM stimuli_events` → ~80,000
- [ ] `SELECT COUNT(*) FROM outcome_events` → ~16,000
- [ ] `SELECT COUNT(*) FROM prescribing_history` → ~24,000
- [ ] `SELECT COUNT(*) FROM territory_assignments` → ~2,500
- [ ] `SELECT COUNT(*) FROM campaigns` → ~50
- [ ] Response rate: `outcome_events / stimuli_events` ≈ 0.20
- [ ] Spot check: "Does Dr. Smith's history look realistic?"

---

## Success Criteria

Phase 7-PREP is complete when:
1. All 8 new tables exist with correct schema
2. Data generation CLI runs successfully with `--seed=42`
3. All validation checks pass
4. Dataset is reproducible (same seed → same data)
5. HCP channel engagement scores match calculated aggregations
