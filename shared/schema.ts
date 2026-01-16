import { z } from "zod";
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
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
});

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
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: varchar("action", { length: 50 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id", { length: 100 }),
  details: jsonb("details").$type<Record<string, unknown>>(),
  userId: varchar("user_id", { length: 100 }),
  ipAddress: varchar("ip_address", { length: 50 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

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
  channelPreference: z.enum(channels).optional(),
  states: z.array(z.string()).optional(),
});

export type HCPFilter = z.infer<typeof hcpFilterSchema>;

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
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
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
});

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

