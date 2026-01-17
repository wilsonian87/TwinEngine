/**
 * Portfolio Optimizer Service
 *
 * Phase 7F: The capstone optimization layer that maximizes portfolio outcomes under constraints.
 * - Greedy solver for fast approximate solutions
 * - Local search for improved quality
 * - Constraint checking and violation detection
 * - Sensitivity analysis
 * - What-if analysis
 */

import { db } from "../db";
import {
  optimizationProblems,
  optimizationResults,
  optimizationAllocations,
  hcpProfiles,
  savedAudiences,
  campaigns,
  budgetAllocations,
  channelCapacity,
  complianceWindows,
  hcpContactLimits,
  hcpReservations,
  type OptimizationProblem,
  type OptimizationResult,
  type OptimizationAllocation,
  type InsertOptimizationProblem,
  type InsertOptimizationResult,
  type InsertOptimizationAllocation,
  type OptimizationProblemApi,
  type OptimizationResultApi,
  type OptimizationAllocationApi,
  type ConstraintViolation,
  type SensitivityReport,
  type WhatIfResult,
  type CreateOptimizationProblemRequest,
  type SolveOptimizationRequest,
  type WhatIfRequest,
  type ObjectiveMetric,
  type SolverType,
  type Channel,
  channels,
} from "@shared/schema";
import { eq, and, inArray, gte, lte, sql, desc } from "drizzle-orm";
import { predictStimuliImpact } from "./prediction-engine";
import { uncertaintyCalculator } from "./uncertainty-calculator";
import { constraintManager } from "./constraint-manager";

// ============================================================================
// TYPES
// ============================================================================

interface HcpCandidate {
  hcpId: string;
  hcpName: string;
  channel: Channel;
  predictedLift: number;
  confidence: number;
  explorationValue: number;
  estimatedCost: number;
  isExploration: boolean;
}

interface AllocationCandidate extends HcpCandidate {
  priority: number;
  selectionReason: string;
}

interface SolverOptions {
  solver?: SolverType;
  maxIterations?: number;
  maxTimeMs?: number;
  earlyStopThreshold?: number;
}

interface ConstraintContext {
  budgetLimit: number | null;
  budgetUsed: number;
  channelCapacity: Map<Channel, number>;
  channelUsed: Map<Channel, number>;
  hcpContacts: Map<string, number>;
  contactLimits: Map<string, number>;
  reservedHcps: Set<string>;
  complianceBlocked: Set<string>;
}

// Channel costs (simplified)
const CHANNEL_COSTS: Record<Channel, number> = {
  email: 5,
  rep_visit: 150,
  webinar: 25,
  conference: 500,
  digital_ad: 10,
  phone: 30,
};

// ============================================================================
// PORTFOLIO OPTIMIZER SERVICE
// ============================================================================

class PortfolioOptimizer {
  // ==========================================================================
  // PROBLEM MANAGEMENT
  // ==========================================================================

  /**
   * Create a new optimization problem
   */
  async createProblem(request: CreateOptimizationProblemRequest): Promise<OptimizationProblemApi> {
    // Get HCP count
    let hcpIds: string[] = [];

    if (request.hcpIds && request.hcpIds.length > 0) {
      hcpIds = request.hcpIds;
    } else if (request.audienceId) {
      const [audience] = await db
        .select()
        .from(savedAudiences)
        .where(eq(savedAudiences.id, request.audienceId));
      if (audience && audience.hcpIds) {
        hcpIds = audience.hcpIds;
      }
    }

    const [problem] = await db
      .insert(optimizationProblems)
      .values({
        name: request.name,
        description: request.description,
        audienceId: request.audienceId,
        campaignId: request.campaignId,
        hcpIds: hcpIds.length > 0 ? hcpIds : null,
        objectiveMetric: request.objectiveMetric,
        objectiveSense: request.objectiveSense || "maximize",
        budgetLimit: request.budgetLimit,
        explorationBudgetPct: request.explorationBudgetPct,
        planningHorizonDays: request.planningHorizonDays || 30,
        startDate: request.startDate ? new Date(request.startDate) : null,
        endDate: request.endDate ? new Date(request.endDate) : null,
        preferredSolver: request.preferredSolver || "greedy",
        maxSolveTimeMs: request.maxSolveTimeMs,
        includeContactLimits: request.includeContactLimits === false ? 0 : 1,
        includeComplianceWindows: request.includeComplianceWindows === false ? 0 : 1,
        respectReservations: request.respectReservations === false ? 0 : 1,
        status: "draft",
      })
      .returning();

    return this.toProblemApi(problem, hcpIds.length);
  }

  /**
   * Get optimization problem by ID
   */
  async getProblem(id: string): Promise<OptimizationProblemApi | null> {
    const [problem] = await db
      .select()
      .from(optimizationProblems)
      .where(eq(optimizationProblems.id, id));

    if (!problem) return null;

    const hcpCount = await this.getHcpCount(problem);
    return this.toProblemApi(problem, hcpCount);
  }

  /**
   * List optimization problems
   */
  async listProblems(options?: { status?: string; limit?: number }): Promise<OptimizationProblemApi[]> {
    const conditions = [];
    if (options?.status) {
      conditions.push(eq(optimizationProblems.status, options.status as any));
    }

    const problems = await db
      .select()
      .from(optimizationProblems)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(optimizationProblems.createdAt))
      .limit(options?.limit || 50);

    const results: OptimizationProblemApi[] = [];
    for (const problem of problems) {
      const hcpCount = await this.getHcpCount(problem);
      results.push(this.toProblemApi(problem, hcpCount));
    }
    return results;
  }

  /**
   * Update problem status
   */
  async updateProblemStatus(id: string, status: string): Promise<void> {
    await db
      .update(optimizationProblems)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(optimizationProblems.id, id));
  }

  /**
   * Delete a problem
   */
  async deleteProblem(id: string): Promise<void> {
    // Delete allocations first
    const results = await db
      .select({ id: optimizationResults.id })
      .from(optimizationResults)
      .where(eq(optimizationResults.problemId, id));

    for (const result of results) {
      await db.delete(optimizationAllocations).where(eq(optimizationAllocations.resultId, result.id));
    }

    await db.delete(optimizationResults).where(eq(optimizationResults.problemId, id));
    await db.delete(optimizationProblems).where(eq(optimizationProblems.id, id));
  }

  // ==========================================================================
  // SOLVING
  // ==========================================================================

  /**
   * Solve an optimization problem
   */
  async solve(problemId: string, options?: SolverOptions): Promise<OptimizationResultApi> {
    const [problem] = await db
      .select()
      .from(optimizationProblems)
      .where(eq(optimizationProblems.id, problemId));

    if (!problem) {
      throw new Error("Problem not found");
    }

    // Mark as solving
    await this.updateProblemStatus(problemId, "solving");

    const startTime = Date.now();
    const solver = options?.solver || problem.preferredSolver || "greedy";
    const maxTimeMs = options?.maxTimeMs || problem.maxSolveTimeMs || 30000;

    try {
      // Get HCPs to optimize
      const hcpIds = await this.getHcpIds(problem);
      if (hcpIds.length === 0) {
        throw new Error("No HCPs to optimize");
      }

      // Build constraint context
      const constraintContext = await this.buildConstraintContext(problem);

      // Generate candidates
      const candidates = await this.generateCandidates(hcpIds, problem, constraintContext);

      // Solve based on solver type
      let allocations: AllocationCandidate[];
      let iterations = 0;

      if (solver === "greedy") {
        const result = this.solveGreedy(candidates, constraintContext, problem);
        allocations = result.allocations;
        iterations = result.iterations;
      } else if (solver === "local_search") {
        const greedyResult = this.solveGreedy(candidates, constraintContext, problem);
        const localResult = this.solveLocalSearch(
          greedyResult.allocations,
          candidates,
          constraintContext,
          problem,
          options?.maxIterations || 1000,
          maxTimeMs - (Date.now() - startTime)
        );
        allocations = localResult.allocations;
        iterations = greedyResult.iterations + localResult.iterations;
      } else {
        // Default to greedy
        const result = this.solveGreedy(candidates, constraintContext, problem);
        allocations = result.allocations;
        iterations = result.iterations;
      }

      // Calculate objective value
      const objectiveValue = this.calculateObjective(allocations, problem.objectiveMetric);

      // Check constraint violations
      const violations = this.checkConstraints(allocations, constraintContext, problem);

      // Store result
      const solveTimeMs = Date.now() - startTime;
      const result = await this.storeResult(problem, solver, allocations, objectiveValue, violations, solveTimeMs, iterations);

      // Mark as solved
      await this.updateProblemStatus(problemId, "solved");

      return result;
    } catch (error) {
      await this.updateProblemStatus(problemId, "failed");
      throw error;
    }
  }

  /**
   * Greedy solver - fast approximate solution
   */
  private solveGreedy(
    candidates: HcpCandidate[],
    context: ConstraintContext,
    problem: OptimizationProblem
  ): { allocations: AllocationCandidate[]; iterations: number } {
    const allocations: AllocationCandidate[] = [];
    const usedContext = this.cloneContext(context);

    // Sort candidates by value (considering exploration)
    const explorationBudget = (problem.explorationBudgetPct || 10) / 100;
    const explorationTarget = Math.floor(candidates.length * explorationBudget);

    // Separate exploration and exploitation candidates
    const explorationCandidates = candidates
      .filter(c => c.isExploration)
      .sort((a, b) => b.explorationValue - a.explorationValue);

    const exploitationCandidates = candidates
      .filter(c => !c.isExploration)
      .sort((a, b) => b.predictedLift - a.predictedLift);

    let iterations = 0;
    let explorationCount = 0;

    // First, add exploration candidates up to budget
    for (const candidate of explorationCandidates) {
      iterations++;
      if (explorationCount >= explorationTarget) break;

      if (this.canAllocate(candidate, usedContext, problem)) {
        allocations.push({
          ...candidate,
          priority: allocations.length,
          selectionReason: `Exploration: high uncertainty (value=${candidate.explorationValue.toFixed(2)})`,
        });
        this.applyAllocation(candidate, usedContext);
        explorationCount++;
      }
    }

    // Then add exploitation candidates
    for (const candidate of exploitationCandidates) {
      iterations++;

      if (this.canAllocate(candidate, usedContext, problem)) {
        allocations.push({
          ...candidate,
          priority: allocations.length,
          selectionReason: `Exploitation: high predicted lift (${candidate.predictedLift.toFixed(2)})`,
        });
        this.applyAllocation(candidate, usedContext);
      }
    }

    return { allocations, iterations };
  }

  /**
   * Local search solver - improves on greedy solution
   */
  private solveLocalSearch(
    initialAllocations: AllocationCandidate[],
    allCandidates: HcpCandidate[],
    context: ConstraintContext,
    problem: OptimizationProblem,
    maxIterations: number,
    maxTimeMs: number
  ): { allocations: AllocationCandidate[]; iterations: number } {
    let currentAllocations = [...initialAllocations];
    let currentObjective = this.calculateObjective(currentAllocations, problem.objectiveMetric);

    const startTime = Date.now();
    let iterations = 0;
    let improved = true;

    while (improved && iterations < maxIterations && (Date.now() - startTime) < maxTimeMs) {
      improved = false;
      iterations++;

      // Try swapping allocations
      for (let i = 0; i < currentAllocations.length; i++) {
        const current = currentAllocations[i];

        // Find alternative candidates for this HCP
        const alternatives = allCandidates.filter(
          c => c.hcpId === current.hcpId && c.channel !== current.channel
        );

        for (const alt of alternatives) {
          // Try swap
          const newAllocations = [...currentAllocations];
          newAllocations[i] = {
            ...alt,
            priority: current.priority,
            selectionReason: `Local search swap from ${current.channel}`,
          };

          // Check feasibility
          const testContext = this.cloneContext(context);
          let feasible = true;
          for (const alloc of newAllocations) {
            if (!this.canAllocate(alloc, testContext, problem)) {
              feasible = false;
              break;
            }
            this.applyAllocation(alloc, testContext);
          }

          if (feasible) {
            const newObjective = this.calculateObjective(newAllocations, problem.objectiveMetric);
            if (newObjective > currentObjective) {
              currentAllocations = newAllocations;
              currentObjective = newObjective;
              improved = true;
              break;
            }
          }
        }

        if (improved) break;
      }
    }

    return { allocations: currentAllocations, iterations };
  }

  // ==========================================================================
  // CANDIDATE GENERATION
  // ==========================================================================

  /**
   * Generate allocation candidates for HCPs
   */
  private async generateCandidates(
    hcpIds: string[],
    problem: OptimizationProblem,
    context: ConstraintContext
  ): Promise<HcpCandidate[]> {
    const candidates: HcpCandidate[] = [];

    // Get HCP profiles
    const hcps = await db
      .select()
      .from(hcpProfiles)
      .where(inArray(hcpProfiles.id, hcpIds));

    const hcpMap = new Map(hcps.map(h => [h.id, h]));

    // Get uncertainty metrics for exploration
    const uncertaintyMap = new Map<string, number>();
    for (const hcpId of hcpIds) {
      try {
        const uncertainty = await uncertaintyCalculator.calculateUncertainty(hcpId);
        uncertaintyMap.set(hcpId, uncertainty.totalUncertainty);
      } catch {
        uncertaintyMap.set(hcpId, 0.5); // Default uncertainty
      }
    }

    // Generate candidates for each HCP-channel combination
    for (const hcpId of hcpIds) {
      const hcp = hcpMap.get(hcpId);
      if (!hcp) continue;

      // Skip if HCP is reserved and we respect reservations
      if (problem.respectReservations && context.reservedHcps.has(hcpId)) {
        continue;
      }

      // Skip if HCP is compliance blocked
      if (problem.includeComplianceWindows && context.complianceBlocked.has(hcpId)) {
        continue;
      }

      const uncertainty = uncertaintyMap.get(hcpId) || 0.5;
      const isExploration = uncertainty > 0.6; // High uncertainty = exploration candidate

      for (const channel of channels) {
        // Skip if channel at capacity
        const capacity = context.channelCapacity.get(channel) || Infinity;
        const used = context.channelUsed.get(channel) || 0;
        if (used >= capacity) continue;

        // Map channel to stimulus type
        const stimulusTypeMap: Record<Channel, string> = {
          email: "email_send",
          rep_visit: "rep_visit",
          webinar: "webinar_invite",
          conference: "conference_meeting",
          digital_ad: "digital_ad_impression",
          phone: "phone_call",
        };
        const stimulusType = stimulusTypeMap[channel] as any;

        // Predict lift - need to construct HCPProfile from our hcp data
        const hcpProfile = {
          ...hcp,
          channelPreference: hcp.channelPreference || channel,
        } as any;

        const prediction = predictStimuliImpact(hcpProfile, stimulusType, channel);

        const predictedLift = this.getMetricValue(prediction, problem.objectiveMetric);
        // Calculate confidence from confidence interval
        const confidence = 1 - Math.abs(prediction.confidenceUpper - prediction.confidenceLower) / 2;
        const estimatedCost = CHANNEL_COSTS[channel];

        // Calculate exploration value (UCB-style)
        const explorationValue = predictedLift + 2 * uncertainty;

        candidates.push({
          hcpId,
          hcpName: `${hcp.firstName} ${hcp.lastName}`,
          channel,
          predictedLift,
          confidence,
          explorationValue,
          estimatedCost,
          isExploration,
        });
      }
    }

    return candidates;
  }

  // ==========================================================================
  // CONSTRAINT MANAGEMENT
  // ==========================================================================

  /**
   * Build constraint context from problem
   */
  private async buildConstraintContext(problem: OptimizationProblem): Promise<ConstraintContext> {
    const context: ConstraintContext = {
      budgetLimit: problem.budgetLimit,
      budgetUsed: 0,
      channelCapacity: new Map(),
      channelUsed: new Map(),
      hcpContacts: new Map(),
      contactLimits: new Map(),
      reservedHcps: new Set(),
      complianceBlocked: new Set(),
    };

    // Load capacity constraints
    if (problem.capacityConstraintIds && problem.capacityConstraintIds.length > 0) {
      const capacities = await db
        .select()
        .from(channelCapacity)
        .where(inArray(channelCapacity.id, problem.capacityConstraintIds));

      for (const cap of capacities) {
        if (cap.channel) {
          context.channelCapacity.set(cap.channel as Channel, cap.dailyLimit ?? Infinity);
        }
      }
    }

    // Load contact limits
    if (problem.includeContactLimits) {
      const limits = await db.select().from(hcpContactLimits);
      for (const limit of limits) {
        if (limit.hcpId) {
          context.contactLimits.set(limit.hcpId, limit.maxTouchesPerMonth ?? 10);
        }
      }
    }

    // Load reservations
    if (problem.respectReservations) {
      const reservations = await db
        .select()
        .from(hcpReservations)
        .where(eq(hcpReservations.status, "active"));

      for (const res of reservations) {
        if (res.reservationType === "exclusive") {
          context.reservedHcps.add(res.hcpId);
        }
      }
    }

    // Load compliance windows
    if (problem.includeComplianceWindows) {
      const now = new Date();
      const windows = await db
        .select()
        .from(complianceWindows)
        .where(and(
          lte(complianceWindows.startDate, now),
          gte(complianceWindows.endDate, now)
        ));

      for (const window of windows) {
        if (window.affectedHcpIds && Array.isArray(window.affectedHcpIds)) {
          for (const hcpId of window.affectedHcpIds) {
            context.complianceBlocked.add(hcpId);
          }
        }
      }
    }

    return context;
  }

  /**
   * Check if allocation is feasible
   */
  private canAllocate(
    candidate: HcpCandidate,
    context: ConstraintContext,
    problem: OptimizationProblem
  ): boolean {
    // Budget check
    if (context.budgetLimit !== null) {
      if (context.budgetUsed + candidate.estimatedCost > context.budgetLimit) {
        return false;
      }
    }

    // Channel capacity check
    const capacity = context.channelCapacity.get(candidate.channel);
    if (capacity !== undefined) {
      const used = context.channelUsed.get(candidate.channel) || 0;
      if (used >= capacity) {
        return false;
      }
    }

    // Contact limit check
    if (problem.includeContactLimits) {
      const limit = context.contactLimits.get(candidate.hcpId);
      if (limit !== undefined) {
        const contacts = context.hcpContacts.get(candidate.hcpId) || 0;
        if (contacts >= limit) {
          return false;
        }
      }
    }

    // Reservation check
    if (problem.respectReservations && context.reservedHcps.has(candidate.hcpId)) {
      return false;
    }

    // Compliance check
    if (problem.includeComplianceWindows && context.complianceBlocked.has(candidate.hcpId)) {
      return false;
    }

    return true;
  }

  /**
   * Apply allocation to context
   */
  private applyAllocation(candidate: HcpCandidate, context: ConstraintContext): void {
    context.budgetUsed += candidate.estimatedCost;

    const channelUsed = context.channelUsed.get(candidate.channel) || 0;
    context.channelUsed.set(candidate.channel, channelUsed + 1);

    const hcpContacts = context.hcpContacts.get(candidate.hcpId) || 0;
    context.hcpContacts.set(candidate.hcpId, hcpContacts + 1);
  }

  /**
   * Check constraints and return violations
   */
  private checkConstraints(
    allocations: AllocationCandidate[],
    context: ConstraintContext,
    problem: OptimizationProblem
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    // Budget violation
    const totalCost = allocations.reduce((sum, a) => sum + a.estimatedCost, 0);
    if (context.budgetLimit !== null && totalCost > context.budgetLimit) {
      violations.push({
        constraintType: "budget",
        severity: "error",
        message: `Budget exceeded: ${totalCost.toFixed(2)} > ${context.budgetLimit}`,
        affectedCount: allocations.length,
      });
    }

    // Channel capacity violations
    const channelCounts = new Map<Channel, number>();
    for (const alloc of allocations) {
      const count = channelCounts.get(alloc.channel) || 0;
      channelCounts.set(alloc.channel, count + 1);
    }

    for (const [channel, count] of Array.from(channelCounts.entries())) {
      const capacity = context.channelCapacity.get(channel);
      if (capacity !== undefined && count > capacity) {
        violations.push({
          constraintType: "capacity",
          severity: "error",
          message: `Channel ${channel} capacity exceeded: ${count} > ${capacity}`,
          affectedCount: count - capacity,
        });
      }
    }

    return violations;
  }

  // ==========================================================================
  // OBJECTIVE CALCULATION
  // ==========================================================================

  /**
   * Calculate objective value
   */
  private calculateObjective(allocations: AllocationCandidate[], metric: ObjectiveMetric): number {
    if (allocations.length === 0) return 0;

    switch (metric) {
      case "total_engagement_lift":
        return allocations.reduce((sum, a) => sum + a.predictedLift, 0);
      case "roi":
        const totalLift = allocations.reduce((sum, a) => sum + a.predictedLift, 0);
        const totalCost = allocations.reduce((sum, a) => sum + a.estimatedCost, 0);
        return totalCost > 0 ? totalLift / totalCost : 0;
      case "reach":
        return new Set(allocations.map(a => a.hcpId)).size;
      case "response_rate":
        return allocations.reduce((sum, a) => sum + a.predictedLift, 0) / allocations.length;
      case "rx_lift":
        return allocations.reduce((sum, a) => sum + a.predictedLift * 0.1, 0); // Simplified
      default:
        return allocations.reduce((sum, a) => sum + a.predictedLift, 0);
    }
  }

  /**
   * Get metric value from prediction
   */
  private getMetricValue(prediction: any, metric: ObjectiveMetric): number {
    switch (metric) {
      case "total_engagement_lift":
      case "response_rate":
        return prediction.predictedDelta || 0;
      case "roi":
        return prediction.predictedDelta || 0;
      case "reach":
        return 1;
      case "rx_lift":
        return (prediction.predictedDelta || 0) * 0.1;
      default:
        return prediction.predictedDelta || 0;
    }
  }

  // ==========================================================================
  // RESULT STORAGE
  // ==========================================================================

  /**
   * Store optimization result
   */
  private async storeResult(
    problem: OptimizationProblem,
    solver: SolverType,
    allocations: AllocationCandidate[],
    objectiveValue: number,
    violations: ConstraintViolation[],
    solveTimeMs: number,
    iterations: number
  ): Promise<OptimizationResultApi> {
    // Calculate summary metrics
    const actionsByChannel: Record<string, number> = {};
    for (const alloc of allocations) {
      actionsByChannel[alloc.channel] = (actionsByChannel[alloc.channel] || 0) + 1;
    }

    const totalBudgetUsed = allocations.reduce((sum, a) => sum + a.estimatedCost, 0);
    const budgetUtilization = problem.budgetLimit
      ? (totalBudgetUsed / problem.budgetLimit) * 100
      : null;

    const explorationAllocations = allocations.filter(a => a.isExploration);
    const explorationBudgetUsed = explorationAllocations.reduce((sum, a) => sum + a.estimatedCost, 0);

    const uniqueHcps = new Set(allocations.map(a => a.hcpId));

    // Store result
    const [result] = await db
      .insert(optimizationResults)
      .values({
        problemId: problem.id,
        solverType: solver,
        objectiveValue,
        feasible: violations.filter(v => v.severity === "error").length === 0 ? 1 : 0,
        optimalityGap: null, // Would need LP solver for this
        totalActions: allocations.length,
        totalHcps: uniqueHcps.size,
        actionsByChannel,
        totalBudgetUsed,
        budgetUtilization,
        predictedTotalLift: allocations.reduce((sum, a) => sum + a.predictedLift, 0),
        predictedEngagementRate: allocations.length > 0
          ? allocations.reduce((sum, a) => sum + a.predictedLift, 0) / allocations.length
          : 0,
        predictedResponseRate: allocations.length > 0
          ? allocations.filter(a => a.predictedLift > 0.5).length / allocations.length
          : 0,
        explorationActions: explorationAllocations.length,
        explorationBudgetUsed,
        constraintViolations: violations,
        solveTimeMs,
        iterations,
      })
      .returning();

    // Store allocations
    const plannedDate = problem.startDate || new Date();
    const allocationRecords = allocations.map(alloc => ({
      resultId: result.id,
      hcpId: alloc.hcpId,
      channel: alloc.channel as Channel,
      actionType: `${alloc.channel}_outreach`,
      plannedDate,
      predictedLift: alloc.predictedLift,
      confidence: alloc.confidence,
      isExploration: alloc.isExploration ? 1 : 0,
      estimatedCost: alloc.estimatedCost,
      status: "planned" as const,
      selectionReason: alloc.selectionReason,
      priority: alloc.priority,
    }));

    if (allocationRecords.length > 0) {
      // Insert in batches
      for (let i = 0; i < allocationRecords.length; i += 100) {
        const batch = allocationRecords.slice(i, i + 100);
        await db.insert(optimizationAllocations).values(batch);
      }
    }

    return this.toResultApi(result, problem.name);
  }

  // ==========================================================================
  // RESULT QUERIES
  // ==========================================================================

  /**
   * Get optimization result by ID
   */
  async getResult(id: string): Promise<OptimizationResultApi | null> {
    const [result] = await db
      .select()
      .from(optimizationResults)
      .where(eq(optimizationResults.id, id));

    if (!result) return null;

    const [problem] = await db
      .select()
      .from(optimizationProblems)
      .where(eq(optimizationProblems.id, result.problemId));

    return this.toResultApi(result, problem?.name || "Unknown");
  }

  /**
   * Get allocations for a result
   */
  async getAllocations(
    resultId: string,
    options?: { limit?: number; offset?: number; channel?: Channel }
  ): Promise<OptimizationAllocationApi[]> {
    const conditions = [eq(optimizationAllocations.resultId, resultId)];
    if (options?.channel) {
      conditions.push(eq(optimizationAllocations.channel, options.channel));
    }

    const allocations = await db
      .select()
      .from(optimizationAllocations)
      .where(and(...conditions))
      .orderBy(optimizationAllocations.priority)
      .limit(options?.limit || 100)
      .offset(options?.offset || 0);

    // Get HCP names
    const hcpIds = allocations.map(a => a.hcpId);
    const hcps = hcpIds.length > 0
      ? await db.select().from(hcpProfiles).where(inArray(hcpProfiles.id, hcpIds))
      : [];
    const hcpMap = new Map(hcps.map(h => [h.id, `${h.firstName} ${h.lastName}`]));

    return allocations.map(a => this.toAllocationApi(a, hcpMap.get(a.hcpId) || "Unknown"));
  }

  // ==========================================================================
  // WHAT-IF ANALYSIS
  // ==========================================================================

  /**
   * Perform what-if analysis
   */
  async whatIf(resultId: string, request: WhatIfRequest): Promise<WhatIfResult> {
    const [result] = await db
      .select()
      .from(optimizationResults)
      .where(eq(optimizationResults.id, resultId));

    if (!result) {
      throw new Error("Result not found");
    }

    const [problem] = await db
      .select()
      .from(optimizationProblems)
      .where(eq(optimizationProblems.id, result.problemId));

    if (!problem) {
      throw new Error("Problem not found");
    }

    const originalObjective = result.objectiveValue;
    let newObjective = originalObjective;
    let newViolations: { constraintType: string; message: string }[] = [];
    let resolvedViolations: string[] = [];
    let feasibilityChanged = false;
    let affectedAllocations = 0;
    let recommendation = "";

    switch (request.type) {
      case "add_budget":
        if (request.additionalBudget) {
          // Estimate improvement from additional budget
          const budgetIncrease = request.additionalBudget;
          const marginalLiftPerDollar = originalObjective / (result.totalBudgetUsed || 1);
          const potentialImprovement = budgetIncrease * marginalLiftPerDollar * 0.8; // Diminishing returns
          newObjective = originalObjective + potentialImprovement;
          affectedAllocations = Math.floor(budgetIncrease / 50); // Rough estimate
          recommendation = `Adding $${budgetIncrease} could improve objective by ~${potentialImprovement.toFixed(2)} (${((potentialImprovement / originalObjective) * 100).toFixed(1)}%)`;
        }
        break;

      case "remove_constraint":
        if (result.constraintViolations && result.constraintViolations.length > 0) {
          const violation = result.constraintViolations.find(
            v => v.constraintId === request.constraintIdToRemove || v.constraintType === request.constraintIdToRemove
          );
          if (violation) {
            resolvedViolations.push(violation.message);
            feasibilityChanged = true;
            newObjective = originalObjective * 1.1; // Estimate 10% improvement
            recommendation = `Removing ${violation.constraintType} constraint could improve objective by ~10%`;
          }
        }
        break;

      case "change_objective":
        if (request.newObjectiveMetric) {
          recommendation = `Changing objective to ${request.newObjectiveMetric} would require re-solving. Current solution may not be optimal for new objective.`;
        }
        break;
    }

    const improvement = newObjective - originalObjective;
    const improvementPercent = originalObjective > 0 ? (improvement / originalObjective) * 100 : 0;

    return {
      originalObjectiveValue: originalObjective,
      newObjectiveValue: newObjective,
      improvement,
      improvementPercent,
      feasibilityChanged,
      newViolations,
      resolvedViolations,
      affectedAllocations,
      recommendation,
    };
  }

  // ==========================================================================
  // SENSITIVITY ANALYSIS
  // ==========================================================================

  /**
   * Analyze sensitivity of solution
   */
  async analyzeSensitivity(resultId: string): Promise<SensitivityReport> {
    const [result] = await db
      .select()
      .from(optimizationResults)
      .where(eq(optimizationResults.id, resultId));

    if (!result) {
      throw new Error("Result not found");
    }

    const [problem] = await db
      .select()
      .from(optimizationProblems)
      .where(eq(optimizationProblems.id, result.problemId));

    if (!problem) {
      throw new Error("Problem not found");
    }

    // Get allocations
    const allocations = await db
      .select()
      .from(optimizationAllocations)
      .where(eq(optimizationAllocations.resultId, resultId));

    // Budget sensitivity
    const budgetSensitivity = problem.budgetLimit ? {
      currentBudget: result.totalBudgetUsed || 0,
      marginalValuePerDollar: result.objectiveValue / (result.totalBudgetUsed || 1),
      optimalBudget: (result.totalBudgetUsed || 0) * 1.2, // Estimate
      diminishingReturnsAt: (result.totalBudgetUsed || 0) * 1.5,
    } : null;

    // Constraint sensitivities
    const constraintSensitivities = (result.constraintViolations || []).map(v => ({
      constraintType: v.constraintType,
      constraintId: v.constraintId,
      shadowPrice: v.severity === "error" ? 0.1 : 0.05,
      binding: v.severity === "error",
      slackAmount: v.affectedCount || 0,
    }));

    // Channel sensitivities
    const channelSensitivities = channels.map(channel => {
      const channelAllocations = allocations.filter(a => a.channel === channel);
      const totalLift = channelAllocations.reduce((sum, a) => sum + a.predictedLift, 0);
      const totalCost = channelAllocations.reduce((sum, a) => sum + (a.estimatedCost || 0), 0);

      return {
        channel,
        currentAllocation: channelAllocations.length,
        marginalLift: channelAllocations.length > 0 ? totalLift / channelAllocations.length : 0,
        costPerLift: totalLift > 0 ? totalCost / totalLift : 0,
      };
    });

    return {
      problemId: problem.id,
      resultId,
      budgetSensitivity,
      constraintSensitivities,
      channelSensitivities,
      computedAt: new Date().toISOString(),
    };
  }

  // ==========================================================================
  // EXPORT
  // ==========================================================================

  /**
   * Export plan to CSV or JSON
   */
  async exportPlan(resultId: string, format: "csv" | "json"): Promise<string> {
    const allocations = await this.getAllocations(resultId, { limit: 10000 });

    if (format === "json") {
      return JSON.stringify(allocations, null, 2);
    }

    // CSV format
    const headers = [
      "hcpId", "hcpName", "channel", "actionType", "plannedDate",
      "predictedLift", "confidence", "estimatedCost", "priority", "selectionReason"
    ];

    const rows = allocations.map(a => [
      a.hcpId,
      a.hcpName,
      a.channel,
      a.actionType,
      a.plannedDate,
      a.predictedLift.toString(),
      a.confidence.toString(),
      a.estimatedCost?.toString() || "",
      a.priority.toString(),
      `"${a.selectionReason || ""}"`,
    ].join(","));

    return [headers.join(","), ...rows].join("\n");
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private async getHcpCount(problem: OptimizationProblem): Promise<number> {
    if (problem.hcpIds && problem.hcpIds.length > 0) {
      return problem.hcpIds.length;
    }
    if (problem.audienceId) {
      const [audience] = await db
        .select()
        .from(savedAudiences)
        .where(eq(savedAudiences.id, problem.audienceId));
      return audience?.hcpIds?.length || 0;
    }
    return 0;
  }

  private async getHcpIds(problem: OptimizationProblem): Promise<string[]> {
    if (problem.hcpIds && problem.hcpIds.length > 0) {
      return problem.hcpIds;
    }
    if (problem.audienceId) {
      const [audience] = await db
        .select()
        .from(savedAudiences)
        .where(eq(savedAudiences.id, problem.audienceId));
      return audience?.hcpIds || [];
    }
    return [];
  }

  private cloneContext(context: ConstraintContext): ConstraintContext {
    return {
      budgetLimit: context.budgetLimit,
      budgetUsed: context.budgetUsed,
      channelCapacity: new Map(context.channelCapacity),
      channelUsed: new Map(context.channelUsed),
      hcpContacts: new Map(context.hcpContacts),
      contactLimits: new Map(context.contactLimits),
      reservedHcps: new Set(context.reservedHcps),
      complianceBlocked: new Set(context.complianceBlocked),
    };
  }

  private toProblemApi(problem: OptimizationProblem, hcpCount: number): OptimizationProblemApi {
    return {
      id: problem.id,
      name: problem.name,
      description: problem.description,
      audienceId: problem.audienceId,
      audienceName: null, // Would need join
      campaignId: problem.campaignId,
      campaignName: null, // Would need join
      hcpCount,
      objectiveMetric: problem.objectiveMetric,
      objectiveSense: problem.objectiveSense,
      budgetLimit: problem.budgetLimit,
      explorationBudgetPct: problem.explorationBudgetPct,
      planningHorizonDays: problem.planningHorizonDays,
      preferredSolver: problem.preferredSolver,
      status: problem.status,
      createdAt: problem.createdAt.toISOString(),
      updatedAt: problem.updatedAt.toISOString(),
    };
  }

  private toResultApi(result: OptimizationResult, problemName: string): OptimizationResultApi {
    return {
      id: result.id,
      problemId: result.problemId,
      problemName,
      solverType: result.solverType,
      objectiveValue: result.objectiveValue,
      feasible: result.feasible === 1,
      optimalityGap: result.optimalityGap,
      totalActions: result.totalActions,
      totalHcps: result.totalHcps,
      actionsByChannel: result.actionsByChannel || {},
      totalBudgetUsed: result.totalBudgetUsed,
      budgetUtilization: result.budgetUtilization,
      predictedTotalLift: result.predictedTotalLift,
      predictedEngagementRate: result.predictedEngagementRate,
      predictedResponseRate: result.predictedResponseRate,
      explorationActions: result.explorationActions,
      explorationBudgetUsed: result.explorationBudgetUsed,
      constraintViolations: result.constraintViolations || [],
      solveTimeMs: result.solveTimeMs,
      iterations: result.iterations,
      solvedAt: result.solvedAt.toISOString(),
    };
  }

  private toAllocationApi(alloc: OptimizationAllocation, hcpName: string): OptimizationAllocationApi {
    return {
      id: alloc.id,
      resultId: alloc.resultId,
      hcpId: alloc.hcpId,
      hcpName,
      channel: alloc.channel,
      actionType: alloc.actionType,
      plannedDate: alloc.plannedDate.toISOString(),
      windowStart: alloc.windowStart?.toISOString() || null,
      windowEnd: alloc.windowEnd?.toISOString() || null,
      predictedLift: alloc.predictedLift,
      confidence: alloc.confidence,
      isExploration: alloc.isExploration === 1,
      estimatedCost: alloc.estimatedCost,
      status: alloc.status,
      executedAt: alloc.executedAt?.toISOString() || null,
      actualOutcome: alloc.actualOutcome,
      selectionReason: alloc.selectionReason,
      priority: alloc.priority || 0,
    };
  }
}

// Export singleton instance
export const portfolioOptimizer = new PortfolioOptimizer();
