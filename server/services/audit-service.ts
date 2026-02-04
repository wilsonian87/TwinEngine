/**
 * Audit Service
 *
 * Centralized audit logging for compliance and governance.
 * Logs all significant actions with context for traceability.
 */

import { db } from "../db";
import { auditLogs, type InsertAuditLog, type AuditLogDB } from "@shared/schema";
import { eq, desc, and, gte, lte, sql, like } from "drizzle-orm";
import type { Request } from "express";

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
  // Feature flag actions
  | "feature_flag.created"
  | "feature_flag.updated"
  | "feature_flag.deleted"
  // Admin actions
  | "admin.user_created"
  | "admin.user_updated"
  | "admin.user_deleted"
  | "admin.settings_updated"
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
  entityType?: EntityType;
  entityId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
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
  createdAt: Date;
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
  const { action, entityType, entityId, userId, startDate, endDate, limit = 100, offset = 0 } = filter;

  const conditions = [];

  if (action) {
    conditions.push(eq(auditLogs.action, action));
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
    createdAt: row.createdAt,
  }));
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
    createdAt: row.createdAt,
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
