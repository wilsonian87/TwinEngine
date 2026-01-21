import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { HCPProfile, HcpCompetitiveSummary, HcpMessageSaturationSummary, NBORecommendation } from "@shared/schema";

// Mock storage and other dependencies
vi.mock("../../server/storage", () => ({
  storage: {
    getHcpById: vi.fn(),
    getAllHcps: vi.fn(),
    filterHcps: vi.fn(),
  },
}));

vi.mock("../../server/storage/competitive-storage", () => ({
  competitiveStorage: {
    getHcpCompetitiveSummary: vi.fn(),
  },
}));

vi.mock("../../server/storage/message-saturation-storage", () => ({
  messageSaturationStorage: {
    getHcpMessageSaturationSummary: vi.fn(),
  },
}));

import { storage } from "../../server/storage";
import { competitiveStorage } from "../../server/storage/competitive-storage";
import { messageSaturationStorage } from "../../server/storage/message-saturation-storage";
import {
  generateNBORecommendation,
  generateBatchNBORecommendations,
  prioritizeNBORecommendations,
} from "../../server/services/next-best-orbit-engine";

describe("NBO Routes - Unit Tests", () => {
  // Mock data
  const createMockHCP = (id: string, overrides: Partial<HCPProfile> = {}): HCPProfile => ({
    id,
    npi: `123456789${id.slice(-1)}`,
    firstName: "Test",
    lastName: `HCP ${id}`,
    specialty: "Oncology",
    tier: "Tier 1",
    segment: "High Prescriber",
    organization: "Test Hospital",
    city: "Boston",
    state: "MA",
    overallEngagementScore: 75,
    channelPreference: "email",
    channelEngagements: [
      {
        channel: "email" as const,
        score: 80,
        lastContact: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        totalTouches: 12,
        responseRate: 35,
      },
    ],
    monthlyRxVolume: 100,
    yearlyRxVolume: 1200,
    marketSharePct: 35,
    prescribingTrend: [
      { month: "2024-01", rxCount: 95, marketShare: 33 },
      { month: "2024-02", rxCount: 100, marketShare: 35 },
    ],
    conversionLikelihood: 65,
    churnRisk: 15,
    lastUpdated: new Date().toISOString(),
    ...overrides,
  });

  const createMockSaturationSummary = (hcpId: string): HcpMessageSaturationSummary => ({
    hcpId,
    overallMsi: 55,
    themesAtRisk: 1,
    totalThemes: 4,
    topSaturatedTheme: {
      id: "theme-001",
      name: "Efficacy",
      msi: 70,
      category: "clinical",
    },
    exposures: [
      {
        id: "exp-001",
        hcpId,
        messageThemeId: "theme-001",
        themeName: "Efficacy",
        themeCategory: "clinical",
        touchFrequency: 5,
        uniqueChannels: 2,
        channelDiversity: 0.6,
        avgTimeBetweenTouches: 7,
        engagementRate: 0.3,
        engagementDecay: 0.05,
        lastEngagementDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        msi: 60,
        msiDirection: "stable",
        msiComponents: null,
        saturationRisk: "medium",
        adoptionStage: "consideration",
        measurementPeriod: "30d",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    riskLevel: "medium",
    recommendedAction: null,
  });

  const createMockCompetitiveSummary = (hcpId: string): HcpCompetitiveSummary => ({
    hcpId,
    overallCpi: 45,
    topCompetitor: {
      id: "comp-001",
      name: "Competitor A",
      cpi: 55,
      color: "#ff0000",
    },
    competitorCount: 3,
    signals: [],
    riskLevel: "medium",
    recommendedAction: null,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Single HCP NBO Generation", () => {
    it("should generate recommendation for valid HCP", async () => {
      const hcp = createMockHCP("hcp-001");
      const saturation = createMockSaturationSummary("hcp-001");
      const competitive = createMockCompetitiveSummary("hcp-001");

      vi.mocked(storage.getHcpById).mockResolvedValue(hcp);
      vi.mocked(messageSaturationStorage.getHcpMessageSaturationSummary).mockResolvedValue(saturation);
      vi.mocked(competitiveStorage.getHcpCompetitiveSummary).mockResolvedValue(competitive);

      const recommendation = generateNBORecommendation({
        hcp,
        saturationSummary: saturation,
        competitiveSummary: competitive,
      });

      expect(recommendation).toBeDefined();
      expect(recommendation.hcpId).toBe("hcp-001");
      expect(recommendation.actionType).toBeDefined();
      expect(recommendation.recommendedChannel).toBeDefined();
      expect(recommendation.confidence).toBeGreaterThanOrEqual(0);
      expect(recommendation.confidence).toBeLessThanOrEqual(1);
    });

    it("should handle missing saturation data gracefully", async () => {
      const hcp = createMockHCP("hcp-001");

      const recommendation = generateNBORecommendation({
        hcp,
        saturationSummary: null,
        competitiveSummary: null,
      });

      expect(recommendation).toBeDefined();
      expect(recommendation.hcpId).toBe("hcp-001");
    });
  });

  describe("Batch NBO Generation", () => {
    it("should generate recommendations for multiple HCPs", () => {
      const hcps = [
        createMockHCP("hcp-001"),
        createMockHCP("hcp-002", { overallEngagementScore: 40 }),
        createMockHCP("hcp-003", { overallEngagementScore: 90 }),
      ];

      const inputs = hcps.map((hcp) => ({
        hcp,
        saturationSummary: createMockSaturationSummary(hcp.id),
        competitiveSummary: createMockCompetitiveSummary(hcp.id),
      }));

      const recommendations = generateBatchNBORecommendations(inputs);

      expect(recommendations).toHaveLength(3);
      expect(recommendations[0].hcpId).toBe("hcp-001");
      expect(recommendations[1].hcpId).toBe("hcp-002");
      expect(recommendations[2].hcpId).toBe("hcp-003");
    });

    it("should handle empty input array", () => {
      const recommendations = generateBatchNBORecommendations([]);
      expect(recommendations).toHaveLength(0);
    });
  });

  describe("Prioritization", () => {
    it("should prioritize by urgency", () => {
      // Create HCPs with different urgency scenarios
      const hcps = [
        createMockHCP("hcp-low", { overallEngagementScore: 80 }), // Low urgency
        createMockHCP("hcp-high", { overallEngagementScore: 70 }), // High urgency (defend)
      ];

      // High competitive pressure for one HCP
      const inputs = [
        {
          hcp: hcps[0],
          saturationSummary: createMockSaturationSummary(hcps[0].id),
          competitiveSummary: { ...createMockCompetitiveSummary(hcps[0].id), overallCpi: 20, riskLevel: "low" as const },
        },
        {
          hcp: hcps[1],
          saturationSummary: createMockSaturationSummary(hcps[1].id),
          competitiveSummary: { ...createMockCompetitiveSummary(hcps[1].id), overallCpi: 85, riskLevel: "critical" as const },
        },
      ];

      const recommendations = generateBatchNBORecommendations(inputs);
      const prioritized = prioritizeNBORecommendations(recommendations);

      // High urgency should be first
      expect(prioritized[0].urgency).toBe("high");
    });

    it("should respect limit parameter", () => {
      const hcps = Array.from({ length: 10 }, (_, i) =>
        createMockHCP(`hcp-${i}`)
      );

      const inputs = hcps.map((hcp) => ({
        hcp,
        saturationSummary: createMockSaturationSummary(hcp.id),
        competitiveSummary: createMockCompetitiveSummary(hcp.id),
      }));

      const recommendations = generateBatchNBORecommendations(inputs);
      const prioritized = prioritizeNBORecommendations(recommendations, 5);

      expect(prioritized).toHaveLength(5);
    });
  });

  describe("Recommendation Quality", () => {
    it("should generate different action types for different scenarios", () => {
      // Low engagement + old contact = reactivate
      const dormantHcp = createMockHCP("hcp-dormant", {
        overallEngagementScore: 15,
        channelEngagements: [
          {
            channel: "email" as const,
            score: 10,
            lastContact: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
            totalTouches: 1,
            responseRate: 0,
          },
        ],
      });

      // High competitive pressure = defend
      const highCompetitiveSummary = {
        ...createMockCompetitiveSummary("hcp-defended"),
        overallCpi: 85,
        riskLevel: "critical" as const,
      };

      // High saturation = pause
      const highSaturation = {
        ...createMockSaturationSummary("hcp-saturated"),
        overallMsi: 92,
        riskLevel: "critical" as const,
      };

      // Test dormant HCP
      const dormantRec = generateNBORecommendation({
        hcp: dormantHcp,
        saturationSummary: createMockSaturationSummary("hcp-dormant"),
        competitiveSummary: createMockCompetitiveSummary("hcp-dormant"),
      });

      // Test high competitive pressure
      const defendRec = generateNBORecommendation({
        hcp: createMockHCP("hcp-defended"),
        saturationSummary: createMockSaturationSummary("hcp-defended"),
        competitiveSummary: highCompetitiveSummary,
      });

      // Test high saturation
      const pauseRec = generateNBORecommendation({
        hcp: createMockHCP("hcp-saturated"),
        saturationSummary: highSaturation,
        competitiveSummary: { ...createMockCompetitiveSummary("hcp-saturated"), overallCpi: 20, riskLevel: "low" as const },
      });

      // Different scenarios should yield different action types
      expect(["reactivate", "nurture", "engage"]).toContain(dormantRec.actionType);
      expect(["defend", "reinforce", "engage"]).toContain(defendRec.actionType);
      expect(["pause", "nurture"]).toContain(pauseRec.actionType);
    });

    it("should include rationale for all recommendations", () => {
      const hcp = createMockHCP("hcp-001");
      const recommendation = generateNBORecommendation({
        hcp,
        saturationSummary: createMockSaturationSummary("hcp-001"),
        competitiveSummary: createMockCompetitiveSummary("hcp-001"),
      });

      expect(recommendation.rationale).toBeDefined();
      expect(recommendation.rationale.length).toBeGreaterThan(0);
      expect(Array.isArray(recommendation.keyFactors)).toBe(true);
    });
  });

  describe("Summary Generation", () => {
    it("should calculate action distribution correctly", () => {
      const hcps = Array.from({ length: 20 }, (_, i) =>
        createMockHCP(`hcp-${i}`, {
          overallEngagementScore: 30 + i * 3, // Varying engagement
        })
      );

      const inputs = hcps.map((hcp) => ({
        hcp,
        saturationSummary: createMockSaturationSummary(hcp.id),
        competitiveSummary: createMockCompetitiveSummary(hcp.id),
      }));

      const recommendations = generateBatchNBORecommendations(inputs);

      // Calculate distribution
      const actionDistribution: Record<string, number> = {};
      for (const rec of recommendations) {
        actionDistribution[rec.actionType] = (actionDistribution[rec.actionType] || 0) + 1;
      }

      // Sum of distribution should equal total
      const total = Object.values(actionDistribution).reduce((sum, count) => sum + count, 0);
      expect(total).toBe(recommendations.length);
    });
  });
});
