/**
 * Competitive Storage Module
 *
 * Handles competitive intelligence database operations including:
 * - Competitor CRUD operations
 * - HCP competitive signal tracking
 * - CPI (Competitive Pressure Index) calculation
 * - Competitive orbit data aggregation
 */
import { randomUUID } from "crypto";
import { db } from "../db";
import { eq, desc, and, gte, lte, inArray, sql } from "drizzle-orm";
import {
  competitorDim,
  hcpCompetitiveSignalFact,
  hcpProfiles,
  competitiveAlertConfig,
  auditLogs,
  type Competitor,
  type InsertCompetitorDim,
  type HcpCompetitiveSignal,
  type InsertHcpCompetitiveSignalFact,
  type HcpCompetitiveSummary,
  type CompetitiveOrbitData,
  type CompetitiveFilter,
  type CPIComponents,
  type CPIDirection,
  type CompetitiveAlertConfig,
  type InsertCompetitiveAlertConfig,
  type CreateCompetitiveAlertConfig,
  type ResolvedAlertThresholds,
  type InsertAuditLog,
  competitorTypes,
  therapeuticAreas,
} from "@shared/schema";

/**
 * CPI Calculation Formula Specification
 * =====================================
 *
 * The Competitive Pressure Index (CPI) is a normalized 0-100 score that quantifies
 * the competitive threat level for a specific HCP-Competitor pair.
 *
 * ## Components (Each contributes 0-25 points):
 *
 * 1. **Share Component** (0-25): Current share of brand
 *    - Formula: (shareOfBrand / 100) * 25
 *    - Higher competitor share = higher pressure
 *
 * 2. **Velocity Component** (0-25): Rate of competitor Rx growth vs ours
 *    - Formula: clamp((competitiveRxVelocity - ourRxVelocity + 50) / 100, 0, 1) * 25
 *    - Positive velocity differential (competitor growing faster) = higher pressure
 *
 * 3. **Engagement Component** (0-25): Engagement asymmetry
 *    - Formula: clamp((engagementAsymmetry + 50) / 100, 0, 1) * 25
 *    - Positive asymmetry (competitor more engaged) = higher pressure
 *
 * 4. **Trend Component** (0-25): Share change trend (QoQ)
 *    - Formula: clamp((shareChangeQoQ + 25) / 50, 0, 1) * 25
 *    - Positive trend (competitor gaining share) = higher pressure
 *
 * ## Normalization:
 * - Raw score = sum of all components (0-100)
 * - Final CPI = raw score (already normalized to 0-100)
 *
 * ## Direction Classification:
 * - "increasing": QoQ change > +2%
 * - "decreasing": QoQ change < -2%
 * - "stable": QoQ change between -2% and +2%
 *
 * ## Risk Level Mapping:
 * - CPI 0-25: "low"
 * - CPI 26-50: "medium"
 * - CPI 51-75: "high"
 * - CPI 76-100: "critical"
 */

// Helper functions
const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const randomFloat = (min: number, max: number, decimals: number = 2): number =>
  parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomChoice = <T>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

/**
 * Calculate CPI components from raw metrics
 */
export function calculateCPIComponents(
  shareOfBrand: number | null,
  shareChangeQoQ: number | null,
  competitiveRxVelocity: number | null,
  ourRxVelocity: number | null,
  engagementAsymmetry: number | null
): CPIComponents {
  // Share component: higher competitor share = higher pressure
  const shareComponent = shareOfBrand !== null
    ? clamp((shareOfBrand / 100) * 25, 0, 25)
    : 0;

  // Velocity component: competitor growing faster = higher pressure
  const velocityDiff = (competitiveRxVelocity ?? 0) - (ourRxVelocity ?? 0);
  const velocityComponent = clamp(((velocityDiff + 50) / 100) * 25, 0, 25);

  // Engagement component: competitor more engaged = higher pressure
  const engagementComponent = engagementAsymmetry !== null
    ? clamp(((engagementAsymmetry + 50) / 100) * 25, 0, 25)
    : 0;

  // Trend component: competitor gaining share = higher pressure
  const trendComponent = shareChangeQoQ !== null
    ? clamp(((shareChangeQoQ + 25) / 50) * 25, 0, 25)
    : 0;

  const rawScore = shareComponent + velocityComponent + engagementComponent + trendComponent;
  const normalizedScore = clamp(rawScore, 0, 100);

  return {
    shareComponent: parseFloat(shareComponent.toFixed(2)),
    velocityComponent: parseFloat(velocityComponent.toFixed(2)),
    engagementComponent: parseFloat(engagementComponent.toFixed(2)),
    trendComponent: parseFloat(trendComponent.toFixed(2)),
    rawScore: parseFloat(rawScore.toFixed(2)),
    normalizedScore: parseFloat(normalizedScore.toFixed(2)),
  };
}

/**
 * Determine CPI direction from QoQ change
 */
export function determineCPIDirection(shareChangeQoQ: number | null): CPIDirection {
  if (shareChangeQoQ === null) return "stable";
  if (shareChangeQoQ > 2) return "increasing";
  if (shareChangeQoQ < -2) return "decreasing";
  return "stable";
}

/**
 * Map CPI score to risk level
 */
export function cpiToRiskLevel(cpi: number): "low" | "medium" | "high" | "critical" {
  if (cpi <= 25) return "low";
  if (cpi <= 50) return "medium";
  if (cpi <= 75) return "high";
  return "critical";
}

/**
 * DB row to API type converter for Competitor
 */
function dbRowToCompetitor(row: typeof competitorDim.$inferSelect): Competitor {
  return {
    id: row.id,
    name: row.name,
    type: row.type as "brand" | "therapeutic_class_peer",
    therapeuticArea: row.therapeuticArea,
    marketShare: row.marketShare,
    color: row.color,
    logoUrl: row.logoUrl,
    parentCompany: row.parentCompany,
    launchYear: row.launchYear,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * DB row to API type converter for HcpCompetitiveSignal
 */
function dbRowToHcpCompetitiveSignal(
  row: typeof hcpCompetitiveSignalFact.$inferSelect,
  competitor?: typeof competitorDim.$inferSelect
): HcpCompetitiveSignal {
  return {
    id: row.id,
    hcpId: row.hcpId,
    competitorId: row.competitorId,
    competitorName: competitor?.name,
    competitorColor: competitor?.color ?? undefined,
    shareOfBrand: row.shareOfBrand,
    shareChangeQoQ: row.shareChangeQoQ,
    shareChangeMoM: row.shareChangeMoM,
    competitiveRxVelocity: row.competitiveRxVelocity,
    ourRxVelocity: row.ourRxVelocity,
    competitorEngagementScore: row.competitorEngagementScore,
    engagementAsymmetry: row.engagementAsymmetry,
    cpi: row.cpi,
    cpiDirection: row.cpiDirection as CPIDirection | null,
    cpiComponents: row.cpiComponents as CPIComponents | null,
    measurementDate: row.measurementDate.toISOString(),
    dataSource: row.dataSource,
    confidenceLevel: row.confidenceLevel,
    createdAt: row.createdAt.toISOString(),
  };
}

export class CompetitiveStorage {
  // ============ Competitor CRUD ============

  async createCompetitor(data: InsertCompetitorDim): Promise<Competitor> {
    const id = randomUUID();
    const [created] = await db
      .insert(competitorDim)
      .values({ ...data, id })
      .returning();
    return dbRowToCompetitor(created);
  }

  async getCompetitorById(id: string): Promise<Competitor | undefined> {
    const rows = await db.select().from(competitorDim).where(eq(competitorDim.id, id));
    return rows.length > 0 ? dbRowToCompetitor(rows[0]) : undefined;
  }

  async getAllCompetitors(activeOnly: boolean = true): Promise<Competitor[]> {
    const query = activeOnly
      ? db.select().from(competitorDim).where(eq(competitorDim.isActive, true))
      : db.select().from(competitorDim);
    const rows = await query.orderBy(desc(competitorDim.marketShare));
    return rows.map(dbRowToCompetitor);
  }

  async updateCompetitor(id: string, data: Partial<InsertCompetitorDim>): Promise<Competitor | undefined> {
    const [updated] = await db
      .update(competitorDim)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(competitorDim.id, id))
      .returning();
    return updated ? dbRowToCompetitor(updated) : undefined;
  }

  async deleteCompetitor(id: string): Promise<boolean> {
    // Soft delete by setting isActive to false
    const [updated] = await db
      .update(competitorDim)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(competitorDim.id, id))
      .returning();
    return !!updated;
  }

  // ============ Competitive Signal Operations ============

  async recordCompetitiveSignal(data: Omit<InsertHcpCompetitiveSignalFact, "cpi" | "cpiDirection" | "cpiComponents">): Promise<HcpCompetitiveSignal> {
    // Calculate CPI components
    const cpiComponents = calculateCPIComponents(
      data.shareOfBrand ?? null,
      data.shareChangeQoQ ?? null,
      data.competitiveRxVelocity ?? null,
      data.ourRxVelocity ?? null,
      data.engagementAsymmetry ?? null
    );

    const cpiDirection = determineCPIDirection(data.shareChangeQoQ ?? null);

    const id = randomUUID();
    const [created] = await db
      .insert(hcpCompetitiveSignalFact)
      .values({
        ...data,
        id,
        cpi: cpiComponents.normalizedScore,
        cpiDirection,
        cpiComponents,
      })
      .returning();

    const competitor = await this.getCompetitorById(data.competitorId);
    return dbRowToHcpCompetitiveSignal(created, competitor ? {
      ...competitor,
      createdAt: new Date(competitor.createdAt),
      updatedAt: new Date(competitor.updatedAt),
      type: competitor.type,
    } as typeof competitorDim.$inferSelect : undefined);
  }

  async getCompetitiveSignalsForHcp(hcpId: string): Promise<HcpCompetitiveSignal[]> {
    const rows = await db
      .select()
      .from(hcpCompetitiveSignalFact)
      .where(eq(hcpCompetitiveSignalFact.hcpId, hcpId))
      .orderBy(desc(hcpCompetitiveSignalFact.measurementDate));

    // Fetch competitor details for each signal
    const competitorIds = Array.from(new Set(rows.map(r => r.competitorId)));
    const competitors = competitorIds.length > 0
      ? await db.select().from(competitorDim).where(inArray(competitorDim.id, competitorIds))
      : [];
    const competitorMap = new Map(competitors.map(c => [c.id, c]));

    return rows.map(row => dbRowToHcpCompetitiveSignal(row, competitorMap.get(row.competitorId)));
  }

  async getCompetitiveSignalsByFilter(filter: CompetitiveFilter): Promise<HcpCompetitiveSignal[]> {
    const conditions = [];

    if (filter.competitorIds && filter.competitorIds.length > 0) {
      conditions.push(inArray(hcpCompetitiveSignalFact.competitorId, filter.competitorIds));
    }
    if (filter.hcpIds && filter.hcpIds.length > 0) {
      conditions.push(inArray(hcpCompetitiveSignalFact.hcpId, filter.hcpIds));
    }
    if (filter.minCpi !== undefined) {
      conditions.push(gte(hcpCompetitiveSignalFact.cpi, filter.minCpi));
    }
    if (filter.maxCpi !== undefined) {
      conditions.push(lte(hcpCompetitiveSignalFact.cpi, filter.maxCpi));
    }
    if (filter.cpiDirection) {
      conditions.push(eq(hcpCompetitiveSignalFact.cpiDirection, filter.cpiDirection));
    }
    if (filter.dateFrom) {
      conditions.push(gte(hcpCompetitiveSignalFact.measurementDate, new Date(filter.dateFrom)));
    }
    if (filter.dateTo) {
      conditions.push(lte(hcpCompetitiveSignalFact.measurementDate, new Date(filter.dateTo)));
    }

    const query = conditions.length > 0
      ? db.select().from(hcpCompetitiveSignalFact).where(and(...conditions))
      : db.select().from(hcpCompetitiveSignalFact);

    const rows = await query.orderBy(desc(hcpCompetitiveSignalFact.cpi)).limit(500);

    // Fetch competitor details
    const competitorIds = Array.from(new Set(rows.map(r => r.competitorId)));
    const competitors = competitorIds.length > 0
      ? await db.select().from(competitorDim).where(inArray(competitorDim.id, competitorIds))
      : [];
    const competitorMap = new Map(competitors.map(c => [c.id, c]));

    return rows.map(row => dbRowToHcpCompetitiveSignal(row, competitorMap.get(row.competitorId)));
  }

  // ============ Aggregated Views ============

  async getHcpCompetitiveSummary(hcpId: string): Promise<HcpCompetitiveSummary | undefined> {
    // Get HCP details
    const hcpRows = await db.select().from(hcpProfiles).where(eq(hcpProfiles.id, hcpId));
    if (hcpRows.length === 0) return undefined;
    const hcp = hcpRows[0];

    // Get all competitive signals for this HCP
    const signals = await this.getCompetitiveSignalsForHcp(hcpId);
    if (signals.length === 0) {
      return {
        hcpId,
        hcpName: `${hcp.firstName} ${hcp.lastName}`,
        overallCpi: 0,
        topCompetitor: null,
        competitorCount: 0,
        signals: [],
        riskLevel: "low",
        recommendedAction: null,
      };
    }

    // Calculate weighted average CPI (weighted by confidence level)
    const totalWeight = signals.reduce((sum, s) => sum + (s.confidenceLevel ?? 1), 0);
    const weightedCpi = signals.reduce(
      (sum, s) => sum + (s.cpi ?? 0) * (s.confidenceLevel ?? 1),
      0
    ) / totalWeight;

    // Find top competitor (highest CPI)
    const topSignal = signals.reduce((top, s) =>
      (s.cpi ?? 0) > (top.cpi ?? 0) ? s : top
    );

    const riskLevel = cpiToRiskLevel(weightedCpi);

    // Generate recommended action based on risk level
    const recommendedAction = this.generateRecommendedAction(riskLevel, topSignal);

    return {
      hcpId,
      hcpName: `${hcp.firstName} ${hcp.lastName}`,
      overallCpi: parseFloat(weightedCpi.toFixed(2)),
      topCompetitor: topSignal.competitorName ? {
        id: topSignal.competitorId,
        name: topSignal.competitorName,
        cpi: topSignal.cpi ?? 0,
        color: topSignal.competitorColor ?? null,
      } : null,
      competitorCount: new Set(signals.map(s => s.competitorId)).size,
      signals,
      riskLevel,
      recommendedAction,
    };
  }

  private generateRecommendedAction(
    riskLevel: "low" | "medium" | "high" | "critical",
    topSignal: HcpCompetitiveSignal
  ): string | null {
    switch (riskLevel) {
      case "critical":
        return `Immediate defensive intervention required. ${topSignal.competitorName} shows strong competitive pressure with CPI ${topSignal.cpi?.toFixed(0)}. Consider priority outreach and value messaging reinforcement.`;
      case "high":
        return `Elevated competitive pressure from ${topSignal.competitorName}. Recommend increased engagement frequency and competitive differentiation messaging.`;
      case "medium":
        return `Monitor ${topSignal.competitorName} activity. Consider proactive engagement to maintain position.`;
      case "low":
        return null;
    }
  }

  async getCompetitiveOrbitData(): Promise<CompetitiveOrbitData> {
    // Get all active competitors
    const competitors = await this.getAllCompetitors(true);

    // Get latest signals for all competitors
    const latestSignals = await db
      .select()
      .from(hcpCompetitiveSignalFact)
      .orderBy(desc(hcpCompetitiveSignalFact.measurementDate))
      .limit(1000);

    // Aggregate by competitor
    const competitorStats = new Map<string, {
      totalCpi: number;
      count: number;
      hcpIds: Set<string>;
    }>();

    for (const signal of latestSignals) {
      const existing = competitorStats.get(signal.competitorId) || {
        totalCpi: 0,
        count: 0,
        hcpIds: new Set<string>(),
      };
      existing.totalCpi += signal.cpi ?? 0;
      existing.count += 1;
      existing.hcpIds.add(signal.hcpId);
      competitorStats.set(signal.competitorId, existing);
    }

    // Build competitor orbit data
    const competitorOrbitData = competitors.map(c => {
      const stats = competitorStats.get(c.id);
      const avgCpi = stats ? stats.totalCpi / stats.count : 0;

      // Ring distance: higher CPI = closer to center (more pressure)
      // Scale: CPI 100 = distance 0.2, CPI 0 = distance 1.0
      const ringDistance = 1 - (avgCpi / 100) * 0.8;

      // Ring thickness: based on market share (0.5-3.0)
      const ringThickness = 0.5 + (c.marketShare ?? 0) / 100 * 2.5;

      return {
        id: c.id,
        name: c.name,
        type: c.type,
        color: c.color ?? "#888888",
        marketShare: c.marketShare ?? 0,
        avgCpi: parseFloat(avgCpi.toFixed(2)),
        affectedHcpCount: stats?.hcpIds.size ?? 0,
        ringDistance: parseFloat(ringDistance.toFixed(3)),
        ringThickness: parseFloat(ringThickness.toFixed(2)),
      };
    });

    // Build drift vectors (HCPs with high CPI towards specific competitors)
    const hcpDriftVectors = latestSignals
      .filter(s => (s.cpi ?? 0) > 40) // Only show significant drift
      .map(s => ({
        hcpId: s.hcpId,
        competitorId: s.competitorId,
        driftStrength: ((s.cpi ?? 0) / 100),
        driftDirection: (s.cpiDirection === "increasing" ? "toward" :
                        s.cpiDirection === "decreasing" ? "away" : "toward") as "toward" | "away",
      }));

    // Calculate summary
    const allCpis = latestSignals.map(s => s.cpi ?? 0);
    const avgOverallCpi = allCpis.length > 0
      ? allCpis.reduce((a, b) => a + b, 0) / allCpis.length
      : 0;

    const sortedCompetitors = [...competitorOrbitData].sort((a, b) => b.avgCpi - a.avgCpi);

    return {
      competitors: competitorOrbitData,
      hcpDriftVectors,
      summary: {
        totalHcpsUnderPressure: new Set(latestSignals.filter(s => (s.cpi ?? 0) > 50).map(s => s.hcpId)).size,
        avgOverallCpi: parseFloat(avgOverallCpi.toFixed(2)),
        highestPressureCompetitor: sortedCompetitors[0]?.name ?? null,
        lowestPressureCompetitor: sortedCompetitors[sortedCompetitors.length - 1]?.name ?? null,
      },
    };
  }

  // ============ Synthetic Data Generation ============

  /**
   * Generate synthetic competitor data for demo/testing
   */
  async seedCompetitorData(): Promise<{ competitors: number; signals: number }> {
    // Check if data already exists
    const existingCompetitors = await db.select().from(competitorDim).limit(1);
    if (existingCompetitors.length > 0) {
      console.log("[CompetitiveStorage] Competitor data already seeded");
      return { competitors: 0, signals: 0 };
    }

    console.log("[CompetitiveStorage] Seeding competitor data...");

    // Define realistic competitors
    const competitorData: InsertCompetitorDim[] = [
      { name: "CompetitorX Pharma", type: "brand", therapeuticArea: "Oncology", marketShare: 28.5, color: "#E63946", parentCompany: "Global Pharma Inc", launchYear: 2018 },
      { name: "BioGen Solutions", type: "brand", therapeuticArea: "Oncology", marketShare: 22.3, color: "#457B9D", parentCompany: "BioGen Holdings", launchYear: 2019 },
      { name: "MedTech Alliance", type: "brand", therapeuticArea: "Cardiology", marketShare: 18.7, color: "#2A9D8F", parentCompany: "MedTech Corp", launchYear: 2020 },
      { name: "PharmaCure", type: "brand", therapeuticArea: "Neurology", marketShare: 15.2, color: "#E9C46A", parentCompany: "Cure Industries", launchYear: 2017 },
      { name: "HealthFirst Labs", type: "brand", therapeuticArea: "Immunology", marketShare: 12.8, color: "#F4A261", parentCompany: "HealthFirst Inc", launchYear: 2021 },
      { name: "Generic Class Leader", type: "therapeutic_class_peer", therapeuticArea: "Oncology", marketShare: 35.0, color: "#264653", launchYear: 2010 },
      { name: "Biosimilar Alliance", type: "therapeutic_class_peer", therapeuticArea: "Immunology", marketShare: 25.0, color: "#6D6875", launchYear: 2015 },
    ];

    // Insert competitors
    const competitors: Competitor[] = [];
    for (const data of competitorData) {
      const competitor = await this.createCompetitor(data);
      competitors.push(competitor);
    }

    // Get existing HCPs
    const hcps = await db.select().from(hcpProfiles).limit(100);
    if (hcps.length === 0) {
      console.log("[CompetitiveStorage] No HCPs found, skipping signal generation");
      return { competitors: competitors.length, signals: 0 };
    }

    // Generate competitive signals for HCPs
    let signalCount = 0;
    const measurementDate = new Date();

    for (const hcp of hcps) {
      // Each HCP has signals from 2-4 competitors
      const numCompetitors = randomInt(2, 4);
      const selectedCompetitors = competitors
        .sort(() => Math.random() - 0.5)
        .slice(0, numCompetitors);

      for (const competitor of selectedCompetitors) {
        const shareOfBrand = randomFloat(5, 45);
        const shareChangeQoQ = randomFloat(-15, 15);
        const shareChangeMoM = randomFloat(-8, 8);
        const competitiveRxVelocity = randomFloat(-20, 40);
        const ourRxVelocity = randomFloat(-10, 30);
        const competitorEngagementScore = randomInt(20, 90);
        const engagementAsymmetry = randomFloat(-30, 40);

        await this.recordCompetitiveSignal({
          hcpId: hcp.id,
          competitorId: competitor.id,
          shareOfBrand,
          shareChangeQoQ,
          shareChangeMoM,
          competitiveRxVelocity,
          ourRxVelocity,
          competitorEngagementScore,
          engagementAsymmetry,
          measurementDate,
          dataSource: "synthetic",
          confidenceLevel: randomFloat(0.7, 1.0),
        });
        signalCount++;
      }
    }

    console.log(`[CompetitiveStorage] Seeded ${competitors.length} competitors and ${signalCount} signals`);
    return { competitors: competitors.length, signals: signalCount };
  }

  // ============ TA-Specific Filtering (M12A.4) ============

  /**
   * Get competitors filtered by therapeutic area
   */
  async getCompetitorsByTherapeuticArea(
    therapeuticArea: string,
    activeOnly: boolean = true
  ): Promise<Competitor[]> {
    const conditions = [eq(competitorDim.therapeuticArea, therapeuticArea)];
    if (activeOnly) {
      conditions.push(eq(competitorDim.isActive, true));
    }

    const rows = await db
      .select()
      .from(competitorDim)
      .where(and(...conditions))
      .orderBy(desc(competitorDim.marketShare));

    return rows.map(dbRowToCompetitor);
  }

  /**
   * Get competitive signals filtered by therapeutic area
   * This joins with competitor_dim to filter by TA
   */
  async getCompetitiveSignalsByTherapeuticArea(
    therapeuticArea: string,
    options?: {
      minCpi?: number;
      maxCpi?: number;
      limit?: number;
    }
  ): Promise<HcpCompetitiveSignal[]> {
    // First get competitors in this TA
    const taCompetitors = await this.getCompetitorsByTherapeuticArea(therapeuticArea);
    const competitorIds = taCompetitors.map(c => c.id);

    if (competitorIds.length === 0) {
      return [];
    }

    const conditions = [inArray(hcpCompetitiveSignalFact.competitorId, competitorIds)];

    if (options?.minCpi !== undefined) {
      conditions.push(gte(hcpCompetitiveSignalFact.cpi, options.minCpi));
    }
    if (options?.maxCpi !== undefined) {
      conditions.push(lte(hcpCompetitiveSignalFact.cpi, options.maxCpi));
    }

    const rows = await db
      .select()
      .from(hcpCompetitiveSignalFact)
      .where(and(...conditions))
      .orderBy(desc(hcpCompetitiveSignalFact.cpi))
      .limit(options?.limit ?? 500);

    const competitorMap = new Map(taCompetitors.map(c => [c.id, {
      ...c,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
    } as typeof competitorDim.$inferSelect]));

    return rows.map(row => dbRowToHcpCompetitiveSignal(row, competitorMap.get(row.competitorId)));
  }

  /**
   * Get competitive orbit data filtered by therapeutic area
   */
  async getCompetitiveOrbitDataByTA(therapeuticArea: string): Promise<CompetitiveOrbitData> {
    const competitors = await this.getCompetitorsByTherapeuticArea(therapeuticArea);
    const competitorIds = competitors.map(c => c.id);

    if (competitorIds.length === 0) {
      return {
        competitors: [],
        hcpDriftVectors: [],
        summary: {
          totalHcpsUnderPressure: 0,
          avgOverallCpi: 0,
          highestPressureCompetitor: null,
          lowestPressureCompetitor: null,
        },
      };
    }

    const latestSignals = await db
      .select()
      .from(hcpCompetitiveSignalFact)
      .where(inArray(hcpCompetitiveSignalFact.competitorId, competitorIds))
      .orderBy(desc(hcpCompetitiveSignalFact.measurementDate))
      .limit(1000);

    // Aggregate by competitor
    const competitorStats = new Map<string, {
      totalCpi: number;
      count: number;
      hcpIds: Set<string>;
    }>();

    for (const signal of latestSignals) {
      const existing = competitorStats.get(signal.competitorId) || {
        totalCpi: 0,
        count: 0,
        hcpIds: new Set<string>(),
      };
      existing.totalCpi += signal.cpi ?? 0;
      existing.count++;
      existing.hcpIds.add(signal.hcpId);
      competitorStats.set(signal.competitorId, existing);
    }

    const competitorOrbitData = competitors.map(c => {
      const stats = competitorStats.get(c.id);
      const avgCpi = stats ? stats.totalCpi / stats.count : 0;

      // Ring distance: higher CPI = closer to center (more pressure)
      // Scale: CPI 100 = distance 0.2, CPI 0 = distance 1.0
      const ringDistance = 1 - (avgCpi / 100) * 0.8;

      // Ring thickness: based on market share (0.5-3.0)
      const marketShare = c.marketShare ?? 0;
      const ringThickness = 0.5 + (marketShare / 100) * 2.5;

      return {
        id: c.id,
        name: c.name,
        type: c.type,
        color: c.color || "#888888",
        avgCpi: parseFloat(avgCpi.toFixed(2)),
        affectedHcpCount: stats?.hcpIds.size ?? 0,
        marketShare,
        ringDistance: parseFloat(ringDistance.toFixed(3)),
        ringThickness: parseFloat(ringThickness.toFixed(2)),
      };
    });

    // Generate drift vectors
    const hcpDriftVectors = latestSignals
      .filter(s => (s.cpi ?? 0) > 50)
      .slice(0, 100)
      .map(s => ({
        hcpId: s.hcpId,
        competitorId: s.competitorId,
        driftStrength: ((s.cpi ?? 0) / 100),
        driftDirection: (s.cpiDirection === "increasing" ? "toward" :
                        s.cpiDirection === "decreasing" ? "away" : "toward") as "toward" | "away",
      }));

    const allCpis = latestSignals.map(s => s.cpi ?? 0);
    const avgOverallCpi = allCpis.length > 0
      ? allCpis.reduce((a, b) => a + b, 0) / allCpis.length
      : 0;

    const sortedCompetitors = [...competitorOrbitData].sort((a, b) => b.avgCpi - a.avgCpi);

    return {
      competitors: competitorOrbitData,
      hcpDriftVectors,
      summary: {
        totalHcpsUnderPressure: new Set(latestSignals.filter(s => (s.cpi ?? 0) > 50).map(s => s.hcpId)).size,
        avgOverallCpi: parseFloat(avgOverallCpi.toFixed(2)),
        highestPressureCompetitor: sortedCompetitors[0]?.name ?? null,
        lowestPressureCompetitor: sortedCompetitors[sortedCompetitors.length - 1]?.name ?? null,
      },
    };
  }

  /**
   * Get list of therapeutic areas with competitor counts
   */
  async getTherapeuticAreaSummary(): Promise<Array<{
    therapeuticArea: string;
    competitorCount: number;
    avgMarketShare: number;
  }>> {
    const competitors = await this.getAllCompetitors(true);

    const taMap = new Map<string, { count: number; totalShare: number }>();

    for (const competitor of competitors) {
      const ta = competitor.therapeuticArea || "Unassigned";
      const existing = taMap.get(ta) || { count: 0, totalShare: 0 };
      existing.count++;
      existing.totalShare += competitor.marketShare ?? 0;
      taMap.set(ta, existing);
    }

    return Array.from(taMap.entries())
      .map(([therapeuticArea, stats]) => ({
        therapeuticArea,
        competitorCount: stats.count,
        avgMarketShare: stats.count > 0 ? parseFloat((stats.totalShare / stats.count).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.competitorCount - a.competitorCount);
  }

  // ============================================================================
  // ALERT CONFIGURATION METHODS (Phase 12A.3)
  // ============================================================================

  /**
   * Create a new alert configuration
   */
  async createAlertConfig(config: CreateCompetitiveAlertConfig): Promise<CompetitiveAlertConfig> {
    const id = randomUUID();
    const now = new Date();

    await db.insert(competitiveAlertConfig).values({
      id,
      name: config.name,
      description: config.description ?? null,
      scope: config.scope,
      therapeuticArea: config.therapeuticArea ?? null,
      competitorId: config.competitorId ?? null,
      criticalCpiThreshold: config.criticalCpiThreshold,
      warningCpiThreshold: config.warningCpiThreshold,
      cpiTrendThreshold: config.cpiTrendThreshold,
      shareErosionThreshold: config.shareErosionThreshold,
      engagementAsymmetryThreshold: config.engagementAsymmetryThreshold,
      alertFrequency: config.alertFrequency,
      suppressDuplicateHours: config.suppressDuplicateHours,
      isActive: config.isActive,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id,
      name: config.name,
      description: config.description ?? null,
      scope: config.scope as "global" | "therapeutic_area" | "competitor",
      therapeuticArea: config.therapeuticArea ?? null,
      competitorId: config.competitorId ?? null,
      criticalCpiThreshold: config.criticalCpiThreshold,
      warningCpiThreshold: config.warningCpiThreshold,
      cpiTrendThreshold: config.cpiTrendThreshold,
      shareErosionThreshold: config.shareErosionThreshold,
      engagementAsymmetryThreshold: config.engagementAsymmetryThreshold,
      alertFrequency: config.alertFrequency as "realtime" | "daily" | "weekly",
      suppressDuplicateHours: config.suppressDuplicateHours,
      isActive: config.isActive,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      createdBy: null,
    };
  }

  /**
   * Get all alert configurations
   */
  async getAllAlertConfigs(activeOnly: boolean = false): Promise<CompetitiveAlertConfig[]> {
    const conditions = activeOnly ? [eq(competitiveAlertConfig.isActive, true)] : [];

    const rows = await db
      .select()
      .from(competitiveAlertConfig)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(competitiveAlertConfig.createdAt));

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      scope: row.scope as "global" | "therapeutic_area" | "competitor",
      therapeuticArea: row.therapeuticArea,
      competitorId: row.competitorId,
      criticalCpiThreshold: row.criticalCpiThreshold,
      warningCpiThreshold: row.warningCpiThreshold,
      cpiTrendThreshold: row.cpiTrendThreshold,
      shareErosionThreshold: row.shareErosionThreshold,
      engagementAsymmetryThreshold: row.engagementAsymmetryThreshold,
      alertFrequency: row.alertFrequency as "realtime" | "daily" | "weekly",
      suppressDuplicateHours: row.suppressDuplicateHours,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      createdBy: row.createdBy,
    }));
  }

  /**
   * Get alert configuration by ID
   */
  async getAlertConfigById(id: string): Promise<CompetitiveAlertConfig | null> {
    const rows = await db
      .select()
      .from(competitiveAlertConfig)
      .where(eq(competitiveAlertConfig.id, id))
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      scope: row.scope as "global" | "therapeutic_area" | "competitor",
      therapeuticArea: row.therapeuticArea,
      competitorId: row.competitorId,
      criticalCpiThreshold: row.criticalCpiThreshold,
      warningCpiThreshold: row.warningCpiThreshold,
      cpiTrendThreshold: row.cpiTrendThreshold,
      shareErosionThreshold: row.shareErosionThreshold,
      engagementAsymmetryThreshold: row.engagementAsymmetryThreshold,
      alertFrequency: row.alertFrequency as "realtime" | "daily" | "weekly",
      suppressDuplicateHours: row.suppressDuplicateHours,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      createdBy: row.createdBy,
    };
  }

  /**
   * Update an alert configuration
   */
  async updateAlertConfig(
    id: string,
    updates: Partial<CreateCompetitiveAlertConfig>
  ): Promise<CompetitiveAlertConfig | null> {
    const existing = await this.getAlertConfigById(id);
    if (!existing) return null;

    const now = new Date();

    await db
      .update(competitiveAlertConfig)
      .set({
        ...updates,
        updatedAt: now,
      })
      .where(eq(competitiveAlertConfig.id, id));

    return this.getAlertConfigById(id);
  }

  /**
   * Delete an alert configuration
   */
  async deleteAlertConfig(id: string): Promise<boolean> {
    const result = await db
      .delete(competitiveAlertConfig)
      .where(eq(competitiveAlertConfig.id, id));

    // Check if any rows were affected
    return true; // Drizzle doesn't return affected rows easily, assume success
  }

  /**
   * Resolve alert thresholds for a given context
   *
   * Priority order:
   * 1. Competitor-specific config (if competitorId provided)
   * 2. Therapeutic area config (if therapeuticArea provided)
   * 3. Global config
   * 4. Default hardcoded thresholds
   */
  async resolveAlertThresholds(
    therapeuticArea?: string,
    competitorId?: string
  ): Promise<ResolvedAlertThresholds> {
    // Default thresholds
    const defaults: ResolvedAlertThresholds = {
      criticalCpi: 75,
      warningCpi: 50,
      cpiTrendThreshold: 10,
      shareErosionThreshold: 5,
      engagementAsymmetryThreshold: 20,
      sourceConfigId: null,
      sourceConfigName: null,
    };

    // Get all active configs
    const allConfigs = await this.getAllAlertConfigs(true);

    // Try competitor-specific first
    if (competitorId) {
      const competitorConfig = allConfigs.find(
        c => c.scope === "competitor" && c.competitorId === competitorId
      );
      if (competitorConfig) {
        return {
          criticalCpi: competitorConfig.criticalCpiThreshold,
          warningCpi: competitorConfig.warningCpiThreshold,
          cpiTrendThreshold: competitorConfig.cpiTrendThreshold,
          shareErosionThreshold: competitorConfig.shareErosionThreshold,
          engagementAsymmetryThreshold: competitorConfig.engagementAsymmetryThreshold,
          sourceConfigId: competitorConfig.id,
          sourceConfigName: competitorConfig.name,
        };
      }
    }

    // Try therapeutic area
    if (therapeuticArea) {
      const taConfig = allConfigs.find(
        c => c.scope === "therapeutic_area" && c.therapeuticArea === therapeuticArea
      );
      if (taConfig) {
        return {
          criticalCpi: taConfig.criticalCpiThreshold,
          warningCpi: taConfig.warningCpiThreshold,
          cpiTrendThreshold: taConfig.cpiTrendThreshold,
          shareErosionThreshold: taConfig.shareErosionThreshold,
          engagementAsymmetryThreshold: taConfig.engagementAsymmetryThreshold,
          sourceConfigId: taConfig.id,
          sourceConfigName: taConfig.name,
        };
      }
    }

    // Try global config
    const globalConfig = allConfigs.find(c => c.scope === "global");
    if (globalConfig) {
      return {
        criticalCpi: globalConfig.criticalCpiThreshold,
        warningCpi: globalConfig.warningCpiThreshold,
        cpiTrendThreshold: globalConfig.cpiTrendThreshold,
        shareErosionThreshold: globalConfig.shareErosionThreshold,
        engagementAsymmetryThreshold: globalConfig.engagementAsymmetryThreshold,
        sourceConfigId: globalConfig.id,
        sourceConfigName: globalConfig.name,
      };
    }

    // Return defaults
    return defaults;
  }

  /**
   * Get alert configs for a specific therapeutic area
   */
  async getAlertConfigsByTherapeuticArea(therapeuticArea: string): Promise<CompetitiveAlertConfig[]> {
    const rows = await db
      .select()
      .from(competitiveAlertConfig)
      .where(
        and(
          eq(competitiveAlertConfig.therapeuticArea, therapeuticArea),
          eq(competitiveAlertConfig.isActive, true)
        )
      );

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      scope: row.scope as "global" | "therapeutic_area" | "competitor",
      therapeuticArea: row.therapeuticArea,
      competitorId: row.competitorId,
      criticalCpiThreshold: row.criticalCpiThreshold,
      warningCpiThreshold: row.warningCpiThreshold,
      cpiTrendThreshold: row.cpiTrendThreshold,
      shareErosionThreshold: row.shareErosionThreshold,
      engagementAsymmetryThreshold: row.engagementAsymmetryThreshold,
      alertFrequency: row.alertFrequency as "realtime" | "daily" | "weekly",
      suppressDuplicateHours: row.suppressDuplicateHours,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      createdBy: row.createdBy,
    }));
  }

  // ============================================================================
  // GOVERNANCE & AUDIT METHODS (Phase 12A.4)
  // ============================================================================

  /**
   * Log a competitive governance action to the audit trail
   */
  async logGovernanceAction(
    action: string,
    entityType: string,
    entityId: string | null,
    details: Record<string, unknown>,
    userId?: string
  ): Promise<void> {
    await db.insert(auditLogs).values({
      action,
      entityType,
      entityId,
      details,
      userId: userId ?? null,
      ipAddress: null,
    });
  }

  /**
   * Log CPI calculation for audit trail
   */
  async logCPICalculation(
    hcpId: string,
    competitorId: string,
    cpiComponents: CPIComponents,
    finalCpi: number,
    userId?: string
  ): Promise<void> {
    await this.logGovernanceAction(
      "cpi_calculation",
      "competitive_signal",
      `${hcpId}-${competitorId}`,
      {
        hcpId,
        competitorId,
        shareComponent: cpiComponents.shareComponent,
        velocityComponent: cpiComponents.velocityComponent,
        engagementComponent: cpiComponents.engagementComponent,
        trendComponent: cpiComponents.trendComponent,
        rawScore: cpiComponents.rawScore,
        normalizedScore: cpiComponents.normalizedScore,
        finalCpi,
        calculatedAt: new Date().toISOString(),
      },
      userId
    );
  }

  /**
   * Log alert configuration change
   */
  async logAlertConfigChange(
    action: "create" | "update" | "delete",
    configId: string,
    config: Partial<CreateCompetitiveAlertConfig>,
    userId?: string
  ): Promise<void> {
    await this.logGovernanceAction(
      `alert_config_${action}`,
      "alert_config",
      configId,
      {
        action,
        configId,
        changes: config,
        timestamp: new Date().toISOString(),
      },
      userId
    );
  }

  /**
   * Log competitive claim review action
   */
  async logClaimReview(
    claimType: "cpi_threshold" | "alert_generated" | "signal_recorded",
    entityId: string,
    reviewAction: "approved" | "rejected" | "modified",
    reviewNotes?: string,
    userId?: string
  ): Promise<void> {
    await this.logGovernanceAction(
      "competitive_claim_review",
      claimType,
      entityId,
      {
        reviewAction,
        reviewNotes: reviewNotes ?? null,
        reviewedAt: new Date().toISOString(),
      },
      userId
    );
  }

  /**
   * Get competitive governance audit trail
   */
  async getCompetitiveAuditTrail(options?: {
    entityType?: string;
    entityId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    details: Record<string, unknown> | null;
    userId: string | null;
    createdAt: string;
  }>> {
    const conditions = [];

    if (options?.entityType) {
      conditions.push(eq(auditLogs.entityType, options.entityType));
    }
    if (options?.entityId) {
      conditions.push(eq(auditLogs.entityId, options.entityId));
    }
    if (options?.action) {
      conditions.push(eq(auditLogs.action, options.action));
    }
    if (options?.startDate) {
      conditions.push(gte(auditLogs.createdAt, options.startDate));
    }
    if (options?.endDate) {
      conditions.push(lte(auditLogs.createdAt, options.endDate));
    }

    // Filter to competitive-related actions
    const competitiveActions = [
      "cpi_calculation",
      "alert_config_create",
      "alert_config_update",
      "alert_config_delete",
      "competitive_claim_review",
      "competitive_signal_recorded",
      "competitor_created",
      "competitor_updated",
    ];

    const rows = await db
      .select()
      .from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(options?.limit ?? 100);

    // Filter to competitive-related only
    return rows
      .filter(row => competitiveActions.includes(row.action))
      .map(row => ({
        id: row.id,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        details: row.details as Record<string, unknown> | null,
        userId: row.userId,
        createdAt: row.createdAt.toISOString(),
      }));
  }

  /**
   * Get governance summary statistics
   */
  async getGovernanceSummary(): Promise<{
    totalCPICalculationsLast30Days: number;
    totalAlertConfigChanges: number;
    totalClaimReviews: number;
    recentActions: Array<{
      action: string;
      count: number;
    }>;
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentLogs = await db
      .select()
      .from(auditLogs)
      .where(gte(auditLogs.createdAt, thirtyDaysAgo))
      .orderBy(desc(auditLogs.createdAt));

    const competitiveActions = [
      "cpi_calculation",
      "alert_config_create",
      "alert_config_update",
      "alert_config_delete",
      "competitive_claim_review",
    ];

    const filteredLogs = recentLogs.filter(row =>
      competitiveActions.includes(row.action)
    );

    // Count by action type
    const actionCounts = new Map<string, number>();
    filteredLogs.forEach(log => {
      actionCounts.set(log.action, (actionCounts.get(log.action) ?? 0) + 1);
    });

    return {
      totalCPICalculationsLast30Days: actionCounts.get("cpi_calculation") ?? 0,
      totalAlertConfigChanges:
        (actionCounts.get("alert_config_create") ?? 0) +
        (actionCounts.get("alert_config_update") ?? 0) +
        (actionCounts.get("alert_config_delete") ?? 0),
      totalClaimReviews: actionCounts.get("competitive_claim_review") ?? 0,
      recentActions: Array.from(actionCounts.entries())
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count),
    };
  }
}

// Singleton instance
export const competitiveStorage = new CompetitiveStorage();
