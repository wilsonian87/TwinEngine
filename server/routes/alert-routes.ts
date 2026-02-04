/**
 * Alert Routes
 *
 * API endpoints for managing alert rules and events:
 * - CRUD operations for alert rules
 * - Listing and acknowledging alert events
 */

import { Router } from "express";
import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "../db";
import { requireAuth } from "../auth";
import {
  alertRules,
  alertEvents,
  createAlertRuleRequestSchema,
  updateAlertRuleRequestSchema,
  type AlertRule,
  type AlertEvent,
} from "@shared/schema";

export const alertRouter = Router();

// ============================================================================
// ALERT RULES
// ============================================================================

/**
 * POST /api/alerts/rules
 * Create a new alert rule
 */
alertRouter.post("/rules", requireAuth, async (req, res) => {
  try {
    const parseResult = createAlertRuleRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: parseResult.error.errors,
      });
    }

    const userId = req.user!.id;
    const data = parseResult.data;

    const [rule] = await db
      .insert(alertRules)
      .values({
        userId,
        name: data.name,
        description: data.description || null,
        metric: data.metric,
        operator: data.operator,
        threshold: data.threshold,
        scope: data.scope || {},
        channels: data.channels || ["in_app"],
        frequency: data.frequency || "daily",
        enabled: data.enabled ?? true,
      })
      .returning();

    res.status(201).json(formatAlertRule(rule));
  } catch (error) {
    console.error("Error creating alert rule:", error);
    res.status(500).json({ error: "Failed to create alert rule" });
  }
});

/**
 * GET /api/alerts/rules
 * List all alert rules for the current user
 */
alertRouter.get("/rules", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    const rules = await db
      .select()
      .from(alertRules)
      .where(eq(alertRules.userId, userId))
      .orderBy(desc(alertRules.createdAt));

    res.json({
      rules: rules.map(formatAlertRule),
      total: rules.length,
    });
  } catch (error) {
    console.error("Error fetching alert rules:", error);
    res.status(500).json({ error: "Failed to fetch alert rules" });
  }
});

/**
 * GET /api/alerts/rules/:id
 * Get a single alert rule
 */
alertRouter.get("/rules/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const ruleId = req.params.id;

    const [rule] = await db
      .select()
      .from(alertRules)
      .where(and(eq(alertRules.id, ruleId), eq(alertRules.userId, userId)));

    if (!rule) {
      return res.status(404).json({ error: "Alert rule not found" });
    }

    res.json(formatAlertRule(rule));
  } catch (error) {
    console.error("Error fetching alert rule:", error);
    res.status(500).json({ error: "Failed to fetch alert rule" });
  }
});

/**
 * PUT /api/alerts/rules/:id
 * Update an alert rule
 */
alertRouter.put("/rules/:id", requireAuth, async (req, res) => {
  try {
    const parseResult = updateAlertRuleRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: parseResult.error.errors,
      });
    }

    const userId = req.user!.id;
    const ruleId = req.params.id;
    const data = parseResult.data;

    // Check ownership
    const [existing] = await db
      .select()
      .from(alertRules)
      .where(and(eq(alertRules.id, ruleId), eq(alertRules.userId, userId)));

    if (!existing) {
      return res.status(404).json({ error: "Alert rule not found" });
    }

    const [updated] = await db
      .update(alertRules)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(alertRules.id, ruleId))
      .returning();

    res.json(formatAlertRule(updated));
  } catch (error) {
    console.error("Error updating alert rule:", error);
    res.status(500).json({ error: "Failed to update alert rule" });
  }
});

/**
 * DELETE /api/alerts/rules/:id
 * Delete an alert rule
 */
alertRouter.delete("/rules/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const ruleId = req.params.id;

    // Check ownership
    const [existing] = await db
      .select()
      .from(alertRules)
      .where(and(eq(alertRules.id, ruleId), eq(alertRules.userId, userId)));

    if (!existing) {
      return res.status(404).json({ error: "Alert rule not found" });
    }

    await db.delete(alertRules).where(eq(alertRules.id, ruleId));

    res.json({ success: true, deleted: ruleId });
  } catch (error) {
    console.error("Error deleting alert rule:", error);
    res.status(500).json({ error: "Failed to delete alert rule" });
  }
});

/**
 * POST /api/alerts/rules/:id/toggle
 * Enable or disable an alert rule
 */
alertRouter.post("/rules/:id/toggle", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const ruleId = req.params.id;
    const { enabled } = req.body;

    // Check ownership
    const [existing] = await db
      .select()
      .from(alertRules)
      .where(and(eq(alertRules.id, ruleId), eq(alertRules.userId, userId)));

    if (!existing) {
      return res.status(404).json({ error: "Alert rule not found" });
    }

    const newEnabled = typeof enabled === "boolean" ? enabled : !existing.enabled;

    const [updated] = await db
      .update(alertRules)
      .set({
        enabled: newEnabled,
        updatedAt: new Date(),
      })
      .where(eq(alertRules.id, ruleId))
      .returning();

    res.json(formatAlertRule(updated));
  } catch (error) {
    console.error("Error toggling alert rule:", error);
    res.status(500).json({ error: "Failed to toggle alert rule" });
  }
});

// ============================================================================
// ALERT EVENTS
// ============================================================================

/**
 * GET /api/alerts/events
 * List triggered alerts (unacknowledged first)
 */
alertRouter.get("/events", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const onlyUnacknowledged = req.query.unacknowledged === "true";

    // Get user's rule IDs
    const userRules = await db
      .select({ id: alertRules.id, name: alertRules.name })
      .from(alertRules)
      .where(eq(alertRules.userId, userId));

    const ruleIds = userRules.map((r) => r.id);
    const ruleNameMap = Object.fromEntries(userRules.map((r) => [r.id, r.name]));

    if (ruleIds.length === 0) {
      return res.json({ events: [], total: 0 });
    }

    // Build query
    let query = db
      .select()
      .from(alertEvents)
      .where(sql`${alertEvents.ruleId} = ANY(${ruleIds})`)
      .orderBy(alertEvents.acknowledged, desc(alertEvents.triggeredAt))
      .limit(limit);

    if (onlyUnacknowledged) {
      query = db
        .select()
        .from(alertEvents)
        .where(and(
          sql`${alertEvents.ruleId} = ANY(${ruleIds})`,
          eq(alertEvents.acknowledged, false)
        ))
        .orderBy(desc(alertEvents.triggeredAt))
        .limit(limit);
    }

    const events = await query;

    res.json({
      events: events.map((e) => formatAlertEvent(e, ruleNameMap[e.ruleId])),
      total: events.length,
    });
  } catch (error) {
    console.error("Error fetching alert events:", error);
    res.status(500).json({ error: "Failed to fetch alert events" });
  }
});

/**
 * GET /api/alerts/events/count
 * Count unacknowledged alerts (for badge)
 */
alertRouter.get("/events/count", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get user's rule IDs
    const userRules = await db
      .select({ id: alertRules.id })
      .from(alertRules)
      .where(eq(alertRules.userId, userId));

    const ruleIds = userRules.map((r) => r.id);

    if (ruleIds.length === 0) {
      return res.json({ count: 0 });
    }

    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(alertEvents)
      .where(and(
        sql`${alertEvents.ruleId} = ANY(${ruleIds})`,
        eq(alertEvents.acknowledged, false)
      ));

    res.json({ count: result?.count || 0 });
  } catch (error) {
    console.error("Error counting alert events:", error);
    res.status(500).json({ error: "Failed to count alert events" });
  }
});

/**
 * POST /api/alerts/events/:id/acknowledge
 * Acknowledge an alert event
 */
alertRouter.post("/events/:id/acknowledge", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const eventId = req.params.id;

    // Verify event belongs to user's rule
    const [event] = await db
      .select()
      .from(alertEvents)
      .where(eq(alertEvents.id, eventId));

    if (!event) {
      return res.status(404).json({ error: "Alert event not found" });
    }

    // Check rule ownership
    const [rule] = await db
      .select()
      .from(alertRules)
      .where(and(eq(alertRules.id, event.ruleId), eq(alertRules.userId, userId)));

    if (!rule) {
      return res.status(403).json({ error: "Access denied" });
    }

    const [updated] = await db
      .update(alertEvents)
      .set({
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
      })
      .where(eq(alertEvents.id, eventId))
      .returning();

    res.json(formatAlertEvent(updated, rule.name));
  } catch (error) {
    console.error("Error acknowledging alert event:", error);
    res.status(500).json({ error: "Failed to acknowledge alert event" });
  }
});

/**
 * POST /api/alerts/events/acknowledge-all
 * Acknowledge all unacknowledged alerts for the user
 */
alertRouter.post("/events/acknowledge-all", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get user's rule IDs
    const userRules = await db
      .select({ id: alertRules.id })
      .from(alertRules)
      .where(eq(alertRules.userId, userId));

    const ruleIds = userRules.map((r) => r.id);

    if (ruleIds.length === 0) {
      return res.json({ acknowledged: 0 });
    }

    const result = await db
      .update(alertEvents)
      .set({
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
      })
      .where(and(
        sql`${alertEvents.ruleId} = ANY(${ruleIds})`,
        eq(alertEvents.acknowledged, false)
      ));

    res.json({ acknowledged: result.rowCount || 0 });
  } catch (error) {
    console.error("Error acknowledging all alerts:", error);
    res.status(500).json({ error: "Failed to acknowledge alerts" });
  }
});

// ============================================================================
// HELPERS
// ============================================================================

function formatAlertRule(rule: AlertRule) {
  return {
    id: rule.id,
    userId: rule.userId,
    name: rule.name,
    description: rule.description,
    metric: rule.metric,
    operator: rule.operator,
    threshold: rule.threshold,
    scope: rule.scope,
    channels: rule.channels,
    frequency: rule.frequency,
    enabled: rule.enabled,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
    lastTriggeredAt: rule.lastTriggeredAt?.toISOString() || null,
    lastEvaluatedAt: rule.lastEvaluatedAt?.toISOString() || null,
  };
}

function formatAlertEvent(event: AlertEvent, ruleName?: string) {
  return {
    id: event.id,
    ruleId: event.ruleId,
    ruleName: ruleName || undefined,
    triggeredAt: event.triggeredAt.toISOString(),
    hcpCount: event.hcpCount,
    hcpIds: event.hcpIds,
    metricValues: event.metricValues,
    acknowledged: event.acknowledged,
    acknowledgedAt: event.acknowledgedAt?.toISOString() || null,
    acknowledgedBy: event.acknowledgedBy,
  };
}
