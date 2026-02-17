/**
 * Admin Audit Routes
 *
 * API endpoints for admin audit log viewing and management.
 * Requires admin role for access.
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  getAuditLogsWithUsers,
  getAuditLogByIdWithUser,
  getAuditStats,
  getNpiAuditStats,
  getDistinctActions,
  getDistinctEntityTypes,
  getAuditUsers,
  exportAuditLogsCsv,
  type AuditLogFilter,
} from "../services/audit-service";
import { requireAdmin } from "../auth";

const router = Router();

// Apply admin check to all routes
router.use(requireAdmin);

// ============================================================================
// SCHEMAS
// ============================================================================

const listLogsQuerySchema = z.object({
  action: z.string().optional(),
  actionPattern: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  containsNpi: z.enum(["true", "false"]).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(500).default(50),
  offset: z.coerce.number().min(0).default(0),
});

const statsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/admin/audit-logs
 * List audit logs with filtering
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const query = listLogsQuerySchema.parse(req.query);

    const filter: AuditLogFilter = {
      action: query.action as AuditLogFilter["action"],
      actionPattern: query.actionPattern,
      entityType: query.entityType as AuditLogFilter["entityType"],
      entityId: query.entityId,
      userId: query.userId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      containsNpi: query.containsNpi === "true" ? true : undefined,
      searchText: query.search,
      limit: query.limit,
      offset: query.offset,
    };

    const { logs, total } = await getAuditLogsWithUsers(filter);

    res.json({
      logs,
      total,
      limit: query.limit,
      offset: query.offset,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
    }
    console.error("[ADMIN AUDIT] List error:", error);
    res.status(500).json({ error: "Failed to retrieve audit logs" });
  }
});

/**
 * GET /api/admin/audit-logs/stats
 * Get audit statistics
 */
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const query = statsQuerySchema.parse(req.query);

    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    const [stats, npiStats] = await Promise.all([
      getAuditStats(startDate, endDate),
      getNpiAuditStats(startDate, endDate),
    ]);

    res.json({
      ...stats,
      npi: npiStats,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
    }
    console.error("[ADMIN AUDIT] Stats error:", error);
    res.status(500).json({ error: "Failed to retrieve audit stats" });
  }
});

/**
 * GET /api/admin/audit-logs/filters
 * Get available filter options
 */
router.get("/filters", async (_req: Request, res: Response) => {
  try {
    const [actions, entityTypes, auditUsers] = await Promise.all([
      getDistinctActions(),
      getDistinctEntityTypes(),
      getAuditUsers(),
    ]);

    res.json({
      actions,
      entityTypes,
      users: auditUsers,
    });
  } catch (error) {
    console.error("[ADMIN AUDIT] Filters error:", error);
    res.status(500).json({ error: "Failed to retrieve filter options" });
  }
});

/**
 * GET /api/admin/audit-logs/export
 * Export audit logs to CSV
 */
router.get("/export", async (req: Request, res: Response) => {
  try {
    const query = listLogsQuerySchema.parse(req.query);

    const filter: AuditLogFilter = {
      action: query.action as AuditLogFilter["action"],
      actionPattern: query.actionPattern,
      entityType: query.entityType as AuditLogFilter["entityType"],
      entityId: query.entityId,
      userId: query.userId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      containsNpi: query.containsNpi === "true" ? true : undefined,
      searchText: query.search,
    };

    const csv = await exportAuditLogsCsv(filter);

    const filename = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
    }
    console.error("[ADMIN AUDIT] Export error:", error);
    res.status(500).json({ error: "Failed to export audit logs" });
  }
});

/**
 * GET /api/admin/audit-logs/:id
 * Get single audit log by ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const log = await getAuditLogByIdWithUser(id);

    if (!log) {
      return res.status(404).json({ error: "Audit log not found" });
    }

    res.json(log);
  } catch (error) {
    console.error("[ADMIN AUDIT] Get error:", error);
    res.status(500).json({ error: "Failed to retrieve audit log" });
  }
});

export default router;
