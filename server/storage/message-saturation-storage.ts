/**
 * Message Saturation Storage Module
 *
 * Phase 12B: Handles message theme and exposure data with MSI calculation.
 *
 * MSI (Message Saturation Index) Formula:
 * ========================================
 * MSI = (FrequencyComponent + DiversityComponent + DecayComponent) × StageModifier
 *
 * Components (normalized to sum to 100):
 * - FrequencyComponent (0-40): Based on touch frequency relative to stage threshold
 * - DiversityComponent (0-20): Lower channel diversity = higher saturation risk
 * - DecayComponent (0-40): Rate of engagement decline
 *
 * Stage Modifiers:
 * - Awareness: 0.7 (higher tolerance)
 * - Consideration: 0.85 (medium tolerance)
 * - Trial: 0.9 (medium tolerance)
 * - Loyalty: 1.1 (lower tolerance - existing prescribers fatigue faster)
 *
 * Risk Levels:
 * - Low: 0-25
 * - Medium: 26-50
 * - High: 51-75
 * - Critical: 76-100
 */

import { db } from "../db";
import { eq, and, sql, desc, inArray, gte, lte } from "drizzle-orm";
import {
  messageThemeDim,
  messageExposureFact,
  hcpProfiles,
} from "@shared/schema";
import type {
  MessageTheme,
  MessageExposure,
  MsiComponents,
  MsiDirection,
  SaturationRiskLevel,
  AdoptionStage,
  HcpMessageSaturationSummary,
  MessageSaturationHeatmapData,
  InsertMessageThemeDim,
  InsertMessageExposureFact,
  MessageSaturationFilter,
} from "@shared/schema";

// ============================================================================
// MSI CALCULATION
// ============================================================================

/**
 * Stage-specific saturation thresholds
 * Higher threshold = more touches needed before saturation
 */
const stageThresholds: Record<AdoptionStage, number> = {
  awareness: 20,    // New HCPs can tolerate more touches
  consideration: 15,
  trial: 12,
  loyalty: 8,       // Loyal prescribers fatigue faster
};

/**
 * Stage modifiers for MSI calculation
 * Higher modifier = faster saturation
 */
const stageModifiers: Record<AdoptionStage, number> = {
  awareness: 0.7,
  consideration: 0.85,
  trial: 0.9,
  loyalty: 1.1,
};

/**
 * Convert MSI to risk level
 */
export function msiToRiskLevel(msi: number): SaturationRiskLevel {
  if (msi >= 76) return "critical";
  if (msi >= 51) return "high";
  if (msi >= 26) return "medium";
  return "low";
}

/**
 * Determine MSI direction from previous value
 */
export function determineMsiDirection(
  currentMsi: number,
  previousMsi: number | null
): MsiDirection {
  if (previousMsi === null) return "stable";
  const change = currentMsi - previousMsi;
  if (change > 5) return "increasing";
  if (change < -5) return "decreasing";
  return "stable";
}

/**
 * Clamp value to range
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculate MSI components
 *
 * @param touchFrequency - Number of times HCP was exposed to theme
 * @param channelDiversity - 0-1 entropy score (higher = more diverse)
 * @param engagementDecay - Rate of engagement decline (positive = declining)
 * @param adoptionStage - HCP's adoption stage
 */
export function calculateMsiComponents(
  touchFrequency: number,
  channelDiversity: number | null,
  engagementDecay: number | null,
  adoptionStage: AdoptionStage | null
): MsiComponents {
  const stage = adoptionStage || "consideration";
  const threshold = stageThresholds[stage];
  const modifier = stageModifiers[stage];

  // Frequency Component (0-40)
  // Over-threshold touches increase saturation
  const frequencyRatio = touchFrequency / threshold;
  const frequencyComponent = clamp(frequencyRatio * 25, 0, 40);

  // Diversity Component (0-20)
  // Lower diversity = higher saturation risk (same message, same channel)
  // Invert: low diversity (0) = high component, high diversity (1) = low component
  const diversity = channelDiversity ?? 0.5;
  const diversityComponent = clamp((1 - diversity) * 20, 0, 20);

  // Decay Component (0-40)
  // Positive decay (engagement dropping) increases saturation risk
  const decay = engagementDecay ?? 0;
  // Normalize: -50 to +50 decay maps to 0-40 component
  const decayComponent = clamp(((decay + 25) / 50) * 40, 0, 40);

  return {
    frequencyComponent,
    diversityComponent,
    decayComponent,
    stageModifier: modifier,
  };
}

/**
 * Calculate final MSI score from components
 */
export function calculateMsi(components: MsiComponents): number {
  const raw =
    components.frequencyComponent +
    components.diversityComponent +
    components.decayComponent;

  // Apply stage modifier and clamp to 0-100
  return clamp(raw * components.stageModifier, 0, 100);
}

// ============================================================================
// STORAGE CLASS
// ============================================================================

class MessageSaturationStorage {
  // ---- Message Theme Operations ----

  async createMessageTheme(data: InsertMessageThemeDim): Promise<MessageTheme> {
    const [row] = await db
      .insert(messageThemeDim)
      .values(data)
      .returning();

    return this.convertThemeRow(row);
  }

  async getMessageThemeById(id: string): Promise<MessageTheme | undefined> {
    const [row] = await db
      .select()
      .from(messageThemeDim)
      .where(eq(messageThemeDim.id, id))
      .limit(1);

    return row ? this.convertThemeRow(row) : undefined;
  }

  async getAllMessageThemes(activeOnly: boolean = true): Promise<MessageTheme[]> {
    const query = activeOnly
      ? db.select().from(messageThemeDim).where(eq(messageThemeDim.isActive, true))
      : db.select().from(messageThemeDim);

    const rows = await query.orderBy(messageThemeDim.name);
    return rows.map((r) => this.convertThemeRow(r));
  }

  async getMessageThemesByCategory(category: string): Promise<MessageTheme[]> {
    const rows = await db
      .select()
      .from(messageThemeDim)
      .where(
        and(
          eq(messageThemeDim.category, category),
          eq(messageThemeDim.isActive, true)
        )
      )
      .orderBy(messageThemeDim.name);

    return rows.map((r) => this.convertThemeRow(r));
  }

  // ---- Message Exposure Operations ----

  async recordMessageExposure(
    data: {
      hcpId: string;
      messageThemeId: string;
      touchFrequency: number;
      uniqueChannels?: number;
      channelDiversity?: number | null;
      avgTimeBetweenTouches?: number | null;
      engagementRate?: number | null;
      engagementDecay?: number | null;
      lastEngagementDate?: string | null;
      adoptionStage?: string | null;
      measurementPeriod?: string | null;
    }
  ): Promise<MessageExposure> {
    // Calculate MSI components
    const components = calculateMsiComponents(
      data.touchFrequency,
      data.channelDiversity ?? null,
      data.engagementDecay ?? null,
      (data.adoptionStage as AdoptionStage) ?? null
    );

    const msi = calculateMsi(components);

    // Get previous MSI for direction calculation
    const [existingExposure] = await db
      .select({ msi: messageExposureFact.msi })
      .from(messageExposureFact)
      .where(
        and(
          eq(messageExposureFact.hcpId, data.hcpId),
          eq(messageExposureFact.messageThemeId, data.messageThemeId)
        )
      )
      .orderBy(desc(messageExposureFact.createdAt))
      .limit(1);

    const msiDirection = determineMsiDirection(msi, existingExposure?.msi ?? null);
    const saturationRisk = msiToRiskLevel(msi);

    // Convert lastEngagementDate string to Date if provided
    const lastEngagementDate = data.lastEngagementDate
      ? new Date(data.lastEngagementDate)
      : null;

    const [row] = await db
      .insert(messageExposureFact)
      .values({
        hcpId: data.hcpId,
        messageThemeId: data.messageThemeId,
        touchFrequency: data.touchFrequency,
        uniqueChannels: data.uniqueChannels ?? 1,
        channelDiversity: data.channelDiversity,
        avgTimeBetweenTouches: data.avgTimeBetweenTouches,
        engagementRate: data.engagementRate,
        engagementDecay: data.engagementDecay,
        lastEngagementDate,
        adoptionStage: data.adoptionStage,
        measurementPeriod: data.measurementPeriod,
        msi,
        msiDirection,
        saturationRisk,
      })
      .returning();

    // Get theme name for response
    const theme = await this.getMessageThemeById(data.messageThemeId);

    return this.convertExposureRow(row, theme);
  }

  async getHcpMessageExposures(hcpId: string): Promise<MessageExposure[]> {
    const rows = await db
      .select()
      .from(messageExposureFact)
      .where(eq(messageExposureFact.hcpId, hcpId))
      .orderBy(desc(messageExposureFact.msi));

    // Get themes for joining
    const themeIds = Array.from(new Set(rows.map((r) => r.messageThemeId)));
    const themes = await Promise.all(themeIds.map((id) => this.getMessageThemeById(id)));
    const themeMap = new Map(themes.filter(Boolean).map((t) => [t!.id, t!]));

    return rows.map((r) => this.convertExposureRow(r, themeMap.get(r.messageThemeId)));
  }

  async getMessageExposuresByFilter(filter: MessageSaturationFilter): Promise<MessageExposure[]> {
    const conditions = [];

    if (filter.themeIds?.length) {
      conditions.push(inArray(messageExposureFact.messageThemeId, filter.themeIds));
    }
    if (filter.hcpIds?.length) {
      conditions.push(inArray(messageExposureFact.hcpId, filter.hcpIds));
    }
    if (filter.saturationRisk) {
      conditions.push(eq(messageExposureFact.saturationRisk, filter.saturationRisk));
    }
    if (filter.adoptionStage) {
      conditions.push(eq(messageExposureFact.adoptionStage, filter.adoptionStage));
    }
    if (filter.minMsi !== undefined) {
      conditions.push(gte(messageExposureFact.msi, filter.minMsi));
    }
    if (filter.maxMsi !== undefined) {
      conditions.push(lte(messageExposureFact.msi, filter.maxMsi));
    }
    if (filter.measurementPeriod) {
      conditions.push(eq(messageExposureFact.measurementPeriod, filter.measurementPeriod));
    }

    const query = conditions.length > 0
      ? db.select().from(messageExposureFact).where(and(...conditions))
      : db.select().from(messageExposureFact);

    const rows = await query.orderBy(desc(messageExposureFact.msi));

    // Get themes for joining
    const themeIds = Array.from(new Set(rows.map((r) => r.messageThemeId)));
    const themes = await Promise.all(themeIds.map((id) => this.getMessageThemeById(id)));
    const themeMap = new Map(themes.filter(Boolean).map((t) => [t!.id, t!]));

    // Filter by categories if specified (requires theme join)
    let results = rows.map((r) => this.convertExposureRow(r, themeMap.get(r.messageThemeId)));

    if (filter.categories?.length) {
      results = results.filter(
        (e) => e.themeCategory && filter.categories!.includes(e.themeCategory as any)
      );
    }

    return results;
  }

  // ---- Aggregated Views ----

  async getHcpMessageSaturationSummary(hcpId: string): Promise<HcpMessageSaturationSummary | undefined> {
    const exposures = await this.getHcpMessageExposures(hcpId);

    if (exposures.length === 0) {
      return undefined;
    }

    // Get HCP name
    const [hcp] = await db
      .select({ firstName: hcpProfiles.firstName, lastName: hcpProfiles.lastName })
      .from(hcpProfiles)
      .where(eq(hcpProfiles.id, hcpId))
      .limit(1);

    const hcpName = hcp ? `${hcp.firstName} ${hcp.lastName}` : undefined;

    // Calculate weighted average MSI
    const validExposures = exposures.filter((e) => e.msi !== null);
    const overallMsi =
      validExposures.length > 0
        ? validExposures.reduce((sum, e) => sum + (e.msi ?? 0), 0) / validExposures.length
        : 0;

    // Count themes at risk
    const themesAtRisk = exposures.filter(
      (e) => e.saturationRisk === "high" || e.saturationRisk === "critical"
    ).length;

    // Find top saturated theme
    const sortedExposures = [...exposures].sort((a, b) => (b.msi ?? 0) - (a.msi ?? 0));
    const topSaturated = sortedExposures[0];
    const topSaturatedTheme =
      topSaturated && topSaturated.msi !== null
        ? {
            id: topSaturated.messageThemeId,
            name: topSaturated.themeName || "Unknown",
            msi: topSaturated.msi,
            category: topSaturated.themeCategory ?? null,
          }
        : null;

    // Determine overall risk level
    const riskLevel = msiToRiskLevel(overallMsi);

    // Generate recommendation
    let recommendedAction: string | null = null;
    if (riskLevel === "critical") {
      recommendedAction = "Immediate message rotation required. Consider shifting to alternative themes.";
    } else if (riskLevel === "high") {
      recommendedAction = "Reduce touch frequency and diversify messaging channels.";
    } else if (riskLevel === "medium") {
      recommendedAction = "Monitor engagement closely and prepare alternative messaging.";
    }

    return {
      hcpId,
      hcpName,
      overallMsi,
      themesAtRisk,
      totalThemes: exposures.length,
      topSaturatedTheme,
      exposures,
      riskLevel,
      recommendedAction,
    };
  }

  async getMessageSaturationHeatmapData(): Promise<MessageSaturationHeatmapData> {
    // Get all active themes
    const themes = await this.getAllMessageThemes(true);

    // Get all exposures
    const allExposures = await db.select().from(messageExposureFact);

    // Build theme aggregations
    const themeAggregations = themes.map((theme) => {
      const themeExposures = allExposures.filter((e) => e.messageThemeId === theme.id);
      const validExposures = themeExposures.filter((e) => e.msi !== null);

      const avgMsi =
        validExposures.length > 0
          ? validExposures.reduce((sum, e) => sum + (e.msi ?? 0), 0) / validExposures.length
          : 0;

      const riskDistribution = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      };

      themeExposures.forEach((e) => {
        if (e.saturationRisk) {
          riskDistribution[e.saturationRisk as SaturationRiskLevel]++;
        }
      });

      return {
        id: theme.id,
        name: theme.name,
        category: theme.category as any,
        avgMsi,
        affectedHcpCount: new Set(themeExposures.map((e) => e.hcpId)).size,
        riskDistribution,
      };
    });

    // Build HCP cells
    const hcpCells = allExposures
      .filter((e) => e.msi !== null)
      .map((e) => ({
        hcpId: e.hcpId,
        themeId: e.messageThemeId,
        msi: e.msi!,
        saturationRisk: (e.saturationRisk || "low") as SaturationRiskLevel,
        adoptionStage: e.adoptionStage as AdoptionStage | null,
      }));

    // Build summary
    const allHcpIds = new Set(allExposures.map((e) => e.hcpId));
    const hcpsAtRisk = new Set(
      allExposures
        .filter((e) => e.saturationRisk === "high" || e.saturationRisk === "critical")
        .map((e) => e.hcpId)
    ).size;

    const validExposures = allExposures.filter((e) => e.msi !== null);
    const avgOverallMsi =
      validExposures.length > 0
        ? validExposures.reduce((sum, e) => sum + (e.msi ?? 0), 0) / validExposures.length
        : 0;

    const sortedThemes = [...themeAggregations].sort((a, b) => b.avgMsi - a.avgMsi);
    const mostSaturated = sortedThemes[0];
    const leastSaturated = sortedThemes[sortedThemes.length - 1];

    return {
      themes: themeAggregations,
      hcpCells,
      summary: {
        totalHcpsAnalyzed: allHcpIds.size,
        avgOverallMsi,
        hcpsAtRisk,
        mostSaturatedTheme: mostSaturated?.name || null,
        leastSaturatedTheme: leastSaturated?.name || null,
      },
    };
  }

  // ---- Seed Data ----

  async seedMessageSaturationData(): Promise<{
    themesCreated: number;
    exposuresCreated: number;
  }> {
    // Create sample themes
    const sampleThemes: InsertMessageThemeDim[] = [
      { name: "Superior Efficacy", category: "efficacy", therapeuticArea: "Oncology", description: "Clinical trial outcomes showing superior efficacy vs comparators" },
      { name: "Favorable Safety Profile", category: "safety", therapeuticArea: "Oncology", description: "Safety and tolerability messaging" },
      { name: "Real World Evidence", category: "rwe", therapeuticArea: "Oncology", description: "Post-market surveillance and registry data" },
      { name: "KOL Endorsement", category: "peer_validation", therapeuticArea: "Oncology", description: "Key opinion leader recommendations and case studies" },
      { name: "Cost Effectiveness", category: "cost_value", therapeuticArea: "Oncology", description: "Value proposition and pharmacoeconomic data" },
      { name: "Mechanism Innovation", category: "mechanism_of_action", therapeuticArea: "Oncology", description: "Novel mechanism of action differentiation" },
      { name: "Patient Quality of Life", category: "patient_outcomes", therapeuticArea: "Oncology", description: "Patient-reported outcomes and QoL improvements" },
      { name: "Convenient Dosing", category: "dosing_convenience", therapeuticArea: "Oncology", description: "Once-daily or simplified dosing regimen" },
    ];

    const createdThemes: MessageTheme[] = [];
    for (const theme of sampleThemes) {
      try {
        const created = await this.createMessageTheme(theme);
        createdThemes.push(created);
      } catch (e) {
        // Theme may already exist
      }
    }

    // Get HCPs to create exposures for
    const hcps = await db
      .select({ id: hcpProfiles.id })
      .from(hcpProfiles)
      .limit(30);

    if (hcps.length === 0 || createdThemes.length === 0) {
      return { themesCreated: createdThemes.length, exposuresCreated: 0 };
    }

    const adoptionStages: AdoptionStage[] = ["awareness", "consideration", "trial", "loyalty"];
    let exposuresCreated = 0;

    // Create synthetic exposures
    for (const hcp of hcps) {
      // Each HCP gets exposure to 3-6 random themes
      const numThemes = 3 + Math.floor(Math.random() * 4);
      const shuffledThemes = [...createdThemes].sort(() => Math.random() - 0.5).slice(0, numThemes);

      for (const theme of shuffledThemes) {
        const adoptionStage = adoptionStages[Math.floor(Math.random() * adoptionStages.length)];

        // Generate realistic-ish metrics
        const touchFrequency = 3 + Math.floor(Math.random() * 25); // 3-27 touches
        const uniqueChannels = 1 + Math.floor(Math.random() * 4); // 1-4 channels
        const channelDiversity = uniqueChannels > 1 ? 0.3 + Math.random() * 0.6 : 0.1 + Math.random() * 0.3;
        const engagementRate = 0.2 + Math.random() * 0.6; // 20-80%
        const engagementDecay = -10 + Math.random() * 40; // -10 to +30 (positive = declining)

        try {
          await this.recordMessageExposure({
            hcpId: hcp.id,
            messageThemeId: theme.id,
            touchFrequency,
            uniqueChannels,
            channelDiversity,
            avgTimeBetweenTouches: 5 + Math.random() * 20,
            engagementRate,
            engagementDecay,
            adoptionStage,
            measurementPeriod: "Q1-2026",
          });
          exposuresCreated++;
        } catch (e) {
          // Skip on error
        }
      }
    }

    return { themesCreated: createdThemes.length, exposuresCreated };
  }

  // ---- Converters ----

  private convertThemeRow(row: typeof messageThemeDim.$inferSelect): MessageTheme {
    return {
      id: row.id,
      name: row.name,
      category: row.category as any,
      therapeuticArea: row.therapeuticArea,
      brandName: row.brandName,
      description: row.description,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private convertExposureRow(
    row: typeof messageExposureFact.$inferSelect,
    theme?: MessageTheme
  ): MessageExposure {
    // Reconstruct MSI components if we have the data
    let msiComponents: MsiComponents | null = null;
    if (row.msi !== null) {
      msiComponents = calculateMsiComponents(
        row.touchFrequency,
        row.channelDiversity,
        row.engagementDecay,
        row.adoptionStage as AdoptionStage | null
      );
    }

    return {
      id: row.id,
      hcpId: row.hcpId,
      messageThemeId: row.messageThemeId,
      themeName: theme?.name,
      themeCategory: theme?.category as any,
      touchFrequency: row.touchFrequency,
      uniqueChannels: row.uniqueChannels,
      channelDiversity: row.channelDiversity,
      avgTimeBetweenTouches: row.avgTimeBetweenTouches,
      engagementRate: row.engagementRate,
      engagementDecay: row.engagementDecay,
      lastEngagementDate: row.lastEngagementDate?.toISOString() ?? null,
      msi: row.msi,
      msiDirection: row.msiDirection as MsiDirection | null,
      msiComponents,
      saturationRisk: row.saturationRisk as SaturationRiskLevel | null,
      adoptionStage: row.adoptionStage as AdoptionStage | null,
      measurementPeriod: row.measurementPeriod,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

// Export singleton instance
export const messageSaturationStorage = new MessageSaturationStorage();
