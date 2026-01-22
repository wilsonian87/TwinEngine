import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, ilike, or, and, gte, lte, inArray, sql, desc } from "drizzle-orm";
import { debugLog } from "./utils/config";
import {
  hcpProfiles,
  simulationScenarios,
  simulationResults,
  auditLogs,
  stimuliEvents,
  counterfactualScenarios,
  nlQueryLogs,
  modelEvaluations,
  users,
  inviteCodes,
  savedAudiences,
  // Phase 6: Integration tables
  integrationConfigs,
  actionExports,
  // Phase 6: Agent tables
  agentDefinitions,
  agentRuns,
  agentActions,
  alerts,
  // Phase 7B: Attribution tables
  outcomeEvents,
  attributionConfig,
  predictionStaleness,
  outcomeAttributions,
  type User,
  type InsertUser,
  type InviteCode,
  type InsertInviteCode,
  type SavedAudience,
  type InsertSavedAudience,
  type HCPProfile,
  type HCPFilter,
  type SimulationResult,
  type InsertSimulationScenario,
  type DashboardMetrics,
  type Channel,
  type Specialty,
  type Tier,
  type Segment,
  type ChannelEngagement,
  type PrescribingTrend,
  type ChannelPerformance,
  type BaselineComparison,
  type InsertAuditLog,
  type AuditLog,
  type StimuliEvent,
  type CreateStimuliRequest,
  type CounterfactualScenario,
  type CreateCounterfactualRequest,
  type CounterfactualOutcome,
  type UpliftDelta,
  type ConfidenceInterval,
  type HCPCounterfactualResult,
  type NLQueryResponse,
  type NLQueryRequest,
  type NLQueryFilters,
  type NLRecommendation,
  type StimulusType,
  type ModelEvaluation,
  type ModelHealthSummary,
  type RecordOutcomeRequest,
  type RunEvaluationRequest,
  type SegmentModelMetric,
  type ChannelModelMetric,
  // Phase 6: Integration types
  type IntegrationConfig,
  type InsertIntegrationConfig,
  type ActionExport,
  type InsertActionExport,
  type IntegrationType,
  type IntegrationStatus,
  // Phase 6: Agent types
  type AgentDefinition,
  type InsertAgentDefinition,
  type AgentRun,
  type InsertAgentRun,
  type AgentAction,
  type InsertAgentAction,
  type AgentRunStatus,
  type AgentActionStatus,
  type Alert,
  type InsertAlert,
} from "@shared/schema";
import { specialties, tiers, segments, channels, stimulusTypes } from "@shared/schema";

// Import extracted services
import {
  predictStimuliImpact,
  calculateSimilarityScore,
  runSimulationEngine,
  runCounterfactualAnalysis,
} from "./services/prediction-engine";
import {
  parseNLQueryToFilters,
  detectQueryIntent,
  generateRecommendations,
  convertToHcpFilter,
} from "./services/nl-query-parser";
import {
  isGenAIAvailable,
  parseNLQueryWithAI,
  detectIntentWithAI,
  generateRecommendationsWithAI,
} from "./services/genai-service";

// Storage interface
export interface IStorage {
  // HCP operations
  getAllHcps(): Promise<HCPProfile[]>;
  getHcpById(id: string): Promise<HCPProfile | undefined>;
  getHcpByNpi(npi: string): Promise<HCPProfile | undefined>;
  filterHcps(filter: HCPFilter): Promise<HCPProfile[]>;
  findSimilarHcps(hcpId: string, limit?: number): Promise<HCPProfile[]>;

  // Simulation operations
  createSimulation(scenario: InsertSimulationScenario): Promise<SimulationResult>;
  getSimulationHistory(): Promise<SimulationResult[]>;
  getSimulationById(id: string): Promise<SimulationResult | undefined>;

  // Dashboard metrics
  getDashboardMetrics(): Promise<DashboardMetrics>;
  
  // Audit logging
  logAction(log: InsertAuditLog): Promise<void>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  
  // Stimuli Impact Prediction
  createStimuliEvent(request: CreateStimuliRequest): Promise<StimuliEvent>;
  getStimuliEvents(hcpId?: string, limit?: number): Promise<StimuliEvent[]>;
  recordStimuliOutcome(eventId: string, actualEngagementDelta: number, actualConversionDelta: number): Promise<StimuliEvent | undefined>;
  
  // Counterfactual Backtesting
  createCounterfactual(request: CreateCounterfactualRequest): Promise<CounterfactualScenario>;
  getCounterfactualScenarios(limit?: number): Promise<CounterfactualScenario[]>;
  getCounterfactualById(id: string): Promise<CounterfactualScenario | undefined>;
  
  // Natural Language Queries (placeholder for GenAI integration)
  processNLQuery(request: NLQueryRequest): Promise<NLQueryResponse>;
  getNLQueryHistory(limit?: number): Promise<NLQueryResponse[]>;
  
  // Model Evaluation & Closed-Loop Learning
  recordOutcome(request: RecordOutcomeRequest): Promise<StimuliEvent | undefined>;
  runModelEvaluation(request: RunEvaluationRequest): Promise<ModelEvaluation>;
  getModelEvaluations(limit?: number): Promise<ModelEvaluation[]>;
  getModelHealthSummary(): Promise<ModelHealthSummary>;
  
  // Database seeding
  seedHcpData(count?: number): Promise<void>;
  getHcpCount(): Promise<number>;

  // User operations (for authentication)
  getUserById(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Invite code operations
  validateInviteCode(code: string, email: string): Promise<{ valid: boolean; error?: string; inviteCode?: InviteCode }>;
  useInviteCode(code: string, email: string): Promise<InviteCode | undefined>;
  createInviteCode(invite: InsertInviteCode): Promise<InviteCode>;
  listInviteCodes(): Promise<InviteCode[]>;
  deleteInviteCode(id: string): Promise<boolean>;

  // Saved audiences operations
  createAudience(audience: InsertSavedAudience): Promise<SavedAudience>;
  getAudience(id: string): Promise<SavedAudience | undefined>;
  listAudiences(): Promise<SavedAudience[]>;
  updateAudience(id: string, updates: Partial<InsertSavedAudience>): Promise<SavedAudience | undefined>;
  deleteAudience(id: string): Promise<boolean>;

  // Phase 6: Integration operations
  createIntegration(config: InsertIntegrationConfig): Promise<IntegrationConfig>;
  getIntegration(id: string): Promise<IntegrationConfig | undefined>;
  getIntegrationByType(type: IntegrationType): Promise<IntegrationConfig | undefined>;
  listIntegrations(): Promise<IntegrationConfig[]>;
  updateIntegration(id: string, updates: Partial<InsertIntegrationConfig>): Promise<IntegrationConfig | undefined>;
  updateIntegrationStatus(id: string, status: IntegrationStatus, error?: string): Promise<IntegrationConfig | undefined>;
  deleteIntegration(id: string): Promise<boolean>;

  // Phase 6: Action export operations
  createActionExport(actionExport: InsertActionExport): Promise<ActionExport>;
  getActionExport(id: string): Promise<ActionExport | undefined>;
  listActionExports(sourceType?: string, limit?: number): Promise<ActionExport[]>;
  updateActionExportStatus(id: string, status: string, destinationRef?: string, destinationUrl?: string, error?: string): Promise<ActionExport | undefined>;
}

// Generate random data helpers
const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomFloat = (min: number, max: number, decimals: number = 1) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

const randomChoice = <T>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

const firstNames = [
  "James", "Michael", "Robert", "David", "William", "Richard", "Joseph", "Thomas",
  "Sarah", "Jennifer", "Emily", "Elizabeth", "Maria", "Lisa", "Michelle", "Jessica",
  "Christopher", "Daniel", "Matthew", "Anthony", "Mark", "Steven", "Paul", "Andrew",
  "Patricia", "Nancy", "Karen", "Susan", "Linda", "Barbara", "Margaret", "Dorothy",
];

const lastNames = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
];

const organizations = [
  "Memorial Hospital", "University Medical Center", "Community Health Partners",
  "Regional Medical Associates", "Healthcare Alliance", "Metro Physicians Group",
  "Integrated Care Network", "Premier Medical Group", "Valley Health System",
  "Coastal Medical Associates", "Midwest Healthcare", "Summit Medical Group",
];

const cities = [
  { city: "New York", state: "NY" },
  { city: "Los Angeles", state: "CA" },
  { city: "Chicago", state: "IL" },
  { city: "Houston", state: "TX" },
  { city: "Phoenix", state: "AZ" },
  { city: "Philadelphia", state: "PA" },
  { city: "San Antonio", state: "TX" },
  { city: "San Diego", state: "CA" },
  { city: "Dallas", state: "TX" },
  { city: "San Jose", state: "CA" },
  { city: "Austin", state: "TX" },
  { city: "Boston", state: "MA" },
  { city: "Seattle", state: "WA" },
  { city: "Denver", state: "CO" },
  { city: "Atlanta", state: "GA" },
];

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function generateChannelEngagements(): ChannelEngagement[] {
  return channels.map((channel) => ({
    channel,
    score: randomInt(20, 95),
    lastContact: randomChoice([
      "2 days ago",
      "1 week ago",
      "2 weeks ago",
      "1 month ago",
      "3 months ago",
      null,
    ]),
    totalTouches: randomInt(5, 50),
    responseRate: randomFloat(10, 60),
  }));
}

function generatePrescribingTrend(): PrescribingTrend[] {
  const baseRx = randomInt(15, 60);
  const baseShare = randomFloat(5, 35);
  
  return months.slice(-6).map((month) => ({
    month,
    rxCount: Math.max(5, baseRx + randomInt(-10, 15)),
    marketShare: Math.max(5, Math.min(50, baseShare + randomFloat(-5, 8))),
  }));
}

// Convert DB row to API type
function dbRowToHcpProfile(row: typeof hcpProfiles.$inferSelect): HCPProfile {
  return {
    id: row.id,
    npi: row.npi,
    firstName: row.firstName,
    lastName: row.lastName,
    specialty: row.specialty as Specialty,
    tier: row.tier as Tier,
    segment: row.segment as Segment,
    organization: row.organization,
    city: row.city,
    state: row.state,
    overallEngagementScore: row.overallEngagementScore,
    channelPreference: row.channelPreference as Channel,
    channelEngagements: row.channelEngagements,
    monthlyRxVolume: row.monthlyRxVolume,
    yearlyRxVolume: row.yearlyRxVolume,
    marketSharePct: row.marketSharePct,
    prescribingTrend: row.prescribingTrend,
    conversionLikelihood: row.conversionLikelihood,
    churnRisk: row.churnRisk,
    lastUpdated: row.lastUpdated.toISOString(),
  };
}

function dbRowToSimulationResult(row: typeof simulationResults.$inferSelect): SimulationResult {
  return {
    id: row.id,
    scenarioId: row.scenarioId,
    scenarioName: row.scenarioName,
    predictedEngagementRate: row.predictedEngagementRate,
    predictedResponseRate: row.predictedResponseRate,
    predictedRxLift: row.predictedRxLift,
    predictedReach: row.predictedReach,
    costPerEngagement: row.costPerEngagement ?? undefined,
    efficiencyScore: row.efficiencyScore,
    channelPerformance: row.channelPerformance,
    vsBaseline: row.vsBaseline,
    runAt: row.runAt.toISOString(),
  };
}

function dbRowToAuditLog(row: typeof auditLogs.$inferSelect): AuditLog {
  return {
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    details: row.details as Record<string, unknown> | null,
    userId: row.userId,
    ipAddress: row.ipAddress,
    createdAt: row.createdAt.toISOString(),
  };
}


// DB row converters for new tables
function dbRowToStimuliEvent(row: typeof stimuliEvents.$inferSelect): StimuliEvent {
  return {
    id: row.id,
    hcpId: row.hcpId,
    stimulusType: row.stimulusType as StimulusType,
    channel: row.channel as Channel,
    contentType: row.contentType,
    messageVariant: row.messageVariant,
    callToAction: row.callToAction,
    predictedEngagementDelta: row.predictedEngagementDelta,
    predictedConversionDelta: row.predictedConversionDelta,
    confidenceLower: row.confidenceLower,
    confidenceUpper: row.confidenceUpper,
    actualEngagementDelta: row.actualEngagementDelta,
    actualConversionDelta: row.actualConversionDelta,
    outcomeRecordedAt: row.outcomeRecordedAt?.toISOString() ?? null,
    status: row.status as "predicted" | "confirmed" | "rejected",
    eventDate: row.eventDate.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function dbRowToCounterfactualScenario(row: typeof counterfactualScenarios.$inferSelect): CounterfactualScenario {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    originalScenarioId: row.originalScenarioId,
    originalCampaignData: row.originalCampaignData as Record<string, unknown> | null,
    targetHcpIds: row.targetHcpIds,
    changedVariables: row.changedVariables,
    baselineOutcome: row.baselineOutcome,
    counterfactualOutcome: row.counterfactualOutcome,
    upliftDelta: row.upliftDelta ?? null,
    confidenceInterval: row.confidenceInterval ?? null,
    hcpLevelResults: row.hcpLevelResults ?? null,
    analysisType: row.analysisType as "aggregate" | "individual" | "both",
    status: row.status as "pending" | "running" | "completed" | "failed",
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

function dbRowToNLQueryResponse(row: typeof nlQueryLogs.$inferSelect): NLQueryResponse {
  return {
    id: row.id,
    query: row.query,
    parsedIntent: row.parsedIntent,
    filters: row.extractedFilters ?? null,
    resultCount: row.resultCount ?? 0,
    recommendations: row.recommendations ?? undefined,
    executionTimeMs: row.executionTimeMs ?? 0,
    createdAt: row.createdAt.toISOString(),
  };
}

export class DatabaseStorage implements IStorage {
  async getAllHcps(): Promise<HCPProfile[]> {
    const rows = await db.select().from(hcpProfiles);
    return rows.map(dbRowToHcpProfile);
  }

  async getHcpById(id: string): Promise<HCPProfile | undefined> {
    const rows = await db.select().from(hcpProfiles).where(eq(hcpProfiles.id, id));
    return rows.length > 0 ? dbRowToHcpProfile(rows[0]) : undefined;
  }

  async getHcpByNpi(npi: string): Promise<HCPProfile | undefined> {
    const rows = await db.select().from(hcpProfiles).where(eq(hcpProfiles.npi, npi));
    return rows.length > 0 ? dbRowToHcpProfile(rows[0]) : undefined;
  }

  async filterHcps(filter: HCPFilter): Promise<HCPProfile[]> {
    const conditions: ReturnType<typeof eq>[] = [];

    if (filter.specialties?.length) {
      conditions.push(inArray(hcpProfiles.specialty, filter.specialties));
    }

    if (filter.tiers?.length) {
      conditions.push(inArray(hcpProfiles.tier, filter.tiers));
    }

    if (filter.segments?.length) {
      conditions.push(inArray(hcpProfiles.segment, filter.segments));
    }

    if (filter.minEngagementScore !== undefined) {
      conditions.push(gte(hcpProfiles.overallEngagementScore, filter.minEngagementScore));
    }

    if (filter.maxEngagementScore !== undefined) {
      conditions.push(lte(hcpProfiles.overallEngagementScore, filter.maxEngagementScore));
    }

    if (filter.channelPreference) {
      conditions.push(eq(hcpProfiles.channelPreference, filter.channelPreference));
    }

    if (filter.states?.length) {
      conditions.push(inArray(hcpProfiles.state, filter.states));
    }

    let query = db.select().from(hcpProfiles);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    let rows = await query;

    // Apply text search filter in memory (for name/NPI search)
    if (filter.search) {
      const search = filter.search.toLowerCase();
      rows = rows.filter(
        (hcp) =>
          hcp.firstName.toLowerCase().includes(search) ||
          hcp.lastName.toLowerCase().includes(search) ||
          hcp.npi.includes(search)
      );
    }

    return rows.map(dbRowToHcpProfile);
  }

  async findSimilarHcps(hcpId: string, limit: number = 10): Promise<HCPProfile[]> {
    const targetHcp = await this.getHcpById(hcpId);
    if (!targetHcp) return [];

    const allHcps = await this.getAllHcps();
    
    // Calculate similarity scores and sort
    const scoredHcps = allHcps
      .filter(hcp => hcp.id !== hcpId)
      .map(hcp => ({
        hcp,
        score: calculateSimilarityScore(targetHcp, hcp),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scoredHcps.map(s => s.hcp);
  }

  async createSimulation(scenario: InsertSimulationScenario): Promise<SimulationResult> {
    const targetHcpIds = scenario.targetHcpIds || [];
    const hasTargetedAudience = targetHcpIds.length > 0;
    
    const hcpCount = hasTargetedAudience 
      ? targetHcpIds.length 
      : await this.getHcpCount();
    
    const result = runSimulationEngine(scenario, hcpCount);
    const scenarioId = randomUUID();

    const [insertedResult] = await db.insert(simulationResults).values({
      scenarioId,
      scenarioName: scenario.name,
      predictedEngagementRate: result.predictedEngagementRate,
      predictedResponseRate: result.predictedResponseRate,
      predictedRxLift: result.predictedRxLift,
      predictedReach: result.predictedReach,
      efficiencyScore: result.efficiencyScore,
      channelPerformance: result.channelPerformance,
      vsBaseline: result.vsBaseline,
    }).returning();

    // Log the simulation run with audience details including target IDs
    await this.logAction({
      action: "simulation_run",
      entityType: "simulation",
      entityId: insertedResult.id,
      details: { 
        scenarioName: scenario.name, 
        hcpCount,
        targetedAudience: hasTargetedAudience,
        targetHcpCount: targetHcpIds.length,
        targetHcpIds: hasTargetedAudience ? targetHcpIds : undefined,
        channelMix: scenario.channelMix,
        frequency: scenario.frequency,
        duration: scenario.duration,
        contentType: scenario.contentType,
      },
    });

    return dbRowToSimulationResult(insertedResult);
  }

  async getSimulationHistory(): Promise<SimulationResult[]> {
    const rows = await db
      .select()
      .from(simulationResults)
      .orderBy(desc(simulationResults.runAt));
    return rows.map(dbRowToSimulationResult);
  }

  async getSimulationById(id: string): Promise<SimulationResult | undefined> {
    const rows = await db.select().from(simulationResults).where(eq(simulationResults.id, id));
    return rows.length > 0 ? dbRowToSimulationResult(rows[0]) : undefined;
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const allHcps = await this.getAllHcps();
    const allSimulations = await this.getSimulationHistory();

    // Calculate segment distribution
    const segmentCounts = new Map<Segment, number>();
    segments.forEach((s) => segmentCounts.set(s, 0));
    allHcps.forEach((hcp) => {
      segmentCounts.set(hcp.segment, (segmentCounts.get(hcp.segment) || 0) + 1);
    });

    const segmentDistribution = segments.map((segment) => ({
      segment,
      count: segmentCounts.get(segment) || 0,
      percentage: allHcps.length > 0 ? ((segmentCounts.get(segment) || 0) / allHcps.length) * 100 : 0,
    }));

    // Calculate channel effectiveness
    const channelStats = new Map<Channel, { totalResponse: number; totalEngagement: number; count: number }>();
    channels.forEach((c) => channelStats.set(c, { totalResponse: 0, totalEngagement: 0, count: 0 }));
    
    allHcps.forEach((hcp) => {
      hcp.channelEngagements.forEach((ce) => {
        const stats = channelStats.get(ce.channel)!;
        stats.totalResponse += ce.responseRate;
        stats.totalEngagement += ce.score;
        stats.count += 1;
      });
    });

    const channelEffectiveness = channels.map((channel) => {
      const stats = channelStats.get(channel)!;
      return {
        channel,
        avgResponseRate: stats.count > 0 ? stats.totalResponse / stats.count : 0,
        avgEngagement: stats.count > 0 ? stats.totalEngagement / stats.count : 0,
      };
    });

    // Calculate tier breakdown
    const tierStats = new Map<Tier, { count: number; totalRx: number }>();
    tiers.forEach((t) => tierStats.set(t, { count: 0, totalRx: 0 }));
    
    allHcps.forEach((hcp) => {
      const stats = tierStats.get(hcp.tier)!;
      stats.count += 1;
      stats.totalRx += hcp.monthlyRxVolume;
    });

    const tierBreakdown = tiers.map((tier) => {
      const stats = tierStats.get(tier)!;
      return {
        tier,
        count: stats.count,
        avgRxVolume: stats.count > 0 ? Math.round(stats.totalRx / stats.count) : 0,
      };
    });

    // Generate engagement trend
    const engagementTrend = months.slice(-6).map((month) => ({
      month,
      avgScore: randomFloat(40, 65),
      responseRate: randomFloat(20, 40),
    }));

    // Calculate averages
    const avgEngagement = allHcps.length > 0 
      ? allHcps.reduce((sum, h) => sum + h.overallEngagementScore, 0) / allHcps.length 
      : 0;
    const avgPredictedLift = allSimulations.length > 0
      ? allSimulations.reduce((sum, s) => sum + s.predictedRxLift, 0) / allSimulations.length
      : 0;

    return {
      totalHcps: allHcps.length,
      avgEngagementScore: avgEngagement,
      totalSimulations: allSimulations.length,
      avgPredictedLift,
      segmentDistribution,
      channelEffectiveness,
      tierBreakdown,
      engagementTrend,
    };
  }

  async logAction(log: InsertAuditLog): Promise<void> {
    await db.insert(auditLogs).values(log);
  }

  async getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    const rows = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
    return rows.map(dbRowToAuditLog);
  }

  async getHcpCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(hcpProfiles);
    return Number(result[0]?.count || 0);
  }

  async seedHcpData(count: number = 100): Promise<void> {
    const existingCount = await this.getHcpCount();
    if (existingCount >= count) {
      debugLog("Storage", `Database already has ${existingCount} HCPs, skipping seed`);
      return;
    }

    debugLog("Storage", `Seeding database with ${count} HCP profiles...`);
    
    const hcpsToInsert = [];
    for (let i = 0; i < count; i++) {
      const channelEngagements = generateChannelEngagements();
      const preferredChannel = channelEngagements.reduce((prev, curr) =>
        curr.score > prev.score ? curr : prev
      ).channel;
      
      const location = randomChoice(cities);
      
      hcpsToInsert.push({
        npi: `${1000000000 + i}`,
        firstName: randomChoice(firstNames),
        lastName: randomChoice(lastNames),
        specialty: randomChoice(specialties),
        tier: randomChoice(tiers),
        segment: randomChoice(segments),
        organization: randomChoice(organizations),
        city: location.city,
        state: location.state,
        overallEngagementScore: randomInt(25, 95),
        channelPreference: preferredChannel,
        channelEngagements,
        monthlyRxVolume: randomInt(10, 80),
        yearlyRxVolume: randomInt(120, 960),
        marketSharePct: randomFloat(5, 45),
        prescribingTrend: generatePrescribingTrend(),
        conversionLikelihood: randomInt(15, 85),
        churnRisk: randomInt(5, 50),
      });
    }

    // Insert in batches
    const batchSize = 50;
    for (let i = 0; i < hcpsToInsert.length; i += batchSize) {
      const batch = hcpsToInsert.slice(i, i + batchSize);
      await db.insert(hcpProfiles).values(batch);
    }

    // Seed initial simulations
    const scenarios = [
      {
        name: "Q1 Digital Push",
        description: "Focus on digital channels",
        targetHcpIds: [] as string[],
        channelMix: { email: 40, rep_visit: 15, webinar: 20, conference: 5, digital_ad: 15, phone: 5 },
        frequency: 5,
        duration: 3,
        contentType: "educational" as const,
      },
      {
        name: "Rep-Heavy Campaign",
        description: "Traditional field force approach",
        targetHcpIds: [] as string[],
        channelMix: { email: 15, rep_visit: 45, webinar: 10, conference: 15, digital_ad: 10, phone: 5 },
        frequency: 3,
        duration: 6,
        contentType: "clinical_data" as const,
      },
      {
        name: "Balanced Omnichannel",
        description: "Even distribution across all channels",
        targetHcpIds: [] as string[],
        channelMix: { email: 20, rep_visit: 20, webinar: 15, conference: 15, digital_ad: 15, phone: 15 },
        frequency: 4,
        duration: 4,
        contentType: "mixed" as const,
      },
    ];

    for (const scenario of scenarios) {
      await this.createSimulation(scenario);
    }

    debugLog("Storage", `Database seeded with ${count} HCPs and ${scenarios.length} initial simulations`);
  }

  // ============ Stimuli Impact Prediction ============

  async createStimuliEvent(request: CreateStimuliRequest): Promise<StimuliEvent> {
    const hcp = await this.getHcpById(request.hcpId);
    if (!hcp) {
      throw new Error(`HCP not found: ${request.hcpId}`);
    }

    // Predict impact using the prediction engine
    const prediction = predictStimuliImpact(
      hcp,
      request.stimulusType,
      request.channel,
      request.contentType,
      request.callToAction
    );

    const [inserted] = await db.insert(stimuliEvents).values({
      hcpId: request.hcpId,
      stimulusType: request.stimulusType,
      channel: request.channel,
      contentType: request.contentType,
      messageVariant: request.messageVariant,
      callToAction: request.callToAction,
      predictedEngagementDelta: prediction.engagementDelta,
      predictedConversionDelta: prediction.conversionDelta,
      confidenceLower: prediction.confidenceLower,
      confidenceUpper: prediction.confidenceUpper,
      eventDate: request.eventDate ? new Date(request.eventDate) : new Date(),
      status: "predicted",
    }).returning();

    // Log the stimuli creation
    await this.logAction({
      action: "stimuli_created",
      entityType: "stimuli_event",
      entityId: inserted.id,
      details: {
        hcpId: request.hcpId,
        stimulusType: request.stimulusType,
        channel: request.channel,
        predictedEngagementDelta: prediction.engagementDelta,
        predictedConversionDelta: prediction.conversionDelta,
      },
    });

    return dbRowToStimuliEvent(inserted);
  }

  async getStimuliEvents(hcpId?: string, limit: number = 50): Promise<StimuliEvent[]> {
    let query = db.select().from(stimuliEvents).orderBy(desc(stimuliEvents.createdAt)).limit(limit);
    
    if (hcpId) {
      query = query.where(eq(stimuliEvents.hcpId, hcpId)) as typeof query;
    }

    const rows = await query;
    return rows.map(dbRowToStimuliEvent);
  }

  async recordStimuliOutcome(
    eventId: string,
    actualEngagementDelta: number,
    actualConversionDelta: number
  ): Promise<StimuliEvent | undefined> {
    const [updated] = await db
      .update(stimuliEvents)
      .set({
        actualEngagementDelta,
        actualConversionDelta,
        outcomeRecordedAt: new Date(),
        status: "confirmed",
      })
      .where(eq(stimuliEvents.id, eventId))
      .returning();

    if (!updated) return undefined;

    // Log the outcome recording for closed-loop learning
    await this.logAction({
      action: "stimuli_outcome_recorded",
      entityType: "stimuli_event",
      entityId: eventId,
      details: {
        predictedEngagementDelta: updated.predictedEngagementDelta,
        actualEngagementDelta,
        predictionError: actualEngagementDelta - (updated.predictedEngagementDelta || 0),
      },
    });

    return dbRowToStimuliEvent(updated);
  }

  // ============ Counterfactual Backtesting ============

  async createCounterfactual(request: CreateCounterfactualRequest): Promise<CounterfactualScenario> {
    // Get target HCPs
    const hcps = request.targetHcpIds.length > 0
      ? await Promise.all(request.targetHcpIds.map(id => this.getHcpById(id)))
      : await this.getAllHcps();
    
    const validHcps = hcps.filter((h): h is HCPProfile => h !== undefined);

    // Run counterfactual analysis
    const analysisType = request.analysisType || "aggregate";
    const analysis = runCounterfactualAnalysis(validHcps, request.changedVariables, analysisType);

    const [inserted] = await db.insert(counterfactualScenarios).values({
      name: request.name,
      description: request.description,
      originalScenarioId: request.originalScenarioId,
      targetHcpIds: request.targetHcpIds.length > 0 ? request.targetHcpIds : validHcps.map(h => h.id),
      changedVariables: request.changedVariables,
      baselineOutcome: analysis.baselineOutcome,
      counterfactualOutcome: analysis.counterfactualOutcome,
      upliftDelta: analysis.upliftDelta,
      confidenceInterval: analysis.confidenceInterval,
      hcpLevelResults: analysis.hcpLevelResults,
      analysisType,
      status: "completed",
      completedAt: new Date(),
    }).returning();

    // Log the counterfactual analysis
    await this.logAction({
      action: "counterfactual_created",
      entityType: "counterfactual",
      entityId: inserted.id,
      details: {
        name: request.name,
        targetHcpCount: validHcps.length,
        changedVariables: request.changedVariables.map(v => v.variableName),
        percentageImprovement: analysis.upliftDelta.percentageImprovement,
      },
    });

    return dbRowToCounterfactualScenario(inserted);
  }

  async getCounterfactualScenarios(limit: number = 50): Promise<CounterfactualScenario[]> {
    const rows = await db
      .select()
      .from(counterfactualScenarios)
      .orderBy(desc(counterfactualScenarios.createdAt))
      .limit(limit);
    return rows.map(dbRowToCounterfactualScenario);
  }

  async getCounterfactualById(id: string): Promise<CounterfactualScenario | undefined> {
    const rows = await db
      .select()
      .from(counterfactualScenarios)
      .where(eq(counterfactualScenarios.id, id));
    return rows.length > 0 ? dbRowToCounterfactualScenario(rows[0]) : undefined;
  }

  // ============ Natural Language Queries (placeholder for GenAI) ============

  async processNLQuery(request: NLQueryRequest): Promise<NLQueryResponse> {
    const startTime = Date.now();
    let usedAI = false;

    // Try GenAI parsing first, with automatic fallback to rule-based
    const { filters, usedAI: filtersUsedAI } = await parseNLQueryWithAI(request.query);
    usedAI = filtersUsedAI;

    // Detect intent (use AI if available, otherwise rule-based)
    const { intent: parsedIntent, usedAI: intentUsedAI } = await detectIntentWithAI(request.query);
    usedAI = usedAI || intentUsedAI;

    // Convert NL filters to HCP filter format and apply to get matching HCPs
    const hcpFilter = convertToHcpFilter(filters);
    const matchingHcps = await this.filterHcps(hcpFilter);
    const limitedResults = matchingHcps.slice(0, request.maxResults || 20);

    // Generate recommendations if requested (use AI if available)
    let recommendations: NLRecommendation[] | undefined;
    if (request.includeRecommendations) {
      const { recommendations: recs, usedAI: recsUsedAI } = await generateRecommendationsWithAI(
        filters,
        matchingHcps,
        request.query
      );
      recommendations = recs;
      usedAI = usedAI || recsUsedAI;
    }

    const executionTimeMs = Date.now() - startTime;
    const modelUsed = usedAI ? "claude-3-haiku" : "rule-based";

    // Log the query
    const [inserted] = await db.insert(nlQueryLogs).values({
      query: request.query,
      parsedIntent,
      extractedFilters: filters,
      resultCount: matchingHcps.length,
      resultHcpIds: limitedResults.map(h => h.id),
      recommendations,
      executionTimeMs,
      modelUsed,
    }).returning();

    await this.logAction({
      action: "nl_query_executed",
      entityType: "nl_query",
      entityId: inserted.id,
      details: {
        query: request.query,
        parsedIntent,
        resultCount: matchingHcps.length,
      },
    });

    return {
      id: inserted.id,
      query: request.query,
      parsedIntent,
      filters,
      resultCount: matchingHcps.length,
      results: limitedResults,
      recommendations,
      executionTimeMs,
      createdAt: inserted.createdAt.toISOString(),
    };
  }

  async getNLQueryHistory(limit: number = 50): Promise<NLQueryResponse[]> {
    const rows = await db
      .select()
      .from(nlQueryLogs)
      .orderBy(desc(nlQueryLogs.createdAt))
      .limit(limit);
    return rows.map(dbRowToNLQueryResponse);
  }

  // ============ Model Evaluation & Closed-Loop Learning ============

  async recordOutcome(request: RecordOutcomeRequest): Promise<StimuliEvent | undefined> {
    const now = new Date();
    
    const [updated] = await db
      .update(stimuliEvents)
      .set({
        actualEngagementDelta: request.actualEngagementDelta,
        actualConversionDelta: request.actualConversionDelta || 0,
        outcomeRecordedAt: now,
        status: "confirmed",
      })
      .where(eq(stimuliEvents.id, request.stimuliEventId))
      .returning();

    if (!updated) return undefined;

    // Log this action
    await this.logAction({
      action: "record_outcome",
      entityType: "stimuli_event",
      entityId: request.stimuliEventId,
      details: {
        predictedDelta: updated.predictedEngagementDelta,
        actualDelta: request.actualEngagementDelta,
        error: Math.abs((updated.predictedEngagementDelta || 0) - request.actualEngagementDelta),
      },
    });

    return dbRowToStimuliEvent(updated);
  }

  async runModelEvaluation(request: RunEvaluationRequest): Promise<ModelEvaluation> {
    const now = new Date();
    const periodEnd = request.periodEnd ? new Date(request.periodEnd) : now;
    const periodStart = request.periodStart 
      ? new Date(request.periodStart) 
      : new Date(periodEnd.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30 days

    // Get all stimuli events with outcomes in the period
    const events = await db
      .select()
      .from(stimuliEvents)
      .where(
        and(
          eq(stimuliEvents.status, "confirmed"),
          gte(stimuliEvents.eventDate, periodStart),
          lte(stimuliEvents.eventDate, periodEnd)
        )
      );

    const totalPredictions = events.length;
    const predictionsWithOutcomes = events.filter(e => e.actualEngagementDelta !== null).length;

    // Calculate accuracy metrics
    const { mae, rmse, mape, r2, ciCoverage, avgCiWidth } = this.calculateAccuracyMetrics(events);

    // Calculate segment-level metrics
    const segmentMetrics = await this.calculateSegmentMetrics(events);
    
    // Calculate channel-level metrics
    const channelMetrics = await this.calculateChannelMetrics(events);

    // Calculate calibration
    const { slope, intercept } = this.calculateCalibration(events);

    const [evaluation] = await db
      .insert(modelEvaluations)
      .values({
        periodStart,
        periodEnd,
        predictionType: request.predictionType,
        totalPredictions,
        predictionsWithOutcomes,
        meanAbsoluteError: mae,
        rootMeanSquaredError: rmse,
        meanAbsolutePercentError: mape,
        r2Score: r2,
        calibrationSlope: slope,
        calibrationIntercept: intercept,
        ciCoverageRate: ciCoverage,
        avgCiWidth: avgCiWidth,
        segmentMetrics: segmentMetrics,
        channelMetrics: channelMetrics,
        modelVersion: "v1.0",
      })
      .returning();

    // Log the evaluation
    await this.logAction({
      action: "run_model_evaluation",
      entityType: "model_evaluation",
      entityId: evaluation.id,
      details: {
        predictionType: request.predictionType,
        totalPredictions,
        mae,
        rmse,
      },
    });

    return this.dbRowToModelEvaluation(evaluation);
  }

  private calculateAccuracyMetrics(events: typeof stimuliEvents.$inferSelect[]) {
    const validEvents = events.filter(
      e => e.predictedEngagementDelta !== null && e.actualEngagementDelta !== null
    );

    if (validEvents.length === 0) {
      return { mae: null, rmse: null, mape: null, r2: null, ciCoverage: null, avgCiWidth: null };
    }

    const errors = validEvents.map(e => ({
      predicted: e.predictedEngagementDelta!,
      actual: e.actualEngagementDelta!,
      lower: e.confidenceLower!,
      upper: e.confidenceUpper!,
      error: e.actualEngagementDelta! - e.predictedEngagementDelta!,
    }));

    // MAE
    const mae = errors.reduce((sum, e) => sum + Math.abs(e.error), 0) / errors.length;

    // RMSE
    const rmse = Math.sqrt(errors.reduce((sum, e) => sum + e.error * e.error, 0) / errors.length);

    // MAPE (avoiding division by zero)
    const validMape = errors.filter(e => e.actual !== 0);
    const mape = validMape.length > 0
      ? validMape.reduce((sum, e) => sum + Math.abs(e.error / e.actual), 0) / validMape.length * 100
      : null;

    // R² Score
    const meanActual = errors.reduce((sum, e) => sum + e.actual, 0) / errors.length;
    const ssTotal = errors.reduce((sum, e) => sum + Math.pow(e.actual - meanActual, 2), 0);
    const ssResidual = errors.reduce((sum, e) => sum + Math.pow(e.error, 2), 0);
    const r2 = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : null;

    // CI Coverage (what % of actuals fell within confidence interval)
    const inCi = errors.filter(e => e.actual >= e.lower && e.actual <= e.upper).length;
    const ciCoverage = (inCi / errors.length) * 100;

    // Average CI Width
    const avgCiWidth = errors.reduce((sum, e) => sum + (e.upper - e.lower), 0) / errors.length;

    return {
      mae: parseFloat(mae.toFixed(4)),
      rmse: parseFloat(rmse.toFixed(4)),
      mape: mape ? parseFloat(mape.toFixed(2)) : null,
      r2: r2 ? parseFloat(r2.toFixed(4)) : null,
      ciCoverage: parseFloat(ciCoverage.toFixed(2)),
      avgCiWidth: parseFloat(avgCiWidth.toFixed(2)),
    };
  }

  private calculateCalibration(events: typeof stimuliEvents.$inferSelect[]) {
    const validEvents = events.filter(
      e => e.predictedEngagementDelta !== null && e.actualEngagementDelta !== null
    );

    if (validEvents.length < 2) {
      return { slope: null, intercept: null };
    }

    // Simple linear regression: actual = slope * predicted + intercept
    const n = validEvents.length;
    const sumX = validEvents.reduce((s, e) => s + e.predictedEngagementDelta!, 0);
    const sumY = validEvents.reduce((s, e) => s + e.actualEngagementDelta!, 0);
    const sumXY = validEvents.reduce((s, e) => s + e.predictedEngagementDelta! * e.actualEngagementDelta!, 0);
    const sumXX = validEvents.reduce((s, e) => s + e.predictedEngagementDelta! * e.predictedEngagementDelta!, 0);

    const denom = n * sumXX - sumX * sumX;
    if (denom === 0) return { slope: null, intercept: null };

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    return {
      slope: parseFloat(slope.toFixed(4)),
      intercept: parseFloat(intercept.toFixed(4)),
    };
  }

  private async calculateSegmentMetrics(events: typeof stimuliEvents.$inferSelect[]): Promise<SegmentModelMetric[]> {
    const hcps = await this.getAllHcps();
    const hcpMap = new Map(hcps.map(h => [h.id, h]));

    const segmentEvents = new Map<Segment, typeof events>();
    
    for (const event of events) {
      const hcp = hcpMap.get(event.hcpId);
      if (hcp) {
        const segment = hcp.segment;
        if (!segmentEvents.has(segment)) {
          segmentEvents.set(segment, []);
        }
        segmentEvents.get(segment)!.push(event);
      }
    }

    const metrics: SegmentModelMetric[] = [];
    Array.from(segmentEvents.entries()).forEach(([segment, segEvents]) => {
      const { mae, rmse } = this.calculateAccuracyMetrics(segEvents);
      metrics.push({
        segment,
        sampleSize: segEvents.length,
        mae: mae || 0,
        rmse: rmse || 0,
        accuracyTrend: "stable",
      });
    });

    return metrics;
  }

  private async calculateChannelMetrics(events: typeof stimuliEvents.$inferSelect[]): Promise<ChannelModelMetric[]> {
    const channelEvents = new Map<Channel, typeof events>();
    
    for (const event of events) {
      const channel = event.channel as Channel;
      if (!channelEvents.has(channel)) {
        channelEvents.set(channel, []);
      }
      channelEvents.get(channel)!.push(event);
    }

    const metrics: ChannelModelMetric[] = [];
    Array.from(channelEvents.entries()).forEach(([channel, chanEvents]) => {
      type EventType = typeof stimuliEvents.$inferSelect;
      const validEvents = chanEvents.filter(
        (e: EventType) => e.predictedEngagementDelta !== null && e.actualEngagementDelta !== null
      );
      
      const { mae, rmse } = this.calculateAccuracyMetrics(chanEvents);
      const avgPredicted = validEvents.length > 0
        ? validEvents.reduce((s: number, e: EventType) => s + e.predictedEngagementDelta!, 0) / validEvents.length
        : 0;
      const avgActual = validEvents.length > 0
        ? validEvents.reduce((s: number, e: EventType) => s + e.actualEngagementDelta!, 0) / validEvents.length
        : 0;

      metrics.push({
        channel,
        sampleSize: chanEvents.length,
        mae: mae || 0,
        rmse: rmse || 0,
        avgPredicted: parseFloat(avgPredicted.toFixed(2)),
        avgActual: parseFloat(avgActual.toFixed(2)),
      });
    });

    return metrics;
  }

  private dbRowToModelEvaluation(row: typeof modelEvaluations.$inferSelect): ModelEvaluation {
    return {
      id: row.id,
      periodStart: row.periodStart.toISOString(),
      periodEnd: row.periodEnd.toISOString(),
      predictionType: row.predictionType as "stimuli_impact" | "counterfactual" | "conversion" | "engagement",
      totalPredictions: row.totalPredictions,
      predictionsWithOutcomes: row.predictionsWithOutcomes,
      meanAbsoluteError: row.meanAbsoluteError,
      rootMeanSquaredError: row.rootMeanSquaredError,
      meanAbsolutePercentError: row.meanAbsolutePercentError,
      r2Score: row.r2Score,
      calibrationSlope: row.calibrationSlope,
      calibrationIntercept: row.calibrationIntercept,
      ciCoverageRate: row.ciCoverageRate,
      avgCiWidth: row.avgCiWidth,
      segmentMetrics: row.segmentMetrics as SegmentModelMetric[] | null,
      channelMetrics: row.channelMetrics as ChannelModelMetric[] | null,
      modelVersion: row.modelVersion,
      evaluatedAt: row.evaluatedAt.toISOString(),
    };
  }

  async getModelEvaluations(limit: number = 50): Promise<ModelEvaluation[]> {
    const rows = await db
      .select()
      .from(modelEvaluations)
      .orderBy(desc(modelEvaluations.evaluatedAt))
      .limit(limit);
    return rows.map(r => this.dbRowToModelEvaluation(r));
  }

  async getModelHealthSummary(): Promise<ModelHealthSummary> {
    const evaluations = await this.getModelEvaluations(10);
    const stimuliEvents = await this.getStimuliEvents(undefined, 100);

    // Calculate overall accuracy based on most recent evaluation
    const latestEval = evaluations[0];
    const latestMae = latestEval?.meanAbsoluteError ?? null;
    const latestRmse = latestEval?.rootMeanSquaredError ?? null;

    // Determine accuracy trend
    let accuracyTrend: "improving" | "stable" | "declining" = "stable";
    if (evaluations.length >= 2) {
      const recentMae = evaluations.slice(0, 3).map(e => e.meanAbsoluteError).filter(m => m !== null);
      const olderMae = evaluations.slice(3, 6).map(e => e.meanAbsoluteError).filter(m => m !== null);
      if (recentMae.length > 0 && olderMae.length > 0) {
        const recentAvg = recentMae.reduce((a, b) => a + b!, 0) / recentMae.length;
        const olderAvg = olderMae.reduce((a, b) => a + b!, 0) / olderMae.length;
        if (recentAvg < olderAvg * 0.9) accuracyTrend = "improving";
        else if (recentAvg > olderAvg * 1.1) accuracyTrend = "declining";
      }
    }

    // Calculate overall accuracy score (inverse of MAE normalized)
    const overallAccuracy = latestMae !== null 
      ? Math.max(0, Math.min(100, 100 - (latestMae * 5)))
      : 85; // Default if no evaluations

    // Generate recommended actions
    const recommendedActions: { priority: "high" | "medium" | "low"; action: string; impact: string }[] = [];

    const pendingOutcomes = stimuliEvents.filter(e => e.status === "predicted").length;
    if (pendingOutcomes > 20) {
      recommendedActions.push({
        priority: "high",
        action: "Record actual outcomes for pending predictions",
        impact: `${pendingOutcomes} predictions awaiting outcome data for model training`,
      });
    }

    if (latestEval?.ciCoverageRate && latestEval.ciCoverageRate < 80) {
      recommendedActions.push({
        priority: "medium",
        action: "Widen confidence intervals for better calibration",
        impact: `Current CI coverage is ${latestEval.ciCoverageRate.toFixed(1)}%, target is 95%`,
      });
    }

    if (accuracyTrend === "declining") {
      recommendedActions.push({
        priority: "high",
        action: "Review recent prediction patterns for model drift",
        impact: "Model accuracy has decreased - may need retraining",
      });
    }

    if (recommendedActions.length === 0) {
      recommendedActions.push({
        priority: "low",
        action: "Continue monitoring model performance",
        impact: "Model is performing within acceptable parameters",
      });
    }

    // Calculate prediction type breakdown
    const predictionTypeBreakdown = [
      { type: "stimuli_impact", accuracy: overallAccuracy, sampleSize: stimuliEvents.length },
      { type: "counterfactual", accuracy: overallAccuracy * 0.95, sampleSize: 0 },
      { type: "conversion", accuracy: overallAccuracy * 0.92, sampleSize: 0 },
      { type: "engagement", accuracy: overallAccuracy * 0.88, sampleSize: 0 },
    ];

    return {
      overallAccuracy: parseFloat(overallAccuracy.toFixed(1)),
      totalEvaluations: evaluations.length,
      latestMae,
      latestRmse,
      accuracyTrend,
      ciCoverageRate: latestEval?.ciCoverageRate ?? null,
      recommendedActions,
      predictionTypeBreakdown,
      lastEvaluatedAt: latestEval?.evaluatedAt ?? null,
    };
  }

  // ============ User Operations (Authentication) ============

  async getUserById(id: string): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.id, id));
    return rows.length > 0 ? rows[0] : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.username, username));
    return rows.length > 0 ? rows[0] : undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [inserted] = await db.insert(users).values(user).returning();
    return inserted;
  }

  // ============ Invite Code Operations ============

  async validateInviteCode(code: string, email: string): Promise<{ valid: boolean; error?: string; inviteCode?: InviteCode }> {
    const [invite] = await db
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.code, code));

    if (!invite) {
      return { valid: false, error: "Invalid invite code" };
    }

    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      return { valid: false, error: "Email does not match invite" };
    }

    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return { valid: false, error: "Invite code has expired" };
    }

    if (invite.maxUses && invite.useCount !== null && invite.useCount >= invite.maxUses) {
      return { valid: false, error: "Invite code has reached maximum uses" };
    }

    return { valid: true, inviteCode: invite };
  }

  async useInviteCode(code: string, email: string): Promise<InviteCode | undefined> {
    const validation = await this.validateInviteCode(code, email);
    if (!validation.valid || !validation.inviteCode) {
      return undefined;
    }

    const [updated] = await db
      .update(inviteCodes)
      .set({
        useCount: (validation.inviteCode.useCount || 0) + 1,
        lastUsedAt: new Date(),
      })
      .where(eq(inviteCodes.code, code))
      .returning();

    await this.logAction({
      action: "invite_code_used",
      entityType: "invite_code",
      entityId: updated.id,
      details: { email, label: updated.label },
    });

    return updated;
  }

  async createInviteCode(invite: InsertInviteCode): Promise<InviteCode> {
    const [inserted] = await db.insert(inviteCodes).values(invite).returning();

    await this.logAction({
      action: "invite_code_created",
      entityType: "invite_code",
      entityId: inserted.id,
      details: { email: invite.email, label: invite.label },
    });

    return inserted;
  }

  async listInviteCodes(): Promise<InviteCode[]> {
    return db.select().from(inviteCodes).orderBy(desc(inviteCodes.createdAt));
  }

  async deleteInviteCode(id: string): Promise<boolean> {
    const result = await db.delete(inviteCodes).where(eq(inviteCodes.id, id));
    return true;
  }

  // ============ Saved Audiences Operations ============

  async createAudience(audience: InsertSavedAudience): Promise<SavedAudience> {
    const [inserted] = await db.insert(savedAudiences).values(audience).returning();

    await this.logAction({
      action: "audience_created",
      entityType: "saved_audience",
      entityId: inserted.id,
      details: { name: audience.name, hcpCount: audience.hcpCount, source: audience.source },
    });

    return inserted;
  }

  async getAudience(id: string): Promise<SavedAudience | undefined> {
    const [audience] = await db
      .select()
      .from(savedAudiences)
      .where(eq(savedAudiences.id, id));
    return audience;
  }

  async listAudiences(): Promise<SavedAudience[]> {
    return db.select().from(savedAudiences).orderBy(desc(savedAudiences.createdAt));
  }

  async updateAudience(id: string, updates: Partial<InsertSavedAudience>): Promise<SavedAudience | undefined> {
    const [updated] = await db
      .update(savedAudiences)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(savedAudiences.id, id))
      .returning();
    return updated;
  }

  async deleteAudience(id: string): Promise<boolean> {
    await db.delete(savedAudiences).where(eq(savedAudiences.id, id));

    await this.logAction({
      action: "audience_deleted",
      entityType: "saved_audience",
      entityId: id,
      details: {},
    });

    return true;
  }

  // ============ Phase 6: Integration Operations ============

  async createIntegration(config: InsertIntegrationConfig): Promise<IntegrationConfig> {
    const [inserted] = await db.insert(integrationConfigs).values(config).returning();

    await this.logAction({
      action: "integration_created",
      entityType: "integration",
      entityId: inserted.id,
      details: { type: config.type, name: config.name },
    });

    return inserted;
  }

  async getIntegration(id: string): Promise<IntegrationConfig | undefined> {
    const [integration] = await db
      .select()
      .from(integrationConfigs)
      .where(eq(integrationConfigs.id, id));
    return integration;
  }

  async getIntegrationByType(type: IntegrationType): Promise<IntegrationConfig | undefined> {
    const [integration] = await db
      .select()
      .from(integrationConfigs)
      .where(
        and(
          eq(integrationConfigs.type, type),
          eq(integrationConfigs.status, "active")
        )
      );
    return integration;
  }

  async listIntegrations(): Promise<IntegrationConfig[]> {
    return db.select().from(integrationConfigs).orderBy(desc(integrationConfigs.createdAt));
  }

  async updateIntegration(id: string, updates: Partial<InsertIntegrationConfig>): Promise<IntegrationConfig | undefined> {
    const [updated] = await db
      .update(integrationConfigs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(integrationConfigs.id, id))
      .returning();

    if (updated) {
      await this.logAction({
        action: "integration_updated",
        entityType: "integration",
        entityId: id,
        details: { updates: Object.keys(updates) },
      });
    }

    return updated;
  }

  async updateIntegrationStatus(id: string, status: IntegrationStatus, error?: string): Promise<IntegrationConfig | undefined> {
    const [updated] = await db
      .update(integrationConfigs)
      .set({
        status,
        lastError: error || null,
        lastHealthCheck: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(integrationConfigs.id, id))
      .returning();

    if (updated) {
      await this.logAction({
        action: "integration_status_changed",
        entityType: "integration",
        entityId: id,
        details: { status, error },
      });
    }

    return updated;
  }

  async deleteIntegration(id: string): Promise<boolean> {
    await db.delete(integrationConfigs).where(eq(integrationConfigs.id, id));

    await this.logAction({
      action: "integration_deleted",
      entityType: "integration",
      entityId: id,
      details: {},
    });

    return true;
  }

  // ============ Phase 6: Action Export Operations ============

  async createActionExport(actionExport: InsertActionExport): Promise<ActionExport> {
    const [inserted] = await db.insert(actionExports).values(actionExport).returning();

    await this.logAction({
      action: "action_exported",
      entityType: "action_export",
      entityId: inserted.id,
      details: {
        sourceType: actionExport.sourceType,
        sourceId: actionExport.sourceId,
        destinationType: actionExport.destinationType,
      },
    });

    return inserted;
  }

  async getActionExport(id: string): Promise<ActionExport | undefined> {
    const [actionExport] = await db
      .select()
      .from(actionExports)
      .where(eq(actionExports.id, id));
    return actionExport;
  }

  async listActionExports(sourceType?: string, limit: number = 50): Promise<ActionExport[]> {
    let query = db.select().from(actionExports).orderBy(desc(actionExports.exportedAt)).limit(limit);

    if (sourceType) {
      query = query.where(eq(actionExports.sourceType, sourceType)) as typeof query;
    }

    return query;
  }

  async updateActionExportStatus(
    id: string,
    status: string,
    destinationRef?: string,
    destinationUrl?: string,
    error?: string
  ): Promise<ActionExport | undefined> {
    const updates: Record<string, unknown> = { status };

    if (destinationRef) updates.destinationRef = destinationRef;
    if (destinationUrl) updates.destinationUrl = destinationUrl;
    if (error) updates.errorMessage = error;
    if (status === "success" || status === "failed") {
      updates.completedAt = new Date();
    }

    const [updated] = await db
      .update(actionExports)
      .set(updates)
      .where(eq(actionExports.id, id))
      .returning();

    return updated;
  }

  // ============ Agent Definitions ============

  async createAgentDefinition(definition: InsertAgentDefinition): Promise<AgentDefinition> {
    const [inserted] = await db.insert(agentDefinitions).values(definition).returning();

    await this.logAction({
      action: "create_agent_definition",
      entityType: "agent_definition",
      entityId: inserted.id,
      details: { name: definition.name, type: definition.type },
    });

    return inserted;
  }

  async getAgentDefinition(id: string): Promise<AgentDefinition | undefined> {
    const [definition] = await db
      .select()
      .from(agentDefinitions)
      .where(eq(agentDefinitions.id, id));
    return definition;
  }

  async getAgentDefinitionByType(type: string): Promise<AgentDefinition | undefined> {
    const [definition] = await db
      .select()
      .from(agentDefinitions)
      .where(eq(agentDefinitions.type, type));
    return definition;
  }

  async listAgentDefinitions(): Promise<AgentDefinition[]> {
    return db.select().from(agentDefinitions).orderBy(desc(agentDefinitions.createdAt));
  }

  async updateAgentDefinition(id: string, updates: Partial<InsertAgentDefinition>): Promise<AgentDefinition | undefined> {
    const [updated] = await db
      .update(agentDefinitions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(agentDefinitions.id, id))
      .returning();
    return updated;
  }

  async updateAgentLastRun(id: string, status: AgentRunStatus): Promise<void> {
    await db
      .update(agentDefinitions)
      .set({ lastRunAt: new Date(), lastRunStatus: status })
      .where(eq(agentDefinitions.id, id));
  }

  async deleteAgentDefinition(id: string): Promise<boolean> {
    const result = await db.delete(agentDefinitions).where(eq(agentDefinitions.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ============ Agent Runs ============

  async createAgentRun(run: InsertAgentRun): Promise<AgentRun> {
    const [inserted] = await db.insert(agentRuns).values(run).returning();

    await this.logAction({
      action: "create_agent_run",
      entityType: "agent_run",
      entityId: inserted.id,
      details: { agentId: run.agentId, agentType: run.agentType, triggerType: run.triggerType },
    });

    return inserted;
  }

  async getAgentRun(id: string): Promise<AgentRun | undefined> {
    const [run] = await db.select().from(agentRuns).where(eq(agentRuns.id, id));
    return run;
  }

  async listAgentRuns(agentId?: string, limit: number = 50): Promise<AgentRun[]> {
    let query = db.select().from(agentRuns).orderBy(desc(agentRuns.createdAt)).limit(limit);

    if (agentId) {
      query = query.where(eq(agentRuns.agentId, agentId)) as typeof query;
    }

    return query;
  }

  async updateAgentRun(id: string, updates: Partial<InsertAgentRun>): Promise<AgentRun | undefined> {
    const [updated] = await db
      .update(agentRuns)
      .set(updates)
      .where(eq(agentRuns.id, id))
      .returning();
    return updated;
  }

  async getAgentRunsByStatus(status: AgentRunStatus, limit: number = 50): Promise<AgentRun[]> {
    return db
      .select()
      .from(agentRuns)
      .where(eq(agentRuns.status, status))
      .orderBy(desc(agentRuns.createdAt))
      .limit(limit);
  }

  // ============ Agent Actions (Approval Queue) ============

  async createAgentAction(action: InsertAgentAction): Promise<AgentAction> {
    const [inserted] = await db.insert(agentActions).values(action).returning();

    await this.logAction({
      action: "create_agent_action",
      entityType: "agent_action",
      entityId: inserted.id,
      details: {
        agentId: action.agentId,
        actionType: action.actionType,
        actionName: action.actionName,
        requiresApproval: action.status === "pending",
      },
    });

    return inserted;
  }

  async getAgentAction(id: string): Promise<AgentAction | undefined> {
    const [action] = await db.select().from(agentActions).where(eq(agentActions.id, id));
    return action;
  }

  async listAgentActions(status?: AgentActionStatus, limit: number = 50): Promise<AgentAction[]> {
    let query = db.select().from(agentActions).orderBy(desc(agentActions.createdAt)).limit(limit);

    if (status) {
      query = query.where(eq(agentActions.status, status)) as typeof query;
    }

    return query;
  }

  async getPendingAgentActions(): Promise<AgentAction[]> {
    return db
      .select()
      .from(agentActions)
      .where(eq(agentActions.status, "pending"))
      .orderBy(desc(agentActions.createdAt));
  }

  async updateAgentAction(id: string, updates: Partial<InsertAgentAction>): Promise<AgentAction | undefined> {
    const [updated] = await db
      .update(agentActions)
      .set(updates)
      .where(eq(agentActions.id, id))
      .returning();
    return updated;
  }

  async approveAgentAction(
    id: string,
    approvedBy: string,
    modifiedAction?: Record<string, unknown>
  ): Promise<AgentAction | undefined> {
    const updates: Record<string, unknown> = {
      status: modifiedAction ? "modified" : "approved",
      reviewedBy: approvedBy,
      reviewedAt: new Date(),
    };

    if (modifiedAction) {
      updates.modifiedAction = modifiedAction;
    }

    const [updated] = await db
      .update(agentActions)
      .set(updates)
      .where(eq(agentActions.id, id))
      .returning();

    if (updated) {
      await this.logAction({
        action: modifiedAction ? "modify_agent_action" : "approve_agent_action",
        entityType: "agent_action",
        entityId: id,
        userId: approvedBy,
        details: { actionType: updated.actionType, actionName: updated.actionName },
      });
    }

    return updated;
  }

  async rejectAgentAction(id: string, rejectedBy: string, reason?: string): Promise<AgentAction | undefined> {
    const [updated] = await db
      .update(agentActions)
      .set({
        status: "rejected",
        reviewedBy: rejectedBy,
        reviewedAt: new Date(),
        reviewNotes: reason,
      })
      .where(eq(agentActions.id, id))
      .returning();

    if (updated) {
      await this.logAction({
        action: "reject_agent_action",
        entityType: "agent_action",
        entityId: id,
        userId: rejectedBy,
        details: { actionType: updated.actionType, reason },
      });
    }

    return updated;
  }

  async executeAgentAction(id: string, result: { success: boolean; destinationRef?: string; destinationUrl?: string; responseData?: unknown; executionTimeMs?: number }): Promise<AgentAction | undefined> {
    const [updated] = await db
      .update(agentActions)
      .set({
        status: "executed",
        executedAt: new Date(),
        executionResult: result,
      })
      .where(eq(agentActions.id, id))
      .returning();

    if (updated) {
      await this.logAction({
        action: "execute_agent_action",
        entityType: "agent_action",
        entityId: id,
        details: { actionType: updated.actionType, success: true },
      });
    }

    return updated;
  }

  async failAgentAction(id: string, error: string): Promise<AgentAction | undefined> {
    const [updated] = await db
      .update(agentActions)
      .set({
        status: "failed",
        executedAt: new Date(),
        executionError: error,
      })
      .where(eq(agentActions.id, id))
      .returning();

    return updated;
  }

  // ============ Alerts ============

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [inserted] = await db.insert(alerts).values(alert).returning();

    await this.logAction({
      action: "create_alert",
      entityType: "alert",
      entityId: inserted.id,
      details: { severity: alert.severity, title: alert.title },
    });

    return inserted;
  }

  async getAlert(id: string): Promise<Alert | undefined> {
    const [alert] = await db.select().from(alerts).where(eq(alerts.id, id));
    return alert;
  }

  async listAlerts(status?: string, limit: number = 50): Promise<Alert[]> {
    let query = db.select().from(alerts).orderBy(desc(alerts.createdAt)).limit(limit);

    if (status) {
      query = query.where(eq(alerts.status, status)) as typeof query;
    }

    return query;
  }

  async acknowledgeAlert(id: string, acknowledgedBy: string): Promise<Alert | undefined> {
    const [updated] = await db
      .update(alerts)
      .set({
        status: "acknowledged",
        acknowledgedBy,
        acknowledgedAt: new Date(),
      })
      .where(eq(alerts.id, id))
      .returning();

    if (updated) {
      await this.logAction({
        action: "acknowledge_alert",
        entityType: "alert",
        entityId: id,
        userId: acknowledgedBy,
        details: { title: updated.title },
      });
    }

    return updated;
  }

  async dismissAlert(id: string, dismissedBy: string): Promise<Alert | undefined> {
    const [updated] = await db
      .update(alerts)
      .set({
        status: "dismissed",
        dismissedBy,
        dismissedAt: new Date(),
      })
      .where(eq(alerts.id, id))
      .returning();

    if (updated) {
      await this.logAction({
        action: "dismiss_alert",
        entityType: "alert",
        entityId: id,
        userId: dismissedBy,
        details: { title: updated.title },
      });
    }

    return updated;
  }

  async resolveAlert(id: string): Promise<Alert | undefined> {
    const [updated] = await db
      .update(alerts)
      .set({
        status: "resolved",
        resolvedAt: new Date(),
      })
      .where(eq(alerts.id, id))
      .returning();

    if (updated) {
      await this.logAction({
        action: "resolve_alert",
        entityType: "alert",
        entityId: id,
        details: { title: updated.title },
      });
    }

    return updated;
  }

  async getActiveAlertCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(alerts)
      .where(eq(alerts.status, "active"));
    return result[0]?.count ?? 0;
  }

  // ============================================================================
  // Phase 7B: Attribution & Staleness Storage Methods
  // ============================================================================

  // Outcome events
  async getOutcomeEventsByHcp(hcpId: string): Promise<typeof outcomeEvents.$inferSelect[]> {
    return db
      .select()
      .from(outcomeEvents)
      .where(eq(outcomeEvents.hcpId, hcpId))
      .orderBy(desc(outcomeEvents.eventDate));
  }

  // Attribution configs
  async getAttributionConfigs(): Promise<typeof attributionConfig.$inferSelect[]> {
    return db.select().from(attributionConfig).orderBy(attributionConfig.channel);
  }

  // Prediction staleness
  async getPredictionStalenessForHcp(hcpId: string): Promise<typeof predictionStaleness.$inferSelect[]> {
    return db
      .select()
      .from(predictionStaleness)
      .where(eq(predictionStaleness.hcpId, hcpId));
  }

  async getHcpsNeedingRefresh(predictionType?: string, limit: number = 100): Promise<typeof predictionStaleness.$inferSelect[]> {
    const conditions = [eq(predictionStaleness.recommendRefresh, true)];
    if (predictionType) {
      conditions.push(eq(predictionStaleness.predictionType, predictionType));
    }

    return db
      .select()
      .from(predictionStaleness)
      .where(and(...conditions))
      .orderBy(desc(predictionStaleness.stalenessScore))
      .limit(limit);
  }

  // Outcome attributions
  async getAttributionsForOutcome(outcomeId: string): Promise<typeof outcomeAttributions.$inferSelect[]> {
    return db
      .select()
      .from(outcomeAttributions)
      .where(eq(outcomeAttributions.outcomeEventId, outcomeId))
      .orderBy(desc(outcomeAttributions.contributionWeight));
  }

  async getAttributionsForStimulus(stimulusId: string): Promise<typeof outcomeAttributions.$inferSelect[]> {
    return db
      .select()
      .from(outcomeAttributions)
      .where(eq(outcomeAttributions.stimulusId, stimulusId))
      .orderBy(desc(outcomeAttributions.createdAt));
  }
}

export const storage = new DatabaseStorage();
