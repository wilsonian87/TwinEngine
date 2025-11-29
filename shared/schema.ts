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
