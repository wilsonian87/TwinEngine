/**
 * Prompt Analytics Tests
 *
 * Phase 12D.4: Continuous Evolution
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  PromptAnalytics,
  promptAnalytics,
  type UsageContext,
  type UsageMetrics,
  type CorrectionSubmission,
  type ABTestConfig,
} from "../../server/services/agents/prompt-analytics";

describe("PromptAnalytics", () => {
  let analytics: PromptAnalytics;

  beforeEach(() => {
    analytics = new PromptAnalytics();
    analytics.clearAllData();
  });

  describe("Usage Tracking", () => {
    const baseContext: UsageContext = {
      promptId: "system-prompt-v1",
      promptVersion: "1.0.0",
      promptType: "system",
      userId: "user-1",
      roleType: "brand-lead",
      taskType: "cohort-analysis",
    };

    const baseMetrics: UsageMetrics = {
      responseTimeMs: 500,
      tokensUsed: 1000,
      inputTokens: 200,
      outputTokens: 800,
      wasSuccessful: true,
    };

    it("should track prompt usage", async () => {
      const usageId = await analytics.trackUsage(baseContext, baseMetrics);

      expect(usageId).toBeTruthy();
      expect(usageId).toContain("usage-");

      const record = await analytics.getUsage(usageId);
      expect(record).toBeDefined();
      expect(record?.promptId).toBe("system-prompt-v1");
      expect(record?.wasSuccessful).toBe(true);
    });

    it("should track multiple usage events", async () => {
      await analytics.trackUsage(baseContext, baseMetrics);
      await analytics.trackUsage(baseContext, { ...baseMetrics, wasSuccessful: false });
      await analytics.trackUsage(baseContext, baseMetrics);

      const counts = analytics.getCounts();
      expect(counts.usage).toBe(3);
    });

    it("should update satisfaction score", async () => {
      const usageId = await analytics.trackUsage(baseContext, baseMetrics);

      await analytics.updateSatisfaction(usageId, 5);

      const record = await analytics.getUsage(usageId);
      expect(record?.userSatisfactionScore).toBe(5);
    });

    it("should calculate usage statistics", async () => {
      // Track multiple usage events
      await analytics.trackUsage(baseContext, baseMetrics);
      await analytics.trackUsage(
        { ...baseContext, roleType: "analytics" },
        { ...baseMetrics, responseTimeMs: 700 }
      );
      await analytics.trackUsage(
        { ...baseContext, taskType: "competitive-assessment" },
        { ...baseMetrics, wasSuccessful: false }
      );

      const stats = await analytics.getUsageStats("system-prompt-v1");

      expect(stats.totalUsage).toBe(3);
      expect(stats.usageByRole["brand-lead"]).toBe(2);
      expect(stats.usageByRole["analytics"]).toBe(1);
      expect(stats.usageByTask["cohort-analysis"]).toBe(2);
      expect(stats.usageByTask["competitive-assessment"]).toBe(1);
      expect(stats.avgResponseTimeMs).toBeCloseTo(566.67, 0);
      expect(stats.successRate).toBeCloseTo(0.667, 2);
    });

    it("should filter usage stats by date range", async () => {
      await analytics.trackUsage(baseContext, baseMetrics);

      const futureDate = new Date(Date.now() + 100000);
      const stats = await analytics.getUsageStats("system-prompt-v1", {
        startDate: futureDate,
      });

      expect(stats.totalUsage).toBe(0);
    });

    it("should track A/B test group assignment", async () => {
      const testId = await analytics.createAbTest({
        name: "Test Prompt",
        basePromptId: "system-prompt-v1",
        variantPromptId: "system-prompt-v2",
        primaryMetric: "success_rate",
        createdBy: "user-1",
      });

      await analytics.startAbTest(testId);

      const usageId = await analytics.trackUsage(
        { ...baseContext, abTestId: testId, abTestGroup: "variant" },
        baseMetrics
      );

      const test = await analytics.getAbTest(testId);
      expect(test?.variantUsageCount).toBe(1);
    });
  });

  describe("Correction Tracking", () => {
    const baseSubmission: CorrectionSubmission = {
      promptId: "system-prompt-v1",
      promptVersion: "1.0.0",
      correctedBy: "user-1",
      correctionType: "factual_error",
      severity: "moderate",
      originalOutput: "The HCP has 50% market share",
      correctedOutput: "The HCP has 35% market share",
      correctionNotes: "Market share was overstated",
    };

    it("should record a correction", async () => {
      const correctionId = await analytics.recordCorrection(baseSubmission);

      expect(correctionId).toBeTruthy();
      expect(correctionId).toContain("correction-");

      const record = await analytics.getCorrection(correctionId);
      expect(record).toBeDefined();
      expect(record?.correctionType).toBe("factual_error");
      expect(record?.severity).toBe("moderate");
      expect(record?.status).toBe("pending");
    });

    it("should link correction to usage event", async () => {
      const usageId = await analytics.trackUsage(
        {
          promptId: "system-prompt-v1",
          promptVersion: "1.0.0",
          promptType: "system",
        },
        { responseTimeMs: 500, wasSuccessful: true }
      );

      const correctionId = await analytics.recordCorrection({
        ...baseSubmission,
        usageId,
      });

      const usageRecord = await analytics.getUsage(usageId);
      expect(usageRecord?.hadCorrection).toBe(true);
      expect(usageRecord?.correctionId).toBe(correctionId);
    });

    it("should get corrections for a prompt", async () => {
      await analytics.recordCorrection(baseSubmission);
      await analytics.recordCorrection({
        ...baseSubmission,
        correctionType: "tone_issue",
        severity: "minor",
      });
      await analytics.recordCorrection({
        ...baseSubmission,
        promptId: "other-prompt",
      });

      const corrections = await analytics.getCorrections("system-prompt-v1");
      expect(corrections.length).toBe(2);
    });

    it("should filter corrections by status", async () => {
      const id1 = await analytics.recordCorrection(baseSubmission);
      await analytics.recordCorrection(baseSubmission);

      await analytics.reviewCorrection(id1, "reviewer-1", "incorporated");

      const pendingCorrections = await analytics.getCorrections("system-prompt-v1", {
        status: "pending",
      });
      expect(pendingCorrections.length).toBe(1);
    });

    it("should review a correction", async () => {
      const correctionId = await analytics.recordCorrection(baseSubmission);

      await analytics.reviewCorrection(
        correctionId,
        "reviewer-1",
        "incorporated",
        "Fixed in prompt v1.0.1"
      );

      const record = await analytics.getCorrection(correctionId);
      expect(record?.status).toBe("incorporated");
      expect(record?.reviewedBy).toBe("reviewer-1");
      expect(record?.reviewNotes).toBe("Fixed in prompt v1.0.1");
      expect(record?.reviewedAt).toBeDefined();
    });

    it("should get correction summary", async () => {
      await analytics.recordCorrection(baseSubmission);
      await analytics.recordCorrection({
        ...baseSubmission,
        correctionType: "hallucination",
        severity: "major",
        affectedSection: "market_analysis",
        suggestedImprovement: "Add grounding constraints",
      });
      await analytics.recordCorrection({
        ...baseSubmission,
        correctionType: "hallucination",
        severity: "critical",
        affectedSection: "market_analysis",
      });

      const summary = await analytics.getCorrectionSummary("system-prompt-v1");

      expect(summary.totalCorrections).toBe(3);
      expect(summary.pendingReview).toBe(3);
      expect(summary.byType.some(t => t.type === "hallucination" && t.count === 2)).toBe(true);
      expect(summary.topIssues.some(i => i.section === "market_analysis")).toBe(true);
      expect(summary.suggestedActions.length).toBeGreaterThan(0);
    });
  });

  describe("A/B Testing", () => {
    const baseConfig: ABTestConfig = {
      name: "System Prompt Improvement Test",
      description: "Testing new grounding constraints",
      hypothesis: "Adding grounding will reduce hallucinations",
      basePromptId: "system-prompt-v1",
      variantPromptId: "system-prompt-v2",
      primaryMetric: "success_rate",
      minimumSampleSize: 50,
      createdBy: "user-1",
    };

    it("should create an A/B test", async () => {
      const testId = await analytics.createAbTest(baseConfig);

      expect(testId).toBeTruthy();
      expect(testId).toContain("abtest-");

      const test = await analytics.getAbTest(testId);
      expect(test).toBeDefined();
      expect(test?.name).toBe("System Prompt Improvement Test");
      expect(test?.status).toBe("draft");
    });

    it("should start an A/B test", async () => {
      const testId = await analytics.createAbTest(baseConfig);

      await analytics.startAbTest(testId);

      const test = await analytics.getAbTest(testId);
      expect(test?.status).toBe("active");
      expect(test?.startedAt).toBeDefined();
    });

    it("should end an A/B test with winner", async () => {
      const testId = await analytics.createAbTest(baseConfig);
      await analytics.startAbTest(testId);

      await analytics.endAbTest(testId, "variant", "Variant showed 15% improvement");

      const test = await analytics.getAbTest(testId);
      expect(test?.status).toBe("completed");
      expect(test?.winner).toBe("variant");
      expect(test?.winnerRationale).toBe("Variant showed 15% improvement");
      expect(test?.endedAt).toBeDefined();
    });

    it("should assign users to test groups consistently", async () => {
      const testId = await analytics.createAbTest({
        ...baseConfig,
        trafficSplitPercent: 50,
      });
      await analytics.startAbTest(testId);

      // Same user should always get same group
      const group1 = analytics.assignAbTestGroup(testId, "user-1");
      const group2 = analytics.assignAbTestGroup(testId, "user-1");
      expect(group1).toBe(group2);

      // Different users may get different groups
      const groups = new Set<string>();
      for (let i = 0; i < 100; i++) {
        groups.add(analytics.assignAbTestGroup(testId, `user-${i}`));
      }
      // With 50/50 split, we should see both groups
      expect(groups.size).toBe(2);
    });

    it("should return control for inactive tests", async () => {
      const testId = await analytics.createAbTest(baseConfig);
      // Don't start the test

      const group = analytics.assignAbTestGroup(testId, "user-1");
      expect(group).toBe("control");
    });

    it("should list A/B tests", async () => {
      await analytics.createAbTest(baseConfig);
      await analytics.createAbTest({ ...baseConfig, name: "Test 2" });

      const tests = await analytics.listAbTests();
      expect(tests.length).toBe(2);
    });

    it("should filter A/B tests by status", async () => {
      const testId1 = await analytics.createAbTest(baseConfig);
      await analytics.createAbTest(baseConfig);

      await analytics.startAbTest(testId1);

      const activeTests = await analytics.listAbTests({ status: "active" });
      expect(activeTests.length).toBe(1);

      const draftTests = await analytics.listAbTests({ status: "draft" });
      expect(draftTests.length).toBe(1);
    });

    it("should get A/B test results", async () => {
      const testId = await analytics.createAbTest({ ...baseConfig, minimumSampleSize: 10 });
      await analytics.startAbTest(testId);

      // Track some usage for control
      for (let i = 0; i < 5; i++) {
        await analytics.trackUsage(
          {
            promptId: "system-prompt-v1",
            promptVersion: "1.0.0",
            promptType: "system",
            abTestId: testId,
            abTestGroup: "control",
          },
          { responseTimeMs: 500, wasSuccessful: i < 4 } // 80% success
        );
      }

      // Track some usage for variant
      for (let i = 0; i < 5; i++) {
        await analytics.trackUsage(
          {
            promptId: "system-prompt-v2",
            promptVersion: "1.0.0",
            promptType: "system",
            abTestId: testId,
            abTestGroup: "variant",
          },
          { responseTimeMs: 400, wasSuccessful: i < 5 } // 100% success
        );
      }

      const results = await analytics.getAbTestResults(testId);

      expect(results).toBeDefined();
      expect(results?.controlSampleSize).toBe(5);
      expect(results?.variantSampleSize).toBe(5);
      expect(results?.controlValue).toBeCloseTo(0.8, 2);
      expect(results?.variantValue).toBeCloseTo(1.0, 2);
      expect(results?.percentChange).toBeGreaterThan(0);
    });
  });

  describe("Health Dashboard", () => {
    it("should return empty dashboard when no data", async () => {
      const dashboard = await analytics.getHealthDashboard();

      expect(dashboard.totalPromptsActive).toBe(0);
      expect(dashboard.totalUsageLast30Days).toBe(0);
      expect(dashboard.overallSuccessRate).toBe(0);
      expect(dashboard.generatedAt).toBeDefined();
    });

    it("should calculate overall metrics", async () => {
      // Add some usage data
      await analytics.trackUsage(
        { promptId: "prompt-1", promptVersion: "1.0.0", promptType: "system" },
        { responseTimeMs: 500, wasSuccessful: true, userSatisfactionScore: 5 }
      );
      await analytics.trackUsage(
        { promptId: "prompt-1", promptVersion: "1.0.0", promptType: "system" },
        { responseTimeMs: 600, wasSuccessful: true, userSatisfactionScore: 4 }
      );
      await analytics.trackUsage(
        { promptId: "prompt-2", promptVersion: "1.0.0", promptType: "role" },
        { responseTimeMs: 400, wasSuccessful: false }
      );

      const dashboard = await analytics.getHealthDashboard();

      expect(dashboard.totalPromptsActive).toBe(2);
      expect(dashboard.totalUsageLast30Days).toBe(3);
      expect(dashboard.overallSuccessRate).toBeCloseTo(0.667, 2);
      expect(dashboard.overallSatisfactionScore).toBeCloseTo(4.5, 1);
    });

    it("should identify prompts needing attention", async () => {
      // Add usage with high correction rate
      for (let i = 0; i < 15; i++) {
        await analytics.trackUsage(
          { promptId: "problem-prompt", promptVersion: "1.0.0", promptType: "system" },
          { responseTimeMs: 500, wasSuccessful: true }
        );
      }

      // Add many corrections
      for (let i = 0; i < 3; i++) {
        await analytics.recordCorrection({
          promptId: "problem-prompt",
          promptVersion: "1.0.0",
          correctedBy: "user-1",
          correctionType: "factual_error",
          severity: "moderate",
        });
      }

      const dashboard = await analytics.getHealthDashboard();

      expect(dashboard.promptsNeedingAttention.some(
        p => p.promptId === "problem-prompt" && p.issue === "High correction rate"
      )).toBe(true);
    });

    it("should track A/B testing status", async () => {
      const testId = await analytics.createAbTest({
        name: "Test",
        basePromptId: "p1",
        variantPromptId: "p2",
        primaryMetric: "success_rate",
        createdBy: "user-1",
      });
      await analytics.startAbTest(testId);

      const dashboard = await analytics.getHealthDashboard();

      expect(dashboard.activeTests).toBe(1);
    });

    it("should report correction trends", async () => {
      await analytics.recordCorrection({
        promptId: "prompt-1",
        promptVersion: "1.0.0",
        correctedBy: "user-1",
        correctionType: "factual_error",
        severity: "moderate",
      });

      const dashboard = await analytics.getHealthDashboard();

      expect(dashboard.totalCorrectionsLast30Days).toBe(1);
      expect(dashboard.correctionTrend).toBeDefined();
    });
  });

  describe("Singleton Instance", () => {
    it("should export a singleton promptAnalytics instance", () => {
      expect(promptAnalytics).toBeInstanceOf(PromptAnalytics);
    });

    it("should have all expected methods", () => {
      expect(typeof promptAnalytics.trackUsage).toBe("function");
      expect(typeof promptAnalytics.getUsage).toBe("function");
      expect(typeof promptAnalytics.updateSatisfaction).toBe("function");
      expect(typeof promptAnalytics.getUsageStats).toBe("function");
      expect(typeof promptAnalytics.recordCorrection).toBe("function");
      expect(typeof promptAnalytics.getCorrection).toBe("function");
      expect(typeof promptAnalytics.reviewCorrection).toBe("function");
      expect(typeof promptAnalytics.getCorrections).toBe("function");
      expect(typeof promptAnalytics.getCorrectionSummary).toBe("function");
      expect(typeof promptAnalytics.createAbTest).toBe("function");
      expect(typeof promptAnalytics.getAbTest).toBe("function");
      expect(typeof promptAnalytics.startAbTest).toBe("function");
      expect(typeof promptAnalytics.endAbTest).toBe("function");
      expect(typeof promptAnalytics.assignAbTestGroup).toBe("function");
      expect(typeof promptAnalytics.getAbTestResults).toBe("function");
      expect(typeof promptAnalytics.listAbTests).toBe("function");
      expect(typeof promptAnalytics.getHealthDashboard).toBe("function");
    });
  });

  describe("Data Management", () => {
    it("should clear all data", async () => {
      await analytics.trackUsage(
        { promptId: "p1", promptVersion: "1.0.0", promptType: "system" },
        { responseTimeMs: 500, wasSuccessful: true }
      );
      await analytics.recordCorrection({
        promptId: "p1",
        promptVersion: "1.0.0",
        correctedBy: "user-1",
        correctionType: "factual_error",
        severity: "minor",
      });
      await analytics.createAbTest({
        name: "Test",
        basePromptId: "p1",
        variantPromptId: "p2",
        primaryMetric: "success_rate",
        createdBy: "user-1",
      });

      const beforeCounts = analytics.getCounts();
      expect(beforeCounts.usage).toBe(1);
      expect(beforeCounts.corrections).toBe(1);
      expect(beforeCounts.abTests).toBe(1);

      analytics.clearAllData();

      const afterCounts = analytics.getCounts();
      expect(afterCounts.usage).toBe(0);
      expect(afterCounts.corrections).toBe(0);
      expect(afterCounts.abTests).toBe(0);
    });

    it("should return counts", () => {
      const counts = analytics.getCounts();
      expect(counts).toHaveProperty("usage");
      expect(counts).toHaveProperty("corrections");
      expect(counts).toHaveProperty("abTests");
    });
  });
});
