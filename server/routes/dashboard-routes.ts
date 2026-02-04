/**
 * Dashboard Routes
 *
 * API endpoints for operational dashboard data.
 */

import { Router } from "express";
import {
  getSystemHealth,
  getOperationalMetrics,
  getAlertSummary,
  getRecentActivity,
  getDashboardData,
} from "../services/dashboard-service";
import { getPendingApprovalCount } from "../services/approval-service";

export const dashboardRouter = Router();

/**
 * GET /api/dashboard
 * Get all dashboard data in one request
 */
dashboardRouter.get("/", async (req, res) => {
  try {
    const userId = (req as any).session?.userId || (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const data = await getDashboardData(userId);
    res.json(data);
  } catch (error) {
    console.error("[DASHBOARD] Error fetching dashboard data:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

/**
 * GET /api/dashboard/health
 * Get system health status
 */
dashboardRouter.get("/health", async (_req, res) => {
  try {
    const health = await getSystemHealth();
    res.json(health);
  } catch (error) {
    console.error("[DASHBOARD] Error fetching health:", error);
    res.status(500).json({ error: "Failed to fetch system health" });
  }
});

/**
 * GET /api/dashboard/metrics
 * Get operational metrics
 */
dashboardRouter.get("/metrics", async (_req, res) => {
  try {
    const metrics = await getOperationalMetrics();
    res.json(metrics);
  } catch (error) {
    console.error("[DASHBOARD] Error fetching metrics:", error);
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

/**
 * GET /api/dashboard/alerts
 * Get alert summary
 */
dashboardRouter.get("/alerts", async (_req, res) => {
  try {
    const alerts = await getAlertSummary();
    res.json(alerts);
  } catch (error) {
    console.error("[DASHBOARD] Error fetching alerts:", error);
    res.status(500).json({ error: "Failed to fetch alert summary" });
  }
});

/**
 * GET /api/dashboard/recent-activity
 * Get user's recent activity
 */
dashboardRouter.get("/recent-activity", async (req, res) => {
  try {
    const userId = (req as any).session?.userId || (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const activity = await getRecentActivity(userId, limit);
    res.json(activity);
  } catch (error) {
    console.error("[DASHBOARD] Error fetching activity:", error);
    res.status(500).json({ error: "Failed to fetch recent activity" });
  }
});

/**
 * GET /api/dashboard/pending-approvals
 * Get pending approval count for current user
 */
dashboardRouter.get("/pending-approvals", async (req, res) => {
  try {
    const userId = (req as any).session?.userId || (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const count = await getPendingApprovalCount(userId);
    res.json({ count });
  } catch (error) {
    console.error("[DASHBOARD] Error fetching approvals:", error);
    res.status(500).json({ error: "Failed to fetch pending approvals" });
  }
});
