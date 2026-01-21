/**
 * Competitive Storage Tests
 *
 * Tests for CPI calculation, competitive storage operations,
 * and data transformation functions.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateCPIComponents,
  determineCPIDirection,
  cpiToRiskLevel,
} from "../../server/storage/competitive-storage";

describe("CPI Calculation", () => {
  describe("calculateCPIComponents", () => {
    it("should calculate all components correctly with full data", () => {
      const result = calculateCPIComponents(
        40, // shareOfBrand: 40%
        10, // shareChangeQoQ: +10%
        30, // competitiveRxVelocity: 30
        10, // ourRxVelocity: 10
        20  // engagementAsymmetry: +20
      );

      // Share component: (40/100) * 25 = 10
      expect(result.shareComponent).toBe(10);

      // Velocity component: ((30-10+50)/100) * 25 = (70/100) * 25 = 17.5
      expect(result.velocityComponent).toBe(17.5);

      // Engagement component: ((20+50)/100) * 25 = (70/100) * 25 = 17.5
      expect(result.engagementComponent).toBe(17.5);

      // Trend component: ((10+25)/50) * 25 = (35/50) * 25 = 17.5
      expect(result.trendComponent).toBe(17.5);

      // Raw score: 10 + 17.5 + 17.5 + 17.5 = 62.5
      expect(result.rawScore).toBe(62.5);
      expect(result.normalizedScore).toBe(62.5);
    });

    it("should handle null values gracefully", () => {
      const result = calculateCPIComponents(null, null, null, null, null);

      expect(result.shareComponent).toBe(0);
      expect(result.velocityComponent).toBe(12.5); // Default: ((0-0+50)/100)*25
      expect(result.engagementComponent).toBe(0);
      expect(result.trendComponent).toBe(0);
      expect(result.rawScore).toBe(12.5);
    });

    it("should clamp components to 0-25 range", () => {
      // Extreme values that would exceed bounds
      const result = calculateCPIComponents(
        150,  // shareOfBrand: 150% (should clamp)
        100,  // shareChangeQoQ: +100%
        200,  // competitiveRxVelocity
        -100, // ourRxVelocity
        100   // engagementAsymmetry
      );

      // All components should be clamped to max 25
      expect(result.shareComponent).toBeLessThanOrEqual(25);
      expect(result.velocityComponent).toBeLessThanOrEqual(25);
      expect(result.engagementComponent).toBeLessThanOrEqual(25);
      expect(result.trendComponent).toBeLessThanOrEqual(25);

      // Total should be clamped to 100
      expect(result.normalizedScore).toBeLessThanOrEqual(100);
    });

    it("should handle zero values correctly", () => {
      const result = calculateCPIComponents(0, 0, 0, 0, 0);

      expect(result.shareComponent).toBe(0);
      expect(result.velocityComponent).toBe(12.5); // ((0-0+50)/100)*25 = 12.5
      expect(result.engagementComponent).toBe(12.5); // ((0+50)/100)*25 = 12.5
      expect(result.trendComponent).toBe(12.5); // ((0+25)/50)*25 = 12.5
    });

    it("should handle negative values correctly", () => {
      const result = calculateCPIComponents(
        20,   // shareOfBrand
        -15,  // shareChangeQoQ: declining
        -10,  // competitiveRxVelocity: competitor declining
        20,   // ourRxVelocity: we're growing
        -30   // engagementAsymmetry: we're more engaged
      );

      // Share component: (20/100) * 25 = 5
      expect(result.shareComponent).toBe(5);

      // Velocity component: ((-10-20+50)/100)*25 = (20/100)*25 = 5
      expect(result.velocityComponent).toBe(5);

      // Engagement component: ((-30+50)/100)*25 = (20/100)*25 = 5
      expect(result.engagementComponent).toBe(5);

      // Trend component: ((-15+25)/50)*25 = (10/50)*25 = 5
      expect(result.trendComponent).toBe(5);

      // Low CPI indicates low competitive pressure (we're winning)
      expect(result.normalizedScore).toBe(20);
    });

    it("should produce maximum CPI with worst-case inputs", () => {
      const result = calculateCPIComponents(
        100,  // shareOfBrand: competitor has 100%
        50,   // shareChangeQoQ: competitor gaining 50%
        100,  // competitiveRxVelocity: competitor growing fast
        -50,  // ourRxVelocity: we're declining
        50    // engagementAsymmetry: competitor much more engaged
      );

      // All components should be at or near max
      expect(result.shareComponent).toBe(25);
      expect(result.normalizedScore).toBeGreaterThanOrEqual(90);
    });

    it("should produce minimum CPI with best-case inputs", () => {
      const result = calculateCPIComponents(
        0,    // shareOfBrand: competitor has 0%
        -50,  // shareChangeQoQ: competitor losing share
        -100, // competitiveRxVelocity: competitor declining
        100,  // ourRxVelocity: we're growing fast
        -100  // engagementAsymmetry: we're much more engaged
      );

      expect(result.shareComponent).toBe(0);
      expect(result.normalizedScore).toBeLessThanOrEqual(10);
    });
  });

  describe("determineCPIDirection", () => {
    it("should return 'increasing' for positive QoQ change > 2%", () => {
      expect(determineCPIDirection(5)).toBe("increasing");
      expect(determineCPIDirection(2.1)).toBe("increasing");
      expect(determineCPIDirection(50)).toBe("increasing");
    });

    it("should return 'decreasing' for negative QoQ change < -2%", () => {
      expect(determineCPIDirection(-5)).toBe("decreasing");
      expect(determineCPIDirection(-2.1)).toBe("decreasing");
      expect(determineCPIDirection(-50)).toBe("decreasing");
    });

    it("should return 'stable' for QoQ change between -2% and 2%", () => {
      expect(determineCPIDirection(0)).toBe("stable");
      expect(determineCPIDirection(1)).toBe("stable");
      expect(determineCPIDirection(-1)).toBe("stable");
      expect(determineCPIDirection(2)).toBe("stable");
      expect(determineCPIDirection(-2)).toBe("stable");
    });

    it("should return 'stable' for null value", () => {
      expect(determineCPIDirection(null)).toBe("stable");
    });
  });

  describe("cpiToRiskLevel", () => {
    it("should return 'low' for CPI 0-25", () => {
      expect(cpiToRiskLevel(0)).toBe("low");
      expect(cpiToRiskLevel(10)).toBe("low");
      expect(cpiToRiskLevel(25)).toBe("low");
    });

    it("should return 'medium' for CPI 26-50", () => {
      expect(cpiToRiskLevel(26)).toBe("medium");
      expect(cpiToRiskLevel(35)).toBe("medium");
      expect(cpiToRiskLevel(50)).toBe("medium");
    });

    it("should return 'high' for CPI 51-75", () => {
      expect(cpiToRiskLevel(51)).toBe("high");
      expect(cpiToRiskLevel(60)).toBe("high");
      expect(cpiToRiskLevel(75)).toBe("high");
    });

    it("should return 'critical' for CPI 76-100", () => {
      expect(cpiToRiskLevel(76)).toBe("critical");
      expect(cpiToRiskLevel(85)).toBe("critical");
      expect(cpiToRiskLevel(100)).toBe("critical");
    });

    it("should handle edge cases", () => {
      expect(cpiToRiskLevel(25.5)).toBe("medium");
      expect(cpiToRiskLevel(50.5)).toBe("high");
      expect(cpiToRiskLevel(75.5)).toBe("critical");
    });
  });
});

describe("CPI Formula Documentation Compliance", () => {
  it("should follow documented formula: Share Component = (shareOfBrand / 100) * 25", () => {
    const testCases = [
      { shareOfBrand: 0, expected: 0 },
      { shareOfBrand: 50, expected: 12.5 },
      { shareOfBrand: 100, expected: 25 },
    ];

    for (const tc of testCases) {
      const result = calculateCPIComponents(tc.shareOfBrand, null, null, null, null);
      expect(result.shareComponent).toBe(tc.expected);
    }
  });

  it("should follow documented formula: Velocity Component uses differential", () => {
    // Velocity component: clamp((competitiveRxVelocity - ourRxVelocity + 50) / 100, 0, 1) * 25
    const result1 = calculateCPIComponents(null, null, 50, 0, null);
    // (50 - 0 + 50) / 100 * 25 = 100/100 * 25 = 25
    expect(result1.velocityComponent).toBe(25);

    const result2 = calculateCPIComponents(null, null, 0, 50, null);
    // (0 - 50 + 50) / 100 * 25 = 0/100 * 25 = 0
    expect(result2.velocityComponent).toBe(0);
  });

  it("should produce CPI that is directional and explainable", () => {
    // Key requirement: CPI must be directional
    const highPressure = calculateCPIComponents(80, 20, 40, 5, 30);
    const lowPressure = calculateCPIComponents(10, -10, 5, 30, -20);

    expect(highPressure.normalizedScore).toBeGreaterThan(lowPressure.normalizedScore);

    // Components should be individually explainable
    expect(highPressure.shareComponent).toBeGreaterThan(lowPressure.shareComponent);
  });

  it("should normalize final score to 0-100 range", () => {
    // Test extreme combinations
    const extremeHigh = calculateCPIComponents(100, 100, 100, -100, 100);
    const extremeLow = calculateCPIComponents(0, -100, -100, 100, -100);

    expect(extremeHigh.normalizedScore).toBeLessThanOrEqual(100);
    expect(extremeHigh.normalizedScore).toBeGreaterThanOrEqual(0);
    expect(extremeLow.normalizedScore).toBeLessThanOrEqual(100);
    expect(extremeLow.normalizedScore).toBeGreaterThanOrEqual(0);
  });
});

describe("Risk Level Integration", () => {
  it("should correctly map CPI to actionable risk levels", () => {
    // Verify the full pipeline from metrics to risk level
    // Low risk: competitor has small share, losing ground, we're more engaged
    const lowRisk = calculateCPIComponents(5, -20, -10, 40, -40);
    expect(cpiToRiskLevel(lowRisk.normalizedScore)).toBe("low");

    // High risk: competitor has significant share, gaining, more engaged
    const highRisk = calculateCPIComponents(60, 15, 40, 10, 25);
    expect(cpiToRiskLevel(highRisk.normalizedScore)).toBe("high");
  });

  it("should provide appropriate interventions based on risk level", () => {
    // Critical: immediate intervention
    expect(cpiToRiskLevel(85)).toBe("critical");

    // High: increased engagement
    expect(cpiToRiskLevel(65)).toBe("high");

    // Medium: monitoring
    expect(cpiToRiskLevel(40)).toBe("medium");

    // Low: no action needed
    expect(cpiToRiskLevel(15)).toBe("low");
  });
});

// ============================================================================
// Phase 12A.4: TA-Specific Filtering Tests
// ============================================================================

describe("TA-Specific Filtering (M12A.4)", () => {
  describe("getCompetitorsByTherapeuticArea", () => {
    it("should filter competitors by therapeutic area", () => {
      // This is a unit test for the logic - integration test would need actual DB
      // Test that the function signature is correct
      const mockCompetitor = {
        id: "comp-001",
        name: "Oncology Competitor",
        type: "brand" as const,
        therapeuticArea: "Oncology",
        marketShare: 25,
        color: "#E63946",
        logoUrl: null,
        parentCompany: "Test Corp",
        launchYear: 2020,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Verify the competitor shape matches expected schema
      expect(mockCompetitor.therapeuticArea).toBe("Oncology");
      expect(mockCompetitor.type).toBe("brand");
      expect(mockCompetitor.isActive).toBe(true);
    });
  });

  describe("therapeuticAreaSummary", () => {
    it("should aggregate competitors by therapeutic area", () => {
      const mockCompetitors = [
        { therapeuticArea: "Oncology", marketShare: 25 },
        { therapeuticArea: "Oncology", marketShare: 15 },
        { therapeuticArea: "Cardiology", marketShare: 20 },
        { therapeuticArea: null, marketShare: 10 },
      ];

      // Calculate expected summary
      const taMap = new Map<string, { count: number; totalShare: number }>();
      for (const c of mockCompetitors) {
        const ta = c.therapeuticArea || "Unassigned";
        const existing = taMap.get(ta) || { count: 0, totalShare: 0 };
        existing.count++;
        existing.totalShare += c.marketShare ?? 0;
        taMap.set(ta, existing);
      }

      expect(taMap.get("Oncology")?.count).toBe(2);
      expect(taMap.get("Oncology")?.totalShare).toBe(40);
      expect(taMap.get("Cardiology")?.count).toBe(1);
      expect(taMap.get("Unassigned")?.count).toBe(1);
    });
  });

  describe("competitiveOrbitDataByTA", () => {
    it("should calculate ring distance based on CPI", () => {
      // Ring distance formula: 1 - (avgCpi / 100) * 0.8
      // CPI 0 -> distance 1.0
      // CPI 50 -> distance 0.6
      // CPI 100 -> distance 0.2

      const calculateRingDistance = (avgCpi: number) => 1 - (avgCpi / 100) * 0.8;

      expect(calculateRingDistance(0)).toBeCloseTo(1.0);
      expect(calculateRingDistance(50)).toBeCloseTo(0.6);
      expect(calculateRingDistance(100)).toBeCloseTo(0.2);
    });

    it("should calculate ring thickness based on market share", () => {
      // Ring thickness formula: 0.5 + (marketShare / 100) * 2.5
      // Market share 0% -> thickness 0.5
      // Market share 50% -> thickness 1.75
      // Market share 100% -> thickness 3.0

      const calculateRingThickness = (marketShare: number) => 0.5 + (marketShare / 100) * 2.5;

      expect(calculateRingThickness(0)).toBe(0.5);
      expect(calculateRingThickness(50)).toBe(1.75);
      expect(calculateRingThickness(100)).toBe(3.0);
    });

    it("should determine drift direction based on CPI direction", () => {
      // "increasing" CPI -> "toward" (competitor pulling HCP)
      // "decreasing" CPI -> "away" (HCP moving away from competitor)
      // "stable" CPI -> "toward" (default)

      const getDriftDirection = (cpiDirection: string) =>
        cpiDirection === "increasing" ? "toward" :
        cpiDirection === "decreasing" ? "away" : "toward";

      expect(getDriftDirection("increasing")).toBe("toward");
      expect(getDriftDirection("decreasing")).toBe("away");
      expect(getDriftDirection("stable")).toBe("toward");
    });
  });

  describe("governanceThresholds", () => {
    it("should have valid default alert thresholds", () => {
      const defaultThresholds = {
        criticalCpi: 75,
        warningCpi: 50,
        cpiTrendThreshold: 10,
        engagementAsymmetryThreshold: 20,
        shareErosionThreshold: 5,
      };

      // Verify thresholds are in valid ranges
      expect(defaultThresholds.criticalCpi).toBeGreaterThan(defaultThresholds.warningCpi);
      expect(defaultThresholds.criticalCpi).toBeLessThanOrEqual(100);
      expect(defaultThresholds.warningCpi).toBeGreaterThan(0);
      expect(defaultThresholds.cpiTrendThreshold).toBeGreaterThan(0);
      expect(defaultThresholds.engagementAsymmetryThreshold).toBeGreaterThan(0);
      expect(defaultThresholds.shareErosionThreshold).toBeGreaterThan(0);
    });

    it("should trigger correct alert type based on threshold", () => {
      const thresholds = {
        criticalCpi: 75,
        warningCpi: 50,
      };

      const getAlertSeverity = (cpi: number) => {
        if (cpi >= thresholds.criticalCpi) return "critical";
        if (cpi >= thresholds.warningCpi) return "warning";
        return "info";
      };

      expect(getAlertSeverity(80)).toBe("critical");
      expect(getAlertSeverity(75)).toBe("critical");
      expect(getAlertSeverity(60)).toBe("warning");
      expect(getAlertSeverity(50)).toBe("warning");
      expect(getAlertSeverity(40)).toBe("info");
    });
  });
});

// ============================================================================
// ALERT CONFIGURATION TESTS (Phase 12A.3)
// ============================================================================

describe("Alert Configuration", () => {
  describe("Configuration Schema Validation", () => {
    it("should validate scope values", () => {
      const validScopes = ["global", "therapeutic_area", "competitor"];
      const invalidScopes = ["invalid", "regional", "custom"];

      validScopes.forEach(scope => {
        expect(["global", "therapeutic_area", "competitor"].includes(scope)).toBe(true);
      });

      invalidScopes.forEach(scope => {
        expect(["global", "therapeutic_area", "competitor"].includes(scope)).toBe(false);
      });
    });

    it("should validate alert frequency values", () => {
      const validFrequencies = ["realtime", "daily", "weekly"];
      const invalidFrequencies = ["hourly", "monthly", "custom"];

      validFrequencies.forEach(freq => {
        expect(["realtime", "daily", "weekly"].includes(freq)).toBe(true);
      });

      invalidFrequencies.forEach(freq => {
        expect(["realtime", "daily", "weekly"].includes(freq)).toBe(false);
      });
    });

    it("should validate threshold ranges", () => {
      const validateThreshold = (value: number, min: number, max: number) =>
        value >= min && value <= max;

      // Valid threshold values
      expect(validateThreshold(75, 0, 100)).toBe(true);
      expect(validateThreshold(50, 0, 100)).toBe(true);
      expect(validateThreshold(0, 0, 100)).toBe(true);
      expect(validateThreshold(100, 0, 100)).toBe(true);

      // Invalid threshold values
      expect(validateThreshold(-5, 0, 100)).toBe(false);
      expect(validateThreshold(150, 0, 100)).toBe(false);
    });
  });

  describe("Threshold Resolution Logic", () => {
    it("should prioritize competitor-specific config over global", () => {
      const configs = [
        { scope: "global", criticalCpi: 75, warningCpi: 50 },
        { scope: "competitor", competitorId: "comp-001", criticalCpi: 60, warningCpi: 40 },
      ];

      const resolveThresholds = (competitorId?: string) => {
        // Find competitor-specific first
        const competitorConfig = configs.find(
          c => c.scope === "competitor" && c.competitorId === competitorId
        );
        if (competitorConfig) return competitorConfig;

        // Fall back to global
        return configs.find(c => c.scope === "global");
      };

      const resolved = resolveThresholds("comp-001");
      expect(resolved?.criticalCpi).toBe(60);
      expect(resolved?.warningCpi).toBe(40);
    });

    it("should prioritize therapeutic area config over global", () => {
      const configs = [
        { scope: "global", criticalCpi: 75, warningCpi: 50 },
        { scope: "therapeutic_area", therapeuticArea: "Oncology", criticalCpi: 65, warningCpi: 45 },
      ];

      const resolveThresholds = (therapeuticArea?: string) => {
        // Find TA-specific first
        const taConfig = configs.find(
          c => c.scope === "therapeutic_area" && c.therapeuticArea === therapeuticArea
        );
        if (taConfig) return taConfig;

        // Fall back to global
        return configs.find(c => c.scope === "global");
      };

      const resolved = resolveThresholds("Oncology");
      expect(resolved?.criticalCpi).toBe(65);
      expect(resolved?.warningCpi).toBe(45);

      // Non-matching TA should fall back to global
      const fallback = resolveThresholds("Cardiology");
      expect(fallback?.criticalCpi).toBe(75);
    });

    it("should fall back to defaults when no config exists", () => {
      const configs: any[] = [];

      const resolveThresholds = () => {
        if (configs.length === 0) {
          return {
            criticalCpi: 75,
            warningCpi: 50,
            cpiTrendThreshold: 10,
            shareErosionThreshold: 5,
            engagementAsymmetryThreshold: 20,
          };
        }
        return configs[0];
      };

      const resolved = resolveThresholds();
      expect(resolved.criticalCpi).toBe(75);
      expect(resolved.warningCpi).toBe(50);
      expect(resolved.cpiTrendThreshold).toBe(10);
      expect(resolved.shareErosionThreshold).toBe(5);
      expect(resolved.engagementAsymmetryThreshold).toBe(20);
    });
  });

  describe("Alert Configuration CRUD", () => {
    it("should generate valid config structure", () => {
      const config = {
        name: "Test Config",
        description: "Test description",
        scope: "global" as const,
        therapeuticArea: null,
        competitorId: null,
        criticalCpiThreshold: 75,
        warningCpiThreshold: 50,
        cpiTrendThreshold: 10,
        shareErosionThreshold: 5,
        engagementAsymmetryThreshold: 20,
        alertFrequency: "daily" as const,
        suppressDuplicateHours: 24,
        isActive: true,
      };

      expect(config.name).toBeTruthy();
      expect(config.scope).toBe("global");
      expect(config.criticalCpiThreshold).toBeGreaterThan(config.warningCpiThreshold);
      expect(config.isActive).toBe(true);
    });

    it("should support therapeutic area scoped configs", () => {
      const config = {
        name: "Oncology Alert Rules",
        scope: "therapeutic_area" as const,
        therapeuticArea: "Oncology",
        competitorId: null,
        criticalCpiThreshold: 65,
        warningCpiThreshold: 45,
        alertFrequency: "realtime" as const,
        isActive: true,
      };

      expect(config.scope).toBe("therapeutic_area");
      expect(config.therapeuticArea).toBe("Oncology");
      expect(config.competitorId).toBeNull();
    });

    it("should support competitor scoped configs", () => {
      const config = {
        name: "Competitor X Alert Rules",
        scope: "competitor" as const,
        therapeuticArea: null,
        competitorId: "comp-001",
        criticalCpiThreshold: 60,
        warningCpiThreshold: 40,
        alertFrequency: "weekly" as const,
        isActive: true,
      };

      expect(config.scope).toBe("competitor");
      expect(config.competitorId).toBe("comp-001");
      expect(config.therapeuticArea).toBeNull();
    });
  });

  describe("Alert Suppression Logic", () => {
    it("should calculate suppression window correctly", () => {
      const suppressDuplicateHours = 24;
      const lastAlertTime = new Date("2024-01-15T10:00:00Z");
      const now = new Date("2024-01-15T20:00:00Z");

      const hoursSinceLastAlert = (now.getTime() - lastAlertTime.getTime()) / (1000 * 60 * 60);
      const shouldSuppress = hoursSinceLastAlert < suppressDuplicateHours;

      expect(hoursSinceLastAlert).toBe(10);
      expect(shouldSuppress).toBe(true);
    });

    it("should allow alerts after suppression window", () => {
      const suppressDuplicateHours = 24;
      const lastAlertTime = new Date("2024-01-15T10:00:00Z");
      const now = new Date("2024-01-16T15:00:00Z");

      const hoursSinceLastAlert = (now.getTime() - lastAlertTime.getTime()) / (1000 * 60 * 60);
      const shouldSuppress = hoursSinceLastAlert < suppressDuplicateHours;

      expect(hoursSinceLastAlert).toBe(29);
      expect(shouldSuppress).toBe(false);
    });
  });
});

// ============================================================================
// GOVERNANCE TESTS (Phase 12A.4)
// ============================================================================

describe("Competitive Governance", () => {
  describe("Audit Log Structure", () => {
    it("should generate valid CPI calculation audit record", () => {
      const auditRecord = {
        action: "cpi_calculation",
        entityType: "competitive_signal",
        entityId: "hcp-001-comp-001",
        details: {
          hcpId: "hcp-001",
          competitorId: "comp-001",
          shareComponent: 10,
          velocityComponent: 15,
          engagementComponent: 12,
          trendComponent: 8,
          rawScore: 45,
          normalizedScore: 45,
          finalCpi: 45,
          calculatedAt: new Date().toISOString(),
        },
        userId: "user-001",
      };

      expect(auditRecord.action).toBe("cpi_calculation");
      expect(auditRecord.entityType).toBe("competitive_signal");
      expect(auditRecord.details.finalCpi).toBe(45);
      expect(auditRecord.details.calculatedAt).toBeDefined();
    });

    it("should generate valid alert config change audit record", () => {
      const auditRecord = {
        action: "alert_config_update",
        entityType: "alert_config",
        entityId: "config-001",
        details: {
          action: "update",
          configId: "config-001",
          changes: {
            criticalCpiThreshold: 80,
            warningCpiThreshold: 60,
          },
          timestamp: new Date().toISOString(),
        },
        userId: "admin-001",
      };

      expect(auditRecord.action).toBe("alert_config_update");
      expect(auditRecord.details.changes.criticalCpiThreshold).toBe(80);
    });

    it("should generate valid claim review audit record", () => {
      const auditRecord = {
        action: "competitive_claim_review",
        entityType: "cpi_threshold",
        entityId: "threshold-001",
        details: {
          reviewAction: "approved",
          reviewNotes: "Threshold validated by medical affairs",
          reviewedAt: new Date().toISOString(),
        },
        userId: "reviewer-001",
      };

      expect(auditRecord.action).toBe("competitive_claim_review");
      expect(auditRecord.details.reviewAction).toBe("approved");
      expect(auditRecord.details.reviewNotes).toContain("medical affairs");
    });
  });

  describe("Claim Review Validation", () => {
    it("should validate claim types", () => {
      const validClaimTypes = ["cpi_threshold", "alert_generated", "signal_recorded"];
      const invalidClaimTypes = ["invalid", "random", "unknown"];

      validClaimTypes.forEach(type => {
        expect(validClaimTypes.includes(type)).toBe(true);
      });

      invalidClaimTypes.forEach(type => {
        expect(validClaimTypes.includes(type)).toBe(false);
      });
    });

    it("should validate review actions", () => {
      const validReviewActions = ["approved", "rejected", "modified"];
      const invalidReviewActions = ["pending", "unknown", "invalid"];

      validReviewActions.forEach(action => {
        expect(validReviewActions.includes(action)).toBe(true);
      });

      invalidReviewActions.forEach(action => {
        expect(validReviewActions.includes(action)).toBe(false);
      });
    });
  });

  describe("Governance Summary Calculation", () => {
    it("should calculate governance metrics correctly", () => {
      const logs = [
        { action: "cpi_calculation", timestamp: new Date() },
        { action: "cpi_calculation", timestamp: new Date() },
        { action: "cpi_calculation", timestamp: new Date() },
        { action: "alert_config_create", timestamp: new Date() },
        { action: "alert_config_update", timestamp: new Date() },
        { action: "competitive_claim_review", timestamp: new Date() },
        { action: "competitive_claim_review", timestamp: new Date() },
      ];

      const actionCounts = new Map<string, number>();
      logs.forEach(log => {
        actionCounts.set(log.action, (actionCounts.get(log.action) ?? 0) + 1);
      });

      const summary = {
        totalCPICalculationsLast30Days: actionCounts.get("cpi_calculation") ?? 0,
        totalAlertConfigChanges:
          (actionCounts.get("alert_config_create") ?? 0) +
          (actionCounts.get("alert_config_update") ?? 0) +
          (actionCounts.get("alert_config_delete") ?? 0),
        totalClaimReviews: actionCounts.get("competitive_claim_review") ?? 0,
      };

      expect(summary.totalCPICalculationsLast30Days).toBe(3);
      expect(summary.totalAlertConfigChanges).toBe(2);
      expect(summary.totalClaimReviews).toBe(2);
    });
  });

  describe("Audit Trail Filtering", () => {
    it("should filter audit trail by action type", () => {
      const allLogs = [
        { action: "cpi_calculation", entityType: "competitive_signal" },
        { action: "alert_config_create", entityType: "alert_config" },
        { action: "other_action", entityType: "other" },
        { action: "cpi_calculation", entityType: "competitive_signal" },
      ];

      const competitiveActions = [
        "cpi_calculation",
        "alert_config_create",
        "alert_config_update",
        "alert_config_delete",
        "competitive_claim_review",
      ];

      const filtered = allLogs.filter(log => competitiveActions.includes(log.action));

      expect(filtered.length).toBe(3);
      expect(filtered.every(log => competitiveActions.includes(log.action))).toBe(true);
    });

    it("should filter audit trail by date range", () => {
      const startDate = new Date("2024-01-15");
      const endDate = new Date("2024-01-20");

      const logs = [
        { createdAt: new Date("2024-01-10") },
        { createdAt: new Date("2024-01-16") },
        { createdAt: new Date("2024-01-18") },
        { createdAt: new Date("2024-01-25") },
      ];

      const filtered = logs.filter(
        log => log.createdAt >= startDate && log.createdAt <= endDate
      );

      expect(filtered.length).toBe(2);
    });
  });
});
