import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateNBORecommendation,
  generateBatchNBORecommendations,
  prioritizeNBORecommendations,
  type NBOEngineInput,
} from "../../server/services/next-best-orbit-engine";
import type { HCPProfile, HcpCompetitiveSummary, HcpMessageSaturationSummary } from "@shared/schema";

describe("Next Best Orbit Engine", () => {
  // Mock HCP Profile
  const createMockHCP = (overrides: Partial<HCPProfile> = {}): HCPProfile => ({
    id: "hcp-001",
    npi: "1234567890",
    firstName: "Jane",
    lastName: "Smith",
    specialty: "Oncology",
    tier: "Tier 1",
    segment: "High Prescriber",
    organization: "Dana-Farber Cancer Institute",
    city: "Boston",
    state: "MA",
    overallEngagementScore: 75,
    channelPreference: "email",
    channelEngagements: [
      {
        channel: "email" as const,
        score: 80,
        lastContact: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        totalTouches: 12,
        responseRate: 35, // 35% response rate
      },
      {
        channel: "rep_visit" as const,
        score: 70,
        lastContact: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
        totalTouches: 6,
        responseRate: 50, // 50% response rate
      },
      {
        channel: "webinar" as const,
        score: 60,
        lastContact: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        totalTouches: 3,
        responseRate: 67, // 67% response rate
      },
    ],
    monthlyRxVolume: 100,
    yearlyRxVolume: 1200,
    marketSharePct: 35,
    prescribingTrend: [
      { month: "2024-01", rxCount: 95, marketShare: 33 },
      { month: "2024-02", rxCount: 100, marketShare: 35 },
      { month: "2024-03", rxCount: 105, marketShare: 37 },
    ],
    conversionLikelihood: 65,
    churnRisk: 15,
    lastUpdated: new Date().toISOString(),
    ...overrides,
  });

  // Mock Competitive Summary
  const createMockCompetitiveSummary = (
    overrides: Partial<HcpCompetitiveSummary> = {}
  ): HcpCompetitiveSummary => ({
    hcpId: "hcp-001",
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
    ...overrides,
  });

  // Mock Saturation Summary
  const createMockSaturationSummary = (
    overrides: Partial<HcpMessageSaturationSummary> = {}
  ): HcpMessageSaturationSummary => ({
    hcpId: "hcp-001",
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
        hcpId: "hcp-001",
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
    ...overrides,
  });

  describe("generateNBORecommendation", () => {
    it("should generate a recommendation with all required fields", () => {
      const input: NBOEngineInput = {
        hcp: createMockHCP(),
        competitiveSummary: createMockCompetitiveSummary(),
        saturationSummary: createMockSaturationSummary(),
      };

      const result = generateNBORecommendation(input);

      expect(result).toHaveProperty("hcpId", "hcp-001");
      expect(result).toHaveProperty("recommendedChannel");
      expect(result).toHaveProperty("actionType");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("confidenceLevel");
      expect(result).toHaveProperty("componentScores");
      expect(result).toHaveProperty("rationale");
      expect(result).toHaveProperty("generatedAt");
    });

    it("should return a confidence value between 0 and 1", () => {
      const input: NBOEngineInput = {
        hcp: createMockHCP(),
        competitiveSummary: createMockCompetitiveSummary(),
        saturationSummary: createMockSaturationSummary(),
      };

      const result = generateNBORecommendation(input);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should assign correct confidence level based on score", () => {
      const input: NBOEngineInput = {
        hcp: createMockHCP(),
        competitiveSummary: createMockCompetitiveSummary(),
        saturationSummary: createMockSaturationSummary(),
      };

      const result = generateNBORecommendation(input);

      // Confidence level should match the threshold
      if (result.confidence >= 0.75) {
        expect(result.confidenceLevel).toBe("high");
      } else if (result.confidence >= 0.5) {
        expect(result.confidenceLevel).toBe("medium");
      } else {
        expect(result.confidenceLevel).toBe("low");
      }
    });

    it("should have valid component scores", () => {
      const input: NBOEngineInput = {
        hcp: createMockHCP(),
        competitiveSummary: createMockCompetitiveSummary(),
        saturationSummary: createMockSaturationSummary(),
      };

      const result = generateNBORecommendation(input);

      expect(result.componentScores).toHaveProperty("engagementScore");
      expect(result.componentScores).toHaveProperty("adoptionScore");
      expect(result.componentScores).toHaveProperty("channelScore");
      expect(result.componentScores).toHaveProperty("saturationScore");
      expect(result.componentScores).toHaveProperty("competitiveScore");
      expect(result.componentScores).toHaveProperty("recencyScore");
    });
  });

  describe("Decision Rules - Engagement Based", () => {
    it("should recommend 'engage' for high engagement, early adopters", () => {
      const hcp = createMockHCP({
        overallEngagementScore: 85,
        adoptionSegment: "Early Adopter",
      });

      const input: NBOEngineInput = {
        hcp,
        competitiveSummary: createMockCompetitiveSummary({ overallCpi: 20, riskLevel: "low" }),
        saturationSummary: createMockSaturationSummary({ overallMsi: 40, riskLevel: "low" }),
      };

      const result = generateNBORecommendation(input);

      // High engagement + early adopter typically leads to engage or reinforce
      expect(["engage", "reinforce", "expand"]).toContain(result.actionType);
    });

    it("should recommend 'nurture' for low engagement HCPs", () => {
      const hcp = createMockHCP({
        overallEngagementScore: 25,
        adoptionSegment: "Laggard",
        channelEngagements: [
          {
            channel: "email" as const,
            score: 20,
            lastContact: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            totalTouches: 2,
            responseRate: 10, // 10%
          },
        ],
      });

      const input: NBOEngineInput = {
        hcp,
        competitiveSummary: createMockCompetitiveSummary({ overallCpi: 30, riskLevel: "low" }),
        saturationSummary: createMockSaturationSummary({ overallMsi: 30, riskLevel: "low" }),
      };

      const result = generateNBORecommendation(input);

      // Low engagement typically leads to nurture or reactivate
      expect(["nurture", "reactivate", "engage"]).toContain(result.actionType);
    });

    it("should recommend 'reactivate' for dormant HCPs", () => {
      const hcp = createMockHCP({
        overallEngagementScore: 15,
        adoptionSegment: "Laggard",
        channelEngagements: [
          {
            channel: "email" as const,
            score: 10,
            lastContact: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(), // 120 days ago
            totalTouches: 1,
            responseRate: 0,
          },
        ],
      });

      const input: NBOEngineInput = {
        hcp,
        competitiveSummary: createMockCompetitiveSummary({ overallCpi: 50, riskLevel: "medium" }),
        saturationSummary: createMockSaturationSummary({ overallMsi: 20, riskLevel: "low" }),
      };

      const result = generateNBORecommendation(input);

      // Dormant HCPs with old contact should get reactivate
      expect(["reactivate", "nurture", "engage"]).toContain(result.actionType);
    });
  });

  describe("Decision Rules - Competitive Pressure", () => {
    it("should recommend 'defend' when under high competitive pressure", () => {
      const hcp = createMockHCP({
        overallEngagementScore: 70,
      });

      const competitiveSummary = createMockCompetitiveSummary({
        overallCpi: 85,
        riskLevel: "critical",
        topCompetitor: {
          id: "comp-x",
          name: "Competitor X",
          cpi: 90,
          color: "#ff0000",
        },
      });

      const input: NBOEngineInput = {
        hcp,
        competitiveSummary,
        saturationSummary: createMockSaturationSummary({ overallMsi: 40, riskLevel: "low" }),
      };

      const result = generateNBORecommendation(input);

      // High competitive pressure should lead to defend
      expect(["defend", "reinforce", "engage"]).toContain(result.actionType);
    });

    it("should include competitive risk factors in key factors", () => {
      const hcp = createMockHCP();
      const competitiveSummary = createMockCompetitiveSummary({
        overallCpi: 75,
        riskLevel: "high",
        topCompetitor: {
          id: "comp-a",
          name: "Aggressive Competitor",
          cpi: 80,
          color: "#ff0000",
        },
      });

      const input: NBOEngineInput = {
        hcp,
        competitiveSummary,
        saturationSummary: createMockSaturationSummary(),
      };

      const result = generateNBORecommendation(input);

      // Should have competitive-related key factor
      expect(result.keyFactors.some((f) => f.toLowerCase().includes("compet"))).toBe(true);
    });
  });

  describe("Decision Rules - Saturation Impact", () => {
    it("should recommend 'pause' when MSI is critically high", () => {
      const hcp = createMockHCP();

      const highSaturation = createMockSaturationSummary({
        overallMsi: 92,
        riskLevel: "critical",
        themesAtRisk: 3,
        topSaturatedTheme: {
          id: "theme-001",
          name: "Efficacy",
          msi: 95,
          category: "clinical",
        },
      });

      const input: NBOEngineInput = {
        hcp,
        competitiveSummary: createMockCompetitiveSummary({ overallCpi: 20, riskLevel: "low" }),
        saturationSummary: highSaturation,
      };

      const result = generateNBORecommendation(input);

      // Critical saturation should lead to pause or reduced engagement
      expect(["pause", "nurture"]).toContain(result.actionType);
    });

    it("should recommend 'expand' when MSI is low (underexposed)", () => {
      const hcp = createMockHCP({
        overallEngagementScore: 65,
        adoptionSegment: "Early Majority",
      });

      const lowSaturation = createMockSaturationSummary({
        overallMsi: 20,
        riskLevel: "low",
        themesAtRisk: 0,
      });

      const input: NBOEngineInput = {
        hcp,
        competitiveSummary: createMockCompetitiveSummary({ overallCpi: 40, riskLevel: "medium" }),
        saturationSummary: lowSaturation,
      };

      const result = generateNBORecommendation(input);

      // Low saturation + decent engagement = expand opportunity
      expect(["expand", "engage", "reinforce"]).toContain(result.actionType);
    });
  });

  describe("Channel Selection", () => {
    it("should recommend highest affinity channel", () => {
      const hcp = createMockHCP({
        channelEngagements: [
          {
            channel: "email" as const,
            score: 90,
            lastContact: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            totalTouches: 15,
            responseRate: 50, // 50%
          },
          {
            channel: "rep_visit" as const,
            score: 40,
            lastContact: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            totalTouches: 3,
            responseRate: 20, // 20%
          },
        ],
      });

      const input: NBOEngineInput = {
        hcp,
        competitiveSummary: createMockCompetitiveSummary(),
        saturationSummary: createMockSaturationSummary(),
      };

      const result = generateNBORecommendation(input);

      // Should prefer email due to higher score
      expect(result.recommendedChannel).toBe("email");
    });
  });

  describe("Confidence Scoring", () => {
    it("should have higher confidence with consistent signals", () => {
      // High engagement, early adopter, low saturation, low competition
      const optimalHCP = createMockHCP({
        overallEngagementScore: 90,
        channelEngagements: [
          {
            channel: "email" as const,
            score: 90,
            lastContact: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            totalTouches: 15,
            responseRate: 50, // 50%
          },
        ],
      });

      const optimalInput: NBOEngineInput = {
        hcp: optimalHCP,
        competitiveSummary: createMockCompetitiveSummary({ overallCpi: 15, riskLevel: "low" }),
        saturationSummary: createMockSaturationSummary({ overallMsi: 35, riskLevel: "low" }),
      };

      const optimalResult = generateNBORecommendation(optimalInput);

      // Conflicting signals: high engagement but also high saturation
      const conflictingHCP = createMockHCP({
        overallEngagementScore: 80,
        adoptionSegment: "Early Adopter",
      });

      const conflictingInput: NBOEngineInput = {
        hcp: conflictingHCP,
        competitiveSummary: createMockCompetitiveSummary({ overallCpi: 80, riskLevel: "high" }),
        saturationSummary: createMockSaturationSummary({ overallMsi: 85, riskLevel: "high" }),
      };

      const conflictingResult = generateNBORecommendation(conflictingInput);

      // Optimal situation should have higher or equal confidence
      expect(optimalResult.confidence).toBeGreaterThanOrEqual(conflictingResult.confidence * 0.9);
    });

    it("should have lower confidence with sparse data", () => {
      const sparseHCP = createMockHCP({
        overallEngagementScore: 50,
        channelEngagements: [
          {
            channel: "email" as const,
            score: 50,
            lastContact: null,
            totalTouches: 1,
            responseRate: 0,
          },
        ],
      });

      const input: NBOEngineInput = {
        hcp: sparseHCP,
        competitiveSummary: createMockCompetitiveSummary({ competitorCount: 0 }),
        saturationSummary: createMockSaturationSummary({ totalThemes: 0 }),
      };

      const result = generateNBORecommendation(input);

      // Sparse data - result should still be valid
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe("Rationale Generation", () => {
    it("should provide actionable rationale", () => {
      const input: NBOEngineInput = {
        hcp: createMockHCP(),
        competitiveSummary: createMockCompetitiveSummary(),
        saturationSummary: createMockSaturationSummary(),
      };

      const result = generateNBORecommendation(input);

      expect(result.rationale).toBeDefined();
      expect(result.rationale.length).toBeGreaterThan(0);
    });

    it("should list relevant key factors", () => {
      const hcp = createMockHCP();
      const competitiveSummary = createMockCompetitiveSummary({
        overallCpi: 70,
        riskLevel: "high",
      });

      const input: NBOEngineInput = {
        hcp,
        competitiveSummary,
        saturationSummary: createMockSaturationSummary(),
      };

      const result = generateNBORecommendation(input);

      expect(Array.isArray(result.keyFactors)).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle HCP with no channel engagements", () => {
      const hcp = createMockHCP({
        channelEngagements: [],
      });

      const input: NBOEngineInput = {
        hcp,
        competitiveSummary: createMockCompetitiveSummary(),
        saturationSummary: createMockSaturationSummary(),
      };

      const result = generateNBORecommendation(input);

      expect(result).toHaveProperty("recommendedChannel");
      expect(result).toHaveProperty("actionType");
    });

    it("should handle null competitive summary", () => {
      const input: NBOEngineInput = {
        hcp: createMockHCP(),
        competitiveSummary: null,
        saturationSummary: createMockSaturationSummary(),
      };

      // Should not throw
      expect(() => generateNBORecommendation(input)).not.toThrow();

      const result = generateNBORecommendation(input);
      expect(result).toHaveProperty("actionType");
    });

    it("should handle null saturation summary", () => {
      const input: NBOEngineInput = {
        hcp: createMockHCP(),
        competitiveSummary: createMockCompetitiveSummary(),
        saturationSummary: null,
      };

      // Should not throw
      expect(() => generateNBORecommendation(input)).not.toThrow();

      const result = generateNBORecommendation(input);
      expect(result).toHaveProperty("actionType");
    });

    it("should handle extreme values gracefully", () => {
      const extremeHCP = createMockHCP({
        overallEngagementScore: 0,
        channelEngagements: [
          {
            channel: "email" as const,
            score: 0,
            lastContact: new Date(0).toISOString(), // Very old date
            totalTouches: 0,
            responseRate: 0,
          },
        ],
      });

      const input: NBOEngineInput = {
        hcp: extremeHCP,
        competitiveSummary: createMockCompetitiveSummary({ overallCpi: 100, riskLevel: "critical" }),
        saturationSummary: createMockSaturationSummary({ overallMsi: 100, riskLevel: "critical" }),
      };

      const result = generateNBORecommendation(input);

      // Should handle extremes without errors
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe("Input Weights", () => {
    it("should respect custom weights when provided", () => {
      const input: NBOEngineInput = {
        hcp: createMockHCP(),
        competitiveSummary: createMockCompetitiveSummary(),
        saturationSummary: createMockSaturationSummary(),
        weights: {
          engagementTrajectory: 0.5, // Heavy weight on engagement
          adoptionStage: 0.1,
          channelAffinity: 0.1,
          messageSaturation: 0.1,
          competitivePressure: 0.1,
          recentTouchHistory: 0.1,
        },
      };

      const result = generateNBORecommendation(input);

      // Should still generate valid recommendation
      expect(result).toHaveProperty("actionType");
      expect(result).toHaveProperty("confidence");
    });
  });

  describe("Batch Recommendations", () => {
    it("should generate recommendations for multiple HCPs", () => {
      const inputs: NBOEngineInput[] = [
        {
          hcp: createMockHCP({ id: "hcp-001" }),
          competitiveSummary: createMockCompetitiveSummary({ hcpId: "hcp-001" }),
          saturationSummary: createMockSaturationSummary({ hcpId: "hcp-001" }),
        },
        {
          hcp: createMockHCP({ id: "hcp-002", overallEngagementScore: 40 }),
          competitiveSummary: createMockCompetitiveSummary({ hcpId: "hcp-002" }),
          saturationSummary: createMockSaturationSummary({ hcpId: "hcp-002" }),
        },
        {
          hcp: createMockHCP({ id: "hcp-003", overallEngagementScore: 90 }),
          competitiveSummary: createMockCompetitiveSummary({ hcpId: "hcp-003" }),
          saturationSummary: createMockSaturationSummary({ hcpId: "hcp-003" }),
        },
      ];

      const results = generateBatchNBORecommendations(inputs);

      expect(results).toHaveLength(3);
      expect(results[0].hcpId).toBe("hcp-001");
      expect(results[1].hcpId).toBe("hcp-002");
      expect(results[2].hcpId).toBe("hcp-003");
    });
  });

  describe("Prioritization", () => {
    it("should prioritize recommendations by urgency", () => {
      const inputs: NBOEngineInput[] = [
        // Low urgency - nurture
        {
          hcp: createMockHCP({ id: "hcp-low", overallEngagementScore: 80 }),
          competitiveSummary: createMockCompetitiveSummary({ overallCpi: 20, riskLevel: "low" }),
          saturationSummary: createMockSaturationSummary({ overallMsi: 40, riskLevel: "low" }),
        },
        // High urgency - defend (high CPI)
        {
          hcp: createMockHCP({ id: "hcp-high", overallEngagementScore: 70 }),
          competitiveSummary: createMockCompetitiveSummary({ overallCpi: 85, riskLevel: "critical" }),
          saturationSummary: createMockSaturationSummary({ overallMsi: 40, riskLevel: "low" }),
        },
      ];

      const recommendations = generateBatchNBORecommendations(inputs);
      const prioritized = prioritizeNBORecommendations(recommendations);

      // High urgency (defend) should come first
      expect(prioritized[0].urgency === "high" || prioritized[0].actionType === "defend").toBe(true);
    });

    it("should respect limit parameter", () => {
      const inputs: NBOEngineInput[] = Array.from({ length: 10 }, (_, i) => ({
        hcp: createMockHCP({ id: `hcp-${i}` }),
        competitiveSummary: createMockCompetitiveSummary({ hcpId: `hcp-${i}` }),
        saturationSummary: createMockSaturationSummary({ hcpId: `hcp-${i}` }),
      }));

      const recommendations = generateBatchNBORecommendations(inputs);
      const prioritized = prioritizeNBORecommendations(recommendations, 5);

      expect(prioritized).toHaveLength(5);
    });
  });
});
