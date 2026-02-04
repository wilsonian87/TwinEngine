/**
 * Dashboard Service
 *
 * Provides operational dashboard data including system health,
 * metrics, alerts, and recent activity.
 */

import { db } from "../db";
import {
  hcpProfiles,
  simulationResults,
  auditLogs,
  alerts,
  exportJobs,
  approvalRequests,
} from "@shared/schema";
import { eq, desc, gte, and, sql, count } from "drizzle-orm";
import { getPendingApprovalCount } from "./approval-service";

// ============================================================================
// TYPES
// ============================================================================

export interface SystemHealth {
  healthy: boolean;
  status: "operational" | "degraded" | "down";
  dataLastUpdated: string;
  checks: {
    database: boolean;
    hcpData: boolean;
    exports: boolean;
  };
  metrics: {
    dbResponseTime: number;
    activeJobs: number;
  };
}

export interface OperationalMetrics {
  totalHcps: number;
  activeHcps: number; // engagement > 50
  atRiskHcps: number; // CPI > 70 or churn risk > 70
  atRiskTrend: number; // % change vs last week
  pendingNbas: number;
  avgEngagementScore: number;
  totalSimulations: number;
}

export interface AlertSummary {
  critical: number;
  warning: number;
  info: number;
  total: number;
}

export interface RecentActivity {
  id: string;
  type: "export" | "simulation" | "audience" | "approval" | "hcp_view" | "settings";
  description: string;
  timestamp: string;
  entityId?: string;
}

// ============================================================================
// SYSTEM HEALTH
// ============================================================================

export async function getSystemHealth(): Promise<SystemHealth> {
  const startTime = Date.now();

  // Check database connectivity
  let dbHealthy = false;
  let dbResponseTime = 0;
  try {
    await db.select({ one: sql`1` }).from(hcpProfiles).limit(1);
    dbHealthy = true;
    dbResponseTime = Date.now() - startTime;
  } catch (error) {
    console.error("[DASHBOARD] Database health check failed:", error);
  }

  // Check HCP data freshness
  let hcpDataHealthy = false;
  let dataLastUpdated = new Date().toISOString();
  try {
    const [latest] = await db
      .select({ lastUpdated: hcpProfiles.lastUpdated })
      .from(hcpProfiles)
      .orderBy(desc(hcpProfiles.lastUpdated))
      .limit(1);

    if (latest) {
      dataLastUpdated = latest.lastUpdated.toISOString();
      // Consider data healthy if updated within last 24 hours
      const hoursSinceUpdate =
        (Date.now() - new Date(dataLastUpdated).getTime()) / (1000 * 60 * 60);
      hcpDataHealthy = hoursSinceUpdate < 24;
    }
  } catch (error) {
    console.error("[DASHBOARD] HCP data check failed:", error);
  }

  // Check export system
  let exportsHealthy = true;
  let activeJobs = 0;
  try {
    const [result] = await db
      .select({ count: count() })
      .from(exportJobs)
      .where(eq(exportJobs.status, "processing"));
    activeJobs = result?.count || 0;
    // Check for stuck jobs (processing for > 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [stuckJobs] = await db
      .select({ count: count() })
      .from(exportJobs)
      .where(
        and(
          eq(exportJobs.status, "processing"),
          gte(exportJobs.createdAt, oneHourAgo)
        )
      );
    exportsHealthy = (stuckJobs?.count || 0) === 0;
  } catch (error) {
    console.error("[DASHBOARD] Export check failed:", error);
  }

  const allHealthy = dbHealthy && hcpDataHealthy && exportsHealthy;

  return {
    healthy: allHealthy,
    status: allHealthy ? "operational" : dbHealthy ? "degraded" : "down",
    dataLastUpdated,
    checks: {
      database: dbHealthy,
      hcpData: hcpDataHealthy,
      exports: exportsHealthy,
    },
    metrics: {
      dbResponseTime,
      activeJobs,
    },
  };
}

// ============================================================================
// OPERATIONAL METRICS
// ============================================================================

export async function getOperationalMetrics(): Promise<OperationalMetrics> {
  // Get all HCPs
  const hcps = await db.select().from(hcpProfiles);
  const totalHcps = hcps.length;

  // Active HCPs (engagement > 50)
  const activeHcps = hcps.filter((h) => h.overallEngagementScore > 50).length;

  // At-risk HCPs (churn risk > 70)
  const atRiskHcps = hcps.filter((h) => h.churnRisk > 70).length;

  // Calculate average engagement
  const avgEngagementScore =
    totalHcps > 0
      ? Math.round(
          hcps.reduce((sum, h) => sum + h.overallEngagementScore, 0) / totalHcps
        )
      : 0;

  // Get simulation count
  const [simCount] = await db
    .select({ count: count() })
    .from(simulationResults);
  const totalSimulations = simCount?.count || 0;

  // Pending NBAs (queued actions) - mock for now
  const pendingNbas = Math.floor(totalHcps * 0.15); // ~15% of HCPs have pending NBAs

  // At-risk trend (mock - in production, compare to last week's snapshot)
  const atRiskTrend = 5; // 5% increase vs last week

  return {
    totalHcps,
    activeHcps,
    atRiskHcps,
    atRiskTrend,
    pendingNbas,
    avgEngagementScore,
    totalSimulations,
  };
}

// ============================================================================
// ALERT SUMMARY
// ============================================================================

export async function getAlertSummary(): Promise<AlertSummary> {
  try {
    // Get alerts by severity
    const alertRows = await db
      .select({
        severity: alerts.severity,
        count: count(),
      })
      .from(alerts)
      .where(eq(alerts.status, "active"))
      .groupBy(alerts.severity);

    const summary: AlertSummary = {
      critical: 0,
      warning: 0,
      info: 0,
      total: 0,
    };

    for (const row of alertRows) {
      const cnt = row.count || 0;
      if (row.severity === "critical") summary.critical = cnt;
      else if (row.severity === "warning") summary.warning = cnt;
      else if (row.severity === "info") summary.info = cnt;
      summary.total += cnt;
    }

    return summary;
  } catch (error) {
    console.error("[DASHBOARD] Alert summary failed:", error);
    return { critical: 0, warning: 0, info: 0, total: 0 };
  }
}

// ============================================================================
// RECENT ACTIVITY
// ============================================================================

export async function getRecentActivity(
  userId: string,
  limit: number = 10
): Promise<RecentActivity[]> {
  try {
    // Get recent audit logs for this user
    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    return logs.map((log) => ({
      id: log.id,
      type: mapActionToType(log.action),
      description: formatActivityDescription(log.action, log.details),
      timestamp: log.createdAt.toISOString(),
      entityId: log.entityId || undefined,
    }));
  } catch (error) {
    console.error("[DASHBOARD] Recent activity failed:", error);
    return [];
  }
}

function mapActionToType(
  action: string
): "export" | "simulation" | "audience" | "approval" | "hcp_view" | "settings" {
  if (action.includes("export")) return "export";
  if (action.includes("simulation")) return "simulation";
  if (action.includes("audience")) return "audience";
  if (action.includes("approval")) return "approval";
  if (action.includes("hcp")) return "hcp_view";
  return "settings";
}

function formatActivityDescription(
  action: string,
  details: Record<string, unknown> | null
): string {
  const actionMap: Record<string, string> = {
    "export.created": "Started an export job",
    "export.completed": "Export completed",
    "export.downloaded": "Downloaded export file",
    "simulation.created": "Created a simulation",
    "simulation.executed": "Ran a simulation",
    "audience.created": "Created an audience",
    "audience.updated": "Updated an audience",
    "approval.requested": "Submitted approval request",
    "approval.approved": "Approved a request",
    "approval.rejected": "Rejected a request",
    "hcp.viewed": "Viewed HCP profile",
    "hcp.exported": "Exported HCP data",
    "auth.login": "Logged in",
  };

  const description = actionMap[action] || action.replace(/[._]/g, " ");

  // Add context from details if available
  if (details) {
    if (details.hcp_count) {
      return `${description} (${details.hcp_count} HCPs)`;
    }
    if (details.record_count) {
      return `${description} (${details.record_count} records)`;
    }
  }

  return description;
}

// ============================================================================
// COMBINED DASHBOARD DATA
// ============================================================================

export interface DashboardData {
  health: SystemHealth;
  metrics: OperationalMetrics;
  alerts: AlertSummary;
  recentActivity: RecentActivity[];
  pendingApprovals: number;
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const [health, metrics, alertSummary, recentActivity, pendingApprovals] =
    await Promise.all([
      getSystemHealth(),
      getOperationalMetrics(),
      getAlertSummary(),
      getRecentActivity(userId),
      getPendingApprovalCount(userId),
    ]);

  return {
    health,
    metrics,
    alerts: alertSummary,
    recentActivity,
    pendingApprovals,
  };
}
