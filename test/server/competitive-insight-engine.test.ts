/**
 * Competitive Insight Engine Tests
 *
 * Tests for alert generation, competitive flags, NBA adjustments,
 * and CSV export functionality.
 */
import { describe, it, expect } from "vitest";
import {
  CompetitiveInsightEngine,
  competitiveInsightEngine,
  competitiveSignalsToCSV,
  competitiveAlertsToCSV,
  competitiveFlags,
  type CompetitiveAlert,
} from "../../server/services/competitive-insight-engine";
import type { HcpCompetitiveSummary, HcpCompetitiveSignal } from "@shared/schema";

// ============================================================================
// MOCK DATA HELPERS
// ============================================================================

const createMockSignal = (overrides: Partial<HcpCompetitiveSignal> = {}): HcpCompetitiveSignal => ({
  id: "signal-001",
  hcpId: "hcp-001",
  competitorId: "comp-001",
  competitorName: "Competitor A",
  signalType: "share_shift",
  shareOfBrand: 35,
  shareChangeQoQ: 5,
  shareChangeMoM: 2,
  competitiveRxVelocity: 25,
  ourRxVelocity: 20,
  competitorEngagementScore: 70,
  engagementAsymmetry: 10,
  cpi: 55,
  cpiDirection: "stable",
  riskLevel: "medium",
  measurementDate: new Date().toISOString().split("T")[0],
  signalDate: new Date().toISOString().split("T")[0],
  dataSource: "synthetic",
  confidenceLevel: 0.85,
  createdAt: new Date(),
  ...overrides,
});

const createMockSummary = (overrides: Partial<HcpCompetitiveSummary> = {}): HcpCompetitiveSummary => ({
  hcpId: "hcp-001",
  hcpName: "Dr. Jane Smith",
  overallCpi: 55,
  topCompetitor: {
    id: "comp-001",
    name: "Competitor A",
    cpi: 60,
    color: "#ff0000",
  },
  competitorCount: 3,
  signals: [createMockSignal()],
  riskLevel: "medium",
  recommendedAction: "Monitor closely",
  ...overrides,
});

// ============================================================================
// ALERT GENERATION TESTS
// ============================================================================

describe("CompetitiveInsightEngine", () => {
  const engine = new CompetitiveInsightEngine();

  describe("generateAlertsForHcp", () => {
    it("should generate critical alert for high CPI", () => {
      const summary = createMockSummary({
        overallCpi: 80,
        signals: [createMockSignal({ cpi: 80, riskLevel: "critical" })],
      });

      const alerts = engine.generateAlertsForHcp(summary);

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(a => a.severity === "critical")).toBe(true);
      expect(alerts.some(a => a.alertType === "high_cpi_detected")).toBe(true);
    });

    it("should generate warning alert for moderate CPI", () => {
      const summary = createMockSummary({
        overallCpi: 60,
        signals: [createMockSignal({ cpi: 60, riskLevel: "high" })],
      });

      const alerts = engine.generateAlertsForHcp(summary);

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(a => a.severity === "warning")).toBe(true);
    });

    it("should generate defensive intervention alert for high CPI + declining engagement", () => {
      const summary = createMockSummary({
        overallCpi: 70,
        signals: [createMockSignal({ cpi: 70, riskLevel: "high" })],
      });

      const alerts = engine.generateAlertsForHcp(summary, "declining");

      expect(alerts.some(a => a.alertType === "defensive_intervention")).toBe(true);
      expect(alerts.find(a => a.alertType === "defensive_intervention")?.severity).toBe("critical");
    });

    it("should generate share erosion alert when share change exceeds threshold", () => {
      const summary = createMockSummary({
        overallCpi: 60,
        signals: [createMockSignal({ cpi: 60, shareChangeQoQ: 12 })],
      });

      const alerts = engine.generateAlertsForHcp(summary);

      expect(alerts.some(a => a.alertType === "share_erosion")).toBe(true);
    });

    it("should generate engagement asymmetry alert", () => {
      const summary = createMockSummary({
        signals: [createMockSignal({ engagementAsymmetry: 25, cpi: 45 })],
      });

      const alerts = engine.generateAlertsForHcp(summary);

      expect(alerts.some(a => a.alertType === "engagement_asymmetry")).toBe(true);
    });

    it("should generate trending alert for increasing CPI direction", () => {
      const summary = createMockSummary({
        overallCpi: 55,
        signals: [createMockSignal({ cpi: 55, cpiDirection: "increasing", shareChangeQoQ: 15 })],
      });

      const alerts = engine.generateAlertsForHcp(summary);

      expect(alerts.some(a => a.alertType === "cpi_trending_up")).toBe(true);
    });

    it("should generate opportunity alert for decreasing competitor pressure", () => {
      const summary = createMockSummary({
        overallCpi: 30,
        signals: [createMockSignal({ cpi: 30, cpiDirection: "decreasing", riskLevel: "low" })],
      });

      const alerts = engine.generateAlertsForHcp(summary);

      expect(alerts.some(a => a.alertType === "competitive_opportunity")).toBe(true);
    });

    it("should return empty alerts for no signals", () => {
      const summary = createMockSummary({
        signals: [],
      });

      const alerts = engine.generateAlertsForHcp(summary);

      expect(alerts).toEqual([]);
    });

    it("should sort alerts by severity (critical first)", () => {
      const summary = createMockSummary({
        overallCpi: 80,
        signals: [
          createMockSignal({ id: "s1", cpi: 80 }),
          createMockSignal({ id: "s2", competitorId: "comp-002", cpi: 30, cpiDirection: "decreasing" }),
        ],
      });

      const alerts = engine.generateAlertsForHcp(summary);

      if (alerts.length > 1) {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        for (let i = 1; i < alerts.length; i++) {
          expect(severityOrder[alerts[i - 1].severity]).toBeLessThanOrEqual(
            severityOrder[alerts[i].severity]
          );
        }
      }
    });
  });

  describe("getCompetitiveFlag", () => {
    it("should return defensive_intervention for high risk + declining engagement", () => {
      const summary = createMockSummary({
        riskLevel: "high",
      });

      const flag = engine.getCompetitiveFlag(summary, "declining");

      expect(flag.type).toBe("defensive_intervention");
      expect(flag.priority).toBe(1);
    });

    it("should return competitive_opportunity when competitor is weakening", () => {
      const summary = createMockSummary({
        riskLevel: "medium",
        signals: [createMockSignal({ cpiDirection: "decreasing", cpi: 30 })],
      });

      const flag = engine.getCompetitiveFlag(summary);

      expect(flag.type).toBe("competitive_opportunity");
    });

    it("should return watch for medium/high risk without declining engagement", () => {
      const summary = createMockSummary({
        riskLevel: "medium",
      });

      const flag = engine.getCompetitiveFlag(summary, "stable");

      expect(flag.type).toBe("watch");
    });

    it("should return low_risk for low risk level", () => {
      const summary = createMockSummary({
        riskLevel: "low",
        signals: [createMockSignal({ cpi: 20, riskLevel: "low" })],
      });

      const flag = engine.getCompetitiveFlag(summary, "stable");

      expect(flag.type).toBe("low_risk");
    });
  });

  describe("getNBACompetitiveAdjustment", () => {
    it("should return maximum urgency for critical risk", () => {
      const summary = createMockSummary({
        riskLevel: "critical",
        overallCpi: 85,
      });

      const adjustment = engine.getNBACompetitiveAdjustment(summary);

      expect(adjustment.urgencyBoost).toBe(1.0);
      expect(adjustment.confidenceAdjustment).toBe(15);
      expect(adjustment.recommendedAction).toBe("defensive_outreach");
      expect(adjustment.competitorContext).toContain("Critical");
    });

    it("should return high urgency for high risk", () => {
      const summary = createMockSummary({
        riskLevel: "high",
        overallCpi: 65,
      });

      const adjustment = engine.getNBACompetitiveAdjustment(summary);

      expect(adjustment.urgencyBoost).toBe(0.7);
      expect(adjustment.confidenceAdjustment).toBe(10);
      expect(adjustment.recommendedAction).toBe("proactive_engagement");
    });

    it("should return moderate urgency for medium risk", () => {
      const summary = createMockSummary({
        riskLevel: "medium",
        overallCpi: 45,
      });

      const adjustment = engine.getNBACompetitiveAdjustment(summary);

      expect(adjustment.urgencyBoost).toBe(0.3);
      expect(adjustment.confidenceAdjustment).toBe(5);
    });

    it("should return no adjustment for low risk", () => {
      const summary = createMockSummary({
        riskLevel: "low",
        overallCpi: 20,
      });

      const adjustment = engine.getNBACompetitiveAdjustment(summary);

      expect(adjustment.urgencyBoost).toBe(0);
      expect(adjustment.confidenceAdjustment).toBe(0);
    });

    it("should include competitor context when top competitor exists", () => {
      const summary = createMockSummary({
        riskLevel: "high",
        topCompetitor: {
          id: "comp-001",
          name: "Competitor X",
          cpi: 70,
          color: "#ff0000",
        },
      });

      const adjustment = engine.getNBACompetitiveAdjustment(summary);

      expect(adjustment.competitorContext).toContain("Competitor X");
    });
  });
});

// ============================================================================
// CSV EXPORT TESTS
// ============================================================================

describe("CSV Export Functions", () => {
  describe("competitiveSignalsToCSV", () => {
    it("should generate valid CSV with headers", () => {
      const signals = [createMockSignal()];
      const csv = competitiveSignalsToCSV(signals);

      expect(csv).toContain("HCP ID");
      expect(csv).toContain("Competitor ID");
      expect(csv).toContain("CPI");
      expect(csv).toContain("Risk Level");
    });

    it("should include signal data in CSV rows", () => {
      const signals = [
        createMockSignal({
          hcpId: "hcp-test-123",
          competitorId: "comp-test-456",
          cpi: 65,
        }),
      ];

      const csv = competitiveSignalsToCSV(signals);

      expect(csv).toContain("hcp-test-123");
      expect(csv).toContain("comp-test-456");
      expect(csv).toContain("65.00");
    });

    it("should handle empty signals array", () => {
      const csv = competitiveSignalsToCSV([]);

      // Should still have headers
      expect(csv).toContain("HCP ID");
      // But only one line (the header)
      expect(csv.split("\n").length).toBe(1);
    });

    it("should handle null values gracefully", () => {
      const signals = [
        createMockSignal({
          shareOfBrand: null,
          shareChangeQoQ: null,
          engagementAsymmetry: null,
        }),
      ];

      const csv = competitiveSignalsToCSV(signals);

      // Should not throw and should contain empty values
      expect(csv).toBeDefined();
    });
  });

  describe("competitiveAlertsToCSV", () => {
    it("should generate valid CSV with headers", () => {
      const alerts: CompetitiveAlert[] = [
        {
          id: "alert-001",
          hcpId: "hcp-001",
          hcpName: "Dr. Smith",
          competitorId: "comp-001",
          competitorName: "Competitor A",
          alertType: "high_cpi_detected",
          severity: "critical",
          cpi: 80,
          message: "High competitive pressure detected",
          recommendation: "Immediate action required",
          createdAt: new Date().toISOString(),
        },
      ];

      const csv = competitiveAlertsToCSV(alerts);

      expect(csv).toContain("Alert ID");
      expect(csv).toContain("Severity");
      expect(csv).toContain("Recommendation");
    });

    it("should properly escape messages with commas and quotes", () => {
      const alerts: CompetitiveAlert[] = [
        {
          id: "alert-001",
          hcpId: "hcp-001",
          competitorId: "comp-001",
          alertType: "high_cpi_detected",
          severity: "warning",
          cpi: 60,
          message: 'Message with "quotes" and, commas',
          recommendation: "Action, with comma",
          createdAt: new Date().toISOString(),
        },
      ];

      const csv = competitiveAlertsToCSV(alerts);

      // Quotes should be escaped as double quotes
      expect(csv).toContain('""quotes""');
    });

    it("should handle empty alerts array", () => {
      const csv = competitiveAlertsToCSV([]);

      expect(csv).toContain("Alert ID");
      expect(csv.split("\n").length).toBe(1);
    });
  });
});

// ============================================================================
// COMPETITIVE FLAGS TESTS
// ============================================================================

describe("Competitive Flags", () => {
  it("should have correct priority ordering", () => {
    expect(competitiveFlags.defensive_intervention.priority).toBe(1);
    expect(competitiveFlags.competitive_opportunity.priority).toBe(2);
    expect(competitiveFlags.watch.priority).toBe(3);
    expect(competitiveFlags.low_risk.priority).toBe(4);
  });

  it("should have all required properties", () => {
    Object.values(competitiveFlags).forEach(flag => {
      expect(flag).toHaveProperty("type");
      expect(flag).toHaveProperty("label");
      expect(flag).toHaveProperty("description");
      expect(flag).toHaveProperty("priority");
      expect(flag).toHaveProperty("color");
    });
  });

  it("should have valid color values", () => {
    Object.values(competitiveFlags).forEach(flag => {
      expect(flag.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});

// ============================================================================
// SINGLETON INSTANCE TESTS
// ============================================================================

describe("Singleton Instance", () => {
  it("should export a singleton instance", () => {
    expect(competitiveInsightEngine).toBeDefined();
    expect(competitiveInsightEngine).toBeInstanceOf(CompetitiveInsightEngine);
  });

  it("should work with default thresholds", () => {
    const summary = createMockSummary({
      overallCpi: 80,
      signals: [createMockSignal({ cpi: 80 })],
    });

    const alerts = competitiveInsightEngine.generateAlertsForHcp(summary);

    expect(alerts.length).toBeGreaterThan(0);
  });
});
