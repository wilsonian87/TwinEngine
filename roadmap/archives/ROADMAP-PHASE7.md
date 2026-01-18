# ROADMAP: TwinEngine Phase 7 — Orchestration Intelligence

**Goal:** Transform TwinEngine from advisory platform to autonomous orchestration engine capable of portfolio-level optimization under real-world constraints  
**Target:** AI-managed HCP engagement with human oversight  
**Mode:** Milestone-based (Supervised Autonomous)  
**Prerequisite:** Phase 6 Complete (Agentic Ecosystem)  
**Generated:** 2026-01-16

---

## Executive Summary

Phase 7 elevates TwinEngine from "advisor that suggests actions" to "orchestrator that optimizes portfolios." The key insight: current agents recommend individual actions but lack awareness of constraints (capacity, budget, conflicts) and can't reason about trade-offs across the portfolio.

This phase builds the infrastructure for an AI system to:
1. Know what resources are available (capacity, budget, compliance windows)
2. Learn from outcomes in real-time (not batch)
3. Reason about uncertainty (when to explore vs. exploit)
4. Coordinate across campaigns (avoid conflicts)
5. Optimize at portfolio level (maximize total lift, not individual actions)

---

## Architecture: Optimization Intelligence Stack

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ORCHESTRATION INTELLIGENCE                        │
│                    (Phase 7 Addition)                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐        │
│  │   Constraint    │   │    Outcome      │   │   Uncertainty   │        │
│  │    Surface      │   │    Stream       │   │  Quantification │        │
│  │                 │   │                 │   │                 │        │
│  │  • Capacity     │   │  • Real-time    │   │  • Epistemic    │        │
│  │  • Budget       │   │  • Attribution  │   │  • Aleatoric    │        │
│  │  • Compliance   │   │  • Decay        │   │  • Staleness    │        │
│  │  • Territory    │   │  • Partial      │   │  • Drift        │        │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘        │
│           │                     │                     │                  │
│           └─────────────────────┼─────────────────────┘                  │
│                                 ▼                                        │
│                    ┌────────────────────────┐                            │
│                    │   Campaign Coordinator │                            │
│                    │                        │                            │
│                    │  • Reservations        │                            │
│                    │  • Conflict detection  │                            │
│                    │  • Priority arbitration│                            │
│                    └───────────┬────────────┘                            │
│                                │                                         │
│                                ▼                                         │
│                    ┌────────────────────────┐                            │
│                    │   Portfolio Optimizer  │  ← Capstone                │
│                    │                        │                            │
│                    │  • Batch simulation    │                            │
│                    │  • Constraint solver   │                            │
│                    │  • Allocation engine   │                            │
│                    └───────────┬────────────┘                            │
│                                │                                         │
│                                ▼                                         │
│                    ┌────────────────────────┐                            │
│                    │   Execution Planner    │                            │
│                    │                        │                            │
│                    │  • Time-ordered queue  │                            │
│                    │  • Resource booking    │                            │
│                    │  • Rebalancing         │                            │
│                    └────────────────────────┘                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
              ┌──────────────────────────────────────┐
              │   Existing Agentic Ecosystem (Ph 6)  │
              │   • Channel Health Monitor           │
              │   • Insight Synthesizer              │
              │   • Orchestrator + Approval          │
              └──────────────────────────────────────┘
```

---

## Phase 7A: Constraint Surfaces

**Goal:** Define and track what resources are available for engagement  
**Effort Estimate:** 10-12 hours  
**Dependencies:** None (foundational)

### Why This First

The optimization layer can't allocate resources it doesn't know exist. Before we can optimize "given 100 rep-hours, how should we allocate them?", we need to model what "100 rep-hours" means and how it depletes.

---

### M7A.1: Engagement Constraint Schema

**Schema Addition** (`shared/schema.ts`):
```typescript
// Channel capacity (how much can we do?)
export const channelCapacity = pgTable("channel_capacity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channel: varchar("channel", { length: 20 }).notNull(),
  capacityType: varchar("capacity_type", { length: 30 }).notNull(), // "daily_limit", "weekly_limit", "concurrent"
  maxValue: integer("max_value").notNull(),
  currentUtilization: integer("current_utilization").notNull().default(0),
  resetSchedule: varchar("reset_schedule", { length: 50 }), // cron expression for reset
  lastResetAt: timestamp("last_reset_at"),
  effectiveFrom: timestamp("effective_from").notNull().defaultNow(),
  effectiveUntil: timestamp("effective_until"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// HCP contact frequency limits (how often can we touch an HCP?)
export const hcpContactLimits = pgTable("hcp_contact_limits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hcpId: varchar("hcp_id").references(() => hcpProfiles.id),
  channel: varchar("channel", { length: 20 }).notNull(),
  maxPerMonth: integer("max_per_month").notNull().default(4),
  cooldownDays: integer("cooldown_days").notNull().default(7),
  currentMonthTouches: integer("current_month_touches").notNull().default(0),
  lastContactAt: timestamp("last_contact_at"),
  nextEligibleAt: timestamp("next_eligible_at"),
  source: varchar("source", { length: 50 }), // "default", "hcp_preference", "compliance", "manual"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Compliance blackout windows (when can't we engage?)
export const complianceWindows = pgTable("compliance_windows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  channel: varchar("channel", { length: 20 }), // null = all channels
  windowType: varchar("window_type", { length: 30 }).notNull(), // "blackout", "restricted", "preferred"
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  recurrence: varchar("recurrence", { length: 50 }), // "none", "yearly", "quarterly"
  affectedHcpIds: jsonb("affected_hcp_ids").$type<string[] | null>(), // null = all HCPs
  affectedSpecialties: jsonb("affected_specialties").$type<string[] | null>(),
  reason: varchar("reason", { length: 100 }), // "conference", "holiday", "regulation"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Budget tracking
export const budgetAllocations = pgTable("budget_allocations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id"),
  channel: varchar("channel", { length: 20 }),
  periodType: varchar("period_type", { length: 20 }).notNull(), // "daily", "weekly", "monthly", "campaign"
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  allocatedAmount: real("allocated_amount").notNull(),
  spentAmount: real("spent_amount").notNull().default(0),
  committedAmount: real("committed_amount").notNull().default(0), // planned but not executed
  costPerAction: jsonb("cost_per_action").$type<Record<string, number>>(), // action_type -> cost
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Rep territory assignments
export const territoryAssignments = pgTable("territory_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  repId: varchar("rep_id", { length: 100 }).notNull(),
  repName: varchar("rep_name", { length: 200 }).notNull(),
  hcpId: varchar("hcp_id").notNull().references(() => hcpProfiles.id),
  assignmentType: varchar("assignment_type", { length: 30 }).notNull(), // "primary", "secondary", "backup"
  effectiveFrom: timestamp("effective_from").notNull().defaultNow(),
  effectiveUntil: timestamp("effective_until"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

**Tasks:**
- [ ] Add 5 constraint tables to `shared/schema.ts` with Zod validation schemas
- [ ] Add insert/select/update schemas for each table
- [ ] Run `npm run db:push` to create tables
- [ ] Add TypeScript types for constraint checking

**Acceptance Criteria:**
- All constraint tables exist in database
- Types are available for server and client use

---

### M7A.2: Constraint Storage Layer

**Service Addition** (`server/services/constraint-manager.ts`):

**Tasks:**
- [ ] Create `server/services/constraint-manager.ts` with interface:
  ```typescript
  interface IConstraintManager {
    // Capacity
    getChannelCapacity(channel: Channel): Promise<ChannelCapacity>;
    consumeCapacity(channel: Channel, amount: number): Promise<boolean>;
    releaseCapacity(channel: Channel, amount: number): Promise<void>;
    resetCapacity(channel: Channel): Promise<void>;
    
    // HCP Limits
    canContactHcp(hcpId: string, channel: Channel): Promise<ContactEligibility>;
    recordContact(hcpId: string, channel: Channel): Promise<void>;
    getNextEligibleDate(hcpId: string, channel: Channel): Promise<Date | null>;
    
    // Compliance
    isInBlackout(channel: Channel, date: Date, hcpId?: string): Promise<boolean>;
    getActiveWindows(date: Date): Promise<ComplianceWindow[]>;
    
    // Budget
    getBudgetStatus(campaignId?: string, channel?: Channel): Promise<BudgetStatus>;
    commitBudget(amount: number, campaignId?: string, channel?: Channel): Promise<boolean>;
    releaseBudget(amount: number, campaignId?: string, channel?: Channel): Promise<void>;
    recordSpend(amount: number, campaignId?: string, channel?: Channel): Promise<void>;
    
    // Territory
    getAssignedReps(hcpId: string): Promise<TerritoryAssignment[]>;
    canRepContactHcp(repId: string, hcpId: string): Promise<boolean>;
    
    // Aggregate constraint check
    checkConstraints(action: ProposedAction): Promise<ConstraintCheckResult>;
  }
  ```
- [ ] Implement CRUD storage methods in `server/storage.ts`
- [ ] Add constraint checking logic with clear pass/fail reasons
- [ ] Add constraint reset scheduler (daily capacity reset)

**Acceptance Criteria:**
- Can query any constraint type
- Can check if an action violates any constraints
- Capacity auto-resets on schedule

---

### M7A.3: Constraint API Endpoints

**Tasks:**
- [ ] Create `/api/constraints/capacity` CRUD endpoints
- [ ] Create `/api/constraints/hcp-limits` CRUD endpoints
- [ ] Create `/api/constraints/compliance-windows` CRUD endpoints
- [ ] Create `/api/constraints/budget` CRUD endpoints
- [ ] Create `/api/constraints/territories` CRUD endpoints
- [ ] Create `/api/constraints/check` POST endpoint (validates proposed action)
- [ ] Create `/api/constraints/summary` GET endpoint (dashboard view of all constraints)
- [ ] Add authentication middleware to all constraint endpoints

**Acceptance Criteria:**
- All constraint types manageable via API
- Can validate any proposed action against all constraints
- Summary endpoint provides at-a-glance constraint health

---

### M7A.4: Constraint Dashboard UI

**UI Name:** Constraint Diagnostic (see Brand Appendix)

**Tasks:**
- [ ] Create `client/src/pages/constraints.tsx`:
  - Tabbed interface: Capacity | Contact Limits | Compliance | Budget | Territories
  - Each tab shows current state and allows CRUD
- [ ] Add Capacity tab:
  - Bar charts showing utilization by channel
  - Color coding: green (<70%), yellow (70-90%), red (>90%)
  - Edit capacity limits inline
- [ ] Add Compliance tab:
  - Calendar view showing blackout windows
  - Ability to create/edit windows
- [ ] Add Budget tab:
  - Burn rate visualization
  - Projected runway
- [ ] Add sidebar navigation link

**Acceptance Criteria:**
- Operations team can manage all constraints via UI
- Visual indicators make constraint health obvious
- Can quickly identify bottlenecks

---

### M7A.5: Constraint Integration with Existing Agents

**Tasks:**
- [ ] Modify `orchestrator.ts` to check constraints before executing actions
- [ ] Add constraint violation as a rejection reason in approval workflow
- [ ] Modify NBA engine to filter out constraint-violating recommendations
- [ ] Add constraint check to simulation runner (flag infeasible scenarios)
- [ ] Add 25 constraint-related tests

**Acceptance Criteria:**
- No action executes if it violates constraints
- NBA recommendations respect constraints
- Simulations warn about constraint violations

---

## Phase 7B: Outcome Stream & Attribution

**Goal:** Real-time feedback loop for learning and prediction calibration  
**Effort Estimate:** 12-14 hours  
**Dependencies:** Phase 7A (needs constraint infrastructure)

### Why This Matters

Current system records outcomes in batch. An AI orchestrator needs to:
1. Know outcomes as they happen (not 24h later)
2. Attribute outcomes to specific actions (which touch caused the Rx?)
3. Weight recent evidence more than stale predictions
4. Handle partial credit when multiple touches precede an outcome

---

### M7B.1: Outcome Event Schema

**Schema Addition** (`shared/schema.ts`):
```typescript
export const outcomeEvents = pgTable("outcome_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hcpId: varchar("hcp_id").notNull().references(() => hcpProfiles.id),
  outcomeType: varchar("outcome_type", { length: 50 }).notNull(), 
    // "email_open", "email_click", "webinar_attend", "rx_written", "sample_request", "meeting_scheduled"
  outcomeValue: real("outcome_value"), // e.g., Rx count, revenue
  occurredAt: timestamp("occurred_at").notNull(),
  
  // Attribution
  attributedActionId: varchar("attributed_action_id"), // Primary action that caused this
  attributionConfidence: real("attribution_confidence"), // 0-1
  contributingActionIds: jsonb("contributing_action_ids").$type<string[]>(), // Partial credit
  contributionWeights: jsonb("contribution_weights").$type<Record<string, number>>(), // Action ID -> weight
  
  // Attribution window
  attributionWindowDays: integer("attribution_window_days").notNull(),
  withinWindow: integer("within_window").notNull().default(1), // boolean
  
  // Source
  sourceSystem: varchar("source_system", { length: 50 }).notNull(), // "veeva", "salesforce", "email_platform"
  sourceEventId: varchar("source_event_id", { length: 200 }),
  
  // Processing
  processedAt: timestamp("processed_at"),
  processingStatus: varchar("processing_status", { length: 20 }).notNull().default("pending"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Attribution configuration per channel
export const attributionConfig = pgTable("attribution_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channel: varchar("channel", { length: 20 }).notNull().unique(),
  windowDays: integer("window_days").notNull(), // 7 for email, 30 for rep visit
  decayFunction: varchar("decay_function", { length: 30 }).notNull(), // "linear", "exponential", "none"
  decayHalfLifeDays: integer("decay_half_life_days"),
  multiTouchModel: varchar("multi_touch_model", { length: 30 }).notNull(), // "first_touch", "last_touch", "linear", "position_based", "time_decay"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Prediction staleness tracking
export const predictionStaleness = pgTable("prediction_staleness", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hcpId: varchar("hcp_id").notNull().references(() => hcpProfiles.id),
  predictionType: varchar("prediction_type", { length: 50 }).notNull(), // "engagement", "conversion", "nba"
  lastPredictedAt: timestamp("last_predicted_at").notNull(),
  lastValidatedAt: timestamp("last_validated_at"),
  predictionAge: integer("prediction_age"), // days since prediction
  validationAge: integer("validation_age"), // days since last outcome
  stalenessScore: real("staleness_score"), // 0-1, higher = more stale
  featureDriftDetected: integer("feature_drift_detected").default(0),
  recommendRefresh: integer("recommend_refresh").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

**Tasks:**
- [ ] Add outcome event and attribution tables to schema
- [ ] Add Zod validation schemas
- [ ] Run `npm run db:push`

**Acceptance Criteria:**
- Outcome events can be recorded with full attribution metadata
- Attribution configuration per channel is stored

---

### M7B.2: Attribution Engine Service

**Service Addition** (`server/services/attribution-engine.ts`):

**Tasks:**
- [ ] Create attribution engine with interface:
  ```typescript
  interface IAttributionEngine {
    // Record new outcome
    recordOutcome(outcome: OutcomeEvent): Promise<AttributedOutcome>;
    
    // Find actions to attribute to
    findAttributableActions(hcpId: string, outcomeType: string, occurredAt: Date): Promise<AttributableAction[]>;
    
    // Apply attribution model
    attributeOutcome(outcome: OutcomeEvent, actions: AttributableAction[]): Promise<AttributionResult>;
    
    // Multi-touch attribution
    calculateContributions(outcome: OutcomeEvent, actions: AttributableAction[]): Promise<Record<string, number>>;
    
    // Decay functions
    applyDecay(daysSinceAction: number, config: AttributionConfig): number;
    
    // Staleness
    calculateStaleness(hcpId: string, predictionType: string): Promise<number>;
    markRefreshNeeded(hcpId: string, predictionType: string): Promise<void>;
  }
  ```
- [ ] Implement first-touch, last-touch, linear, position-based, and time-decay models
- [ ] Implement exponential and linear decay functions
- [ ] Add staleness scoring based on prediction age and validation recency
- [ ] Connect to stimuli events table for action lookup

**Acceptance Criteria:**
- Outcomes are attributed to one or more prior actions
- Attribution respects configurable windows per channel
- Staleness is tracked for all predictions

---

### M7B.3: Outcome Ingestion API

**Tasks:**
- [ ] Create `/api/outcomes` POST endpoint for recording outcomes
- [ ] Create `/api/outcomes/batch` POST endpoint for bulk ingestion
- [ ] Create `/api/outcomes/webhook` POST endpoint for external system callbacks
- [ ] Add outcome source configuration: `/api/outcome-sources` CRUD
- [ ] Add attribution config endpoints: `/api/attribution-config` CRUD
- [ ] Implement outcome processing queue (handle high volume)

**Acceptance Criteria:**
- External systems can push outcomes in real-time
- Webhook supports common formats (Veeva, Salesforce)
- Batch ingestion handles thousands of records

---

### M7B.4: Feedback Loop Integration

**Tasks:**
- [ ] Modify prediction engine to consume attributed outcomes
- [ ] Update stimuli events with actual outcomes after attribution
- [ ] Trigger model evaluation when sufficient new outcomes arrive
- [ ] Add "outcome velocity" metric to dashboard:
  - Outcomes per hour/day
  - Attribution rate (% of outcomes attributed)
  - Average latency (time from action to outcome)
- [ ] Create staleness report: HCPs with predictions needing refresh

**Acceptance Criteria:**
- Predictions are automatically validated against attributed outcomes
- Dashboard shows real-time feedback loop health
- Stale predictions are flagged for refresh

---

### M7B.5: Outcome Stream Tests

**Tasks:**
- [ ] Add 30 tests for attribution engine
- [ ] Test all attribution models (first, last, linear, position, time-decay)
- [ ] Test decay functions
- [ ] Test staleness calculation
- [ ] Test batch ingestion performance

**Acceptance Criteria:**
- All attribution models produce sensible results
- Edge cases handled (no attributable actions, very old outcomes)
- Performance acceptable for production volume

---

## Phase 7C: Uncertainty Quantification

**Goal:** Richer uncertainty modeling for exploration vs. exploitation decisions  
**Effort Estimate:** 8-10 hours  
**Dependencies:** Phase 7B (needs outcome data for validation)

### Why This Matters

Current predictions have confidence intervals, but an AI orchestrator needs to know:
1. **Epistemic uncertainty:** Do I not know because I lack data? (explore more)
2. **Aleatoric uncertainty:** Is this HCP inherently unpredictable? (accept variance)
3. **Staleness:** When was this prediction made and validated?
4. **Drift:** Have the inputs changed since prediction?

---

### M7C.1: Uncertainty Schema Extension

**Schema Addition** (`shared/schema.ts`):
```typescript
export const uncertaintyMetrics = pgTable("uncertainty_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hcpId: varchar("hcp_id").notNull().references(() => hcpProfiles.id),
  channel: varchar("channel", { length: 20 }),
  predictionType: varchar("prediction_type", { length: 50 }).notNull(),
  
  // Point estimate
  predictedValue: real("predicted_value").notNull(),
  
  // Confidence interval
  ciLower: real("ci_lower").notNull(),
  ciUpper: real("ci_upper").notNull(),
  ciWidth: real("ci_width").notNull(),
  
  // Uncertainty decomposition
  epistemicUncertainty: real("epistemic_uncertainty").notNull(), // Reducible with more data
  aleatoricUncertainty: real("aleatoric_uncertainty").notNull(), // Irreducible noise
  totalUncertainty: real("total_uncertainty").notNull(),
  
  // Data quality
  sampleSize: integer("sample_size").notNull(), // How many historical outcomes
  dataRecency: integer("data_recency"), // Days since most recent outcome
  featureCompleteness: real("feature_completeness"), // 0-1, how complete is HCP profile
  
  // Staleness
  predictionAge: integer("prediction_age").notNull(), // Days since prediction made
  lastValidationAge: integer("last_validation_age"), // Days since prediction was validated
  
  // Drift detection
  featureDriftScore: real("feature_drift_score"), // 0-1, how much have inputs changed
  driftFeatures: jsonb("drift_features").$type<string[]>(), // Which features drifted
  
  // Exploration signal
  explorationValue: real("exploration_value"), // Value of learning more about this HCP
  recommendExploration: integer("recommend_exploration").default(0),
  
  calculatedAt: timestamp("calculated_at").notNull().defaultNow(),
});
```

**Tasks:**
- [ ] Add uncertainty metrics table to schema
- [ ] Add Zod validation schema
- [ ] Run `npm run db:push`

**Acceptance Criteria:**
- Uncertainty metrics can be stored per HCP/channel/prediction type

---

### M7C.2: Uncertainty Calculator Service

**Service Addition** (`server/services/uncertainty-calculator.ts`):

**Tasks:**
- [ ] Create uncertainty calculator with interface:
  ```typescript
  interface IUncertaintyCalculator {
    // Full uncertainty calculation
    calculateUncertainty(hcpId: string, channel: Channel, predictionType: string): Promise<UncertaintyMetrics>;
    
    // Component calculations
    calculateEpistemicUncertainty(hcpId: string, channel: Channel): Promise<number>;
    calculateAleatoricUncertainty(hcpId: string, channel: Channel): Promise<number>;
    
    // Data quality
    assessDataQuality(hcpId: string): Promise<DataQualityReport>;
    
    // Drift detection
    detectFeatureDrift(hcpId: string, since: Date): Promise<DriftReport>;
    
    // Exploration value (UCB-style)
    calculateExplorationValue(hcpId: string, channel: Channel): Promise<number>;
    
    // Batch calculation
    calculateBatchUncertainty(hcpIds: string[], channel: Channel): Promise<UncertaintyMetrics[]>;
  }
  ```
- [ ] Implement epistemic uncertainty based on sample size and prediction variance
- [ ] Implement aleatoric uncertainty based on historical outcome variance
- [ ] Implement feature drift detection by comparing current features to prediction-time features
- [ ] Implement exploration value using Upper Confidence Bound (UCB) formula

**Acceptance Criteria:**
- Uncertainty decomposed into epistemic and aleatoric components
- Drift detected when HCP profile changes significantly
- Exploration value calculated for UCB-based exploration

---

### M7C.3: Exploration Strategy Service

**Tasks:**
- [ ] Create `server/services/exploration-strategy.ts`:
  ```typescript
  interface IExplorationStrategy {
    // Should we explore or exploit?
    shouldExplore(hcpId: string, channel: Channel): Promise<ExplorationDecision>;
    
    // Suggest exploration action
    suggestExplorationAction(hcpId: string): Promise<ExplorationAction | null>;
    
    // Calculate exploration budget
    calculateExplorationBudget(totalBudget: number, explorationRate: number): number;
    
    // Track exploration outcomes
    recordExplorationOutcome(actionId: string, outcome: OutcomeEvent): Promise<void>;
    
    // Adjust exploration rate based on learning
    adaptExplorationRate(): Promise<number>;
  }
  ```
- [ ] Implement epsilon-greedy with decaying epsilon
- [ ] Implement UCB for channel selection
- [ ] Implement Thompson Sampling for multi-armed bandit
- [ ] Add exploration tracking to action execution

**Acceptance Criteria:**
- System can decide when to try new channels vs. stick with proven ones
- Exploration rate adapts based on learning progress
- Exploration outcomes are tracked for model improvement

---

### M7C.4: Uncertainty API & Integration

**Tasks:**
- [ ] Create `/api/uncertainty/:hcpId` GET endpoint
- [ ] Create `/api/uncertainty/batch` POST endpoint
- [ ] Create `/api/exploration/decision` POST endpoint
- [ ] Integrate uncertainty into NBA engine:
  - Add uncertainty to NBA response
  - Flag "exploration mode" recommendations
- [ ] Add uncertainty column to NBA queue UI
- [ ] Add exploration mode toggle in simulation builder

**Acceptance Criteria:**
- NBA recommendations include uncertainty information
- Users can see which recommendations are exploratory
- Simulations can model exploration scenarios

---

### M7C.5: Uncertainty Tests

**Tasks:**
- [ ] Add 25 tests for uncertainty calculation
- [ ] Test epistemic/aleatoric decomposition
- [ ] Test drift detection
- [ ] Test exploration strategies
- [ ] Test UCB calculations

**Acceptance Criteria:**
- Uncertainty calculations are mathematically sound
- Exploration recommendations are sensible

---

## Phase 7D: Campaign Coordination

**Goal:** Prevent conflicts between concurrent campaigns targeting overlapping HCPs  
**Effort Estimate:** 10-12 hours  
**Dependencies:** Phase 7A (constraints), Phase 7B (outcomes)

### Why This Matters

Without coordination:
- Two campaigns might email the same HCP on the same day
- Brand A's rep visit might cannibalize Brand B's webinar invite
- Corporate initiative might preempt regional tactics

---

### M7D.1: Campaign & Reservation Schema

**Schema Addition** (`shared/schema.ts`):
```typescript
export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  brand: varchar("brand", { length: 100 }),
  businessUnit: varchar("business_unit", { length: 100 }),
  priority: integer("priority").notNull().default(50), // 1-100, higher = more important
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, active, paused, completed
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  targetAudienceId: varchar("target_audience_id").references(() => savedAudiences.id),
  channelMix: jsonb("channel_mix").$type<Record<string, number>>(),
  budget: real("budget"),
  createdBy: varchar("created_by", { length: 100 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const hcpReservations = pgTable("hcp_reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id),
  hcpId: varchar("hcp_id").notNull().references(() => hcpProfiles.id),
  channel: varchar("channel", { length: 20 }).notNull(),
  reservationType: varchar("reservation_type", { length: 30 }).notNull(), // "exclusive", "priority", "soft"
  priority: integer("priority").notNull(), // Inherited from campaign
  reservedFrom: timestamp("reserved_from").notNull(),
  reservedUntil: timestamp("reserved_until").notNull(),
  plannedActionDate: timestamp("planned_action_date"),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, released, executed, expired
  canPreempt: integer("can_preempt").notNull().default(0), // Can higher priority campaign take over?
  preemptedBy: varchar("preempted_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const conflictLog = pgTable("conflict_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hcpId: varchar("hcp_id").notNull().references(() => hcpProfiles.id),
  channel: varchar("channel", { length: 20 }).notNull(),
  conflictType: varchar("conflict_type", { length: 30 }).notNull(), // "overlap", "frequency", "preemption"
  campaign1Id: varchar("campaign1_id").notNull(),
  campaign2Id: varchar("campaign2_id"),
  conflictDate: timestamp("conflict_date").notNull(),
  resolution: varchar("resolution", { length: 30 }), // "campaign1_wins", "campaign2_wins", "merged", "deferred"
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by", { length: 100 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

**Tasks:**
- [ ] Add campaign and reservation tables to schema
- [ ] Add Zod validation schemas
- [ ] Run `npm run db:push`

**Acceptance Criteria:**
- Campaigns can be defined with priority and audience
- HCPs can be reserved by campaigns for specific channels

---

### M7D.2: Campaign Coordinator Service

**Service Addition** (`server/services/campaign-coordinator.ts`):

**Tasks:**
- [ ] Create campaign coordinator with interface:
  ```typescript
  interface ICampaignCoordinator {
    // Campaign management
    createCampaign(campaign: InsertCampaign): Promise<Campaign>;
    activateCampaign(campaignId: string): Promise<void>;
    pauseCampaign(campaignId: string): Promise<void>;
    
    // Reservation management
    reserveHcp(campaignId: string, hcpId: string, channel: Channel, duration: Duration): Promise<Reservation | ConflictResult>;
    releaseReservation(reservationId: string): Promise<void>;
    extendReservation(reservationId: string, newEnd: Date): Promise<boolean>;
    
    // Conflict detection
    detectConflicts(campaignId: string): Promise<Conflict[]>;
    detectHcpConflicts(hcpId: string, dateRange: DateRange): Promise<Conflict[]>;
    
    // Conflict resolution
    resolveConflict(conflictId: string, resolution: Resolution): Promise<void>;
    autoResolveConflicts(campaignId: string): Promise<ResolutionReport>;
    
    // Preemption
    canPreempt(newCampaignId: string, existingReservationId: string): Promise<boolean>;
    preempt(newCampaignId: string, existingReservationId: string): Promise<void>;
    
    // Query
    getActiveReservations(hcpId: string): Promise<Reservation[]>;
    getCampaignReservations(campaignId: string): Promise<Reservation[]>;
    getAvailableSlots(hcpId: string, channel: Channel, dateRange: DateRange): Promise<TimeSlot[]>;
  }
  ```
- [ ] Implement conflict detection for overlapping reservations
- [ ] Implement priority-based conflict resolution
- [ ] Implement preemption logic
- [ ] Add automatic expiration of stale reservations

**Acceptance Criteria:**
- Conflicts are detected before they cause problems
- Higher priority campaigns can preempt lower priority
- Reservations auto-expire if not used

---

### M7D.3: Campaign API Endpoints

**Tasks:**
- [ ] Create `/api/campaigns` CRUD endpoints
- [ ] Create `/api/campaigns/:id/activate` POST endpoint
- [ ] Create `/api/campaigns/:id/pause` POST endpoint
- [ ] Create `/api/reservations` CRUD endpoints
- [ ] Create `/api/reservations/check-availability` POST endpoint
- [ ] Create `/api/conflicts` GET/resolve endpoints
- [ ] Create `/api/conflicts/auto-resolve` POST endpoint

**Acceptance Criteria:**
- Full campaign lifecycle manageable via API
- Availability can be checked before reservation
- Conflicts can be reviewed and resolved

---

### M7D.4: Campaign UI

**UI Name:** Campaign Coordinator (see Brand Appendix)

**Tasks:**
- [ ] Create `client/src/pages/campaigns.tsx`:
  - Campaign list with status, priority, dates
  - Campaign detail view with audience, channel mix
  - Reservation calendar view
- [ ] Add conflict panel showing active conflicts
- [ ] Add reservation visualization on HCP profile
- [ ] Integrate campaign selection into simulation builder

**Acceptance Criteria:**
- Users can manage campaigns via UI
- Conflicts are visible and resolvable
- HCP profile shows which campaigns have reserved them

---

### M7D.5: Integration with Existing Systems

**Tasks:**
- [ ] Modify orchestrator to respect reservations
- [ ] Add campaign context to NBA recommendations
- [ ] Filter NBA queue by campaign
- [ ] Add campaign dimension to analytics
- [ ] Add 25 campaign coordination tests

**Acceptance Criteria:**
- NBAs respect active reservations
- Actions execute within campaign context
- Reporting can slice by campaign

---

## Phase 7E: Simulation Composability

**Goal:** Enable batch, incremental, and differential simulation for optimization  
**Effort Estimate:** 8-10 hours  
**Dependencies:** Phase 7A-D (uses all prior infrastructure)

### Why This Matters

Current simulation runs one scenario at a time. An optimizer needs:
- **Batch simulation:** Run 1000 variants to find optimal
- **Incremental simulation:** "What if I add 10 more HCPs?" without recomputing
- **Differential simulation:** "What's the delta between A and B?" efficiently

---

### M7E.1: Simulation Variant Schema

**Schema Addition** (`shared/schema.ts`):
```typescript
export const simulationBatches = pgTable("simulation_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  baseScenarioId: varchar("base_scenario_id").references(() => simulationScenarios.id),
  variantCount: integer("variant_count").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  bestVariantId: varchar("best_variant_id"),
  optimizationMetric: varchar("optimization_metric", { length: 50 }), // "engagement_rate", "roi", "reach"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const simulationVariants = pgTable("simulation_variants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batchId: varchar("batch_id").notNull().references(() => simulationBatches.id),
  variantNumber: integer("variant_number").notNull(),
  parameters: jsonb("parameters").notNull().$type<Record<string, unknown>>(),
  deltaFromBase: jsonb("delta_from_base").$type<Record<string, unknown>>(),
  resultId: varchar("result_id").references(() => simulationResults.id),
  score: real("score"), // Optimization metric value
  rank: integer("rank"), // Rank within batch
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

**Tasks:**
- [ ] Add simulation batch tables to schema
- [ ] Add Zod validation schemas
- [ ] Run `npm run db:push`

**Acceptance Criteria:**
- Simulation batches can track many variants
- Variants can be ranked by optimization metric

---

### M7E.2: Composable Simulation Service

**Service Addition** (`server/services/composable-simulation.ts`):

**Tasks:**
- [ ] Create composable simulation service:
  ```typescript
  interface IComposableSimulation {
    // Batch simulation
    createBatch(baseScenario: SimulationScenario, variants: VariantSpec[]): Promise<SimulationBatch>;
    runBatch(batchId: string, concurrency?: number): Promise<BatchResult>;
    getBatchProgress(batchId: string): Promise<BatchProgress>;
    
    // Variant generation
    generateVariants(baseScenario: SimulationScenario, strategy: VariantStrategy): Promise<VariantSpec[]>;
    
    // Incremental simulation
    extendSimulation(baseResultId: string, additionalHcps: string[]): Promise<SimulationResult>;
    subtractSimulation(baseResultId: string, removeHcps: string[]): Promise<SimulationResult>;
    
    // Differential simulation
    compareScenarios(scenarioA: string, scenarioB: string): Promise<DifferentialResult>;
    computeDelta(resultA: SimulationResult, resultB: SimulationResult): Promise<ResultDelta>;
    
    // Optimization
    findOptimalVariant(batchId: string, metric: string): Promise<SimulationVariant>;
    rankVariants(batchId: string, metric: string): Promise<SimulationVariant[]>;
  }
  ```
- [ ] Implement parallel batch execution with configurable concurrency
- [ ] Implement incremental simulation using cached base results
- [ ] Implement differential calculation with caching
- [ ] Add variant generation strategies: grid search, random search, Bayesian

**Acceptance Criteria:**
- Can run 100+ variants efficiently
- Incremental simulation is faster than full re-run
- Delta computation is cached and fast

---

### M7E.3: Batch Simulation API

**Tasks:**
- [ ] Create `/api/simulations/batch` POST endpoint
- [ ] Create `/api/simulations/batch/:id` GET endpoint
- [ ] Create `/api/simulations/batch/:id/status` GET endpoint
- [ ] Create `/api/simulations/batch/:id/results` GET endpoint
- [ ] Create `/api/simulations/batch/:id/best` GET endpoint
- [ ] Create `/api/simulations/incremental` POST endpoint
- [ ] Create `/api/simulations/compare` POST endpoint

**Acceptance Criteria:**
- Batch simulations can be created and monitored
- Results can be retrieved and compared
- Best variant can be identified

---

### M7E.4: Simulation Optimization UI

**UI Name:** Scenario Lab (see Brand Appendix)

**Tasks:**
- [ ] Add "Optimization Mode" to simulation builder:
  - Define parameter ranges (e.g., email 10-40%, rep 20-50%)
  - Select optimization metric
  - Set variant count
- [ ] Create batch progress view:
  - Progress bar
  - Live results as they complete
  - Rank visualization
- [ ] Create comparison view:
  - Side-by-side scenario comparison
  - Delta highlighting
- [ ] Add "Find Optimal" button to saved simulations

**Acceptance Criteria:**
- Users can launch optimization searches
- Progress is visible in real-time
- Results are clearly ranked

---

### M7E.5: Simulation Composability Tests

**Tasks:**
- [ ] Add 25 tests for composable simulation
- [ ] Test batch execution correctness
- [ ] Test incremental vs. full parity
- [ ] Test differential calculation accuracy
- [ ] Test variant ranking

**Acceptance Criteria:**
- Incremental results match full re-computation
- Batch execution is deterministic
- Rankings are correct

---

## Phase 7F: Portfolio Optimizer (Capstone)

**Goal:** The optimization layer that maximizes portfolio outcomes under constraints  
**Effort Estimate:** 14-18 hours  
**Dependencies:** All prior Phase 7 work

### Why This Matters

This is the capstone: given all the infrastructure built in 7A-7E, create an optimizer that can:
1. Take a portfolio of HCPs and a set of constraints
2. Propose an allocation of resources that maximizes expected lift
3. Respect all constraints (capacity, budget, compliance, conflicts)
4. Account for uncertainty (explore high-uncertainty HCPs)
5. Produce an executable plan

---

### M7F.1: Optimization Problem Schema

**Schema Addition** (`shared/schema.ts`):
```typescript
export const optimizationProblems = pgTable("optimization_problems", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  
  // Scope
  audienceId: varchar("audience_id").references(() => savedAudiences.id),
  campaignId: varchar("campaign_id").references(() => campaigns.id),
  
  // Objective
  objectiveMetric: varchar("objective_metric", { length: 50 }).notNull(), // "total_engagement_lift", "roi", "reach"
  objectiveSense: varchar("objective_sense", { length: 10 }).notNull().default("maximize"),
  
  // Constraints (references to constraint tables)
  budgetConstraintId: varchar("budget_constraint_id"),
  capacityConstraintIds: jsonb("capacity_constraint_ids").$type<string[]>(),
  includeContactLimits: integer("include_contact_limits").default(1),
  includeComplianceWindows: integer("include_compliance_windows").default(1),
  respectReservations: integer("respect_reservations").default(1),
  
  // Exploration
  explorationBudgetPct: real("exploration_budget_pct").default(10), // 10% for exploration
  
  // Time horizon
  planningHorizonDays: integer("planning_horizon_days").notNull().default(30),
  
  // Status
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const optimizationResults = pgTable("optimization_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  problemId: varchar("problem_id").notNull().references(() => optimizationProblems.id),
  
  // Solution quality
  objectiveValue: real("objective_value").notNull(),
  feasible: integer("feasible").notNull(),
  optimalityGap: real("optimality_gap"), // For approximate solvers
  
  // Allocation summary
  totalActions: integer("total_actions").notNull(),
  actionsByChannel: jsonb("actions_by_channel").$type<Record<string, number>>(),
  totalBudgetUsed: real("total_budget_used"),
  budgetUtilization: real("budget_utilization"),
  
  // Predicted outcomes
  predictedTotalLift: real("predicted_total_lift"),
  predictedEngagementRate: real("predicted_engagement_rate"),
  predictedResponseRate: real("predicted_response_rate"),
  
  // Exploration allocation
  explorationActions: integer("exploration_actions"),
  explorationBudgetUsed: real("exploration_budget_used"),
  
  // Constraint satisfaction
  constraintViolations: jsonb("constraint_violations").$type<ConstraintViolation[]>(),
  
  // Timing
  solveTimeMs: integer("solve_time_ms"),
  iterations: integer("iterations"),
  
  solvedAt: timestamp("solved_at").notNull().defaultNow(),
});

export const optimizationAllocations = pgTable("optimization_allocations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resultId: varchar("result_id").notNull().references(() => optimizationResults.id),
  
  hcpId: varchar("hcp_id").notNull().references(() => hcpProfiles.id),
  channel: varchar("channel", { length: 20 }).notNull(),
  actionType: varchar("action_type", { length: 50 }).notNull(),
  
  // Timing
  plannedDate: timestamp("planned_date").notNull(),
  windowStart: timestamp("window_start"),
  windowEnd: timestamp("window_end"),
  
  // Prediction
  predictedLift: real("predicted_lift").notNull(),
  confidence: real("confidence").notNull(),
  isExploration: integer("is_exploration").default(0),
  
  // Cost
  estimatedCost: real("estimated_cost"),
  
  // Execution
  status: varchar("status", { length: 20 }).notNull().default("planned"),
  executedAt: timestamp("executed_at"),
  actualOutcome: real("actual_outcome"),
  
  // Reasoning
  selectionReason: text("selection_reason"),
  alternativesConsidered: jsonb("alternatives_considered").$type<string[]>(),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

**Tasks:**
- [ ] Add optimization problem and result tables to schema
- [ ] Add Zod validation schemas
- [ ] Run `npm run db:push`

**Acceptance Criteria:**
- Optimization problems can be defined with objectives and constraints
- Results store the allocation plan with all relevant metadata

---

### M7F.2: Portfolio Optimizer Service

**Service Addition** (`server/services/portfolio-optimizer.ts`):

**Tasks:**
- [ ] Create portfolio optimizer with interface:
  ```typescript
  interface IPortfolioOptimizer {
    // Problem definition
    defineProblem(spec: OptimizationProblemSpec): Promise<OptimizationProblem>;
    
    // Solve
    solve(problemId: string, options?: SolverOptions): Promise<OptimizationResult>;
    
    // Heuristic solvers
    solveGreedy(problem: OptimizationProblem): Promise<OptimizationResult>;
    solveLocalSearch(problem: OptimizationProblem, iterations: number): Promise<OptimizationResult>;
    
    // What-if
    whatIfAddBudget(resultId: string, additionalBudget: number): Promise<WhatIfResult>;
    whatIfRemoveConstraint(resultId: string, constraintId: string): Promise<WhatIfResult>;
    
    // Sensitivity analysis
    analyzeSensitivity(resultId: string): Promise<SensitivityReport>;
    
    // Plan export
    exportPlan(resultId: string, format: "csv" | "json"): Promise<string>;
    exportToOrchestration(resultId: string): Promise<OrchestrationPayload>;
  }
  ```
- [ ] Implement greedy solver (fast, approximate)
- [ ] Implement local search solver (better quality)
- [ ] Implement constraint checker
- [ ] Implement objective function calculation
- [ ] Add sensitivity analysis (how much does optimal change if constraints change?)

**Acceptance Criteria:**
- Greedy solver runs in <1 second for 1000 HCPs
- Local search improves on greedy by measurable margin
- All constraints are respected

---

### M7F.3: Execution Planner

**Service Addition** (`server/services/execution-planner.ts`):

**Tasks:**
- [ ] Create execution planner:
  ```typescript
  interface IExecutionPlanner {
    // Convert allocation to executable plan
    createPlan(resultId: string): Promise<ExecutionPlan>;
    
    // Time-order actions
    scheduleActions(allocations: Allocation[]): Promise<ScheduledAction[]>;
    
    // Resource booking
    bookResources(plan: ExecutionPlan): Promise<BookingResult>;
    releaseResources(planId: string): Promise<void>;
    
    // Execution
    executePlan(planId: string): Promise<ExecutionReport>;
    pausePlan(planId: string): Promise<void>;
    resumePlan(planId: string): Promise<void>;
    
    // Rebalancing
    rebalancePlan(planId: string, trigger: RebalanceTrigger): Promise<ExecutionPlan>;
    suggestRebalance(planId: string): Promise<RebalanceSuggestion | null>;
  }
  ```
- [ ] Implement action scheduling with conflict avoidance
- [ ] Implement resource booking (capacity, budget)
- [ ] Implement plan execution via orchestrator
- [ ] Implement automatic rebalancing when constraints change

**Acceptance Criteria:**
- Plans are time-ordered and conflict-free
- Resources are booked before execution
- Plans adapt when constraints change

---

### M7F.4: Optimization API

**Tasks:**
- [ ] Create `/api/optimization/problems` CRUD endpoints
- [ ] Create `/api/optimization/problems/:id/solve` POST endpoint
- [ ] Create `/api/optimization/results/:id` GET endpoint
- [ ] Create `/api/optimization/results/:id/allocations` GET endpoint
- [ ] Create `/api/optimization/results/:id/export` GET endpoint
- [ ] Create `/api/optimization/results/:id/what-if` POST endpoint
- [ ] Create `/api/execution-plans` CRUD endpoints
- [ ] Create `/api/execution-plans/:id/execute` POST endpoint
- [ ] Create `/api/execution-plans/:id/rebalance` POST endpoint

**Acceptance Criteria:**
- Full optimization workflow available via API
- Plans can be executed and monitored
- What-if analysis available

---

### M7F.5: Optimization Dashboard UI

**UI Name:** Allocation Lab (see Brand Appendix)

**Tasks:**
- [ ] Create `client/src/pages/optimizer.tsx`:
  - Problem definition wizard
  - Constraint selection
  - Objective configuration
- [ ] Create optimization results view:
  - Summary metrics (total lift, budget used, actions)
  - Allocation table with sorting/filtering
  - Channel distribution chart
  - HCP allocation map (who gets what)
- [ ] Create execution plan view:
  - Timeline/Gantt of scheduled actions
  - Progress tracking
  - Rebalance triggers
- [ ] Add "Optimize" button to audience detail view

**Acceptance Criteria:**
- Users can define and run optimization problems
- Results are clearly visualized
- Execution progress is trackable

---

### M7F.6: Optimization Agent

**Tasks:**
- [ ] Create `server/services/agents/portfolio-optimizer.ts`:
  - Extends BaseAgent
  - Runs optimization on configurable schedule
  - Proposes allocations through approval workflow
  - Monitors execution and suggests rebalancing
- [ ] Add to agent registry
- [ ] Add to scheduler
- [ ] Integrate with orchestrator
- [ ] Add 30 optimization tests

**Acceptance Criteria:**
- Optimizer agent runs on schedule
- Proposed allocations go through approval
- Rebalancing is suggested when needed

---

## Summary: Phase 7 Effort Estimates

| Sub-Phase | Description | Effort | Dependencies |
|-----------|-------------|--------|--------------|
| 7A | Constraint Surfaces | 10-12h | None |
| 7B | Outcome Stream & Attribution | 12-14h | 7A |
| 7C | Uncertainty Quantification | 8-10h | 7B |
| 7D | Campaign Coordination | 10-12h | 7A, 7B |
| 7E | Simulation Composability | 8-10h | 7A-D |
| 7F | Portfolio Optimizer | 14-18h | All |
| **Total** | | **62-76h** | |

---

## Execution Notes

### For Claude Code Sessions

1. Start each session by reading: `CLAUDE.md`, `STATUS.md`, `ROADMAP.md`, `ROADMAP-PHASE7.md`
2. Work one milestone at a time within each sub-phase
3. Update `STATUS.md` after each milestone completion
4. Run tests after each significant change: `npm run check && npm test`
5. Build verification: `npm run build`
6. **Apply Brand Appendix specs to all UI work** (see below)

### Sub-Phase Completion Checklist

- [ ] All milestones completed
- [ ] Tests added/passing (aim for 25+ per sub-phase)
- [ ] TypeScript compiles clean
- [ ] Build succeeds
- [ ] STATUS.md updated
- [ ] API documentation updated
- [ ] **UI follows Brand Appendix specifications**

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Solver performance | Start with greedy, add local search incrementally |
| Schema complexity | Build incrementally, validate each table before adding next |
| Integration with existing agents | Keep existing agent behavior unchanged, add optimizer as new agent |
| UI complexity | Start with API-only, add UI after core logic is stable |

---

## Appendix: Future Considerations (Beyond Phase 7)

Captured for later phases:
- [ ] External solver integration (OR-Tools, CPLEX)
- [ ] Machine learning for prediction improvement
- [ ] Multi-objective optimization (Pareto fronts)
- [ ] Real-time replanning (event-driven rebalancing)
- [ ] External orchestration system push (Veeva, SFMC)
- [ ] A/B testing framework for optimization strategies

---

## BRAND APPENDIX: OMNIVOR LABS UI Specifications

**Purpose:** This appendix contains the essential brand specifications for Phase 7 UI work. Apply these to all new pages, components, and copy. For edge cases not covered below, reference `/mnt/project/OMNIVOR-LABS-STYLE-GUIDE.md`.

---

### A.1: Feature Naming

Use these names in UI page titles, navigation, and headers:

| Technical Name | UI Display Name |
|----------------|-----------------|
| Constraints Dashboard | **Constraint Diagnostic** |
| Campaign Management | **Campaign Coordinator** |
| Simulations/Batch | **Scenario Lab** |
| Optimizer Dashboard | **Allocation Lab** |
| NBA Queue | **Catalyst Queue** |
| HCP Explorer | **Signal Index** |

**Rules:**
- Use "Lab" for builder/experimental features
- Use "Diagnostic" for analysis/health features
- Use "Queue" for action-oriented features
- Prefer "Signal" over "data" or "information"

---

### A.2: Color Tokens

```css
/* Primary */
--void-black: #0a0a0b;        /* Background */
--consumption-purple: #6b21a8; /* Brand accent, borders */

/* Secondary */
--process-violet: #a855f7;     /* Lighter purple, hovers */
--catalyst-gold: #d97706;      /* CTAs, metrics, success */
--signal-white: #fafafa;       /* Text on dark */

/* Supporting */
--data-gray: #71717a;          /* Secondary text */
--muted-gray: #52525b;         /* Labels, captions */
--border-gray: #27272a;        /* Subtle borders */
```

**Application:**
| Element | Color |
|---------|-------|
| Page background | `--void-black` |
| Primary text | `--signal-white` |
| Key metrics (lift, count, %) | `--catalyst-gold` |
| Primary CTA buttons | `--catalyst-gold` bg, `--void-black` text |
| Secondary buttons | `--consumption-purple` border/text |
| Card borders | `rgba(107, 33, 168, 0.2)` |
| Warnings/constraints | `--process-violet` |

---

### A.3: Component Specs

**Primary Button (CTAs like "Optimize", "Execute"):**
```css
background: #d97706;
color: #0a0a0b;
font-weight: 600;
border-radius: 8px;
padding: 14px 32px;
```

**Secondary Button:**
```css
background: transparent;
border: 1px solid #6b21a8;
color: #6b21a8;
border-radius: 8px;
padding: 14px 32px;
```

**Cards:**
```css
background: #0a0a0b;
border: 1px solid rgba(107, 33, 168, 0.2);
border-radius: 16px;
padding: 24px;
```

**Accent Card (for results/summaries):**
```css
background: rgba(107, 33, 168, 0.1);
border: 1px solid rgba(107, 33, 168, 0.2);
border-radius: 16px;
```

**Metrics Display:**
```
┌─────────────────────────────┐
│ TOTAL LIFT                  │  ← Label: 0.625rem, #52525b, uppercase, weight 600
│ +23.4%                      │  ← Value: 2.5rem, #d97706, weight 800
│ 847 actions allocated       │  ← Subtext: 0.875rem, #71717a
└─────────────────────────────┘
```

---

### A.4: Typography

**Typeface:** Inter (all weights via Google Fonts)

| Element | Size | Weight |
|---------|------|--------|
| Page title | 2.5rem | 700 |
| Section header | 1.75rem | 700 |
| Card header | 1.25rem | 600 |
| Body | 1rem | 400 |
| Metric label | 0.625rem | 600, uppercase |
| Metric value | 2.5rem | 800 |

**Rules:**
- Never use Light (300) below 18px
- Max line length: 65-75 characters
- Left-align body text (never center)
- Never use pure `#000000` — use `#0a0a0b`

---

### A.5: Voice & Copy

**Voice Attributes:**
- **Confident:** State facts without hedging
- **Direct:** Short sentences, no fluff
- **Knowing:** Already sees what you're about to ask

**Do:**
- ✅ Lead with numbers: "847 actions allocated."
- ✅ Use active voice
- ✅ Be specific: "3 constraints violated." not "Some issues found."

**Don't:**
- ❌ Never use "please" or "sorry" in UI copy
- ❌ Never apologetic or uncertain
- ❌ Never explain the metaphor literally

**Loading States:**
```
"Processing..."
"Allocating resources..."
"Metabolizing constraints..."
"Consuming signals..."
```

**Empty States:**
```
"No allocations yet. Define constraints to begin."
"No signals match."
"Nothing to display."
```

**Error States:**
```
"Connection interrupted. Reconnecting."
"Constraint violated. Rebalancing."
"Budget exceeded. Reduce scope or increase allocation."
```

**Success States:**
```
"847 actions allocated across 12 HCPs."
"Optimization complete. Projected lift: +23%."
"Plan executing. 34 of 847 actions complete."
```

---

### A.6: Phase 7 UI Copy Examples

| Screen | Copy |
|--------|------|
| Problem definition | "Define the problem. OMNIVOR will find the optimal allocation." |
| Running optimization | "Metabolizing constraints. 47 scenarios evaluated." |
| Results summary | "847 actions allocated. Budget: 78% utilized. Lift: +23%." |
| Execution in progress | "Executing. 34 of 847 actions complete." |
| Rebalance suggestion | "Constraint changed. Rebalance recommended." |
| No constraints | "No constraints defined. Define capacity to begin." |
| Conflict detected | "2 campaigns targeting same HCP. Resolution required." |

---

### A.7: Iconography

**Style:**
- Geometric, sharp angles
- 2px stroke weight at 24px
- Rounded caps and joins
- Subtle movement toward center

**Avoid:**
- Organic/curved shapes
- Filled icons (prefer stroked)
- Playful/friendly styles

**Colors:**
- Default: `#fafafa` on dark
- Active: `#d97706`
- Brand accent: `#6b21a8`

---

### A.8: UI Checklist for Each Page

Before marking a UI milestone complete, verify:

- [ ] Page title uses brand-compliant name (Allocation Lab, Scenario Lab, etc.)
- [ ] Background is Void Black (`#0a0a0b`)
- [ ] Primary CTA uses Catalyst Gold (`#d97706`)
- [ ] Key metrics displayed in gold with uppercase labels
- [ ] No "please" or "sorry" in any UI copy
- [ ] Loading states use transformation language
- [ ] Empty states are direct, not apologetic
- [ ] Error states are factual, not hedging
- [ ] Body text is left-aligned
- [ ] Cards use specified border-radius and colors
- [ ] Icons are geometric/stroked, not filled

---

*Roadmap generated: 2026-01-16*  
*Brand Appendix integrated: 2026-01-16*  
*Source: Claude.ai analysis session*  
*Project: TwinEngine — HCP Digital Twin Platform*  
*Phase: 7 — Orchestration Intelligence*
