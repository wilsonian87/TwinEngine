/**
 * Observability Middleware
 *
 * Request logging and metrics collection middleware.
 */

import type { Request, Response, NextFunction } from "express";
import { recordHttpRequest, createTimer } from "../services/metrics-service";
import { logAuditFromRequest, type AuditAction, type EntityType } from "../services/audit-service";

// ============================================================================
// REQUEST LOGGING MIDDLEWARE
// ============================================================================

/**
 * Middleware to record HTTP request metrics
 */
export function requestMetrics(req: Request, res: Response, next: NextFunction): void {
  const timer = createTimer();

  // Record response when finished
  res.on("finish", () => {
    const duration = timer();
    recordHttpRequest(req.method, req.path, res.statusCode, duration);
  });

  next();
}

/**
 * Middleware to add request ID
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = req.get("X-Request-ID") || generateRequestId();
  (req as unknown as { requestId: string }).requestId = id;
  res.set("X-Request-ID", id);
  next();
}

function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// AUDIT LOGGING HELPERS
// ============================================================================

interface AuditConfig {
  action: AuditAction;
  entityType: EntityType;
  getEntityId?: (req: Request) => string | undefined;
  getDetails?: (req: Request, res: Response) => Record<string, unknown> | undefined;
  condition?: (req: Request, res: Response) => boolean;
}

/**
 * Create middleware to automatically log audit events
 */
export function auditRoute(config: AuditConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Log audit after response is finished
    res.on("finish", () => {
      setImmediate(async () => {
        try {
          // Check condition if provided
          if (config.condition && !config.condition(req, res)) {
            return;
          }

          // Only log successful requests by default
          if (res.statusCode >= 400) {
            return;
          }

          const entityId = config.getEntityId?.(req);
          const details = config.getDetails?.(req, res);

          await logAuditFromRequest(req, config.action, config.entityType, entityId, details);
        } catch (error) {
          console.error("[Audit] Failed to log audit event:", error);
        }
      });
    });

    next();
  };
}

// ============================================================================
// PREDEFINED AUDIT MIDDLEWARE
// ============================================================================

/**
 * Audit middleware for authentication events
 */
export const auditLogin = auditRoute({
  action: "auth.login",
  entityType: "user",
  getEntityId: (req) => req.body?.username,
  getDetails: (req) => ({
    username: req.body?.username,
    userAgent: req.get("user-agent"),
  }),
});

export const auditLogout = auditRoute({
  action: "auth.logout",
  entityType: "user",
});

export const auditRegister = auditRoute({
  action: "auth.register",
  entityType: "user",
  getEntityId: (req) => req.body?.username,
  getDetails: (req) => ({
    username: req.body?.username,
  }),
});

/**
 * Audit middleware for validation events
 */
export const auditValidation = auditRoute({
  action: "validation.executed",
  entityType: "validation",
  getDetails: (req) => ({
    contentType: req.body?.contentType,
    contentLength: req.body?.content?.length,
  }),
});

/**
 * Audit middleware for knowledge events
 */
export const auditKnowledgeSearch = auditRoute({
  action: "knowledge.searched",
  entityType: "knowledge",
  getDetails: (req) => ({
    query: req.body?.query,
    filters: req.body?.filters,
  }),
});

export const auditKnowledgeCreate = auditRoute({
  action: "knowledge.created",
  entityType: "knowledge",
  getEntityId: (req) => (req as unknown as { params: { id?: string } }).params?.id,
  getDetails: (req) => ({
    title: req.body?.title,
    contentType: req.body?.contentType,
  }),
});

/**
 * Audit middleware for HCP events
 */
export const auditHcpView = auditRoute({
  action: "hcp.viewed",
  entityType: "hcp",
  getEntityId: (req) => req.params?.id,
});

export const auditHcpUpdate = auditRoute({
  action: "hcp.updated",
  entityType: "hcp",
  getEntityId: (req) => req.params?.id,
  getDetails: (req) => ({
    fields: Object.keys(req.body || {}),
  }),
});

/**
 * Audit middleware for simulation events
 */
export const auditSimulationCreate = auditRoute({
  action: "simulation.created",
  entityType: "simulation",
  getDetails: (req) => ({
    name: req.body?.name,
    channelMix: req.body?.channelMix,
  }),
});

/**
 * Audit middleware for feature flag events
 */
export const auditFeatureFlagUpdate = auditRoute({
  action: "feature_flag.updated",
  entityType: "feature_flag",
  getEntityId: (req) => req.params?.id || req.params?.name,
  getDetails: (req) => ({
    changes: req.body,
  }),
});
