import { describe, it, expect } from "vitest";
import {
  generateNBA,
  generateNBAs,
  prioritizeNBAs,
  getNBASummary,
  type NextBestAction,
} from "../../server/services/nba-engine";
import type { HCPProfile, Channel, ChannelEngagement } from "@shared/schema";
import type { ChannelHealth, HealthStatus } from "../../server/services/channel-health";

// Helper to create mock channel engagement
function mockEngagement(
  channel: Channel,
  overrides: Partial<ChannelEngagement> = {}
): ChannelEngagement {
  return {
    channel,
    score: 50,
    lastContact: new Date().toISOString(),
    totalTouches: 5,
    responseRate: 40,
    ...overrides,
  };
}

// Helper to create mock HCP
function mockHcp(overrides: Partial<HCPProfile> = {}): HCPProfile {
  const channels: Channel[] = ["email", "rep_visit", "webinar", "conference", "digital_ad", "phone"];
  return {
    id: "test-hcp-1",
    npi: "1234567890",
    firstName: "Test",
    lastName: "Doctor",
    specialty: "Oncology",
    organization: "Test Hospital",
    city: "Boston",
    state: "MA",
    tier: "Tier 1",
    segment: "Early Adopter",
    channelPreference: "email",
    overallEngagementScore: 70,
    monthlyRxVolume: 100,
    marketSharePct: 25,
    conversionLikelihood: 60,
    channelEngagements: channels.map((channel) => mockEngagement(channel)),
    prescribingTrend: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Helper to create mock channel health
function mockChannelHealth(
  channel: Channel,
  status: HealthStatus,
  overrides: Partial<ChannelHealth> = {}
): ChannelHealth {
  return {
    channel,
    status,
    score: 50,
    lastContactDays: 10,
    totalTouches: 5,
    responseRate: 40,
    reasoning: "Test reasoning",
    ...overrides,
  };
}

describe("NBA Engine", () => {
  describe("generateNBA", () => {
    it("should recommend expanding on opportunity channels", () => {
      const hcp = mockHcp();
      const channelHealth: ChannelHealth[] = [
        mockChannelHealth("email", "opportunity", { score: 85, totalTouches: 2 }),
        mockChannelHealth("rep_visit", "active", { score: 60 }),
        mockChannelHealth("webinar", "dark"),
        mockChannelHealth("conference", "dark"),
        mockChannelHealth("digital_ad", "dark"),
        mockChannelHealth("phone", "dark"),
      ];

      const nba = generateNBA(hcp, channelHealth);

      expect(nba.recommendedChannel).toBe("email");
      expect(nba.actionType).toBe("expand");
      expect(nba.urgency).toBe("high");
      expect(nba.reasoning).toContain("growth potential");
    });

    it("should recommend re-engagement for declining channels", () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 90);

      const hcp = mockHcp({
        channelEngagements: [
          mockEngagement("email", { lastContact: staleDate.toISOString(), responseRate: 20 }),
          ...["rep_visit", "webinar", "conference", "digital_ad", "phone"].map((c) =>
            mockEngagement(c as Channel, { totalTouches: 0 })
          ),
        ],
      });

      const channelHealth: ChannelHealth[] = [
        mockChannelHealth("email", "declining", { lastContactDays: 90, responseRate: 20 }),
        mockChannelHealth("rep_visit", "dark"),
        mockChannelHealth("webinar", "dark"),
        mockChannelHealth("conference", "dark"),
        mockChannelHealth("digital_ad", "dark"),
        mockChannelHealth("phone", "dark"),
      ];

      const nba = generateNBA(hcp, channelHealth);

      expect(nba.actionType).toBe("re_engage");
      expect(nba.urgency).toBe("high");
      expect(nba.reasoning).toContain("No contact in");
    });

    it("should recommend maintaining active channels", () => {
      const hcp = mockHcp();
      const channelHealth: ChannelHealth[] = [
        mockChannelHealth("email", "active", { score: 75, responseRate: 55, lastContactDays: 20 }),
        mockChannelHealth("rep_visit", "dark"),
        mockChannelHealth("webinar", "dark"),
        mockChannelHealth("conference", "dark"),
        mockChannelHealth("digital_ad", "dark"),
        mockChannelHealth("phone", "dark"),
      ];

      const nba = generateNBA(hcp, channelHealth);

      expect(nba.recommendedChannel).toBe("email");
      expect(nba.actionType).toBe("maintain");
      expect(nba.urgency).toBe("low");
    });

    it("should recommend follow-up for recently contacted active channels", () => {
      const hcp = mockHcp();
      const channelHealth: ChannelHealth[] = [
        mockChannelHealth("email", "active", { score: 75, responseRate: 55, lastContactDays: 5 }),
        mockChannelHealth("rep_visit", "dark"),
        mockChannelHealth("webinar", "dark"),
        mockChannelHealth("conference", "dark"),
        mockChannelHealth("digital_ad", "dark"),
        mockChannelHealth("phone", "dark"),
      ];

      const nba = generateNBA(hcp, channelHealth);

      expect(nba.actionType).toBe("follow_up");
      expect(nba.reasoning).toContain("Recent engagement");
    });

    it("should find alternative channels when primary is blocked", () => {
      const hcp = mockHcp({ channelPreference: "email" });
      const channelHealth: ChannelHealth[] = [
        mockChannelHealth("email", "blocked", { score: 20, responseRate: 3, totalTouches: 15 }),
        mockChannelHealth("rep_visit", "active", { score: 70, responseRate: 50 }),
        mockChannelHealth("webinar", "dark"),
        mockChannelHealth("conference", "dark"),
        mockChannelHealth("digital_ad", "dark"),
        mockChannelHealth("phone", "dark"),
      ];

      const nba = generateNBA(hcp, channelHealth);

      expect(nba.recommendedChannel).toBe("rep_visit");
      expect(nba.reasoning).toContain("blocked");
    });

    it("should boost confidence for preferred channel", () => {
      const hcp = mockHcp({ channelPreference: "webinar" });
      const channelHealth: ChannelHealth[] = [
        mockChannelHealth("email", "dark"),
        mockChannelHealth("rep_visit", "dark"),
        mockChannelHealth("webinar", "opportunity", { score: 75, totalTouches: 1 }),
        mockChannelHealth("conference", "dark"),
        mockChannelHealth("digital_ad", "dark"),
        mockChannelHealth("phone", "dark"),
      ];

      const nba = generateNBA(hcp, channelHealth);

      expect(nba.recommendedChannel).toBe("webinar");
      expect(nba.reasoning).toContain("channel preference");
      expect(nba.confidence).toBeGreaterThan(80); // Boosted for preference
    });

    it("should return all required NBA fields", () => {
      const hcp = mockHcp();
      const nba = generateNBA(hcp);

      expect(nba.hcpId).toBe(hcp.id);
      expect(nba.hcpName).toBe(`${hcp.firstName} ${hcp.lastName}`);
      expect(nba.recommendedChannel).toBeDefined();
      expect(nba.actionType).toBeDefined();
      expect(nba.confidence).toBeGreaterThan(0);
      expect(nba.confidence).toBeLessThanOrEqual(100);
      expect(nba.reasoning).toBeDefined();
      expect(nba.urgency).toMatch(/^(high|medium|low)$/);
      expect(nba.suggestedTiming).toBeDefined();
      expect(nba.metrics).toBeDefined();
    });
  });

  describe("generateNBAs", () => {
    it("should generate NBAs for multiple HCPs", () => {
      const hcps = [mockHcp({ id: "hcp-1" }), mockHcp({ id: "hcp-2" }), mockHcp({ id: "hcp-3" })];

      const nbas = generateNBAs(hcps);

      expect(nbas.length).toBe(3);
      expect(nbas[0].hcpId).toBe("hcp-1");
      expect(nbas[1].hcpId).toBe("hcp-2");
      expect(nbas[2].hcpId).toBe("hcp-3");
    });

    it("should handle empty array", () => {
      const nbas = generateNBAs([]);
      expect(nbas).toEqual([]);
    });
  });

  describe("prioritizeNBAs", () => {
    it("should sort by urgency then confidence", () => {
      const nbas: NextBestAction[] = [
        {
          hcpId: "1",
          hcpName: "Dr. A",
          recommendedChannel: "email",
          actionType: "maintain",
          confidence: 90,
          reasoning: "",
          urgency: "low",
          suggestedTiming: "",
          channelHealth: "active",
          metrics: { channelScore: 80, responseRate: 50, lastContactDays: 5 },
        },
        {
          hcpId: "2",
          hcpName: "Dr. B",
          recommendedChannel: "email",
          actionType: "re_engage",
          confidence: 70,
          reasoning: "",
          urgency: "high",
          suggestedTiming: "",
          channelHealth: "declining",
          metrics: { channelScore: 40, responseRate: 15, lastContactDays: 90 },
        },
        {
          hcpId: "3",
          hcpName: "Dr. C",
          recommendedChannel: "webinar",
          actionType: "expand",
          confidence: 85,
          reasoning: "",
          urgency: "high",
          suggestedTiming: "",
          channelHealth: "opportunity",
          metrics: { channelScore: 75, responseRate: 80, lastContactDays: 30 },
        },
      ];

      const prioritized = prioritizeNBAs(nbas);

      // High urgency should come first
      expect(prioritized[0].urgency).toBe("high");
      expect(prioritized[1].urgency).toBe("high");
      expect(prioritized[2].urgency).toBe("low");

      // Among high urgency, higher confidence first
      expect(prioritized[0].hcpId).toBe("3"); // 85 confidence
      expect(prioritized[1].hcpId).toBe("2"); // 70 confidence
    });

    it("should respect limit parameter", () => {
      const nbas: NextBestAction[] = Array.from({ length: 10 }, (_, i) => ({
        hcpId: `${i}`,
        hcpName: `Dr. ${i}`,
        recommendedChannel: "email" as Channel,
        actionType: "maintain" as const,
        confidence: 50 + i,
        reasoning: "",
        urgency: "medium" as const,
        suggestedTiming: "",
        channelHealth: "active" as const,
        metrics: { channelScore: 50, responseRate: 40, lastContactDays: 10 },
      }));

      const prioritized = prioritizeNBAs(nbas, 5);

      expect(prioritized.length).toBe(5);
    });
  });

  describe("getNBASummary", () => {
    it("should calculate correct summary statistics", () => {
      const nbas: NextBestAction[] = [
        {
          hcpId: "1",
          hcpName: "Dr. A",
          recommendedChannel: "email",
          actionType: "expand",
          confidence: 80,
          reasoning: "",
          urgency: "high",
          suggestedTiming: "",
          channelHealth: "opportunity",
          metrics: { channelScore: 80, responseRate: 50, lastContactDays: 5 },
        },
        {
          hcpId: "2",
          hcpName: "Dr. B",
          recommendedChannel: "email",
          actionType: "re_engage",
          confidence: 70,
          reasoning: "",
          urgency: "high",
          suggestedTiming: "",
          channelHealth: "declining",
          metrics: { channelScore: 40, responseRate: 15, lastContactDays: 90 },
        },
        {
          hcpId: "3",
          hcpName: "Dr. C",
          recommendedChannel: "webinar",
          actionType: "maintain",
          confidence: 90,
          reasoning: "",
          urgency: "low",
          suggestedTiming: "",
          channelHealth: "active",
          metrics: { channelScore: 75, responseRate: 55, lastContactDays: 10 },
        },
      ];

      const summary = getNBASummary(nbas);

      expect(summary.totalActions).toBe(3);
      expect(summary.byUrgency.high).toBe(2);
      expect(summary.byUrgency.low).toBe(1);
      expect(summary.byChannel.email).toBe(2);
      expect(summary.byChannel.webinar).toBe(1);
      expect(summary.avgConfidence).toBe(80); // (80 + 70 + 90) / 3 = 80
    });

    it("should handle empty array", () => {
      const summary = getNBASummary([]);

      expect(summary.totalActions).toBe(0);
      expect(summary.avgConfidence).toBe(0);
    });
  });
});
