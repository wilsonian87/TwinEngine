/**
 * Prompt Analytics Service
 *
 * Phase 12D.4: Continuous Evolution
 *
 * This service:
 * - Tracks prompt usage across the platform
 * - Captures user corrections to agent outputs
 * - Manages A/B testing of prompt variations
 * - Provides analytics and improvement insights
 */

import type {
  InsertPromptUsage,
  PromptUsageDB,
  InsertPromptCorrection,
  PromptCorrectionDB,
  InsertPromptAbTest,
  PromptAbTestDB,
  PromptUsageStats,
  PromptCorrectionSummary,
  ABTestResults,
  PromptHealthDashboard,
  CorrectionType,
  ABTestStatus,
} from "@shared/schema";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Context for tracking prompt usage
 */
export interface UsageContext {
  promptId: string;
  promptVersion: string;
  promptType: "system" | "role" | "task" | "guardrail";
  agentType?: string;
  agentRunId?: string;
  userId?: string;
  roleType?: string;
  sessionId?: string;
  taskType?: string;
  taskComplexity?: "simple" | "moderate" | "complex";
  abTestGroup?: string;
  abTestId?: string;
}

/**
 * Performance metrics for a prompt invocation
 */
export interface UsageMetrics {
  responseTimeMs: number;
  tokensUsed?: number;
  inputTokens?: number;
  outputTokens?: number;
  wasSuccessful: boolean;
  userSatisfactionScore?: number;
}

/**
 * Correction submission from user
 */
export interface CorrectionSubmission {
  usageId?: string;
  promptId: string;
  promptVersion: string;
  correctedBy: string;
  userRole?: string;
  correctionType: CorrectionType;
  severity: "minor" | "moderate" | "major" | "critical";
  originalOutput?: string;
  correctedOutput?: string;
  correctionNotes?: string;
  affectedSection?: string;
  suggestedImprovement?: string;
}

/**
 * A/B test configuration
 */
export interface ABTestConfig {
  name: string;
  description?: string;
  hypothesis?: string;
  basePromptId: string;
  variantPromptId: string;
  targetRoles?: string[];
  targetTaskTypes?: string[];
  trafficSplitPercent?: number;
  primaryMetric: string;
  secondaryMetrics?: string[];
  minimumSampleSize?: number;
  createdBy: string;
}

// ============================================================================
// IN-MEMORY STORAGE (for demo/development)
// ============================================================================

const usageRecords: Map<string, PromptUsageDB> = new Map();
const correctionRecords: Map<string, PromptCorrectionDB> = new Map();
const abTestRecords: Map<string, PromptAbTestDB> = new Map();

let usageIdCounter = 1;
let correctionIdCounter = 1;
let abTestIdCounter = 1;

function generateId(prefix: string, counter: number): string {
  return `${prefix}-${Date.now()}-${counter}`;
}

// ============================================================================
// PROMPT ANALYTICS CLASS
// ============================================================================

/**
 * PromptAnalytics handles tracking, corrections, and A/B testing for agent prompts
 */
export class PromptAnalytics {
  // ============================================================================
  // USAGE TRACKING
  // ============================================================================

  /**
   * Record a prompt usage event
   */
  async trackUsage(context: UsageContext, metrics: UsageMetrics): Promise<string> {
    const id = generateId("usage", usageIdCounter++);

    const record: PromptUsageDB = {
      id,
      promptId: context.promptId,
      promptVersion: context.promptVersion,
      promptType: context.promptType,
      agentType: context.agentType ?? null,
      agentRunId: context.agentRunId ?? null,
      userId: context.userId ?? null,
      roleType: context.roleType ?? null,
      sessionId: context.sessionId ?? null,
      taskType: context.taskType ?? null,
      taskComplexity: context.taskComplexity ?? null,
      responseTimeMs: metrics.responseTimeMs,
      tokensUsed: metrics.tokensUsed ?? null,
      inputTokens: metrics.inputTokens ?? null,
      outputTokens: metrics.outputTokens ?? null,
      wasSuccessful: metrics.wasSuccessful,
      userSatisfactionScore: metrics.userSatisfactionScore ?? null,
      hadCorrection: false,
      correctionId: null,
      abTestGroup: context.abTestGroup ?? null,
      abTestId: context.abTestId ?? null,
      createdAt: new Date(),
    };

    usageRecords.set(id, record);

    // Update A/B test counts if applicable
    if (context.abTestId) {
      await this.incrementAbTestCount(context.abTestId, context.abTestGroup === "variant");
    }

    return id;
  }

  /**
   * Get usage record by ID
   */
  async getUsage(usageId: string): Promise<PromptUsageDB | undefined> {
    return usageRecords.get(usageId);
  }

  /**
   * Update satisfaction score for a usage event
   */
  async updateSatisfaction(usageId: string, score: number): Promise<void> {
    const record = usageRecords.get(usageId);
    if (record) {
      record.userSatisfactionScore = score;
    }
  }

  /**
   * Get usage statistics for a prompt
   */
  async getUsageStats(
    promptId: string,
    options: { startDate?: Date; endDate?: Date; version?: string } = {}
  ): Promise<PromptUsageStats> {
    const endDate = options.endDate ?? new Date();
    const startDate = options.startDate ?? new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const records = Array.from(usageRecords.values()).filter(r => {
      if (r.promptId !== promptId) return false;
      if (options.version && r.promptVersion !== options.version) return false;
      const recordDate = new Date(r.createdAt);
      return recordDate >= startDate && recordDate <= endDate;
    });

    const usageByRole: Record<string, number> = {};
    const usageByTask: Record<string, number> = {};
    let totalResponseTime = 0;
    let totalTokens = 0;
    let successCount = 0;
    let satisfactionSum = 0;
    let satisfactionCount = 0;
    let correctionCount = 0;

    for (const record of records) {
      // Count by role
      if (record.roleType) {
        usageByRole[record.roleType] = (usageByRole[record.roleType] ?? 0) + 1;
      }

      // Count by task
      if (record.taskType) {
        usageByTask[record.taskType] = (usageByTask[record.taskType] ?? 0) + 1;
      }

      // Aggregate metrics
      if (record.responseTimeMs) totalResponseTime += record.responseTimeMs;
      if (record.tokensUsed) totalTokens += record.tokensUsed;
      if (record.wasSuccessful) successCount++;
      if (record.userSatisfactionScore) {
        satisfactionSum += record.userSatisfactionScore;
        satisfactionCount++;
      }
      if (record.hadCorrection) correctionCount++;
    }

    // Get correction breakdown
    const corrections = Array.from(correctionRecords.values()).filter(
      c => c.promptId === promptId
    );
    const correctionsByType: Record<string, number> = {};
    for (const correction of corrections) {
      correctionsByType[correction.correctionType] =
        (correctionsByType[correction.correctionType] ?? 0) + 1;
    }

    // Calculate daily usage trend
    const usageTrend: { date: string; count: number; successRate: number }[] = [];
    const dayMs = 24 * 60 * 60 * 1000;
    for (let d = new Date(startDate); d <= endDate; d = new Date(d.getTime() + dayMs)) {
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      const dayRecords = records.filter(r => {
        const recordDate = new Date(r.createdAt);
        return recordDate >= dayStart && recordDate <= dayEnd;
      });

      if (dayRecords.length > 0) {
        const daySuccess = dayRecords.filter(r => r.wasSuccessful).length;
        usageTrend.push({
          date: dayStart.toISOString().split("T")[0],
          count: dayRecords.length,
          successRate: dayRecords.length > 0 ? daySuccess / dayRecords.length : 0,
        });
      }
    }

    const latestRecord = records[records.length - 1];

    return {
      promptId,
      promptVersion: options.version ?? latestRecord?.promptVersion ?? "1.0.0",
      promptType: latestRecord?.promptType as any ?? "system",
      totalUsage: records.length,
      usageByRole,
      usageByTask,
      avgResponseTimeMs: records.length > 0 ? totalResponseTime / records.length : 0,
      avgTokensUsed: records.length > 0 ? totalTokens / records.length : 0,
      successRate: records.length > 0 ? successCount / records.length : 0,
      avgSatisfactionScore: satisfactionCount > 0 ? satisfactionSum / satisfactionCount : null,
      correctionRate: records.length > 0 ? correctionCount / records.length : 0,
      correctionsByType,
      usageTrend,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    };
  }

  // ============================================================================
  // CORRECTION TRACKING
  // ============================================================================

  /**
   * Record a user correction
   */
  async recordCorrection(submission: CorrectionSubmission): Promise<string> {
    const id = generateId("correction", correctionIdCounter++);

    const record: PromptCorrectionDB = {
      id,
      usageId: submission.usageId ?? null,
      promptId: submission.promptId,
      promptVersion: submission.promptVersion,
      correctedBy: submission.correctedBy,
      userRole: submission.userRole ?? null,
      correctionType: submission.correctionType,
      severity: submission.severity,
      originalOutput: submission.originalOutput ?? null,
      correctedOutput: submission.correctedOutput ?? null,
      correctionNotes: submission.correctionNotes ?? null,
      affectedSection: submission.affectedSection ?? null,
      suggestedImprovement: submission.suggestedImprovement ?? null,
      status: "pending",
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null,
      createdAt: new Date(),
    };

    correctionRecords.set(id, record);

    // Update the usage record if linked
    if (submission.usageId) {
      const usageRecord = usageRecords.get(submission.usageId);
      if (usageRecord) {
        usageRecord.hadCorrection = true;
        usageRecord.correctionId = id;
      }
    }

    return id;
  }

  /**
   * Get correction by ID
   */
  async getCorrection(correctionId: string): Promise<PromptCorrectionDB | undefined> {
    return correctionRecords.get(correctionId);
  }

  /**
   * Review a correction
   */
  async reviewCorrection(
    correctionId: string,
    reviewedBy: string,
    status: "reviewed" | "incorporated" | "dismissed",
    notes?: string
  ): Promise<void> {
    const record = correctionRecords.get(correctionId);
    if (record) {
      record.status = status;
      record.reviewedBy = reviewedBy;
      record.reviewedAt = new Date();
      record.reviewNotes = notes ?? null;
    }
  }

  /**
   * Get corrections for a prompt
   */
  async getCorrections(
    promptId: string,
    options: { status?: string; limit?: number } = {}
  ): Promise<PromptCorrectionDB[]> {
    let corrections = Array.from(correctionRecords.values()).filter(
      c => c.promptId === promptId
    );

    if (options.status) {
      corrections = corrections.filter(c => c.status === options.status);
    }

    corrections.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (options.limit) {
      corrections = corrections.slice(0, options.limit);
    }

    return corrections;
  }

  /**
   * Get correction summary for improvement pipeline
   */
  async getCorrectionSummary(promptId: string, version?: string): Promise<PromptCorrectionSummary> {
    const corrections = Array.from(correctionRecords.values()).filter(c => {
      if (c.promptId !== promptId) return false;
      if (version && c.promptVersion !== version) return false;
      return true;
    });

    // Count by status
    const pendingReview = corrections.filter(c => c.status === "pending").length;
    const incorporated = corrections.filter(c => c.status === "incorporated").length;

    // Group by type
    const byTypeMap = new Map<string, { count: number; severitySum: number }>();
    for (const c of corrections) {
      const existing = byTypeMap.get(c.correctionType) ?? { count: 0, severitySum: 0 };
      existing.count++;
      existing.severitySum += severityToNumber(c.severity);
      byTypeMap.set(c.correctionType, existing);
    }

    const byType = Array.from(byTypeMap.entries()).map(([type, data]) => ({
      type: type as CorrectionType,
      count: data.count,
      avgSeverity: data.count > 0 ? data.severitySum / data.count : 0,
    }));

    // Find top issues by section
    const sectionIssues = new Map<string, { count: number; suggestions: string[] }>();
    for (const c of corrections) {
      if (c.affectedSection) {
        const existing = sectionIssues.get(c.affectedSection) ?? { count: 0, suggestions: [] };
        existing.count++;
        if (c.suggestedImprovement) {
          existing.suggestions.push(c.suggestedImprovement);
        }
        sectionIssues.set(c.affectedSection, existing);
      }
    }

    const topIssues = Array.from(sectionIssues.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([section, data]) => ({
        section,
        issueCount: data.count,
        suggestedFix: data.suggestions[0] ?? null,
      }));

    // Determine improvement priority
    const majorCritical = corrections.filter(
      c => c.severity === "major" || c.severity === "critical"
    ).length;
    const improvementPriority: "high" | "medium" | "low" =
      majorCritical > 5 ? "high" : majorCritical > 2 ? "medium" : "low";

    // Generate suggested actions
    const suggestedActions: string[] = [];
    if (pendingReview > 10) {
      suggestedActions.push("Review pending corrections - backlog is growing");
    }
    if (byType.some(t => t.type === "hallucination" && t.count > 2)) {
      suggestedActions.push("Add grounding constraints to reduce hallucinations");
    }
    if (byType.some(t => t.type === "compliance_issue" && t.count > 0)) {
      suggestedActions.push("Review and strengthen compliance guardrails");
    }
    if (topIssues.length > 0) {
      suggestedActions.push(`Focus on improving section: ${topIssues[0].section}`);
    }

    return {
      promptId,
      promptVersion: version ?? "all",
      totalCorrections: corrections.length,
      pendingReview,
      incorporated,
      byType,
      topIssues,
      improvementPriority,
      suggestedActions,
    };
  }

  // ============================================================================
  // A/B TESTING
  // ============================================================================

  /**
   * Create a new A/B test
   */
  async createAbTest(config: ABTestConfig): Promise<string> {
    const id = generateId("abtest", abTestIdCounter++);

    const record: PromptAbTestDB = {
      id,
      name: config.name,
      description: config.description ?? null,
      hypothesis: config.hypothesis ?? null,
      basePromptId: config.basePromptId,
      variantPromptId: config.variantPromptId,
      targetRoles: config.targetRoles ?? null,
      targetTaskTypes: config.targetTaskTypes ?? null,
      trafficSplitPercent: config.trafficSplitPercent ?? 50,
      primaryMetric: config.primaryMetric,
      secondaryMetrics: config.secondaryMetrics ?? null,
      minimumSampleSize: config.minimumSampleSize ?? 100,
      controlUsageCount: 0,
      variantUsageCount: 0,
      controlSuccessRate: null,
      variantSuccessRate: null,
      controlAvgSatisfaction: null,
      variantAvgSatisfaction: null,
      statisticalSignificance: null,
      winner: null,
      winnerRationale: null,
      status: "draft",
      startedAt: null,
      endedAt: null,
      createdBy: config.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    abTestRecords.set(id, record);
    return id;
  }

  /**
   * Get A/B test by ID
   */
  async getAbTest(testId: string): Promise<PromptAbTestDB | undefined> {
    return abTestRecords.get(testId);
  }

  /**
   * Start an A/B test
   */
  async startAbTest(testId: string): Promise<void> {
    const record = abTestRecords.get(testId);
    if (record) {
      record.status = "active";
      record.startedAt = new Date();
      record.updatedAt = new Date();
    }
  }

  /**
   * End an A/B test
   */
  async endAbTest(testId: string, winner?: "control" | "variant" | "inconclusive", rationale?: string): Promise<void> {
    const record = abTestRecords.get(testId);
    if (record) {
      record.status = "completed";
      record.endedAt = new Date();
      record.winner = winner ?? null;
      record.winnerRationale = rationale ?? null;
      record.updatedAt = new Date();
    }
  }

  /**
   * Increment A/B test usage count
   */
  private async incrementAbTestCount(testId: string, isVariant: boolean): Promise<void> {
    const record = abTestRecords.get(testId);
    if (record) {
      if (isVariant) {
        record.variantUsageCount = (record.variantUsageCount ?? 0) + 1;
      } else {
        record.controlUsageCount = (record.controlUsageCount ?? 0) + 1;
      }
      record.updatedAt = new Date();
    }
  }

  /**
   * Assign user to A/B test group
   */
  assignAbTestGroup(testId: string, userId: string): "control" | "variant" {
    const record = abTestRecords.get(testId);
    if (!record || record.status !== "active") {
      return "control";
    }

    // Simple hash-based assignment for consistent group assignment
    const hash = simpleHash(userId + testId);
    const threshold = (record.trafficSplitPercent ?? 50) / 100;

    return hash < threshold ? "variant" : "control";
  }

  /**
   * Get A/B test results
   */
  async getAbTestResults(testId: string): Promise<ABTestResults | undefined> {
    const test = abTestRecords.get(testId);
    if (!test) return undefined;

    // Get usage records for this test
    const testUsage = Array.from(usageRecords.values()).filter(
      u => u.abTestId === testId
    );

    const controlUsage = testUsage.filter(u => u.abTestGroup === "control");
    const variantUsage = testUsage.filter(u => u.abTestGroup === "variant");

    // Calculate metrics
    const controlSuccessRate = controlUsage.length > 0
      ? controlUsage.filter(u => u.wasSuccessful).length / controlUsage.length
      : 0;
    const variantSuccessRate = variantUsage.length > 0
      ? variantUsage.filter(u => u.wasSuccessful).length / variantUsage.length
      : 0;

    const percentChange = controlSuccessRate > 0
      ? ((variantSuccessRate - controlSuccessRate) / controlSuccessRate) * 100
      : 0;

    // Simple significance calculation (would use proper stats in production)
    const totalSample = controlUsage.length + variantUsage.length;
    const minSample = test.minimumSampleSize ?? 100;
    const isSignificant = totalSample >= minSample && Math.abs(percentChange) > 5;

    // Calculate days running
    const startDate = test.startedAt ?? test.createdAt;
    const endDate = test.endedAt ?? new Date();
    const daysRunning = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (24 * 60 * 60 * 1000)
    );

    // Determine recommendation
    let recommendation: "adopt_variant" | "keep_control" | "extend_test" | "inconclusive";
    let rationale: string;

    if (!isSignificant && totalSample < minSample) {
      recommendation = "extend_test";
      rationale = `Need ${minSample - totalSample} more samples for significance`;
    } else if (isSignificant && variantSuccessRate > controlSuccessRate) {
      recommendation = "adopt_variant";
      rationale = `Variant shows ${percentChange.toFixed(1)}% improvement`;
    } else if (isSignificant && controlSuccessRate > variantSuccessRate) {
      recommendation = "keep_control";
      rationale = `Control performs ${(-percentChange).toFixed(1)}% better`;
    } else {
      recommendation = "inconclusive";
      rationale = "No statistically significant difference detected";
    }

    return {
      testId,
      name: test.name,
      status: test.status as ABTestStatus,
      controlSampleSize: controlUsage.length,
      variantSampleSize: variantUsage.length,
      totalSampleSize: totalSample,
      primaryMetric: test.primaryMetric,
      controlValue: controlSuccessRate,
      variantValue: variantSuccessRate,
      percentChange,
      pValue: isSignificant ? 0.03 : 0.15, // Simplified
      confidenceInterval: isSignificant ? { lower: percentChange - 2, upper: percentChange + 2 } : null,
      isSignificant,
      recommendation,
      rationale,
      daysRunning,
      estimatedDaysToSignificance: totalSample < minSample
        ? Math.ceil((minSample - totalSample) / Math.max(1, totalSample / daysRunning))
        : null,
    };
  }

  /**
   * List all A/B tests
   */
  async listAbTests(options: { status?: ABTestStatus; limit?: number } = {}): Promise<PromptAbTestDB[]> {
    let tests = Array.from(abTestRecords.values());

    if (options.status) {
      tests = tests.filter(t => t.status === options.status);
    }

    tests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (options.limit) {
      tests = tests.slice(0, options.limit);
    }

    return tests;
  }

  // ============================================================================
  // HEALTH DASHBOARD
  // ============================================================================

  /**
   * Get overall prompt health dashboard
   */
  async getHealthDashboard(): Promise<PromptHealthDashboard> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get recent usage
    const recentUsage = Array.from(usageRecords.values()).filter(
      u => new Date(u.createdAt) >= thirtyDaysAgo
    );

    // Calculate overall metrics
    const successCount = recentUsage.filter(u => u.wasSuccessful).length;
    const satisfactionScores = recentUsage
      .filter(u => u.userSatisfactionScore)
      .map(u => u.userSatisfactionScore!);

    // Get unique active prompts
    const activePrompts = new Set(recentUsage.map(u => u.promptId));

    // Get recent corrections
    const recentCorrections = Array.from(correctionRecords.values()).filter(
      c => new Date(c.createdAt) >= thirtyDaysAgo
    );

    // Calculate correction trend
    const firstHalfCorrections = recentCorrections.filter(c => {
      const date = new Date(c.createdAt);
      return date < new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    }).length;
    const secondHalfCorrections = recentCorrections.length - firstHalfCorrections;
    const correctionTrend: "increasing" | "stable" | "decreasing" =
      secondHalfCorrections > firstHalfCorrections * 1.2
        ? "increasing"
        : secondHalfCorrections < firstHalfCorrections * 0.8
          ? "decreasing"
          : "stable";

    // Top correction types
    const correctionTypeCounts = new Map<string, number>();
    for (const c of recentCorrections) {
      correctionTypeCounts.set(
        c.correctionType,
        (correctionTypeCounts.get(c.correctionType) ?? 0) + 1
      );
    }
    const topCorrectionTypes = Array.from(correctionTypeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    // A/B testing status
    const activeTests = Array.from(abTestRecords.values()).filter(
      t => t.status === "active"
    );
    const testsReadyForDecision = activeTests.filter(t => {
      const total = (t.controlUsageCount ?? 0) + (t.variantUsageCount ?? 0);
      return total >= (t.minimumSampleSize ?? 100);
    });

    // Recent winners
    const completedTests = Array.from(abTestRecords.values())
      .filter(t => t.status === "completed" && t.winner)
      .sort((a, b) => new Date(b.endedAt!).getTime() - new Date(a.endedAt!).getTime())
      .slice(0, 3);

    const recentWinners = completedTests.map(t => ({
      testName: t.name,
      winner: t.winner!,
      improvement: 5, // Simplified
    }));

    // Prompts needing attention
    const promptsNeedingAttention: PromptHealthDashboard["promptsNeedingAttention"] = [];

    // Check for prompts with high correction rates
    for (const promptId of Array.from(activePrompts)) {
      const promptUsage = recentUsage.filter(u => u.promptId === promptId);
      const promptCorrections = recentCorrections.filter(c => c.promptId === promptId);

      if (promptUsage.length > 10) {
        const correctionRate = promptCorrections.length / promptUsage.length;
        if (correctionRate > 0.1) {
          promptsNeedingAttention.push({
            promptId,
            promptName: promptId, // Would look up actual name
            issue: "High correction rate",
            severity: correctionRate > 0.2 ? "critical" : "warning",
            metric: "correction_rate",
            currentValue: correctionRate,
            threshold: 0.1,
          });
        }
      }
    }

    // Improvement pipeline stats
    const pendingImprovements = recentCorrections.filter(c => c.status === "pending").length;
    const improvementsThisMonth = recentCorrections.filter(c => c.status === "incorporated").length;

    return {
      totalPromptsActive: activePrompts.size,
      totalUsageLast30Days: recentUsage.length,
      overallSuccessRate: recentUsage.length > 0 ? successCount / recentUsage.length : 0,
      overallSatisfactionScore:
        satisfactionScores.length > 0
          ? satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length
          : null,
      promptsNeedingAttention,
      totalCorrectionsLast30Days: recentCorrections.length,
      correctionTrend,
      topCorrectionTypes,
      activeTests: activeTests.length,
      testsReadyForDecision: testsReadyForDecision.length,
      recentWinners,
      pendingImprovements,
      improvementsThisMonth,
      generatedAt: new Date().toISOString(),
    };
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Clear all analytics data (for testing)
   */
  clearAllData(): void {
    usageRecords.clear();
    correctionRecords.clear();
    abTestRecords.clear();
    usageIdCounter = 1;
    correctionIdCounter = 1;
    abTestIdCounter = 1;
  }

  /**
   * Get counts for debugging
   */
  getCounts(): { usage: number; corrections: number; abTests: number } {
    return {
      usage: usageRecords.size,
      corrections: correctionRecords.size,
      abTests: abTestRecords.size,
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function severityToNumber(severity: string): number {
  switch (severity) {
    case "minor":
      return 1;
    case "moderate":
      return 2;
    case "major":
      return 3;
    case "critical":
      return 4;
    default:
      return 0;
  }
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash % 100) / 100;
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const promptAnalytics = new PromptAnalytics();
