/**
 * Observability API Routes
 *
 * Endpoints for audit logs and metrics:
 * - Audit log retrieval and search
 * - Metrics in Prometheus and JSON formats
 * - System health information
 */

import { Router } from "express";
import { z } from "zod";
import {
  getAuditLogs,
  getAuditLogById,
  getEntityAuditHistory,
  getUserAuditHistory,
  getAuditStats,
  searchAuditLogs,
  type AuditAction,
  type EntityType,
} from "../services/audit-service";
import { getPrometheusMetrics, getJsonMetrics, metrics } from "../services/metrics-service";
import { jwtAuth, requireJwtOrSession } from "../middleware/jwt-auth";
import { getValidationCircuitStatus } from "../services/validation-service";
import { isEmbeddingServiceReady } from "../services/embedding-service";

export const observabilityRouter = Router();

// Apply JWT auth middleware
observabilityRouter.use(jwtAuth);

// ============================================================================
// AUDIT LOG ENDPOINTS
// ============================================================================

/**
 * GET /api/observability/audit
 * Get audit logs with optional filtering
 */
observabilityRouter.get("/audit", requireJwtOrSession, async (req, res) => {
  try {
    const querySchema = z.object({
      action: z.string().optional(),
      entityType: z.string().optional(),
      entityId: z.string().optional(),
      userId: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.string().optional(),
      offset: z.string().optional(),
    });

    const query = querySchema.parse(req.query);

    const logs = await getAuditLogs({
      action: query.action as AuditAction | undefined,
      entityType: query.entityType as EntityType | undefined,
      entityId: query.entityId,
      userId: query.userId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit ? parseInt(query.limit, 10) : 100,
      offset: query.offset ? parseInt(query.offset, 10) : 0,
    });

    res.json({
      logs: logs.map((log) => ({
        ...log,
        createdAt: log.createdAt.toISOString(),
      })),
      count: logs.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: error.errors,
        },
      });
    }
    console.error("Get audit logs error:", error);
    res.status(500).json({
      error: {
        code: "AUDIT_ERROR",
        message: "Failed to get audit logs",
      },
    });
  }
});

/**
 * GET /api/observability/audit/:id
 * Get a specific audit log by ID
 */
observabilityRouter.get("/audit/:id", requireJwtOrSession, async (req, res) => {
  try {
    const { id } = req.params;
    const log = await getAuditLogById(id);

    if (!log) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Audit log not found",
        },
      });
    }

    res.json({
      ...log,
      createdAt: log.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Get audit log error:", error);
    res.status(500).json({
      error: {
        code: "AUDIT_ERROR",
        message: "Failed to get audit log",
      },
    });
  }
});

/**
 * GET /api/observability/audit/entity/:type/:id
 * Get audit history for a specific entity
 */
observabilityRouter.get("/audit/entity/:type/:id", requireJwtOrSession, async (req, res) => {
  try {
    const { type, id } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    const logs = await getEntityAuditHistory(type as EntityType, id, limit);

    res.json({
      entityType: type,
      entityId: id,
      logs: logs.map((log) => ({
        ...log,
        createdAt: log.createdAt.toISOString(),
      })),
      count: logs.length,
    });
  } catch (error) {
    console.error("Get entity audit history error:", error);
    res.status(500).json({
      error: {
        code: "AUDIT_ERROR",
        message: "Failed to get entity audit history",
      },
    });
  }
});

/**
 * GET /api/observability/audit/user/:userId
 * Get audit history for a specific user
 */
observabilityRouter.get("/audit/user/:userId", requireJwtOrSession, async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    const logs = await getUserAuditHistory(userId, limit);

    res.json({
      userId,
      logs: logs.map((log) => ({
        ...log,
        createdAt: log.createdAt.toISOString(),
      })),
      count: logs.length,
    });
  } catch (error) {
    console.error("Get user audit history error:", error);
    res.status(500).json({
      error: {
        code: "AUDIT_ERROR",
        message: "Failed to get user audit history",
      },
    });
  }
});

/**
 * GET /api/observability/audit/stats
 * Get audit log statistics
 */
observabilityRouter.get("/audit/stats", requireJwtOrSession, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const stats = await getAuditStats(startDate, endDate);

    res.json(stats);
  } catch (error) {
    console.error("Get audit stats error:", error);
    res.status(500).json({
      error: {
        code: "AUDIT_ERROR",
        message: "Failed to get audit statistics",
      },
    });
  }
});

/**
 * GET /api/observability/audit/search
 * Search audit logs by action pattern
 */
observabilityRouter.get("/audit/search", requireJwtOrSession, async (req, res) => {
  try {
    const pattern = req.query.pattern as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

    if (!pattern) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Pattern query parameter is required",
        },
      });
    }

    const logs = await searchAuditLogs(pattern, limit);

    res.json({
      pattern,
      logs: logs.map((log) => ({
        ...log,
        createdAt: log.createdAt.toISOString(),
      })),
      count: logs.length,
    });
  } catch (error) {
    console.error("Search audit logs error:", error);
    res.status(500).json({
      error: {
        code: "AUDIT_ERROR",
        message: "Failed to search audit logs",
      },
    });
  }
});

// ============================================================================
// METRICS ENDPOINTS
// ============================================================================

/**
 * GET /api/observability/metrics
 * Get metrics in Prometheus format
 */
observabilityRouter.get("/metrics", async (req, res) => {
  try {
    const format = req.query.format || "prometheus";

    if (format === "json") {
      res.json(getJsonMetrics());
    } else {
      res.set("Content-Type", "text/plain; charset=utf-8");
      res.send(getPrometheusMetrics());
    }
  } catch (error) {
    console.error("Get metrics error:", error);
    res.status(500).json({
      error: {
        code: "METRICS_ERROR",
        message: "Failed to get metrics",
      },
    });
  }
});

/**
 * POST /api/observability/metrics/reset
 * Reset all metrics (admin only)
 */
observabilityRouter.post("/metrics/reset", requireJwtOrSession, async (req, res) => {
  try {
    metrics.reset();
    res.json({ message: "Metrics reset successfully" });
  } catch (error) {
    console.error("Reset metrics error:", error);
    res.status(500).json({
      error: {
        code: "METRICS_ERROR",
        message: "Failed to reset metrics",
      },
    });
  }
});

// ============================================================================
// SYSTEM HEALTH ENDPOINTS
// ============================================================================

/**
 * GET /api/observability/health
 * Get system health status
 */
observabilityRouter.get("/health", async (req, res) => {
  try {
    const validationCircuit = getValidationCircuitStatus();
    const embeddingReady = isEmbeddingServiceReady();

    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        validation: {
          status: validationCircuit.state === "closed" ? "healthy" : validationCircuit.state,
          circuit: validationCircuit.state,
          stats: validationCircuit.stats,
        },
        embedding: {
          status: embeddingReady ? "ready" : "initializing",
        },
      },
    };

    // Determine overall status
    if (validationCircuit.state === "open") {
      health.status = "degraded";
    }

    res.json(health);
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      status: "error",
      error: "Failed to get health status",
    });
  }
});

/**
 * GET /api/observability/health/live
 * Liveness probe (is the service running)
 */
observabilityRouter.get("/health/live", async (req, res) => {
  res.json({ status: "alive", timestamp: new Date().toISOString() });
});

/**
 * GET /api/observability/health/ready
 * Readiness probe (is the service ready to accept traffic)
 */
observabilityRouter.get("/health/ready", async (req, res) => {
  try {
    const embeddingReady = isEmbeddingServiceReady();
    const validationCircuit = getValidationCircuitStatus();

    // Service is ready if embedding is initialized and validation circuit isn't open
    const ready = embeddingReady && validationCircuit.state !== "open";

    if (ready) {
      res.json({ status: "ready", timestamp: new Date().toISOString() });
    } else {
      res.status(503).json({
        status: "not_ready",
        timestamp: new Date().toISOString(),
        reasons: [
          !embeddingReady && "embedding service not initialized",
          validationCircuit.state === "open" && "validation circuit is open",
        ].filter(Boolean),
      });
    }
  } catch (error) {
    res.status(503).json({
      status: "not_ready",
      error: "Health check failed",
    });
  }
});
