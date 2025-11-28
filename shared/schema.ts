import { z } from "zod";

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

// Channel Engagement Record
export const channelEngagementSchema = z.object({
  channel: z.enum(channels),
  score: z.number().min(0).max(100),
  lastContact: z.string().nullable(),
  totalTouches: z.number(),
  responseRate: z.number().min(0).max(100),
});

export type ChannelEngagement = z.infer<typeof channelEngagementSchema>;

// Prescribing Trend data point
export const prescribingTrendSchema = z.object({
  month: z.string(),
  rxCount: z.number(),
  marketShare: z.number(),
});

export type PrescribingTrend = z.infer<typeof prescribingTrendSchema>;

// HCP Profile (Digital Twin)
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
  
  // Engagement metrics
  overallEngagementScore: z.number().min(0).max(100),
  channelPreference: z.enum(channels),
  channelEngagements: z.array(channelEngagementSchema),
  
  // Prescribing data
  monthlyRxVolume: z.number(),
  yearlyRxVolume: z.number(),
  marketSharePct: z.number().min(0).max(100),
  prescribingTrend: z.array(prescribingTrendSchema),
  
  // Prediction scores
  conversionLikelihood: z.number().min(0).max(100),
  churnRisk: z.number().min(0).max(100),
  
  // Metadata
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

// Simulation Scenario
export const simulationScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  
  // Target audience
  targetHcpIds: z.array(z.string()),
  targetSegments: z.array(z.enum(segments)).optional(),
  
  // Channel mix (percentage allocation)
  channelMix: z.record(z.enum(channels), z.number()),
  
  // Campaign parameters
  frequency: z.number().min(1).max(20), // contacts per month
  duration: z.number().min(1).max(12), // months
  budget: z.number().optional(),
  
  // Content strategy
  contentType: z.enum(["educational", "promotional", "clinical_data", "mixed"]),
  
  createdAt: z.string(),
});

export type SimulationScenario = z.infer<typeof simulationScenarioSchema>;

export const insertSimulationScenarioSchema = simulationScenarioSchema.omit({
  id: true,
  createdAt: true,
});

export type InsertSimulationScenario = z.infer<typeof insertSimulationScenarioSchema>;

// Simulation Result
export const simulationResultSchema = z.object({
  id: z.string(),
  scenarioId: z.string(),
  scenarioName: z.string(),
  
  // Predicted outcomes
  predictedEngagementRate: z.number(),
  predictedResponseRate: z.number(),
  predictedRxLift: z.number(), // percentage
  predictedReach: z.number(), // number of HCPs
  
  // Efficiency metrics
  costPerEngagement: z.number().optional(),
  efficiencyScore: z.number().min(0).max(100),
  
  // Channel breakdown
  channelPerformance: z.array(z.object({
    channel: z.enum(channels),
    allocation: z.number(),
    predictedResponse: z.number(),
    contribution: z.number(),
  })),
  
  // Comparison to baseline
  vsBaseline: z.object({
    engagementDelta: z.number(),
    responseDelta: z.number(),
    rxLiftDelta: z.number(),
  }),
  
  runAt: z.string(),
});

export type SimulationResult = z.infer<typeof simulationResultSchema>;

// Dashboard Metrics
export const dashboardMetricsSchema = z.object({
  totalHcps: z.number(),
  avgEngagementScore: z.number(),
  totalSimulations: z.number(),
  avgPredictedLift: z.number(),
  
  // Segment distribution
  segmentDistribution: z.array(z.object({
    segment: z.enum(segments),
    count: z.number(),
    percentage: z.number(),
  })),
  
  // Channel effectiveness
  channelEffectiveness: z.array(z.object({
    channel: z.enum(channels),
    avgResponseRate: z.number(),
    avgEngagement: z.number(),
  })),
  
  // Tier breakdown
  tierBreakdown: z.array(z.object({
    tier: z.enum(tiers),
    count: z.number(),
    avgRxVolume: z.number(),
  })),
  
  // Engagement trend over time
  engagementTrend: z.array(z.object({
    month: z.string(),
    avgScore: z.number(),
    responseRate: z.number(),
  })),
});

export type DashboardMetrics = z.infer<typeof dashboardMetricsSchema>;

// Keep existing user schema for compatibility
import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

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
