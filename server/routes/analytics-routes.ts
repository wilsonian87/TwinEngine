import { Router } from "express";
import { eq, inArray, avg, count, sql } from "drizzle-orm";
import { db } from "../db";
import { hcpProfiles, savedAudiences } from "@shared/schema";

export const analyticsRouter = Router();

// ============================================================================
// TYPES
// ============================================================================

interface CohortMetrics {
  a: number;
  b: number;
  delta: number;
  percentDelta?: number;
  significant?: boolean;
}

interface Distribution {
  a: Record<string, number>;
  b: Record<string, number>;
}

interface HistogramBin {
  min: number;
  max: number;
  count: number;
}

interface CohortComparisonResponse {
  cohortA: { id: string; name: string; count: number };
  cohortB: { id: string; name: string; count: number };
  overlap: { count: number; percentage: number };
  metrics: {
    avgEngagement: CohortMetrics;
    avgCPI: CohortMetrics;
    avgMSI: CohortMetrics;
    avgChurnRisk: CohortMetrics;
    avgConversionLikelihood: CohortMetrics;
    totalRxVolume: CohortMetrics;
    avgMarketShare: CohortMetrics;
  };
  distributions: {
    tier: Distribution;
    segment: Distribution;
    specialty: Distribution;
    channelPreference: Distribution;
    engagement: { a: HistogramBin[]; b: HistogramBin[] };
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function calculateHistogram(values: number[], bins: number = 10): HistogramBin[] {
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const binWidth = (max - min) / bins || 1;

  const histogram: HistogramBin[] = [];
  for (let i = 0; i < bins; i++) {
    histogram.push({
      min: Math.round(min + i * binWidth),
      max: Math.round(min + (i + 1) * binWidth),
      count: 0,
    });
  }

  for (const value of values) {
    const binIndex = Math.min(Math.floor((value - min) / binWidth), bins - 1);
    if (binIndex >= 0 && binIndex < bins) {
      histogram[binIndex].count++;
    }
  }

  return histogram;
}

function calculateDistribution(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    counts[value] = (counts[value] || 0) + 1;
  }

  const total = values.length || 1;
  const distribution: Record<string, number> = {};
  for (const [key, count] of Object.entries(counts)) {
    distribution[key] = Math.round((count / total) * 100) / 100;
  }

  return distribution;
}

function isSignificant(valuesA: number[], valuesB: number[]): boolean {
  // Simple significance test: difference in means > 1 standard error
  if (valuesA.length < 5 || valuesB.length < 5) return false;

  const meanA = valuesA.reduce((a, b) => a + b, 0) / valuesA.length;
  const meanB = valuesB.reduce((a, b) => a + b, 0) / valuesB.length;

  const varA = valuesA.reduce((sum, v) => sum + (v - meanA) ** 2, 0) / valuesA.length;
  const varB = valuesB.reduce((sum, v) => sum + (v - meanB) ** 2, 0) / valuesB.length;

  const se = Math.sqrt(varA / valuesA.length + varB / valuesB.length);

  return Math.abs(meanA - meanB) > 1.96 * se; // 95% confidence
}

// ============================================================================
// COHORT COMPARISON ENDPOINT
// GET /api/analytics/cohort-compare?cohortA=id&cohortB=id
// ============================================================================

analyticsRouter.get("/cohort-compare", async (req, res) => {
  try {
    const { cohortA: cohortAId, cohortB: cohortBId } = req.query;

    if (!cohortAId || !cohortBId) {
      return res.status(400).json({ error: "Both cohortA and cohortB are required" });
    }

    // Fetch both audiences
    const [audienceA] = await db
      .select()
      .from(savedAudiences)
      .where(eq(savedAudiences.id, String(cohortAId)));

    const [audienceB] = await db
      .select()
      .from(savedAudiences)
      .where(eq(savedAudiences.id, String(cohortBId)));

    if (!audienceA || !audienceB) {
      return res.status(404).json({ error: "One or both audiences not found" });
    }

    // Fetch HCPs for both cohorts
    const hcpsA = audienceA.hcpIds.length > 0
      ? await db.select().from(hcpProfiles).where(inArray(hcpProfiles.id, audienceA.hcpIds))
      : [];

    const hcpsB = audienceB.hcpIds.length > 0
      ? await db.select().from(hcpProfiles).where(inArray(hcpProfiles.id, audienceB.hcpIds))
      : [];

    // Guard: if either audience resolves to 0 HCPs, they reference stale IDs
    if (hcpsA.length === 0 || hcpsB.length === 0) {
      return res.json({
        staleAudiences: true,
        staleCohorts: [
          ...(hcpsA.length === 0 ? [{ id: audienceA.id, name: audienceA.name }] : []),
          ...(hcpsB.length === 0 ? [{ id: audienceB.id, name: audienceB.name }] : []),
        ],
      });
    }

    // Calculate overlap
    const setA = new Set(audienceA.hcpIds);
    const overlapCount = audienceB.hcpIds.filter(id => setA.has(id)).length;
    const unionSize = new Set([...audienceA.hcpIds, ...audienceB.hcpIds]).size;
    const overlapPercentage = unionSize > 0 ? Math.round((overlapCount / unionSize) * 100) : 0;

    // Extract metric values
    const engagementA = hcpsA.map(h => h.overallEngagementScore);
    const engagementB = hcpsB.map(h => h.overallEngagementScore);
    const churnRiskA = hcpsA.map(h => h.churnRisk);
    const churnRiskB = hcpsB.map(h => h.churnRisk);
    const conversionA = hcpsA.map(h => h.conversionLikelihood);
    const conversionB = hcpsB.map(h => h.conversionLikelihood);
    const rxVolumeA = hcpsA.map(h => h.monthlyRxVolume);
    const rxVolumeB = hcpsB.map(h => h.monthlyRxVolume);
    const marketShareA = hcpsA.map(h => h.marketSharePct);
    const marketShareB = hcpsB.map(h => h.marketSharePct);

    // Calculate averages
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

    const avgEngA = Math.round(avg(engagementA) * 10) / 10;
    const avgEngB = Math.round(avg(engagementB) * 10) / 10;
    const avgChurnA = Math.round(avg(churnRiskA) * 10) / 10;
    const avgChurnB = Math.round(avg(churnRiskB) * 10) / 10;
    const avgConvA = Math.round(avg(conversionA) * 10) / 10;
    const avgConvB = Math.round(avg(conversionB) * 10) / 10;
    const totalRxA = sum(rxVolumeA);
    const totalRxB = sum(rxVolumeB);
    const avgMsA = Math.round(avg(marketShareA) * 10) / 10;
    const avgMsB = Math.round(avg(marketShareB) * 10) / 10;

    // Mock CPI and MSI (in production, would come from competitive/saturation storage)
    // Using churn risk as proxy for CPI, engagement decay as MSI proxy
    const avgCpiA = Math.round(avg(churnRiskA) * 0.8 + 20); // Scaled mock
    const avgCpiB = Math.round(avg(churnRiskB) * 0.8 + 20);
    const avgMsiA = Math.round(100 - avg(engagementA) * 0.5); // Inverse of engagement
    const avgMsiB = Math.round(100 - avg(engagementB) * 0.5);

    // Build response
    const response: CohortComparisonResponse = {
      cohortA: {
        id: audienceA.id,
        name: audienceA.name,
        count: hcpsA.length,
      },
      cohortB: {
        id: audienceB.id,
        name: audienceB.name,
        count: hcpsB.length,
      },
      overlap: {
        count: overlapCount,
        percentage: overlapPercentage,
      },
      metrics: {
        avgEngagement: {
          a: avgEngA,
          b: avgEngB,
          delta: Math.round((avgEngA - avgEngB) * 10) / 10,
          significant: isSignificant(engagementA, engagementB),
        },
        avgCPI: {
          a: avgCpiA,
          b: avgCpiB,
          delta: Math.round((avgCpiA - avgCpiB) * 10) / 10,
          significant: Math.abs(avgCpiA - avgCpiB) > 10,
        },
        avgMSI: {
          a: avgMsiA,
          b: avgMsiB,
          delta: Math.round((avgMsiA - avgMsiB) * 10) / 10,
          significant: Math.abs(avgMsiA - avgMsiB) > 10,
        },
        avgChurnRisk: {
          a: avgChurnA,
          b: avgChurnB,
          delta: Math.round((avgChurnA - avgChurnB) * 10) / 10,
          significant: isSignificant(churnRiskA, churnRiskB),
        },
        avgConversionLikelihood: {
          a: avgConvA,
          b: avgConvB,
          delta: Math.round((avgConvA - avgConvB) * 10) / 10,
          significant: isSignificant(conversionA, conversionB),
        },
        totalRxVolume: {
          a: totalRxA,
          b: totalRxB,
          delta: totalRxA - totalRxB,
          percentDelta: totalRxB > 0 ? Math.round(((totalRxA - totalRxB) / totalRxB) * 1000) / 10 : 0,
        },
        avgMarketShare: {
          a: avgMsA,
          b: avgMsB,
          delta: Math.round((avgMsA - avgMsB) * 10) / 10,
          significant: isSignificant(marketShareA, marketShareB),
        },
      },
      distributions: {
        tier: {
          a: calculateDistribution(hcpsA.map(h => h.tier)),
          b: calculateDistribution(hcpsB.map(h => h.tier)),
        },
        segment: {
          a: calculateDistribution(hcpsA.map(h => h.segment)),
          b: calculateDistribution(hcpsB.map(h => h.segment)),
        },
        specialty: {
          a: calculateDistribution(hcpsA.map(h => h.specialty)),
          b: calculateDistribution(hcpsB.map(h => h.specialty)),
        },
        channelPreference: {
          a: calculateDistribution(hcpsA.map(h => h.channelPreference)),
          b: calculateDistribution(hcpsB.map(h => h.channelPreference)),
        },
        engagement: {
          a: calculateHistogram(engagementA, 10),
          b: calculateHistogram(engagementB, 10),
        },
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error in cohort comparison:", error);
    res.status(500).json({ error: "Failed to compare cohorts" });
  }
});

// ============================================================================
// QUICK PRESETS
// GET /api/analytics/cohort-presets
// ============================================================================

analyticsRouter.get("/cohort-presets", async (req, res) => {
  try {
    // Fetch all HCPs to create dynamic presets
    const allHcps = await db.select().from(hcpProfiles);

    // Build preset definitions based on actual data
    const tier1Ids = allHcps.filter(h => h.tier === "Tier 1").map(h => h.id);
    const tier2Ids = allHcps.filter(h => h.tier === "Tier 2").map(h => h.id);
    const digitalIds = allHcps.filter(h => ["email", "webinar", "digital_ad"].includes(h.channelPreference)).map(h => h.id);
    const traditionalIds = allHcps.filter(h => ["rep_visit", "phone", "conference"].includes(h.channelPreference)).map(h => h.id);
    const highEngagedIds = allHcps.filter(h => h.overallEngagementScore >= 60).map(h => h.id);
    const lowEngagedIds = allHcps.filter(h => h.overallEngagementScore < 40).map(h => h.id);

    const presets = [
      {
        id: "tier1-vs-tier2",
        name: "Tier 1 vs Tier 2",
        description: "Compare high-value vs mid-tier HCPs",
        cohortA: { name: "Tier 1 HCPs", hcpIds: tier1Ids, count: tier1Ids.length },
        cohortB: { name: "Tier 2 HCPs", hcpIds: tier2Ids, count: tier2Ids.length },
      },
      {
        id: "digital-vs-traditional",
        name: "Digital vs Traditional",
        description: "Compare channel preference segments",
        cohortA: { name: "Digital-First HCPs", hcpIds: digitalIds, count: digitalIds.length },
        cohortB: { name: "Traditional HCPs", hcpIds: traditionalIds, count: traditionalIds.length },
      },
      {
        id: "high-vs-low-engagement",
        name: "High vs Low Engagement",
        description: "Compare by engagement level",
        cohortA: { name: "Highly Engaged", hcpIds: highEngagedIds, count: highEngagedIds.length },
        cohortB: { name: "Low Engagement", hcpIds: lowEngagedIds, count: lowEngagedIds.length },
      },
    ];

    res.json({ presets });
  } catch (error) {
    console.error("Error fetching presets:", error);
    res.status(500).json({ error: "Failed to fetch presets" });
  }
});

// ============================================================================
// PRESET COMPARISON (direct comparison without saved audiences)
// POST /api/analytics/cohort-compare-preset
// ============================================================================

analyticsRouter.post("/cohort-compare-preset", async (req, res) => {
  try {
    const { cohortA, cohortB } = req.body;

    if (!cohortA?.hcpIds || !cohortB?.hcpIds) {
      return res.status(400).json({ error: "Both cohorts with hcpIds are required" });
    }

    // Fetch HCPs for both cohorts
    const hcpsA = cohortA.hcpIds.length > 0
      ? await db.select().from(hcpProfiles).where(inArray(hcpProfiles.id, cohortA.hcpIds))
      : [];

    const hcpsB = cohortB.hcpIds.length > 0
      ? await db.select().from(hcpProfiles).where(inArray(hcpProfiles.id, cohortB.hcpIds))
      : [];

    // Calculate overlap
    const setA = new Set(cohortA.hcpIds);
    const overlapCount = cohortB.hcpIds.filter((id: string) => setA.has(id)).length;
    const unionSize = new Set([...cohortA.hcpIds, ...cohortB.hcpIds]).size;
    const overlapPercentage = unionSize > 0 ? Math.round((overlapCount / unionSize) * 100) : 0;

    // Extract metric values
    const engagementA = hcpsA.map(h => h.overallEngagementScore);
    const engagementB = hcpsB.map(h => h.overallEngagementScore);
    const churnRiskA = hcpsA.map(h => h.churnRisk);
    const churnRiskB = hcpsB.map(h => h.churnRisk);
    const conversionA = hcpsA.map(h => h.conversionLikelihood);
    const conversionB = hcpsB.map(h => h.conversionLikelihood);
    const rxVolumeA = hcpsA.map(h => h.monthlyRxVolume);
    const rxVolumeB = hcpsB.map(h => h.monthlyRxVolume);
    const marketShareA = hcpsA.map(h => h.marketSharePct);
    const marketShareB = hcpsB.map(h => h.marketSharePct);

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

    const avgEngA = Math.round(avg(engagementA) * 10) / 10;
    const avgEngB = Math.round(avg(engagementB) * 10) / 10;
    const avgChurnA = Math.round(avg(churnRiskA) * 10) / 10;
    const avgChurnB = Math.round(avg(churnRiskB) * 10) / 10;
    const avgConvA = Math.round(avg(conversionA) * 10) / 10;
    const avgConvB = Math.round(avg(conversionB) * 10) / 10;
    const totalRxA = sum(rxVolumeA);
    const totalRxB = sum(rxVolumeB);
    const avgMsA = Math.round(avg(marketShareA) * 10) / 10;
    const avgMsB = Math.round(avg(marketShareB) * 10) / 10;

    const avgCpiA = Math.round(avg(churnRiskA) * 0.8 + 20);
    const avgCpiB = Math.round(avg(churnRiskB) * 0.8 + 20);
    const avgMsiA = Math.round(100 - avg(engagementA) * 0.5);
    const avgMsiB = Math.round(100 - avg(engagementB) * 0.5);

    const response: CohortComparisonResponse = {
      cohortA: {
        id: "preset-a",
        name: cohortA.name || "Cohort A",
        count: hcpsA.length,
      },
      cohortB: {
        id: "preset-b",
        name: cohortB.name || "Cohort B",
        count: hcpsB.length,
      },
      overlap: {
        count: overlapCount,
        percentage: overlapPercentage,
      },
      metrics: {
        avgEngagement: {
          a: avgEngA,
          b: avgEngB,
          delta: Math.round((avgEngA - avgEngB) * 10) / 10,
          significant: isSignificant(engagementA, engagementB),
        },
        avgCPI: {
          a: avgCpiA,
          b: avgCpiB,
          delta: Math.round((avgCpiA - avgCpiB) * 10) / 10,
          significant: Math.abs(avgCpiA - avgCpiB) > 10,
        },
        avgMSI: {
          a: avgMsiA,
          b: avgMsiB,
          delta: Math.round((avgMsiA - avgMsiB) * 10) / 10,
          significant: Math.abs(avgMsiA - avgMsiB) > 10,
        },
        avgChurnRisk: {
          a: avgChurnA,
          b: avgChurnB,
          delta: Math.round((avgChurnA - avgChurnB) * 10) / 10,
          significant: isSignificant(churnRiskA, churnRiskB),
        },
        avgConversionLikelihood: {
          a: avgConvA,
          b: avgConvB,
          delta: Math.round((avgConvA - avgConvB) * 10) / 10,
          significant: isSignificant(conversionA, conversionB),
        },
        totalRxVolume: {
          a: totalRxA,
          b: totalRxB,
          delta: totalRxA - totalRxB,
          percentDelta: totalRxB > 0 ? Math.round(((totalRxA - totalRxB) / totalRxB) * 1000) / 10 : 0,
        },
        avgMarketShare: {
          a: avgMsA,
          b: avgMsB,
          delta: Math.round((avgMsA - avgMsB) * 10) / 10,
          significant: isSignificant(marketShareA, marketShareB),
        },
      },
      distributions: {
        tier: {
          a: calculateDistribution(hcpsA.map(h => h.tier)),
          b: calculateDistribution(hcpsB.map(h => h.tier)),
        },
        segment: {
          a: calculateDistribution(hcpsA.map(h => h.segment)),
          b: calculateDistribution(hcpsB.map(h => h.segment)),
        },
        specialty: {
          a: calculateDistribution(hcpsA.map(h => h.specialty)),
          b: calculateDistribution(hcpsB.map(h => h.specialty)),
        },
        channelPreference: {
          a: calculateDistribution(hcpsA.map(h => h.channelPreference)),
          b: calculateDistribution(hcpsB.map(h => h.channelPreference)),
        },
        engagement: {
          a: calculateHistogram(engagementA, 10),
          b: calculateHistogram(engagementB, 10),
        },
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error in preset comparison:", error);
    res.status(500).json({ error: "Failed to compare presets" });
  }
});
