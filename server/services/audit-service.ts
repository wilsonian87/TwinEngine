/**
 * Audit Service
 *
 * Centralized audit logging for compliance and governance.
 * Logs all significant actions with context for traceability.
 * Enhanced with NPI tracking and middleware support.
 */

import { db } from "../db";
import { auditLogs, users, type InsertAuditLog, type AuditLogDB } from "@shared/schema";
import { eq, desc, and, gte, lte, sql, like, or } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

// ============================================================================
// TYPES
// ============================================================================

export type AuditAction =
  // Auth actions
  | "auth.login"
  | "auth.logout"
  | "auth.register"
  | "auth.token_issued"
  | "auth.token_revoked"
  | "auth.api_key_created"
  | "auth.api_key_revoked"
  // Content actions
  | "content.created"
  | "content.updated"
  | "content.deleted"
  | "content.validated"
  | "content.approved"
  | "content.rejected"
  // Knowledge actions
  | "knowledge.created"
  | "knowledge.updated"
  | "knowledge.deleted"
  | "knowledge.searched"
  // Validation actions
  | "validation.executed"
  | "validation.saved"
  | "validation.reviewed"
  // Simulation actions
  | "simulation.created"
  | "simulation.executed"
  // HCP actions
  | "hcp.viewed"
  | "hcp.updated"
  | "hcp.exported"
  | "hcp.bulk_view"
  // Feature flag actions
  | "feature_flag.created"
  | "feature_flag.updated"
  | "feature_flag.deleted"
  // Admin actions
  | "admin.user_created"
  | "admin.user_updated"
  | "admin.user_deleted"
  | "admin.settings_updated"
  // Export actions
  | "export.created"
  | "export.downloaded"
  | "export.completed"
  | "export.failed"
  // Integration actions
  | "integration.push"
  | "integration.connected"
  | "integration.disconnected"
  | "veeva.push"
  // Webhook actions
  | "webhook.created"
  | "webhook.updated"
  | "webhook.deleted"
  | "webhook.send"
  | "webhook.test"
  // Approval actions
  | "approval.requested"
  | "approval.approved"
  | "approval.rejected"
  | "approval.cancelled"
  | "approval.expired"
  // Audience actions
  | "audience.created"
  | "audience.updated"
  | "audience.deleted"
  // System actions
  | "system.startup"
  | "system.shutdown"
  | "system.error";

export type EntityType =
  | "user"
  | "hcp"
  | "simulation"
  | "content"
  | "knowledge"
  | "validation"
  | "feature_flag"
  | "api_token"
  | "system";

export interface AuditContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
}

export interface AuditLogEntry {
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  details?: Record<string, unknown>;
  context?: AuditContext;
}

export interface AuditLogFilter {
  action?: AuditAction;
  actionPattern?: string;
  entityType?: EntityType;
  entityId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  containsNpi?: boolean;
  searchText?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogResult {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  userId: string | null;
  ipAddress: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

export interface AuditLogWithUser extends AuditLogResult {
  user?: {
    id: string;
    username: string;
  } | null;
}

// Details extractor function type for middleware
export type DetailsExtractor = (req: Request, res: Response) => Record<string, unknown>;

// ============================================================================
// AUDIT MIDDLEWARE
// ============================================================================

/**
 * Express middleware for automatic audit logging
 * Logs actions after successful response (status < 400)
 */
export function auditMiddleware(
  action: AuditAction,
  entityType: EntityType,
  detailsExtractor?: DetailsExtractor
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original response end
    const originalEnd = res.end;
    let responseBody: unknown;

    // Intercept response to capture body if needed
    res.end = function (chunk?: unknown, ...args: unknown[]) {
      if (chunk) {
        try {
          responseBody = JSON.parse(chunk.toString());
        } catch {
          responseBody = chunk;
        }
      }
      return originalEnd.apply(res, [chunk, ...args] as Parameters<typeof originalEnd>);
    };

    // Continue with request
    res.on("finish", async () => {
      // Only log successful requests
      if (res.statusCode < 400) {
        try {
          const details = detailsExtractor
            ? detailsExtractor(req, res)
            : extractDefaultDetails(req, responseBody);

          await logAuditFromRequest(req, action, entityType, undefined, details);
        } catch (error) {
          console.error("[AUDIT] Failed to log audit:", error);
        }
      }
    });

    next();
  };
}

/**
 * Extract default details from request/response
 */
function extractDefaultDetails(req: Request, responseBody?: unknown): Record<string, unknown> {
  const details: Record<string, unknown> = {
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
  };

  // Extract entity ID from params if present
  if (req.params.id) {
    details.entityId = req.params.id;
  }

  // Check for NPI in request body or response
  const containsNpi = checkForNpi(req.body) || checkForNpi(responseBody);
  if (containsNpi) {
    details.contains_npi = true;
  }

  // Include record count if response has it
  if (responseBody && typeof responseBody === "object" && responseBody !== null) {
    const body = responseBody as Record<string, unknown>;
    if (typeof body.total === "number") {
      details.record_count = body.total;
    }
    if (Array.isArray(body.hcps)) {
      details.hcp_count = body.hcps.length;
    }
  }

  return details;
}

/**
 * Check if data contains NPI values
 */
function checkForNpi(data: unknown): boolean {
  if (!data) return false;

  if (typeof data === "string") {
    // Simple NPI pattern check (10 digits)
    return /\b\d{10}\b/.test(data);
  }

  if (Array.isArray(data)) {
    return data.some((item) => checkForNpi(item));
  }

  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    // Check for explicit NPI fields
    if ("npi" in obj || "npis" in obj || "npi_list" in obj) {
      return true;
    }
    // Check for contains_npi flag
    if (obj.contains_npi === true) {
      return true;
    }
    // Check nested objects
    return Object.values(obj).some((value) => checkForNpi(value));
  }

  return false;
}

// ============================================================================
// AUDIT SERVICE
// ============================================================================

/**
 * Log an audit event
 */
export async function logAudit(entry: AuditLogEntry): Promise<string> {
  const logData: InsertAuditLog = {
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    details: entry.details,
    userId: entry.context?.userId,
    ipAddress: entry.context?.ipAddress,
  };

  const [inserted] = await db.insert(auditLogs).values(logData).returning({ id: auditLogs.id });

  return inserted.id;
}

/**
 * Log an audit event from an Express request
 */
export async function logAuditFromRequest(
  req: Request,
  action: AuditAction,
  entityType: EntityType,
  entityId?: string,
  details?: Record<string, unknown>
): Promise<string> {
  const userId =
    (req as unknown as { jwtUser?: { sub: string } }).jwtUser?.sub ||
    (req as unknown as { apiToken?: { userId: string } }).apiToken?.userId ||
    (req as unknown as { user?: { id: string } }).user?.id;

  const context: AuditContext = {
    userId,
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: req.get("user-agent"),
    sessionId: req.sessionID,
  };

  return logAudit({
    action,
    entityType,
    entityId,
    details,
    context,
  });
}

/**
 * Get audit logs with filtering
 */
export async function getAuditLogs(filter: AuditLogFilter = {}): Promise<AuditLogResult[]> {
  const {
    action,
    actionPattern,
    entityType,
    entityId,
    userId,
    startDate,
    endDate,
    containsNpi,
    searchText,
    limit = 100,
    offset = 0,
  } = filter;

  const conditions = [];

  if (action) {
    conditions.push(eq(auditLogs.action, action));
  }
  if (actionPattern) {
    conditions.push(like(auditLogs.action, `%${actionPattern}%`));
  }
  if (entityType) {
    conditions.push(eq(auditLogs.entityType, entityType));
  }
  if (entityId) {
    conditions.push(eq(auditLogs.entityId, entityId));
  }
  if (userId) {
    conditions.push(eq(auditLogs.userId, userId));
  }
  if (startDate) {
    conditions.push(gte(auditLogs.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(auditLogs.createdAt, endDate));
  }
  // Filter by contains_npi in details JSON
  if (containsNpi === true) {
    conditions.push(sql`${auditLogs.details}->>'contains_npi' = 'true'`);
  }
  // Search in action, entityType, or details
  if (searchText) {
    conditions.push(
      or(
        like(auditLogs.action, `%${searchText}%`),
        like(auditLogs.entityType, `%${searchText}%`),
        sql`${auditLogs.details}::text ILIKE ${`%${searchText}%`}`
      )!
    );
  }

  const query = db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  if (conditions.length > 0) {
    query.where(and(...conditions));
  }

  const rows = await query;

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    details: row.details,
    userId: row.userId,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt,
  }));
}

/**
 * Get audit logs with user details (for admin view)
 */
export async function getAuditLogsWithUsers(
  filter: AuditLogFilter = {}
): Promise<{ logs: AuditLogWithUser[]; total: number }> {
  const {
    action,
    actionPattern,
    entityType,
    entityId,
    userId,
    startDate,
    endDate,
    containsNpi,
    searchText,
    limit = 100,
    offset = 0,
  } = filter;

  const conditions = [];

  if (action) {
    conditions.push(eq(auditLogs.action, action));
  }
  if (actionPattern) {
    conditions.push(like(auditLogs.action, `%${actionPattern}%`));
  }
  if (entityType) {
    conditions.push(eq(auditLogs.entityType, entityType));
  }
  if (entityId) {
    conditions.push(eq(auditLogs.entityId, entityId));
  }
  if (userId) {
    conditions.push(eq(auditLogs.userId, userId));
  }
  if (startDate) {
    conditions.push(gte(auditLogs.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(auditLogs.createdAt, endDate));
  }
  if (containsNpi === true) {
    conditions.push(sql`${auditLogs.details}->>'contains_npi' = 'true'`);
  }
  if (searchText) {
    conditions.push(
      or(
        like(auditLogs.action, `%${searchText}%`),
        like(auditLogs.entityType, `%${searchText}%`),
        sql`${auditLogs.details}::text ILIKE ${`%${searchText}%`}`
      )!
    );
  }

  // Get total count
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const countQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs);
  if (whereClause) {
    countQuery.where(whereClause);
  }
  const [{ count }] = await countQuery;
  const total = Number(count);

  // Get paginated results with user join
  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      details: auditLogs.details,
      userId: auditLogs.userId,
      ipAddress: auditLogs.ipAddress,
      userAgent: auditLogs.userAgent,
      createdAt: auditLogs.createdAt,
      userName: users.username,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(whereClause)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  const logs: AuditLogWithUser[] = rows.map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    details: row.details,
    userId: row.userId,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt,
    user: row.userId
      ? {
          id: row.userId,
          username: row.userName || "Unknown",
        }
      : null,
  }));

  return { logs, total };
}

/**
 * Get audit log by ID
 */
export async function getAuditLogById(id: string): Promise<AuditLogResult | null> {
  const [row] = await db.select().from(auditLogs).where(eq(auditLogs.id, id)).limit(1);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    details: row.details,
    userId: row.userId,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt,
  };
}

/**
 * Get audit log by ID with user details
 */
export async function getAuditLogByIdWithUser(id: string): Promise<AuditLogWithUser | null> {
  const [row] = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      details: auditLogs.details,
      userId: auditLogs.userId,
      ipAddress: auditLogs.ipAddress,
      userAgent: auditLogs.userAgent,
      createdAt: auditLogs.createdAt,
      userName: users.username,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(eq(auditLogs.id, id))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    details: row.details,
    userId: row.userId,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt,
    user: row.userId
      ? {
          id: row.userId,
          username: row.userName || "Unknown",
        }
      : null,
  };
}

/**
 * Get audit logs for a specific entity
 */
export async function getEntityAuditHistory(
  entityType: EntityType,
  entityId: string,
  limit: number = 50
): Promise<AuditLogResult[]> {
  return getAuditLogs({ entityType, entityId, limit });
}

/**
 * Get audit logs for a specific user
 */
export async function getUserAuditHistory(userId: string, limit: number = 50): Promise<AuditLogResult[]> {
  return getAuditLogs({ userId, limit });
}

/**
 * Get audit statistics
 */
export async function getAuditStats(
  startDate?: Date,
  endDate?: Date
): Promise<{
  total: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
  byUser: Record<string, number>;
}> {
  const conditions = [];

  if (startDate) {
    conditions.push(gte(auditLogs.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(auditLogs.createdAt, endDate));
  }

  // Get total count
  const countQuery = db.select({ count: sql<number>`count(*)` }).from(auditLogs);
  if (conditions.length > 0) {
    countQuery.where(and(...conditions));
  }
  const [{ count: total }] = await countQuery;

  // Get counts by action
  const actionQuery = db
    .select({
      action: auditLogs.action,
      count: sql<number>`count(*)`,
    })
    .from(auditLogs)
    .groupBy(auditLogs.action);
  if (conditions.length > 0) {
    actionQuery.where(and(...conditions));
  }
  const actionRows = await actionQuery;
  const byAction: Record<string, number> = {};
  for (const row of actionRows) {
    byAction[row.action] = Number(row.count);
  }

  // Get counts by entity type
  const entityQuery = db
    .select({
      entityType: auditLogs.entityType,
      count: sql<number>`count(*)`,
    })
    .from(auditLogs)
    .groupBy(auditLogs.entityType);
  if (conditions.length > 0) {
    entityQuery.where(and(...conditions));
  }
  const entityRows = await entityQuery;
  const byEntityType: Record<string, number> = {};
  for (const row of entityRows) {
    byEntityType[row.entityType] = Number(row.count);
  }

  // Get counts by user (top 10)
  const userQuery = db
    .select({
      userId: auditLogs.userId,
      count: sql<number>`count(*)`,
    })
    .from(auditLogs)
    .groupBy(auditLogs.userId)
    .orderBy(desc(sql`count(*)`))
    .limit(10);
  if (conditions.length > 0) {
    userQuery.where(and(...conditions));
  }
  const userRows = await userQuery;
  const byUser: Record<string, number> = {};
  for (const row of userRows) {
    if (row.userId) {
      byUser[row.userId] = Number(row.count);
    }
  }

  return {
    total: Number(total),
    byAction,
    byEntityType,
    byUser,
  };
}

/**
 * Search audit logs by action pattern
 */
export async function searchAuditLogs(
  pattern: string,
  limit: number = 100
): Promise<AuditLogResult[]> {
  const rows = await db
    .select()
    .from(auditLogs)
    .where(like(auditLogs.action, `%${pattern}%`))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    details: row.details,
    userId: row.userId,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt,
  }));
}

/**
 * Delete old audit logs (for retention policy)
 */
export async function purgeAuditLogs(olderThan: Date): Promise<number> {
  const result = await db.delete(auditLogs).where(lte(auditLogs.createdAt, olderThan));
  return result.rowCount ?? 0;
}

// ============================================================================
// ADMIN HELPERS
// ============================================================================

/**
 * Get unique action types from audit logs
 */
export async function getDistinctActions(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ action: auditLogs.action })
    .from(auditLogs)
    .orderBy(auditLogs.action);

  return rows.map((r) => r.action);
}

/**
 * Get unique entity types from audit logs
 */
export async function getDistinctEntityTypes(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ entityType: auditLogs.entityType })
    .from(auditLogs)
    .orderBy(auditLogs.entityType);

  return rows.map((r) => r.entityType);
}

/**
 * Get users who have audit logs
 */
export async function getAuditUsers(): Promise<{ id: string; username: string }[]> {
  const rows = await db
    .selectDistinct({
      userId: auditLogs.userId,
    })
    .from(auditLogs)
    .where(sql`${auditLogs.userId} IS NOT NULL`);

  const userIds = rows.map((r) => r.userId).filter((id): id is string => id !== null);

  if (userIds.length === 0) {
    return [];
  }

  const userRows = await db
    .select({
      id: users.id,
      username: users.username,
    })
    .from(users)
    .where(sql`${users.id} IN ${userIds}`);

  return userRows;
}

/**
 * Get NPI-related audit stats
 */
export async function getNpiAuditStats(
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalNpiLogs: number;
  byAction: Record<string, number>;
  byUser: Record<string, number>;
}> {
  const conditions = [sql`${auditLogs.details}->>'contains_npi' = 'true'`];

  if (startDate) {
    conditions.push(gte(auditLogs.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(auditLogs.createdAt, endDate));
  }

  const whereClause = and(...conditions);

  // Total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(whereClause);

  // By action
  const actionRows = await db
    .select({
      action: auditLogs.action,
      count: sql<number>`count(*)`,
    })
    .from(auditLogs)
    .where(whereClause)
    .groupBy(auditLogs.action);

  const byAction: Record<string, number> = {};
  for (const row of actionRows) {
    byAction[row.action] = Number(row.count);
  }

  // By user
  const userRows = await db
    .select({
      userId: auditLogs.userId,
      count: sql<number>`count(*)`,
    })
    .from(auditLogs)
    .where(whereClause)
    .groupBy(auditLogs.userId);

  const byUser: Record<string, number> = {};
  for (const row of userRows) {
    if (row.userId) {
      byUser[row.userId] = Number(row.count);
    }
  }

  return {
    totalNpiLogs: Number(count),
    byAction,
    byUser,
  };
}

/**
 * Export audit logs to CSV format
 */
export async function exportAuditLogsCsv(filter: AuditLogFilter = {}): Promise<string> {
  // Get all matching logs (no pagination for export)
  const logs = await getAuditLogs({ ...filter, limit: 10000, offset: 0 });

  const headers = [
    "ID",
    "Timestamp",
    "Action",
    "Entity Type",
    "Entity ID",
    "User ID",
    "IP Address",
    "User Agent",
    "Contains NPI",
    "Details",
  ];

  const rows = logs.map((log) => [
    log.id,
    log.createdAt.toISOString(),
    log.action,
    log.entityType,
    log.entityId || "",
    log.userId || "",
    log.ipAddress || "",
    log.userAgent || "",
    log.details?.contains_npi ? "Yes" : "No",
    JSON.stringify(log.details || {}),
  ]);

  const escapeCell = (value: string) => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const csvLines = [
    headers.join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ];

  return csvLines.join("\n");
}
