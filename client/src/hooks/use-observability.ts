/**
 * Observability Hooks
 *
 * React hooks for audit logs and system health monitoring.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ============================================================================
// TYPES
// ============================================================================

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  userId: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogFilter {
  action?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface AuditStats {
  total: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
  byUser: Record<string, number>;
}

export interface SystemHealth {
  status: "healthy" | "degraded" | "error";
  timestamp: string;
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  services: {
    validation: {
      status: string;
      circuit: string;
      stats: {
        failureCount: number;
        lastFailureTime: number;
        successCount: number;
      };
    };
    embedding: {
      status: string;
    };
  };
}

export interface Metrics {
  [key: string]: {
    type: string;
    help: string;
    values: Record<string, number | { count: number; sum: number; avg: number }>;
    buckets?: number[];
  };
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function getAuditLogs(filter: AuditLogFilter = {}): Promise<{ logs: AuditLog[]; count: number }> {
  const params = new URLSearchParams();
  if (filter.action) params.set("action", filter.action);
  if (filter.entityType) params.set("entityType", filter.entityType);
  if (filter.entityId) params.set("entityId", filter.entityId);
  if (filter.userId) params.set("userId", filter.userId);
  if (filter.startDate) params.set("startDate", filter.startDate);
  if (filter.endDate) params.set("endDate", filter.endDate);
  if (filter.limit) params.set("limit", filter.limit.toString());
  if (filter.offset) params.set("offset", filter.offset.toString());

  const response = await fetch(`/api/observability/audit?${params}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to get audit logs");
  }

  return response.json();
}

async function getAuditLogById(id: string): Promise<AuditLog> {
  const response = await fetch(`/api/observability/audit/${id}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to get audit log");
  }

  return response.json();
}

async function getEntityAuditHistory(
  entityType: string,
  entityId: string,
  limit?: number
): Promise<{ entityType: string; entityId: string; logs: AuditLog[]; count: number }> {
  const params = limit ? `?limit=${limit}` : "";
  const response = await fetch(`/api/observability/audit/entity/${entityType}/${entityId}${params}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to get entity audit history");
  }

  return response.json();
}

async function getUserAuditHistory(
  userId: string,
  limit?: number
): Promise<{ userId: string; logs: AuditLog[]; count: number }> {
  const params = limit ? `?limit=${limit}` : "";
  const response = await fetch(`/api/observability/audit/user/${userId}${params}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to get user audit history");
  }

  return response.json();
}

async function getAuditStats(startDate?: string, endDate?: string): Promise<AuditStats> {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);

  const response = await fetch(`/api/observability/audit/stats?${params}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to get audit stats");
  }

  return response.json();
}

async function searchAuditLogs(
  pattern: string,
  limit?: number
): Promise<{ pattern: string; logs: AuditLog[]; count: number }> {
  const params = new URLSearchParams({ pattern });
  if (limit) params.set("limit", limit.toString());

  const response = await fetch(`/api/observability/audit/search?${params}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to search audit logs");
  }

  return response.json();
}

async function getMetrics(format: "json" | "prometheus" = "json"): Promise<Metrics | string> {
  const response = await fetch(`/api/observability/metrics?format=${format}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to get metrics");
  }

  if (format === "prometheus") {
    return response.text();
  }

  return response.json();
}

async function resetMetrics(): Promise<{ message: string }> {
  const response = await fetch("/api/observability/metrics/reset", {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to reset metrics");
  }

  return response.json();
}

async function getSystemHealth(): Promise<SystemHealth> {
  const response = await fetch("/api/observability/health", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to get system health");
  }

  return response.json();
}

async function getLivenessCheck(): Promise<{ status: string; timestamp: string }> {
  const response = await fetch("/api/observability/health/live", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Liveness check failed");
  }

  return response.json();
}

async function getReadinessCheck(): Promise<{ status: string; timestamp: string; reasons?: string[] }> {
  const response = await fetch("/api/observability/health/ready", {
    credentials: "include",
  });

  return response.json();
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook for fetching audit logs
 */
export function useAuditLogs(filter: AuditLogFilter = {}) {
  return useQuery({
    queryKey: ["observability", "audit", filter],
    queryFn: () => getAuditLogs(filter),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook for fetching a single audit log
 */
export function useAuditLog(id: string | null) {
  return useQuery({
    queryKey: ["observability", "audit", id],
    queryFn: () => getAuditLogById(id!),
    enabled: !!id,
  });
}

/**
 * Hook for fetching entity audit history
 */
export function useEntityAuditHistory(
  entityType: string | null,
  entityId: string | null,
  limit?: number
) {
  return useQuery({
    queryKey: ["observability", "audit", "entity", entityType, entityId, limit],
    queryFn: () => getEntityAuditHistory(entityType!, entityId!, limit),
    enabled: !!entityType && !!entityId,
  });
}

/**
 * Hook for fetching user audit history
 */
export function useUserAuditHistory(userId: string | null, limit?: number) {
  return useQuery({
    queryKey: ["observability", "audit", "user", userId, limit],
    queryFn: () => getUserAuditHistory(userId!, limit),
    enabled: !!userId,
  });
}

/**
 * Hook for fetching audit statistics
 */
export function useAuditStats(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["observability", "audit", "stats", startDate, endDate],
    queryFn: () => getAuditStats(startDate, endDate),
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook for searching audit logs
 */
export function useAuditSearch(pattern: string, limit?: number) {
  return useQuery({
    queryKey: ["observability", "audit", "search", pattern, limit],
    queryFn: () => searchAuditLogs(pattern, limit),
    enabled: pattern.length >= 2,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook for fetching metrics
 */
export function useMetrics(format: "json" | "prometheus" = "json") {
  return useQuery({
    queryKey: ["observability", "metrics", format],
    queryFn: () => getMetrics(format),
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
  });
}

/**
 * Hook for resetting metrics
 */
export function useResetMetrics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resetMetrics,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["observability", "metrics"] });
    },
  });
}

/**
 * Hook for fetching system health
 */
export function useSystemHealth() {
  return useQuery({
    queryKey: ["observability", "health"],
    queryFn: getSystemHealth,
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
  });
}

/**
 * Hook for liveness check
 */
export function useLivenessCheck() {
  return useQuery({
    queryKey: ["observability", "health", "live"],
    queryFn: getLivenessCheck,
    staleTime: 5 * 1000, // 5 seconds
    refetchInterval: 15 * 1000, // Refresh every 15 seconds
  });
}

/**
 * Hook for readiness check
 */
export function useReadinessCheck() {
  return useQuery({
    queryKey: ["observability", "health", "ready"],
    queryFn: getReadinessCheck,
    staleTime: 5 * 1000, // 5 seconds
    refetchInterval: 15 * 1000, // Refresh every 15 seconds
  });
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const AUDIT_ACTIONS = [
  { value: "auth.login", label: "Login" },
  { value: "auth.logout", label: "Logout" },
  { value: "auth.register", label: "Register" },
  { value: "content.created", label: "Content Created" },
  { value: "content.updated", label: "Content Updated" },
  { value: "content.deleted", label: "Content Deleted" },
  { value: "validation.executed", label: "Validation Executed" },
  { value: "knowledge.created", label: "Knowledge Created" },
  { value: "knowledge.searched", label: "Knowledge Searched" },
  { value: "simulation.created", label: "Simulation Created" },
  { value: "hcp.viewed", label: "HCP Viewed" },
  { value: "hcp.updated", label: "HCP Updated" },
] as const;

export const ENTITY_TYPES = [
  { value: "user", label: "User" },
  { value: "hcp", label: "HCP" },
  { value: "simulation", label: "Simulation" },
  { value: "content", label: "Content" },
  { value: "knowledge", label: "Knowledge" },
  { value: "validation", label: "Validation" },
  { value: "feature_flag", label: "Feature Flag" },
  { value: "api_token", label: "API Token" },
  { value: "system", label: "System" },
] as const;
