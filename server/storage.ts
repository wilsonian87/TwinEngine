import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, ilike, or, and, gte, lte, inArray, sql, desc } from "drizzle-orm";
import {
  hcpProfiles,
  simulationScenarios,
  simulationResults,
  auditLogs,
  stimuliEvents,
  counterfactualScenarios,
  nlQueryLogs,
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
} from "@shared/schema";
import { specialties, tiers, segments, channels, stimulusTypes } from "@shared/schema";

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
  const frequency = scenario.frequency ?? 4;
  const duration = scenario.duration ?? 3;
  const contentType = scenario.contentType ?? "mixed";
  const frequencyFactor = Math.min(1.5, 0.5 + frequency * 0.1);
  const durationFactor = Math.min(1.3, 0.7 + duration * 0.05);
  const contentFactor = contentWeights[contentType] || 1.0;

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

// Stimuli Impact Prediction Engine
function predictStimuliImpact(
  hcp: HCPProfile,
  stimulusType: StimulusType,
  channel: Channel,
  contentType?: string,
  callToAction?: string
): { engagementDelta: number; conversionDelta: number; confidenceLower: number; confidenceUpper: number } {
  // Base impact weights by stimulus type
  const stimulusWeights: Record<StimulusType, { engagement: number; conversion: number }> = {
    rep_visit: { engagement: 8, conversion: 5 },
    email_send: { engagement: 3, conversion: 1 },
    email_open: { engagement: 5, conversion: 2 },
    email_click: { engagement: 8, conversion: 4 },
    webinar_invite: { engagement: 4, conversion: 2 },
    webinar_attend: { engagement: 12, conversion: 6 },
    conference_meeting: { engagement: 15, conversion: 8 },
    phone_call: { engagement: 6, conversion: 3 },
    digital_ad_impression: { engagement: 1, conversion: 0.5 },
    digital_ad_click: { engagement: 4, conversion: 2 },
    sample_delivery: { engagement: 10, conversion: 7 },
    content_download: { engagement: 7, conversion: 4 },
  };

  // Channel affinity modifier based on HCP's preference
  const channelAffinityModifier = hcp.channelPreference === channel ? 1.3 : 0.9;
  
  // Tier modifier (Tier 1 typically more responsive)
  const tierModifier = hcp.tier === "Tier 1" ? 1.2 : hcp.tier === "Tier 2" ? 1.0 : 0.85;
  
  // Engagement score modifier (highly engaged HCPs respond better)
  const engagementModifier = 0.7 + (hcp.overallEngagementScore / 100) * 0.6;
  
  // Content type modifier
  const contentModifiers: Record<string, number> = {
    educational: 1.1,
    clinical_data: 1.15,
    promotional: 0.95,
    savings: 1.2,
    mixed: 1.0,
  };
  const contentModifier = contentType ? (contentModifiers[contentType] || 1.0) : 1.0;
  
  // CTA optimization (certain phrases historically perform better)
  let ctaModifier = 1.0;
  if (callToAction) {
    const cta = callToAction.toLowerCase();
    if (cta.includes("save") || cta.includes("savings")) ctaModifier = 1.15;
    else if (cta.includes("patient") || cta.includes("outcomes")) ctaModifier = 1.12;
    else if (cta.includes("learn") || cta.includes("discover")) ctaModifier = 1.05;
    else if (cta.includes("free") || cta.includes("trial")) ctaModifier = 1.08;
  }
  
  const baseWeight = stimulusWeights[stimulusType] || { engagement: 5, conversion: 2 };
  
  // Calculate predicted deltas
  const engagementDelta = baseWeight.engagement * channelAffinityModifier * tierModifier * engagementModifier * contentModifier * ctaModifier;
  const conversionDelta = baseWeight.conversion * channelAffinityModifier * tierModifier * engagementModifier * contentModifier * ctaModifier;
  
  // Calculate confidence interval (wider for less common interactions)
  const baseVariance = 0.25;
  const confidenceRange = Math.max(engagementDelta * baseVariance, 2);
  
  return {
    engagementDelta: parseFloat(engagementDelta.toFixed(2)),
    conversionDelta: parseFloat(conversionDelta.toFixed(2)),
    confidenceLower: parseFloat(Math.max(0, engagementDelta - confidenceRange).toFixed(2)),
    confidenceUpper: parseFloat((engagementDelta + confidenceRange).toFixed(2)),
  };
}

// Counterfactual Analysis Engine
function runCounterfactualAnalysis(
  hcps: HCPProfile[],
  changedVariables: CreateCounterfactualRequest["changedVariables"],
  analysisType: "aggregate" | "individual" | "both"
): {
  baselineOutcome: CounterfactualOutcome;
  counterfactualOutcome: CounterfactualOutcome;
  upliftDelta: UpliftDelta;
  confidenceInterval: ConfidenceInterval;
  hcpLevelResults: HCPCounterfactualResult[] | null;
} {
  // Calculate baseline metrics from current HCP data
  const totalHcps = hcps.length;
  const baselineEngagement = hcps.reduce((sum, h) => sum + h.overallEngagementScore, 0) / totalHcps;
  const baselineConversion = hcps.reduce((sum, h) => sum + h.conversionLikelihood, 0) / totalHcps;
  const baselineResponse = hcps.reduce((sum, h) => {
    const avgResponse = h.channelEngagements.reduce((s, c) => s + c.responseRate, 0) / h.channelEngagements.length;
    return sum + avgResponse;
  }, 0) / totalHcps;
  
  // Apply counterfactual changes to predict new outcomes
  let engagementMultiplier = 1.0;
  let responseMultiplier = 1.0;
  let conversionMultiplier = 1.0;
  let rxLiftMultiplier = 1.0;
  
  for (const variable of changedVariables) {
    switch (variable.variableType) {
      case "call_to_action":
        // CTA changes can significantly impact response rates
        const ctaOriginal = String(variable.originalValue).toLowerCase();
        const ctaNew = String(variable.counterfactualValue).toLowerCase();
        
        // Patient-focused CTAs typically perform better
        if (ctaNew.includes("patient") || ctaNew.includes("save") || ctaNew.includes("outcomes")) {
          responseMultiplier *= 1.18;
          conversionMultiplier *= 1.12;
        }
        if (ctaOriginal.includes("learn more") && !ctaNew.includes("learn more")) {
          responseMultiplier *= 1.08;
        }
        break;
        
      case "channel_mix":
        // Evaluate channel mix changes
        const origMix = variable.originalValue as Record<string, number>;
        const newMix = variable.counterfactualValue as Record<string, number>;
        
        // More rep visits typically increase engagement
        const repVisitDelta = ((newMix.rep_visit || 0) - (origMix.rep_visit || 0)) / 100;
        engagementMultiplier += repVisitDelta * 0.3;
        
        // More digital typically improves reach but lower per-contact impact
        const digitalDelta = ((newMix.digital_ad || 0) + (newMix.email || 0) - (origMix.digital_ad || 0) - (origMix.email || 0)) / 100;
        responseMultiplier += digitalDelta * 0.1;
        break;
        
      case "frequency":
        const freqOrig = Number(variable.originalValue);
        const freqNew = Number(variable.counterfactualValue);
        const freqRatio = freqNew / freqOrig;
        // Diminishing returns on frequency
        engagementMultiplier *= Math.pow(freqRatio, 0.4);
        break;
        
      case "content_type":
        if (variable.counterfactualValue === "clinical_data") {
          responseMultiplier *= 1.15;
          conversionMultiplier *= 1.1;
        } else if (variable.counterfactualValue === "educational") {
          engagementMultiplier *= 1.08;
        }
        break;
        
      case "messaging":
        // General messaging changes have moderate impact
        responseMultiplier *= 1.05;
        break;
        
      case "timing":
        // Timing optimization can improve response
        responseMultiplier *= 1.07;
        break;
        
      case "budget":
        const budgetRatio = Number(variable.counterfactualValue) / Number(variable.originalValue);
        engagementMultiplier *= Math.pow(budgetRatio, 0.3);
        break;
    }
  }
  
  // Calculate counterfactual outcomes
  const cfEngagement = Math.min(100, baselineEngagement * engagementMultiplier);
  const cfResponse = Math.min(100, baselineResponse * responseMultiplier);
  const cfConversion = Math.min(100, baselineConversion * conversionMultiplier);
  const cfRxLift = 8 * rxLiftMultiplier * (cfConversion / baselineConversion);
  
  const baselineOutcome: CounterfactualOutcome = {
    engagementRate: parseFloat(baselineEngagement.toFixed(2)),
    responseRate: parseFloat(baselineResponse.toFixed(2)),
    conversionRate: parseFloat(baselineConversion.toFixed(2)),
    rxLift: 8,
    totalReach: totalHcps,
  };
  
  const counterfactualOutcome: CounterfactualOutcome = {
    engagementRate: parseFloat(cfEngagement.toFixed(2)),
    responseRate: parseFloat(cfResponse.toFixed(2)),
    conversionRate: parseFloat(cfConversion.toFixed(2)),
    rxLift: parseFloat(cfRxLift.toFixed(2)),
    totalReach: totalHcps,
  };
  
  const percentageImprovement = ((cfConversion - baselineConversion) / baselineConversion) * 100;
  
  const upliftDelta: UpliftDelta = {
    engagementDelta: parseFloat((cfEngagement - baselineEngagement).toFixed(2)),
    responseDelta: parseFloat((cfResponse - baselineResponse).toFixed(2)),
    conversionDelta: parseFloat((cfConversion - baselineConversion).toFixed(2)),
    rxLiftDelta: parseFloat((cfRxLift - 8).toFixed(2)),
    percentageImprovement: parseFloat(percentageImprovement.toFixed(2)),
  };
  
  const confidenceInterval: ConfidenceInterval = {
    lower: parseFloat((percentageImprovement - 5).toFixed(2)),
    upper: parseFloat((percentageImprovement + 5).toFixed(2)),
    confidenceLevel: 0.95,
  };
  
  // Calculate per-HCP results if requested
  let hcpLevelResults: HCPCounterfactualResult[] | null = null;
  if (analysisType === "individual" || analysisType === "both") {
    hcpLevelResults = hcps.slice(0, 50).map(hcp => {
      const baseScore = hcp.overallEngagementScore;
      const delta = (cfEngagement - baselineEngagement) * (0.8 + Math.random() * 0.4);
      const cfScore = Math.min(100, baseScore + delta);
      
      return {
        hcpId: hcp.id,
        baselineScore: baseScore,
        counterfactualScore: parseFloat(cfScore.toFixed(2)),
        delta: parseFloat(delta.toFixed(2)),
        confidenceLower: parseFloat((delta - 3).toFixed(2)),
        confidenceUpper: parseFloat((delta + 3).toFixed(2)),
      };
    });
  }
  
  return {
    baselineOutcome,
    counterfactualOutcome,
    upliftDelta,
    confidenceInterval,
    hcpLevelResults,
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
    
    // Parse the natural language query to extract filters
    // This is a rule-based parser; will be enhanced with GenAI integration
    const filters = this.parseNLQueryToFilters(request.query);
    const parsedIntent = this.detectQueryIntent(request.query);
    
    // Apply filters to get matching HCPs
    const matchingHcps = await this.filterHcps(filters);
    const limitedResults = matchingHcps.slice(0, request.maxResults || 20);
    
    // Generate recommendations if requested
    let recommendations: NLRecommendation[] | undefined;
    if (request.includeRecommendations) {
      recommendations = this.generateRecommendations(filters, matchingHcps);
    }

    const executionTimeMs = Date.now() - startTime;

    // Log the query
    const [inserted] = await db.insert(nlQueryLogs).values({
      query: request.query,
      parsedIntent,
      extractedFilters: filters,
      resultCount: matchingHcps.length,
      resultHcpIds: limitedResults.map(h => h.id),
      recommendations,
      executionTimeMs,
      modelUsed: "rule-based", // Will be updated when GenAI is integrated
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

  // Rule-based NL query parser (to be enhanced with GenAI)
  private parseNLQueryToFilters(query: string): NLQueryFilters {
    const q = query.toLowerCase();
    const filters: NLQueryFilters = {};

    // Tier detection
    if (q.includes("tier 1") || q.includes("tier1")) {
      filters.tiers = ["Tier 1"];
    } else if (q.includes("tier 2") || q.includes("tier2")) {
      filters.tiers = ["Tier 2"];
    } else if (q.includes("tier 3") || q.includes("tier3")) {
      filters.tiers = ["Tier 3"];
    }

    // Specialty detection
    for (const specialty of specialties) {
      if (q.includes(specialty.toLowerCase())) {
        filters.specialties = [specialty];
        break;
      }
    }

    // Segment detection
    for (const segment of segments) {
      if (q.includes(segment.toLowerCase())) {
        filters.segments = [segment];
        break;
      }
    }

    // Channel detection
    for (const channel of channels) {
      const channelName = channel.replace("_", " ");
      if (q.includes(channelName) || q.includes(channel)) {
        filters.channels = [channel];
        break;
      }
    }

    // Engagement range detection
    const engagementMatch = q.match(/(\d+)\s*[-–]\s*(\d+)\s*%?\s*(engagement|score)?/);
    if (engagementMatch) {
      filters.engagementRange = {
        min: parseInt(engagementMatch[1]),
        max: parseInt(engagementMatch[2]),
      };
    }

    // High/low engagement
    if (q.includes("high engagement") || q.includes("highly engaged")) {
      filters.engagementRange = { min: 70 };
    } else if (q.includes("low engagement") || q.includes("poorly engaged")) {
      filters.engagementRange = { max: 40 };
    }

    return filters;
  }

  private detectQueryIntent(query: string): string {
    const q = query.toLowerCase();
    
    if (q.includes("boost") || q.includes("increase") || q.includes("improve")) {
      return "optimization";
    }
    if (q.includes("find") || q.includes("identify") || q.includes("show")) {
      return "discovery";
    }
    if (q.includes("why") || q.includes("reason") || q.includes("explain")) {
      return "analysis";
    }
    if (q.includes("compare") || q.includes("difference") || q.includes("versus")) {
      return "comparison";
    }
    
    return "general";
  }

  private generateRecommendations(filters: NLQueryFilters, hcps: HCPProfile[]): NLRecommendation[] {
    const recommendations: NLRecommendation[] = [];

    if (hcps.length === 0) return recommendations;

    // Analyze channel preferences
    const channelCounts = new Map<Channel, number>();
    hcps.forEach(h => {
      channelCounts.set(h.channelPreference, (channelCounts.get(h.channelPreference) || 0) + 1);
    });

    // Find most effective channel
    const sortedChannels = Array.from(channelCounts.entries()).sort((a, b) => b[1] - a[1]);
    if (sortedChannels.length > 0) {
      const [topChannel, count] = sortedChannels[0];
      const percentage = (count / hcps.length) * 100;
      recommendations.push({
        type: "channel",
        recommendation: `Focus on ${topChannel.replace("_", " ")} communications`,
        predictedImpact: 12 + Math.random() * 8,
        confidence: 0.78,
        rationale: `${percentage.toFixed(0)}% of this cohort prefers ${topChannel.replace("_", " ")} as their primary channel`,
      });
    }

    // Engagement-based recommendation
    const avgEngagement = hcps.reduce((sum, h) => sum + h.overallEngagementScore, 0) / hcps.length;
    if (avgEngagement < 50) {
      recommendations.push({
        type: "frequency",
        recommendation: "Increase touch frequency to 6+ per month",
        predictedImpact: 8 + Math.random() * 5,
        confidence: 0.72,
        rationale: "Low-engagement HCPs typically respond to more frequent, consistent outreach",
      });
    }

    // Content recommendation
    recommendations.push({
      type: "content",
      recommendation: "Use clinical data and patient outcome content",
      predictedImpact: 10 + Math.random() * 6,
      confidence: 0.81,
      rationale: "Clinical evidence-based content shows highest engagement across similar cohorts",
    });

    return recommendations;
  }

  async getNLQueryHistory(limit: number = 50): Promise<NLQueryResponse[]> {
    const rows = await db
      .select()
      .from(nlQueryLogs)
      .orderBy(desc(nlQueryLogs.createdAt))
      .limit(limit);
    return rows.map(dbRowToNLQueryResponse);
  }
}

export const storage = new DatabaseStorage();
