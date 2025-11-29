import { z } from "zod";
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, jsonb, timestamp } from "drizzle-orm/pg-core";
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
