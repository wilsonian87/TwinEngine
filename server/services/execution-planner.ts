/**
 * Execution Planner Service
 *
 * Phase 7F: Converts optimization results into executable plans,
 * manages resource booking, execution, and rebalancing.
 */

import { db } from "../db";
import {
  executionPlans,
  optimizationAllocations,
  optimizationResults,
  optimizationProblems,
  hcpProfiles,
  stimuliEvents,
  type ExecutionPlan,
  type OptimizationAllocation,
  type InsertExecutionPlan,
  type ExecutionPlanApi,
  type ExecutionReport,
  type RebalanceSuggestion,
  type RebalanceTrigger,
  type AllocationStatus,
  type ExecutionPlanStatus,
  type Channel,
  channels,
} from "@shared/schema";
import { eq, and, inArray, gte, lte, sql, desc, asc } from "drizzle-orm";
import { constraintManager } from "./constraint-manager";
import { portfolioOptimizer } from "./portfolio-optimizer";

// ============================================================================
// TYPES
// ============================================================================

interface ScheduledAction {
  allocationId: string;
  hcpId: string;
  hcpName: string;
  channel: Channel;
  actionType: string;
  plannedDate: Date;
  windowStart: Date | null;
  windowEnd: Date | null;
  estimatedCost: number;
  predictedLift: number;
  priority: number;
}

interface BookingResult {
  success: boolean;
  bookedCount: number;
  failedCount: number;
  errors: Array<{
    allocationId: string;
    reason: string;
  }>;
  budgetCommitted: number;
  capacityBooked: Record<string, number>;
}

interface PlanProgress {
  planId: string;
  status: ExecutionPlanStatus;
  totalActions: number;
  completedActions: number;
  failedActions: number;
  pendingActions: number;
  progressPercent: number;
  budgetSpent: number;
  budgetRemaining: number;
}

// ============================================================================
// EXECUTION PLANNER SERVICE
// ============================================================================

class ExecutionPlanner {
  /**
   * Create an execution plan from optimization results
   */
  async createPlan(
    resultId: string,
    name: string,
    description?: string,
    scheduledStartAt?: string
  ): Promise<ExecutionPlanApi> {
    // Verify result exists
    const result = await db
      .select()
      .from(optimizationResults)
      .where(eq(optimizationResults.id, resultId))
      .limit(1);

    if (result.length === 0) {
      throw new Error(`Optimization result ${resultId} not found`);
    }

    // Get allocations count
    const allocations = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(optimizationAllocations)
      .where(eq(optimizationAllocations.resultId, resultId));

    const totalActions = allocations[0]?.count ?? 0;

    // Calculate budget from allocations
    const budgetResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(estimated_cost), 0)::float`,
      })
      .from(optimizationAllocations)
      .where(eq(optimizationAllocations.resultId, resultId));

    const budgetAllocated = budgetResult[0]?.total ?? 0;

    // Create the execution plan
    const [plan] = await db
      .insert(executionPlans)
      .values({
        resultId,
        name,
        description: description ?? null,
        status: "draft" as const,
        scheduledStartAt: scheduledStartAt ? new Date(scheduledStartAt) : null,
        totalActions,
        budgetAllocated,
      })
      .returning();

    return this.toPlanApi(plan);
  }

  /**
   * Get an execution plan by ID
   */
  async getPlan(id: string): Promise<ExecutionPlanApi | null> {
    const [plan] = await db
      .select()
      .from(executionPlans)
      .where(eq(executionPlans.id, id))
      .limit(1);

    if (!plan) return null;
    return this.toPlanApi(plan);
  }

  /**
   * List execution plans with optional filters
   */
  async listPlans(options?: {
    status?: ExecutionPlanStatus;
    resultId?: string;
    limit?: number;
  }): Promise<ExecutionPlanApi[]> {
    const conditions = [];

    if (options?.status) {
      conditions.push(eq(executionPlans.status, options.status));
    }
    if (options?.resultId) {
      conditions.push(eq(executionPlans.resultId, options.resultId));
    }

    const plans = await db
      .select()
      .from(executionPlans)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(executionPlans.createdAt))
      .limit(options?.limit ?? 50);

    return plans.map((p) => this.toPlanApi(p));
  }

  /**
   * Schedule actions from allocations
   */
  async scheduleActions(resultId: string): Promise<ScheduledAction[]> {
    // Get allocations with HCP info
    const allocations = await db
      .select({
        allocation: optimizationAllocations,
        firstName: hcpProfiles.firstName,
        lastName: hcpProfiles.lastName,
      })
      .from(optimizationAllocations)
      .innerJoin(hcpProfiles, eq(optimizationAllocations.hcpId, hcpProfiles.id))
      .where(eq(optimizationAllocations.resultId, resultId))
      .orderBy(
        asc(optimizationAllocations.plannedDate),
        desc(optimizationAllocations.priority)
      );

    return allocations.map((row) => ({
      allocationId: row.allocation.id,
      hcpId: row.allocation.hcpId,
      hcpName: `${row.firstName} ${row.lastName}`,
      channel: row.allocation.channel as Channel,
      actionType: row.allocation.actionType,
      plannedDate: row.allocation.plannedDate,
      windowStart: row.allocation.windowStart,
      windowEnd: row.allocation.windowEnd,
      estimatedCost: row.allocation.estimatedCost ?? 0,
      predictedLift: row.allocation.predictedLift,
      priority: row.allocation.priority ?? 0,
    }));
  }

  /**
   * Book resources for plan execution
   */
  async bookResources(planId: string): Promise<BookingResult> {
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    // Get all allocations for this plan's result
    const allocations = await db
      .select()
      .from(optimizationAllocations)
      .where(eq(optimizationAllocations.resultId, plan.resultId));

    const errors: Array<{ allocationId: string; reason: string }> = [];
    let bookedCount = 0;
    let budgetCommitted = 0;
    const capacityBooked: Record<string, number> = {};

    for (const allocation of allocations) {
      try {
        // Check constraints
        const constraintCheck = await constraintManager.checkConstraints({
          hcpId: allocation.hcpId,
          channel: allocation.channel,
          actionType: allocation.actionType,
          plannedDate: allocation.plannedDate.toISOString(),
          estimatedCost: allocation.estimatedCost ?? undefined,
        });

        if (!constraintCheck.passed) {
          const violation = constraintCheck.violations[0];
          errors.push({
            allocationId: allocation.id,
            reason: violation?.reason ?? "Constraint check failed",
          });
          continue;
        }

        // Update allocation status to booked
        await db
          .update(optimizationAllocations)
          .set({ status: "booked" as AllocationStatus })
          .where(eq(optimizationAllocations.id, allocation.id));

        bookedCount++;
        budgetCommitted += allocation.estimatedCost ?? 0;
        capacityBooked[allocation.channel] =
          (capacityBooked[allocation.channel] ?? 0) + 1;
      } catch (err) {
        errors.push({
          allocationId: allocation.id,
          reason: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    // Update plan status to scheduled if successful
    if (bookedCount > 0) {
      await db
        .update(executionPlans)
        .set({
          status: "scheduled",
          updatedAt: new Date(),
        })
        .where(eq(executionPlans.id, planId));
    }

    return {
      success: errors.length === 0,
      bookedCount,
      failedCount: errors.length,
      errors,
      budgetCommitted,
      capacityBooked,
    };
  }

  /**
   * Release booked resources for a plan
   */
  async releaseResources(planId: string): Promise<void> {
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    // Reset allocation statuses back to planned
    await db
      .update(optimizationAllocations)
      .set({ status: "planned" as AllocationStatus })
      .where(
        and(
          eq(optimizationAllocations.resultId, plan.resultId),
          inArray(optimizationAllocations.status, ["booked", "executing"])
        )
      );

    // Update plan status back to draft
    await db
      .update(executionPlans)
      .set({
        status: "draft",
        updatedAt: new Date(),
      })
      .where(eq(executionPlans.id, planId));
  }

  /**
   * Execute a plan
   */
  async executePlan(planId: string): Promise<ExecutionReport> {
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    if (plan.status !== "scheduled" && plan.status !== "paused") {
      throw new Error(`Plan must be scheduled or paused to execute. Current status: ${plan.status}`);
    }

    // Update plan status to executing
    await db
      .update(executionPlans)
      .set({
        status: "executing",
        actualStartAt: plan.actualStartAt ? undefined : new Date(),
        updatedAt: new Date(),
      })
      .where(eq(executionPlans.id, planId));

    // Get booked allocations ordered by date and priority
    const allocations = await db
      .select({
        allocation: optimizationAllocations,
        firstName: hcpProfiles.firstName,
        lastName: hcpProfiles.lastName,
      })
      .from(optimizationAllocations)
      .innerJoin(hcpProfiles, eq(optimizationAllocations.hcpId, hcpProfiles.id))
      .where(
        and(
          eq(optimizationAllocations.resultId, plan.resultId),
          eq(optimizationAllocations.status, "booked")
        )
      )
      .orderBy(
        asc(optimizationAllocations.plannedDate),
        desc(optimizationAllocations.priority)
      );

    let completedCount = 0;
    let failedCount = 0;
    let budgetSpent = 0;
    const channelPerformance: Record<string, { completed: number; totalOutcome: number }> = {};
    const underperforming: Array<{
      hcpId: string;
      hcpName: string;
      expectedLift: number;
      actualLift: number;
      variance: number;
    }> = [];

    // Execute each allocation
    for (const row of allocations) {
      const allocation = row.allocation;
      const hcpName = `${row.firstName} ${row.lastName}`;

      try {
        // Update status to executing
        await db
          .update(optimizationAllocations)
          .set({ status: "executing" as AllocationStatus })
          .where(eq(optimizationAllocations.id, allocation.id));

        // Simulate execution (in production, this would trigger actual actions)
        // For now, we'll mark it as completed with a simulated outcome
        const simulatedOutcome = this.simulateOutcome(allocation.predictedLift, allocation.confidence);

        await db
          .update(optimizationAllocations)
          .set({
            status: "completed" as AllocationStatus,
            executedAt: new Date(),
            actualOutcome: simulatedOutcome,
          })
          .where(eq(optimizationAllocations.id, allocation.id));

        completedCount++;
        budgetSpent += allocation.estimatedCost ?? 0;

        // Track channel performance
        if (!channelPerformance[allocation.channel]) {
          channelPerformance[allocation.channel] = { completed: 0, totalOutcome: 0 };
        }
        channelPerformance[allocation.channel].completed++;
        channelPerformance[allocation.channel].totalOutcome += simulatedOutcome;

        // Track underperforming HCPs
        const variance = simulatedOutcome - allocation.predictedLift;
        if (variance < -0.05) {
          underperforming.push({
            hcpId: allocation.hcpId,
            hcpName,
            expectedLift: allocation.predictedLift,
            actualLift: simulatedOutcome,
            variance,
          });
        }
      } catch (err) {
        await db
          .update(optimizationAllocations)
          .set({ status: "failed" as AllocationStatus })
          .where(eq(optimizationAllocations.id, allocation.id));
        failedCount++;
      }
    }

    // Update plan progress
    const newCompletedActions = (plan.completedActions ?? 0) + completedCount;
    const newFailedActions = (plan.failedActions ?? 0) + failedCount;
    const allDone = newCompletedActions + newFailedActions >= plan.totalActions;

    await db
      .update(executionPlans)
      .set({
        status: allDone ? "completed" : "executing",
        completedActions: newCompletedActions,
        failedActions: newFailedActions,
        budgetSpent: (plan.budgetSpent ?? 0) + budgetSpent,
        actualEndAt: allDone ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(executionPlans.id, planId));

    // Build execution report
    const topPerformingChannels = Object.entries(channelPerformance)
      .map(([channel, data]) => ({
        channel: channel as Channel,
        completedActions: data.completed,
        avgOutcome: data.completed > 0 ? data.totalOutcome / data.completed : 0,
      }))
      .sort((a, b) => b.avgOutcome - a.avgOutcome)
      .slice(0, 5);

    const totalOutcome = Object.values(channelPerformance).reduce(
      (sum, data) => sum + data.totalOutcome,
      0
    );

    const report: ExecutionReport = {
      planId,
      status: allDone ? "completed" : "executing",
      totalActions: plan.totalActions,
      completedActions: newCompletedActions,
      failedActions: newFailedActions,
      pendingActions: plan.totalActions - newCompletedActions - newFailedActions,
      progressPercent: Math.round((newCompletedActions / plan.totalActions) * 100),
      predictedOutcome: plan.actualTotalLift ?? 0,
      actualOutcome: totalOutcome,
      outcomeVariance: plan.actualTotalLift ? totalOutcome - plan.actualTotalLift : null,
      budgetAllocated: plan.budgetAllocated ?? 0,
      budgetSpent: (plan.budgetSpent ?? 0) + budgetSpent,
      budgetRemaining: (plan.budgetAllocated ?? 0) - (plan.budgetSpent ?? 0) - budgetSpent,
      topPerformingChannels,
      underperformingHcps: underperforming.slice(0, 10),
      generatedAt: new Date().toISOString(),
    };

    return report;
  }

  /**
   * Pause a running plan
   */
  async pausePlan(planId: string): Promise<void> {
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    if (plan.status !== "executing") {
      throw new Error(`Can only pause executing plans. Current status: ${plan.status}`);
    }

    await db
      .update(executionPlans)
      .set({
        status: "paused",
        updatedAt: new Date(),
      })
      .where(eq(executionPlans.id, planId));
  }

  /**
   * Resume a paused plan
   */
  async resumePlan(planId: string): Promise<void> {
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    if (plan.status !== "paused") {
      throw new Error(`Can only resume paused plans. Current status: ${plan.status}`);
    }

    await db
      .update(executionPlans)
      .set({
        status: "executing",
        updatedAt: new Date(),
      })
      .where(eq(executionPlans.id, planId));
  }

  /**
   * Cancel a plan
   */
  async cancelPlan(planId: string): Promise<void> {
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    if (plan.status === "completed" || plan.status === "cancelled") {
      throw new Error(`Cannot cancel a ${plan.status} plan`);
    }

    // Cancel all pending allocations
    await db
      .update(optimizationAllocations)
      .set({ status: "cancelled" as AllocationStatus })
      .where(
        and(
          eq(optimizationAllocations.resultId, plan.resultId),
          inArray(optimizationAllocations.status, ["planned", "booked"])
        )
      );

    await db
      .update(executionPlans)
      .set({
        status: "cancelled",
        actualEndAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(executionPlans.id, planId));
  }

  /**
   * Get plan progress
   */
  async getPlanProgress(planId: string): Promise<PlanProgress> {
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    const pendingActions = plan.totalActions - plan.completedActions - plan.failedActions;
    const progressPercent =
      plan.totalActions > 0
        ? Math.round((plan.completedActions / plan.totalActions) * 100)
        : 0;

    return {
      planId,
      status: plan.status,
      totalActions: plan.totalActions,
      completedActions: plan.completedActions,
      failedActions: plan.failedActions,
      pendingActions,
      progressPercent,
      budgetSpent: plan.budgetSpent ?? 0,
      budgetRemaining: (plan.budgetAllocated ?? 0) - (plan.budgetSpent ?? 0),
    };
  }

  /**
   * Suggest rebalancing if needed
   */
  async suggestRebalance(planId: string): Promise<RebalanceSuggestion | null> {
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    if (plan.status !== "executing" && plan.status !== "paused") {
      return null;
    }

    // Get completed allocations with outcomes
    const completedAllocations = await db
      .select()
      .from(optimizationAllocations)
      .where(
        and(
          eq(optimizationAllocations.resultId, plan.resultId),
          eq(optimizationAllocations.status, "completed")
        )
      );

    if (completedAllocations.length < 10) {
      // Not enough data to suggest rebalancing
      return null;
    }

    // Calculate performance deviation
    let totalPredicted = 0;
    let totalActual = 0;
    let deviationCount = 0;

    for (const allocation of completedAllocations) {
      totalPredicted += allocation.predictedLift;
      totalActual += allocation.actualOutcome ?? 0;
      if (
        allocation.actualOutcome !== null &&
        Math.abs((allocation.actualOutcome - allocation.predictedLift) / allocation.predictedLift) > 0.2
      ) {
        deviationCount++;
      }
    }

    const performanceRatio = totalActual / totalPredicted;
    const deviationRate = deviationCount / completedAllocations.length;

    // Suggest rebalance if performance is significantly off
    if (performanceRatio < 0.8 || deviationRate > 0.3) {
      const pendingAllocations = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(optimizationAllocations)
        .where(
          and(
            eq(optimizationAllocations.resultId, plan.resultId),
            inArray(optimizationAllocations.status, ["planned", "booked"])
          )
        );

      const pendingCount = pendingAllocations[0]?.count ?? 0;

      return {
        planId,
        trigger: "outcome_deviation",
        reason: `Performance ${Math.round(performanceRatio * 100)}% of predicted. ${Math.round(deviationRate * 100)}% of actions significantly deviated.`,
        currentPerformance: totalActual,
        projectedPerformance: totalActual * 1.15, // Estimate 15% improvement
        improvementPercent: 15,
        actionsToModify: Math.round(pendingCount * 0.3),
        actionsToAdd: Math.round(pendingCount * 0.1),
        actionsToRemove: Math.round(pendingCount * 0.1),
        estimatedCostChange: 0, // Budget neutral
        confidence: 0.7,
        suggestedAt: new Date().toISOString(),
      };
    }

    return null;
  }

  /**
   * Rebalance a plan
   */
  async rebalancePlan(
    planId: string,
    trigger: RebalanceTrigger,
    reason?: string
  ): Promise<ExecutionPlanApi> {
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    if (plan.status !== "executing" && plan.status !== "paused") {
      throw new Error(`Can only rebalance executing or paused plans. Current status: ${plan.status}`);
    }

    // Get the original optimization problem
    const [result] = await db
      .select()
      .from(optimizationResults)
      .where(eq(optimizationResults.id, plan.resultId))
      .limit(1);

    if (!result) {
      throw new Error("Optimization result not found");
    }

    // Cancel remaining planned/booked allocations
    await db
      .update(optimizationAllocations)
      .set({ status: "cancelled" as AllocationStatus })
      .where(
        and(
          eq(optimizationAllocations.resultId, plan.resultId),
          inArray(optimizationAllocations.status, ["planned", "booked"])
        )
      );

    // Re-solve with updated constraints (in a real system, this would incorporate learnings)
    // For now, we'll just update the plan metadata
    await db
      .update(executionPlans)
      .set({
        lastRebalanceAt: new Date(),
        rebalanceCount: (plan.rebalanceCount ?? 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(executionPlans.id, planId));

    return (await this.getPlan(planId))!;
  }

  /**
   * Delete a plan (only draft plans)
   */
  async deletePlan(planId: string): Promise<void> {
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    if (plan.status !== "draft") {
      throw new Error(`Can only delete draft plans. Current status: ${plan.status}`);
    }

    await db.delete(executionPlans).where(eq(executionPlans.id, planId));
  }

  /**
   * Get execution report for a plan
   */
  async getExecutionReport(planId: string): Promise<ExecutionReport> {
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    // Get completed allocations with HCP names
    const completedAllocations = await db
      .select({
        allocation: optimizationAllocations,
        firstName: hcpProfiles.firstName,
        lastName: hcpProfiles.lastName,
      })
      .from(optimizationAllocations)
      .innerJoin(hcpProfiles, eq(optimizationAllocations.hcpId, hcpProfiles.id))
      .where(
        and(
          eq(optimizationAllocations.resultId, plan.resultId),
          eq(optimizationAllocations.status, "completed")
        )
      );

    // Calculate channel performance
    const channelPerformance: Record<string, { completed: number; totalOutcome: number }> = {};
    const underperforming: Array<{
      hcpId: string;
      hcpName: string;
      expectedLift: number;
      actualLift: number;
      variance: number;
    }> = [];

    let totalPredicted = 0;
    let totalActual = 0;

    for (const row of completedAllocations) {
      const allocation = row.allocation;
      const hcpName = `${row.firstName} ${row.lastName}`;
      const outcome = allocation.actualOutcome ?? 0;

      totalPredicted += allocation.predictedLift;
      totalActual += outcome;

      if (!channelPerformance[allocation.channel]) {
        channelPerformance[allocation.channel] = { completed: 0, totalOutcome: 0 };
      }
      channelPerformance[allocation.channel].completed++;
      channelPerformance[allocation.channel].totalOutcome += outcome;

      const variance = outcome - allocation.predictedLift;
      if (variance < -0.05) {
        underperforming.push({
          hcpId: allocation.hcpId,
          hcpName,
          expectedLift: allocation.predictedLift,
          actualLift: outcome,
          variance,
        });
      }
    }

    const topPerformingChannels = Object.entries(channelPerformance)
      .map(([channel, data]) => ({
        channel: channel as Channel,
        completedActions: data.completed,
        avgOutcome: data.completed > 0 ? data.totalOutcome / data.completed : 0,
      }))
      .sort((a, b) => b.avgOutcome - a.avgOutcome)
      .slice(0, 5);

    return {
      planId,
      status: plan.status,
      totalActions: plan.totalActions,
      completedActions: plan.completedActions,
      failedActions: plan.failedActions,
      pendingActions: plan.totalActions - plan.completedActions - plan.failedActions,
      progressPercent: plan.progressPercent,
      predictedOutcome: totalPredicted,
      actualOutcome: totalActual,
      outcomeVariance: totalPredicted > 0 ? totalActual - totalPredicted : null,
      budgetAllocated: plan.budgetAllocated ?? 0,
      budgetSpent: plan.budgetSpent ?? 0,
      budgetRemaining: (plan.budgetAllocated ?? 0) - (plan.budgetSpent ?? 0),
      topPerformingChannels,
      underperformingHcps: underperforming
        .sort((a, b) => a.variance - b.variance)
        .slice(0, 10),
      generatedAt: new Date().toISOString(),
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private simulateOutcome(predictedLift: number, confidence: number): number {
    // Simulate outcome with variance based on confidence
    const variance = (1 - confidence) * 0.5; // Higher confidence = less variance
    const randomFactor = 1 + (Math.random() - 0.5) * variance;
    return Math.max(0, predictedLift * randomFactor);
  }

  private toPlanApi(plan: ExecutionPlan): ExecutionPlanApi {
    const progressPercent =
      plan.totalActions > 0
        ? Math.round((plan.completedActions / plan.totalActions) * 100)
        : 0;

    return {
      id: plan.id,
      resultId: plan.resultId,
      name: plan.name,
      description: plan.description,
      status: plan.status as ExecutionPlanStatus,
      scheduledStartAt: plan.scheduledStartAt?.toISOString() ?? null,
      scheduledEndAt: plan.scheduledEndAt?.toISOString() ?? null,
      actualStartAt: plan.actualStartAt?.toISOString() ?? null,
      actualEndAt: plan.actualEndAt?.toISOString() ?? null,
      totalActions: plan.totalActions,
      completedActions: plan.completedActions,
      failedActions: plan.failedActions,
      progressPercent,
      budgetAllocated: plan.budgetAllocated,
      budgetSpent: plan.budgetSpent,
      actualTotalLift: plan.actualTotalLift,
      actualEngagementRate: plan.actualEngagementRate,
      rebalanceCount: plan.rebalanceCount ?? 0,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    };
  }
}

export const executionPlanner = new ExecutionPlanner();
