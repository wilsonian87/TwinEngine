/**
 * Campaign Planning Service
 *
 * Phase 12B.4: Organizational adoption tools for message saturation management.
 *
 * Features:
 * - MSI benchmark configuration
 * - Pre-campaign saturation reports
 * - Campaign launch checklists
 * - Export functionality for planning tools
 */

import { db } from "../db";
import { eq, and, sql, inArray } from "drizzle-orm";
import {
  msiBenchmarkConfig,
  hcpProfiles,
} from "@shared/schema";
import type {
  MsiBenchmark,
  MsiBenchmarkConfigDB,
  InsertMsiBenchmarkConfig,
  CreateMsiBenchmarkRequest,
  PreCampaignReport,
  GeneratePreCampaignReportRequest,
  CampaignLaunchChecklist,
  CampaignChecklistItem,
  SaturationExportRequest,
  MessageExposure,
  HcpMessageSaturationSummary,
  AdoptionStage,
  SaturationRiskLevel,
} from "@shared/schema";
import { messageSaturationStorage, msiToRiskLevel } from "../storage/message-saturation-storage";

// ============================================================================
// DEFAULT BENCHMARK VALUES
// ============================================================================

const DEFAULT_THRESHOLDS = {
  underexposed: 20,
  safe: 40,
  approaching: 50,
  shift: 65,
  blocked: 80,
};

const DEFAULT_STAGE_MODIFIERS = {
  awareness: 0.7,
  consideration: 0.85,
  trial: 0.9,
  loyalty: 1.1,
};

const DEFAULT_TOUCH_THRESHOLDS = {
  awareness: 20,
  consideration: 15,
  trial: 12,
  loyalty: 8,
};

// ============================================================================
// BENCHMARK MANAGEMENT
// ============================================================================

class CampaignPlanningService {
  /**
   * Create a new MSI benchmark configuration
   */
  async createBenchmark(request: CreateMsiBenchmarkRequest): Promise<MsiBenchmark> {
    const insertData: InsertMsiBenchmarkConfig = {
      name: request.name,
      therapeuticArea: request.therapeuticArea,
      brandName: request.brandName,
      // Thresholds
      underexposedThreshold: request.thresholds?.underexposed ?? DEFAULT_THRESHOLDS.underexposed,
      safeThreshold: request.thresholds?.safe ?? DEFAULT_THRESHOLDS.safe,
      approachingThreshold: request.thresholds?.approaching ?? DEFAULT_THRESHOLDS.approaching,
      shiftThreshold: request.thresholds?.shift ?? DEFAULT_THRESHOLDS.shift,
      blockedThreshold: request.thresholds?.blocked ?? DEFAULT_THRESHOLDS.blocked,
      // Stage modifiers
      awarenessModifier: request.stageModifiers?.awareness ?? DEFAULT_STAGE_MODIFIERS.awareness,
      considerationModifier: request.stageModifiers?.consideration ?? DEFAULT_STAGE_MODIFIERS.consideration,
      trialModifier: request.stageModifiers?.trial ?? DEFAULT_STAGE_MODIFIERS.trial,
      loyaltyModifier: request.stageModifiers?.loyalty ?? DEFAULT_STAGE_MODIFIERS.loyalty,
      // Touch thresholds
      awarenessTouchThreshold: request.stageTouchThresholds?.awareness ?? DEFAULT_TOUCH_THRESHOLDS.awareness,
      considerationTouchThreshold: request.stageTouchThresholds?.consideration ?? DEFAULT_TOUCH_THRESHOLDS.consideration,
      trialTouchThreshold: request.stageTouchThresholds?.trial ?? DEFAULT_TOUCH_THRESHOLDS.trial,
      loyaltyTouchThreshold: request.stageTouchThresholds?.loyalty ?? DEFAULT_TOUCH_THRESHOLDS.loyalty,
      isDefault: request.isDefault ?? false,
    };

    // If this is being set as default, unset other defaults
    if (insertData.isDefault) {
      await db
        .update(msiBenchmarkConfig)
        .set({ isDefault: false })
        .where(eq(msiBenchmarkConfig.isDefault, true));
    }

    const [row] = await db
      .insert(msiBenchmarkConfig)
      .values(insertData)
      .returning();

    return this.convertBenchmarkRow(row);
  }

  /**
   * Get benchmark by ID
   */
  async getBenchmarkById(id: string): Promise<MsiBenchmark | undefined> {
    const [row] = await db
      .select()
      .from(msiBenchmarkConfig)
      .where(eq(msiBenchmarkConfig.id, id))
      .limit(1);

    return row ? this.convertBenchmarkRow(row) : undefined;
  }

  /**
   * Get the default benchmark
   */
  async getDefaultBenchmark(): Promise<MsiBenchmark> {
    const [row] = await db
      .select()
      .from(msiBenchmarkConfig)
      .where(and(eq(msiBenchmarkConfig.isDefault, true), eq(msiBenchmarkConfig.isActive, true)))
      .limit(1);

    if (row) {
      return this.convertBenchmarkRow(row);
    }

    // Return hardcoded defaults if no default is set
    return {
      id: "system-default",
      name: "System Default",
      therapeuticArea: null,
      brandName: null,
      thresholds: DEFAULT_THRESHOLDS,
      stageModifiers: DEFAULT_STAGE_MODIFIERS,
      stageTouchThresholds: DEFAULT_TOUCH_THRESHOLDS,
      isDefault: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get all benchmarks
   */
  async getAllBenchmarks(activeOnly: boolean = true): Promise<MsiBenchmark[]> {
    const query = activeOnly
      ? db.select().from(msiBenchmarkConfig).where(eq(msiBenchmarkConfig.isActive, true))
      : db.select().from(msiBenchmarkConfig);

    const rows = await query;
    return rows.map((r) => this.convertBenchmarkRow(r));
  }

  /**
   * Get benchmarks for a specific therapeutic area
   */
  async getBenchmarksByTherapeuticArea(therapeuticArea: string): Promise<MsiBenchmark[]> {
    const rows = await db
      .select()
      .from(msiBenchmarkConfig)
      .where(
        and(
          eq(msiBenchmarkConfig.therapeuticArea, therapeuticArea),
          eq(msiBenchmarkConfig.isActive, true)
        )
      );

    return rows.map((r) => this.convertBenchmarkRow(r));
  }

  /**
   * Update a benchmark
   */
  async updateBenchmark(id: string, request: Partial<CreateMsiBenchmarkRequest>): Promise<MsiBenchmark | undefined> {
    const existing = await this.getBenchmarkById(id);
    if (!existing) return undefined;

    // Handle default flag
    if (request.isDefault) {
      await db
        .update(msiBenchmarkConfig)
        .set({ isDefault: false })
        .where(eq(msiBenchmarkConfig.isDefault, true));
    }

    const updateData: Partial<MsiBenchmarkConfigDB> = {
      updatedAt: new Date(),
    };

    if (request.name) updateData.name = request.name;
    if (request.therapeuticArea !== undefined) updateData.therapeuticArea = request.therapeuticArea || null;
    if (request.brandName !== undefined) updateData.brandName = request.brandName || null;
    if (request.isDefault !== undefined) updateData.isDefault = request.isDefault;

    if (request.thresholds) {
      if (request.thresholds.underexposed !== undefined) updateData.underexposedThreshold = request.thresholds.underexposed;
      if (request.thresholds.safe !== undefined) updateData.safeThreshold = request.thresholds.safe;
      if (request.thresholds.approaching !== undefined) updateData.approachingThreshold = request.thresholds.approaching;
      if (request.thresholds.shift !== undefined) updateData.shiftThreshold = request.thresholds.shift;
      if (request.thresholds.blocked !== undefined) updateData.blockedThreshold = request.thresholds.blocked;
    }

    if (request.stageModifiers) {
      if (request.stageModifiers.awareness !== undefined) updateData.awarenessModifier = request.stageModifiers.awareness;
      if (request.stageModifiers.consideration !== undefined) updateData.considerationModifier = request.stageModifiers.consideration;
      if (request.stageModifiers.trial !== undefined) updateData.trialModifier = request.stageModifiers.trial;
      if (request.stageModifiers.loyalty !== undefined) updateData.loyaltyModifier = request.stageModifiers.loyalty;
    }

    if (request.stageTouchThresholds) {
      if (request.stageTouchThresholds.awareness !== undefined) updateData.awarenessTouchThreshold = request.stageTouchThresholds.awareness;
      if (request.stageTouchThresholds.consideration !== undefined) updateData.considerationTouchThreshold = request.stageTouchThresholds.consideration;
      if (request.stageTouchThresholds.trial !== undefined) updateData.trialTouchThreshold = request.stageTouchThresholds.trial;
      if (request.stageTouchThresholds.loyalty !== undefined) updateData.loyaltyTouchThreshold = request.stageTouchThresholds.loyalty;
    }

    const [row] = await db
      .update(msiBenchmarkConfig)
      .set(updateData)
      .where(eq(msiBenchmarkConfig.id, id))
      .returning();

    return row ? this.convertBenchmarkRow(row) : undefined;
  }

  // ============================================================================
  // PRE-CAMPAIGN REPORT
  // ============================================================================

  /**
   * Generate a pre-campaign saturation report
   */
  async generatePreCampaignReport(
    request: GeneratePreCampaignReportRequest
  ): Promise<PreCampaignReport> {
    // Get benchmark to use
    const benchmark = request.benchmarkId
      ? await this.getBenchmarkById(request.benchmarkId)
      : await this.getDefaultBenchmark();

    // Get target HCPs
    let hcpIds: string[];
    if (request.hcpIds && request.hcpIds.length > 0) {
      hcpIds = request.hcpIds;
    } else {
      const allHcps = await db.select({ id: hcpProfiles.id }).from(hcpProfiles);
      hcpIds = allHcps.map((h) => h.id);
    }

    // Get saturation summaries for all target HCPs
    const summaries: (HcpMessageSaturationSummary | undefined)[] = await Promise.all(
      hcpIds.map((id) => messageSaturationStorage.getHcpMessageSaturationSummary(id))
    );

    // Get themes
    const allThemes = await messageSaturationStorage.getAllMessageThemes(true);
    const targetThemes = request.themeIds
      ? allThemes.filter((t) => request.themeIds!.includes(t.id))
      : allThemes;

    // Calculate summary statistics
    const validSummaries = summaries.filter((s): s is HcpMessageSaturationSummary => s !== undefined);
    const avgPortfolioMsi =
      validSummaries.length > 0
        ? validSummaries.reduce((sum, s) => sum + s.overallMsi, 0) / validSummaries.length
        : 0;

    const safeThreshold = benchmark?.thresholds.safe ?? DEFAULT_THRESHOLDS.safe;
    const approachingThreshold = benchmark?.thresholds.approaching ?? DEFAULT_THRESHOLDS.approaching;
    const shiftThreshold = benchmark?.thresholds.shift ?? DEFAULT_THRESHOLDS.shift;

    const hcpsReadyForMessaging = validSummaries.filter((s) => s.overallMsi < safeThreshold).length;
    const hcpsNeedingCaution = validSummaries.filter(
      (s) => s.overallMsi >= approachingThreshold && s.overallMsi < shiftThreshold
    ).length;
    const hcpsToAvoid = validSummaries.filter((s) => s.overallMsi >= shiftThreshold).length;

    // Theme saturation overview
    const themeSaturationOverview = targetThemes.map((theme) => {
      const themeExposures = validSummaries
        .flatMap((s) => s.exposures)
        .filter((e) => e.messageThemeId === theme.id);

      const avgMsi =
        themeExposures.length > 0
          ? themeExposures.reduce((sum, e) => sum + (e.msi ?? 0), 0) / themeExposures.length
          : 0;

      let recommendedAction: string;
      if (avgMsi >= shiftThreshold) {
        recommendedAction = "Rotate to alternative themes immediately";
      } else if (avgMsi >= approachingThreshold) {
        recommendedAction = "Reduce frequency and diversify channels";
      } else if (avgMsi < safeThreshold / 2) {
        recommendedAction = "Safe to increase exposure";
      } else {
        recommendedAction = "Maintain current strategy";
      }

      return {
        themeId: theme.id,
        themeName: theme.name,
        avgMsi: Math.round(avgMsi * 10) / 10,
        recommendedAction,
      };
    });

    // Generate recommendations
    const recommendations: PreCampaignReport["recommendations"] = [];

    // Theme rotation recommendations
    const saturatedThemes = themeSaturationOverview.filter((t) => t.avgMsi >= shiftThreshold);
    if (saturatedThemes.length > 0) {
      const underexposedThemes = themeSaturationOverview.filter(
        (t) => t.avgMsi < safeThreshold / 2
      );
      recommendations.push({
        priority: "high",
        type: "theme_rotation",
        description: `${saturatedThemes.length} theme(s) are saturated and should be rotated out.`,
        impactedHcpCount: hcpsToAvoid,
        suggestedThemes: underexposedThemes.slice(0, 3).map((t) => t.themeName),
      });
    }

    // Audience reduction recommendation
    if (hcpsToAvoid > hcpIds.length * 0.2) {
      recommendations.push({
        priority: "high",
        type: "audience_reduction",
        description: `${hcpsToAvoid} HCPs (${Math.round((hcpsToAvoid / hcpIds.length) * 100)}%) are at high saturation risk and should be excluded from this campaign.`,
        impactedHcpCount: hcpsToAvoid,
      });
    }

    // Channel diversification recommendation
    if (hcpsNeedingCaution > hcpIds.length * 0.3) {
      recommendations.push({
        priority: "medium",
        type: "channel_diversification",
        description: `${hcpsNeedingCaution} HCPs are approaching saturation. Diversify channels to maintain engagement.`,
        impactedHcpCount: hcpsNeedingCaution,
      });
    }

    // Increase exposure opportunity
    const underexposedHcps = validSummaries.filter((s) => s.overallMsi < safeThreshold / 2).length;
    if (underexposedHcps > hcpIds.length * 0.2) {
      recommendations.push({
        priority: "low",
        type: "increase_exposure",
        description: `${underexposedHcps} HCPs are underexposed and represent growth opportunities.`,
        impactedHcpCount: underexposedHcps,
      });
    }

    // Sort recommendations by priority
    recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Generate HCP details if requested
    const hcpDetails: PreCampaignReport["hcpDetails"] = request.includeHcpDetails
      ? await Promise.all(
          validSummaries.map(async (summary) => {
            const [hcp] = await db
              .select({ firstName: hcpProfiles.firstName, lastName: hcpProfiles.lastName })
              .from(hcpProfiles)
              .where(eq(hcpProfiles.id, summary.hcpId))
              .limit(1);

            const recommendedThemes = summary.exposures
              .filter((e) => (e.msi ?? 0) < safeThreshold)
              .map((e) => e.themeName || "Unknown")
              .slice(0, 3);

            const themesToAvoid = summary.exposures
              .filter((e) => (e.msi ?? 0) >= shiftThreshold)
              .map((e) => e.themeName || "Unknown");

            // Get dominant adoption stage
            const stageCounts = summary.exposures.reduce(
              (acc, e) => {
                if (e.adoptionStage) {
                  acc[e.adoptionStage] = (acc[e.adoptionStage] || 0) + 1;
                }
                return acc;
              },
              {} as Record<string, number>
            );

            const dominantStage = Object.entries(stageCounts).sort(
              (a, b) => b[1] - a[1]
            )[0]?.[0] as AdoptionStage | undefined;

            return {
              hcpId: summary.hcpId,
              hcpName: hcp ? `${hcp.firstName} ${hcp.lastName}` : "Unknown",
              overallMsi: Math.round(summary.overallMsi * 10) / 10,
              riskLevel: summary.riskLevel,
              recommendedThemes,
              themesToAvoid,
              adoptionStage: dominantStage ?? null,
            };
          })
        )
      : [];

    return {
      reportId: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      generatedAt: new Date().toISOString(),
      campaignName: request.campaignName,
      therapeuticArea: request.therapeuticArea ?? null,
      targetHcpCount: hcpIds.length,
      benchmarkUsed: benchmark ?? null,
      summary: {
        avgPortfolioMsi: Math.round(avgPortfolioMsi * 10) / 10,
        hcpsReadyForMessaging,
        hcpsNeedingCaution,
        hcpsToAvoid,
        themeSaturationOverview,
      },
      recommendations,
      hcpDetails,
      exportFormats: {
        csvAvailable: true,
        excelAvailable: true,
        pdfAvailable: false, // Not implemented yet
      },
    };
  }

  // ============================================================================
  // CAMPAIGN LAUNCH CHECKLIST
  // ============================================================================

  /**
   * Generate campaign launch checklist with saturation checks
   */
  async generateLaunchChecklist(
    campaignName: string,
    hcpIds: string[],
    themeIds?: string[]
  ): Promise<CampaignLaunchChecklist> {
    const benchmark = await this.getDefaultBenchmark();
    const items: CampaignChecklistItem[] = [];

    // Get saturation summaries
    const summaries = await Promise.all(
      hcpIds.map((id) => messageSaturationStorage.getHcpMessageSaturationSummary(id))
    );
    const validSummaries = summaries.filter((s): s is HcpMessageSaturationSummary => s !== undefined);

    const avgMsi =
      validSummaries.length > 0
        ? validSummaries.reduce((sum, s) => sum + s.overallMsi, 0) / validSummaries.length
        : 0;

    const safeThreshold = benchmark.thresholds.safe;
    const shiftThreshold = benchmark.thresholds.shift;
    const blockedThreshold = benchmark.thresholds.blocked;

    const safeHcps = validSummaries.filter((s) => s.overallMsi < safeThreshold).length;
    const cautionHcps = validSummaries.filter(
      (s) => s.overallMsi >= safeThreshold && s.overallMsi < shiftThreshold
    ).length;
    const avoidHcps = validSummaries.filter((s) => s.overallMsi >= shiftThreshold).length;

    // Check 1: Portfolio Saturation Level
    const portfolioStatus: "passed" | "warning" | "failed" =
      avgMsi < safeThreshold ? "passed" : avgMsi < shiftThreshold ? "warning" : "failed";

    items.push({
      id: "saturation-portfolio",
      name: "Portfolio Saturation Level",
      description: "Overall message saturation across target HCPs",
      category: "saturation",
      status: portfolioStatus,
      details: `Average MSI: ${Math.round(avgMsi)}. ${safeHcps} HCPs safe, ${cautionHcps} need caution, ${avoidHcps} should avoid.`,
      recommendation:
        portfolioStatus === "failed"
          ? "Consider reducing audience size or rotating message themes."
          : portfolioStatus === "warning"
          ? "Monitor engagement closely and prepare alternative themes."
          : null,
    });

    // Check 2: High-Risk HCP Percentage
    const highRiskPct = hcpIds.length > 0 ? (avoidHcps / hcpIds.length) * 100 : 0;
    const highRiskStatus: "passed" | "warning" | "failed" =
      highRiskPct < 10 ? "passed" : highRiskPct < 25 ? "warning" : "failed";

    items.push({
      id: "saturation-high-risk",
      name: "High-Risk HCP Percentage",
      description: "Percentage of HCPs with critical saturation levels",
      category: "saturation",
      status: highRiskStatus,
      details: `${Math.round(highRiskPct)}% of target HCPs (${avoidHcps}) have MSI >= ${shiftThreshold}.`,
      recommendation:
        highRiskStatus !== "passed"
          ? `Remove ${avoidHcps} high-saturation HCPs from campaign target list.`
          : null,
    });

    // Check 3: Theme Saturation
    if (themeIds && themeIds.length > 0) {
      const allThemes = await messageSaturationStorage.getAllMessageThemes(true);
      const targetThemes = allThemes.filter((t) => themeIds.includes(t.id));

      let blockedThemeCount = 0;
      for (const theme of targetThemes) {
        const themeExposures = validSummaries
          .flatMap((s) => s.exposures)
          .filter((e) => e.messageThemeId === theme.id);

        const themeAvgMsi =
          themeExposures.length > 0
            ? themeExposures.reduce((sum, e) => sum + (e.msi ?? 0), 0) / themeExposures.length
            : 0;

        if (themeAvgMsi >= blockedThreshold) {
          blockedThemeCount++;
        }
      }

      const themeStatus: "passed" | "warning" | "failed" =
        blockedThemeCount === 0 ? "passed" : blockedThemeCount < targetThemes.length / 2 ? "warning" : "failed";

      items.push({
        id: "saturation-themes",
        name: "Theme Saturation Check",
        description: "Saturation levels for selected message themes",
        category: "saturation",
        status: themeStatus,
        details: `${blockedThemeCount} of ${targetThemes.length} themes have critical saturation.`,
        recommendation:
          themeStatus !== "passed"
            ? "Consider alternative themes or reduce frequency for saturated themes."
            : null,
      });
    }

    // Check 4: Adoption Stage Distribution
    const stageDistribution = validSummaries.reduce(
      (acc, s) => {
        const dominantStage = s.exposures
          .filter((e) => e.adoptionStage)
          .reduce(
            (best, e) => {
              if (!best.stage || (e.msi ?? 0) > (best.msi ?? 0)) {
                return { stage: e.adoptionStage, msi: e.msi ?? 0 };
              }
              return best;
            },
            { stage: null as AdoptionStage | null, msi: 0 }
          ).stage;

        if (dominantStage) {
          acc[dominantStage] = (acc[dominantStage] || 0) + 1;
        }
        return acc;
      },
      {} as Record<AdoptionStage, number>
    );

    const loyaltyPct = hcpIds.length > 0 ? ((stageDistribution.loyalty || 0) / hcpIds.length) * 100 : 0;
    const stageStatus: "passed" | "warning" | "failed" =
      loyaltyPct < 30 ? "passed" : loyaltyPct < 50 ? "warning" : "failed";

    items.push({
      id: "targeting-stage",
      name: "Adoption Stage Balance",
      description: "Distribution of HCPs across adoption stages",
      category: "targeting",
      status: stageStatus,
      details: `${Math.round(loyaltyPct)}% of audience is in loyalty stage (higher saturation sensitivity).`,
      recommendation:
        stageStatus !== "passed"
          ? "Loyalty-stage HCPs fatigue faster. Consider stage-specific messaging."
          : null,
    });

    // Determine overall status
    const failedCount = items.filter((i) => i.status === "failed").length;
    const warningCount = items.filter((i) => i.status === "warning").length;

    let overallStatus: "ready" | "needs_review" | "not_ready";
    if (failedCount > 0) {
      overallStatus = "not_ready";
    } else if (warningCount > 0) {
      overallStatus = "needs_review";
    } else {
      overallStatus = "ready";
    }

    return {
      campaignName,
      generatedAt: new Date().toISOString(),
      overallStatus,
      items,
      saturationSummary: {
        totalHcps: hcpIds.length,
        safeToMessage: safeHcps,
        needsReview: cautionHcps,
        doNotMessage: avoidHcps,
        avgMsi: Math.round(avgMsi * 10) / 10,
      },
    };
  }

  // ============================================================================
  // EXPORT FUNCTIONALITY
  // ============================================================================

  /**
   * Generate CSV export of saturation data
   */
  async generateCsvExport(request: SaturationExportRequest): Promise<string> {
    // Get HCPs
    let hcpIds: string[];
    if (request.hcpIds && request.hcpIds.length > 0) {
      hcpIds = request.hcpIds;
    } else {
      const allHcps = await db.select({ id: hcpProfiles.id }).from(hcpProfiles).limit(1000);
      hcpIds = allHcps.map((h) => h.id);
    }

    // Get summaries
    const summaries = await Promise.all(
      hcpIds.map((id) => messageSaturationStorage.getHcpMessageSaturationSummary(id))
    );
    const validSummaries = summaries.filter((s): s is HcpMessageSaturationSummary => s !== undefined);

    // Get benchmark for comparison
    const benchmark = request.includeBenchmarkComparison ? await this.getDefaultBenchmark() : null;

    // Build CSV rows
    const headers = [
      "HCP ID",
      "HCP Name",
      "Overall MSI",
      "Risk Level",
      "Themes at Risk",
      "Total Themes",
    ];

    if (request.includeComponents) {
      headers.push(
        "Top Theme",
        "Top Theme MSI",
        "Top Theme Category"
      );
    }

    if (benchmark) {
      headers.push("Benchmark Status");
    }

    const rows: string[][] = [headers];

    for (const summary of validSummaries) {
      const row = [
        summary.hcpId,
        summary.hcpName || "",
        summary.overallMsi.toFixed(1),
        summary.riskLevel,
        summary.themesAtRisk.toString(),
        summary.totalThemes.toString(),
      ];

      if (request.includeComponents && summary.topSaturatedTheme) {
        row.push(
          summary.topSaturatedTheme.name,
          summary.topSaturatedTheme.msi.toFixed(1),
          summary.topSaturatedTheme.category || ""
        );
      } else if (request.includeComponents) {
        row.push("", "", "");
      }

      if (benchmark) {
        let benchmarkStatus = "Safe";
        if (summary.overallMsi >= benchmark.thresholds.blocked) {
          benchmarkStatus = "Blocked";
        } else if (summary.overallMsi >= benchmark.thresholds.shift) {
          benchmarkStatus = "Shift Required";
        } else if (summary.overallMsi >= benchmark.thresholds.approaching) {
          benchmarkStatus = "Approaching";
        }
        row.push(benchmarkStatus);
      }

      rows.push(row);
    }

    // Convert to CSV string
    return rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
  }

  /**
   * Generate JSON export of saturation data
   */
  async generateJsonExport(request: SaturationExportRequest): Promise<object> {
    // Get HCPs
    let hcpIds: string[];
    if (request.hcpIds && request.hcpIds.length > 0) {
      hcpIds = request.hcpIds;
    } else {
      const allHcps = await db.select({ id: hcpProfiles.id }).from(hcpProfiles).limit(1000);
      hcpIds = allHcps.map((h) => h.id);
    }

    // Get summaries
    const summaries = await Promise.all(
      hcpIds.map((id) => messageSaturationStorage.getHcpMessageSaturationSummary(id))
    );
    const validSummaries = summaries.filter((s): s is HcpMessageSaturationSummary => s !== undefined);

    // Get benchmark
    const benchmark = request.includeBenchmarkComparison ? await this.getDefaultBenchmark() : null;

    return {
      exportedAt: new Date().toISOString(),
      totalHcps: validSummaries.length,
      benchmark: benchmark || null,
      summaries: validSummaries.map((s) => ({
        ...s,
        benchmarkStatus: benchmark
          ? s.overallMsi >= benchmark.thresholds.blocked
            ? "blocked"
            : s.overallMsi >= benchmark.thresholds.shift
            ? "shift_required"
            : s.overallMsi >= benchmark.thresholds.approaching
            ? "approaching"
            : "safe"
          : null,
      })),
    };
  }

  // ============================================================================
  // SEED DATA
  // ============================================================================

  /**
   * Seed default benchmark configurations
   */
  async seedBenchmarks(): Promise<{ created: number }> {
    const benchmarks: CreateMsiBenchmarkRequest[] = [
      {
        name: "System Default",
        isDefault: true,
      },
      {
        name: "Oncology Standard",
        therapeuticArea: "Oncology",
        thresholds: {
          underexposed: 15,
          safe: 35,
          approaching: 45,
          shift: 60,
          blocked: 75,
        },
        stageModifiers: {
          awareness: 0.65,
          consideration: 0.8,
          trial: 0.9,
          loyalty: 1.15,
        },
      },
      {
        name: "Specialty Care",
        therapeuticArea: "Specialty",
        thresholds: {
          underexposed: 25,
          safe: 45,
          approaching: 55,
          shift: 70,
          blocked: 85,
        },
      },
    ];

    let created = 0;
    for (const benchmark of benchmarks) {
      try {
        await this.createBenchmark(benchmark);
        created++;
      } catch (e) {
        // Benchmark may already exist
      }
    }

    return { created };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private convertBenchmarkRow(row: MsiBenchmarkConfigDB): MsiBenchmark {
    return {
      id: row.id,
      name: row.name,
      therapeuticArea: row.therapeuticArea,
      brandName: row.brandName,
      thresholds: {
        underexposed: row.underexposedThreshold,
        safe: row.safeThreshold,
        approaching: row.approachingThreshold,
        shift: row.shiftThreshold,
        blocked: row.blockedThreshold,
      },
      stageModifiers: {
        awareness: row.awarenessModifier,
        consideration: row.considerationModifier,
        trial: row.trialModifier,
        loyalty: row.loyaltyModifier,
      },
      stageTouchThresholds: {
        awareness: row.awarenessTouchThreshold,
        consideration: row.considerationTouchThreshold,
        trial: row.trialTouchThreshold,
        loyalty: row.loyaltyTouchThreshold,
      },
      isDefault: row.isDefault,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

// Export singleton instance
export const campaignPlanningService = new CampaignPlanningService();
