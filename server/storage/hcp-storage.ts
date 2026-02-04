/**
 * HCP Storage Module
 *
 * Handles all HCP-related database operations including:
 * - CRUD operations
 * - Search and filtering
 * - Similarity/lookalike matching
 * - Data seeding
 */
import { randomUUID } from "crypto";
import { db } from "../db";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import {
  hcpProfiles,
  type HCPProfile,
  type HCPFilter,
  type ChannelEngagement,
  type PrescribingTrend,
  specialties,
  tiers,
  segments,
  channels,
} from "@shared/schema";
import { dbRowToHcpProfile } from "./converters";
import { calculateSimilarityScore } from "../services/prediction-engine";
import { debugLog } from "../utils/config";
import {
  randomInt,
  randomFloat,
  randomChoice,
  firstNames,
  lastNames,
  organizations,
  cities,
  months,
} from "./utils";

// Generate channel engagement data for seeding
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
    ] as const),
    totalTouches: randomInt(5, 50),
    responseRate: randomFloat(10, 60),
  }));
}

// Generate prescribing trend data for seeding
function generatePrescribingTrend(): PrescribingTrend[] {
  const baseRx = randomInt(15, 60);
  const baseShare = randomFloat(5, 35);

  return months.slice(-6).map((month) => ({
    month,
    rxCount: Math.max(5, baseRx + randomInt(-10, 15)),
    marketShare: Math.max(5, Math.min(50, baseShare + randomFloat(-5, 8))),
  }));
}

// Generate a single HCP profile for seeding
function generateHcpProfile(): typeof hcpProfiles.$inferInsert {
  const cityData = randomChoice(cities);
  const channelEngagements = generateChannelEngagements();
  const prescribingTrend = generatePrescribingTrend();

  // Determine preferred channel based on highest engagement score
  const preferredChannel = channelEngagements.reduce((a, b) =>
    a.score > b.score ? a : b
  ).channel;

  const monthlyRx = prescribingTrend[prescribingTrend.length - 1].rxCount;

  return {
    id: randomUUID(),
    npi: String(randomInt(1000000000, 9999999999)),
    firstName: randomChoice(firstNames),
    lastName: randomChoice(lastNames),
    specialty: randomChoice(specialties),
    tier: randomChoice(tiers),
    segment: randomChoice(segments),
    organization: randomChoice(organizations),
    city: cityData.city,
    state: cityData.state,
    overallEngagementScore: randomInt(25, 95),
    channelPreference: preferredChannel,
    channelEngagements,
    monthlyRxVolume: monthlyRx,
    yearlyRxVolume: monthlyRx * 12 + randomInt(-50, 100),
    marketSharePct: prescribingTrend[prescribingTrend.length - 1].marketShare,
    prescribingTrend,
    conversionLikelihood: randomInt(20, 85),
    churnRisk: randomInt(5, 45),
    lastUpdated: new Date(),
  };
}

export class HcpStorage {
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

    if (filter.channelPreferences?.length) {
      conditions.push(inArray(hcpProfiles.channelPreference, filter.channelPreferences));
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
      .filter((hcp) => hcp.id !== hcpId)
      .map((hcp) => ({
        hcp,
        score: calculateSimilarityScore(targetHcp, hcp),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scoredHcps.map((s) => s.hcp);
  }

  async getHcpCount(): Promise<number> {
    const rows = await db.select().from(hcpProfiles);
    return rows.length;
  }

  async seedHcpData(count: number = 100): Promise<void> {
    const existingCount = await this.getHcpCount();
    if (existingCount > 0) {
      debugLog("Seed", `${existingCount} HCP profiles already exist, skipping seed`);
      return;
    }

    debugLog("Seed", `Creating ${count} HCP profiles...`);
    const profiles: (typeof hcpProfiles.$inferInsert)[] = [];

    for (let i = 0; i < count; i++) {
      profiles.push(generateHcpProfile());
    }

    // Insert in batches of 50
    const batchSize = 50;
    for (let i = 0; i < profiles.length; i += batchSize) {
      const batch = profiles.slice(i, i + batchSize);
      await db.insert(hcpProfiles).values(batch);
    }

    debugLog("Seed", `Successfully created ${count} HCP profiles`);
  }
}

// Singleton instance
export const hcpStorage = new HcpStorage();
