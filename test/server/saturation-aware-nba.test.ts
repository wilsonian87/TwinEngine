/**
 * Saturation-Aware NBA Service Tests
 *
 * Phase 12B.3: Tests for MSI-integrated NBA recommendations.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  generateSaturationWarning,
  generateHcpSaturationWarnings,
  calculateThemeModifier,
  calculateConfidenceAdjustment,
  simulateThemePause,
  calculateOptimalPauseDuration,
  generateSaturationAwareNBA,
  prioritizeSaturationAwareNBAs,
  getSaturationAwareNBASummary,
  getRecommendedThemes,
  isThemeBlocked,
} from "../../server/services/saturation-aware-nba";
import type { HCPProfile, MessageExposure, HcpMessageSaturationSummary, MessageTheme } from "@shared/schema";

// Mock HCP for testing
const mockHcp: HCPProfile = {
  id: "hcp-1",
  npiNumber: "1234567890",
  firstName: "John",
  lastName: "Doe",
  specialty: "Oncology",
  tier: "high_prescriber",
  channelPreference: "email",
  lastContactDate: new Date().toISOString(),
  emailEngagementScore: 75,
  callEngagementScore: 60,
  eventEngagementScore: 50,
  digitalEngagementScore: 65,
  totalTouchpoints: 25,
  preferredTime: "morning",
  organization: "Test Hospital",
  city: "New York",
  state: "NY",
  zipCode: "10001",
  marketRegion: "Northeast",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  channelEngagements: [
    { channel: "email", totalTouches: 15, responseRate: 65, lastContactDays: 5, affinityScore: 75 },
    { channel: "phone", totalTouches: 8, responseRate: 50, lastContactDays: 10, affinityScore: 60 },
    { channel: "rep_visit", totalTouches: 5, responseRate: 80, lastContactDays: 20, affinityScore: 70 },
    { channel: "webinar", totalTouches: 3, responseRate: 40, lastContactDays: 30, affinityScore: 50 },
    { channel: "conference", totalTouches: 2, responseRate: 60, lastContactDays: 60, affinityScore: 55 },
    { channel: "digital_ad", totalTouches: 10, responseRate: 25, lastContactDays: 2, affinityScore: 45 },
  ],
};

// Mock exposures for testing
function createMockExposure(overrides: Partial<MessageExposure>): MessageExposure {
  return {
    id: "exp-1",
    hcpId: "hcp-1",
    messageThemeId: "theme-1",
    themeName: "Test Theme",
    themeCategory: "efficacy",
    touchFrequency: 10,
    uniqueChannels: 2,
    channelDiversity: 0.5,
    avgTimeBetweenTouches: 7,
    engagementRate: 0.5,
    engagementDecay: 0,
    lastEngagementDate: new Date().toISOString(),
    msi: 50,
    msiDirection: "stable",
    msiComponents: {
      frequencyComponent: 20,
      diversityComponent: 10,
      decayComponent: 20,
      stageModifier: 1.0,
    },
    saturationRisk: "medium",
    adoptionStage: "consideration",
    measurementPeriod: "Q1-2026",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("Saturation Warning Generation", () => {
  describe("generateSaturationWarning", () => {
    it("should generate do_not_push warning for MSI >= 80", () => {
      const exposure = createMockExposure({ msi: 85, themeName: "Efficacy" });
      const warning = generateSaturationWarning(exposure);

      expect(warning.type).toBe("do_not_push");
      expect(warning.severity).toBe("critical");
      expect(warning.currentMsi).toBe(85);
      expect(warning.message).toContain("STOP");
      expect(warning.message).toContain("Efficacy");
    });

    it("should generate shift_to_alternative warning for MSI 65-79", () => {
      const exposure = createMockExposure({ msi: 70, themeName: "Safety" });
      const warning = generateSaturationWarning(exposure);

      expect(warning.type).toBe("shift_to_alternative");
      expect(warning.severity).toBe("warning");
      expect(warning.message).toContain("WARNING");
    });

    it("should generate approaching_saturation warning for MSI 50-64", () => {
      const exposure = createMockExposure({ msi: 55 });
      const warning = generateSaturationWarning(exposure);

      expect(warning.type).toBe("approaching_saturation");
      expect(warning.severity).toBe("warning");
      expect(warning.message).toContain("CAUTION");
    });

    it("should generate safe_to_reinforce for MSI 20-39", () => {
      const exposure = createMockExposure({ msi: 30 });
      const warning = generateSaturationWarning(exposure);

      expect(warning.type).toBe("safe_to_reinforce");
      expect(warning.severity).toBe("info");
      expect(warning.message).toContain("SAFE");
    });

    it("should generate underexposed for MSI < 20", () => {
      const exposure = createMockExposure({ msi: 15 });
      const warning = generateSaturationWarning(exposure);

      expect(warning.type).toBe("underexposed");
      expect(warning.severity).toBe("info");
      expect(warning.message).toContain("OPPORTUNITY");
    });

    it("should include alternative themes when shifting", () => {
      const saturatedExposure = createMockExposure({ msi: 75, messageThemeId: "theme-1" });
      const alternatives = [
        createMockExposure({ msi: 25, messageThemeId: "theme-2", themeName: "Alt 1" }),
        createMockExposure({ msi: 30, messageThemeId: "theme-3", themeName: "Alt 2" }),
      ];

      const warning = generateSaturationWarning(saturatedExposure, alternatives);

      expect(warning.alternativeThemes).toBeDefined();
      expect(warning.alternativeThemes?.length).toBe(2);
      expect(warning.alternativeThemes?.[0].msi).toBeLessThan(warning.alternativeThemes?.[1].msi);
    });
  });

  describe("generateHcpSaturationWarnings", () => {
    it("should generate warnings for all exposures", () => {
      const exposures = [
        createMockExposure({ msi: 85, messageThemeId: "t1" }),
        createMockExposure({ msi: 50, messageThemeId: "t2" }),
        createMockExposure({ msi: 20, messageThemeId: "t3" }),
      ];

      const warnings = generateHcpSaturationWarnings(exposures);

      expect(warnings.length).toBe(3);
      // Should be sorted by MSI descending
      expect(warnings[0].currentMsi).toBe(85);
      expect(warnings[2].currentMsi).toBe(20);
    });

    it("should skip exposures with null MSI", () => {
      const exposures = [
        createMockExposure({ msi: 85 }),
        createMockExposure({ msi: null }),
      ];

      const warnings = generateHcpSaturationWarnings(exposures);
      expect(warnings.length).toBe(1);
    });
  });
});

describe("Recommendation Modifiers", () => {
  describe("calculateThemeModifier", () => {
    it("should apply critical penalty for MSI >= 80", () => {
      const exposure = createMockExposure({ msi: 85 });
      const modifier = calculateThemeModifier(exposure);

      expect(modifier.scoreAdjustment).toBe(-50);
      expect(modifier.reason).toContain("critically saturated");
    });

    it("should apply high penalty for MSI 65-79", () => {
      const exposure = createMockExposure({ msi: 70 });
      const modifier = calculateThemeModifier(exposure);

      expect(modifier.scoreAdjustment).toBe(-30);
    });

    it("should apply moderate penalty for MSI 50-64", () => {
      const exposure = createMockExposure({ msi: 55 });
      const modifier = calculateThemeModifier(exposure);

      expect(modifier.scoreAdjustment).toBe(-15);
    });

    it("should apply no adjustment for optimal range", () => {
      const exposure = createMockExposure({ msi: 35 });
      const modifier = calculateThemeModifier(exposure);

      expect(modifier.scoreAdjustment).toBe(0);
    });

    it("should apply boost for underexposed themes", () => {
      const exposure = createMockExposure({ msi: 15 });
      const modifier = calculateThemeModifier(exposure);

      expect(modifier.scoreAdjustment).toBe(20);
      expect(modifier.reason).toContain("boosted");
    });
  });

  describe("calculateConfidenceAdjustment", () => {
    it("should reduce confidence for high average MSI", () => {
      const exposures = [
        createMockExposure({ msi: 75 }),
        createMockExposure({ msi: 80 }),
      ];

      const adjustment = calculateConfidenceAdjustment(exposures);
      expect(adjustment).toBe(-20);
    });

    it("should boost confidence for low average MSI", () => {
      const exposures = [
        createMockExposure({ msi: 15 }),
        createMockExposure({ msi: 20 }),
      ];

      const adjustment = calculateConfidenceAdjustment(exposures);
      expect(adjustment).toBe(10);
    });

    it("should return 0 for empty exposures", () => {
      const adjustment = calculateConfidenceAdjustment([]);
      expect(adjustment).toBe(0);
    });
  });
});

describe("Theme Simulation", () => {
  describe("simulateThemePause", () => {
    it("should project MSI decrease with pause", () => {
      const exposure = createMockExposure({ msi: 70, themeName: "Efficacy" });
      const result = simulateThemePause(exposure, 30);

      expect(result.currentMsi).toBe(70);
      expect(result.projectedMsi).toBeLessThan(70);
      expect(result.msiChange).toBeLessThan(0);
      expect(result.pauseDays).toBe(30);
    });

    it("should generate decay curve", () => {
      const exposure = createMockExposure({ msi: 80 });
      const result = simulateThemePause(exposure, 30);

      expect(result.decayCurve.length).toBeGreaterThan(0);
      expect(result.decayCurve[0].day).toBe(0);
      expect(result.decayCurve[0].projectedMsi).toBe(80);
      expect(result.decayCurve[result.decayCurve.length - 1].day).toBe(30);
    });

    it("should not project MSI below minimum", () => {
      const exposure = createMockExposure({ msi: 30 });
      const result = simulateThemePause(exposure, 365); // Long pause

      expect(result.projectedMsi).toBeGreaterThanOrEqual(5);
    });

    it("should detect risk level changes", () => {
      const exposure = createMockExposure({ msi: 80 });
      const result = simulateThemePause(exposure, 60);

      expect(result.riskLevelBefore).toBe("critical");
      expect(["high", "medium", "low"]).toContain(result.riskLevelAfter);
    });
  });

  describe("calculateOptimalPauseDuration", () => {
    it("should return 0 if already below target", () => {
      const days = calculateOptimalPauseDuration(30, 40);
      expect(days).toBe(0);
    });

    it("should calculate days to reach target", () => {
      const days = calculateOptimalPauseDuration(70, 40);
      expect(days).toBeGreaterThan(0);
      // (70 - 40) / 0.4 = 75 days
      expect(days).toBe(75);
    });
  });
});

describe("Saturation-Aware NBA Generation", () => {
  const mockSaturationSummary: HcpMessageSaturationSummary = {
    hcpId: "hcp-1",
    hcpName: "John Doe",
    overallMsi: 55,
    themesAtRisk: 2,
    totalThemes: 4,
    topSaturatedTheme: {
      id: "theme-1",
      name: "Efficacy",
      msi: 85,
      category: "efficacy",
    },
    exposures: [
      createMockExposure({ msi: 85, messageThemeId: "t1", themeName: "Efficacy" }),
      createMockExposure({ msi: 70, messageThemeId: "t2", themeName: "Safety" }),
      createMockExposure({ msi: 30, messageThemeId: "t3", themeName: "RWE" }),
      createMockExposure({ msi: 15, messageThemeId: "t4", themeName: "Value" }),
    ],
    riskLevel: "high",
    recommendedAction: "Reduce touch frequency",
  };

  describe("generateSaturationAwareNBA", () => {
    it("should generate NBA with saturation context", () => {
      const nba = generateSaturationAwareNBA(mockHcp, mockSaturationSummary);

      expect(nba.saturationContext).toBeDefined();
      expect(nba.saturationContext?.warnings.length).toBe(4);
      expect(nba.saturationContext?.blockedThemes.length).toBeGreaterThan(0);
      expect(nba.saturationContext?.suggestedThemes.length).toBeGreaterThan(0);
    });

    it("should include confidence adjustment", () => {
      const nba = generateSaturationAwareNBA(mockHcp, mockSaturationSummary);

      expect(nba.saturationContext?.confidenceAdjustment).not.toBe(0);
    });

    it("should enhance reasoning with saturation alert", () => {
      const nba = generateSaturationAwareNBA(mockHcp, mockSaturationSummary);

      expect(nba.reasoning).toContain("SATURATION");
    });

    it("should return base NBA if no saturation data", () => {
      const nba = generateSaturationAwareNBA(mockHcp, null);

      expect(nba.saturationContext).toBeUndefined();
    });
  });

  describe("prioritizeSaturationAwareNBAs", () => {
    it("should prioritize low saturation HCPs when configured", () => {
      const nbas = [
        generateSaturationAwareNBA(mockHcp, mockSaturationSummary),
        generateSaturationAwareNBA(
          { ...mockHcp, id: "hcp-2" },
          { ...mockSaturationSummary, riskLevel: "low", overallMsi: 20 }
        ),
      ];

      const prioritized = prioritizeSaturationAwareNBAs(nbas, undefined, true);

      // Low saturation HCP should come first
      expect(prioritized[0].hcpId).toBe("hcp-2");
    });
  });

  describe("getSaturationAwareNBASummary", () => {
    it("should aggregate saturation statistics", () => {
      const nbas = [
        generateSaturationAwareNBA(mockHcp, mockSaturationSummary),
        generateSaturationAwareNBA(
          { ...mockHcp, id: "hcp-2" },
          { ...mockSaturationSummary, riskLevel: "low" }
        ),
      ];

      const summary = getSaturationAwareNBASummary(nbas);

      expect(summary.totalActions).toBe(2);
      expect(summary.saturationSummary.hcpsWithSaturationData).toBe(2);
      expect(summary.saturationSummary.totalWarnings).toBeGreaterThan(0);
    });
  });
});

describe("Theme Recommendation Utilities", () => {
  const mockThemes: MessageTheme[] = [
    { id: "t1", name: "Efficacy", category: "efficacy", isActive: true, createdAt: "", updatedAt: "" },
    { id: "t2", name: "Safety", category: "safety", isActive: true, createdAt: "", updatedAt: "" },
    { id: "t3", name: "RWE", category: "rwe", isActive: true, createdAt: "", updatedAt: "" },
    { id: "t4", name: "Value", category: "cost_value", isActive: true, createdAt: "", updatedAt: "" },
    { id: "t5", name: "New Theme", category: "mechanism_of_action", isActive: true, createdAt: "", updatedAt: "" },
  ];

  const mockSummary: HcpMessageSaturationSummary = {
    hcpId: "hcp-1",
    overallMsi: 50,
    themesAtRisk: 2,
    totalThemes: 4,
    topSaturatedTheme: null,
    exposures: [
      createMockExposure({ msi: 85, messageThemeId: "t1" }),
      createMockExposure({ msi: 70, messageThemeId: "t2" }),
      createMockExposure({ msi: 30, messageThemeId: "t3" }),
      createMockExposure({ msi: 15, messageThemeId: "t4" }),
    ],
    riskLevel: "medium",
    recommendedAction: null,
  };

  describe("getRecommendedThemes", () => {
    it("should identify themes to avoid", () => {
      const result = getRecommendedThemes(mockSummary, mockThemes);

      expect(result.avoid.length).toBeGreaterThan(0);
      expect(result.avoid[0].theme.id).toBe("t1"); // Highest MSI
    });

    it("should identify recommended themes", () => {
      const result = getRecommendedThemes(mockSummary, mockThemes);

      expect(result.recommended.length).toBeGreaterThan(0);
      // Should include themes with low MSI and unexposed themes
    });

    it("should include unexposed themes as fresh opportunities", () => {
      const result = getRecommendedThemes(mockSummary, mockThemes);

      const unexposed = result.recommended.find((r) => r.theme.id === "t5");
      expect(unexposed).toBeDefined();
      expect(unexposed?.msi).toBe(0);
    });
  });

  describe("isThemeBlocked", () => {
    it("should return blocked for MSI >= 80", () => {
      const result = isThemeBlocked("t1", mockSummary);

      expect(result.blocked).toBe(true);
      expect(result.reason).toContain("critically saturated");
    });

    it("should return not blocked for low MSI", () => {
      const result = isThemeBlocked("t4", mockSummary);

      expect(result.blocked).toBe(false);
    });

    it("should return not blocked if no saturation data", () => {
      const result = isThemeBlocked("t1", null);

      expect(result.blocked).toBe(false);
    });

    it("should return not blocked for unexposed themes", () => {
      const result = isThemeBlocked("t5", mockSummary);

      expect(result.blocked).toBe(false);
    });
  });
});
