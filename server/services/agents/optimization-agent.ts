/**
 * Optimization Agent
 *
 * Phase 7F: Autonomous monitoring of portfolio optimization and execution plans
 *
 * Responsibilities:
 * - Monitor execution plan performance
 * - Detect underperformance and suggest rebalancing
 * - Track optimization problem outcomes
 * - Generate optimization recommendations
 */

import {
  BaseAgent,
  type AgentContext,
  type AgentInput,
  type AgentOutput,
  type AgentInsight,
  type AgentAlert,
  type ProposedAgentAction,
  type AgentTriggerConfig,
} from "./base-agent";
import { db } from "../../db";
import {
  executionPlans,
  optimizationAllocations,
  optimizationResults,
  optimizationProblems,
  hcpProfiles,
} from "@shared/schema";
import { eq, and, inArray, gte, lte, sql, desc } from "drizzle-orm";
import { executionPlanner } from "../execution-planner";
import { portfolioOptimizer } from "../portfolio-optimizer";

// Input type for the optimization agent
export interface OptimizationAgentInput extends AgentInput {
  planIds?: string[];
  checkRebalance?: boolean;
  checkPerformance?: boolean;
}

// Performance metrics for an execution plan
export interface PlanPerformanceMetrics {
  planId: string;
  planName: string;
  status: string;
  totalActions: number;
  completedActions: number;
  failedActions: number;
  progressPercent: number;
  predictedLift: number;
  actualLift: number;
  liftVariance: number;
  liftVariancePercent: number;
  budgetUtilization: number;
  performanceStatus: "on_track" | "underperforming" | "overperforming";
  requiresRebalance: boolean;
}

// Optimization recommendation
export interface OptimizationRecommendation {
  type: "rebalance" | "pause" | "accelerate" | "expand" | "contract";
  planId: string;
  planName: string;
  reason: string;
  confidence: number;
  estimatedImpact: number;
  suggestedChanges: {
    actionsToModify: number;
    actionsToAdd: number;
    actionsToRemove: number;
    budgetChange: number;
  };
}

// Agent output extension
export interface OptimizationAgentOutput extends AgentOutput {
  planMetrics: PlanPerformanceMetrics[];
  recommendations: OptimizationRecommendation[];
  portfolioHealth: {
    totalPlans: number;
    executingPlans: number;
    underperformingPlans: number;
    avgPerformance: number;
  };
}

/**
 * Optimization Agent
 *
 * Monitors execution plans and suggests optimization actions
 */
export class OptimizationAgent extends BaseAgent<OptimizationAgentInput> {
  readonly type = "engagement_optimizer" as const;
  readonly name = "Optimization Agent";
  readonly description = "Monitors portfolio optimization and execution plan performance";
  readonly version = "1.0.0";

  // Performance thresholds
  private readonly UNDERPERFORMANCE_THRESHOLD = 0.8; // 80% of predicted
  private readonly CRITICAL_UNDERPERFORMANCE_THRESHOLD = 0.6; // 60% of predicted
  private readonly REBALANCE_VARIANCE_THRESHOLD = 0.2; // 20% variance triggers rebalance suggestion
  private readonly MIN_COMPLETED_FOR_ANALYSIS = 10; // Minimum completed actions for analysis

  constructor() {
    super();
  }

  /**
   * Validate input
   */
  validate(input: OptimizationAgentInput): { valid: boolean; errors?: string[] } {
    return { valid: true }; // All inputs are optional
  }

  /**
   * Execute the optimization monitoring
   */
  async execute(input: OptimizationAgentInput, context: AgentContext): Promise<OptimizationAgentOutput> {
    const insights: AgentInsight[] = [];
    const alerts: AgentAlert[] = [];
    const proposedActions: ProposedAgentAction[] = [];
    const planMetrics: PlanPerformanceMetrics[] = [];
    const recommendations: OptimizationRecommendation[] = [];

    try {
      // Fetch active execution plans
      const plans = await this.getActivePlans(input.planIds);

      if (plans.length === 0) {
        return {
          success: true,
          summary: "No active execution plans to monitor",
          planMetrics: [],
          recommendations: [],
          portfolioHealth: {
            totalPlans: 0,
            executingPlans: 0,
            underperformingPlans: 0,
            avgPerformance: 0,
          },
        };
      }

      this.logger.info(`Analyzing ${plans.length} execution plans`);

      // Analyze each plan
      for (const plan of plans) {
        const metrics = await this.analyzePlanPerformance(plan);
        planMetrics.push(metrics);

        // Generate insights based on performance
        if (metrics.performanceStatus === "underperforming") {
          insights.push({
            type: "underperformance",
            title: `Plan "${plan.name}" Underperforming`,
            description: `Execution plan is achieving ${metrics.liftVariancePercent.toFixed(1)}% below predicted outcomes`,
            severity: metrics.liftVariance < -this.CRITICAL_UNDERPERFORMANCE_THRESHOLD ? "critical" : "warning",
            affectedEntities: {
              type: "execution_plan",
              ids: [plan.id],
              count: 1,
            },
            metrics: {
              predictedLift: metrics.predictedLift,
              actualLift: metrics.actualLift,
              variance: metrics.liftVariance,
            },
            recommendation: "Consider rebalancing the plan to improve outcomes",
          });

          // Check if rebalance is recommended
          if (metrics.requiresRebalance && input.checkRebalance !== false) {
            const suggestion = await executionPlanner.suggestRebalance(plan.id);

            if (suggestion) {
              recommendations.push({
                type: "rebalance",
                planId: plan.id,
                planName: plan.name,
                reason: suggestion.reason,
                confidence: suggestion.confidence,
                estimatedImpact: suggestion.improvementPercent,
                suggestedChanges: {
                  actionsToModify: suggestion.actionsToModify,
                  actionsToAdd: suggestion.actionsToAdd,
                  actionsToRemove: suggestion.actionsToRemove,
                  budgetChange: suggestion.estimatedCostChange,
                },
              });

              // Propose rebalance action
              proposedActions.push({
                actionType: "rebalance_plan",
                actionName: `Rebalance ${plan.name}`,
                description: `Rebalance execution plan to improve performance by ~${suggestion.improvementPercent.toFixed(1)}%`,
                reasoning: suggestion.reason,
                confidence: suggestion.confidence,
                riskLevel: "medium",
                impactScope: "segment",
                affectedEntityCount: suggestion.actionsToModify + suggestion.actionsToAdd,
                payload: {
                  planId: plan.id,
                  trigger: "outcome_deviation",
                  suggestedChanges: {
                    actionsToModify: suggestion.actionsToModify,
                    actionsToAdd: suggestion.actionsToAdd,
                    actionsToRemove: suggestion.actionsToRemove,
                  },
                },
                requiresApproval: true,
              });
            }
          }
        } else if (metrics.performanceStatus === "overperforming") {
          insights.push({
            type: "overperformance",
            title: `Plan "${plan.name}" Exceeding Expectations`,
            description: `Execution plan is achieving ${Math.abs(metrics.liftVariancePercent).toFixed(1)}% above predicted outcomes`,
            severity: "info",
            affectedEntities: {
              type: "execution_plan",
              ids: [plan.id],
              count: 1,
            },
            metrics: {
              predictedLift: metrics.predictedLift,
              actualLift: metrics.actualLift,
              variance: metrics.liftVariance,
            },
            recommendation: "Consider expanding the plan or applying learnings to other plans",
          });
        }

        // Check for high failure rates
        if (metrics.failedActions > metrics.totalActions * 0.1) {
          alerts.push({
            severity: "warning",
            title: `High Failure Rate in "${plan.name}"`,
            message: `${metrics.failedActions} actions (${((metrics.failedActions / metrics.totalActions) * 100).toFixed(1)}%) have failed`,
            affectedEntities: {
              type: "execution_plan",
              ids: [plan.id],
              count: 1,
            },
            suggestedActions: [
              {
                type: "investigate",
                label: "Investigate Failures",
                payload: { planId: plan.id },
              },
              {
                type: "pause",
                label: "Pause Plan",
                payload: { planId: plan.id },
              },
            ],
          });
        }
      }

      // Calculate portfolio health
      const executingPlans = planMetrics.filter((p) => p.status === "executing").length;
      const underperformingPlans = planMetrics.filter((p) => p.performanceStatus === "underperforming").length;
      const avgPerformance =
        planMetrics.length > 0
          ? planMetrics.reduce((sum, p) => sum + (p.actualLift / Math.max(p.predictedLift, 0.01)), 0) / planMetrics.length
          : 0;

      const portfolioHealth = {
        totalPlans: planMetrics.length,
        executingPlans,
        underperformingPlans,
        avgPerformance: avgPerformance * 100, // As percentage
      };

      // Generate portfolio-level alerts
      if (underperformingPlans > planMetrics.length * 0.5) {
        alerts.push({
          severity: "critical",
          title: "Portfolio Underperformance Alert",
          message: `${underperformingPlans} of ${planMetrics.length} plans are underperforming. Consider portfolio-wide review.`,
          suggestedActions: [
            {
              type: "review_portfolio",
              label: "Review Portfolio",
              payload: {},
            },
          ],
        });
      }

      const summary = this.generateSummary(planMetrics, recommendations, portfolioHealth);

      return {
        success: true,
        summary,
        insights,
        alerts,
        proposedActions,
        planMetrics,
        recommendations,
        portfolioHealth,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Optimization agent error: ${errorMessage}`);

      return {
        success: false,
        summary: `Optimization monitoring failed: ${errorMessage}`,
        error: errorMessage,
        planMetrics: [],
        recommendations: [],
        portfolioHealth: {
          totalPlans: 0,
          executingPlans: 0,
          underperformingPlans: 0,
          avgPerformance: 0,
        },
      };
    }
  }

  /**
   * Get active execution plans
   */
  private async getActivePlans(planIds?: string[]) {
    const conditions = [
      inArray(executionPlans.status, ["executing", "paused", "scheduled"]),
    ];

    if (planIds && planIds.length > 0) {
      conditions.push(inArray(executionPlans.id, planIds));
    }

    return db
      .select()
      .from(executionPlans)
      .where(and(...conditions));
  }

  /**
   * Analyze performance metrics for a plan
   */
  private async analyzePlanPerformance(plan: typeof executionPlans.$inferSelect): Promise<PlanPerformanceMetrics> {
    // Get completed allocations for this plan
    const completedAllocations = await db
      .select()
      .from(optimizationAllocations)
      .where(
        and(
          eq(optimizationAllocations.resultId, plan.resultId),
          eq(optimizationAllocations.status, "completed")
        )
      );

    // Calculate predicted vs actual lift
    let predictedLift = 0;
    let actualLift = 0;

    for (const alloc of completedAllocations) {
      predictedLift += alloc.predictedLift;
      actualLift += alloc.actualOutcome ?? 0;
    }

    const liftVariance = actualLift - predictedLift;
    const liftVariancePercent =
      predictedLift > 0 ? ((actualLift - predictedLift) / predictedLift) * 100 : 0;

    // Determine performance status
    let performanceStatus: "on_track" | "underperforming" | "overperforming" = "on_track";
    if (predictedLift > 0 && completedAllocations.length >= this.MIN_COMPLETED_FOR_ANALYSIS) {
      const ratio = actualLift / predictedLift;
      if (ratio < this.UNDERPERFORMANCE_THRESHOLD) {
        performanceStatus = "underperforming";
      } else if (ratio > 1.2) {
        performanceStatus = "overperforming";
      }
    }

    // Determine if rebalance is needed
    const requiresRebalance =
      performanceStatus === "underperforming" &&
      Math.abs(liftVariancePercent) > this.REBALANCE_VARIANCE_THRESHOLD * 100 &&
      completedAllocations.length >= this.MIN_COMPLETED_FOR_ANALYSIS;

    // Calculate budget utilization
    const budgetUtilization =
      plan.budgetAllocated && plan.budgetAllocated > 0
        ? ((plan.budgetSpent ?? 0) / plan.budgetAllocated) * 100
        : 0;

    return {
      planId: plan.id,
      planName: plan.name,
      status: plan.status,
      totalActions: plan.totalActions,
      completedActions: plan.completedActions,
      failedActions: plan.failedActions,
      progressPercent: plan.totalActions > 0 ? (plan.completedActions / plan.totalActions) * 100 : 0,
      predictedLift,
      actualLift,
      liftVariance,
      liftVariancePercent,
      budgetUtilization,
      performanceStatus,
      requiresRebalance,
    };
  }

  /**
   * Generate a human-readable summary
   */
  private generateSummary(
    metrics: PlanPerformanceMetrics[],
    recommendations: OptimizationRecommendation[],
    health: { totalPlans: number; executingPlans: number; underperformingPlans: number; avgPerformance: number }
  ): string {
    const parts: string[] = [];

    parts.push(`Analyzed ${health.totalPlans} execution plans.`);

    if (health.executingPlans > 0) {
      parts.push(`${health.executingPlans} plans currently executing.`);
    }

    if (health.underperformingPlans > 0) {
      parts.push(`${health.underperformingPlans} plans underperforming.`);
    }

    if (health.avgPerformance > 0) {
      parts.push(`Average performance: ${health.avgPerformance.toFixed(1)}% of predicted.`);
    }

    if (recommendations.length > 0) {
      parts.push(`${recommendations.length} rebalance recommendations generated.`);
    }

    return parts.join(" ");
  }
}

// Singleton instance
export const optimizationAgent = new OptimizationAgent();
