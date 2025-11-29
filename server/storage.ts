import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, ilike, or, and, gte, lte, inArray, sql, desc } from "drizzle-orm";
import {
  hcpProfiles,
  simulationScenarios,
  simulationResults,
  auditLogs,
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
} from "@shared/schema";
import { specialties, tiers, segments, channels } from "@shared/schema";

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
  
  // Database seeding
  seedHcpData(count?: number): Promise<void>;
  getHcpCount(): Promise<number>;
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

// Simulation engine - predictive model with enhanced algorithms
function runSimulationEngine(
  scenario: InsertSimulationScenario,
  hcpCount: number
): Omit<SimulationResult, "id" | "scenarioId" | "scenarioName" | "runAt"> {
  // Channel weights based on industry benchmarks
  const channelWeights: Record<Channel, number> = {
    email: 0.7,
    rep_visit: 1.2,
    webinar: 0.9,
    conference: 1.0,
    digital_ad: 0.6,
    phone: 0.8,
  };

  const contentWeights: Record<string, number> = {
    educational: 1.1,
    promotional: 0.9,
    clinical_data: 1.15,
    mixed: 1.0,
  };

  // Calculate weighted channel score
  let channelScore = 0;
  const channelPerformance: ChannelPerformance[] = Object.entries(scenario.channelMix).map(([channel, allocation]) => {
    const weight = channelWeights[channel as Channel];
    const contribution = (allocation / 100) * weight;
    channelScore += contribution;
    
    return {
      channel: channel as Channel,
      allocation,
      predictedResponse: randomFloat(15, 45) * weight,
      contribution: contribution * 100,
    };
  });

  // Calculate predicted outcomes with enhanced algorithms
  const frequencyFactor = Math.min(1.5, 0.5 + scenario.frequency * 0.1);
  const durationFactor = Math.min(1.3, 0.7 + scenario.duration * 0.05);
  const contentFactor = contentWeights[scenario.contentType] || 1.0;

  // Base rates with variance
  const baseEngagement = 45 + randomFloat(-5, 10);
  const baseResponse = 25 + randomFloat(-3, 8);
  const baseRxLift = 8 + randomFloat(-2, 5);

  const predictedEngagementRate = Math.min(95, baseEngagement * channelScore * frequencyFactor * contentFactor);
  const predictedResponseRate = Math.min(70, baseResponse * channelScore * durationFactor);
  const predictedRxLift = Math.min(25, baseRxLift * channelScore * durationFactor * contentFactor);
  const predictedReach = Math.floor(hcpCount * (0.7 + Math.random() * 0.25));

  const efficiencyScore = Math.floor(
    (predictedEngagementRate * 0.3 + predictedResponseRate * 0.4 + predictedRxLift * 2) * 0.8
  );

  // Baseline comparison (historical average)
  const baselineEngagement = 42;
  const baselineResponse = 22;
  const baselineRxLift = 6;

  const vsBaseline: BaselineComparison = {
    engagementDelta: predictedEngagementRate - baselineEngagement,
    responseDelta: predictedResponseRate - baselineResponse,
    rxLiftDelta: predictedRxLift - baselineRxLift,
  };

  return {
    predictedEngagementRate,
    predictedResponseRate,
    predictedRxLift,
    predictedReach,
    efficiencyScore: Math.min(100, efficiencyScore),
    channelPerformance,
    vsBaseline,
  };
}

// Similarity scoring for lookalike modeling
function calculateSimilarityScore(hcp1: HCPProfile, hcp2: HCPProfile): number {
  let score = 0;
  
  // Same specialty (high weight)
  if (hcp1.specialty === hcp2.specialty) score += 30;
  
  // Same tier (medium weight)
  if (hcp1.tier === hcp2.tier) score += 20;
  
  // Same segment (medium weight)
  if (hcp1.segment === hcp2.segment) score += 20;
  
  // Similar engagement score (within 15 points)
  const engagementDiff = Math.abs(hcp1.overallEngagementScore - hcp2.overallEngagementScore);
  if (engagementDiff <= 15) score += 15 - engagementDiff;
  
  // Similar Rx volume (within 20%)
  const rxRatio = Math.min(hcp1.monthlyRxVolume, hcp2.monthlyRxVolume) / 
                  Math.max(hcp1.monthlyRxVolume, hcp2.monthlyRxVolume);
  score += rxRatio * 10;
  
  // Same channel preference
  if (hcp1.channelPreference === hcp2.channelPreference) score += 5;
  
  return score;
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
    const hcpCount = await this.getHcpCount();
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

    // Log the simulation run
    await this.logAction({
      action: "simulation_run",
      entityType: "simulation",
      entityId: insertedResult.id,
      details: { scenarioName: scenario.name, hcpCount },
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
      console.log(`Database already has ${existingCount} HCPs, skipping seed`);
      return;
    }

    console.log(`Seeding database with ${count} HCP profiles...`);
    
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

    console.log(`Database seeded with ${count} HCPs and ${scenarios.length} initial simulations`);
  }
}

export const storage = new DatabaseStorage();
