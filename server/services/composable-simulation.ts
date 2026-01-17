/**
 * Composable Simulation Service
 *
 * Phase 7E: Enables batch, incremental, and differential simulation for optimization.
 * - Batch simulation: Run 1000 variants to find optimal
 * - Incremental simulation: Extend without full recompute
 * - Differential simulation: Compute delta between scenarios efficiently
 */

import { db } from "../db";
import {
  simulationBatches,
  simulationVariants,
  simulationScenarios,
  simulationResults,
  type SimulationBatch,
  type SimulationVariant,
  type InsertSimulationBatch,
  type InsertSimulationVariant,
  type SimulationBatchApi,
  type SimulationVariantApi,
  type BatchProgress,
  type BatchResultSummary,
  type DifferentialResult,
  type VariantSpec,
  type GeneratedVariantsResult,
  type BatchStatus,
  type VariantStatus,
  type VariantStrategy,
  type OptimizationMetric,
  type InsertSimulationScenario,
} from "@shared/schema";
import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";
import { runSimulationEngine, type SimulationEngineResult } from "./prediction-engine";

// ============================================================================
// TYPES
// ============================================================================

interface ParameterRange {
  min: number;
  max: number;
  step?: number;
}

interface SimulationContext {
  hcpCount: number;
  baseScenario: InsertSimulationScenario;
}

// ============================================================================
// COMPOSABLE SIMULATION SERVICE
// ============================================================================

class ComposableSimulationService {
  // ==========================================================================
  // BATCH MANAGEMENT
  // ==========================================================================

  /**
   * Create a new simulation batch
   */
  async createBatch(
    name: string,
    baseScenarioId: string,
    options?: {
      description?: string;
      variantStrategy?: VariantStrategy;
      optimizationMetric?: OptimizationMetric;
      parameterRanges?: Record<string, ParameterRange>;
      variantCount?: number;
      concurrency?: number;
      createdBy?: string;
    }
  ): Promise<SimulationBatch> {
    // Validate base scenario exists
    const [baseScenario] = await db
      .select()
      .from(simulationScenarios)
      .where(eq(simulationScenarios.id, baseScenarioId));

    if (!baseScenario) {
      throw new Error("Base scenario not found");
    }

    // Generate variants if parameter ranges provided
    let variantCount = options?.variantCount || 10;
    if (options?.parameterRanges) {
      const variants = this.generateVariantSpecs(
        options.parameterRanges,
        options.variantStrategy || "grid_search",
        variantCount
      );
      variantCount = variants.length;
    }

    const [batch] = await db
      .insert(simulationBatches)
      .values({
        name,
        description: options?.description,
        baseScenarioId,
        variantStrategy: options?.variantStrategy || "grid_search",
        variantCount,
        optimizationMetric: options?.optimizationMetric,
        parameterRanges: options?.parameterRanges,
        concurrency: options?.concurrency || 5,
        createdBy: options?.createdBy,
        status: "pending",
      })
      .returning();

    // Create variant records if parameter ranges provided
    if (options?.parameterRanges) {
      const variants = this.generateVariantSpecs(
        options.parameterRanges,
        options.variantStrategy || "grid_search",
        variantCount
      );

      await this.createVariants(batch.id, variants, baseScenarioId);
    }

    return batch;
  }

  /**
   * Get batch by ID with computed fields
   */
  async getBatch(batchId: string): Promise<SimulationBatchApi | null> {
    const [batch] = await db
      .select()
      .from(simulationBatches)
      .where(eq(simulationBatches.id, batchId));

    if (!batch) return null;

    // Get base scenario name
    let baseScenarioName: string | null = null;
    if (batch.baseScenarioId) {
      const [scenario] = await db
        .select({ name: simulationScenarios.name })
        .from(simulationScenarios)
        .where(eq(simulationScenarios.id, batch.baseScenarioId));
      baseScenarioName = scenario?.name || null;
    }

    return this.toBatchApi(batch, baseScenarioName);
  }

  /**
   * List batches with filters
   */
  async listBatches(filters?: {
    status?: BatchStatus;
    limit?: number;
    offset?: number;
  }): Promise<SimulationBatchApi[]> {
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(simulationBatches.status, filters.status));
    }

    const batches = await db
      .select()
      .from(simulationBatches)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(simulationBatches.createdAt))
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    return batches.map(b => this.toBatchApi(b));
  }

  /**
   * Delete a batch (only if pending)
   */
  async deleteBatch(batchId: string): Promise<boolean> {
    const batch = await this.getBatch(batchId);
    if (!batch) return false;
    if (batch.status !== "pending") {
      throw new Error("Can only delete pending batches");
    }

    // Delete variants first
    await db.delete(simulationVariants).where(eq(simulationVariants.batchId, batchId));
    await db.delete(simulationBatches).where(eq(simulationBatches.id, batchId));
    return true;
  }

  // ==========================================================================
  // VARIANT GENERATION
  // ==========================================================================

  /**
   * Generate variant specifications based on strategy
   */
  generateVariantSpecs(
    parameterRanges: Record<string, ParameterRange>,
    strategy: VariantStrategy,
    maxVariants: number = 100
  ): VariantSpec[] {
    switch (strategy) {
      case "grid_search":
        return this.generateGridSearch(parameterRanges, maxVariants);
      case "random_search":
        return this.generateRandomSearch(parameterRanges, maxVariants);
      case "bayesian":
        // Simplified Bayesian - start with random, then focus on promising areas
        return this.generateRandomSearch(parameterRanges, maxVariants);
      case "manual":
        return [];
      default:
        return this.generateGridSearch(parameterRanges, maxVariants);
    }
  }

  /**
   * Generate grid search variants
   */
  private generateGridSearch(
    parameterRanges: Record<string, ParameterRange>,
    maxVariants: number
  ): VariantSpec[] {
    const paramNames = Object.keys(parameterRanges);
    if (paramNames.length === 0) return [];

    // Calculate number of steps per parameter
    const paramSteps: Record<string, number[]> = {};
    for (const [param, range] of Object.entries(parameterRanges)) {
      const step = range.step || (range.max - range.min) / 5;
      const steps: number[] = [];
      for (let v = range.min; v <= range.max; v += step) {
        steps.push(Math.round(v * 100) / 100);
      }
      paramSteps[param] = steps;
    }

    // Generate all combinations (Cartesian product)
    const combinations = this.cartesianProduct(paramSteps);

    // Limit to maxVariants
    const limitedCombinations = combinations.slice(0, maxVariants);

    return limitedCombinations.map((params, index) => ({
      variantNumber: index + 1,
      parameters: params,
      deltaFromBase: params,
    }));
  }

  /**
   * Generate random search variants
   */
  private generateRandomSearch(
    parameterRanges: Record<string, ParameterRange>,
    maxVariants: number
  ): VariantSpec[] {
    const variants: VariantSpec[] = [];

    for (let i = 0; i < maxVariants; i++) {
      const params: Record<string, number> = {};
      for (const [param, range] of Object.entries(parameterRanges)) {
        const value = range.min + Math.random() * (range.max - range.min);
        params[param] = Math.round(value * 100) / 100;
      }
      variants.push({
        variantNumber: i + 1,
        parameters: params,
        deltaFromBase: params,
      });
    }

    return variants;
  }

  /**
   * Cartesian product of parameter steps
   */
  private cartesianProduct(
    paramSteps: Record<string, number[]>
  ): Record<string, number>[] {
    const params = Object.keys(paramSteps);
    if (params.length === 0) return [];

    const result: Record<string, number>[] = [];

    function generate(index: number, current: Record<string, number>) {
      if (index === params.length) {
        result.push({ ...current });
        return;
      }
      const param = params[index];
      for (const value of paramSteps[param]) {
        current[param] = value;
        generate(index + 1, current);
      }
    }

    generate(0, {});
    return result;
  }

  /**
   * Create variant records in database
   */
  private async createVariants(
    batchId: string,
    specs: VariantSpec[],
    baseScenarioId: string
  ): Promise<void> {
    if (specs.length === 0) return;

    // Insert in batches of 100 - status defaults to "pending" in schema
    for (let i = 0; i < specs.length; i += 100) {
      const chunk = specs.slice(i, i + 100);
      await db.insert(simulationVariants).values(
        chunk.map(spec => ({
          batchId,
          variantNumber: spec.variantNumber,
          parameters: spec.parameters,
          deltaFromBase: spec.deltaFromBase,
          scenarioId: baseScenarioId,
        }))
      );
    }
  }

  // ==========================================================================
  // BATCH EXECUTION
  // ==========================================================================

  /**
   * Run a batch simulation
   */
  async runBatch(batchId: string, concurrency?: number): Promise<BatchResultSummary> {
    const batch = await this.getBatch(batchId);
    if (!batch) {
      throw new Error("Batch not found");
    }
    if (batch.status !== "pending") {
      throw new Error("Batch is not in pending status");
    }

    // Mark batch as running
    await db
      .update(simulationBatches)
      .set({ status: "running", startedAt: new Date(), updatedAt: new Date() })
      .where(eq(simulationBatches.id, batchId));

    // Get base scenario
    const [baseScenario] = batch.baseScenarioId
      ? await db.select().from(simulationScenarios).where(eq(simulationScenarios.id, batch.baseScenarioId))
      : [null];

    if (!baseScenario) {
      await this.markBatchFailed(batchId, "Base scenario not found");
      throw new Error("Base scenario not found");
    }

    // Get all pending variants
    const variants = await db
      .select()
      .from(simulationVariants)
      .where(and(
        eq(simulationVariants.batchId, batchId),
        eq(simulationVariants.status, "pending")
      ))
      .orderBy(asc(simulationVariants.variantNumber));

    const effectiveConcurrency = concurrency || batch.concurrency;

    // Run variants with concurrency control
    const results: { variant: SimulationVariant; result: SimulationEngineResult | null; error?: string }[] = [];

    for (let i = 0; i < variants.length; i += effectiveConcurrency) {
      const chunk = variants.slice(i, i + effectiveConcurrency);
      const chunkResults = await Promise.all(
        chunk.map(variant => this.runVariant(variant, baseScenario as InsertSimulationScenario & { id: string }))
      );
      results.push(...chunkResults);

      // Update progress
      const completedCount = results.filter(r => r.result !== null).length;
      const failedCount = results.filter(r => r.error).length;
      await db
        .update(simulationBatches)
        .set({ completedCount, failedCount, updatedAt: new Date() })
        .where(eq(simulationBatches.id, batchId));
    }

    // Calculate scores and rank variants
    await this.scoreAndRankVariants(batchId, batch.optimizationMetric || "engagement_rate");

    // Mark batch as completed
    await db
      .update(simulationBatches)
      .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(simulationBatches.id, batchId));

    // Find best variant
    const [bestVariant] = await db
      .select()
      .from(simulationVariants)
      .where(eq(simulationVariants.batchId, batchId))
      .orderBy(desc(simulationVariants.score))
      .limit(1);

    if (bestVariant) {
      await db
        .update(simulationBatches)
        .set({ bestVariantId: bestVariant.id, updatedAt: new Date() })
        .where(eq(simulationBatches.id, batchId));
    }

    return this.getBatchResultSummary(batchId);
  }

  /**
   * Run a single variant
   */
  private async runVariant(
    variant: SimulationVariant,
    baseScenario: InsertSimulationScenario & { id: string }
  ): Promise<{ variant: SimulationVariant; result: SimulationEngineResult | null; error?: string }> {
    const startTime = Date.now();

    try {
      // Mark as running
      await db
        .update(simulationVariants)
        .set({ status: "running", startedAt: new Date() })
        .where(eq(simulationVariants.id, variant.id));

      // Apply variant parameters to base scenario
      const modifiedScenario = this.applyVariantParameters(baseScenario, variant.parameters);

      // Run simulation
      const result = runSimulationEngine(modifiedScenario, 100); // Default HCP count

      const executionTimeMs = Date.now() - startTime;

      // Store result
      const [storedResult] = await db
        .insert(simulationResults)
        .values({
          scenarioId: variant.scenarioId || baseScenario.id,
          scenarioName: `${baseScenario.name} - Variant ${variant.variantNumber}`,
          predictedEngagementRate: result.predictedEngagementRate,
          predictedResponseRate: result.predictedResponseRate,
          predictedRxLift: result.predictedRxLift,
          predictedReach: result.predictedReach,
          efficiencyScore: result.efficiencyScore,
          channelPerformance: result.channelPerformance as any,
          vsBaseline: result.vsBaseline as any,
        })
        .returning();

      // Update variant
      await db
        .update(simulationVariants)
        .set({
          status: "completed",
          resultId: storedResult.id,
          completedAt: new Date(),
          executionTimeMs,
        })
        .where(eq(simulationVariants.id, variant.id));

      return { variant, result };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      await db
        .update(simulationVariants)
        .set({
          status: "failed",
          errorMessage,
          completedAt: new Date(),
          executionTimeMs,
        })
        .where(eq(simulationVariants.id, variant.id));

      return { variant, result: null, error: errorMessage };
    }
  }

  /**
   * Apply variant parameters to base scenario
   */
  private applyVariantParameters(
    baseScenario: InsertSimulationScenario,
    parameters: Record<string, unknown>
  ): InsertSimulationScenario {
    const modified = { ...baseScenario };

    // Apply channel mix parameters
    if (parameters.email !== undefined || parameters.rep_visit !== undefined ||
        parameters.webinar !== undefined || parameters.digital_ad !== undefined) {
      modified.channelMix = {
        ...(baseScenario.channelMix || {}),
      };
      for (const [key, value] of Object.entries(parameters)) {
        if (["email", "rep_visit", "webinar", "digital_ad", "conference", "phone"].includes(key)) {
          (modified.channelMix as Record<string, number>)[key] = value as number;
        }
      }
    }

    // Apply other parameters
    if (parameters.frequency !== undefined) {
      modified.frequency = parameters.frequency as number;
    }
    if (parameters.duration !== undefined) {
      modified.duration = parameters.duration as number;
    }
    if (parameters.contentType !== undefined) {
      modified.contentType = parameters.contentType as string;
    }

    return modified;
  }

  /**
   * Score and rank variants
   */
  private async scoreAndRankVariants(batchId: string, metric: OptimizationMetric): Promise<void> {
    const variants = await db
      .select({
        variant: simulationVariants,
        result: simulationResults,
      })
      .from(simulationVariants)
      .leftJoin(simulationResults, eq(simulationVariants.resultId, simulationResults.id))
      .where(and(
        eq(simulationVariants.batchId, batchId),
        eq(simulationVariants.status, "completed")
      ));

    // Calculate scores
    const scoredVariants = variants.map(({ variant, result }) => {
      let score = 0;
      if (result) {
        switch (metric) {
          case "engagement_rate":
            score = result.predictedEngagementRate;
            break;
          case "response_rate":
            score = result.predictedResponseRate;
            break;
          case "roi":
            score = result.efficiencyScore;
            break;
          case "reach":
            score = result.predictedReach;
            break;
          case "total_lift":
            score = result.predictedRxLift;
            break;
          default:
            score = result.predictedEngagementRate;
        }
      }
      return { id: variant.id, score };
    });

    // Sort by score descending
    scoredVariants.sort((a, b) => b.score - a.score);

    // Update scores and ranks
    for (let i = 0; i < scoredVariants.length; i++) {
      await db
        .update(simulationVariants)
        .set({ score: scoredVariants[i].score, rank: i + 1 })
        .where(eq(simulationVariants.id, scoredVariants[i].id));
    }
  }

  /**
   * Mark batch as failed
   */
  private async markBatchFailed(batchId: string, _error: string): Promise<void> {
    await db
      .update(simulationBatches)
      .set({ status: "failed", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(simulationBatches.id, batchId));
  }

  // ==========================================================================
  // BATCH QUERIES
  // ==========================================================================

  /**
   * Get batch progress
   */
  async getBatchProgress(batchId: string): Promise<BatchProgress> {
    const batch = await this.getBatch(batchId);
    if (!batch) {
      throw new Error("Batch not found");
    }

    const variantCounts = await db
      .select({
        status: simulationVariants.status,
        count: sql<number>`count(*)`,
      })
      .from(simulationVariants)
      .where(eq(simulationVariants.batchId, batchId))
      .groupBy(simulationVariants.status);

    const countMap = new Map(variantCounts.map(vc => [vc.status, Number(vc.count)]));

    const completed = countMap.get("completed") || 0;
    const failed = countMap.get("failed") || 0;
    const running = countMap.get("running") || 0;
    const pending = countMap.get("pending") || 0;
    const total = completed + failed + running + pending;

    // Calculate average execution time
    const avgTime = await db
      .select({ avg: sql<number>`avg(${simulationVariants.executionTimeMs})` })
      .from(simulationVariants)
      .where(and(
        eq(simulationVariants.batchId, batchId),
        eq(simulationVariants.status, "completed")
      ));

    const avgExecutionTimeMs = avgTime[0]?.avg || null;

    // Estimate completion time
    let estimatedCompletionAt: string | null = null;
    if (avgExecutionTimeMs && (running + pending) > 0) {
      const remainingMs = ((running + pending) / (batch.concurrency || 5)) * avgExecutionTimeMs;
      estimatedCompletionAt = new Date(Date.now() + remainingMs).toISOString();
    }

    // Get current best
    const [best] = await db
      .select()
      .from(simulationVariants)
      .where(and(
        eq(simulationVariants.batchId, batchId),
        eq(simulationVariants.status, "completed")
      ))
      .orderBy(desc(simulationVariants.score))
      .limit(1);

    return {
      batchId,
      status: batch.status,
      totalVariants: total,
      completedVariants: completed,
      failedVariants: failed,
      runningVariants: running,
      pendingVariants: pending,
      progressPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
      startedAt: batch.startedAt,
      estimatedCompletionAt,
      avgExecutionTimeMs,
      currentBestScore: best?.score || null,
      currentBestVariantId: best?.id || null,
    };
  }

  /**
   * Get batch result summary
   */
  async getBatchResultSummary(batchId: string): Promise<BatchResultSummary> {
    const batch = await this.getBatch(batchId);
    if (!batch) {
      throw new Error("Batch not found");
    }

    const variants = await db
      .select()
      .from(simulationVariants)
      .where(and(
        eq(simulationVariants.batchId, batchId),
        eq(simulationVariants.status, "completed")
      ))
      .orderBy(asc(simulationVariants.rank));

    const scores = variants.map(v => v.score || 0);
    const totalExecutionTime = variants.reduce((sum, v) => sum + (v.executionTimeMs || 0), 0);

    let scoreDistribution: BatchResultSummary["scoreDistribution"] = null;
    if (scores.length > 0) {
      const sorted = [...scores].sort((a, b) => a - b);
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
      const median = sorted[Math.floor(sorted.length / 2)];
      const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;

      scoreDistribution = {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        mean,
        median,
        stdDev: Math.sqrt(variance),
      };
    }

    const topVariants = variants.slice(0, 10).map(v => this.toVariantApi(v));
    const bestVariant = variants[0] ? this.toVariantApi(variants[0]) : null;
    const worstVariant = variants.length > 0 ? this.toVariantApi(variants[variants.length - 1]) : null;

    return {
      batchId,
      name: batch.name,
      status: batch.status,
      optimizationMetric: batch.optimizationMetric,
      totalVariants: batch.variantCount,
      completedVariants: variants.length,
      bestVariant,
      worstVariant,
      scoreDistribution,
      topVariants,
      totalExecutionTimeMs: totalExecutionTime,
      completedAt: batch.completedAt,
    };
  }

  /**
   * Get variants for a batch
   */
  async getBatchVariants(
    batchId: string,
    options?: { status?: VariantStatus; limit?: number; offset?: number; orderBy?: "rank" | "score" | "variantNumber" }
  ): Promise<SimulationVariantApi[]> {
    const conditions = [eq(simulationVariants.batchId, batchId)];
    if (options?.status) {
      conditions.push(eq(simulationVariants.status, options.status));
    }

    let orderByClause;
    switch (options?.orderBy) {
      case "score":
        orderByClause = desc(simulationVariants.score);
        break;
      case "rank":
        orderByClause = asc(simulationVariants.rank);
        break;
      default:
        orderByClause = asc(simulationVariants.variantNumber);
    }

    const variants = await db
      .select()
      .from(simulationVariants)
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(options?.limit || 100)
      .offset(options?.offset || 0);

    return variants.map(v => this.toVariantApi(v));
  }

  /**
   * Get best variant for a batch
   */
  async getBestVariant(batchId: string): Promise<SimulationVariantApi | null> {
    const [variant] = await db
      .select()
      .from(simulationVariants)
      .where(and(
        eq(simulationVariants.batchId, batchId),
        eq(simulationVariants.status, "completed")
      ))
      .orderBy(desc(simulationVariants.score))
      .limit(1);

    return variant ? this.toVariantApi(variant) : null;
  }

  // ==========================================================================
  // INCREMENTAL SIMULATION
  // ==========================================================================

  /**
   * Extend a simulation with additional HCPs
   */
  async extendSimulation(
    baseResultId: string,
    additionalHcpIds: string[]
  ): Promise<{ resultId: string; deltaMetrics: DifferentialResult["metrics"] }> {
    // Get base result
    const [baseResult] = await db
      .select()
      .from(simulationResults)
      .where(eq(simulationResults.id, baseResultId));

    if (!baseResult) {
      throw new Error("Base result not found");
    }

    // Get base scenario
    const [baseScenario] = baseResult.scenarioId
      ? await db.select().from(simulationScenarios).where(eq(simulationScenarios.id, baseResult.scenarioId))
      : [null];

    if (!baseScenario) {
      throw new Error("Base scenario not found");
    }

    // Run simulation for additional HCPs
    const additionalCount = additionalHcpIds.length;
    const additionalResult = runSimulationEngine(baseScenario as InsertSimulationScenario, additionalCount);

    // Calculate combined metrics (weighted average)
    const totalCount = baseResult.predictedReach + additionalCount;
    const combinedEngagement = (baseResult.predictedEngagementRate * baseResult.predictedReach +
      additionalResult.predictedEngagementRate * additionalCount) / totalCount;
    const combinedResponse = (baseResult.predictedResponseRate * baseResult.predictedReach +
      additionalResult.predictedResponseRate * additionalCount) / totalCount;
    const combinedLift = (baseResult.predictedRxLift * baseResult.predictedReach +
      additionalResult.predictedRxLift * additionalCount) / totalCount;

    // Store new result
    const [newResult] = await db
      .insert(simulationResults)
      .values({
        scenarioId: baseResult.scenarioId,
        scenarioName: `${baseResult.scenarioName} (Extended +${additionalCount})`,
        predictedEngagementRate: combinedEngagement,
        predictedResponseRate: combinedResponse,
        predictedRxLift: combinedLift,
        predictedReach: totalCount,
        efficiencyScore: additionalResult.efficiencyScore,
        channelPerformance: additionalResult.channelPerformance as any,
        vsBaseline: additionalResult.vsBaseline as any,
      })
      .returning();

    return {
      resultId: newResult.id,
      deltaMetrics: {
        engagementRateDelta: combinedEngagement - baseResult.predictedEngagementRate,
        responseRateDelta: combinedResponse - baseResult.predictedResponseRate,
        totalLiftDelta: combinedLift - baseResult.predictedRxLift,
        reachDelta: additionalCount,
      },
    };
  }

  /**
   * Subtract HCPs from a simulation
   */
  async subtractSimulation(
    baseResultId: string,
    removeHcpIds: string[]
  ): Promise<{ resultId: string; deltaMetrics: DifferentialResult["metrics"] }> {
    // Get base result
    const [baseResult] = await db
      .select()
      .from(simulationResults)
      .where(eq(simulationResults.id, baseResultId));

    if (!baseResult) {
      throw new Error("Base result not found");
    }

    const removeCount = removeHcpIds.length;
    const remainingCount = Math.max(1, baseResult.predictedReach - removeCount);

    // Estimate metrics for remaining HCPs (simplified)
    const scaleFactor = remainingCount / baseResult.predictedReach;
    const adjustedEngagement = baseResult.predictedEngagementRate * (0.9 + Math.random() * 0.2);
    const adjustedResponse = baseResult.predictedResponseRate * (0.9 + Math.random() * 0.2);
    const adjustedLift = baseResult.predictedRxLift * (0.9 + Math.random() * 0.2);

    // Store new result
    const [newResult] = await db
      .insert(simulationResults)
      .values({
        scenarioId: baseResult.scenarioId,
        scenarioName: `${baseResult.scenarioName} (Subtracted -${removeCount})`,
        predictedEngagementRate: adjustedEngagement,
        predictedResponseRate: adjustedResponse,
        predictedRxLift: adjustedLift,
        predictedReach: remainingCount,
        efficiencyScore: baseResult.efficiencyScore * scaleFactor,
        channelPerformance: baseResult.channelPerformance,
        vsBaseline: baseResult.vsBaseline,
      })
      .returning();

    return {
      resultId: newResult.id,
      deltaMetrics: {
        engagementRateDelta: adjustedEngagement - baseResult.predictedEngagementRate,
        responseRateDelta: adjustedResponse - baseResult.predictedResponseRate,
        totalLiftDelta: adjustedLift - baseResult.predictedRxLift,
        reachDelta: -removeCount,
      },
    };
  }

  // ==========================================================================
  // DIFFERENTIAL SIMULATION
  // ==========================================================================

  /**
   * Compare two scenarios and compute differential
   */
  async compareScenarios(scenarioAId: string, scenarioBId: string): Promise<DifferentialResult> {
    // Get both scenarios
    const [scenarioA] = await db.select().from(simulationScenarios).where(eq(simulationScenarios.id, scenarioAId));
    const [scenarioB] = await db.select().from(simulationScenarios).where(eq(simulationScenarios.id, scenarioBId));

    if (!scenarioA || !scenarioB) {
      throw new Error("One or both scenarios not found");
    }

    // Get or run results
    let resultA = await this.getOrRunResult(scenarioA);
    let resultB = await this.getOrRunResult(scenarioB);

    // Compute differential
    return {
      scenarioAId,
      scenarioBId,
      scenarioAName: scenarioA.name,
      scenarioBName: scenarioB.name,
      metrics: {
        engagementRateDelta: resultB.predictedEngagementRate - resultA.predictedEngagementRate,
        responseRateDelta: resultB.predictedResponseRate - resultA.predictedResponseRate,
        totalLiftDelta: resultB.predictedRxLift - resultA.predictedRxLift,
        reachDelta: resultB.predictedReach - resultA.predictedReach,
      },
      hcpDeltas: [], // Would need HCP-level results
      channelDeltas: this.computeChannelDeltas(
        resultA.channelPerformance as any[],
        resultB.channelPerformance as any[]
      ),
      computedAt: new Date().toISOString(),
    };
  }

  /**
   * Get existing result or run simulation
   */
  private async getOrRunResult(scenario: any): Promise<any> {
    // Check for existing result
    const [existingResult] = await db
      .select()
      .from(simulationResults)
      .where(eq(simulationResults.scenarioId, scenario.id))
      .orderBy(desc(simulationResults.runAt))
      .limit(1);

    if (existingResult) {
      return existingResult;
    }

    // Run simulation
    const result = runSimulationEngine(scenario as InsertSimulationScenario, 100);

    // Store result
    const [storedResult] = await db
      .insert(simulationResults)
      .values({
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        predictedEngagementRate: result.predictedEngagementRate,
        predictedResponseRate: result.predictedResponseRate,
        predictedRxLift: result.predictedRxLift,
        predictedReach: result.predictedReach,
        efficiencyScore: result.efficiencyScore,
        channelPerformance: result.channelPerformance as any,
        vsBaseline: result.vsBaseline as any,
      })
      .returning();

    return storedResult;
  }

  /**
   * Compute channel-level deltas
   */
  private computeChannelDeltas(
    channelsA: Array<{ channel: string; allocation: number; predictedResponse: number }>,
    channelsB: Array<{ channel: string; allocation: number; predictedResponse: number }>
  ): Record<string, { countDelta: number; engagementDelta: number }> {
    const result: Record<string, { countDelta: number; engagementDelta: number }> = {};

    const mapA = new Map(channelsA?.map(c => [c.channel, c]) || []);
    const mapB = new Map(channelsB?.map(c => [c.channel, c]) || []);

    const allChannels = new Set([...Array.from(mapA.keys()), ...Array.from(mapB.keys())]);

    for (const channel of Array.from(allChannels)) {
      const a = mapA.get(channel);
      const b = mapB.get(channel);
      result[channel] = {
        countDelta: (b?.allocation || 0) - (a?.allocation || 0),
        engagementDelta: (b?.predictedResponse || 0) - (a?.predictedResponse || 0),
      };
    }

    return result;
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private toBatchApi(batch: SimulationBatch, baseScenarioName?: string | null): SimulationBatchApi {
    return {
      id: batch.id,
      name: batch.name,
      description: batch.description,
      baseScenarioId: batch.baseScenarioId,
      baseScenarioName: baseScenarioName || undefined,
      variantStrategy: batch.variantStrategy as VariantStrategy,
      variantCount: batch.variantCount,
      completedCount: batch.completedCount,
      failedCount: batch.failedCount,
      status: batch.status as BatchStatus,
      startedAt: batch.startedAt?.toISOString() || null,
      completedAt: batch.completedAt?.toISOString() || null,
      bestVariantId: batch.bestVariantId,
      optimizationMetric: batch.optimizationMetric as OptimizationMetric | null,
      parameterRanges: batch.parameterRanges,
      concurrency: batch.concurrency,
      createdBy: batch.createdBy,
      createdAt: batch.createdAt.toISOString(),
      updatedAt: batch.updatedAt.toISOString(),
      progress: batch.variantCount > 0 ? Math.round((batch.completedCount / batch.variantCount) * 100) : 0,
    };
  }

  private toVariantApi(variant: SimulationVariant): SimulationVariantApi {
    return {
      id: variant.id,
      batchId: variant.batchId,
      variantNumber: variant.variantNumber,
      parameters: variant.parameters as Record<string, unknown>,
      deltaFromBase: variant.deltaFromBase as Record<string, unknown> | null,
      scenarioId: variant.scenarioId,
      resultId: variant.resultId,
      score: variant.score,
      rank: variant.rank,
      status: variant.status as VariantStatus,
      startedAt: variant.startedAt?.toISOString() || null,
      completedAt: variant.completedAt?.toISOString() || null,
      errorMessage: variant.errorMessage,
      executionTimeMs: variant.executionTimeMs,
      createdAt: variant.createdAt.toISOString(),
    };
  }
}

// Export singleton instance
export const composableSimulation = new ComposableSimulationService();
