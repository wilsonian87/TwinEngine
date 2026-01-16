import { describe, it, expect } from "vitest";
import {
  classifyChannelHealth,
  classifyCohortChannelHealth,
  getHealthSummary,
  defaultThresholds,
  type HealthStatus,
} from "../../server/services/channel-health";
import type { HCPProfile, ChannelEngagement, Channel } from "@shared/schema";

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

// Helper to create mock HCP with channel engagements
function mockHcp(engagements: Partial<ChannelEngagement>[]): HCPProfile {
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
    channelEngagements: channels.map((channel, i) =>
      mockEngagement(channel, engagements[i] || {})
    ),
    prescribingTrend: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("Channel Health Classification", () => {
  describe("classifyChannelHealth", () => {
    it("should classify active channel correctly", () => {
      const hcp = mockHcp([
        {
          score: 75,
          lastContact: new Date().toISOString(),
          totalTouches: 10,
          responseRate: 45,
        },
      ]);

      const health = classifyChannelHealth(hcp);
      const emailHealth = health.find((h) => h.channel === "email");

      expect(emailHealth?.status).toBe("active");
      expect(emailHealth?.reasoning).toContain("Healthy engagement");
    });

    it("should classify blocked channel correctly", () => {
      const hcp = mockHcp([
        {
          score: 30,
          lastContact: new Date().toISOString(),
          totalTouches: 10,
          responseRate: 5, // Very low response despite many touches
        },
      ]);

      const health = classifyChannelHealth(hcp);
      const emailHealth = health.find((h) => h.channel === "email");

      expect(emailHealth?.status).toBe("blocked");
      expect(emailHealth?.reasoning).toContain("Low response rate");
    });

    it("should classify opportunity channel correctly", () => {
      const hcp = mockHcp([
        {
          score: 85, // High score
          lastContact: null,
          totalTouches: 1, // Very few touches
          responseRate: 100,
        },
      ]);

      const health = classifyChannelHealth(hcp);
      const emailHealth = health.find((h) => h.channel === "email");

      expect(emailHealth?.status).toBe("opportunity");
      expect(emailHealth?.reasoning).toContain("High affinity score");
    });

    it("should classify declining channel correctly (stale)", () => {
      // Create date 90 days ago
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 90);

      const hcp = mockHcp([
        {
          score: 50,
          lastContact: staleDate.toISOString(),
          totalTouches: 8,
          responseRate: 35,
        },
      ]);

      const health = classifyChannelHealth(hcp);
      const emailHealth = health.find((h) => h.channel === "email");

      expect(emailHealth?.status).toBe("declining");
      expect(emailHealth?.reasoning).toContain("No contact in");
    });

    it("should classify dark channel correctly", () => {
      const hcp = mockHcp([
        {
          score: 30,
          lastContact: null,
          totalTouches: 0,
          responseRate: 0,
        },
      ]);

      const health = classifyChannelHealth(hcp);
      const emailHealth = health.find((h) => h.channel === "email");

      expect(emailHealth?.status).toBe("dark");
      expect(emailHealth?.reasoning).toContain("No historical engagement");
    });

    it("should classify all 6 channels", () => {
      const hcp = mockHcp([]);
      const health = classifyChannelHealth(hcp);

      expect(health.length).toBe(6);
      const channels = health.map((h) => h.channel);
      expect(channels).toContain("email");
      expect(channels).toContain("rep_visit");
      expect(channels).toContain("webinar");
      expect(channels).toContain("conference");
      expect(channels).toContain("digital_ad");
      expect(channels).toContain("phone");
    });

    it("should respect custom thresholds", () => {
      const hcp = mockHcp([
        {
          score: 75,
          lastContact: new Date().toISOString(),
          totalTouches: 10,
          responseRate: 25, // Below default active threshold of 30
        },
      ]);

      // With default thresholds, this would be declining
      const defaultHealth = classifyChannelHealth(hcp);
      expect(defaultHealth[0].status).toBe("declining");

      // With custom thresholds allowing lower response rate
      const customHealth = classifyChannelHealth(hcp, {
        ...defaultThresholds,
        activeMinResponseRate: 20, // Lower threshold
      });
      expect(customHealth[0].status).toBe("active");
    });
  });

  describe("classifyCohortChannelHealth", () => {
    it("should return empty array for empty cohort", () => {
      const result = classifyCohortChannelHealth([]);
      expect(result).toEqual([]);
    });

    it("should aggregate health across multiple HCPs", () => {
      const hcps = [
        mockHcp([{ responseRate: 45, totalTouches: 5 }]), // Active
        mockHcp([{ responseRate: 5, totalTouches: 10 }]), // Blocked
        mockHcp([{ score: 85, totalTouches: 1 }]), // Opportunity
      ];

      const result = classifyCohortChannelHealth(hcps);
      const emailHealth = result.find((r) => r.channel === "email");

      expect(emailHealth).toBeDefined();
      expect(emailHealth?.totalHcps).toBe(3);
      // Distribution should show different statuses
      const totalPct = Object.values(emailHealth!.distribution).reduce((a, b) => a + b, 0);
      expect(totalPct).toBeGreaterThanOrEqual(98); // Allow for rounding
      expect(totalPct).toBeLessThanOrEqual(102);
    });

    it("should identify primary issue when present", () => {
      // All HCPs have blocked email channel
      const hcps = [
        mockHcp([{ responseRate: 5, totalTouches: 10 }]),
        mockHcp([{ responseRate: 3, totalTouches: 12 }]),
        mockHcp([{ responseRate: 8, totalTouches: 8 }]),
      ];

      const result = classifyCohortChannelHealth(hcps);
      const emailHealth = result.find((r) => r.channel === "email");

      expect(emailHealth?.primaryIssue).toBe("blocked");
      expect(emailHealth?.recommendation).toContain("blocked");
    });

    it("should provide recommendation for opportunities", () => {
      // All HCPs have opportunity on email
      const hcps = [
        mockHcp([{ score: 90, totalTouches: 1, responseRate: 100 }]),
        mockHcp([{ score: 85, totalTouches: 2, responseRate: 100 }]),
        mockHcp([{ score: 80, totalTouches: 1, responseRate: 100 }]),
      ];

      const result = classifyCohortChannelHealth(hcps);
      const emailHealth = result.find((r) => r.channel === "email");

      expect(emailHealth?.distribution.opportunity).toBe(100);
      expect(emailHealth?.recommendation).toContain("opportunity");
    });

    it("should recognize healthy channels", () => {
      // All HCPs have active email channel
      const hcps = [
        mockHcp([{ responseRate: 50, totalTouches: 10, lastContact: new Date().toISOString() }]),
        mockHcp([{ responseRate: 45, totalTouches: 8, lastContact: new Date().toISOString() }]),
        mockHcp([{ responseRate: 55, totalTouches: 12, lastContact: new Date().toISOString() }]),
      ];

      const result = classifyCohortChannelHealth(hcps);
      const emailHealth = result.find((r) => r.channel === "email");

      expect(emailHealth?.distribution.active).toBe(100);
      expect(emailHealth?.recommendation).toContain("healthy");
    });
  });

  describe("getHealthSummary", () => {
    it("should count healthy, issue, and opportunity channels", () => {
      const channelHealth = [
        { channel: "email" as Channel, status: "active" as HealthStatus, score: 70, lastContactDays: 5, totalTouches: 10, responseRate: 50, reasoning: "" },
        { channel: "rep_visit" as Channel, status: "active" as HealthStatus, score: 65, lastContactDays: 10, totalTouches: 8, responseRate: 45, reasoning: "" },
        { channel: "webinar" as Channel, status: "blocked" as HealthStatus, score: 30, lastContactDays: 15, totalTouches: 12, responseRate: 5, reasoning: "" },
        { channel: "conference" as Channel, status: "opportunity" as HealthStatus, score: 85, lastContactDays: null, totalTouches: 1, responseRate: 100, reasoning: "" },
        { channel: "digital_ad" as Channel, status: "dark" as HealthStatus, score: 20, lastContactDays: null, totalTouches: 0, responseRate: 0, reasoning: "" },
        { channel: "phone" as Channel, status: "declining" as HealthStatus, score: 40, lastContactDays: 90, totalTouches: 5, responseRate: 25, reasoning: "" },
      ];

      const summary = getHealthSummary(channelHealth);

      expect(summary.healthyChannels).toBe(2); // active
      expect(summary.issueChannels).toBe(2); // blocked + declining
      expect(summary.opportunityChannels).toBe(1); // opportunity
    });

    it("should recommend expanding on opportunities", () => {
      const channelHealth = [
        { channel: "email" as Channel, status: "opportunity" as HealthStatus, score: 85, lastContactDays: null, totalTouches: 1, responseRate: 100, reasoning: "" },
        { channel: "rep_visit" as Channel, status: "active" as HealthStatus, score: 65, lastContactDays: 10, totalTouches: 8, responseRate: 45, reasoning: "" },
      ];

      const summary = getHealthSummary(channelHealth);

      expect(summary.primaryRecommendation).toContain("Expand engagement");
      expect(summary.primaryRecommendation).toContain("email");
    });

    it("should recommend re-engagement when issues dominate", () => {
      const channelHealth = [
        { channel: "email" as Channel, status: "blocked" as HealthStatus, score: 30, lastContactDays: 5, totalTouches: 12, responseRate: 5, reasoning: "" },
        { channel: "rep_visit" as Channel, status: "declining" as HealthStatus, score: 40, lastContactDays: 90, totalTouches: 5, responseRate: 20, reasoning: "" },
        { channel: "webinar" as Channel, status: "dark" as HealthStatus, score: 20, lastContactDays: null, totalTouches: 0, responseRate: 0, reasoning: "" },
      ];

      const summary = getHealthSummary(channelHealth);

      expect(summary.primaryRecommendation).toContain("need attention");
    });

    it("should recognize strong multi-channel engagement", () => {
      const channels: Channel[] = ["email", "rep_visit", "webinar", "conference", "digital_ad", "phone"];
      const channelHealth = channels.map((channel) => ({
        channel,
        status: "active" as HealthStatus,
        score: 70,
        lastContactDays: 5,
        totalTouches: 10,
        responseRate: 50,
        reasoning: "",
      }));

      const summary = getHealthSummary(channelHealth);

      expect(summary.healthyChannels).toBe(6);
      expect(summary.primaryRecommendation).toContain("Strong multi-channel");
    });
  });

  describe("Edge Cases", () => {
    it("should handle null lastContact gracefully", () => {
      const hcp = mockHcp([
        {
          score: 50,
          lastContact: null,
          totalTouches: 3,
          responseRate: 40,
        },
      ]);

      const health = classifyChannelHealth(hcp);
      expect(health[0].lastContactDays).toBeNull();
      // Should still classify correctly (likely dark or declining)
      expect(health[0].status).toBeDefined();
    });

    it("should handle zero totalTouches", () => {
      const hcp = mockHcp([
        {
          score: 60,
          lastContact: null,
          totalTouches: 0,
          responseRate: 0,
        },
      ]);

      const health = classifyChannelHealth(hcp);
      expect(health[0].status).toBe("dark");
    });

    it("should handle 100% response rate", () => {
      const hcp = mockHcp([
        {
          score: 90,
          lastContact: new Date().toISOString(),
          totalTouches: 5,
          responseRate: 100,
        },
      ]);

      const health = classifyChannelHealth(hcp);
      expect(health[0].status).toBe("active");
    });
  });
});
