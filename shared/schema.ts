import { z } from "zod";
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, jsonb, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// HCP Specialties
export const specialties = [
  "Oncology",
  "Cardiology",
  "Neurology",
  "Endocrinology",
  "Rheumatology",
  "Pulmonology",
  "Gastroenterology",
  "Nephrology",
  "Dermatology",
  "Psychiatry",
] as const;

export type Specialty = (typeof specialties)[number];

// Channel types for engagement
export const channels = [
  "email",
  "rep_visit",
  "webinar",
  "conference",
  "digital_ad",
  "phone",
] as const;

export type Channel = (typeof channels)[number];

// HCP Tier levels
export const tiers = ["Tier 1", "Tier 2", "Tier 3"] as const;
export type Tier = (typeof tiers)[number];

// Segment types
export const segments = [
  "High Prescriber",
  "Growth Potential",
  "New Target",
  "Engaged Digital",
  "Traditional Preference",
  "Academic Leader",
] as const;

export type Segment = (typeof segments)[number];

// Channel Engagement Record (for JSONB)
export const channelEngagementSchema = z.object({
  channel: z.enum(channels),
  score: z.number().min(0).max(100),
  lastContact: z.string().nullable(),
  totalTouches: z.number(),
  responseRate: z.number().min(0).max(100),
});

export type ChannelEngagement = z.infer<typeof channelEngagementSchema>;

// Prescribing Trend data point (for JSONB)
export const prescribingTrendSchema = z.object({
  month: z.string(),
  rxCount: z.number(),
  marketShare: z.number(),
});

export type PrescribingTrend = z.infer<typeof prescribingTrendSchema>;

// ============ PostgreSQL Tables ============

// HCP Profiles Table
export const hcpProfiles = pgTable("hcp_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  npi: varchar("npi", { length: 20 }).notNull().unique(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  specialty: varchar("specialty", { length: 50 }).notNull(),
  tier: varchar("tier", { length: 20 }).notNull(),
  segment: varchar("segment", { length: 50 }).notNull(),
  organization: varchar("organization", { length: 200 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 10 }).notNull(),

  // Engagement metrics
  overallEngagementScore: integer("overall_engagement_score").notNull().default(0),
  channelPreference: varchar("channel_preference", { length: 20 }).notNull(),
  channelEngagements: jsonb("channel_engagements").notNull().$type<ChannelEngagement[]>(),

  // Prescribing data
  monthlyRxVolume: integer("monthly_rx_volume").notNull().default(0),
  yearlyRxVolume: integer("yearly_rx_volume").notNull().default(0),
  marketSharePct: real("market_share_pct").notNull().default(0),
  prescribingTrend: jsonb("prescribing_trend").notNull().$type<PrescribingTrend[]>(),

  // Prediction scores
  conversionLikelihood: integer("conversion_likelihood").notNull().default(0),
  churnRisk: integer("churn_risk").notNull().default(0),

  // Metadata
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  // Indexes for common filter/sort operations
  specialtyIdx: index("hcp_specialty_idx").on(table.specialty),
  tierIdx: index("hcp_tier_idx").on(table.tier),
  stateIdx: index("hcp_state_idx").on(table.state),
  segmentIdx: index("hcp_segment_idx").on(table.segment),
  engagementScoreIdx: index("hcp_engagement_score_idx").on(table.overallEngagementScore),
  churnRiskIdx: index("hcp_churn_risk_idx").on(table.churnRisk),
  conversionIdx: index("hcp_conversion_idx").on(table.conversionLikelihood),
  // Composite index for common filter combinations
  tierSpecialtyIdx: index("hcp_tier_specialty_idx").on(table.tier, table.specialty),
}));

export const insertHcpProfileSchema = createInsertSchema(hcpProfiles).omit({
  id: true,
  lastUpdated: true,
  createdAt: true,
});

export type InsertHCPProfile = z.infer<typeof insertHcpProfileSchema>;
export type HCPProfileDB = typeof hcpProfiles.$inferSelect;

// Simulation Scenarios Table
export const simulationScenarios = pgTable("simulation_scenarios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  
  // Target audience
  targetHcpIds: jsonb("target_hcp_ids").notNull().$type<string[]>(),
  targetSegments: jsonb("target_segments").$type<Segment[]>(),
  
  // Channel mix (percentage allocation)
  channelMix: jsonb("channel_mix").notNull().$type<Record<Channel, number>>(),
  
  // Campaign parameters
  frequency: integer("frequency").notNull().default(4),
  duration: integer("duration").notNull().default(3),
  budget: real("budget"),
  
  // Content strategy
  contentType: varchar("content_type", { length: 50 }).notNull().default("mixed"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSimulationScenarioSchema = createInsertSchema(simulationScenarios).omit({
  id: true,
  createdAt: true,
});

export type InsertSimulationScenario = z.infer<typeof insertSimulationScenarioSchema>;
export type SimulationScenarioDB = typeof simulationScenarios.$inferSelect;

// Channel Performance (for JSONB)
export const channelPerformanceSchema = z.object({
  channel: z.enum(channels),
  allocation: z.number(),
  predictedResponse: z.number(),
  contribution: z.number(),
});

export type ChannelPerformance = z.infer<typeof channelPerformanceSchema>;

// Baseline Comparison (for JSONB)
export const baselineComparisonSchema = z.object({
  engagementDelta: z.number(),
  responseDelta: z.number(),
  rxLiftDelta: z.number(),
});

export type BaselineComparison = z.infer<typeof baselineComparisonSchema>;

// Simulation Results Table
export const simulationResults = pgTable("simulation_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scenarioId: varchar("scenario_id").notNull(),
  scenarioName: varchar("scenario_name", { length: 200 }).notNull(),
  
  // Predicted outcomes
  predictedEngagementRate: real("predicted_engagement_rate").notNull(),
  predictedResponseRate: real("predicted_response_rate").notNull(),
  predictedRxLift: real("predicted_rx_lift").notNull(),
  predictedReach: integer("predicted_reach").notNull(),
  
  // Efficiency metrics
  costPerEngagement: real("cost_per_engagement"),
  efficiencyScore: integer("efficiency_score").notNull().default(0),
  
  // Channel breakdown
  channelPerformance: jsonb("channel_performance").notNull().$type<ChannelPerformance[]>(),
  
  // Comparison to baseline
  vsBaseline: jsonb("vs_baseline").notNull().$type<BaselineComparison>(),
  
  runAt: timestamp("run_at").notNull().defaultNow(),
});

export const insertSimulationResultSchema = createInsertSchema(simulationResults).omit({
  id: true,
  runAt: true,
});

export type InsertSimulationResult = z.infer<typeof insertSimulationResultSchema>;
export type SimulationResultDB = typeof simulationResults.$inferSelect;

// Audit Logs Table (for governance)
export const auditActions = [
  "LOGIN", "LOGOUT",
  "EXPORT", "EXPORT_DOWNLOAD",
  "INTEGRATION_PUSH",
  "APPROVAL_REQUEST", "APPROVAL_DECISION",
  "SETTINGS_CHANGE",
  "HCP_VIEW", "HCP_BULK_VIEW",
  "SIMULATION_RUN",
  "AUDIENCE_CREATE", "AUDIENCE_UPDATE", "AUDIENCE_DELETE",
  "WEBHOOK_SEND",
  "veeva_push",
] as const;
export type AuditAction = (typeof auditActions)[number];

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id", { length: 100 }),
  details: jsonb("details").$type<Record<string, unknown>>(),
  userId: varchar("user_id", { length: 100 }),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  entityTypeIdx: index("audit_entity_type_idx").on(table.entityType),
  entityIdIdx: index("audit_entity_id_idx").on(table.entityId),
  createdAtIdx: index("audit_created_at_idx").on(table.createdAt),
  userIdIdx: index("audit_user_id_idx").on(table.userId),
  actionIdx: index("audit_action_idx").on(table.action),
}));

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLogDB = typeof auditLogs.$inferSelect;

// ============ Zod Schemas for API Validation ============

// HCP Profile (unified type for API responses)
export const hcpProfileSchema = z.object({
  id: z.string(),
  npi: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  specialty: z.enum(specialties),
  tier: z.enum(tiers),
  segment: z.enum(segments),
  organization: z.string(),
  city: z.string(),
  state: z.string(),
  overallEngagementScore: z.number().min(0).max(100),
  channelPreference: z.enum(channels),
  channelEngagements: z.array(channelEngagementSchema),
  monthlyRxVolume: z.number(),
  yearlyRxVolume: z.number(),
  marketSharePct: z.number().min(0).max(100),
  prescribingTrend: z.array(prescribingTrendSchema),
  conversionLikelihood: z.number().min(0).max(100),
  churnRisk: z.number().min(0).max(100),
  lastUpdated: z.string(),
});

export type HCPProfile = z.infer<typeof hcpProfileSchema>;

// Filter parameters for HCP search
export const hcpFilterSchema = z.object({
  search: z.string().optional(),
  specialties: z.array(z.enum(specialties)).optional(),
  tiers: z.array(z.enum(tiers)).optional(),
  segments: z.array(z.enum(segments)).optional(),
  minEngagementScore: z.number().optional(),
  maxEngagementScore: z.number().optional(),
  channelPreferences: z.array(z.enum(channels)).optional(),
  states: z.array(z.string()).optional(),
});

export type HCPFilter = z.infer<typeof hcpFilterSchema>;

// Cohort request body (for endpoints that accept a list of HCP IDs)
export const cohortRequestSchema = z.object({
  hcpIds: z.array(z.string()).min(1, "At least one HCP ID required"),
});

export type CohortRequest = z.infer<typeof cohortRequestSchema>;

// NBA generation request body
export const nbaGenerationRequestSchema = z.object({
  hcpIds: z.array(z.string()).min(1, "At least one HCP ID required"),
  prioritize: z.boolean().optional().default(true),
  limit: z.number().int().min(1).max(1000).optional(),
});

export type NBAGenerationRequest = z.infer<typeof nbaGenerationRequestSchema>;

// Simulation Scenario (API type)
export const simulationScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  targetHcpIds: z.array(z.string()),
  targetSegments: z.array(z.enum(segments)).optional(),
  channelMix: z.record(z.enum(channels), z.number()),
  frequency: z.number().min(1).max(20),
  duration: z.number().min(1).max(12),
  budget: z.number().optional(),
  contentType: z.enum(["educational", "promotional", "clinical_data", "mixed"]),
  createdAt: z.string(),
});

export type SimulationScenario = z.infer<typeof simulationScenarioSchema>;

// Simulation Result (API type)
export const simulationResultSchema = z.object({
  id: z.string(),
  scenarioId: z.string(),
  scenarioName: z.string(),
  predictedEngagementRate: z.number(),
  predictedResponseRate: z.number(),
  predictedRxLift: z.number(),
  predictedReach: z.number(),
  costPerEngagement: z.number().optional(),
  efficiencyScore: z.number().min(0).max(100),
  channelPerformance: z.array(channelPerformanceSchema),
  vsBaseline: baselineComparisonSchema,
  runAt: z.string(),
});

export type SimulationResult = z.infer<typeof simulationResultSchema>;

// Dashboard Metrics
export const dashboardMetricsSchema = z.object({
  totalHcps: z.number(),
  avgEngagementScore: z.number(),
  totalSimulations: z.number(),
  avgPredictedLift: z.number(),
  segmentDistribution: z.array(z.object({
    segment: z.enum(segments),
    count: z.number(),
    percentage: z.number(),
  })),
  channelEffectiveness: z.array(z.object({
    channel: z.enum(channels),
    avgResponseRate: z.number(),
    avgEngagement: z.number(),
  })),
  tierBreakdown: z.array(z.object({
    tier: z.enum(tiers),
    count: z.number(),
    avgRxVolume: z.number(),
  })),
  engagementTrend: z.array(z.object({
    month: z.string(),
    avgScore: z.number(),
    responseRate: z.number(),
  })),
});

export type DashboardMetrics = z.infer<typeof dashboardMetricsSchema>;

// Audit Log (API type)
export const auditLogSchema = z.object({
  id: z.string(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string().nullable(),
  details: z.record(z.unknown()).nullable(),
  userId: z.string().nullable(),
  ipAddress: z.string().nullable(),
  createdAt: z.string(),
});

export type AuditLog = z.infer<typeof auditLogSchema>;

// Keep existing user schema for compatibility
export const userRoles = ["user", "admin", "manager", "compliance"] as const;
export type UserRole = (typeof userRoles)[number];

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("user"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ============ Invite Codes (access control) ============

export const inviteCodes = pgTable("invite_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 20 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  label: varchar("label", { length: 100 }), // "Pfizer Demo", "Portfolio Review"
  maxUses: integer("max_uses").default(1),
  useCount: integer("use_count").default(0),
  expiresAt: timestamp("expires_at"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertInviteCodeSchema = createInsertSchema(inviteCodes).pick({
  code: true,
  email: true,
  label: true,
  maxUses: true,
  expiresAt: true,
});

export const validateInviteCodeSchema = z.object({
  code: z.string().min(1).max(20),
  email: z.string().email(),
});

export type InsertInviteCode = z.infer<typeof insertInviteCodeSchema>;
export type InviteCode = typeof inviteCodes.$inferSelect;
export type ValidateInviteCode = z.infer<typeof validateInviteCodeSchema>;

// ============ Saved Audiences (cross-feature portability) ============

export const savedAudiences = pgTable("saved_audiences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  hcpIds: jsonb("hcp_ids").notNull().$type<string[]>(),
  hcpCount: integer("hcp_count").notNull(),
  filters: jsonb("filters").$type<Record<string, unknown>>(), // Original query/filters used
  source: varchar("source", { length: 50 }).notNull(), // "explorer", "audience_builder", "import"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSavedAudienceSchema = createInsertSchema(savedAudiences).pick({
  name: true,
  description: true,
  hcpIds: true,
  hcpCount: true,
  filters: true,
  source: true,
});

export type InsertSavedAudience = z.infer<typeof insertSavedAudienceSchema>;
export type SavedAudience = typeof savedAudiences.$inferSelect;

// ============ Advanced Features: Stimuli Events ============

// Stimulus types for new engagement events
export const stimulusTypes = [
  "rep_visit",
  "email_send",
  "email_open",
  "email_click",
  "webinar_invite",
  "webinar_attend",
  "conference_meeting",
  "phone_call",
  "digital_ad_impression",
  "digital_ad_click",
  "sample_delivery",
  "content_download",
] as const;

export type StimulusType = (typeof stimulusTypes)[number];

// Stimuli Events Table - tracks individual engagement events for impact prediction
export const stimuliEvents = pgTable("stimuli_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hcpId: varchar("hcp_id").notNull().references(() => hcpProfiles.id),

  // Event details
  stimulusType: varchar("stimulus_type", { length: 50 }).notNull(),
  channel: varchar("channel", { length: 20 }).notNull(),

  // Event metadata
  contentType: varchar("content_type", { length: 50 }),
  messageVariant: varchar("message_variant", { length: 100 }),
  callToAction: varchar("call_to_action", { length: 200 }),

  // Phase 7-PREP: Extended fields for campaign and rep tracking
  campaignId: varchar("campaign_id", { length: 100 }),
  repId: varchar("rep_id", { length: 100 }),
  contentCategory: varchar("content_category", { length: 50 }),
  deliveryStatus: varchar("delivery_status", { length: 30 }).default("delivered"),

  // Predicted impact (computed when event is created)
  predictedEngagementDelta: real("predicted_engagement_delta"),
  predictedConversionDelta: real("predicted_conversion_delta"),
  confidenceLower: real("confidence_lower"),
  confidenceUpper: real("confidence_upper"),

  // Actual outcome (filled in later for closed-loop learning)
  actualEngagementDelta: real("actual_engagement_delta"),
  actualConversionDelta: real("actual_conversion_delta"),
  outcomeRecordedAt: timestamp("outcome_recorded_at"),

  // Status
  status: varchar("status", { length: 20 }).notNull().default("predicted"),

  eventDate: timestamp("event_date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  hcpIdIdx: index("stimuli_hcp_id_idx").on(table.hcpId),
  campaignIdIdx: index("stimuli_campaign_id_idx").on(table.campaignId),
  channelIdx: index("stimuli_channel_idx").on(table.channel),
  eventDateIdx: index("stimuli_event_date_idx").on(table.eventDate),
  statusIdx: index("stimuli_status_idx").on(table.status),
}));

export const insertStimuliEventSchema = createInsertSchema(stimuliEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertStimuliEvent = z.infer<typeof insertStimuliEventSchema>;
export type StimuliEventDB = typeof stimuliEvents.$inferSelect;

// ============ Advanced Features: Counterfactual Scenarios ============

// Counterfactual Scenarios Table - for "what-if" backtesting
export const counterfactualScenarios = pgTable("counterfactual_scenarios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  
  // Reference to original scenario/campaign being analyzed
  originalScenarioId: varchar("original_scenario_id"),
  originalCampaignData: jsonb("original_campaign_data").$type<Record<string, unknown>>(),
  
  // Target audience for counterfactual analysis
  targetHcpIds: jsonb("target_hcp_ids").notNull().$type<string[]>(),
  
  // Variables being changed in the counterfactual
  changedVariables: jsonb("changed_variables").notNull().$type<CounterfactualVariable[]>(),
  
  // Original outcomes (baseline)
  baselineOutcome: jsonb("baseline_outcome").notNull().$type<CounterfactualOutcome>(),
  
  // Predicted counterfactual outcomes
  counterfactualOutcome: jsonb("counterfactual_outcome").notNull().$type<CounterfactualOutcome>(),
  
  // Analysis results
  upliftDelta: jsonb("uplift_delta").$type<UpliftDelta>(),
  confidenceInterval: jsonb("confidence_interval").$type<ConfidenceInterval>(),
  
  // Per-HCP breakdown (for 1:1 analysis)
  hcpLevelResults: jsonb("hcp_level_results").$type<HCPCounterfactualResult[]>(),
  
  analysisType: varchar("analysis_type", { length: 20 }).notNull().default("aggregate"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Supporting types for counterfactual analysis
export const counterfactualVariableSchema = z.object({
  variableName: z.string(),
  originalValue: z.union([z.string(), z.number(), z.record(z.number())]),
  counterfactualValue: z.union([z.string(), z.number(), z.record(z.number())]),
  variableType: z.enum(["channel_mix", "content_type", "call_to_action", "frequency", "timing", "budget", "messaging"]),
});

export type CounterfactualVariable = z.infer<typeof counterfactualVariableSchema>;

export const counterfactualOutcomeSchema = z.object({
  engagementRate: z.number(),
  responseRate: z.number(),
  conversionRate: z.number(),
  rxLift: z.number(),
  totalReach: z.number(),
});

export type CounterfactualOutcome = z.infer<typeof counterfactualOutcomeSchema>;

export const upliftDeltaSchema = z.object({
  engagementDelta: z.number(),
  responseDelta: z.number(),
  conversionDelta: z.number(),
  rxLiftDelta: z.number(),
  percentageImprovement: z.number(),
});

export type UpliftDelta = z.infer<typeof upliftDeltaSchema>;

export const confidenceIntervalSchema = z.object({
  lower: z.number(),
  upper: z.number(),
  confidenceLevel: z.number(),
});

export type ConfidenceInterval = z.infer<typeof confidenceIntervalSchema>;

export const hcpCounterfactualResultSchema = z.object({
  hcpId: z.string(),
  baselineScore: z.number(),
  counterfactualScore: z.number(),
  delta: z.number(),
  confidenceLower: z.number(),
  confidenceUpper: z.number(),
});

export type HCPCounterfactualResult = z.infer<typeof hcpCounterfactualResultSchema>;

export const insertCounterfactualScenarioSchema = createInsertSchema(counterfactualScenarios).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertCounterfactualScenario = z.infer<typeof insertCounterfactualScenarioSchema>;
export type CounterfactualScenarioDB = typeof counterfactualScenarios.$inferSelect;

// ============ Advanced Features: Natural Language Query Logs ============

// NL Query Logs Table - for auditing and learning from GenAI queries
export const nlQueryLogs = pgTable("nl_query_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // The natural language query
  query: text("query").notNull(),
  
  // Parsed intent and parameters
  parsedIntent: varchar("parsed_intent", { length: 100 }),
  extractedFilters: jsonb("extracted_filters").$type<NLQueryFilters>(),
  
  // Generated SQL or filter criteria
  generatedCriteria: jsonb("generated_criteria").$type<Record<string, unknown>>(),
  
  // Results summary
  resultCount: integer("result_count"),
  resultHcpIds: jsonb("result_hcp_ids").$type<string[]>(),
  
  // Recommendations generated
  recommendations: jsonb("recommendations").$type<NLRecommendation[]>(),
  
  // User feedback for learning
  userApproved: integer("user_approved"),
  userFeedback: text("user_feedback"),
  
  // Execution details
  executionTimeMs: integer("execution_time_ms"),
  modelUsed: varchar("model_used", { length: 50 }),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  
  // Audit trail
  userId: varchar("user_id", { length: 100 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Supporting types for NL queries
export const nlQueryFiltersSchema = z.object({
  tiers: z.array(z.enum(tiers)).optional(),
  segments: z.array(z.enum(segments)).optional(),
  specialties: z.array(z.enum(specialties)).optional(),
  engagementRange: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
  }).optional(),
  channels: z.array(z.enum(channels)).optional(),
  states: z.array(z.string()).optional(),
  customCriteria: z.record(z.unknown()).optional(),
});

export type NLQueryFilters = z.infer<typeof nlQueryFiltersSchema>;

export const nlRecommendationSchema = z.object({
  type: z.enum(["channel", "timing", "content", "frequency", "audience"]),
  recommendation: z.string(),
  predictedImpact: z.number(),
  confidence: z.number(),
  rationale: z.string(),
});

export type NLRecommendation = z.infer<typeof nlRecommendationSchema>;

export const insertNlQueryLogSchema = createInsertSchema(nlQueryLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertNLQueryLog = z.infer<typeof insertNlQueryLogSchema>;
export type NLQueryLogDB = typeof nlQueryLogs.$inferSelect;

// ============ API Types for Advanced Features ============

// Stimuli Event (API type)
export const stimuliEventSchema = z.object({
  id: z.string(),
  hcpId: z.string(),
  stimulusType: z.enum(stimulusTypes),
  channel: z.enum(channels),
  contentType: z.string().nullable(),
  messageVariant: z.string().nullable(),
  callToAction: z.string().nullable(),
  predictedEngagementDelta: z.number().nullable(),
  predictedConversionDelta: z.number().nullable(),
  confidenceLower: z.number().nullable(),
  confidenceUpper: z.number().nullable(),
  actualEngagementDelta: z.number().nullable(),
  actualConversionDelta: z.number().nullable(),
  outcomeRecordedAt: z.string().nullable(),
  status: z.enum(["predicted", "confirmed", "rejected"]),
  eventDate: z.string(),
  createdAt: z.string(),
});

export type StimuliEvent = z.infer<typeof stimuliEventSchema>;

// Counterfactual Scenario (API type)
export const counterfactualScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  originalScenarioId: z.string().nullable(),
  originalCampaignData: z.record(z.unknown()).nullable(),
  targetHcpIds: z.array(z.string()),
  changedVariables: z.array(counterfactualVariableSchema),
  baselineOutcome: counterfactualOutcomeSchema,
  counterfactualOutcome: counterfactualOutcomeSchema,
  upliftDelta: upliftDeltaSchema.nullable(),
  confidenceInterval: confidenceIntervalSchema.nullable(),
  hcpLevelResults: z.array(hcpCounterfactualResultSchema).nullable(),
  analysisType: z.enum(["aggregate", "individual", "both"]),
  status: z.enum(["pending", "running", "completed", "failed"]),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
});

export type CounterfactualScenario = z.infer<typeof counterfactualScenarioSchema>;

// NL Query Response (API type)
export const nlQueryResponseSchema = z.object({
  id: z.string(),
  query: z.string(),
  parsedIntent: z.string().nullable(),
  filters: nlQueryFiltersSchema.nullable(),
  resultCount: z.number(),
  results: z.array(hcpProfileSchema).optional(),
  recommendations: z.array(nlRecommendationSchema).optional(),
  executionTimeMs: z.number(),
  createdAt: z.string(),
});

export type NLQueryResponse = z.infer<typeof nlQueryResponseSchema>;

// Request type for creating stimuli
export const createStimuliRequestSchema = z.object({
  hcpId: z.string(),
  stimulusType: z.enum(stimulusTypes),
  channel: z.enum(channels),
  contentType: z.string().optional(),
  messageVariant: z.string().optional(),
  callToAction: z.string().optional(),
  eventDate: z.string().optional(),
});

export type CreateStimuliRequest = z.infer<typeof createStimuliRequestSchema>;

// Request type for counterfactual analysis
export const createCounterfactualRequestSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  originalScenarioId: z.string().optional(),
  targetHcpIds: z.array(z.string()),
  changedVariables: z.array(counterfactualVariableSchema),
  analysisType: z.enum(["aggregate", "individual", "both"]).optional(),
});

export type CreateCounterfactualRequest = z.infer<typeof createCounterfactualRequestSchema>;

// Request type for NL query
export const nlQueryRequestSchema = z.object({
  query: z.string().min(5).max(500),
  includeRecommendations: z.boolean().optional(),
  maxResults: z.number().min(1).max(100).optional(),
});

export type NLQueryRequest = z.infer<typeof nlQueryRequestSchema>;

// ============ Model Evaluation & Closed-Loop Learning ============

// Model Evaluations Table - tracks prediction accuracy over time
export const modelEvaluations = pgTable("model_evaluations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Evaluation period
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  
  // Prediction type being evaluated
  predictionType: varchar("prediction_type", { length: 50 }).notNull(),
  
  // Sample size
  totalPredictions: integer("total_predictions").notNull(),
  predictionsWithOutcomes: integer("predictions_with_outcomes").notNull(),
  
  // Accuracy metrics
  meanAbsoluteError: real("mean_absolute_error"),
  rootMeanSquaredError: real("root_mean_squared_error"),
  meanAbsolutePercentError: real("mean_absolute_percent_error"),
  r2Score: real("r2_score"),
  
  // Calibration metrics (prediction vs actual correlation)
  calibrationSlope: real("calibration_slope"),
  calibrationIntercept: real("calibration_intercept"),
  
  // Confidence interval accuracy
  ciCoverageRate: real("ci_coverage_rate"),
  avgCiWidth: real("avg_ci_width"),
  
  // Breakdown by segment
  segmentMetrics: jsonb("segment_metrics").$type<SegmentModelMetric[]>(),
  
  // Breakdown by channel
  channelMetrics: jsonb("channel_metrics").$type<ChannelModelMetric[]>(),
  
  // Model version and metadata
  modelVersion: varchar("model_version", { length: 50 }),
  evaluatedAt: timestamp("evaluated_at").notNull().defaultNow(),
});

// Supporting types for model evaluation
export const segmentModelMetricSchema = z.object({
  segment: z.enum(segments),
  sampleSize: z.number(),
  mae: z.number(),
  rmse: z.number(),
  accuracyTrend: z.enum(["improving", "stable", "declining"]),
});

export type SegmentModelMetric = z.infer<typeof segmentModelMetricSchema>;

export const channelModelMetricSchema = z.object({
  channel: z.enum(channels),
  sampleSize: z.number(),
  mae: z.number(),
  rmse: z.number(),
  avgPredicted: z.number(),
  avgActual: z.number(),
});

export type ChannelModelMetric = z.infer<typeof channelModelMetricSchema>;

export const insertModelEvaluationSchema = createInsertSchema(modelEvaluations).omit({
  id: true,
  evaluatedAt: true,
});

export type InsertModelEvaluation = z.infer<typeof insertModelEvaluationSchema>;
export type ModelEvaluationDB = typeof modelEvaluations.$inferSelect;

// Model Evaluation (API type)
export const modelEvaluationSchema = z.object({
  id: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  predictionType: z.enum(["stimuli_impact", "counterfactual", "conversion", "engagement"]),
  totalPredictions: z.number(),
  predictionsWithOutcomes: z.number(),
  meanAbsoluteError: z.number().nullable(),
  rootMeanSquaredError: z.number().nullable(),
  meanAbsolutePercentError: z.number().nullable(),
  r2Score: z.number().nullable(),
  calibrationSlope: z.number().nullable(),
  calibrationIntercept: z.number().nullable(),
  ciCoverageRate: z.number().nullable(),
  avgCiWidth: z.number().nullable(),
  segmentMetrics: z.array(segmentModelMetricSchema).nullable(),
  channelMetrics: z.array(channelModelMetricSchema).nullable(),
  modelVersion: z.string().nullable(),
  evaluatedAt: z.string(),
});

export type ModelEvaluation = z.infer<typeof modelEvaluationSchema>;

// Model Health Summary (aggregated stats for dashboard)
export const modelHealthSummarySchema = z.object({
  overallAccuracy: z.number(),
  totalEvaluations: z.number(),
  latestMae: z.number().nullable(),
  latestRmse: z.number().nullable(),
  accuracyTrend: z.enum(["improving", "stable", "declining"]),
  ciCoverageRate: z.number().nullable(),
  recommendedActions: z.array(z.object({
    priority: z.enum(["high", "medium", "low"]),
    action: z.string(),
    impact: z.string(),
  })),
  predictionTypeBreakdown: z.array(z.object({
    type: z.string(),
    accuracy: z.number(),
    sampleSize: z.number(),
  })),
  lastEvaluatedAt: z.string().nullable(),
});

export type ModelHealthSummary = z.infer<typeof modelHealthSummarySchema>;

// Request type for recording actual outcomes
export const recordOutcomeRequestSchema = z.object({
  stimuliEventId: z.string(),
  actualEngagementDelta: z.number(),
  actualConversionDelta: z.number().optional(),
});

export type RecordOutcomeRequest = z.infer<typeof recordOutcomeRequestSchema>;

// Request type for running model evaluation
export const runEvaluationRequestSchema = z.object({
  predictionType: z.enum(["stimuli_impact", "counterfactual", "conversion", "engagement"]),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  forceReevaluate: z.boolean().optional(),
});

export type RunEvaluationRequest = z.infer<typeof runEvaluationRequestSchema>;

// ============================================================================
// PHASE 6: AGENTIC ECOSYSTEM SCHEMA ADDITIONS
// ============================================================================

// ============================================================================
// INTEGRATION SYSTEM
// ============================================================================

// Supported integration types
export const integrationTypes = [
  "slack",
  "jira", 
  "teams",
  "box",
  "confluence",
  "veeva",
  "email"
] as const;

export type IntegrationType = (typeof integrationTypes)[number];

// Integration status
export const integrationStatuses = ["active", "inactive", "error", "pending_auth"] as const;
export type IntegrationStatus = (typeof integrationStatuses)[number];

// Integration Configurations Table
export const integrationConfigs = pgTable("integration_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Integration identification
  type: varchar("type", { length: 50 }).notNull(),  // IntegrationType
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  
  // Connection details (encrypted in production)
  credentials: jsonb("credentials").$type<IntegrationCredentials>(),
  mcpEndpoint: varchar("mcp_endpoint", { length: 500 }),
  
  // Configuration
  scopes: jsonb("scopes").$type<string[]>(),
  defaultSettings: jsonb("default_settings").$type<Record<string, unknown>>(),
  
  // Status tracking
  status: varchar("status", { length: 20 }).notNull().default("pending_auth"),
  lastHealthCheck: timestamp("last_health_check"),
  lastError: text("last_error"),
  
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Credential types per integration
export const integrationCredentialsSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("slack"),
    botToken: z.string(),
    signingSecret: z.string().optional(),
    defaultChannel: z.string().optional(),
  }),
  z.object({
    type: z.literal("jira"),
    email: z.string().email(),
    apiToken: z.string(),
    baseUrl: z.string().url(),
    projectKey: z.string().optional(),
  }),
  z.object({
    type: z.literal("teams"),
    tenantId: z.string(),
    clientId: z.string(),
    clientSecret: z.string(),
    defaultTeamId: z.string().optional(),
    defaultChannelId: z.string().optional(),
  }),
  z.object({
    type: z.literal("box"),
    clientId: z.string(),
    clientSecret: z.string(),
    enterpriseId: z.string(),
    defaultFolderId: z.string().optional(),
  }),
  z.object({
    type: z.literal("confluence"),
    email: z.string().email(),
    apiToken: z.string(),
    baseUrl: z.string().url(),
    spaceKey: z.string().optional(),
  }),
  z.object({
    type: z.literal("veeva"),
    username: z.string(),
    password: z.string(),
    vaultDomain: z.string(),
  }),
  z.object({
    type: z.literal("email"),
    smtpHost: z.string(),
    smtpPort: z.number(),
    username: z.string(),
    password: z.string(),
    fromAddress: z.string().email(),
  }),
]);

export type IntegrationCredentials = z.infer<typeof integrationCredentialsSchema>;

export const insertIntegrationConfigSchema = createInsertSchema(integrationConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastHealthCheck: true,
});

export type InsertIntegrationConfig = z.infer<typeof insertIntegrationConfigSchema>;
export type IntegrationConfig = typeof integrationConfigs.$inferSelect;

// ============================================================================
// ACTION EXPORTS (Audit Trail for Integrations)
// ============================================================================

export const actionExportStatuses = ["pending", "success", "failed", "retrying"] as const;
export type ActionExportStatus = (typeof actionExportStatuses)[number];

export const actionExports = pgTable("action_exports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Source (what triggered the export)
  sourceType: varchar("source_type", { length: 50 }).notNull(),  // "nba", "simulation", "audience", "alert", "document"
  sourceId: varchar("source_id").notNull(),
  sourceName: varchar("source_name", { length: 200 }),
  
  // Destination
  integrationId: varchar("integration_id").notNull().references(() => integrationConfigs.id),
  destinationType: varchar("destination_type", { length: 50 }).notNull(),  // "slack_message", "jira_ticket", "box_file", etc.
  destinationRef: varchar("destination_ref", { length: 500 }),  // Jira ticket ID, Slack ts, Box file ID, etc.
  destinationUrl: varchar("destination_url", { length: 1000 }),  // Direct link to created resource
  
  // Payload
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  
  // Status
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  
  // Audit
  exportedBy: varchar("exported_by", { length: 100 }),
  exportedAt: timestamp("exported_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertActionExportSchema = createInsertSchema(actionExports).omit({
  id: true,
  exportedAt: true,
});

export type InsertActionExport = z.infer<typeof insertActionExportSchema>;
export type ActionExport = typeof actionExports.$inferSelect;

// ============================================================================
// AGENT SYSTEM
// ============================================================================

// Agent types
export const agentTypes = [
  "channel_health_monitor",
  "engagement_drift_detector", 
  "insight_synthesizer",
  "ecosystem_watchdog",
  "competitive_signal_watcher",
  "pattern_detector",
  "anomaly_assessor"
] as const;

export type AgentType = (typeof agentTypes)[number];

// Agent statuses
export const agentStatuses = ["active", "paused", "disabled", "error"] as const;
export type AgentStatus = (typeof agentStatuses)[number];

// Agent Definitions Table
export const agentDefinitions = pgTable("agent_definitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Identity
  type: varchar("type", { length: 50 }).notNull(),  // AgentType
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  version: varchar("version", { length: 20 }).default("1.0.0"),
  
  // Trigger configuration
  triggers: jsonb("triggers").notNull().$type<AgentTriggers>(),
  
  // Input configuration
  inputSchema: jsonb("input_schema").$type<Record<string, unknown>>(),
  defaultInputs: jsonb("default_inputs").$type<Record<string, unknown>>(),
  
  // Output configuration
  outputDestinations: jsonb("output_destinations").$type<AgentDestinations>(),
  
  // Runtime settings
  status: varchar("status", { length: 20 }).notNull().default("active"),
  timeoutSeconds: integer("timeout_seconds").default(300),
  maxRetries: integer("max_retries").default(3),
  
  // Performance tracking
  lastRunAt: timestamp("last_run_at"),
  lastRunStatus: varchar("last_run_status", { length: 20 }),
  avgExecutionTimeMs: integer("avg_execution_time_ms"),
  successRate: real("success_rate"),
  
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Agent trigger configuration
export const agentTriggersSchema = z.object({
  scheduled: z.object({
    enabled: z.boolean(),
    cron: z.string().optional(),  // Cron expression
    timezone: z.string().optional(),
  }).optional(),
  onDemand: z.boolean().optional(),
  eventDriven: z.object({
    enabled: z.boolean(),
    events: z.array(z.string()),  // Event types that trigger this agent
  }).optional(),
});

export type AgentTriggers = z.infer<typeof agentTriggersSchema>;

// Agent output destinations
export const agentDestinationsSchema = z.object({
  inPlatform: z.array(z.enum(["alert_banner", "notification_center", "dashboard_widget", "dedicated_view"])).optional(),
  external: z.array(z.enum(["slack", "jira", "teams", "box", "email"])).optional(),
});

export type AgentDestinations = z.infer<typeof agentDestinationsSchema>;

export const insertAgentDefinitionSchema = createInsertSchema(agentDefinitions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastRunAt: true,
  lastRunStatus: true,
});

export type InsertAgentDefinition = z.infer<typeof insertAgentDefinitionSchema>;
export type AgentDefinition = typeof agentDefinitions.$inferSelect;

// ============================================================================
// AGENT RUNS (Execution History)
// ============================================================================

export const agentRunStatuses = ["pending", "running", "completed", "failed", "cancelled"] as const;
export type AgentRunStatus = (typeof agentRunStatuses)[number];

export const agentRuns = pgTable("agent_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Agent reference
  agentId: varchar("agent_id").notNull().references(() => agentDefinitions.id),
  agentType: varchar("agent_type", { length: 50 }).notNull(),
  agentVersion: varchar("agent_version", { length: 20 }),
  
  // Trigger info
  triggerType: varchar("trigger_type", { length: 20 }).notNull(),  // "scheduled", "on_demand", "event"
  triggeredBy: varchar("triggered_by", { length: 100 }),  // User ID or "system"
  triggerEvent: varchar("trigger_event", { length: 100 }),  // If event-driven
  
  // Inputs
  inputs: jsonb("inputs").$type<Record<string, unknown>>(),
  
  // Outputs
  outputs: jsonb("outputs").$type<AgentRunOutputs>(),
  
  // Execution details
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  errorMessage: text("error_message"),
  errorStack: text("error_stack"),
  
  // Performance metrics
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  executionTimeMs: integer("execution_time_ms"),
  
  // Resource usage
  tokensUsed: integer("tokens_used"),  // If Claude was invoked
  
  // Actions generated
  actionsProposed: integer("actions_proposed").default(0),
  actionsApproved: integer("actions_approved").default(0),
  actionsExecuted: integer("actions_executed").default(0),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Agent run outputs structure
export const agentRunOutputsSchema = z.object({
  alerts: z.array(z.object({
    id: z.string(),
    severity: z.enum(["critical", "warning", "info"]),
    title: z.string(),
    message: z.string(),
  })).optional(),
  recommendations: z.array(z.object({
    id: z.string(),
    type: z.string(),
    description: z.string(),
    confidence: z.number(),
  })).optional(),
  documents: z.array(z.object({
    id: z.string(),
    title: z.string(),
    type: z.string(),
  })).optional(),
  metrics: z.record(z.number()).optional(),
  raw: z.unknown().optional(),
});

export type AgentRunOutputs = z.infer<typeof agentRunOutputsSchema>;

export const insertAgentRunSchema = createInsertSchema(agentRuns).omit({
  id: true,
  createdAt: true,
});

export type InsertAgentRun = z.infer<typeof insertAgentRunSchema>;
export type AgentRun = typeof agentRuns.$inferSelect;

// ============================================================================
// AGENT ACTIONS (Approval Queue)
// ============================================================================

export const agentActionStatuses = [
  "pending",
  "approved", 
  "rejected",
  "modified",
  "auto_approved",
  "executing",
  "executed",
  "failed"
] as const;

export type AgentActionStatus = (typeof agentActionStatuses)[number];

export const agentActions = pgTable("agent_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Source
  agentId: varchar("agent_id").notNull().references(() => agentDefinitions.id),
  agentRunId: varchar("agent_run_id").references(() => agentRuns.id),
  agentType: varchar("agent_type", { length: 50 }).notNull(),
  
  // Action details
  actionType: varchar("action_type", { length: 50 }).notNull(),  // "send_slack", "create_jira", "generate_document", etc.
  actionName: varchar("action_name", { length: 200 }).notNull(),
  
  // What the agent wants to do
  proposedAction: jsonb("proposed_action").notNull().$type<ProposedAction>(),
  reasoning: text("reasoning"),  // Claude-generated explanation
  confidence: real("confidence"),  // 0-1
  
  // Risk assessment
  riskLevel: varchar("risk_level", { length: 20 }).default("low"),  // "low", "medium", "high"
  impactScope: varchar("impact_scope", { length: 20 }),  // "individual", "segment", "portfolio"
  affectedEntityCount: integer("affected_entity_count"),
  
  // Approval workflow
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  autoApprovalEligible: boolean("auto_approval_eligible").default(false),
  approvalRuleId: varchar("approval_rule_id").references(() => approvalRules.id),
  
  // Review
  reviewedBy: varchar("reviewed_by", { length: 100 }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  modifiedAction: jsonb("modified_action").$type<ProposedAction>(),  // If modified before approval
  
  // Execution
  executedAt: timestamp("executed_at"),
  executionResult: jsonb("execution_result").$type<ExecutionResult>(),
  executionError: text("execution_error"),
  
  // Expiration
  expiresAt: timestamp("expires_at"),  // Action expires if not reviewed
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Proposed action structure
export const proposedActionSchema = z.object({
  destination: z.object({
    type: z.string(),  // "slack", "jira", "box", etc.
    integrationId: z.string(),
    target: z.string().optional(),  // Channel, project, folder, etc.
  }),
  payload: z.record(z.unknown()),
  metadata: z.object({
    sourceEntities: z.array(z.object({
      type: z.string(),
      id: z.string(),
      name: z.string().optional(),
    })).optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
});

export type ProposedAction = z.infer<typeof proposedActionSchema>;

// Execution result structure
export const executionResultSchema = z.object({
  success: z.boolean(),
  destinationRef: z.string().optional(),
  destinationUrl: z.string().optional(),
  responseData: z.unknown().optional(),
  executionTimeMs: z.number().optional(),
});

export type ExecutionResult = z.infer<typeof executionResultSchema>;

export const insertAgentActionSchema = createInsertSchema(agentActions).omit({
  id: true,
  createdAt: true,
});

export type InsertAgentAction = z.infer<typeof insertAgentActionSchema>;
export type AgentAction = typeof agentActions.$inferSelect;

// ============================================================================
// APPROVAL RULES
// ============================================================================

export const approvalRules = pgTable("approval_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Scope
  agentType: varchar("agent_type", { length: 50 }),  // null = applies to all agents
  actionType: varchar("action_type", { length: 50 }),  // null = applies to all actions
  
  // Rule name and description
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  
  // Auto-approval conditions
  autoApproveConditions: jsonb("auto_approve_conditions").$type<AutoApproveConditions>(),
  
  // Manual approval settings
  requiredApprovers: jsonb("required_approvers").$type<string[]>(),  // User IDs or roles
  approvalMode: varchar("approval_mode", { length: 20 }).default("any"),  // "any" or "all"
  escalationAfterMinutes: integer("escalation_after_minutes"),
  escalateTo: jsonb("escalate_to").$type<string[]>(),
  
  // Notifications
  notifyOnProposal: jsonb("notify_on_proposal").$type<string[]>(),
  notifyOnExecution: jsonb("notify_on_execution").$type<string[]>(),
  
  // Rule status
  enabled: boolean("enabled").default(true),
  priority: integer("priority").default(0),  // Higher = evaluated first
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Auto-approval conditions
export const autoApproveConditionsSchema = z.object({
  enabled: z.boolean(),
  confidenceThreshold: z.number().min(0).max(1),
  impactScopes: z.array(z.enum(["individual", "segment", "portfolio"])).optional(),
  maxAffectedEntities: z.number().optional(),
  allowedDestinations: z.array(z.string()).optional(),
  excludeRiskLevels: z.array(z.enum(["medium", "high"])).optional(),
  timeWindow: z.object({
    enabled: z.boolean(),
    startHour: z.number().min(0).max(23),
    endHour: z.number().min(0).max(23),
    timezone: z.string(),
    daysOfWeek: z.array(z.number().min(0).max(6)),
  }).optional(),
});

export type AutoApproveConditions = z.infer<typeof autoApproveConditionsSchema>;

export const insertApprovalRuleSchema = createInsertSchema(approvalRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertApprovalRule = z.infer<typeof insertApprovalRuleSchema>;
export type ApprovalRule = typeof approvalRules.$inferSelect;

// ============================================================================
// GENERATED DOCUMENTS
// ============================================================================

export const documentTypes = [
  "brief",
  "pov",
  "executive_summary",
  "campaign_report",
  "health_assessment",
  "custom"
] as const;

export type DocumentType = (typeof documentTypes)[number];

export const generatedDocuments = pgTable("generated_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Document identity
  title: varchar("title", { length: 300 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),  // DocumentType
  description: text("description"),
  
  // Content
  content: text("content").notNull(),  // Markdown
  contentHtml: text("content_html"),  // Rendered HTML
  sections: jsonb("sections").$type<DocumentSection[]>(),
  
  // Key outputs
  keyFindings: jsonb("key_findings").$type<string[]>(),
  recommendations: jsonb("recommendations").$type<string[]>(),
  
  // Source context
  sourceContext: jsonb("source_context").$type<DocumentSourceContext>(),
  
  // Generation metadata
  generatedBy: varchar("generated_by", { length: 50 }),  // Agent ID or "user"
  agentRunId: varchar("agent_run_id").references(() => agentRuns.id),
  modelUsed: varchar("model_used", { length: 50 }),
  tokensUsed: integer("tokens_used"),
  generationTimeMs: integer("generation_time_ms"),
  
  // Formatting
  tone: varchar("tone", { length: 20 }),
  wordCount: integer("word_count"),
  
  // Exports
  exports: jsonb("exports").$type<DocumentExport[]>(),
  
  // Status
  status: varchar("status", { length: 20 }).default("draft"),  // "draft", "final", "archived"
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Document section structure
export const documentSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  order: z.number(),
});

export type DocumentSection = z.infer<typeof documentSectionSchema>;

// Document source context
export const documentSourceContextSchema = z.object({
  audiences: z.array(z.object({
    id: z.string(),
    name: z.string(),
    hcpCount: z.number(),
  })).optional(),
  simulations: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).optional(),
  timeframe: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
  focusAreas: z.array(z.string()).optional(),
  customPrompt: z.string().optional(),
});

export type DocumentSourceContext = z.infer<typeof documentSourceContextSchema>;

// Document export record
export const documentExportSchema = z.object({
  destination: z.string(),
  exportedAt: z.string(),
  destinationRef: z.string().optional(),
  destinationUrl: z.string().optional(),
});

export type DocumentExport = z.infer<typeof documentExportSchema>;

export const insertGeneratedDocumentSchema = createInsertSchema(generatedDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGeneratedDocument = z.infer<typeof insertGeneratedDocumentSchema>;
export type GeneratedDocument = typeof generatedDocuments.$inferSelect;

// ============================================================================
// ALERTS (In-Platform Notifications)
// ============================================================================

export const alertSeverities = ["critical", "warning", "info", "success"] as const;
export type AlertSeverity = (typeof alertSeverities)[number];

export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Source
  agentId: varchar("agent_id").references(() => agentDefinitions.id),
  agentRunId: varchar("agent_run_id").references(() => agentRuns.id),
  
  // Alert content
  severity: varchar("severity", { length: 20 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  
  // Affected entities
  affectedEntities: jsonb("affected_entities").$type<AlertAffectedEntities>(),
  
  // Metrics
  metrics: jsonb("metrics").$type<AlertMetrics>(),
  
  // Actions
  suggestedActions: jsonb("suggested_actions").$type<AlertSuggestedAction[]>(),
  
  // Links
  linkType: varchar("link_type", { length: 50 }),  // "audience", "hcp", "simulation", etc.
  linkId: varchar("link_id", { length: 100 }),
  linkUrl: varchar("link_url", { length: 500 }),
  
  // Status
  status: varchar("status", { length: 20 }).default("active"),  // "active", "acknowledged", "dismissed", "resolved"
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: varchar("acknowledged_by", { length: 100 }),
  dismissedAt: timestamp("dismissed_at"),
  dismissedBy: varchar("dismissed_by", { length: 100 }),
  resolvedAt: timestamp("resolved_at"),
  
  // Expiration
  expiresAt: timestamp("expires_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Alert affected entities
export const alertAffectedEntitiesSchema = z.object({
  type: z.enum(["audience", "hcp", "channel", "segment"]),
  ids: z.array(z.string()),
  count: z.number(),
  sampleNames: z.array(z.string()).optional(),
});

export type AlertAffectedEntities = z.infer<typeof alertAffectedEntitiesSchema>;

// Alert metrics
export const alertMetricsSchema = z.object({
  current: z.number(),
  threshold: z.number(),
  previous: z.number().optional(),
  trend: z.enum(["improving", "stable", "declining"]).optional(),
  percentChange: z.number().optional(),
});

export type AlertMetrics = z.infer<typeof alertMetricsSchema>;

// Alert suggested action
export const alertSuggestedActionSchema = z.object({
  type: z.string(),
  label: z.string(),
  description: z.string().optional(),
  actionId: z.string().optional(),  // Link to agent action
});

export type AlertSuggestedAction = z.infer<typeof alertSuggestedActionSchema>;

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
});

export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

// Integration API
export const createIntegrationRequestSchema = z.object({
  type: z.enum(integrationTypes),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  credentials: integrationCredentialsSchema,
  defaultSettings: z.record(z.unknown()).optional(),
});

export type CreateIntegrationRequest = z.infer<typeof createIntegrationRequestSchema>;

// Slack send request
export const slackSendRequestSchema = z.object({
  integrationId: z.string(),
  channel: z.string().optional(),
  message: z.object({
    text: z.string(),
    blocks: z.array(z.unknown()).optional(),
    attachments: z.array(z.unknown()).optional(),
  }),
  sourceType: z.string(),
  sourceId: z.string(),
});

export type SlackSendRequest = z.infer<typeof slackSendRequestSchema>;

// Jira create ticket request (direct)
export const jiraCreateTicketRequestSchema = z.object({
  integrationId: z.string(),
  projectKey: z.string(),
  summary: z.string(),
  description: z.string().optional(),
  issueType: z.string().default("Task"),
  priority: z.string().optional(),
  labels: z.array(z.string()).optional(),
  customFields: z.record(z.unknown()).optional(),
  sourceType: z.string(),
  sourceId: z.string(),
});

export type JiraCreateTicketRequest = z.infer<typeof jiraCreateTicketRequestSchema>;

// Jira template-based ticket creation schema (for NBA and Simulation)
export const jiraTemplateTicketRequestSchema = z.object({
  integrationId: z.string(),
  projectKey: z.string(),
  templateType: z.enum(["nba_action", "simulation_result", "channel_alert", "custom"]),
  // NBA data (when templateType is "nba_action")
  nba: z.object({
    hcpId: z.string(),
    hcpName: z.string(),
    recommendedChannel: z.string(),
    actionType: z.string(),
    urgency: z.string(),
    confidence: z.number(),
    reasoning: z.string(),
    suggestedTiming: z.string(),
    metrics: z.object({
      channelScore: z.number(),
      responseRate: z.number(),
      lastContactDays: z.number().optional(),
    }),
  }).optional(),
  // Simulation data (when templateType is "simulation_result")
  simulation: z.object({
    id: z.string(),
    scenarioName: z.string(),
    predictedEngagementRate: z.number(),
    predictedResponseRate: z.number(),
    predictedRxLift: z.number(),
    predictedReach: z.number(),
    costPerEngagement: z.number().optional(),
    efficiencyScore: z.number(),
    vsBaseline: z.object({
      engagement: z.string(),
      response: z.string(),
      rxVolume: z.string(),
    }),
    runAt: z.string(),
  }).optional(),
});

export type JiraTemplateTicketRequest = z.infer<typeof jiraTemplateTicketRequestSchema>;

// Jira update issue request
export const jiraUpdateIssueRequestSchema = z.object({
  integrationId: z.string(),
  issueKey: z.string(),
  fields: z.object({
    summary: z.string().optional(),
    description: z.string().optional(),
    priority: z.string().optional(),
    labels: z.array(z.string()).optional(),
    status: z.string().optional(),
  }),
});

export type JiraUpdateIssueRequest = z.infer<typeof jiraUpdateIssueRequestSchema>;

// Agent run request
export const runAgentRequestSchema = z.object({
  agentId: z.string(),
  inputs: z.record(z.unknown()).optional(),
  triggeredBy: z.string().optional(),
});

export type RunAgentRequest = z.infer<typeof runAgentRequestSchema>;

// Document generation request
export const generateDocumentRequestSchema = z.object({
  type: z.enum(documentTypes),
  title: z.string().optional(),
  context: documentSourceContextSchema,
  formatting: z.object({
    tone: z.enum(["strategic", "tactical", "executive"]).optional(),
    length: z.enum(["concise", "standard", "comprehensive"]).optional(),
    includeVisualizations: z.boolean().optional(),
    includeSupportingData: z.boolean().optional(),
  }).optional(),
  customPrompt: z.string().optional(),
});

export type GenerateDocumentRequest = z.infer<typeof generateDocumentRequestSchema>;

// Action approval request
export const approveActionRequestSchema = z.object({
  actionId: z.string(),
  decision: z.enum(["approve", "reject", "modify"]),
  notes: z.string().optional(),
  modifiedPayload: z.record(z.unknown()).optional(),
});

export type ApproveActionRequest = z.infer<typeof approveActionRequestSchema>;

// Alert acknowledgment request
export const acknowledgeAlertRequestSchema = z.object({
  alertId: z.string(),
  action: z.enum(["acknowledge", "dismiss", "resolve"]),
});

export type AcknowledgeAlertRequest = z.infer<typeof acknowledgeAlertRequestSchema>;

// ============================================================================
// PHASE 7-PREP: DATA FOUNDATION SCHEMA ADDITIONS
// ============================================================================

// ============================================================================
// PRESCRIBING HISTORY - Monthly Rx snapshots
// ============================================================================

export const prescribingHistory = pgTable("prescribing_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hcpId: varchar("hcp_id").notNull().references(() => hcpProfiles.id),

  // Time period
  month: varchar("month", { length: 7 }).notNull(), // YYYY-MM format

  // Prescribing metrics
  totalRx: integer("total_rx").notNull().default(0),
  newRx: integer("new_rx").notNull().default(0),
  refillRx: integer("refill_rx").notNull().default(0),

  // Market metrics
  marketShare: real("market_share").default(0),
  competitorShare: real("competitor_share").default(0),

  // Product breakdown (JSONB for flexibility)
  productBreakdown: jsonb("product_breakdown").$type<Record<string, number>>(),

  // Trend indicators
  momChange: real("mom_change"), // Month-over-month change percentage
  yoyChange: real("yoy_change"), // Year-over-year change percentage

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPrescribingHistorySchema = createInsertSchema(prescribingHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertPrescribingHistory = z.infer<typeof insertPrescribingHistorySchema>;
export type PrescribingHistoryDB = typeof prescribingHistory.$inferSelect;

// ============================================================================
// TERRITORY ASSIGNMENTS - Rep-HCP mappings
// ============================================================================

export const territoryAssignments = pgTable("territory_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Rep information
  repId: varchar("rep_id", { length: 100 }).notNull(),
  repName: varchar("rep_name", { length: 200 }).notNull(),
  repEmail: varchar("rep_email", { length: 255 }),

  // HCP assignment
  hcpId: varchar("hcp_id").notNull().references(() => hcpProfiles.id),

  // Assignment details
  assignmentType: varchar("assignment_type", { length: 30 }).notNull().default("primary"), // primary, secondary, backup
  territory: varchar("territory", { length: 100 }),
  region: varchar("region", { length: 100 }),
  district: varchar("district", { length: 100 }),

  // Assignment period
  effectiveFrom: timestamp("effective_from").notNull().defaultNow(),
  effectiveTo: timestamp("effective_to"),

  // Status
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTerritoryAssignmentSchema = createInsertSchema(territoryAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTerritoryAssignment = z.infer<typeof insertTerritoryAssignmentSchema>;
export type TerritoryAssignmentDB = typeof territoryAssignments.$inferSelect;

// ============================================================================
// CAMPAIGNS - Historical campaign definitions
// ============================================================================

export const campaignStatuses = ["draft", "active", "paused", "completed", "cancelled"] as const;
export type CampaignStatus = (typeof campaignStatuses)[number];

export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Campaign identity
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  campaignCode: varchar("campaign_code", { length: 50 }).unique(),

  // Campaign type
  campaignType: varchar("campaign_type", { length: 50 }), // launch, maintenance, awareness, retention
  therapeuticArea: varchar("therapeutic_area", { length: 100 }),
  product: varchar("product", { length: 100 }),

  // Phase 7D: Campaign coordination fields
  brand: varchar("brand", { length: 100 }),
  businessUnit: varchar("business_unit", { length: 100 }),
  priority: integer("priority").notNull().default(50), // 1-100, higher = more important
  targetAudienceId: varchar("target_audience_id").references(() => savedAudiences.id),
  createdBy: varchar("created_by", { length: 100 }),

  // Timing
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),

  // Channel strategy
  primaryChannel: varchar("primary_channel", { length: 30 }),
  channelMix: jsonb("channel_mix").$type<Record<string, number>>(),

  // Targeting
  targetSegments: jsonb("target_segments").$type<string[]>(),
  targetSpecialties: jsonb("target_specialties").$type<string[]>(),
  targetTiers: jsonb("target_tiers").$type<string[]>(),

  // Goals
  goalType: varchar("goal_type", { length: 50 }), // engagement, conversion, awareness, rx_lift
  goalValue: real("goal_value"),

  // Budget
  budget: real("budget"),
  spentToDate: real("spent_to_date").default(0),

  // Performance summary (updated periodically)
  totalReach: integer("total_reach").default(0),
  totalEngagements: integer("total_engagements").default(0),
  responseRate: real("response_rate"),

  // Status
  status: varchar("status", { length: 20 }).notNull().default("draft"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type CampaignDB = typeof campaigns.$inferSelect;

// ============================================================================
// CAMPAIGN PARTICIPATION - HCP enrollment tracking
// ============================================================================

export const campaignParticipation = pgTable("campaign_participation", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id),
  hcpId: varchar("hcp_id").notNull().references(() => hcpProfiles.id),

  // Enrollment details
  enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
  enrollmentSource: varchar("enrollment_source", { length: 50 }), // auto, manual, import

  // Participation status
  status: varchar("status", { length: 30 }).notNull().default("enrolled"), // enrolled, active, completed, opted_out
  optOutReason: text("opt_out_reason"),
  optOutAt: timestamp("opt_out_at"),

  // Engagement summary for this HCP in this campaign
  touchCount: integer("touch_count").default(0),
  responseCount: integer("response_count").default(0),
  lastTouchAt: timestamp("last_touch_at"),
  lastResponseAt: timestamp("last_response_at"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCampaignParticipationSchema = createInsertSchema(campaignParticipation).omit({
  id: true,
  createdAt: true,
});

export type InsertCampaignParticipation = z.infer<typeof insertCampaignParticipationSchema>;
export type CampaignParticipationDB = typeof campaignParticipation.$inferSelect;

// ============================================================================
// OUTCOME EVENTS - Response tracking with attribution
// ============================================================================

export const outcomeTypes = [
  "email_open",
  "email_click",
  "webinar_register",
  "webinar_attend",
  "content_download",
  "sample_request",
  "meeting_scheduled",
  "meeting_completed",
  "rx_written",
  "form_submit",
  "call_completed",
  "referral",
] as const;

export type OutcomeType = (typeof outcomeTypes)[number];

export const outcomeEvents = pgTable("outcome_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // HCP reference
  hcpId: varchar("hcp_id").notNull().references(() => hcpProfiles.id),

  // Attribution - link to triggering stimulus
  stimulusId: varchar("stimulus_id").references(() => stimuliEvents.id),
  campaignId: varchar("campaign_id").references(() => campaigns.id),

  // Outcome details
  outcomeType: varchar("outcome_type", { length: 50 }).notNull(),
  channel: varchar("channel", { length: 30 }).notNull(),

  // Value/Impact
  outcomeValue: real("outcome_value"), // Quantitative value if applicable
  qualityScore: integer("quality_score"), // 1-10 quality rating

  // Context
  contentId: varchar("content_id", { length: 100 }),
  contentName: varchar("content_name", { length: 200 }),

  // Attribution metadata
  attributionType: varchar("attribution_type", { length: 30 }).default("direct"), // direct, assisted, organic
  attributionWeight: real("attribution_weight").default(1.0),
  touchesInWindow: integer("touches_in_window"), // Number of touches before conversion
  daysSinceLastTouch: integer("days_since_last_touch"),

  eventDate: timestamp("event_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  hcpIdIdx: index("outcome_hcp_id_idx").on(table.hcpId),
  campaignIdIdx: index("outcome_campaign_id_idx").on(table.campaignId),
  outcomeTypeIdx: index("outcome_type_idx").on(table.outcomeType),
  eventDateIdx: index("outcome_event_date_idx").on(table.eventDate),
  hcpEventDateIdx: index("outcome_hcp_event_date_idx").on(table.hcpId, table.eventDate),
}));

export const insertOutcomeEventSchema = createInsertSchema(outcomeEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertOutcomeEvent = z.infer<typeof insertOutcomeEventSchema>;
export type OutcomeEventDB = typeof outcomeEvents.$inferSelect;

// ============================================================================
// CHANNEL CAPACITY - Daily/weekly limits
// ============================================================================

export const channelCapacity = pgTable("channel_capacity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Channel identification
  channel: varchar("channel", { length: 30 }).notNull(),
  repId: varchar("rep_id", { length: 100 }), // Null for org-wide limits
  territory: varchar("territory", { length: 100 }),

  // Capacity limits
  dailyLimit: integer("daily_limit"),
  weeklyLimit: integer("weekly_limit"),
  monthlyLimit: integer("monthly_limit"),

  // Current usage (reset periodically)
  dailyUsed: integer("daily_used").default(0),
  weeklyUsed: integer("weekly_used").default(0),
  monthlyUsed: integer("monthly_used").default(0),

  // Cost per touch (for budget allocation)
  costPerTouch: real("cost_per_touch"),

  // Priority settings
  priority: integer("priority").default(0), // Higher = preferred

  // Availability windows (JSONB for flexibility)
  availabilityWindows: jsonb("availability_windows").$type<{
    dayOfWeek: number[];
    startHour: number;
    endHour: number;
  }[]>(),

  // Status
  isActive: boolean("is_active").default(true),

  effectiveFrom: timestamp("effective_from").notNull().defaultNow(),
  effectiveTo: timestamp("effective_to"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertChannelCapacitySchema = createInsertSchema(channelCapacity).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertChannelCapacity = z.infer<typeof insertChannelCapacitySchema>;
export type ChannelCapacityDB = typeof channelCapacity.$inferSelect;

// ============================================================================
// HCP CONTACT LIMITS - Per-HCP contact constraints
// ============================================================================

export const hcpContactLimits = pgTable("hcp_contact_limits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  hcpId: varchar("hcp_id").notNull().references(() => hcpProfiles.id).unique(),

  // Global limits
  maxTouchesPerWeek: integer("max_touches_per_week").default(3),
  maxTouchesPerMonth: integer("max_touches_per_month").default(8),

  // Channel-specific limits (JSONB)
  channelLimits: jsonb("channel_limits").$type<Record<string, {
    maxPerWeek: number;
    maxPerMonth: number;
    minDaysBetween: number;
  }>>(),

  // Preferred contact windows
  preferredDays: jsonb("preferred_days").$type<number[]>(), // 0-6, Sunday-Saturday
  preferredHours: jsonb("preferred_hours").$type<{ start: number; end: number }>(),

  // Blackout periods
  blackoutDates: jsonb("blackout_dates").$type<string[]>(), // ISO date strings

  // Contact preferences
  preferredChannel: varchar("preferred_channel", { length: 30 }),
  doNotContact: boolean("do_not_contact").default(false),
  doNotContactReason: text("do_not_contact_reason"),

  // Current period usage
  touchesThisWeek: integer("touches_this_week").default(0),
  touchesThisMonth: integer("touches_this_month").default(0),
  lastResetAt: timestamp("last_reset_at"),

  // Last contact info
  lastContactAt: timestamp("last_contact_at"),
  lastContactChannel: varchar("last_contact_channel", { length: 30 }),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertHcpContactLimitsSchema = createInsertSchema(hcpContactLimits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertHcpContactLimits = z.infer<typeof insertHcpContactLimitsSchema>;
export type HcpContactLimitsDB = typeof hcpContactLimits.$inferSelect;

// ============================================================================
// PHASE 7-PREP API TYPES
// ============================================================================

// Prescribing History (API type)
export const prescribingHistorySchema = z.object({
  id: z.string(),
  hcpId: z.string(),
  month: z.string(),
  totalRx: z.number(),
  newRx: z.number(),
  refillRx: z.number(),
  marketShare: z.number().nullable(),
  competitorShare: z.number().nullable(),
  productBreakdown: z.record(z.number()).nullable(),
  momChange: z.number().nullable(),
  yoyChange: z.number().nullable(),
  createdAt: z.string(),
});

export type PrescribingHistory = z.infer<typeof prescribingHistorySchema>;

// Territory Assignment (API type)
export const territoryAssignmentSchema = z.object({
  id: z.string(),
  repId: z.string(),
  repName: z.string(),
  repEmail: z.string().nullable(),
  hcpId: z.string(),
  assignmentType: z.enum(["primary", "secondary", "backup"]),
  territory: z.string().nullable(),
  region: z.string().nullable(),
  district: z.string().nullable(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export type TerritoryAssignment = z.infer<typeof territoryAssignmentSchema>;

// Campaign (API type)
export const campaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  campaignCode: z.string().nullable(),
  campaignType: z.string(),
  therapeuticArea: z.string().nullable(),
  product: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  primaryChannel: z.string().nullable(),
  channelMix: z.record(z.number()).nullable(),
  targetSegments: z.array(z.string()).nullable(),
  targetSpecialties: z.array(z.string()).nullable(),
  targetTiers: z.array(z.string()).nullable(),
  goalType: z.string().nullable(),
  goalValue: z.number().nullable(),
  budget: z.number().nullable(),
  spentToDate: z.number().nullable(),
  totalReach: z.number().nullable(),
  totalEngagements: z.number().nullable(),
  responseRate: z.number().nullable(),
  status: z.enum(campaignStatuses),
  createdAt: z.string(),
});

export type Campaign = z.infer<typeof campaignSchema>;

// Outcome Event (API type)
export const outcomeEventSchema = z.object({
  id: z.string(),
  hcpId: z.string(),
  stimulusId: z.string().nullable(),
  campaignId: z.string().nullable(),
  outcomeType: z.enum(outcomeTypes),
  channel: z.string(),
  outcomeValue: z.number().nullable(),
  qualityScore: z.number().nullable(),
  contentId: z.string().nullable(),
  contentName: z.string().nullable(),
  attributionType: z.enum(["direct", "assisted", "organic"]),
  attributionWeight: z.number(),
  touchesInWindow: z.number().nullable(),
  daysSinceLastTouch: z.number().nullable(),
  eventDate: z.string(),
  createdAt: z.string(),
});

export type OutcomeEvent = z.infer<typeof outcomeEventSchema>;

// ============================================================================
// PHASE 7: ORCHESTRATION INTELLIGENCE SCHEMA ADDITIONS
// ============================================================================

// ============================================================================
// 7A: COMPLIANCE WINDOWS - Blackout/restricted periods
// ============================================================================

export const complianceWindowTypes = ["blackout", "restricted", "preferred"] as const;
export type ComplianceWindowType = (typeof complianceWindowTypes)[number];

export const complianceRecurrenceTypes = ["none", "yearly", "quarterly", "monthly"] as const;
export type ComplianceRecurrenceType = (typeof complianceRecurrenceTypes)[number];

export const complianceWindows = pgTable("compliance_windows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  channel: varchar("channel", { length: 20 }), // null = all channels
  windowType: varchar("window_type", { length: 30 }).notNull(), // "blackout", "restricted", "preferred"
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  recurrence: varchar("recurrence", { length: 50 }).default("none"), // "none", "yearly", "quarterly", "monthly"
  affectedHcpIds: jsonb("affected_hcp_ids").$type<string[] | null>(), // null = all HCPs
  affectedSpecialties: jsonb("affected_specialties").$type<string[] | null>(),
  affectedTerritories: jsonb("affected_territories").$type<string[] | null>(),
  reason: varchar("reason", { length: 100 }), // "conference", "holiday", "regulation"
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by", { length: 100 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertComplianceWindowSchema = createInsertSchema(complianceWindows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertComplianceWindow = z.infer<typeof insertComplianceWindowSchema>;
export type ComplianceWindowDB = typeof complianceWindows.$inferSelect;

// ============================================================================
// 7A: BUDGET ALLOCATIONS - Budget tracking per campaign/channel/period
// ============================================================================

export const budgetPeriodTypes = ["daily", "weekly", "monthly", "quarterly", "campaign"] as const;
export type BudgetPeriodType = (typeof budgetPeriodTypes)[number];

export const budgetAllocations = pgTable("budget_allocations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").references(() => campaigns.id),
  channel: varchar("channel", { length: 20 }),
  periodType: varchar("period_type", { length: 20 }).notNull(), // "daily", "weekly", "monthly", "campaign"
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  allocatedAmount: real("allocated_amount").notNull(),
  spentAmount: real("spent_amount").notNull().default(0),
  committedAmount: real("committed_amount").notNull().default(0), // planned but not executed
  costPerAction: jsonb("cost_per_action").$type<Record<string, number>>(), // action_type -> cost
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by", { length: 100 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBudgetAllocationSchema = createInsertSchema(budgetAllocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBudgetAllocation = z.infer<typeof insertBudgetAllocationSchema>;
export type BudgetAllocationDB = typeof budgetAllocations.$inferSelect;

// ============================================================================
// PHASE 7A: API TYPES
// ============================================================================

// Compliance Window (API type)
export const complianceWindowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  channel: z.string().nullable(),
  windowType: z.enum(complianceWindowTypes),
  startDate: z.string(),
  endDate: z.string(),
  recurrence: z.enum(complianceRecurrenceTypes),
  affectedHcpIds: z.array(z.string()).nullable(),
  affectedSpecialties: z.array(z.string()).nullable(),
  affectedTerritories: z.array(z.string()).nullable(),
  reason: z.string().nullable(),
  isActive: z.boolean(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
});

export type ComplianceWindow = z.infer<typeof complianceWindowSchema>;

// Budget Allocation (API type)
export const budgetAllocationSchema = z.object({
  id: z.string(),
  campaignId: z.string().nullable(),
  channel: z.string().nullable(),
  periodType: z.enum(budgetPeriodTypes),
  periodStart: z.string(),
  periodEnd: z.string(),
  allocatedAmount: z.number(),
  spentAmount: z.number(),
  committedAmount: z.number(),
  costPerAction: z.record(z.number()).nullable(),
  currency: z.string(),
  notes: z.string().nullable(),
  isActive: z.boolean(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
});

export type BudgetAllocation = z.infer<typeof budgetAllocationSchema>;

// ============================================================================
// PHASE 7A: CONSTRAINT CHECK TYPES
// ============================================================================

// Constraint check result
export const constraintCheckResultSchema = z.object({
  passed: z.boolean(),
  violations: z.array(z.object({
    constraintType: z.enum(["capacity", "contact_limit", "compliance", "budget", "territory"]),
    constraintId: z.string().optional(),
    reason: z.string(),
    severity: z.enum(["error", "warning"]),
    details: z.record(z.unknown()).optional(),
  })),
  warnings: z.array(z.string()),
  capacityStatus: z.object({
    available: z.number(),
    used: z.number(),
    limit: z.number(),
    utilizationPct: z.number(),
  }).optional(),
  budgetStatus: z.object({
    available: z.number(),
    spent: z.number(),
    committed: z.number(),
    allocated: z.number(),
    utilizationPct: z.number(),
  }).optional(),
});

export type ConstraintCheckResult = z.infer<typeof constraintCheckResultSchema>;

// Contact eligibility result
export const contactEligibilitySchema = z.object({
  eligible: z.boolean(),
  reason: z.string().optional(),
  nextEligibleDate: z.string().optional(),
  currentTouches: z.number(),
  maxTouches: z.number(),
  cooldownDaysRemaining: z.number().optional(),
});

export type ContactEligibility = z.infer<typeof contactEligibilitySchema>;

// Constraint summary for dashboard
export const constraintSummarySchema = z.object({
  capacity: z.array(z.object({
    channel: z.string(),
    dailyUsed: z.number(),
    dailyLimit: z.number(),
    weeklyUsed: z.number(),
    weeklyLimit: z.number(),
    monthlyUsed: z.number(),
    monthlyLimit: z.number(),
    utilizationPct: z.number(),
    status: z.enum(["healthy", "warning", "critical"]),
  })),
  budget: z.object({
    totalAllocated: z.number(),
    totalSpent: z.number(),
    totalCommitted: z.number(),
    utilizationPct: z.number(),
    byChannel: z.array(z.object({
      channel: z.string(),
      allocated: z.number(),
      spent: z.number(),
      remaining: z.number(),
    })),
  }),
  compliance: z.object({
    activeBlackouts: z.number(),
    upcomingBlackouts: z.number(),
    affectedHcpCount: z.number(),
    windows: z.array(z.object({
      id: z.string(),
      name: z.string(),
      windowType: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      affectedCount: z.number(),
    })),
  }),
  contactLimits: z.object({
    hcpsAtLimit: z.number(),
    hcpsNearLimit: z.number(),
    avgUtilization: z.number(),
  }),
});

export type ConstraintSummary = z.infer<typeof constraintSummarySchema>;

// Proposed action for constraint checking
export const proposedActionForConstraintSchema = z.object({
  hcpId: z.string(),
  channel: z.string(),
  actionType: z.string(),
  plannedDate: z.string().optional(),
  estimatedCost: z.number().optional(),
  campaignId: z.string().optional(),
  repId: z.string().optional(),
});

export type ProposedActionForConstraint = z.infer<typeof proposedActionForConstraintSchema>;

// ============================================================================
// PHASE 7B: OUTCOME STREAM & ATTRIBUTION SCHEMA ADDITIONS
// ============================================================================

// ============================================================================
// 7B: ATTRIBUTION CONFIG - Per-channel attribution settings
// ============================================================================

export const attributionModels = ["first_touch", "last_touch", "linear", "position_based", "time_decay"] as const;
export type AttributionModel = (typeof attributionModels)[number];

export const decayFunctions = ["none", "linear", "exponential"] as const;
export type DecayFunction = (typeof decayFunctions)[number];

export const attributionConfig = pgTable("attribution_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channel: varchar("channel", { length: 20 }).notNull().unique(),

  // Attribution window
  windowDays: integer("window_days").notNull().default(7), // Days to look back for attributable actions

  // Decay settings
  decayFunction: varchar("decay_function", { length: 30 }).notNull().default("none"), // "linear", "exponential", "none"
  decayHalfLifeDays: integer("decay_half_life_days"), // For exponential decay

  // Multi-touch attribution model
  multiTouchModel: varchar("multi_touch_model", { length: 30 }).notNull().default("last_touch"),

  // Position-based weights (for position_based model)
  firstTouchWeight: real("first_touch_weight").default(0.4),
  lastTouchWeight: real("last_touch_weight").default(0.4),
  middleTouchWeight: real("middle_touch_weight").default(0.2),

  // Minimum confidence threshold for attribution
  minConfidenceThreshold: real("min_confidence_threshold").default(0.3),

  // Whether to attribute partial credit
  allowPartialCredit: boolean("allow_partial_credit").notNull().default(true),

  // Description
  description: text("description"),

  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAttributionConfigSchema = createInsertSchema(attributionConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAttributionConfig = z.infer<typeof insertAttributionConfigSchema>;
export type AttributionConfigDB = typeof attributionConfig.$inferSelect;

// ============================================================================
// 7B: PREDICTION STALENESS - Tracking prediction freshness
// ============================================================================

export const predictionTypes = ["engagement", "conversion", "nba", "channel_response", "churn"] as const;
export type PredictionType = (typeof predictionTypes)[number];

export const predictionStaleness = pgTable("prediction_staleness", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hcpId: varchar("hcp_id").notNull().references(() => hcpProfiles.id),
  predictionType: varchar("prediction_type", { length: 50 }).notNull(),

  // Prediction info
  lastPredictedAt: timestamp("last_predicted_at").notNull(),
  lastPredictedValue: real("last_predicted_value"),
  predictionConfidence: real("prediction_confidence"),

  // Validation info
  lastValidatedAt: timestamp("last_validated_at"),
  lastActualValue: real("last_actual_value"),
  validationError: real("validation_error"), // Absolute difference between predicted and actual

  // Staleness metrics
  predictionAgeDays: integer("prediction_age_days"), // Days since prediction
  validationAgeDays: integer("validation_age_days"), // Days since last outcome
  outcomeCount: integer("outcome_count").default(0), // Total outcomes for validation

  // Staleness score (0-1, higher = more stale)
  stalenessScore: real("staleness_score").default(0),

  // Feature drift detection
  featureDriftDetected: boolean("feature_drift_detected").default(false),
  featureDriftScore: real("feature_drift_score"),
  driftedFeatures: jsonb("drifted_features").$type<string[]>(),

  // Recommendation
  recommendRefresh: boolean("recommend_refresh").default(false),
  refreshReason: varchar("refresh_reason", { length: 200 }),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPredictionStalenessSchema = createInsertSchema(predictionStaleness).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPredictionStaleness = z.infer<typeof insertPredictionStalenessSchema>;
export type PredictionStalenessDB = typeof predictionStaleness.$inferSelect;

// ============================================================================
// 7B: OUTCOME ATTRIBUTION RECORDS - Detailed attribution tracking
// ============================================================================

export const outcomeAttributions = pgTable("outcome_attributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Outcome reference
  outcomeEventId: varchar("outcome_event_id").notNull().references(() => outcomeEvents.id),

  // Attributed action
  stimulusId: varchar("stimulus_id").notNull().references(() => stimuliEvents.id),

  // Attribution details
  attributionModel: varchar("attribution_model", { length: 30 }).notNull(),
  contributionWeight: real("contribution_weight").notNull(), // 0-1

  // Timing
  daysBetweenTouchAndOutcome: integer("days_between_touch_and_outcome").notNull(),
  touchPosition: integer("touch_position"), // Position in the touch sequence (1 = first, -1 = last)
  totalTouchesInWindow: integer("total_touches_in_window"),

  // Decay applied
  decayFactor: real("decay_factor").default(1.0), // Factor applied due to time decay

  // Confidence
  attributionConfidence: real("attribution_confidence").notNull(),

  // Value attributed
  attributedValue: real("attributed_value"), // Portion of outcome value attributed to this touch

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOutcomeAttributionSchema = createInsertSchema(outcomeAttributions).omit({
  id: true,
  createdAt: true,
});

export type InsertOutcomeAttribution = z.infer<typeof insertOutcomeAttributionSchema>;
export type OutcomeAttributionDB = typeof outcomeAttributions.$inferSelect;

// ============================================================================
// PHASE 7B: API TYPES
// ============================================================================

// Attribution Config (API type)
export const attributionConfigApiSchema = z.object({
  id: z.string(),
  channel: z.string(),
  windowDays: z.number(),
  decayFunction: z.enum(decayFunctions),
  decayHalfLifeDays: z.number().nullable(),
  multiTouchModel: z.enum(attributionModels),
  firstTouchWeight: z.number().nullable(),
  lastTouchWeight: z.number().nullable(),
  middleTouchWeight: z.number().nullable(),
  minConfidenceThreshold: z.number().nullable(),
  allowPartialCredit: z.boolean(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export type AttributionConfigApi = z.infer<typeof attributionConfigApiSchema>;

// Prediction Staleness (API type)
export const predictionStalenessApiSchema = z.object({
  id: z.string(),
  hcpId: z.string(),
  predictionType: z.enum(predictionTypes),
  lastPredictedAt: z.string(),
  lastPredictedValue: z.number().nullable(),
  predictionConfidence: z.number().nullable(),
  lastValidatedAt: z.string().nullable(),
  lastActualValue: z.number().nullable(),
  validationError: z.number().nullable(),
  predictionAgeDays: z.number().nullable(),
  validationAgeDays: z.number().nullable(),
  outcomeCount: z.number(),
  stalenessScore: z.number(),
  featureDriftDetected: z.boolean(),
  featureDriftScore: z.number().nullable(),
  driftedFeatures: z.array(z.string()).nullable(),
  recommendRefresh: z.boolean(),
  refreshReason: z.string().nullable(),
  createdAt: z.string(),
});

export type PredictionStalenessApi = z.infer<typeof predictionStalenessApiSchema>;

// Outcome Attribution (API type)
export const outcomeAttributionApiSchema = z.object({
  id: z.string(),
  outcomeEventId: z.string(),
  stimulusId: z.string(),
  attributionModel: z.enum(attributionModels),
  contributionWeight: z.number(),
  daysBetweenTouchAndOutcome: z.number(),
  touchPosition: z.number().nullable(),
  totalTouchesInWindow: z.number().nullable(),
  decayFactor: z.number(),
  attributionConfidence: z.number(),
  attributedValue: z.number().nullable(),
  createdAt: z.string(),
});

export type OutcomeAttributionApi = z.infer<typeof outcomeAttributionApiSchema>;

// ============================================================================
// 7B: ATTRIBUTION ENGINE TYPES
// ============================================================================

// Attributable action (action that could have caused an outcome)
export const attributableActionSchema = z.object({
  stimulusId: z.string(),
  hcpId: z.string(),
  channel: z.string(),
  stimulusType: z.string(),
  eventDate: z.string(),
  daysSinceAction: z.number(),
  predictedEngagementDelta: z.number().nullable(),
  predictedConversionDelta: z.number().nullable(),
});

export type AttributableAction = z.infer<typeof attributableActionSchema>;

// Attribution result
export const attributionResultSchema = z.object({
  outcomeEventId: z.string(),
  primaryAttributedActionId: z.string().nullable(),
  primaryAttributionConfidence: z.number(),
  totalContributingActions: z.number(),
  attributions: z.array(z.object({
    stimulusId: z.string(),
    contributionWeight: z.number(),
    decayFactor: z.number(),
    confidence: z.number(),
    touchPosition: z.number(),
  })),
  attributionModel: z.enum(attributionModels),
  windowDays: z.number(),
});

export type AttributionResult = z.infer<typeof attributionResultSchema>;

// Staleness report
export const stalenessReportSchema = z.object({
  totalHcps: z.number(),
  hcpsNeedingRefresh: z.number(),
  avgStalenessScore: z.number(),
  stalenessByType: z.array(z.object({
    predictionType: z.string(),
    count: z.number(),
    avgStaleness: z.number(),
    refreshRecommended: z.number(),
  })),
  driftDetected: z.number(),
  recentlyValidated: z.number(),
});

export type StalenessReport = z.infer<typeof stalenessReportSchema>;

// Outcome velocity metrics
export const outcomeVelocitySchema = z.object({
  periodStart: z.string(),
  periodEnd: z.string(),
  totalOutcomes: z.number(),
  outcomesPerHour: z.number(),
  outcomesPerDay: z.number(),
  attributionRate: z.number(), // % of outcomes attributed
  avgLatencyHours: z.number(), // Time from action to outcome
  byChannel: z.array(z.object({
    channel: z.string(),
    outcomes: z.number(),
    attributionRate: z.number(),
    avgLatencyHours: z.number(),
  })),
  byOutcomeType: z.array(z.object({
    outcomeType: z.string(),
    count: z.number(),
    attributionRate: z.number(),
  })),
});

export type OutcomeVelocity = z.infer<typeof outcomeVelocitySchema>;

// ============================================================================
// 7B: API REQUEST TYPES
// ============================================================================

// Record outcome request
export const recordOutcomeWithAttributionRequestSchema = z.object({
  hcpId: z.string(),
  outcomeType: z.enum(outcomeTypes),
  channel: z.string(),
  outcomeValue: z.number().optional(),
  qualityScore: z.number().min(1).max(10).optional(),
  contentId: z.string().optional(),
  contentName: z.string().optional(),
  eventDate: z.string().optional(),
  campaignId: z.string().optional(),
  sourceSystem: z.string().optional(),
  sourceEventId: z.string().optional(),
  // If known, can provide explicit attribution
  stimulusId: z.string().optional(),
});

export type RecordOutcomeWithAttributionRequest = z.infer<typeof recordOutcomeWithAttributionRequestSchema>;

// Batch outcome ingestion request
export const batchOutcomeIngestionRequestSchema = z.object({
  outcomes: z.array(recordOutcomeWithAttributionRequestSchema),
  processImmediately: z.boolean().optional(),
  sourceSystem: z.string(),
});

export type BatchOutcomeIngestionRequest = z.infer<typeof batchOutcomeIngestionRequestSchema>;

// Webhook outcome payload (for external systems)
export const webhookOutcomePayloadSchema = z.object({
  sourceSystem: z.enum(["veeva", "salesforce", "email_platform", "custom"]),
  sourceEventId: z.string(),
  eventType: z.string(),
  timestamp: z.string(),
  // HCP identification (one required)
  hcpId: z.string().optional(),
  npi: z.string().optional(),
  email: z.string().optional(),
  // Event data
  data: z.record(z.unknown()),
});

export type WebhookOutcomePayload = z.infer<typeof webhookOutcomePayloadSchema>;

// Attribution config update request
export const updateAttributionConfigRequestSchema = z.object({
  channel: z.string(),
  windowDays: z.number().optional(),
  decayFunction: z.enum(decayFunctions).optional(),
  decayHalfLifeDays: z.number().optional(),
  multiTouchModel: z.enum(attributionModels).optional(),
  firstTouchWeight: z.number().optional(),
  lastTouchWeight: z.number().optional(),
  middleTouchWeight: z.number().optional(),
  minConfidenceThreshold: z.number().optional(),
  allowPartialCredit: z.boolean().optional(),
  description: z.string().optional(),
});

export type UpdateAttributionConfigRequest = z.infer<typeof updateAttributionConfigRequestSchema>;

// ============================================================================
// PHASE 7C: UNCERTAINTY QUANTIFICATION SCHEMA
// ============================================================================

// ============================================================================
// 7C: UNCERTAINTY METRICS - Full uncertainty decomposition per HCP/channel
// ============================================================================

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
  recommendExploration: boolean("recommend_exploration").default(false),

  calculatedAt: timestamp("calculated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUncertaintyMetricsSchema = createInsertSchema(uncertaintyMetrics).omit({
  id: true,
  calculatedAt: true,
  createdAt: true,
});

export type InsertUncertaintyMetrics = z.infer<typeof insertUncertaintyMetricsSchema>;
export type UncertaintyMetricsDB = typeof uncertaintyMetrics.$inferSelect;

// ============================================================================
// 7C: EXPLORATION HISTORY - Tracking exploration outcomes
// ============================================================================

export const explorationModes = ["epsilon_greedy", "ucb", "thompson_sampling"] as const;
export type ExplorationMode = (typeof explorationModes)[number];

export const explorationHistory = pgTable("exploration_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hcpId: varchar("hcp_id").notNull().references(() => hcpProfiles.id),
  channel: varchar("channel", { length: 20 }).notNull(),
  stimulusId: varchar("stimulus_id").references(() => stimuliEvents.id),

  // Exploration decision
  wasExploration: boolean("was_exploration").notNull(),
  explorationMode: varchar("exploration_mode", { length: 30 }),
  explorationScore: real("exploration_score"), // UCB score or Thompson sample

  // Pre-exploration state
  priorUncertainty: real("prior_uncertainty"),
  priorPredictedValue: real("prior_predicted_value"),

  // Post-exploration outcome
  outcomeId: varchar("outcome_id").references(() => outcomeEvents.id),
  actualValue: real("actual_value"),
  predictionError: real("prediction_error"),

  // Learning value
  informationGain: real("information_gain"), // Reduction in uncertainty
  posteriorUncertainty: real("posterior_uncertainty"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertExplorationHistorySchema = createInsertSchema(explorationHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertExplorationHistory = z.infer<typeof insertExplorationHistorySchema>;
export type ExplorationHistoryDB = typeof explorationHistory.$inferSelect;

// ============================================================================
// 7C: EXPLORATION CONFIG - Global and channel-specific exploration settings
// ============================================================================

export const explorationConfig = pgTable("exploration_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channel: varchar("channel", { length: 20 }), // null = global default

  // Exploration mode
  explorationMode: varchar("exploration_mode", { length: 30 }).notNull().default("epsilon_greedy"),

  // Epsilon-greedy settings
  epsilon: real("epsilon").default(0.1), // Probability of exploring
  epsilonDecay: real("epsilon_decay").default(0.995), // Decay rate per episode
  minEpsilon: real("min_epsilon").default(0.01), // Minimum epsilon

  // UCB settings
  ucbC: real("ucb_c").default(1.41), // Exploration parameter (sqrt(2) is common)

  // Thompson Sampling settings
  priorAlpha: real("prior_alpha").default(1.0), // Beta distribution alpha
  priorBeta: real("prior_beta").default(1.0), // Beta distribution beta

  // Budget allocation
  explorationBudgetPct: real("exploration_budget_pct").default(10), // % of budget for exploration

  // Thresholds
  uncertaintyThreshold: real("uncertainty_threshold").default(0.7), // Above this, recommend exploration
  minSampleSize: integer("min_sample_size").default(5), // Min samples before exploitation

  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertExplorationConfigSchema = createInsertSchema(explorationConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertExplorationConfig = z.infer<typeof insertExplorationConfigSchema>;
export type ExplorationConfigDB = typeof explorationConfig.$inferSelect;

// ============================================================================
// PHASE 7C: API TYPES
// ============================================================================

// Uncertainty Metrics API type
export const uncertaintyMetricsApiSchema = z.object({
  id: z.string(),
  hcpId: z.string(),
  channel: z.string().nullable(),
  predictionType: z.string(),
  predictedValue: z.number(),
  ciLower: z.number(),
  ciUpper: z.number(),
  ciWidth: z.number(),
  epistemicUncertainty: z.number(),
  aleatoricUncertainty: z.number(),
  totalUncertainty: z.number(),
  sampleSize: z.number(),
  dataRecency: z.number().nullable(),
  featureCompleteness: z.number().nullable(),
  predictionAge: z.number(),
  lastValidationAge: z.number().nullable(),
  featureDriftScore: z.number().nullable(),
  driftFeatures: z.array(z.string()).nullable(),
  explorationValue: z.number().nullable(),
  recommendExploration: z.boolean(),
  calculatedAt: z.string(),
});

export type UncertaintyMetricsApi = z.infer<typeof uncertaintyMetricsApiSchema>;

// Data Quality Report
export const dataQualityReportSchema = z.object({
  hcpId: z.string(),
  overallScore: z.number(), // 0-1
  profileCompleteness: z.number(), // 0-1
  engagementHistory: z.number(), // Number of historical engagements
  outcomeHistory: z.number(), // Number of historical outcomes
  lastEngagementDays: z.number().nullable(), // Days since last engagement
  lastOutcomeDays: z.number().nullable(), // Days since last outcome
  channelCoverage: z.record(z.boolean()), // Which channels have data
  missingFields: z.array(z.string()),
});

export type DataQualityReport = z.infer<typeof dataQualityReportSchema>;

// Drift Report
export const driftReportSchema = z.object({
  hcpId: z.string(),
  overallDriftScore: z.number(), // 0-1
  significantDrift: z.boolean(),
  driftedFeatures: z.array(z.object({
    feature: z.string(),
    previousValue: z.unknown(),
    currentValue: z.unknown(),
    driftMagnitude: z.number(),
  })),
  recommendRecompute: z.boolean(),
  lastCheckedAt: z.string(),
});

export type DriftReport = z.infer<typeof driftReportSchema>;

// Exploration Decision
export const explorationDecisionSchema = z.object({
  hcpId: z.string(),
  channel: z.string(),
  shouldExplore: z.boolean(),
  explorationMode: z.enum(explorationModes),
  explorationScore: z.number(), // UCB score, Thompson sample, or random
  exploitationScore: z.number(), // Expected value if exploiting
  reason: z.string(),
  suggestedAction: z.object({
    actionType: z.string(),
    expectedInformationGain: z.number(),
    estimatedCost: z.number().nullable(),
  }).nullable(),
});

export type ExplorationDecision = z.infer<typeof explorationDecisionSchema>;

// Exploration Action
export const explorationActionSchema = z.object({
  hcpId: z.string(),
  channel: z.string(),
  actionType: z.string(),
  reason: z.string(),
  expectedInformationGain: z.number(),
  currentUncertainty: z.number(),
  estimatedCost: z.number().nullable(),
});

export type ExplorationAction = z.infer<typeof explorationActionSchema>;

// ============================================================================
// 7C: REQUEST TYPES
// ============================================================================

// Calculate uncertainty request
export const calculateUncertaintyRequestSchema = z.object({
  hcpId: z.string(),
  channel: z.string().optional(),
  predictionType: z.string().optional(),
  forceRecalculate: z.boolean().optional(),
});

export type CalculateUncertaintyRequest = z.infer<typeof calculateUncertaintyRequestSchema>;

// Batch uncertainty request
export const batchUncertaintyRequestSchema = z.object({
  hcpIds: z.array(z.string()),
  channel: z.string().optional(),
  predictionType: z.string().optional(),
});

export type BatchUncertaintyRequest = z.infer<typeof batchUncertaintyRequestSchema>;

// Exploration decision request
export const explorationDecisionRequestSchema = z.object({
  hcpId: z.string(),
  channel: z.string(),
  campaignId: z.string().optional(),
});

export type ExplorationDecisionRequest = z.infer<typeof explorationDecisionRequestSchema>;

// Update exploration config request
export const updateExplorationConfigRequestSchema = z.object({
  channel: z.string().nullable(),
  explorationMode: z.enum(explorationModes).optional(),
  epsilon: z.number().optional(),
  epsilonDecay: z.number().optional(),
  minEpsilon: z.number().optional(),
  ucbC: z.number().optional(),
  priorAlpha: z.number().optional(),
  priorBeta: z.number().optional(),
  explorationBudgetPct: z.number().optional(),
  uncertaintyThreshold: z.number().optional(),
  minSampleSize: z.number().optional(),
});

export type UpdateExplorationConfigRequest = z.infer<typeof updateExplorationConfigRequestSchema>;

// ============================================================================
// 7C: RESPONSE TYPES
// ============================================================================

// Uncertainty summary for dashboard
export const uncertaintySummarySchema = z.object({
  totalHcps: z.number(),
  avgEpistemicUncertainty: z.number(),
  avgAleatoricUncertainty: z.number(),
  avgTotalUncertainty: z.number(),
  highUncertaintyCount: z.number(), // HCPs with uncertainty > threshold
  recommendExplorationCount: z.number(),
  byChannel: z.array(z.object({
    channel: z.string(),
    avgUncertainty: z.number(),
    hcpCount: z.number(),
    explorationRecommended: z.number(),
  })),
  byPredictionType: z.array(z.object({
    predictionType: z.string(),
    avgUncertainty: z.number(),
    hcpCount: z.number(),
  })),
  recentDriftDetected: z.number(),
});

export type UncertaintySummary = z.infer<typeof uncertaintySummarySchema>;

// Exploration statistics
export const explorationStatisticsSchema = z.object({
  totalExplorations: z.number(),
  successfulExplorations: z.number(), // Resulted in outcome
  avgInformationGain: z.number(),
  avgPredictionError: z.number(),
  explorationByChannel: z.array(z.object({
    channel: z.string(),
    count: z.number(),
    avgInformationGain: z.number(),
  })),
  explorationByMode: z.array(z.object({
    mode: z.string(),
    count: z.number(),
    avgInformationGain: z.number(),
  })),
  currentEpsilon: z.number(),
  budgetUtilization: z.number(),
});

export type ExplorationStatistics = z.infer<typeof explorationStatisticsSchema>;

// ============================================================================
// PHASE 7D: CAMPAIGN COORDINATION
// ============================================================================

// Reservation types
export const reservationTypes = ["exclusive", "priority", "soft"] as const;
export type ReservationType = (typeof reservationTypes)[number];

// Reservation statuses
export const reservationStatuses = ["active", "released", "executed", "expired", "preempted"] as const;
export type ReservationStatus = (typeof reservationStatuses)[number];

// Conflict types
export const conflictTypes = ["overlap", "frequency", "preemption", "budget", "capacity"] as const;
export type ConflictType = (typeof conflictTypes)[number];

// Conflict resolutions
export const conflictResolutions = ["campaign1_wins", "campaign2_wins", "merged", "deferred", "cancelled"] as const;
export type ConflictResolution = (typeof conflictResolutions)[number];

// HCP Reservations table
export const hcpReservations = pgTable("hcp_reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id),
  hcpId: varchar("hcp_id").notNull().references(() => hcpProfiles.id),
  channel: varchar("channel", { length: 20 }).notNull(),
  reservationType: varchar("reservation_type", { length: 30 }).notNull().$type<ReservationType>(),
  priority: integer("priority").notNull(), // Inherited from campaign
  reservedFrom: timestamp("reserved_from").notNull(),
  reservedUntil: timestamp("reserved_until").notNull(),
  plannedActionDate: timestamp("planned_action_date"),
  status: varchar("status", { length: 20 }).notNull().default("active").$type<ReservationStatus>(),
  canPreempt: boolean("can_preempt").notNull().default(true), // Can higher priority campaign take over?
  preemptedBy: varchar("preempted_by"),
  executedAt: timestamp("executed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertHcpReservationSchema = createInsertSchema(hcpReservations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  preemptedBy: true,
  executedAt: true,
});

export const updateHcpReservationSchema = insertHcpReservationSchema.partial();

export type InsertHcpReservation = z.infer<typeof insertHcpReservationSchema>;
export type HcpReservation = typeof hcpReservations.$inferSelect;

// Conflict Log table
export const conflictLog = pgTable("conflict_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hcpId: varchar("hcp_id").notNull().references(() => hcpProfiles.id),
  channel: varchar("channel", { length: 20 }).notNull(),
  conflictType: varchar("conflict_type", { length: 30 }).notNull().$type<ConflictType>(),
  campaign1Id: varchar("campaign1_id").notNull().references(() => campaigns.id),
  campaign2Id: varchar("campaign2_id").references(() => campaigns.id),
  reservation1Id: varchar("reservation1_id").references(() => hcpReservations.id),
  reservation2Id: varchar("reservation2_id").references(() => hcpReservations.id),
  conflictDate: timestamp("conflict_date").notNull(),
  severity: varchar("severity", { length: 20 }).notNull().default("medium"), // low, medium, high, critical
  description: text("description"),
  resolution: varchar("resolution", { length: 30 }).$type<ConflictResolution>(),
  resolutionNotes: text("resolution_notes"),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by", { length: 100 }),
  autoResolved: boolean("auto_resolved").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertConflictLogSchema = createInsertSchema(conflictLog).omit({
  id: true,
  createdAt: true,
  resolution: true,
  resolutionNotes: true,
  resolvedAt: true,
  resolvedBy: true,
  autoResolved: true,
});

export type InsertConflictLog = z.infer<typeof insertConflictLogSchema>;
export type ConflictLog = typeof conflictLog.$inferSelect;

// ============================================================================
// 7D: API TYPES
// ============================================================================

// Campaign with metadata
export const campaignApiSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  brand: z.string().nullable(),
  businessUnit: z.string().nullable(),
  priority: z.number(),
  status: z.enum(campaignStatuses),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  targetAudienceId: z.string().nullable(),
  channelMix: z.record(z.number()).nullable(),
  budget: z.number().nullable(),
  budgetSpent: z.number().nullable(),
  targetHcpCount: z.number().nullable(),
  actualHcpCount: z.number().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  // Computed fields
  reservationCount: z.number().optional(),
  activeReservationCount: z.number().optional(),
  conflictCount: z.number().optional(),
});

export type CampaignApi = z.infer<typeof campaignApiSchema>;

// Reservation with campaign info
export const reservationApiSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  campaignName: z.string().optional(),
  campaignPriority: z.number().optional(),
  hcpId: z.string(),
  hcpName: z.string().optional(),
  channel: z.string(),
  reservationType: z.enum(reservationTypes),
  priority: z.number(),
  reservedFrom: z.string(),
  reservedUntil: z.string(),
  plannedActionDate: z.string().nullable(),
  status: z.enum(reservationStatuses),
  canPreempt: z.boolean(),
  preemptedBy: z.string().nullable(),
  executedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ReservationApi = z.infer<typeof reservationApiSchema>;

// Conflict with full context
export const conflictApiSchema = z.object({
  id: z.string(),
  hcpId: z.string(),
  hcpName: z.string().optional(),
  channel: z.string(),
  conflictType: z.enum(conflictTypes),
  campaign1Id: z.string(),
  campaign1Name: z.string().optional(),
  campaign2Id: z.string().nullable(),
  campaign2Name: z.string().nullable().optional(),
  reservation1Id: z.string().nullable(),
  reservation2Id: z.string().nullable(),
  conflictDate: z.string(),
  severity: z.string(),
  description: z.string().nullable(),
  resolution: z.enum(conflictResolutions).nullable(),
  resolutionNotes: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  resolvedBy: z.string().nullable(),
  autoResolved: z.boolean().nullable(),
  createdAt: z.string(),
});

export type ConflictApi = z.infer<typeof conflictApiSchema>;

// Time slot for availability
export const timeSlotSchema = z.object({
  start: z.string(),
  end: z.string(),
  available: z.boolean(),
  reservedBy: z.string().nullable(), // Campaign ID if reserved
  reservationType: z.enum(reservationTypes).nullable(),
});

export type TimeSlot = z.infer<typeof timeSlotSchema>;

// ============================================================================
// 7D: REQUEST TYPES
// ============================================================================

// Create campaign request
export const createCampaignRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  brand: z.string().optional(),
  businessUnit: z.string().optional(),
  priority: z.number().min(1).max(100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  targetAudienceId: z.string().optional(),
  channelMix: z.record(z.number()).optional(),
  budget: z.number().optional(),
  targetHcpCount: z.number().optional(),
});

export type CreateCampaignRequest = z.infer<typeof createCampaignRequestSchema>;

// Reserve HCP request
export const reserveHcpRequestSchema = z.object({
  campaignId: z.string(),
  hcpId: z.string(),
  channel: z.string(),
  reservationType: z.enum(reservationTypes).optional(),
  reservedFrom: z.string(),
  reservedUntil: z.string(),
  plannedActionDate: z.string().optional(),
  canPreempt: z.boolean().optional(),
});

export type ReserveHcpRequest = z.infer<typeof reserveHcpRequestSchema>;

// Batch reserve request
export const batchReserveRequestSchema = z.object({
  campaignId: z.string(),
  reservations: z.array(z.object({
    hcpId: z.string(),
    channel: z.string(),
    reservationType: z.enum(reservationTypes).optional(),
    reservedFrom: z.string(),
    reservedUntil: z.string(),
    plannedActionDate: z.string().optional(),
  })),
});

export type BatchReserveRequest = z.infer<typeof batchReserveRequestSchema>;

// Check availability request
export const checkAvailabilityRequestSchema = z.object({
  hcpId: z.string(),
  channel: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  excludeCampaignId: z.string().optional(),
});

export type CheckAvailabilityRequest = z.infer<typeof checkAvailabilityRequestSchema>;

// Resolve conflict request
export const resolveConflictRequestSchema = z.object({
  conflictId: z.string(),
  resolution: z.enum(conflictResolutions),
  resolutionNotes: z.string().optional(),
});

export type ResolveConflictRequest = z.infer<typeof resolveConflictRequestSchema>;

// Auto-resolve conflicts request
export const autoResolveConflictsRequestSchema = z.object({
  campaignId: z.string().optional(),
  strategy: z.enum(["priority", "first_come", "budget_efficiency"]).optional(),
});

export type AutoResolveConflictsRequest = z.infer<typeof autoResolveConflictsRequestSchema>;

// ============================================================================
// 7D: RESPONSE TYPES
// ============================================================================

// Campaign summary for dashboard
export const campaignSummarySchema = z.object({
  totalCampaigns: z.number(),
  activeCampaigns: z.number(),
  draftCampaigns: z.number(),
  pausedCampaigns: z.number(),
  completedCampaigns: z.number(),
  totalBudget: z.number(),
  totalSpent: z.number(),
  totalReservations: z.number(),
  activeReservations: z.number(),
  pendingConflicts: z.number(),
  resolvedConflicts: z.number(),
  byBrand: z.array(z.object({
    brand: z.string(),
    campaignCount: z.number(),
    totalBudget: z.number(),
    reservationCount: z.number(),
  })),
  byStatus: z.array(z.object({
    status: z.string(),
    count: z.number(),
  })),
});

export type CampaignSummary = z.infer<typeof campaignSummarySchema>;

// Reservation result (includes conflict detection)
export const reservationResultSchema = z.object({
  success: z.boolean(),
  reservation: reservationApiSchema.nullable(),
  conflicts: z.array(conflictApiSchema).optional(),
  message: z.string().optional(),
});

export type ReservationResult = z.infer<typeof reservationResultSchema>;

// Batch reservation result
export const batchReservationResultSchema = z.object({
  totalRequested: z.number(),
  successCount: z.number(),
  failedCount: z.number(),
  conflictCount: z.number(),
  reservations: z.array(reservationApiSchema),
  conflicts: z.array(conflictApiSchema),
  errors: z.array(z.object({
    hcpId: z.string(),
    channel: z.string(),
    error: z.string(),
  })),
});

export type BatchReservationResult = z.infer<typeof batchReservationResultSchema>;

// Availability result
export const availabilityResultSchema = z.object({
  hcpId: z.string(),
  channel: z.string(),
  available: z.boolean(),
  slots: z.array(timeSlotSchema),
  existingReservations: z.array(z.object({
    campaignId: z.string(),
    campaignName: z.string(),
    reservedFrom: z.string(),
    reservedUntil: z.string(),
    canPreempt: z.boolean(),
    priority: z.number(),
  })),
});

export type AvailabilityResult = z.infer<typeof availabilityResultSchema>;

// Resolution report
export const resolutionReportSchema = z.object({
  totalConflicts: z.number(),
  resolved: z.number(),
  unresolved: z.number(),
  byResolution: z.array(z.object({
    resolution: z.string(),
    count: z.number(),
  })),
  actions: z.array(z.object({
    conflictId: z.string(),
    resolution: z.string(),
    affectedReservations: z.array(z.string()),
  })),
});

export type ResolutionReport = z.infer<typeof resolutionReportSchema>;

// HCP campaign view (what campaigns target this HCP)
export const hcpCampaignViewSchema = z.object({
  hcpId: z.string(),
  campaigns: z.array(z.object({
    campaignId: z.string(),
    campaignName: z.string(),
    priority: z.number(),
    status: z.string(),
    channels: z.array(z.string()),
    reservations: z.array(z.object({
      id: z.string(),
      channel: z.string(),
      reservedFrom: z.string(),
      reservedUntil: z.string(),
      status: z.string(),
    })),
  })),
  totalReservations: z.number(),
  activeReservations: z.number(),
  upcomingActions: z.number(),
});

export type HcpCampaignView = z.infer<typeof hcpCampaignViewSchema>;

// ============================================================================
// PHASE 7E: SIMULATION COMPOSABILITY
// ============================================================================

// Batch statuses
export const batchStatuses = ["pending", "running", "completed", "failed", "cancelled"] as const;
export type BatchStatus = (typeof batchStatuses)[number];

// Variant statuses
export const variantStatuses = ["pending", "running", "completed", "failed", "skipped"] as const;
export type VariantStatus = (typeof variantStatuses)[number];

// Variant strategies
export const variantStrategies = ["grid_search", "random_search", "bayesian", "manual"] as const;
export type VariantStrategy = (typeof variantStrategies)[number];

// Optimization metrics
export const optimizationMetrics = ["engagement_rate", "response_rate", "roi", "reach", "conversion", "total_lift"] as const;
export type OptimizationMetric = (typeof optimizationMetrics)[number];

// Simulation Batches table
export const simulationBatches = pgTable("simulation_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  baseScenarioId: varchar("base_scenario_id").references(() => simulationScenarios.id),
  variantStrategy: varchar("variant_strategy", { length: 30 }).notNull().default("grid_search").$type<VariantStrategy>(),
  variantCount: integer("variant_count").notNull(),
  completedCount: integer("completed_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("pending").$type<BatchStatus>(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  bestVariantId: varchar("best_variant_id"),
  optimizationMetric: varchar("optimization_metric", { length: 50 }).$type<OptimizationMetric>(),
  parameterRanges: jsonb("parameter_ranges").$type<Record<string, { min: number; max: number; step?: number }>>(),
  concurrency: integer("concurrency").notNull().default(5),
  createdBy: varchar("created_by", { length: 100 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSimulationBatchSchema = createInsertSchema(simulationBatches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedCount: true,
  failedCount: true,
  startedAt: true,
  completedAt: true,
  bestVariantId: true,
});

export const updateSimulationBatchSchema = insertSimulationBatchSchema.partial();

export type InsertSimulationBatch = z.infer<typeof insertSimulationBatchSchema>;
export type SimulationBatch = typeof simulationBatches.$inferSelect;

// Simulation Variants table
export const simulationVariants = pgTable("simulation_variants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batchId: varchar("batch_id").notNull().references(() => simulationBatches.id),
  variantNumber: integer("variant_number").notNull(),
  parameters: jsonb("parameters").notNull().$type<Record<string, unknown>>(),
  deltaFromBase: jsonb("delta_from_base").$type<Record<string, unknown>>(),
  scenarioId: varchar("scenario_id").references(() => simulationScenarios.id),
  resultId: varchar("result_id").references(() => simulationResults.id),
  score: real("score"),
  rank: integer("rank"),
  status: varchar("status", { length: 20 }).notNull().default("pending").$type<VariantStatus>(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  executionTimeMs: integer("execution_time_ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSimulationVariantSchema = createInsertSchema(simulationVariants).omit({
  id: true,
  createdAt: true,
  resultId: true,
  score: true,
  rank: true,
  startedAt: true,
  completedAt: true,
  errorMessage: true,
  executionTimeMs: true,
});

export type InsertSimulationVariant = z.infer<typeof insertSimulationVariantSchema>;
export type SimulationVariant = typeof simulationVariants.$inferSelect;

// ============================================================================
// 7E: API TYPES
// ============================================================================

// Batch with computed fields
export const simulationBatchApiSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  baseScenarioId: z.string().nullable(),
  baseScenarioName: z.string().nullable().optional(),
  variantStrategy: z.enum(variantStrategies),
  variantCount: z.number(),
  completedCount: z.number(),
  failedCount: z.number(),
  status: z.enum(batchStatuses),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  bestVariantId: z.string().nullable(),
  optimizationMetric: z.enum(optimizationMetrics).nullable(),
  parameterRanges: z.record(z.object({
    min: z.number(),
    max: z.number(),
    step: z.number().optional(),
  })).nullable(),
  concurrency: z.number(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  progress: z.number().optional(), // 0-100 percentage
  estimatedTimeRemainingMs: z.number().optional(),
});

export type SimulationBatchApi = z.infer<typeof simulationBatchApiSchema>;

// Variant with computed fields
export const simulationVariantApiSchema = z.object({
  id: z.string(),
  batchId: z.string(),
  variantNumber: z.number(),
  parameters: z.record(z.unknown()),
  deltaFromBase: z.record(z.unknown()).nullable(),
  scenarioId: z.string().nullable(),
  resultId: z.string().nullable(),
  score: z.number().nullable(),
  rank: z.number().nullable(),
  status: z.enum(variantStatuses),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  errorMessage: z.string().nullable(),
  executionTimeMs: z.number().nullable(),
  createdAt: z.string(),
  // Computed from result
  engagementRate: z.number().optional(),
  responseRate: z.number().optional(),
  totalLift: z.number().optional(),
});

export type SimulationVariantApi = z.infer<typeof simulationVariantApiSchema>;

// Differential result between two scenarios
export const differentialResultSchema = z.object({
  scenarioAId: z.string(),
  scenarioBId: z.string(),
  scenarioAName: z.string().optional(),
  scenarioBName: z.string().optional(),
  metrics: z.object({
    engagementRateDelta: z.number(),
    responseRateDelta: z.number(),
    totalLiftDelta: z.number(),
    reachDelta: z.number(),
  }),
  hcpDeltas: z.array(z.object({
    hcpId: z.string(),
    engagementDelta: z.number(),
    responseDelta: z.number(),
    liftDelta: z.number(),
  })),
  channelDeltas: z.record(z.object({
    countDelta: z.number(),
    engagementDelta: z.number(),
  })),
  computedAt: z.string(),
});

export type DifferentialResult = z.infer<typeof differentialResultSchema>;

// ============================================================================
// 7E: REQUEST TYPES
// ============================================================================

// Create batch request
export const createBatchRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  baseScenarioId: z.string(),
  variantStrategy: z.enum(variantStrategies).optional(),
  optimizationMetric: z.enum(optimizationMetrics).optional(),
  parameterRanges: z.record(z.object({
    min: z.number(),
    max: z.number(),
    step: z.number().optional(),
  })).optional(),
  variantCount: z.number().min(1).max(1000).optional(),
  concurrency: z.number().min(1).max(20).optional(),
});

export type CreateBatchRequest = z.infer<typeof createBatchRequestSchema>;

// Run batch request
export const runBatchRequestSchema = z.object({
  batchId: z.string(),
  concurrency: z.number().min(1).max(20).optional(),
});

export type RunBatchRequest = z.infer<typeof runBatchRequestSchema>;

// Generate variants request
export const generateVariantsRequestSchema = z.object({
  baseScenarioId: z.string(),
  strategy: z.enum(variantStrategies),
  parameterRanges: z.record(z.object({
    min: z.number(),
    max: z.number(),
    step: z.number().optional(),
  })),
  maxVariants: z.number().min(1).max(1000).optional(),
});

export type GenerateVariantsRequest = z.infer<typeof generateVariantsRequestSchema>;

// Incremental simulation request
export const incrementalSimulationRequestSchema = z.object({
  baseResultId: z.string(),
  addHcpIds: z.array(z.string()).optional(),
  removeHcpIds: z.array(z.string()).optional(),
});

export type IncrementalSimulationRequest = z.infer<typeof incrementalSimulationRequestSchema>;

// Compare scenarios request
export const compareScenarioRequestSchema = z.object({
  scenarioAId: z.string(),
  scenarioBId: z.string(),
});

export type CompareScenarioRequest = z.infer<typeof compareScenarioRequestSchema>;

// ============================================================================
// 7E: RESPONSE TYPES
// ============================================================================

// Batch progress
export const batchProgressSchema = z.object({
  batchId: z.string(),
  status: z.enum(batchStatuses),
  totalVariants: z.number(),
  completedVariants: z.number(),
  failedVariants: z.number(),
  runningVariants: z.number(),
  pendingVariants: z.number(),
  progressPercent: z.number(),
  startedAt: z.string().nullable(),
  estimatedCompletionAt: z.string().nullable(),
  avgExecutionTimeMs: z.number().nullable(),
  currentBestScore: z.number().nullable(),
  currentBestVariantId: z.string().nullable(),
});

export type BatchProgress = z.infer<typeof batchProgressSchema>;

// Batch result summary
export const batchResultSummarySchema = z.object({
  batchId: z.string(),
  name: z.string(),
  status: z.enum(batchStatuses),
  optimizationMetric: z.string().nullable(),
  totalVariants: z.number(),
  completedVariants: z.number(),
  bestVariant: simulationVariantApiSchema.nullable(),
  worstVariant: simulationVariantApiSchema.nullable(),
  scoreDistribution: z.object({
    min: z.number(),
    max: z.number(),
    mean: z.number(),
    median: z.number(),
    stdDev: z.number(),
  }).nullable(),
  topVariants: z.array(simulationVariantApiSchema),
  totalExecutionTimeMs: z.number(),
  completedAt: z.string().nullable(),
});

export type BatchResultSummary = z.infer<typeof batchResultSummarySchema>;

// Variant specs for generation
export const variantSpecSchema = z.object({
  variantNumber: z.number(),
  parameters: z.record(z.unknown()),
  deltaFromBase: z.record(z.unknown()),
});

export type VariantSpec = z.infer<typeof variantSpecSchema>;

// Generated variants result
export const generatedVariantsResultSchema = z.object({
  strategy: z.enum(variantStrategies),
  baseScenarioId: z.string(),
  variants: z.array(variantSpecSchema),
  parameterSpace: z.object({
    dimensions: z.number(),
    totalPossibleCombinations: z.number(),
    sampledCombinations: z.number(),
  }),
});

export type GeneratedVariantsResult = z.infer<typeof generatedVariantsResultSchema>;

// ============================================================================
// PHASE 7F: PORTFOLIO OPTIMIZER (CAPSTONE)
// ============================================================================

// Problem statuses
export const optimizationStatuses = ["draft", "ready", "solving", "solved", "failed", "archived"] as const;
export type OptimizationStatus = (typeof optimizationStatuses)[number];

// Objective metrics
export const objectiveMetrics = ["total_engagement_lift", "roi", "reach", "response_rate", "rx_lift"] as const;
export type ObjectiveMetric = (typeof objectiveMetrics)[number];

// Objective sense
export const objectiveSenses = ["maximize", "minimize"] as const;
export type ObjectiveSense = (typeof objectiveSenses)[number];

// Allocation statuses
export const allocationStatuses = ["planned", "booked", "executing", "completed", "cancelled", "failed"] as const;
export type AllocationStatus = (typeof allocationStatuses)[number];

// Execution plan statuses
export const executionPlanStatuses = ["draft", "scheduled", "executing", "paused", "completed", "cancelled"] as const;
export type ExecutionPlanStatus = (typeof executionPlanStatuses)[number];

// Rebalance triggers
export const rebalanceTriggers = ["constraint_change", "budget_change", "outcome_deviation", "manual", "schedule"] as const;
export type RebalanceTrigger = (typeof rebalanceTriggers)[number];

// Solver types
export const solverTypes = ["greedy", "local_search", "simulated_annealing", "genetic"] as const;
export type SolverType = (typeof solverTypes)[number];

// ============================================================================
// 7F: DATABASE TABLES
// ============================================================================

// Optimization Problems
export const optimizationProblems = pgTable("optimization_problems", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),

  // Scope
  audienceId: varchar("audience_id").references(() => savedAudiences.id),
  campaignId: varchar("campaign_id").references(() => campaigns.id),
  hcpIds: jsonb("hcp_ids").$type<string[]>(),

  // Objective
  objectiveMetric: varchar("objective_metric", { length: 50 }).notNull().$type<ObjectiveMetric>(),
  objectiveSense: varchar("objective_sense", { length: 10 }).notNull().default("maximize").$type<ObjectiveSense>(),

  // Constraints
  budgetLimit: real("budget_limit"),
  budgetConstraintId: varchar("budget_constraint_id"),
  capacityConstraintIds: jsonb("capacity_constraint_ids").$type<string[]>(),
  includeContactLimits: integer("include_contact_limits").default(1),
  includeComplianceWindows: integer("include_compliance_windows").default(1),
  respectReservations: integer("respect_reservations").default(1),

  // Exploration
  explorationBudgetPct: real("exploration_budget_pct").default(10),

  // Time horizon
  planningHorizonDays: integer("planning_horizon_days").notNull().default(30),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),

  // Solver settings
  preferredSolver: varchar("preferred_solver", { length: 30 }).default("greedy").$type<SolverType>(),
  maxSolveTimeMs: integer("max_solve_time_ms").default(30000),

  // Status
  status: varchar("status", { length: 20 }).notNull().default("draft").$type<OptimizationStatus>(),

  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOptimizationProblemSchema = createInsertSchema(optimizationProblems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOptimizationProblem = z.infer<typeof insertOptimizationProblemSchema>;
export type OptimizationProblem = typeof optimizationProblems.$inferSelect;

// Constraint violation type for results
export interface ConstraintViolation {
  constraintType: string;
  constraintId?: string;
  severity: "warning" | "error";
  message: string;
  affectedCount?: number;
}

// Optimization Results
export const optimizationResults = pgTable("optimization_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  problemId: varchar("problem_id").notNull().references(() => optimizationProblems.id),

  // Solver info
  solverType: varchar("solver_type", { length: 30 }).notNull().$type<SolverType>(),

  // Solution quality
  objectiveValue: real("objective_value").notNull(),
  feasible: integer("feasible").notNull(),
  optimalityGap: real("optimality_gap"),

  // Allocation summary
  totalActions: integer("total_actions").notNull(),
  totalHcps: integer("total_hcps").notNull(),
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

export const insertOptimizationResultSchema = createInsertSchema(optimizationResults).omit({
  id: true,
  solvedAt: true,
});

export type InsertOptimizationResult = z.infer<typeof insertOptimizationResultSchema>;
export type OptimizationResult = typeof optimizationResults.$inferSelect;

// Optimization Allocations (individual HCP-channel assignments)
export const optimizationAllocations = pgTable("optimization_allocations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resultId: varchar("result_id").notNull().references(() => optimizationResults.id),

  hcpId: varchar("hcp_id").notNull().references(() => hcpProfiles.id),
  channel: varchar("channel", { length: 20 }).notNull().$type<Channel>(),
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
  status: varchar("status", { length: 20 }).notNull().default("planned").$type<AllocationStatus>(),
  executedAt: timestamp("executed_at"),
  actualOutcome: real("actual_outcome"),

  // Reasoning
  selectionReason: text("selection_reason"),
  alternativesConsidered: jsonb("alternatives_considered").$type<string[]>(),

  priority: integer("priority").default(0),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOptimizationAllocationSchema = createInsertSchema(optimizationAllocations).omit({
  id: true,
  createdAt: true,
});

export type InsertOptimizationAllocation = z.infer<typeof insertOptimizationAllocationSchema>;
export type OptimizationAllocation = typeof optimizationAllocations.$inferSelect;

// Execution Plans
export const executionPlans = pgTable("execution_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resultId: varchar("result_id").notNull().references(() => optimizationResults.id),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),

  // Status
  status: varchar("status", { length: 20 }).notNull().default("draft").$type<ExecutionPlanStatus>(),

  // Schedule
  scheduledStartAt: timestamp("scheduled_start_at"),
  scheduledEndAt: timestamp("scheduled_end_at"),
  actualStartAt: timestamp("actual_start_at"),
  actualEndAt: timestamp("actual_end_at"),

  // Progress
  totalActions: integer("total_actions").notNull(),
  completedActions: integer("completed_actions").notNull().default(0),
  failedActions: integer("failed_actions").notNull().default(0),

  // Budget tracking
  budgetAllocated: real("budget_allocated"),
  budgetSpent: real("budget_spent").default(0),

  // Outcomes
  actualTotalLift: real("actual_total_lift"),
  actualEngagementRate: real("actual_engagement_rate"),

  // Rebalancing
  lastRebalanceAt: timestamp("last_rebalance_at"),
  rebalanceCount: integer("rebalance_count").default(0),

  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertExecutionPlanSchema = createInsertSchema(executionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertExecutionPlan = z.infer<typeof insertExecutionPlanSchema>;
export type ExecutionPlan = typeof executionPlans.$inferSelect;

// ============================================================================
// 7F: API TYPES
// ============================================================================

// Problem API type
export const optimizationProblemApiSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  audienceId: z.string().nullable(),
  audienceName: z.string().nullable(),
  campaignId: z.string().nullable(),
  campaignName: z.string().nullable(),
  hcpCount: z.number(),
  objectiveMetric: z.enum(objectiveMetrics),
  objectiveSense: z.enum(objectiveSenses),
  budgetLimit: z.number().nullable(),
  explorationBudgetPct: z.number().nullable(),
  planningHorizonDays: z.number(),
  preferredSolver: z.enum(solverTypes).nullable(),
  status: z.enum(optimizationStatuses),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type OptimizationProblemApi = z.infer<typeof optimizationProblemApiSchema>;

// Result API type
export const optimizationResultApiSchema = z.object({
  id: z.string(),
  problemId: z.string(),
  problemName: z.string(),
  solverType: z.enum(solverTypes),
  objectiveValue: z.number(),
  feasible: z.boolean(),
  optimalityGap: z.number().nullable(),
  totalActions: z.number(),
  totalHcps: z.number(),
  actionsByChannel: z.record(z.number()),
  totalBudgetUsed: z.number().nullable(),
  budgetUtilization: z.number().nullable(),
  predictedTotalLift: z.number().nullable(),
  predictedEngagementRate: z.number().nullable(),
  predictedResponseRate: z.number().nullable(),
  explorationActions: z.number().nullable(),
  explorationBudgetUsed: z.number().nullable(),
  constraintViolations: z.array(z.object({
    constraintType: z.string(),
    constraintId: z.string().optional(),
    severity: z.enum(["warning", "error"]),
    message: z.string(),
    affectedCount: z.number().optional(),
  })),
  solveTimeMs: z.number().nullable(),
  iterations: z.number().nullable(),
  solvedAt: z.string(),
});

export type OptimizationResultApi = z.infer<typeof optimizationResultApiSchema>;

// Allocation API type
export const optimizationAllocationApiSchema = z.object({
  id: z.string(),
  resultId: z.string(),
  hcpId: z.string(),
  hcpName: z.string(),
  channel: z.enum(channels),
  actionType: z.string(),
  plannedDate: z.string(),
  windowStart: z.string().nullable(),
  windowEnd: z.string().nullable(),
  predictedLift: z.number(),
  confidence: z.number(),
  isExploration: z.boolean(),
  estimatedCost: z.number().nullable(),
  status: z.enum(allocationStatuses),
  executedAt: z.string().nullable(),
  actualOutcome: z.number().nullable(),
  selectionReason: z.string().nullable(),
  priority: z.number(),
});

export type OptimizationAllocationApi = z.infer<typeof optimizationAllocationApiSchema>;

// Execution plan API type
export const executionPlanApiSchema = z.object({
  id: z.string(),
  resultId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.enum(executionPlanStatuses),
  scheduledStartAt: z.string().nullable(),
  scheduledEndAt: z.string().nullable(),
  actualStartAt: z.string().nullable(),
  actualEndAt: z.string().nullable(),
  totalActions: z.number(),
  completedActions: z.number(),
  failedActions: z.number(),
  progressPercent: z.number(),
  budgetAllocated: z.number().nullable(),
  budgetSpent: z.number().nullable(),
  actualTotalLift: z.number().nullable(),
  actualEngagementRate: z.number().nullable(),
  rebalanceCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ExecutionPlanApi = z.infer<typeof executionPlanApiSchema>;

// ============================================================================
// 7F: REQUEST SCHEMAS
// ============================================================================

// Create optimization problem request
export const createOptimizationProblemRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  audienceId: z.string().optional(),
  campaignId: z.string().optional(),
  hcpIds: z.array(z.string()).optional(),
  objectiveMetric: z.enum(objectiveMetrics),
  objectiveSense: z.enum(objectiveSenses).optional(),
  budgetLimit: z.number().positive().optional(),
  explorationBudgetPct: z.number().min(0).max(100).optional(),
  planningHorizonDays: z.number().min(1).max(365).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  preferredSolver: z.enum(solverTypes).optional(),
  maxSolveTimeMs: z.number().positive().optional(),
  includeContactLimits: z.boolean().optional(),
  includeComplianceWindows: z.boolean().optional(),
  respectReservations: z.boolean().optional(),
});

export type CreateOptimizationProblemRequest = z.infer<typeof createOptimizationProblemRequestSchema>;

// Solve problem request
export const solveOptimizationRequestSchema = z.object({
  solver: z.enum(solverTypes).optional(),
  maxIterations: z.number().positive().optional(),
  maxTimeMs: z.number().positive().optional(),
  earlyStopThreshold: z.number().optional(),
});

export type SolveOptimizationRequest = z.infer<typeof solveOptimizationRequestSchema>;

// What-if request
export const whatIfRequestSchema = z.object({
  type: z.enum(["add_budget", "remove_constraint", "change_objective"]),
  additionalBudget: z.number().optional(),
  constraintIdToRemove: z.string().optional(),
  newObjectiveMetric: z.enum(objectiveMetrics).optional(),
});

export type WhatIfRequest = z.infer<typeof whatIfRequestSchema>;

// Create execution plan request
export const createExecutionPlanRequestSchema = z.object({
  resultId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  scheduledStartAt: z.string().optional(),
});

export type CreateExecutionPlanRequest = z.infer<typeof createExecutionPlanRequestSchema>;

// Rebalance request
export const rebalancePlanRequestSchema = z.object({
  trigger: z.enum(rebalanceTriggers),
  reason: z.string().optional(),
});

export type RebalancePlanRequest = z.infer<typeof rebalancePlanRequestSchema>;

// ============================================================================
// 7F: RESPONSE SCHEMAS
// ============================================================================

// Sensitivity report
export const sensitivityReportSchema = z.object({
  problemId: z.string(),
  resultId: z.string(),
  budgetSensitivity: z.object({
    currentBudget: z.number(),
    marginalValuePerDollar: z.number(),
    optimalBudget: z.number().nullable(),
    diminishingReturnsAt: z.number().nullable(),
  }).nullable(),
  constraintSensitivities: z.array(z.object({
    constraintType: z.string(),
    constraintId: z.string().optional(),
    shadowPrice: z.number(),
    binding: z.boolean(),
    slackAmount: z.number(),
  })),
  channelSensitivities: z.array(z.object({
    channel: z.enum(channels),
    currentAllocation: z.number(),
    marginalLift: z.number(),
    costPerLift: z.number(),
  })),
  computedAt: z.string(),
});

export type SensitivityReport = z.infer<typeof sensitivityReportSchema>;

// What-if result
export const whatIfResultSchema = z.object({
  originalObjectiveValue: z.number(),
  newObjectiveValue: z.number(),
  improvement: z.number(),
  improvementPercent: z.number(),
  feasibilityChanged: z.boolean(),
  newViolations: z.array(z.object({
    constraintType: z.string(),
    message: z.string(),
  })),
  resolvedViolations: z.array(z.string()),
  affectedAllocations: z.number(),
  recommendation: z.string(),
});

export type WhatIfResult = z.infer<typeof whatIfResultSchema>;

// Rebalance suggestion
export const rebalanceSuggestionSchema = z.object({
  planId: z.string(),
  trigger: z.enum(rebalanceTriggers),
  reason: z.string(),
  currentPerformance: z.number(),
  projectedPerformance: z.number(),
  improvementPercent: z.number(),
  actionsToModify: z.number(),
  actionsToAdd: z.number(),
  actionsToRemove: z.number(),
  estimatedCostChange: z.number(),
  confidence: z.number(),
  suggestedAt: z.string(),
});

export type RebalanceSuggestion = z.infer<typeof rebalanceSuggestionSchema>;

// Execution report
export const executionReportSchema = z.object({
  planId: z.string(),
  status: z.enum(executionPlanStatuses),
  totalActions: z.number(),
  completedActions: z.number(),
  failedActions: z.number(),
  pendingActions: z.number(),
  progressPercent: z.number(),
  predictedOutcome: z.number(),
  actualOutcome: z.number().nullable(),
  outcomeVariance: z.number().nullable(),
  budgetAllocated: z.number(),
  budgetSpent: z.number(),
  budgetRemaining: z.number(),
  topPerformingChannels: z.array(z.object({
    channel: z.enum(channels),
    completedActions: z.number(),
    avgOutcome: z.number(),
  })),
  underperformingHcps: z.array(z.object({
    hcpId: z.string(),
    hcpName: z.string(),
    expectedLift: z.number(),
    actualLift: z.number(),
    variance: z.number(),
  })),
  generatedAt: z.string(),
});

export type ExecutionReport = z.infer<typeof executionReportSchema>;

// ============================================================================
// PHASE 11: HCP-CENTRIC CONSTELLATION VISUALIZATION
// ============================================================================

// Messaging Themes - Cross-TA standard pharma messaging themes
export const messagingThemeLifecycleStages = [
  "Pre-Launch",
  "Early Launch",
  "Launch",
  "Growth",
  "Mature",
  "LOE",
] as const;

export type MessagingThemeLifecycleStage = (typeof messagingThemeLifecycleStages)[number];

export const messagingThemes = pgTable("messaging_themes", {
  id: varchar("id", { length: 10 }).primaryKey(), // MT01, MT02, etc.
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }).notNull(), // Hex color
  lifecycleStage: varchar("lifecycle_stage", { length: 50 }),
  appliesToTAs: jsonb("applies_to_tas").$type<string[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMessagingThemeSchema = createInsertSchema(messagingThemes).omit({
  createdAt: true,
});

export type InsertMessagingTheme = z.infer<typeof insertMessagingThemeSchema>;
export type MessagingThemeDB = typeof messagingThemes.$inferSelect;

// Campaign-Theme junction table (many-to-many)
export const campaignThemes = pgTable("campaign_themes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => campaigns.id),
  themeId: varchar("theme_id", { length: 10 }).notNull().references(() => messagingThemes.id),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCampaignThemeSchema = createInsertSchema(campaignThemes).omit({
  id: true,
  createdAt: true,
});

export type InsertCampaignTheme = z.infer<typeof insertCampaignThemeSchema>;
export type CampaignThemeDB = typeof campaignThemes.$inferSelect;

// Channel Overlap - HCP audience overlap between channels
export const channelOverlap = pgTable("channel_overlap", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceChannel: varchar("source_channel", { length: 50 }).notNull(),
  targetChannel: varchar("target_channel", { length: 50 }).notNull(),
  overlapIndex: real("overlap_index").notNull(), // 0-1, % of shared HCPs
  overlapCount: integer("overlap_count"), // Absolute count of shared HCPs
  computedAt: timestamp("computed_at").notNull().defaultNow(),
});

export const insertChannelOverlapSchema = createInsertSchema(channelOverlap).omit({
  id: true,
  computedAt: true,
});

export type InsertChannelOverlap = z.infer<typeof insertChannelOverlapSchema>;
export type ChannelOverlapDB = typeof channelOverlap.$inferSelect;

// ============================================================================
// PHASE 11: API SCHEMAS
// ============================================================================

// Messaging Theme API type
export const messagingThemeApiSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  color: z.string(),
  lifecycleStage: z.string().nullable(),
  appliesToTAs: z.array(z.string()).nullable(),
});

export type MessagingThemeApi = z.infer<typeof messagingThemeApiSchema>;

// Channel Overlap API type
export const channelOverlapApiSchema = z.object({
  source: z.string(),
  target: z.string(),
  overlapIndex: z.number(),
  overlapCount: z.number().nullable(),
});

export type ChannelOverlapApi = z.infer<typeof channelOverlapApiSchema>;

// L1 Solar System Data - for Ecosystem view
export const l1SolarSystemDataSchema = z.object({
  nucleus: z.object({
    totalHcps: z.number(),
    avgEngagement: z.number(),
  }),
  channels: z.array(z.object({
    id: z.string(),
    label: z.string(),
    hcpReach: z.number(),
    avgEngagement: z.number(),
    campaignCount: z.number(),
    color: z.string(),
    icon: z.string(),
  })),
  interconnections: z.array(channelOverlapApiSchema),
});

export type L1SolarSystemData = z.infer<typeof l1SolarSystemDataSchema>;

// L2 Campaign Orbit Data - for Channel drill-down
export const l2CampaignOrbitDataSchema = z.object({
  channelId: z.string(),
  channelLabel: z.string(),
  nucleus: z.object({
    totalHcps: z.number(),
    avgEngagement: z.number(),
  }),
  campaigns: z.array(z.object({
    id: z.string(),
    name: z.string(),
    brand: z.string().nullable(),
    therapeuticArea: z.string().nullable(),
    hcpReach: z.number(),
    primaryTheme: z.string().nullable(),
    primaryThemeColor: z.string().nullable(),
    secondaryTheme: z.string().nullable(),
    kpis: z.record(z.number()),
  })),
  kpiConfig: z.array(z.object({
    key: z.string(),
    label: z.string(),
    format: z.enum(["percent", "number", "currency", "decimal"]),
  })),
});

export type L2CampaignOrbitData = z.infer<typeof l2CampaignOrbitDataSchema>;

// L3 HCP Constellation Data - for Campaign drill-down
export const l3HcpConstellationDataSchema = z.object({
  campaignId: z.string(),
  campaignName: z.string(),
  channelId: z.string(),
  totalHcps: z.number(),
  hcps: z.array(z.object({
    id: z.string(),
    name: z.string(),
    specialty: z.string(),
    specialtyAbbr: z.string(),
    specialtyColor: z.string(),
    engagementScore: z.number(),
    sparkline: z.array(z.number()),
    rxTrend: z.enum(["up", "down", "flat"]),
    channelAffinity: z.string(),
    adoptionStage: z.enum(["Aware", "Trial", "Regular"]),
    lastTouchDate: z.string(),
  })),
});

export type L3HcpConstellationData = z.infer<typeof l3HcpConstellationDataSchema>;

// ============================================================================
// PHASE 12A: COMPETITIVE ORBIT VIEW
// ============================================================================

// Competitor Types
export const competitorTypes = ["brand", "therapeutic_class_peer"] as const;
export type CompetitorType = (typeof competitorTypes)[number];

// Therapeutic Areas for competitors
export const therapeuticAreas = [
  "Oncology",
  "Cardiology",
  "Neurology",
  "Immunology",
  "Endocrinology",
  "Respiratory",
  "Gastroenterology",
  "Dermatology",
  "Psychiatry",
  "Infectious Disease",
] as const;
export type TherapeuticArea = (typeof therapeuticAreas)[number];

// Competitor Dimension Table - defines competitor entities
export const competitorDim = pgTable("competitor_dim", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'brand' or 'therapeutic_class_peer'
  therapeuticArea: varchar("therapeutic_area", { length: 100 }),
  marketShare: real("market_share"), // Overall market share percentage
  color: varchar("color", { length: 7 }), // hex color for visualization
  logoUrl: varchar("logo_url", { length: 500 }),
  parentCompany: varchar("parent_company", { length: 200 }),
  launchYear: integer("launch_year"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCompetitorDimSchema = createInsertSchema(competitorDim).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCompetitorDim = z.infer<typeof insertCompetitorDimSchema>;
export type CompetitorDimDB = typeof competitorDim.$inferSelect;

// HCP Competitive Signal Fact Table - tracks competitive pressure per HCP
export const hcpCompetitiveSignalFact = pgTable("hcp_competitive_signal_fact", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hcpId: varchar("hcp_id").notNull().references(() => hcpProfiles.id),
  competitorId: varchar("competitor_id").notNull().references(() => competitorDim.id),

  // Share metrics
  shareOfBrand: real("share_of_brand"), // HCP's prescriptions for competitor as % of total
  shareChangeQoQ: real("share_change_qoq"), // Quarter-over-quarter change
  shareChangeMoM: real("share_change_mom"), // Month-over-month change

  // Velocity metrics
  competitiveRxVelocity: real("competitive_rx_velocity"), // Rate of competitor Rx growth
  ourRxVelocity: real("our_rx_velocity"), // Our brand's Rx velocity for comparison

  // Engagement asymmetry
  competitorEngagementScore: integer("competitor_engagement_score"), // 0-100
  engagementAsymmetry: real("engagement_asymmetry"), // Diff between competitor and our engagement

  // Competitive Pressure Index (computed)
  cpi: real("cpi"), // Normalized 0-100 score
  cpiDirection: varchar("cpi_direction", { length: 20 }), // 'increasing', 'stable', 'decreasing'
  cpiComponents: jsonb("cpi_components").$type<CPIComponents>(),

  // Measurement metadata
  measurementDate: timestamp("measurement_date").notNull(),
  dataSource: varchar("data_source", { length: 100 }), // e.g., 'IQVIA', 'Symphony', 'inferred'
  confidenceLevel: real("confidence_level"), // 0-1 confidence in the data

  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  hcpIdIdx: index("competitive_signal_hcp_id_idx").on(table.hcpId),
  competitorIdIdx: index("competitive_signal_competitor_id_idx").on(table.competitorId),
  measurementDateIdx: index("competitive_signal_measurement_date_idx").on(table.measurementDate),
  cpiIdx: index("competitive_signal_cpi_idx").on(table.cpi),
  hcpCompetitorIdx: index("competitive_signal_hcp_competitor_idx").on(table.hcpId, table.competitorId),
}));

export const insertHcpCompetitiveSignalFactSchema = createInsertSchema(hcpCompetitiveSignalFact).omit({
  id: true,
  createdAt: true,
});

export type InsertHcpCompetitiveSignalFact = z.infer<typeof insertHcpCompetitiveSignalFactSchema>;
export type HcpCompetitiveSignalFactDB = typeof hcpCompetitiveSignalFact.$inferSelect;

// CPI Components - breakdown of Competitive Pressure Index calculation
export const cpiComponentsSchema = z.object({
  shareComponent: z.number(), // Contribution from share of brand (0-25)
  velocityComponent: z.number(), // Contribution from Rx velocity (0-25)
  engagementComponent: z.number(), // Contribution from engagement asymmetry (0-25)
  trendComponent: z.number(), // Contribution from share change trends (0-25)
  rawScore: z.number(), // Pre-normalized score
  normalizedScore: z.number(), // Final 0-100 score
});

export type CPIComponents = z.infer<typeof cpiComponentsSchema>;

// CPI Direction type
export const cpiDirections = ["increasing", "stable", "decreasing"] as const;
export type CPIDirection = (typeof cpiDirections)[number];

// ============ Competitive API Types ============

// Competitor (API type)
export const competitorSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(competitorTypes),
  therapeuticArea: z.string().nullable(),
  marketShare: z.number().nullable(),
  color: z.string().nullable(),
  logoUrl: z.string().nullable(),
  parentCompany: z.string().nullable(),
  launchYear: z.number().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Competitor = z.infer<typeof competitorSchema>;

// HCP Competitive Signal (API type)
export const hcpCompetitiveSignalSchema = z.object({
  id: z.string(),
  hcpId: z.string(),
  competitorId: z.string(),
  competitorName: z.string().optional(), // Joined from competitor_dim
  competitorColor: z.string().optional(), // Joined from competitor_dim
  shareOfBrand: z.number().nullable(),
  shareChangeQoQ: z.number().nullable(),
  shareChangeMoM: z.number().nullable(),
  competitiveRxVelocity: z.number().nullable(),
  ourRxVelocity: z.number().nullable(),
  competitorEngagementScore: z.number().nullable(),
  engagementAsymmetry: z.number().nullable(),
  cpi: z.number().nullable(),
  cpiDirection: z.enum(cpiDirections).nullable(),
  cpiComponents: cpiComponentsSchema.nullable(),
  measurementDate: z.string(),
  dataSource: z.string().nullable(),
  confidenceLevel: z.number().nullable(),
  createdAt: z.string(),
});

export type HcpCompetitiveSignal = z.infer<typeof hcpCompetitiveSignalSchema>;

// Aggregated Competitive Pressure for an HCP (combines all competitors)
export const hcpCompetitiveSummarySchema = z.object({
  hcpId: z.string(),
  hcpName: z.string().optional(),
  overallCpi: z.number(), // Weighted average of all competitor CPIs
  topCompetitor: z.object({
    id: z.string(),
    name: z.string(),
    cpi: z.number(),
    color: z.string().nullable(),
  }).nullable(),
  competitorCount: z.number(),
  signals: z.array(hcpCompetitiveSignalSchema),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  recommendedAction: z.string().nullable(),
});

export type HcpCompetitiveSummary = z.infer<typeof hcpCompetitiveSummarySchema>;

// Competitive Orbit View Data - for visualization
export const competitiveOrbitDataSchema = z.object({
  competitors: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(competitorTypes),
    color: z.string(),
    marketShare: z.number(),
    avgCpi: z.number(), // Average CPI across affected HCPs
    affectedHcpCount: z.number(),
    ringDistance: z.number(), // Computed: closer = more pressure (inverse of avgCpi)
    ringThickness: z.number(), // Computed: based on market share
  })),
  hcpDriftVectors: z.array(z.object({
    hcpId: z.string(),
    competitorId: z.string(),
    driftStrength: z.number(), // 0-1, how strong the pull is
    driftDirection: z.enum(["toward", "away"]),
  })),
  summary: z.object({
    totalHcpsUnderPressure: z.number(),
    avgOverallCpi: z.number(),
    highestPressureCompetitor: z.string().nullable(),
    lowestPressureCompetitor: z.string().nullable(),
  }),
});

export type CompetitiveOrbitData = z.infer<typeof competitiveOrbitDataSchema>;

// Request schemas for competitive endpoints
export const createCompetitorRequestSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(competitorTypes),
  therapeuticArea: z.string().optional(),
  marketShare: z.number().min(0).max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  logoUrl: z.string().url().optional(),
  parentCompany: z.string().optional(),
  launchYear: z.number().min(1900).max(2100).optional(),
});

export type CreateCompetitorRequest = z.infer<typeof createCompetitorRequestSchema>;

export const recordCompetitiveSignalRequestSchema = z.object({
  hcpId: z.string(),
  competitorId: z.string(),
  shareOfBrand: z.number().min(0).max(100).optional(),
  shareChangeQoQ: z.number().optional(),
  shareChangeMoM: z.number().optional(),
  competitiveRxVelocity: z.number().optional(),
  ourRxVelocity: z.number().optional(),
  competitorEngagementScore: z.number().min(0).max(100).optional(),
  measurementDate: z.string().optional(),
  dataSource: z.string().optional(),
  confidenceLevel: z.number().min(0).max(1).optional(),
});

export type RecordCompetitiveSignalRequest = z.infer<typeof recordCompetitiveSignalRequestSchema>;

// Filter schema for competitive queries
export const competitiveFilterSchema = z.object({
  competitorIds: z.array(z.string()).optional(),
  hcpIds: z.array(z.string()).optional(),
  therapeuticArea: z.string().optional(),
  minCpi: z.number().optional(),
  maxCpi: z.number().optional(),
  cpiDirection: z.enum(cpiDirections).optional(),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export type CompetitiveFilter = z.infer<typeof competitiveFilterSchema>;

// ============================================================================
// PHASE 12B: MESSAGE SATURATION INDEX (MSI)
// ============================================================================

// Message Theme Dimension - taxonomy of messaging themes
export const messageThemeDim = pgTable("message_theme_dim", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  category: varchar("category", { length: 100 }), // 'efficacy', 'safety', 'RWE', 'peer_validation', 'cost_value'
  therapeuticArea: varchar("therapeutic_area", { length: 100 }),
  brandName: varchar("brand_name", { length: 100 }), // Optional brand association
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMessageThemeDimSchema = createInsertSchema(messageThemeDim).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type MessageThemeDimDB = typeof messageThemeDim.$inferSelect;
export type InsertMessageThemeDim = z.infer<typeof insertMessageThemeDimSchema>;

// Message Exposure Fact - tracks HCP exposure to message themes
export const messageExposureFact = pgTable("message_exposure_fact", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hcpId: varchar("hcp_id").notNull().references(() => hcpProfiles.id),
  messageThemeId: varchar("message_theme_id").notNull().references(() => messageThemeDim.id),

  // Exposure metrics
  touchFrequency: integer("touch_frequency").notNull(), // Total touches with this theme
  uniqueChannels: integer("unique_channels").notNull().default(1), // Number of different channels used
  channelDiversity: real("channel_diversity"), // 0-1 entropy score
  avgTimeBetweenTouches: real("avg_time_between_touches"), // Days between touches

  // Engagement metrics
  engagementRate: real("engagement_rate"), // 0-1, how often HCP engages with theme
  engagementDecay: real("engagement_decay"), // Rate of engagement decline (positive = declining)
  lastEngagementDate: timestamp("last_engagement_date"),

  // Saturation indicators
  msi: real("msi"), // Message Saturation Index: 0-100
  msiDirection: varchar("msi_direction", { length: 20 }), // 'increasing', 'stable', 'decreasing'
  saturationRisk: varchar("saturation_risk", { length: 20 }), // 'low', 'medium', 'high', 'critical'

  // Context
  adoptionStage: varchar("adoption_stage", { length: 50 }), // 'awareness', 'consideration', 'trial', 'loyalty'
  measurementPeriod: varchar("measurement_period", { length: 20 }), // 'Q1-2026', etc.

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  hcpIdIdx: index("msg_exposure_hcp_id_idx").on(table.hcpId),
  themeIdIdx: index("msg_exposure_theme_id_idx").on(table.messageThemeId),
  msiIdx: index("msg_exposure_msi_idx").on(table.msi),
  saturationRiskIdx: index("msg_exposure_saturation_risk_idx").on(table.saturationRisk),
  hcpThemeIdx: index("msg_exposure_hcp_theme_idx").on(table.hcpId, table.messageThemeId),
}));

export const insertMessageExposureFactSchema = createInsertSchema(messageExposureFact).omit({
  id: true,
  msi: true,
  msiDirection: true,
  saturationRisk: true,
  createdAt: true,
  updatedAt: true,
});

export type MessageExposureFactDB = typeof messageExposureFact.$inferSelect;
export type InsertMessageExposureFact = z.infer<typeof insertMessageExposureFactSchema>;

// ---- Phase 12B: MSI Types and Schemas ----

// Message theme categories
export const messageThemeCategories = [
  "efficacy",
  "safety",
  "rwe", // Real World Evidence
  "peer_validation",
  "cost_value",
  "mechanism_of_action",
  "patient_outcomes",
  "dosing_convenience",
] as const;

export type MessageThemeCategory = (typeof messageThemeCategories)[number];

// Adoption stages with different saturation tolerances
export const adoptionStages = [
  "awareness",    // New to brand - higher tolerance
  "consideration", // Evaluating - medium tolerance
  "trial",        // Testing - medium tolerance
  "loyalty",      // Regular prescriber - lower tolerance (risk of fatigue)
] as const;

export type AdoptionStage = (typeof adoptionStages)[number];

// MSI directions
export const msiDirections = ["increasing", "stable", "decreasing"] as const;
export type MsiDirection = (typeof msiDirections)[number];

// Saturation risk levels
export const saturationRiskLevels = ["low", "medium", "high", "critical"] as const;
export type SaturationRiskLevel = (typeof saturationRiskLevels)[number];

// MSI Components (for transparency in calculation)
export const msiComponentsSchema = z.object({
  frequencyComponent: z.number(), // 0-40, based on touch frequency
  diversityComponent: z.number(), // 0-20, based on channel diversity (lower = worse)
  decayComponent: z.number(),     // 0-40, based on engagement decay
  stageModifier: z.number(),      // Multiplier based on adoption stage
});

export type MsiComponents = z.infer<typeof msiComponentsSchema>;

// Message Theme API type
export const messageThemeSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(messageThemeCategories).nullable(),
  therapeuticArea: z.string().nullable(),
  brandName: z.string().nullable(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type MessageTheme = z.infer<typeof messageThemeSchema>;

// Message Exposure API type
export const messageExposureSchema = z.object({
  id: z.string(),
  hcpId: z.string(),
  messageThemeId: z.string(),
  themeName: z.string().optional(), // Joined from message_theme_dim
  themeCategory: z.enum(messageThemeCategories).nullable().optional(),
  touchFrequency: z.number(),
  uniqueChannels: z.number(),
  channelDiversity: z.number().nullable(),
  avgTimeBetweenTouches: z.number().nullable(),
  engagementRate: z.number().nullable(),
  engagementDecay: z.number().nullable(),
  lastEngagementDate: z.string().nullable(),
  msi: z.number().nullable(),
  msiDirection: z.enum(msiDirections).nullable(),
  msiComponents: msiComponentsSchema.nullable(),
  saturationRisk: z.enum(saturationRiskLevels).nullable(),
  adoptionStage: z.enum(adoptionStages).nullable(),
  measurementPeriod: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type MessageExposure = z.infer<typeof messageExposureSchema>;

// HCP Message Saturation Summary (aggregates all themes for an HCP)
export const hcpMessageSaturationSummarySchema = z.object({
  hcpId: z.string(),
  hcpName: z.string().optional(),
  overallMsi: z.number(), // Weighted average across all themes
  themesAtRisk: z.number(), // Count of themes with high/critical saturation
  totalThemes: z.number(),
  topSaturatedTheme: z.object({
    id: z.string(),
    name: z.string(),
    msi: z.number(),
    category: z.enum(messageThemeCategories).nullable(),
  }).nullable(),
  exposures: z.array(messageExposureSchema),
  riskLevel: z.enum(saturationRiskLevels),
  recommendedAction: z.string().nullable(),
});

export type HcpMessageSaturationSummary = z.infer<typeof hcpMessageSaturationSummarySchema>;

// Message Saturation Heatmap Data - for visualization
export const messageSaturationHeatmapDataSchema = z.object({
  themes: z.array(z.object({
    id: z.string(),
    name: z.string(),
    category: z.enum(messageThemeCategories).nullable(),
    avgMsi: z.number(),
    affectedHcpCount: z.number(),
    riskDistribution: z.object({
      low: z.number(),
      medium: z.number(),
      high: z.number(),
      critical: z.number(),
    }),
  })),
  hcpCells: z.array(z.object({
    hcpId: z.string(),
    themeId: z.string(),
    msi: z.number(),
    saturationRisk: z.enum(saturationRiskLevels),
    adoptionStage: z.enum(adoptionStages).nullable(),
  })),
  summary: z.object({
    totalHcpsAnalyzed: z.number(),
    avgOverallMsi: z.number(),
    hcpsAtRisk: z.number(), // HCPs with at least one high/critical theme
    mostSaturatedTheme: z.string().nullable(),
    leastSaturatedTheme: z.string().nullable(),
  }),
});

export type MessageSaturationHeatmapData = z.infer<typeof messageSaturationHeatmapDataSchema>;

// Request schemas for message saturation endpoints
export const createMessageThemeRequestSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(messageThemeCategories).optional(),
  therapeuticArea: z.string().optional(),
  brandName: z.string().optional(),
  description: z.string().optional(),
});

export type CreateMessageThemeRequest = z.infer<typeof createMessageThemeRequestSchema>;

export const recordMessageExposureRequestSchema = z.object({
  hcpId: z.string(),
  messageThemeId: z.string(),
  touchFrequency: z.number().min(0),
  uniqueChannels: z.number().min(1).optional(),
  channelDiversity: z.number().min(0).max(1).optional(),
  avgTimeBetweenTouches: z.number().min(0).optional(),
  engagementRate: z.number().min(0).max(1).optional(),
  engagementDecay: z.number().optional(),
  lastEngagementDate: z.string().optional(),
  adoptionStage: z.enum(adoptionStages).optional(),
  measurementPeriod: z.string().optional(),
});

export type RecordMessageExposureRequest = z.infer<typeof recordMessageExposureRequestSchema>;

// Filter schema for message saturation queries
export const messageSaturationFilterSchema = z.object({
  themeIds: z.array(z.string()).optional(),
  hcpIds: z.array(z.string()).optional(),
  categories: z.array(z.enum(messageThemeCategories)).optional(),
  therapeuticArea: z.string().optional(),
  minMsi: z.number().optional(),
  maxMsi: z.number().optional(),
  saturationRisk: z.enum(saturationRiskLevels).optional(),
  adoptionStage: z.enum(adoptionStages).optional(),
  measurementPeriod: z.string().optional(),
});

export type MessageSaturationFilter = z.infer<typeof messageSaturationFilterSchema>;

// ---- Phase 12B.4: MSI Benchmarks and Campaign Planning ----

// MSI Benchmark Configuration table
export const msiBenchmarkConfig = pgTable("msi_benchmark_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  therapeuticArea: varchar("therapeutic_area", { length: 100 }),
  brandName: varchar("brand_name", { length: 100 }),
  // MSI thresholds
  underexposedThreshold: real("underexposed_threshold").notNull().default(20),
  safeThreshold: real("safe_threshold").notNull().default(40),
  approachingThreshold: real("approaching_threshold").notNull().default(50),
  shiftThreshold: real("shift_threshold").notNull().default(65),
  blockedThreshold: real("blocked_threshold").notNull().default(80),
  // Stage-specific modifiers
  awarenessModifier: real("awareness_modifier").notNull().default(0.7),
  considerationModifier: real("consideration_modifier").notNull().default(0.85),
  trialModifier: real("trial_modifier").notNull().default(0.9),
  loyaltyModifier: real("loyalty_modifier").notNull().default(1.1),
  // Stage-specific touch thresholds
  awarenessTouchThreshold: integer("awareness_touch_threshold").notNull().default(20),
  considerationTouchThreshold: integer("consideration_touch_threshold").notNull().default(15),
  trialTouchThreshold: integer("trial_touch_threshold").notNull().default(12),
  loyaltyTouchThreshold: integer("loyalty_touch_threshold").notNull().default(8),
  // Metadata
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMsiBenchmarkConfigSchema = createInsertSchema(msiBenchmarkConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type MsiBenchmarkConfigDB = typeof msiBenchmarkConfig.$inferSelect;
export type InsertMsiBenchmarkConfig = z.infer<typeof insertMsiBenchmarkConfigSchema>;

// MSI Benchmark API type
export const msiBenchmarkSchema = z.object({
  id: z.string(),
  name: z.string(),
  therapeuticArea: z.string().nullable(),
  brandName: z.string().nullable(),
  thresholds: z.object({
    underexposed: z.number(),
    safe: z.number(),
    approaching: z.number(),
    shift: z.number(),
    blocked: z.number(),
  }),
  stageModifiers: z.object({
    awareness: z.number(),
    consideration: z.number(),
    trial: z.number(),
    loyalty: z.number(),
  }),
  stageTouchThresholds: z.object({
    awareness: z.number(),
    consideration: z.number(),
    trial: z.number(),
    loyalty: z.number(),
  }),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type MsiBenchmark = z.infer<typeof msiBenchmarkSchema>;

// Create/Update benchmark request
export const createMsiBenchmarkRequestSchema = z.object({
  name: z.string().min(1).max(200),
  therapeuticArea: z.string().optional(),
  brandName: z.string().optional(),
  thresholds: z.object({
    underexposed: z.number().min(0).max(100).optional(),
    safe: z.number().min(0).max(100).optional(),
    approaching: z.number().min(0).max(100).optional(),
    shift: z.number().min(0).max(100).optional(),
    blocked: z.number().min(0).max(100).optional(),
  }).optional(),
  stageModifiers: z.object({
    awareness: z.number().min(0).max(2).optional(),
    consideration: z.number().min(0).max(2).optional(),
    trial: z.number().min(0).max(2).optional(),
    loyalty: z.number().min(0).max(2).optional(),
  }).optional(),
  stageTouchThresholds: z.object({
    awareness: z.number().min(1).optional(),
    consideration: z.number().min(1).optional(),
    trial: z.number().min(1).optional(),
    loyalty: z.number().min(1).optional(),
  }).optional(),
  isDefault: z.boolean().optional(),
});

export type CreateMsiBenchmarkRequest = z.infer<typeof createMsiBenchmarkRequestSchema>;

// Pre-Campaign Saturation Report
export const preCampaignReportSchema = z.object({
  reportId: z.string(),
  generatedAt: z.string(),
  campaignName: z.string(),
  therapeuticArea: z.string().nullable(),
  targetHcpCount: z.number(),
  benchmarkUsed: msiBenchmarkSchema.nullable(),
  summary: z.object({
    avgPortfolioMsi: z.number(),
    hcpsReadyForMessaging: z.number(), // MSI < safeThreshold
    hcpsNeedingCaution: z.number(),    // MSI in approaching zone
    hcpsToAvoid: z.number(),           // MSI >= shiftThreshold
    themeSaturationOverview: z.array(z.object({
      themeId: z.string(),
      themeName: z.string(),
      avgMsi: z.number(),
      recommendedAction: z.string(),
    })),
  }),
  recommendations: z.array(z.object({
    priority: z.enum(["high", "medium", "low"]),
    type: z.enum(["theme_rotation", "audience_reduction", "channel_diversification", "pause_theme", "increase_exposure"]),
    description: z.string(),
    impactedHcpCount: z.number(),
    suggestedThemes: z.array(z.string()).optional(),
  })),
  hcpDetails: z.array(z.object({
    hcpId: z.string(),
    hcpName: z.string(),
    overallMsi: z.number(),
    riskLevel: z.enum(saturationRiskLevels),
    recommendedThemes: z.array(z.string()),
    themesToAvoid: z.array(z.string()),
    adoptionStage: z.enum(adoptionStages).nullable(),
  })),
  exportFormats: z.object({
    csvAvailable: z.boolean(),
    excelAvailable: z.boolean(),
    pdfAvailable: z.boolean(),
  }),
});

export type PreCampaignReport = z.infer<typeof preCampaignReportSchema>;

// Generate Pre-Campaign Report Request
export const generatePreCampaignReportRequestSchema = z.object({
  campaignName: z.string().min(1),
  hcpIds: z.array(z.string()).optional(), // If not provided, use all HCPs
  themeIds: z.array(z.string()).optional(), // If not provided, analyze all active themes
  therapeuticArea: z.string().optional(),
  benchmarkId: z.string().optional(), // If not provided, use default benchmark
  includeHcpDetails: z.boolean().optional().default(true),
});

export type GeneratePreCampaignReportRequest = z.infer<typeof generatePreCampaignReportRequestSchema>;

// Campaign Checklist Item
export const campaignChecklistItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum(["saturation", "compliance", "targeting", "timing", "content"]),
  status: z.enum(["passed", "warning", "failed", "skipped"]),
  details: z.string().nullable(),
  recommendation: z.string().nullable(),
});

export type CampaignChecklistItem = z.infer<typeof campaignChecklistItemSchema>;

// Campaign Launch Checklist
export const campaignLaunchChecklistSchema = z.object({
  campaignName: z.string(),
  generatedAt: z.string(),
  overallStatus: z.enum(["ready", "needs_review", "not_ready"]),
  items: z.array(campaignChecklistItemSchema),
  saturationSummary: z.object({
    totalHcps: z.number(),
    safeToMessage: z.number(),
    needsReview: z.number(),
    doNotMessage: z.number(),
    avgMsi: z.number(),
  }),
});

export type CampaignLaunchChecklist = z.infer<typeof campaignLaunchChecklistSchema>;

// Export Data Format Types
export const saturationExportFormat = z.enum(["csv", "excel", "json"]);
export type SaturationExportFormat = z.infer<typeof saturationExportFormat>;

export const saturationExportRequestSchema = z.object({
  format: saturationExportFormat,
  hcpIds: z.array(z.string()).optional(),
  themeIds: z.array(z.string()).optional(),
  includeComponents: z.boolean().optional().default(false),
  includeBenchmarkComparison: z.boolean().optional().default(true),
});

export type SaturationExportRequest = z.infer<typeof saturationExportRequestSchema>;

// ============================================================================
// PHASE 12C: NEXT BEST ORBIT RECOMMENDATION
// ============================================================================

// NBO Action Types
export const nboActionTypes = [
  "engage",      // Initial engagement with opportunity
  "reinforce",   // Strengthen existing relationship
  "defend",      // Counter competitive pressure
  "nurture",     // Low-touch maintenance
  "expand",      // Multi-channel expansion
  "pause",       // Reduce frequency due to saturation
  "reactivate",  // Re-engage dormant HCP
] as const;

export type NBOActionType = (typeof nboActionTypes)[number];

// NBO Confidence Levels
export const nboConfidenceLevels = ["high", "medium", "low"] as const;
export type NBOConfidenceLevel = (typeof nboConfidenceLevels)[number];

// NBO Status
export const nboStatuses = ["pending", "accepted", "deferred", "overridden", "expired"] as const;
export type NBOStatus = (typeof nboStatuses)[number];

// NBO Input Weights (for transparency)
export const nboInputWeightsSchema = z.object({
  engagementTrajectory: z.number().min(0).max(1).default(0.20),
  adoptionStage: z.number().min(0).max(1).default(0.15),
  channelAffinity: z.number().min(0).max(1).default(0.20),
  messageSaturation: z.number().min(0).max(1).default(0.20),
  competitivePressure: z.number().min(0).max(1).default(0.15),
  recentTouchHistory: z.number().min(0).max(1).default(0.10),
});

export type NBOInputWeights = z.infer<typeof nboInputWeightsSchema>;

// Default weights
export const DEFAULT_NBO_WEIGHTS: NBOInputWeights = {
  engagementTrajectory: 0.20,
  adoptionStage: 0.15,
  channelAffinity: 0.20,
  messageSaturation: 0.20,
  competitivePressure: 0.15,
  recentTouchHistory: 0.10,
};

// NBO Input Snapshot - captures all decision inputs for auditability
export const nboInputSnapshotSchema = z.object({
  // Engagement trajectory
  engagementScore: z.number().nullable(),
  engagementTrend: z.enum(["improving", "stable", "declining"]).nullable(),
  responseRate: z.number().nullable(),

  // Adoption stage
  adoptionStage: z.enum(adoptionStages).nullable(),
  stageConfidence: z.number().nullable(),

  // Channel affinity
  preferredChannel: z.enum(channels).nullable(),
  channelScores: z.record(z.enum(channels), z.number()).nullable(),
  channelHealth: z.record(z.enum(channels), z.enum(["active", "opportunity", "declining", "blocked", "dark"])).nullable(),

  // Message saturation (MSI)
  overallMsi: z.number().nullable(),
  msiRiskLevel: z.enum(saturationRiskLevels).nullable(),
  saturatedThemes: z.array(z.string()).nullable(),
  availableThemes: z.array(z.string()).nullable(),

  // Competitive pressure (CPI)
  cpi: z.number().nullable(),
  cpiRiskLevel: z.enum(["low", "medium", "high", "critical"]).nullable(),
  topCompetitor: z.string().nullable(),
  competitiveFlag: z.string().nullable(),

  // Recent touch history
  daysSinceLastTouch: z.number().nullable(),
  touchesLast30Days: z.number().nullable(),
  touchesLast90Days: z.number().nullable(),

  // Weights used
  weights: nboInputWeightsSchema,

  // Timestamp
  capturedAt: z.string(),
});

export type NBOInputSnapshot = z.infer<typeof nboInputSnapshotSchema>;

// NBO Component Scores - individual signal contributions
export const nboComponentScoresSchema = z.object({
  engagementScore: z.number(), // -1 to 1
  adoptionScore: z.number(),   // -1 to 1
  channelScore: z.number(),    // -1 to 1
  saturationScore: z.number(), // -1 to 1 (negative = saturated)
  competitiveScore: z.number(),// -1 to 1 (positive = under threat)
  recencyScore: z.number(),    // -1 to 1

  // Weighted composite
  compositeScore: z.number(),  // 0 to 100
});

export type NBOComponentScores = z.infer<typeof nboComponentScoresSchema>;

// Next Best Orbit Recommendation Fact Table
export const nextBestOrbitRecommendationFact = pgTable("next_best_orbit_recommendation_fact", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hcpId: varchar("hcp_id").notNull().references(() => hcpProfiles.id),

  // Recommendation
  recommendedChannel: varchar("recommended_channel", { length: 50 }).notNull(),
  recommendedTheme: varchar("recommended_theme", { length: 200 }),
  actionType: varchar("action_type", { length: 50 }).notNull(),

  // Confidence and scoring
  confidence: real("confidence").notNull(),
  confidenceLevel: varchar("confidence_level", { length: 20 }).notNull(),
  compositeScore: real("composite_score").notNull(),
  componentScores: jsonb("component_scores").$type<NBOComponentScores>(),

  // Rationale
  rationale: text("rationale").notNull(),
  keyFactors: jsonb("key_factors").$type<string[]>(),

  // Expected impact
  expectedImpactMin: real("expected_impact_min"),
  expectedImpactMax: real("expected_impact_max"),

  // Input snapshot for auditability
  inputs: jsonb("inputs").$type<NBOInputSnapshot>(),

  // Lifecycle
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  validUntil: timestamp("valid_until"),
  acceptedAt: timestamp("accepted_at"),
  acceptedBy: varchar("accepted_by", { length: 100 }),
  overrideReason: text("override_reason"),

  // Outcome tracking
  outcomeRecorded: boolean("outcome_recorded").notNull().default(false),
  actualOutcome: real("actual_outcome"),
  outcomeRecordedAt: timestamp("outcome_recorded_at"),
});

export const insertNBORecommendationSchema = createInsertSchema(nextBestOrbitRecommendationFact).omit({
  id: true,
  generatedAt: true,
});

export type NBORecommendationDB = typeof nextBestOrbitRecommendationFact.$inferSelect;
export type InsertNBORecommendation = z.infer<typeof insertNBORecommendationSchema>;

// NBO Recommendation API Type
export const nboRecommendationSchema = z.object({
  id: z.string(),
  hcpId: z.string(),
  hcpName: z.string().optional(),

  // Recommendation
  recommendedChannel: z.enum(channels),
  recommendedTheme: z.string().nullable(),
  actionType: z.enum(nboActionTypes),

  // Confidence
  confidence: z.number(),
  confidenceLevel: z.enum(nboConfidenceLevels),
  compositeScore: z.number(),
  componentScores: nboComponentScoresSchema.optional(),

  // Rationale
  rationale: z.string(),
  keyFactors: z.array(z.string()),

  // Expected impact
  expectedImpact: z.object({
    min: z.number().nullable(),
    max: z.number().nullable(),
    description: z.string(),
  }),

  // Input snapshot
  inputs: nboInputSnapshotSchema.optional(),

  // Status
  status: z.enum(nboStatuses),
  generatedAt: z.string(),
  validUntil: z.string().nullable(),

  // Urgency derived from inputs
  urgency: z.enum(["high", "medium", "low"]),

  // Phase 15: Temporal bucket for Direct Mode display
  urgencyBucket: z.enum(["act-now", "this-week", "backlog"]).optional(),
});

export type NBORecommendation = z.infer<typeof nboRecommendationSchema>;

// NBO Generation Request
export const generateNBORequestSchema = z.object({
  hcpIds: z.array(z.string()).optional(),
  limit: z.number().min(1).max(1000).optional(),
  weights: nboInputWeightsSchema.partial().optional(),
  minConfidence: z.number().min(0).max(1).optional(),
  includeInputs: z.boolean().optional().default(false),
  validityHours: z.number().min(1).max(168).optional().default(24), // 1 hour to 1 week
});

export type GenerateNBORequest = z.infer<typeof generateNBORequestSchema>;

// NBO Batch Result
export const nboBatchResultSchema = z.object({
  recommendations: z.array(nboRecommendationSchema),
  summary: z.object({
    total: z.number(),
    byConfidence: z.object({
      high: z.number(),
      medium: z.number(),
      low: z.number(),
    }),
    byAction: z.record(z.enum(nboActionTypes), z.number()),
    byChannel: z.record(z.enum(channels), z.number()),
    avgConfidence: z.number(),
    avgCompositeScore: z.number(),
  }),
  generatedAt: z.string(),
});

export type NBOBatchResult = z.infer<typeof nboBatchResultSchema>;

// NBO Update Request (for accepting/overriding)
export const updateNBOStatusRequestSchema = z.object({
  status: z.enum(["accepted", "deferred", "overridden"]),
  acceptedBy: z.string().optional(),
  overrideReason: z.string().optional(),
});

export type UpdateNBOStatusRequest = z.infer<typeof updateNBOStatusRequestSchema>;

// NBO Outcome Recording
export const recordNBOOutcomeRequestSchema = z.object({
  actualOutcome: z.number().min(0).max(100),
  notes: z.string().optional(),
});

export type RecordNBOOutcomeRequest = z.infer<typeof recordNBOOutcomeRequestSchema>;

// NBO Decision Rule - for rule-based fast path
export const nboDecisionRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  priority: z.number(), // Lower = higher priority

  // Conditions
  conditions: z.object({
    msiRange: z.object({ min: z.number().optional(), max: z.number().optional() }).optional(),
    cpiRange: z.object({ min: z.number().optional(), max: z.number().optional() }).optional(),
    adoptionStages: z.array(z.enum(adoptionStages)).optional(),
    channelHealthStatus: z.array(z.enum(["active", "opportunity", "declining", "blocked", "dark"])).optional(),
    daysSinceLastTouchRange: z.object({ min: z.number().optional(), max: z.number().optional() }).optional(),
    engagementTrend: z.enum(["improving", "stable", "declining"]).optional(),
  }),

  // Outcome
  outcome: z.object({
    actionType: z.enum(nboActionTypes),
    confidenceBoost: z.number().default(0),
    rationaleTemplate: z.string(),
  }),

  isActive: z.boolean().default(true),
});

export type NBODecisionRule = z.infer<typeof nboDecisionRuleSchema>;

// ============================================================================
// PHASE 12C.4: NBO LEARNING LOOP
// ============================================================================

// Feedback types for NBO recommendations
export const nboFeedbackTypes = [
  "accepted",     // User accepted the recommendation
  "rejected",     // User rejected the recommendation
  "modified",     // User modified then executed
  "deferred",     // User deferred for later
  "expired",      // Recommendation expired without action
  "executed",     // Recommendation was executed
] as const;

export type NBOFeedbackType = (typeof nboFeedbackTypes)[number];

// Outcome types for measuring recommendation success
export const nboOutcomeTypes = [
  "engagement_improved",    // Engagement score increased
  "engagement_declined",    // Engagement score decreased
  "engagement_stable",      // No significant change
  "competitive_defended",   // Competitive threat neutralized
  "competitive_lost",       // Lost to competitor
  "channel_activated",      // Channel became active
  "relationship_reactivated", // Dormant HCP re-engaged
  "saturation_reduced",     // MSI decreased
  "pending",                // Outcome not yet measured
] as const;

export type NBOOutcomeType = (typeof nboOutcomeTypes)[number];

// NBO Feedback Table - tracks recommendation outcomes
export const nboFeedbackFact = pgTable("nbo_feedback_fact", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recommendationId: varchar("recommendation_id").notNull(),
  hcpId: varchar("hcp_id").notNull().references(() => hcpProfiles.id),

  // What was recommended
  recommendedAction: varchar("recommended_action", { length: 50 }).notNull(),
  recommendedChannel: varchar("recommended_channel", { length: 50 }).notNull(),
  recommendedTheme: varchar("recommended_theme", { length: 200 }),
  originalConfidence: real("original_confidence").notNull(),

  // User feedback
  feedbackType: varchar("feedback_type", { length: 50 }).notNull(),
  feedbackBy: varchar("feedback_by", { length: 100 }),
  feedbackAt: timestamp("feedback_at").notNull().defaultNow(),
  feedbackReason: text("feedback_reason"),

  // If modified, what was actually executed
  executedAction: varchar("executed_action", { length: 50 }),
  executedChannel: varchar("executed_channel", { length: 50 }),
  executedTheme: varchar("executed_theme", { length: 200 }),
  executedAt: timestamp("executed_at"),

  // Outcome measurement
  outcomeType: varchar("outcome_type", { length: 50 }),
  outcomeValue: real("outcome_value"), // e.g., engagement change %
  outcomeMeasuredAt: timestamp("outcome_measured_at"),
  measurementPeriodDays: integer("measurement_period_days").default(30),

  // Before/After metrics for learning
  engagementBefore: real("engagement_before"),
  engagementAfter: real("engagement_after"),
  msiBefore: real("msi_before"),
  msiAfter: real("msi_after"),
  cpiBefore: real("cpi_before"),
  cpiAfter: real("cpi_after"),

  // Learning flags
  usedForTraining: boolean("used_for_training").default(false),
  trainingBatchId: varchar("training_batch_id", { length: 100 }),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNBOFeedbackSchema = createInsertSchema(nboFeedbackFact).omit({
  id: true,
  createdAt: true,
});

export type NBOFeedbackDB = typeof nboFeedbackFact.$inferSelect;
export type InsertNBOFeedback = z.infer<typeof insertNBOFeedbackSchema>;

// NBO Feedback Recording Request
export const recordNBOFeedbackRequestSchema = z.object({
  recommendationId: z.string(),
  feedbackType: z.enum(nboFeedbackTypes),
  feedbackBy: z.string().optional(),
  feedbackReason: z.string().optional(),
  executedAction: z.enum(nboActionTypes).optional(),
  executedChannel: z.enum(channels).optional(),
  executedTheme: z.string().optional(),
});

export type RecordNBOFeedbackRequest = z.infer<typeof recordNBOFeedbackRequestSchema>;

// NBO Outcome Measurement Request
export const measureNBOOutcomeRequestSchema = z.object({
  feedbackId: z.string(),
  outcomeType: z.enum(nboOutcomeTypes),
  outcomeValue: z.number().optional(),
  engagementAfter: z.number().optional(),
  msiAfter: z.number().optional(),
  cpiAfter: z.number().optional(),
});

export type MeasureNBOOutcomeRequest = z.infer<typeof measureNBOOutcomeRequestSchema>;

// NBO Learning Metrics Schema
export const nboLearningMetricsSchema = z.object({
  period: z.string(), // e.g., "2024-01", "last_30_days"

  // Volume metrics
  totalRecommendations: z.number(),
  acceptedCount: z.number(),
  rejectedCount: z.number(),
  modifiedCount: z.number(),
  expiredCount: z.number(),

  // Acceptance rates
  overallAcceptanceRate: z.number(),
  acceptanceByAction: z.record(z.enum(nboActionTypes), z.number()),
  acceptanceByConfidence: z.object({
    high: z.number(),
    medium: z.number(),
    low: z.number(),
  }),

  // Outcome metrics
  measuredCount: z.number(),
  positiveOutcomeRate: z.number(), // % of executed recommendations with positive outcome
  avgEngagementChange: z.number(),
  avgMsiChange: z.number(),

  // Confidence calibration
  calibrationScore: z.number(), // How well confidence predicts success (0-1)
  calibrationByBucket: z.array(z.object({
    confidenceRange: z.string(), // e.g., "0.7-0.8"
    predictedSuccessRate: z.number(),
    actualSuccessRate: z.number(),
    sampleSize: z.number(),
  })),

  // Action effectiveness
  actionEffectiveness: z.array(z.object({
    action: z.enum(nboActionTypes),
    recommendedCount: z.number(),
    executedCount: z.number(),
    positiveOutcomeCount: z.number(),
    avgOutcomeValue: z.number(),
  })),

  // Channel effectiveness
  channelEffectiveness: z.array(z.object({
    channel: z.enum(channels),
    recommendedCount: z.number(),
    executedCount: z.number(),
    positiveOutcomeCount: z.number(),
    avgOutcomeValue: z.number(),
  })),

  generatedAt: z.string(),
});

export type NBOLearningMetrics = z.infer<typeof nboLearningMetricsSchema>;

// NBO Model Performance Summary
export const nboModelPerformanceSchema = z.object({
  // Overall health
  overallHealth: z.enum(["excellent", "good", "fair", "poor"]),
  healthScore: z.number().min(0).max(100),

  // Key indicators
  indicators: z.array(z.object({
    name: z.string(),
    value: z.number(),
    trend: z.enum(["improving", "stable", "declining"]),
    target: z.number().optional(),
    status: z.enum(["on_track", "warning", "critical"]),
  })),

  // Recommendations for model improvement
  improvementSuggestions: z.array(z.object({
    area: z.string(),
    issue: z.string(),
    suggestion: z.string(),
    priority: z.enum(["high", "medium", "low"]),
  })),

  // Training readiness
  trainingReadiness: z.object({
    newFeedbackSinceLastTraining: z.number(),
    minFeedbackForTraining: z.number(),
    isReadyForTraining: z.boolean(),
    estimatedImprovementPotential: z.number().optional(),
  }),

  lastUpdated: z.string(),
});

export type NBOModelPerformance = z.infer<typeof nboModelPerformanceSchema>;

// ============================================================================
// PROMPT ANALYTICS (Phase 12D.4)
// ============================================================================

/**
 * Prompt types for analytics tracking
 */
export const promptTypes = ["system", "role", "task", "guardrail"] as const;
export type PromptType = (typeof promptTypes)[number];

/**
 * Prompt usage tracking - records each time a prompt is invoked
 */
export const promptUsage = pgTable("prompt_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Prompt identification
  promptId: varchar("prompt_id", { length: 100 }).notNull(),
  promptVersion: varchar("prompt_version", { length: 20 }).notNull(),
  promptType: varchar("prompt_type", { length: 20 }).notNull(), // PromptType

  // Usage context
  agentType: varchar("agent_type", { length: 50 }),
  agentRunId: varchar("agent_run_id"),
  userId: varchar("user_id"),
  roleType: varchar("role_type", { length: 50 }), // User persona
  sessionId: varchar("session_id", { length: 100 }),

  // Task context
  taskType: varchar("task_type", { length: 100 }), // cohort-analysis, competitive-assessment, etc.
  taskComplexity: varchar("task_complexity", { length: 20 }), // simple, moderate, complex

  // Performance metrics
  responseTimeMs: integer("response_time_ms"),
  tokensUsed: integer("tokens_used"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),

  // Outcome tracking
  wasSuccessful: boolean("was_successful"),
  userSatisfactionScore: integer("user_satisfaction_score"), // 1-5
  hadCorrection: boolean("had_correction").default(false),
  correctionId: varchar("correction_id"),

  // A/B testing
  abTestGroup: varchar("ab_test_group", { length: 20 }), // control, variant_a, variant_b
  abTestId: varchar("ab_test_id", { length: 100 }),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPromptUsageSchema = createInsertSchema(promptUsage).omit({
  id: true,
  createdAt: true,
});

export type InsertPromptUsage = z.infer<typeof insertPromptUsageSchema>;
export type PromptUsageDB = typeof promptUsage.$inferSelect;

/**
 * Prompt correction types
 */
export const correctionTypes = [
  "factual_error",      // Agent stated something incorrect
  "missing_context",    // Agent missed relevant information
  "wrong_format",       // Output format was incorrect
  "tone_issue",         // Tone was inappropriate for context
  "compliance_issue",   // Output violated compliance rules
  "hallucination",      // Agent made up information
  "incomplete",         // Response was incomplete
  "irrelevant",         // Response didn't address the question
  "other",
] as const;

export type CorrectionType = (typeof correctionTypes)[number];

/**
 * Prompt corrections - tracks when users override or correct agent outputs
 */
export const promptCorrections = pgTable("prompt_corrections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Link to usage event
  usageId: varchar("usage_id").references(() => promptUsage.id),

  // Prompt that produced the output
  promptId: varchar("prompt_id", { length: 100 }).notNull(),
  promptVersion: varchar("prompt_version", { length: 20 }).notNull(),

  // Who corrected
  correctedBy: varchar("corrected_by", { length: 100 }).notNull(),
  userRole: varchar("user_role", { length: 50 }),

  // Correction details
  correctionType: varchar("correction_type", { length: 50 }).notNull(), // CorrectionType
  severity: varchar("severity", { length: 20 }).notNull(), // minor, moderate, major, critical

  // Content comparison
  originalOutput: text("original_output"),
  correctedOutput: text("corrected_output"),
  correctionNotes: text("correction_notes"),

  // Categorization for learning
  affectedSection: varchar("affected_section", { length: 100 }), // Which part of prompt caused issue
  suggestedImprovement: text("suggested_improvement"),

  // Resolution tracking
  status: varchar("status", { length: 20 }).default("pending"), // pending, reviewed, incorporated, dismissed
  reviewedBy: varchar("reviewed_by", { length: 100 }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPromptCorrectionSchema = createInsertSchema(promptCorrections).omit({
  id: true,
  createdAt: true,
});

export type InsertPromptCorrection = z.infer<typeof insertPromptCorrectionSchema>;
export type PromptCorrectionDB = typeof promptCorrections.$inferSelect;

/**
 * A/B test status values
 */
export const abTestStatuses = ["draft", "active", "paused", "completed", "cancelled"] as const;
export type ABTestStatus = (typeof abTestStatuses)[number];

/**
 * Prompt A/B tests - manages prompt variation experiments
 */
export const promptAbTests = pgTable("prompt_ab_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Test identity
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  hypothesis: text("hypothesis"),

  // Test configuration
  basePromptId: varchar("base_prompt_id", { length: 100 }).notNull(),
  variantPromptId: varchar("variant_prompt_id", { length: 100 }).notNull(),

  // Targeting
  targetRoles: jsonb("target_roles").$type<string[]>(), // null = all roles
  targetTaskTypes: jsonb("target_task_types").$type<string[]>(), // null = all tasks
  trafficSplitPercent: integer("traffic_split_percent").default(50), // % to variant

  // Success metrics
  primaryMetric: varchar("primary_metric", { length: 50 }).notNull(), // satisfaction, accuracy, completion_rate
  secondaryMetrics: jsonb("secondary_metrics").$type<string[]>(),
  minimumSampleSize: integer("minimum_sample_size").default(100),

  // Results
  controlUsageCount: integer("control_usage_count").default(0),
  variantUsageCount: integer("variant_usage_count").default(0),
  controlSuccessRate: real("control_success_rate"),
  variantSuccessRate: real("variant_success_rate"),
  controlAvgSatisfaction: real("control_avg_satisfaction"),
  variantAvgSatisfaction: real("variant_avg_satisfaction"),
  statisticalSignificance: real("statistical_significance"),

  // Winner determination
  winner: varchar("winner", { length: 20 }), // control, variant, inconclusive
  winnerRationale: text("winner_rationale"),

  // Status and timeline
  status: varchar("status", { length: 20 }).default("draft"), // ABTestStatus
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),

  createdBy: varchar("created_by", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPromptAbTestSchema = createInsertSchema(promptAbTests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPromptAbTest = z.infer<typeof insertPromptAbTestSchema>;
export type PromptAbTestDB = typeof promptAbTests.$inferSelect;

// ============================================================================
// PROMPT ANALYTICS API TYPES
// ============================================================================

/**
 * Prompt usage statistics aggregation
 */
export const promptUsageStatsSchema = z.object({
  promptId: z.string(),
  promptVersion: z.string(),
  promptType: z.enum(promptTypes),

  // Usage counts
  totalUsage: z.number(),
  usageByRole: z.record(z.string(), z.number()),
  usageByTask: z.record(z.string(), z.number()),

  // Performance
  avgResponseTimeMs: z.number(),
  avgTokensUsed: z.number(),
  successRate: z.number(),
  avgSatisfactionScore: z.number().nullable(),

  // Quality
  correctionRate: z.number(),
  correctionsByType: z.record(z.string(), z.number()),

  // Trends
  usageTrend: z.array(z.object({
    date: z.string(),
    count: z.number(),
    successRate: z.number(),
  })),

  period: z.object({
    start: z.string(),
    end: z.string(),
  }),
});

export type PromptUsageStats = z.infer<typeof promptUsageStatsSchema>;

/**
 * Prompt correction summary for improvement pipeline
 */
export const promptCorrectionSummarySchema = z.object({
  promptId: z.string(),
  promptVersion: z.string(),

  totalCorrections: z.number(),
  pendingReview: z.number(),
  incorporated: z.number(),

  // Breakdown by type
  byType: z.array(z.object({
    type: z.enum(correctionTypes),
    count: z.number(),
    avgSeverity: z.number(),
  })),

  // Most common issues
  topIssues: z.array(z.object({
    section: z.string(),
    issueCount: z.number(),
    suggestedFix: z.string().nullable(),
  })),

  // Improvement suggestions
  improvementPriority: z.enum(["high", "medium", "low"]),
  suggestedActions: z.array(z.string()),
});

export type PromptCorrectionSummary = z.infer<typeof promptCorrectionSummarySchema>;

/**
 * A/B test results summary
 */
export const abTestResultsSchema = z.object({
  testId: z.string(),
  name: z.string(),
  status: z.enum(abTestStatuses),

  // Sample sizes
  controlSampleSize: z.number(),
  variantSampleSize: z.number(),
  totalSampleSize: z.number(),

  // Primary metric comparison
  primaryMetric: z.string(),
  controlValue: z.number(),
  variantValue: z.number(),
  percentChange: z.number(),

  // Statistical analysis
  pValue: z.number().nullable(),
  confidenceInterval: z.object({
    lower: z.number(),
    upper: z.number(),
  }).nullable(),
  isSignificant: z.boolean(),

  // Recommendation
  recommendation: z.enum(["adopt_variant", "keep_control", "extend_test", "inconclusive"]),
  rationale: z.string(),

  // Timeline
  daysRunning: z.number(),
  estimatedDaysToSignificance: z.number().nullable(),
});

export type ABTestResults = z.infer<typeof abTestResultsSchema>;

/**
 * Overall prompt health dashboard
 */
export const promptHealthDashboardSchema = z.object({
  // Overview
  totalPromptsActive: z.number(),
  totalUsageLast30Days: z.number(),
  overallSuccessRate: z.number(),
  overallSatisfactionScore: z.number().nullable(),

  // Quality indicators
  promptsNeedingAttention: z.array(z.object({
    promptId: z.string(),
    promptName: z.string(),
    issue: z.string(),
    severity: z.enum(["warning", "critical"]),
    metric: z.string(),
    currentValue: z.number(),
    threshold: z.number(),
  })),

  // Correction insights
  totalCorrectionsLast30Days: z.number(),
  correctionTrend: z.enum(["increasing", "stable", "decreasing"]),
  topCorrectionTypes: z.array(z.object({
    type: z.string(),
    count: z.number(),
  })),

  // A/B testing status
  activeTests: z.number(),
  testsReadyForDecision: z.number(),
  recentWinners: z.array(z.object({
    testName: z.string(),
    winner: z.string(),
    improvement: z.number(),
  })),

  // Improvement pipeline
  pendingImprovements: z.number(),
  improvementsThisMonth: z.number(),

  generatedAt: z.string(),
});

export type PromptHealthDashboard = z.infer<typeof promptHealthDashboardSchema>;

// ============================================================================
// PHASE 12A.3: COMPETITIVE ALERT CONFIGURATION
// ============================================================================

/**
 * Competitive Alert Configuration Table
 *
 * Stores configurable thresholds for competitive alerts, allowing
 * different sensitivity levels per therapeutic area, brand, or globally.
 */
export const competitiveAlertConfig = pgTable("competitive_alert_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: varchar("description", { length: 500 }),

  // Scope - can be global, per-TA, or per-competitor
  scope: varchar("scope", { length: 20 }).notNull().default("global"), // 'global', 'therapeutic_area', 'competitor'
  therapeuticArea: varchar("therapeutic_area", { length: 100 }), // null = applies to all
  competitorId: varchar("competitor_id", { length: 100 }), // null = applies to all

  // CPI Thresholds
  criticalCpiThreshold: real("critical_cpi_threshold").notNull().default(75),
  warningCpiThreshold: real("warning_cpi_threshold").notNull().default(50),

  // Trend Thresholds
  cpiTrendThreshold: real("cpi_trend_threshold").notNull().default(10), // % QoQ change
  shareErosionThreshold: real("share_erosion_threshold").notNull().default(5), // % share loss
  engagementAsymmetryThreshold: real("engagement_asymmetry_threshold").notNull().default(20), // point difference

  // Alert Settings
  alertFrequency: varchar("alert_frequency", { length: 20 }).notNull().default("daily"), // 'realtime', 'daily', 'weekly'
  suppressDuplicateHours: integer("suppress_duplicate_hours").notNull().default(24),
  isActive: boolean("is_active").notNull().default(true),

  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: varchar("created_by", { length: 100 }),
});

export const insertCompetitiveAlertConfigSchema = createInsertSchema(competitiveAlertConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCompetitiveAlertConfig = z.infer<typeof insertCompetitiveAlertConfigSchema>;
export type CompetitiveAlertConfigDB = typeof competitiveAlertConfig.$inferSelect;

// API type for alert configuration
export const competitiveAlertConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  scope: z.enum(["global", "therapeutic_area", "competitor"]),
  therapeuticArea: z.string().nullable(),
  competitorId: z.string().nullable(),
  criticalCpiThreshold: z.number().min(0).max(100),
  warningCpiThreshold: z.number().min(0).max(100),
  cpiTrendThreshold: z.number().min(0).max(100),
  shareErosionThreshold: z.number().min(0).max(100),
  engagementAsymmetryThreshold: z.number().min(0).max(100),
  alertFrequency: z.enum(["realtime", "daily", "weekly"]),
  suppressDuplicateHours: z.number().min(0),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string().nullable(),
});

export type CompetitiveAlertConfig = z.infer<typeof competitiveAlertConfigSchema>;

// Request type for creating/updating alert config
export const createCompetitiveAlertConfigSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  scope: z.enum(["global", "therapeutic_area", "competitor"]).default("global"),
  therapeuticArea: z.string().optional(),
  competitorId: z.string().optional(),
  criticalCpiThreshold: z.number().min(0).max(100).default(75),
  warningCpiThreshold: z.number().min(0).max(100).default(50),
  cpiTrendThreshold: z.number().min(0).max(100).default(10),
  shareErosionThreshold: z.number().min(0).max(100).default(5),
  engagementAsymmetryThreshold: z.number().min(0).max(100).default(20),
  alertFrequency: z.enum(["realtime", "daily", "weekly"]).default("daily"),
  suppressDuplicateHours: z.number().min(0).default(24),
  isActive: z.boolean().default(true),
});

export type CreateCompetitiveAlertConfig = z.infer<typeof createCompetitiveAlertConfigSchema>;

// Alert thresholds resolved for a specific context
export const resolvedAlertThresholdsSchema = z.object({
  criticalCpi: z.number(),
  warningCpi: z.number(),
  cpiTrendThreshold: z.number(),
  shareErosionThreshold: z.number(),
  engagementAsymmetryThreshold: z.number(),
  sourceConfigId: z.string().nullable(), // which config these came from
  sourceConfigName: z.string().nullable(),
});

export type ResolvedAlertThresholds = z.infer<typeof resolvedAlertThresholdsSchema>;

// ============================================================================
// INSIGHTRX INTEGRATION SCHEMA ADDITIONS
// ============================================================================

// Token types for tiered authentication
export const tokenTypes = ["user", "service", "api_key"] as const;
export type TokenType = (typeof tokenTypes)[number];

// Auth scopes for fine-grained access control
export const authScopes = [
  "content:read",
  "content:write",
  "insightrx:validate",
  "insightrx:knowledge",
  "omnivoice:query",
  "admin:*",
] as const;
export type AuthScope = (typeof authScopes)[number];

// ============================================================================
// API TOKENS (JWT/Service Token/API Key Storage)
// ============================================================================

export const apiTokens = pgTable("api_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  name: varchar("name", { length: 100 }).notNull(),

  // Token hash (SHA-256 of actual token - we never store raw tokens)
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),

  // Token metadata
  tokenType: varchar("token_type", { length: 20 }).notNull(), // 'user' | 'service' | 'api_key'
  scopes: jsonb("scopes").$type<AuthScope[]>().notNull(),

  // Usage tracking
  lastUsedAt: timestamp("last_used_at"),
  usageCount: integer("usage_count").default(0),

  // Lifecycle
  expiresAt: timestamp("expires_at"),
  revokedAt: timestamp("revoked_at"),
  revokedReason: varchar("revoked_reason", { length: 200 }),

  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  tokenHashIdx: index("api_tokens_hash_idx").on(table.tokenHash),
  userIdIdx: index("api_tokens_user_idx").on(table.userId),
  tokenTypeIdx: index("api_tokens_type_idx").on(table.tokenType),
}));

export const insertApiTokenSchema = createInsertSchema(apiTokens).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
  usageCount: true,
});

export type InsertApiToken = z.infer<typeof insertApiTokenSchema>;
export type ApiTokenDB = typeof apiTokens.$inferSelect;

// API Token (API response type - excludes sensitive data)
export const apiTokenSchema = z.object({
  id: z.string(),
  name: z.string(),
  tokenType: z.enum(tokenTypes),
  scopes: z.array(z.enum(authScopes)),
  lastUsedAt: z.string().nullable(),
  usageCount: z.number(),
  expiresAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
  createdAt: z.string(),
});

export type ApiToken = z.infer<typeof apiTokenSchema>;

// JWT Payload structure
export const jwtPayloadSchema = z.object({
  sub: z.string(), // User ID
  roles: z.array(z.string()).optional(),
  scopes: z.array(z.enum(authScopes)),
  aud: z.array(z.string()), // Audiences: ['twinengine', 'insightrx', 'omnivoice']
  typ: z.enum(tokenTypes),
  iat: z.number(),
  exp: z.number(),
  jti: z.string().optional(), // Token ID for revocation tracking
});

export type JWTPayload = z.infer<typeof jwtPayloadSchema>;

// Token creation request
export const createApiTokenRequestSchema = z.object({
  name: z.string().min(1).max(100),
  tokenType: z.enum(tokenTypes),
  scopes: z.array(z.enum(authScopes)),
  expiresInDays: z.number().min(1).max(365).optional(),
});

export type CreateApiTokenRequest = z.infer<typeof createApiTokenRequestSchema>;

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export const featureFlags = pgTable("feature_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  flagKey: varchar("flag_key", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),

  // Status
  enabled: boolean("enabled").default(false),

  // Rollout configuration
  rolloutPercentage: integer("rollout_percentage").default(0), // 0-100

  // Targeting
  targetUsers: jsonb("target_users").$type<string[]>(), // Specific user IDs
  targetRoles: jsonb("target_roles").$type<string[]>(), // Role-based targeting

  // Metadata
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  flagKeyIdx: index("feature_flags_key_idx").on(table.flagKey),
}));

export const insertFeatureFlagSchema = createInsertSchema(featureFlags).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;
export type FeatureFlagDB = typeof featureFlags.$inferSelect;

// Feature Flag (API type)
export const featureFlagSchema = z.object({
  id: z.string(),
  flagKey: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  enabled: z.boolean(),
  rolloutPercentage: z.number().min(0).max(100),
  targetUsers: z.array(z.string()).nullable(),
  targetRoles: z.array(z.string()).nullable(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type FeatureFlag = z.infer<typeof featureFlagSchema>;

// Feature flag evaluation context
export const featureFlagContextSchema = z.object({
  userId: z.string().optional(),
  roles: z.array(z.string()).optional(),
  attributes: z.record(z.unknown()).optional(),
});

export type FeatureFlagContext = z.infer<typeof featureFlagContextSchema>;

// ============================================================================
// KNOWLEDGE CONTENT (InsightRx Knowledge Base)
// ============================================================================

// Content types for knowledge base
export const knowledgeContentTypes = [
  "research",
  "guideline",
  "campaign",
  "benchmark",
  "market_research",
  "field_promotion",
  "market_access",
  "digital_media",
  "advertising",
  "regulatory",
] as const;

export type KnowledgeContentType = (typeof knowledgeContentTypes)[number];

export const knowledgeContent = pgTable("knowledge_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Content
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  contentType: varchar("content_type", { length: 50 }).notNull(),

  // Source attribution
  source: varchar("source", { length: 200 }),
  sourceUrl: varchar("source_url", { length: 500 }),

  // Context (from InsightRx domain model)
  audienceContext: jsonb("audience_context").$type<KnowledgeAudienceContext>(),
  marketContext: jsonb("market_context").$type<KnowledgeMarketContext>(),
  channelContext: jsonb("channel_context").$type<KnowledgeChannelContext>(),

  // Metadata
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  tags: jsonb("tags").$type<string[]>(),

  // Vector embedding for semantic search (384 dimensions for all-MiniLM-L6-v2)
  // Note: Requires pgvector extension. If not available, this column will be null.
  // Run: CREATE EXTENSION IF NOT EXISTS vector;
  // The column will store as a string representation until vector type is added
  embedding: text("embedding"), // Will be cast to vector(384) at query time

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  contentTypeIdx: index("knowledge_content_type_idx").on(table.contentType),
  createdAtIdx: index("knowledge_created_at_idx").on(table.createdAt),
}));

// Supporting types for knowledge context
export const knowledgeAudienceContextSchema = z.object({
  audience: z.enum(["HCP", "Consumer", "Payer", "Field", "Caregiver"]).optional(),
  specialty: z.string().optional(),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
});

export type KnowledgeAudienceContext = z.infer<typeof knowledgeAudienceContextSchema>;

export const knowledgeMarketContextSchema = z.object({
  therapeuticArea: z.string().optional(),
  brand: z.string().optional(),
  competitors: z.array(z.string()).optional(),
  marketStage: z.enum(["pre-clinical", "clinical", "launch", "post-launch"]).optional(),
});

export type KnowledgeMarketContext = z.infer<typeof knowledgeMarketContextSchema>;

export const knowledgeChannelContextSchema = z.object({
  primaryChannel: z.string().optional(),
  format: z.string().optional(),
  deliveryMode: z.enum(["push", "pull", "hybrid"]).optional(),
});

export type KnowledgeChannelContext = z.infer<typeof knowledgeChannelContextSchema>;

export const insertKnowledgeContentSchema = createInsertSchema(knowledgeContent).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertKnowledgeContent = z.infer<typeof insertKnowledgeContentSchema>;
export type KnowledgeContentDB = typeof knowledgeContent.$inferSelect;

// Knowledge Content (API type)
export const knowledgeContentSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  contentType: z.enum(knowledgeContentTypes),
  source: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  audienceContext: knowledgeAudienceContextSchema.nullable(),
  marketContext: knowledgeMarketContextSchema.nullable(),
  channelContext: knowledgeChannelContextSchema.nullable(),
  metadata: z.record(z.unknown()).nullable(),
  tags: z.array(z.string()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type KnowledgeContent = z.infer<typeof knowledgeContentSchema>;

// Knowledge search request
export const knowledgeSearchRequestSchema = z.object({
  query: z.string().min(1).max(500),
  filters: z.object({
    contentType: z.enum(knowledgeContentTypes).optional(),
    therapeuticArea: z.string().optional(),
    audience: z.string().optional(),
    specialty: z.string().optional(),
  }).optional(),
  limit: z.number().min(1).max(50).default(10),
});

export type KnowledgeSearchRequest = z.infer<typeof knowledgeSearchRequestSchema>;

// Knowledge search result
export const knowledgeSearchResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  contentType: z.string(),
  source: z.string().nullable(),
  similarity: z.number().min(0).max(1),
});

export type KnowledgeSearchResult = z.infer<typeof knowledgeSearchResultSchema>;

// ============================================================================
// CONTENT VALIDATION (InsightRx Validation Results)
// ============================================================================

// Validation statuses
export const validationStatuses = ["approved", "needs_review", "rejected", "pending"] as const;
export type ValidationStatus = (typeof validationStatuses)[number];

// Rule categories
export const ruleCategories = ["compliance", "completeness", "consistency", "quality"] as const;
export type RuleCategory = (typeof ruleCategories)[number];

// Rule severities
export const ruleSeverities = ["error", "warning", "info"] as const;
export type RuleSeverity = (typeof ruleSeverities)[number];

export const contentValidation = pgTable("content_validation", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Reference to the content being validated
  contentId: varchar("content_id", { length: 36 }).notNull(),
  contentType: varchar("content_type", { length: 50 }).notNull(), // 'campaign', 'messaging_theme', etc.

  // Cache key for invalidation
  contentHash: varchar("content_hash", { length: 64 }).notNull(), // SHA-256 of content

  // Validation result
  validationStatus: varchar("validation_status", { length: 20 }).notNull(),
  complianceScore: integer("compliance_score"), // 0-100

  // Detailed results
  validationResults: jsonb("validation_results").$type<ValidationResult>(),

  // Version tracking for cache invalidation
  rulesVersion: varchar("rules_version", { length: 20 }),

  // Review workflow
  reviewedBy: varchar("reviewed_by", { length: 36 }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  contentIdx: index("content_validation_content_idx").on(table.contentId, table.contentType),
  statusIdx: index("content_validation_status_idx").on(table.validationStatus),
  hashIdx: index("content_validation_hash_idx").on(table.contentHash),
}));

// Validation result structure
export const ruleResultSchema = z.object({
  ruleId: z.string(),
  ruleName: z.string(),
  category: z.enum(ruleCategories),
  passed: z.boolean(),
  severity: z.enum(ruleSeverities),
  message: z.string(),
  location: z.object({
    start: z.number(),
    end: z.number(),
  }).optional(),
});

export type RuleResult = z.infer<typeof ruleResultSchema>;

export const validationResultSchema = z.object({
  status: z.enum(validationStatuses),
  score: z.number().min(0).max(100),
  ruleResults: z.array(ruleResultSchema),
  summary: z.string(),
  suggestedFixes: z.array(z.string()).optional(),
});

export type ValidationResult = z.infer<typeof validationResultSchema>;

export const insertContentValidationSchema = createInsertSchema(contentValidation).omit({
  id: true,
  createdAt: true,
});

export type InsertContentValidation = z.infer<typeof insertContentValidationSchema>;
export type ContentValidationDB = typeof contentValidation.$inferSelect;

// Content Validation (API type)
export const contentValidationSchema = z.object({
  id: z.string(),
  contentId: z.string(),
  contentType: z.string(),
  validationStatus: z.enum(validationStatuses),
  complianceScore: z.number().nullable(),
  validationResults: validationResultSchema.nullable(),
  rulesVersion: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  reviewNotes: z.string().nullable(),
  createdAt: z.string(),
});

export type ContentValidation = z.infer<typeof contentValidationSchema>;

// Validation request
export const validateContentRequestSchema = z.object({
  content: z.string().min(1),
  contentType: z.enum(["campaign", "messaging_theme", "email", "landing_page"]),
  audienceContext: knowledgeAudienceContextSchema.optional(),
  channelContext: knowledgeChannelContextSchema.optional(),
  marketContext: knowledgeMarketContextSchema.optional(),
});

export type ValidateContentRequest = z.infer<typeof validateContentRequestSchema>;

// ============================================================================
// PHASE 0: REGULATORY CALENDAR DATA FOUNDATION
// ============================================================================

// Regulatory event types
export const regulatoryEventTypes = [
  "approval",
  "label_update",
  "patent_expiry",
  "exclusivity_expiry",
  "adcom_meeting",
  "phase3_readout",
  "crl",
  "pdufa_date",
  "citizen_petition",
  "rems_update",
] as const;

export type RegulatoryEventType = (typeof regulatoryEventTypes)[number];

// Regulatory event statuses
export const regulatoryEventStatuses = [
  "upcoming",
  "active",
  "completed",
  "cancelled",
  "delayed",
] as const;

export type RegulatoryEventStatus = (typeof regulatoryEventStatuses)[number];

// Regulatory data sources
export const regulatoryDataSources = [
  "openfda",
  "clinicaltrials",
  "federal_register",
  "orange_book",
  "manual",
] as const;

export type RegulatoryDataSource = (typeof regulatoryDataSources)[number];

// Annotation types
export const regulatoryAnnotationTypes = [
  "note",
  "flag",
  "action_item",
  "risk_assessment",
] as const;

export type RegulatoryAnnotationType = (typeof regulatoryAnnotationTypes)[number];

// Impact types
export const regulatoryImpactTypes = [
  "market_access",
  "competitive",
  "formulary",
  "prescribing_behavior",
  "patient_access",
] as const;

export type RegulatoryImpactType = (typeof regulatoryImpactTypes)[number];

// Impact severity
export const regulatoryImpactSeverities = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export type RegulatoryImpactSeverity = (typeof regulatoryImpactSeverities)[number];

// Sync statuses
export const regulatorySyncStatuses = [
  "running",
  "completed",
  "failed",
  "partial",
] as const;

export type RegulatorySyncStatus = (typeof regulatorySyncStatuses)[number];

// --- Regulatory Events Table ---
export const regulatoryEvents = pgTable("regulatory_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  drugName: varchar("drug_name", { length: 200 }).notNull(),
  brandName: varchar("brand_name", { length: 200 }),
  companyName: varchar("company_name", { length: 200 }),
  therapeuticArea: varchar("therapeutic_area", { length: 100 }),
  eventDate: timestamp("event_date").notNull(),
  eventEndDate: timestamp("event_end_date"),
  status: varchar("status", { length: 30 }).notNull().default("upcoming"),
  source: varchar("source", { length: 50 }).notNull(),
  sourceId: varchar("source_id", { length: 200 }),
  sourceUrl: varchar("source_url", { length: 1000 }),
  applicationNumber: varchar("application_number", { length: 50 }),
  nctId: varchar("nct_id", { length: 50 }),
  patentNumber: varchar("patent_number", { length: 50 }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  drugNameIdx: index("reg_events_drug_name_idx").on(table.drugName),
  eventDateIdx: index("reg_events_event_date_idx").on(table.eventDate),
  eventTypeIdx: index("reg_events_event_type_idx").on(table.eventType),
  therapeuticAreaIdx: index("reg_events_therapeutic_area_idx").on(table.therapeuticArea),
}));

export const insertRegulatoryEventSchema = createInsertSchema(regulatoryEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRegulatoryEvent = z.infer<typeof insertRegulatoryEventSchema>;
export type RegulatoryEvent = typeof regulatoryEvents.$inferSelect;

// --- Regulatory Event Annotations Table ---
export const regulatoryEventAnnotations = pgTable("regulatory_event_annotations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => regulatoryEvents.id),
  userId: varchar("user_id", { length: 200 }),
  annotationType: varchar("annotation_type", { length: 50 }).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  content: text("content"),
  priority: varchar("priority", { length: 20 }).default("medium"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRegulatoryEventAnnotationSchema = createInsertSchema(regulatoryEventAnnotations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRegulatoryEventAnnotation = z.infer<typeof insertRegulatoryEventAnnotationSchema>;
export type RegulatoryEventAnnotation = typeof regulatoryEventAnnotations.$inferSelect;

// --- Regulatory Event Impacts Table ---
export const regulatoryEventImpacts = pgTable("regulatory_event_impacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => regulatoryEvents.id),
  affectedSpecialty: varchar("affected_specialty", { length: 100 }),
  impactType: varchar("impact_type", { length: 50 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  description: text("description"),
  recommendedAction: text("recommended_action"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRegulatoryEventImpactSchema = createInsertSchema(regulatoryEventImpacts).omit({
  id: true,
  createdAt: true,
});

export type InsertRegulatoryEventImpact = z.infer<typeof insertRegulatoryEventImpactSchema>;
export type RegulatoryEventImpact = typeof regulatoryEventImpacts.$inferSelect;

// --- Regulatory Sync Log Table ---
export const regulatorySyncLog = pgTable("regulatory_sync_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  source: varchar("source", { length: 50 }).notNull(),
  status: varchar("status", { length: 30 }).notNull(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  eventsFound: integer("events_found").default(0),
  eventsCreated: integer("events_created").default(0),
  eventsUpdated: integer("events_updated").default(0),
  eventsSkipped: integer("events_skipped").default(0),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
});

export const insertRegulatorySyncLogSchema = createInsertSchema(regulatorySyncLog).omit({
  id: true,
});

export type InsertRegulatorySyncLog = z.infer<typeof insertRegulatorySyncLogSchema>;
export type RegulatorySyncLog = typeof regulatorySyncLog.$inferSelect;

// ============================================================================
// ALERTING SYSTEM
// ============================================================================

// Alert metric types
export const alertMetrics = [
  "engagement_score",
  "rx_volume",
  "market_share",
  "churn_risk",
  "conversion_likelihood",
  "cpi",
  "msi",
  "response_rate",
] as const;

export type AlertMetric = (typeof alertMetrics)[number];

// Alert operators
export const alertOperators = [">", "<", ">=", "<=", "="] as const;
export type AlertOperator = (typeof alertOperators)[number];

// Alert frequencies
export const alertFrequencies = ["realtime", "daily", "weekly"] as const;
export type AlertFrequency = (typeof alertFrequencies)[number];

// Alert notification channels
export const alertChannels = ["in_app", "email", "slack"] as const;
export type AlertChannel = (typeof alertChannels)[number];

// Alert Rules Table
export const alertRules = pgTable("alert_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  metric: varchar("metric", { length: 100 }).notNull(),
  operator: varchar("operator", { length: 10 }).notNull(),
  threshold: real("threshold").notNull(),
  scope: jsonb("scope").$type<{
    tiers?: string[];
    specialties?: string[];
    segments?: string[];
    states?: string[];
    audienceIds?: string[];
  }>().default({}),
  channels: jsonb("channels").$type<AlertChannel[]>().default(["in_app"]),
  frequency: varchar("frequency", { length: 20 }).notNull().default("daily"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastTriggeredAt: timestamp("last_triggered_at"),
  lastEvaluatedAt: timestamp("last_evaluated_at"),
}, (table) => ({
  userIdIdx: index("alert_rules_user_id_idx").on(table.userId),
  enabledIdx: index("alert_rules_enabled_idx").on(table.enabled),
}));

export const insertAlertRuleSchema = createInsertSchema(alertRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastTriggeredAt: true,
  lastEvaluatedAt: true,
});

export type InsertAlertRule = z.infer<typeof insertAlertRuleSchema>;
export type AlertRule = typeof alertRules.$inferSelect;

// Alert Events Table (triggered alerts)
export const alertEvents = pgTable("alert_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ruleId: varchar("rule_id").notNull().references(() => alertRules.id, { onDelete: "cascade" }),
  triggeredAt: timestamp("triggered_at").notNull().defaultNow(),
  hcpCount: integer("hcp_count").notNull().default(0),
  hcpIds: jsonb("hcp_ids").$type<string[]>().default([]),
  metricValues: jsonb("metric_values").$type<Record<string, number>>().default({}),
  acknowledged: boolean("acknowledged").notNull().default(false),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: varchar("acknowledged_by").references(() => users.id),
}, (table) => ({
  ruleIdIdx: index("alert_events_rule_id_idx").on(table.ruleId),
  acknowledgedIdx: index("alert_events_acknowledged_idx").on(table.acknowledged),
  triggeredAtIdx: index("alert_events_triggered_at_idx").on(table.triggeredAt),
}));

export const insertAlertEventSchema = createInsertSchema(alertEvents).omit({
  id: true,
  triggeredAt: true,
  acknowledgedAt: true,
});

export type InsertAlertEvent = z.infer<typeof insertAlertEventSchema>;
export type AlertEvent = typeof alertEvents.$inferSelect;

// API Schemas for Alerting
export const createAlertRuleRequestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  metric: z.enum(alertMetrics),
  operator: z.enum(alertOperators),
  threshold: z.number(),
  scope: z.object({
    tiers: z.array(z.string()).optional(),
    specialties: z.array(z.string()).optional(),
    segments: z.array(z.string()).optional(),
    states: z.array(z.string()).optional(),
    audienceIds: z.array(z.string()).optional(),
  }).optional(),
  channels: z.array(z.enum(alertChannels)).optional(),
  frequency: z.enum(alertFrequencies).optional(),
  enabled: z.boolean().optional(),
});

export type CreateAlertRuleRequest = z.infer<typeof createAlertRuleRequestSchema>;

export const updateAlertRuleRequestSchema = createAlertRuleRequestSchema.partial();
export type UpdateAlertRuleRequest = z.infer<typeof updateAlertRuleRequestSchema>;

export const alertRuleResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  metric: z.string(),
  operator: z.string(),
  threshold: z.number(),
  scope: z.record(z.unknown()).nullable(),
  channels: z.array(z.string()).nullable(),
  frequency: z.string(),
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastTriggeredAt: z.string().nullable(),
  lastEvaluatedAt: z.string().nullable(),
});

export type AlertRuleResponse = z.infer<typeof alertRuleResponseSchema>;

export const alertEventResponseSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  ruleName: z.string().optional(),
  triggeredAt: z.string(),
  hcpCount: z.number(),
  hcpIds: z.array(z.string()),
  metricValues: z.record(z.number()),
  acknowledged: z.boolean(),
  acknowledgedAt: z.string().nullable(),
  acknowledgedBy: z.string().nullable(),
});

export type AlertEventResponse = z.infer<typeof alertEventResponseSchema>;

// ============ Saved Views (bookmarks/filters) ============

export const viewTypes = [
  "hcp_list",
  "audiences",
  "simulations",
  "dashboard",
  "alerts",
] as const;

export type ViewType = (typeof viewTypes)[number];

export const savedViews = pgTable("saved_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  viewType: varchar("view_type", { length: 50 }).notNull(),
  filters: jsonb("filters").$type<Record<string, unknown>>().default({}),
  columns: jsonb("columns").$type<string[]>(),
  sort: jsonb("sort").$type<{ field: string; direction: "asc" | "desc" }>(),
  isDefault: boolean("is_default").notNull().default(false),
  shared: boolean("shared").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userTypeIdx: index("saved_views_user_type_idx").on(table.userId, table.viewType),
}));

export const insertSavedViewSchema = createInsertSchema(savedViews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSavedView = z.infer<typeof insertSavedViewSchema>;
export type SavedView = typeof savedViews.$inferSelect;

// API Schemas for Saved Views
export const createSavedViewRequestSchema = z.object({
  name: z.string().min(1).max(255),
  viewType: z.enum(viewTypes),
  filters: z.record(z.unknown()).optional(),
  columns: z.array(z.string()).optional(),
  sort: z.object({
    field: z.string(),
    direction: z.enum(["asc", "desc"]),
  }).optional(),
  isDefault: z.boolean().optional(),
  shared: z.boolean().optional(),
});

export type CreateSavedViewRequest = z.infer<typeof createSavedViewRequestSchema>;

export const updateSavedViewRequestSchema = createSavedViewRequestSchema.partial().omit({ viewType: true });
export type UpdateSavedViewRequest = z.infer<typeof updateSavedViewRequestSchema>;

export const savedViewResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  viewType: z.string(),
  filters: z.record(z.unknown()),
  columns: z.array(z.string()).nullable(),
  sort: z.object({
    field: z.string(),
    direction: z.enum(["asc", "desc"]),
  }).nullable(),
  isDefault: z.boolean(),
  shared: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SavedViewResponse = z.infer<typeof savedViewResponseSchema>;

// ============ Export Hub (unified export jobs) ============

export const exportTypes = [
  "audience",
  "hcp_list",
  "nba_recommendations",
  "simulation_results",
] as const;

export type ExportType = (typeof exportTypes)[number];

export const exportDestinations = [
  "csv",
  "xlsx",
  "veeva",
  "webhook",
  "sftp",
] as const;

export type ExportDestination = (typeof exportDestinations)[number];

export const exportStatuses = [
  "pending",
  "processing",
  "complete",
  "failed",
] as const;

export type ExportStatus = (typeof exportStatuses)[number];

export const exportJobs = pgTable("export_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(),
  destination: varchar("destination", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  payload: jsonb("payload").notNull().$type<{
    entityId?: string;
    hcpIds?: string[];
    filters?: Record<string, unknown>;
    fields: string[];
    includeNBA?: boolean;
  }>(),
  destinationConfig: jsonb("destination_config").$type<Record<string, unknown>>().default({}),
  resultUrl: text("result_url"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  userIdx: index("export_jobs_user_idx").on(table.userId),
  statusIdx: index("export_jobs_status_idx").on(table.status),
}));

export const insertExportJobSchema = createInsertSchema(exportJobs).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
});

export type InsertExportJob = z.infer<typeof insertExportJobSchema>;
export type ExportJob = typeof exportJobs.$inferSelect;

export const integrationCredentials = pgTable("integration_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  integrationType: varchar("integration_type", { length: 50 }).notNull(),
  credentials: jsonb("credentials").notNull().$type<Record<string, unknown>>(),
  isValid: boolean("is_valid").notNull().default(true),
  lastValidatedAt: timestamp("last_validated_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userTypeUnique: index("integration_credentials_user_type_idx").on(table.userId, table.integrationType),
}));

export const insertIntegrationCredentialSchema = createInsertSchema(integrationCredentials).omit({
  id: true,
  createdAt: true,
  lastValidatedAt: true,
});

export type InsertIntegrationCredential = z.infer<typeof insertIntegrationCredentialSchema>;
export type IntegrationCredential = typeof integrationCredentials.$inferSelect;

// ============================================================================
// WEBHOOK DESTINATIONS
// ============================================================================

export const webhookDestinations = pgTable("webhook_destinations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull(),
  method: varchar("method", { length: 10 }).notNull().default("POST"),
  headers: jsonb("headers").$type<Record<string, string>>().default({}),
  payloadTemplate: text("payload_template"),
  isActive: boolean("is_active").notNull().default(true),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("webhook_destinations_user_id_idx").on(table.userId),
}));

export const insertWebhookDestinationSchema = createInsertSchema(webhookDestinations).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});

export type InsertWebhookDestination = z.infer<typeof insertWebhookDestinationSchema>;
export type WebhookDestination = typeof webhookDestinations.$inferSelect;

export const webhookLogs = pgTable("webhook_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  destinationId: varchar("destination_id").notNull().references(() => webhookDestinations.id),
  exportJobId: varchar("export_job_id").references(() => exportJobs.id),
  statusCode: integer("status_code"),
  responseBody: text("response_body"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
}, (table) => ({
  destinationIdIdx: index("webhook_logs_destination_id_idx").on(table.destinationId),
  exportJobIdIdx: index("webhook_logs_export_job_id_idx").on(table.exportJobId),
}));

export type WebhookLog = typeof webhookLogs.$inferSelect;

// ============================================================================
// APPROVAL WORKFLOW
// ============================================================================

export const approvalStatuses = ["pending", "approved", "rejected", "expired", "cancelled"] as const;
export type ApprovalStatus = (typeof approvalStatuses)[number];

export const approvalPolicies = pgTable("approval_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  triggerConditions: jsonb("trigger_conditions").notNull().$type<Record<string, unknown>>(),
  approverRoles: text("approver_roles").array().notNull(),
  autoExpireHours: integer("auto_expire_hours").notNull().default(72),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertApprovalPolicySchema = createInsertSchema(approvalPolicies).omit({
  id: true,
  createdAt: true,
});

export type InsertApprovalPolicy = z.infer<typeof insertApprovalPolicySchema>;
export type ApprovalPolicy = typeof approvalPolicies.$inferSelect;

export const approvalRequests = pgTable("approval_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  policyId: varchar("policy_id").references(() => approvalPolicies.id),
  requesterId: varchar("requester_id").notNull().references(() => users.id),
  approverId: varchar("approver_id").references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),
  justification: text("justification"),
  decisionNotes: text("decision_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  decidedAt: timestamp("decided_at"),
  expiresAt: timestamp("expires_at"),
}, (table) => ({
  requesterIdIdx: index("approval_requests_requester_id_idx").on(table.requesterId),
  approverIdIdx: index("approval_requests_approver_id_idx").on(table.approverId),
  statusIdx: index("approval_requests_status_idx").on(table.status),
  policyIdIdx: index("approval_requests_policy_id_idx").on(table.policyId),
}));

export const insertApprovalRequestSchema = createInsertSchema(approvalRequests).omit({
  id: true,
  createdAt: true,
  decidedAt: true,
});

export type InsertApprovalRequest = z.infer<typeof insertApprovalRequestSchema>;
export type ApprovalRequest = typeof approvalRequests.$inferSelect;

// API Schemas for Export Hub
export const createExportJobRequestSchema = z.object({
  type: z.enum(exportTypes),
  destination: z.enum(exportDestinations),
  payload: z.object({
    entityId: z.string().optional(),
    hcpIds: z.array(z.string()).optional(),
    filters: z.record(z.unknown()).optional(),
    fields: z.array(z.string()),
    includeNBA: z.boolean().optional(),
  }),
  destinationConfig: z.record(z.unknown()).optional(),
});

export type CreateExportJobRequest = z.infer<typeof createExportJobRequestSchema>;

export const exportJobResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.string(),
  destination: z.string(),
  status: z.string(),
  payload: z.object({
    entityId: z.string().optional(),
    hcpIds: z.array(z.string()).optional(),
    filters: z.record(z.unknown()).optional(),
    fields: z.array(z.string()),
    includeNBA: z.boolean().optional(),
  }),
  destinationConfig: z.record(z.unknown()).nullable(),
  resultUrl: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});

export type ExportJobResponse = z.infer<typeof exportJobResponseSchema>;
