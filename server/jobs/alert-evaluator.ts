/**
 * Alert Evaluator Job
 *
 * Evaluates all enabled alert rules and creates alert events when thresholds are breached.
 * Runs on a schedule (hourly by default) or can be triggered manually.
 */

import { eq, and, gt, lt, gte, lte, sql, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  alertRules,
  alertEvents,
  hcpProfiles,
  type AlertRule,
  type AlertOperator,
} from "@shared/schema";

// ============================================================================
// TYPES
// ============================================================================

interface EvaluationResult {
  ruleId: string;
  ruleName: string;
  breachingHcps: Array<{
    id: string;
    value: number;
  }>;
  evaluated: boolean;
  skipped: boolean;
  skipReason?: string;
}

interface AlertEvaluatorStats {
  rulesEvaluated: number;
  rulesSkipped: number;
  alertsTriggered: number;
  totalBreachingHcps: number;
  duration: number;
}

// ============================================================================
// FREQUENCY HELPERS
// ============================================================================

function isDue(rule: AlertRule): boolean {
  const { frequency, lastEvaluatedAt } = rule;

  if (!lastEvaluatedAt) {
    return true; // Never evaluated, so it's due
  }

  const now = new Date();
  const lastEval = new Date(lastEvaluatedAt);
  const hoursSinceLastEval = (now.getTime() - lastEval.getTime()) / (1000 * 60 * 60);

  switch (frequency) {
    case "realtime":
      return hoursSinceLastEval >= 0.25; // Every 15 minutes
    case "daily":
      return hoursSinceLastEval >= 24;
    case "weekly":
      return hoursSinceLastEval >= 168; // 7 days
    default:
      return hoursSinceLastEval >= 24;
  }
}

// ============================================================================
// METRIC MAPPING
// ============================================================================

const metricColumnMap: Record<string, string> = {
  engagement_score: "overall_engagement_score",
  rx_volume: "monthly_rx_volume",
  market_share: "market_share_pct",
  churn_risk: "churn_risk",
  conversion_likelihood: "conversion_likelihood",
  response_rate: "overall_engagement_score", // Approximation
};

function getMetricColumn(metric: string): string {
  return metricColumnMap[metric] || "overall_engagement_score";
}

// ============================================================================
// QUERY BUILDER
// ============================================================================

async function evaluateRule(rule: AlertRule): Promise<Array<{ id: string; value: number }>> {
  const { metric, operator, threshold, scope } = rule;
  const column = getMetricColumn(metric);

  // Build base conditions
  const conditions: ReturnType<typeof sql>[] = [];

  // Add operator condition
  switch (operator as AlertOperator) {
    case ">":
      conditions.push(sql`${sql.raw(column)} > ${threshold}`);
      break;
    case "<":
      conditions.push(sql`${sql.raw(column)} < ${threshold}`);
      break;
    case ">=":
      conditions.push(sql`${sql.raw(column)} >= ${threshold}`);
      break;
    case "<=":
      conditions.push(sql`${sql.raw(column)} <= ${threshold}`);
      break;
    case "=":
      conditions.push(sql`${sql.raw(column)} = ${threshold}`);
      break;
  }

  // Add scope filters
  const scopeObj = scope as {
    tiers?: string[];
    specialties?: string[];
    segments?: string[];
    states?: string[];
    audienceIds?: string[];
  } | null;

  if (scopeObj?.tiers && scopeObj.tiers.length > 0) {
    conditions.push(sql`tier = ANY(${scopeObj.tiers})`);
  }
  if (scopeObj?.specialties && scopeObj.specialties.length > 0) {
    conditions.push(sql`specialty = ANY(${scopeObj.specialties})`);
  }
  if (scopeObj?.segments && scopeObj.segments.length > 0) {
    conditions.push(sql`segment = ANY(${scopeObj.segments})`);
  }
  if (scopeObj?.states && scopeObj.states.length > 0) {
    conditions.push(sql`state = ANY(${scopeObj.states})`);
  }

  // Build and execute query
  const whereClause = conditions.length > 0
    ? sql.join(conditions, sql` AND `)
    : sql`1=1`;

  const results = await db.execute<{ id: string; metric_value: number }>(sql`
    SELECT id, ${sql.raw(column)} as metric_value
    FROM hcp_profiles
    WHERE ${whereClause}
    LIMIT 1000
  `);

  return results.rows.map((row) => ({
    id: row.id,
    value: row.metric_value,
  }));
}

// ============================================================================
// MAIN EVALUATOR
// ============================================================================

/**
 * Evaluate all enabled alert rules and create events for breaches
 */
export async function evaluateAlerts(): Promise<AlertEvaluatorStats> {
  const startTime = Date.now();
  const stats: AlertEvaluatorStats = {
    rulesEvaluated: 0,
    rulesSkipped: 0,
    alertsTriggered: 0,
    totalBreachingHcps: 0,
    duration: 0,
  };

  try {
    // Get all enabled rules
    const rules = await db
      .select()
      .from(alertRules)
      .where(eq(alertRules.enabled, true));

    console.log(`[AlertEvaluator] Found ${rules.length} enabled rules`);

    const results: EvaluationResult[] = [];

    for (const rule of rules) {
      // Check if rule is due for evaluation
      if (!isDue(rule)) {
        stats.rulesSkipped++;
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          breachingHcps: [],
          evaluated: false,
          skipped: true,
          skipReason: "Not due yet",
        });
        continue;
      }

      try {
        // Evaluate the rule
        const breachingHcps = await evaluateRule(rule);
        stats.rulesEvaluated++;

        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          breachingHcps,
          evaluated: true,
          skipped: false,
        });

        if (breachingHcps.length > 0) {
          // Create alert event
          await db.insert(alertEvents).values({
            ruleId: rule.id,
            hcpCount: breachingHcps.length,
            hcpIds: breachingHcps.map((h) => h.id),
            metricValues: breachingHcps.reduce(
              (acc, h) => ({ ...acc, [h.id]: h.value }),
              {}
            ),
          });

          // Update rule's lastTriggeredAt
          await db
            .update(alertRules)
            .set({
              lastTriggeredAt: new Date(),
              lastEvaluatedAt: new Date(),
            })
            .where(eq(alertRules.id, rule.id));

          stats.alertsTriggered++;
          stats.totalBreachingHcps += breachingHcps.length;

          console.log(
            `[AlertEvaluator] Rule "${rule.name}" triggered: ${breachingHcps.length} HCPs breach threshold`
          );
        } else {
          // Just update lastEvaluatedAt
          await db
            .update(alertRules)
            .set({ lastEvaluatedAt: new Date() })
            .where(eq(alertRules.id, rule.id));
        }
      } catch (error) {
        console.error(`[AlertEvaluator] Error evaluating rule "${rule.name}":`, error);
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          breachingHcps: [],
          evaluated: false,
          skipped: true,
          skipReason: `Error: ${error instanceof Error ? error.message : "Unknown"}`,
        });
      }
    }

    stats.duration = Date.now() - startTime;

    console.log(
      `[AlertEvaluator] Complete: ${stats.rulesEvaluated} evaluated, ` +
      `${stats.rulesSkipped} skipped, ${stats.alertsTriggered} alerts triggered ` +
      `(${stats.duration}ms)`
    );

    return stats;
  } catch (error) {
    console.error("[AlertEvaluator] Fatal error:", error);
    stats.duration = Date.now() - startTime;
    return stats;
  }
}

/**
 * Evaluate a single rule by ID (for manual testing)
 */
export async function evaluateRuleById(ruleId: string): Promise<EvaluationResult | null> {
  const [rule] = await db
    .select()
    .from(alertRules)
    .where(eq(alertRules.id, ruleId));

  if (!rule) {
    return null;
  }

  try {
    const breachingHcps = await evaluateRule(rule);

    if (breachingHcps.length > 0) {
      await db.insert(alertEvents).values({
        ruleId: rule.id,
        hcpCount: breachingHcps.length,
        hcpIds: breachingHcps.map((h) => h.id),
        metricValues: breachingHcps.reduce(
          (acc, h) => ({ ...acc, [h.id]: h.value }),
          {}
        ),
      });

      await db
        .update(alertRules)
        .set({
          lastTriggeredAt: new Date(),
          lastEvaluatedAt: new Date(),
        })
        .where(eq(alertRules.id, rule.id));
    } else {
      await db
        .update(alertRules)
        .set({ lastEvaluatedAt: new Date() })
        .where(eq(alertRules.id, rule.id));
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      breachingHcps,
      evaluated: true,
      skipped: false,
    };
  } catch (error) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      breachingHcps: [],
      evaluated: false,
      skipped: true,
      skipReason: `Error: ${error instanceof Error ? error.message : "Unknown"}`,
    };
  }
}

// ============================================================================
// SCHEDULER INTEGRATION
// ============================================================================

let evaluatorInterval: NodeJS.Timeout | null = null;

/**
 * Start the alert evaluator on a schedule
 */
export function startAlertEvaluator(intervalMs: number = 60 * 60 * 1000): void {
  if (evaluatorInterval) {
    console.log("[AlertEvaluator] Already running, stopping first...");
    stopAlertEvaluator();
  }

  console.log(`[AlertEvaluator] Starting with interval: ${intervalMs / 1000}s`);

  // Run immediately on start
  evaluateAlerts().catch(console.error);

  // Then run on interval
  evaluatorInterval = setInterval(() => {
    evaluateAlerts().catch(console.error);
  }, intervalMs);
}

/**
 * Stop the alert evaluator
 */
export function stopAlertEvaluator(): void {
  if (evaluatorInterval) {
    clearInterval(evaluatorInterval);
    evaluatorInterval = null;
    console.log("[AlertEvaluator] Stopped");
  }
}
