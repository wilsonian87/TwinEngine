import { randomUUID } from "crypto";
import type {
  HCPProfile,
  HCPFilter,
  SimulationScenario,
  SimulationResult,
  InsertSimulationScenario,
  DashboardMetrics,
  Channel,
  Specialty,
  Tier,
  Segment,
  ChannelEngagement,
  PrescribingTrend,
} from "@shared/schema";
import { specialties, tiers, segments, channels } from "@shared/schema";

// Storage interface
export interface IStorage {
  // HCP operations
  getAllHcps(): Promise<HCPProfile[]>;
  getHcpById(id: string): Promise<HCPProfile | undefined>;
  getHcpByNpi(npi: string): Promise<HCPProfile | undefined>;
  filterHcps(filter: HCPFilter): Promise<HCPProfile[]>;

  // Simulation operations
  createSimulation(scenario: InsertSimulationScenario): Promise<SimulationResult>;
  getSimulationHistory(): Promise<SimulationResult[]>;
  getSimulationById(id: string): Promise<SimulationResult | undefined>;

  // Dashboard metrics
  getDashboardMetrics(): Promise<DashboardMetrics>;
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
  
  return months.slice(-6).map((month, i) => ({
    month,
    rxCount: Math.max(5, baseRx + randomInt(-10, 15)),
    marketShare: Math.max(5, Math.min(50, baseShare + randomFloat(-5, 8))),
  }));
}

function generateHcp(index: number): HCPProfile {
  const channelEngagements = generateChannelEngagements();
  const preferredChannel = channelEngagements.reduce((prev, curr) =>
    curr.score > prev.score ? curr : prev
  ).channel;
  
  const location = randomChoice(cities);
  
  return {
    id: randomUUID(),
    npi: `${1000000000 + index}`,
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
    lastUpdated: new Date().toISOString(),
  };
}

// Generate 100 sample HCPs
function generateHcpDatabase(count: number = 100): Map<string, HCPProfile> {
  const hcps = new Map<string, HCPProfile>();
  for (let i = 0; i < count; i++) {
    const hcp = generateHcp(i);
    hcps.set(hcp.id, hcp);
  }
  return hcps;
}

// Simulation engine - simple predictive model
function runSimulationEngine(
  scenario: InsertSimulationScenario,
  hcpCount: number
): Omit<SimulationResult, "id" | "scenarioId" | "scenarioName" | "runAt"> {
  // Base rates influenced by channel mix and frequency
  const channelWeights: Record<Channel, number> = {
    email: 0.7,
    rep_visit: 1.2,
    webinar: 0.9,
    conference: 1.0,
    digital_ad: 0.6,
    phone: 0.8,
  };

  const contentWeights = {
    educational: 1.1,
    promotional: 0.9,
    clinical_data: 1.15,
    mixed: 1.0,
  };

  // Calculate weighted channel score
  let channelScore = 0;
  const channelPerformance = Object.entries(scenario.channelMix).map(([channel, allocation]) => {
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

  // Calculate predicted outcomes
  const frequencyFactor = Math.min(1.5, 0.5 + scenario.frequency * 0.1);
  const durationFactor = Math.min(1.3, 0.7 + scenario.duration * 0.05);
  const contentFactor = contentWeights[scenario.contentType];

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

  // Baseline comparison (simulated historical average)
  const baselineEngagement = 42;
  const baselineResponse = 22;
  const baselineRxLift = 6;

  return {
    predictedEngagementRate,
    predictedResponseRate,
    predictedRxLift,
    predictedReach,
    efficiencyScore: Math.min(100, efficiencyScore),
    channelPerformance,
    vsBaseline: {
      engagementDelta: predictedEngagementRate - baselineEngagement,
      responseDelta: predictedResponseRate - baselineResponse,
      rxLiftDelta: predictedRxLift - baselineRxLift,
    },
  };
}

export class MemStorage implements IStorage {
  private hcps: Map<string, HCPProfile>;
  private simulations: Map<string, SimulationResult>;

  constructor() {
    this.hcps = generateHcpDatabase(100);
    this.simulations = new Map();
    
    // Generate some initial simulations for history
    this.generateInitialSimulations();
  }

  private generateInitialSimulations() {
    const scenarios: InsertSimulationScenario[] = [
      {
        name: "Q1 Digital Push",
        description: "Focus on digital channels",
        targetHcpIds: [],
        channelMix: { email: 40, rep_visit: 15, webinar: 20, conference: 5, digital_ad: 15, phone: 5 },
        frequency: 5,
        duration: 3,
        contentType: "educational",
      },
      {
        name: "Rep-Heavy Campaign",
        description: "Traditional field force approach",
        targetHcpIds: [],
        channelMix: { email: 15, rep_visit: 45, webinar: 10, conference: 15, digital_ad: 10, phone: 5 },
        frequency: 3,
        duration: 6,
        contentType: "clinical_data",
      },
      {
        name: "Balanced Omnichannel",
        description: "Even distribution across all channels",
        targetHcpIds: [],
        channelMix: { email: 20, rep_visit: 20, webinar: 15, conference: 15, digital_ad: 15, phone: 15 },
        frequency: 4,
        duration: 4,
        contentType: "mixed",
      },
    ];

    scenarios.forEach((scenario, i) => {
      const result = runSimulationEngine(scenario, this.hcps.size);
      const id = randomUUID();
      const simulationResult: SimulationResult = {
        id,
        scenarioId: randomUUID(),
        scenarioName: scenario.name,
        ...result,
        runAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
      };
      this.simulations.set(id, simulationResult);
    });
  }

  async getAllHcps(): Promise<HCPProfile[]> {
    return Array.from(this.hcps.values());
  }

  async getHcpById(id: string): Promise<HCPProfile | undefined> {
    return this.hcps.get(id);
  }

  async getHcpByNpi(npi: string): Promise<HCPProfile | undefined> {
    return Array.from(this.hcps.values()).find((hcp) => hcp.npi === npi);
  }

  async filterHcps(filter: HCPFilter): Promise<HCPProfile[]> {
    let result = Array.from(this.hcps.values());

    if (filter.search) {
      const search = filter.search.toLowerCase();
      result = result.filter(
        (hcp) =>
          hcp.firstName.toLowerCase().includes(search) ||
          hcp.lastName.toLowerCase().includes(search) ||
          hcp.npi.includes(search)
      );
    }

    if (filter.specialties?.length) {
      result = result.filter((hcp) => filter.specialties!.includes(hcp.specialty));
    }

    if (filter.tiers?.length) {
      result = result.filter((hcp) => filter.tiers!.includes(hcp.tier));
    }

    if (filter.segments?.length) {
      result = result.filter((hcp) => filter.segments!.includes(hcp.segment));
    }

    if (filter.minEngagementScore !== undefined) {
      result = result.filter((hcp) => hcp.overallEngagementScore >= filter.minEngagementScore!);
    }

    if (filter.channelPreference) {
      result = result.filter((hcp) => hcp.channelPreference === filter.channelPreference);
    }

    return result;
  }

  async createSimulation(scenario: InsertSimulationScenario): Promise<SimulationResult> {
    const result = runSimulationEngine(scenario, this.hcps.size);
    const id = randomUUID();
    const scenarioId = randomUUID();

    const simulationResult: SimulationResult = {
      id,
      scenarioId,
      scenarioName: scenario.name,
      ...result,
      runAt: new Date().toISOString(),
    };

    this.simulations.set(id, simulationResult);
    return simulationResult;
  }

  async getSimulationHistory(): Promise<SimulationResult[]> {
    return Array.from(this.simulations.values()).sort(
      (a, b) => new Date(b.runAt).getTime() - new Date(a.runAt).getTime()
    );
  }

  async getSimulationById(id: string): Promise<SimulationResult | undefined> {
    return this.simulations.get(id);
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const allHcps = Array.from(this.hcps.values());
    const allSimulations = Array.from(this.simulations.values());

    // Calculate segment distribution
    const segmentCounts = new Map<Segment, number>();
    segments.forEach((s) => segmentCounts.set(s, 0));
    allHcps.forEach((hcp) => {
      segmentCounts.set(hcp.segment, (segmentCounts.get(hcp.segment) || 0) + 1);
    });

    const segmentDistribution = segments.map((segment) => ({
      segment,
      count: segmentCounts.get(segment) || 0,
      percentage: ((segmentCounts.get(segment) || 0) / allHcps.length) * 100,
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
    const avgEngagement = allHcps.reduce((sum, h) => sum + h.overallEngagementScore, 0) / allHcps.length;
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
}

export const storage = new MemStorage();
