import { eq, desc, and } from "drizzle-orm";
import { db } from "../db";
import {
  exportJobs,
  integrationCredentials,
  hcpProfiles,
  savedAudiences,
  type ExportJob,
  type ExportType,
  type ExportDestination,
} from "@shared/schema";

// ============================================================================
// TYPES
// ============================================================================

export interface ExportJobInput {
  type: ExportType;
  destination: ExportDestination;
  payload: {
    entityId?: string;
    hcpIds?: string[];
    filters?: Record<string, unknown>;
    fields: string[];
    includeNBA?: boolean;
  };
  destinationConfig?: Record<string, unknown>;
}

export interface ExportResult {
  url: string;
  filename: string;
  size: number;
  recordCount: number;
}

// Simple in-memory job queue (in production, use Redis/BullMQ)
const jobQueue: Map<string, NodeJS.Timeout> = new Map();

// ============================================================================
// JOB MANAGEMENT
// ============================================================================

/**
 * Create a new export job and queue it for processing
 */
export async function createExportJob(
  userId: string,
  input: ExportJobInput
): Promise<ExportJob> {
  const [job] = await db
    .insert(exportJobs)
    .values({
      userId,
      type: input.type,
      destination: input.destination,
      payload: input.payload,
      destinationConfig: input.destinationConfig || {},
      status: "pending",
    })
    .returning();

  // Queue for async processing (simulated with setTimeout)
  const timeoutId = setTimeout(() => {
    processExportJob(job.id).catch((err) =>
      console.error(`Export job ${job.id} failed:`, err)
    );
    jobQueue.delete(job.id);
  }, 100); // Small delay to allow response to return first

  jobQueue.set(job.id, timeoutId);

  return job;
}

/**
 * Get export job by ID
 */
export async function getExportJob(
  jobId: string,
  userId: string
): Promise<ExportJob | null> {
  const [job] = await db
    .select()
    .from(exportJobs)
    .where(and(eq(exportJobs.id, jobId), eq(exportJobs.userId, userId)));

  return job || null;
}

/**
 * List export jobs for a user
 */
export async function listExportJobs(
  userId: string,
  options: { limit?: number; offset?: number; status?: string } = {}
): Promise<{ jobs: ExportJob[]; total: number }> {
  const { limit = 20, offset = 0, status } = options;

  const conditions = [eq(exportJobs.userId, userId)];
  if (status) {
    conditions.push(eq(exportJobs.status, status));
  }

  const jobs = await db
    .select()
    .from(exportJobs)
    .where(and(...conditions))
    .orderBy(desc(exportJobs.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count
  const allJobs = await db
    .select()
    .from(exportJobs)
    .where(and(...conditions));

  return { jobs, total: allJobs.length };
}

/**
 * Cancel a pending export job
 */
export async function cancelExportJob(
  jobId: string,
  userId: string
): Promise<boolean> {
  const [job] = await db
    .select()
    .from(exportJobs)
    .where(and(eq(exportJobs.id, jobId), eq(exportJobs.userId, userId)));

  if (!job || job.status !== "pending") {
    return false;
  }

  // Cancel queued timeout
  const timeout = jobQueue.get(jobId);
  if (timeout) {
    clearTimeout(timeout);
    jobQueue.delete(jobId);
  }

  await db
    .update(exportJobs)
    .set({ status: "failed", errorMessage: "Cancelled by user", completedAt: new Date() })
    .where(eq(exportJobs.id, jobId));

  return true;
}

// ============================================================================
// JOB PROCESSING
// ============================================================================

/**
 * Process an export job
 */
export async function processExportJob(jobId: string): Promise<void> {
  const [job] = await db
    .select()
    .from(exportJobs)
    .where(eq(exportJobs.id, jobId));

  if (!job) {
    console.error(`Export job ${jobId} not found`);
    return;
  }

  // Update status to processing
  await db
    .update(exportJobs)
    .set({ status: "processing", startedAt: new Date() })
    .where(eq(exportJobs.id, jobId));

  try {
    const result = await executeExport(job);

    await db
      .update(exportJobs)
      .set({
        status: "complete",
        resultUrl: result.url,
        completedAt: new Date(),
      })
      .where(eq(exportJobs.id, jobId));

    console.log(`Export job ${jobId} completed: ${result.recordCount} records`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await db
      .update(exportJobs)
      .set({
        status: "failed",
        errorMessage,
        completedAt: new Date(),
      })
      .where(eq(exportJobs.id, jobId));

    console.error(`Export job ${jobId} failed:`, errorMessage);
  }
}

/**
 * Execute the export based on destination type
 */
async function executeExport(job: ExportJob): Promise<ExportResult> {
  // Fetch the data to export
  const data = await fetchExportData(job);

  switch (job.destination) {
    case "csv":
      return exportToCSV(job, data);
    case "xlsx":
      return exportToXLSX(job, data);
    case "veeva":
      return exportToVeeva(job, data);
    case "webhook":
      return exportToWebhook(job, data);
    case "sftp":
      return exportToSFTP(job, data);
    default:
      throw new Error(`Unknown destination: ${job.destination}`);
  }
}

/**
 * Fetch data for export based on job type
 */
async function fetchExportData(job: ExportJob): Promise<Record<string, unknown>[]> {
  const payload = job.payload as {
    entityId?: string;
    hcpIds?: string[];
    filters?: Record<string, unknown>;
    fields: string[];
    includeNBA?: boolean;
  };

  switch (job.type) {
    case "audience": {
      if (!payload.entityId) {
        throw new Error("entityId required for audience export");
      }
      const [audience] = await db
        .select()
        .from(savedAudiences)
        .where(eq(savedAudiences.id, payload.entityId));

      if (!audience) {
        throw new Error("Audience not found");
      }

      const hcps = await db
        .select()
        .from(hcpProfiles)
        .where(eq(hcpProfiles.id, audience.hcpIds[0] || ""))
        .limit(0); // We'll fetch properly below

      // Fetch all HCPs in the audience
      const hcpData = [];
      for (const hcpId of audience.hcpIds) {
        const [hcp] = await db.select().from(hcpProfiles).where(eq(hcpProfiles.id, hcpId));
        if (hcp) {
          hcpData.push(filterFields(hcp, payload.fields));
        }
      }
      return hcpData;
    }

    case "hcp_list": {
      let hcps;
      if (payload.hcpIds && payload.hcpIds.length > 0) {
        // Fetch specific HCPs
        hcps = [];
        for (const hcpId of payload.hcpIds) {
          const [hcp] = await db.select().from(hcpProfiles).where(eq(hcpProfiles.id, hcpId));
          if (hcp) hcps.push(hcp);
        }
      } else {
        // Fetch all (with optional filters - simplified)
        hcps = await db.select().from(hcpProfiles).limit(1000);
      }
      return hcps.map((hcp) => filterFields(hcp, payload.fields));
    }

    case "nba_recommendations": {
      // Mock NBA data - in production, would fetch from NBA storage
      const hcpIds = payload.hcpIds || [];
      return hcpIds.map((id) => ({
        hcpId: id,
        recommendation: "Email Campaign",
        channel: "email",
        confidence: Math.random() * 0.4 + 0.6,
        reason: "High digital engagement",
      }));
    }

    case "simulation_results": {
      // Mock simulation data
      return [
        { metric: "projected_lift", value: 12.5 },
        { metric: "confidence", value: 0.85 },
        { metric: "reach", value: 1234 },
      ];
    }

    default:
      throw new Error(`Unknown export type: ${job.type}`);
  }
}

/**
 * Filter object to only include specified fields
 */
function filterFields(
  obj: Record<string, unknown>,
  fields: string[]
): Record<string, unknown> {
  if (fields.length === 0) return obj;

  const result: Record<string, unknown> = {};
  for (const field of fields) {
    if (field in obj) {
      result[field] = obj[field];
    }
  }
  return result;
}

// ============================================================================
// EXPORT DESTINATIONS
// ============================================================================

/**
 * Export to CSV format
 */
async function exportToCSV(
  job: ExportJob,
  data: Record<string, unknown>[]
): Promise<ExportResult> {
  if (data.length === 0) {
    throw new Error("No data to export");
  }

  // Generate CSV content
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      if (val === null || val === undefined) return "";
      if (typeof val === "string" && val.includes(",")) return `"${val}"`;
      return String(val);
    }).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");

  // In production, would upload to S3/cloud storage
  // For now, store as data URL (base64)
  const base64 = Buffer.from(csv).toString("base64");
  const filename = `export-${job.type}-${Date.now()}.csv`;

  return {
    url: `data:text/csv;base64,${base64}`,
    filename,
    size: csv.length,
    recordCount: data.length,
  };
}

/**
 * Export to XLSX format (simplified - in production use xlsx library)
 */
async function exportToXLSX(
  job: ExportJob,
  data: Record<string, unknown>[]
): Promise<ExportResult> {
  // For MVP, generate CSV with xlsx extension hint
  // In production, would use xlsx/exceljs library
  const csvResult = await exportToCSV(job, data);
  return {
    ...csvResult,
    filename: csvResult.filename.replace(".csv", ".xlsx"),
    url: csvResult.url.replace("text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
  };
}

/**
 * Export to Veeva CRM
 */
async function exportToVeeva(
  job: ExportJob,
  data: Record<string, unknown>[]
): Promise<ExportResult> {
  const config = job.destinationConfig as {
    instanceUrl?: string;
    objectType?: string;
  } | null;

  if (!config?.instanceUrl) {
    throw new Error("Veeva instance URL required in destination config");
  }

  // In production, would make actual Veeva API calls
  // For now, simulate success
  console.log(`[MOCK] Pushing ${data.length} records to Veeva: ${config.instanceUrl}`);

  return {
    url: `veeva://${config.instanceUrl}/import/${job.id}`,
    filename: `veeva-sync-${job.id}`,
    size: JSON.stringify(data).length,
    recordCount: data.length,
  };
}

/**
 * Export to webhook endpoint
 */
async function exportToWebhook(
  job: ExportJob,
  data: Record<string, unknown>[]
): Promise<ExportResult> {
  const config = job.destinationConfig as {
    url?: string;
    headers?: Record<string, string>;
  } | null;

  if (!config?.url) {
    throw new Error("Webhook URL required in destination config");
  }

  // Make webhook call
  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...config.headers,
    },
    body: JSON.stringify({
      jobId: job.id,
      type: job.type,
      recordCount: data.length,
      data,
    }),
  });

  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
  }

  return {
    url: config.url,
    filename: `webhook-${job.id}`,
    size: JSON.stringify(data).length,
    recordCount: data.length,
  };
}

/**
 * Export to SFTP server
 */
async function exportToSFTP(
  job: ExportJob,
  data: Record<string, unknown>[]
): Promise<ExportResult> {
  const config = job.destinationConfig as {
    host?: string;
    port?: number;
    username?: string;
    path?: string;
  } | null;

  if (!config?.host) {
    throw new Error("SFTP host required in destination config");
  }

  // In production, would use ssh2-sftp-client
  // For now, simulate success
  console.log(`[MOCK] Uploading ${data.length} records to SFTP: ${config.host}:${config.path}`);

  const filename = `export-${job.type}-${Date.now()}.csv`;

  return {
    url: `sftp://${config.host}${config.path || "/"}${filename}`,
    filename,
    size: JSON.stringify(data).length,
    recordCount: data.length,
  };
}

// ============================================================================
// INTEGRATION CREDENTIALS
// ============================================================================

/**
 * Save or update integration credentials
 */
export async function saveIntegrationCredentials(
  userId: string,
  integrationType: string,
  credentials: Record<string, unknown>
): Promise<void> {
  // Check if exists
  const [existing] = await db
    .select()
    .from(integrationCredentials)
    .where(
      and(
        eq(integrationCredentials.userId, userId),
        eq(integrationCredentials.integrationType, integrationType)
      )
    );

  if (existing) {
    await db
      .update(integrationCredentials)
      .set({ credentials, isValid: true, lastValidatedAt: new Date() })
      .where(eq(integrationCredentials.id, existing.id));
  } else {
    await db.insert(integrationCredentials).values({
      userId,
      integrationType,
      credentials,
      isValid: true,
      lastValidatedAt: new Date(),
    });
  }
}

/**
 * Get integration credentials
 */
export async function getIntegrationCredentials(
  userId: string,
  integrationType: string
): Promise<Record<string, unknown> | null> {
  const [cred] = await db
    .select()
    .from(integrationCredentials)
    .where(
      and(
        eq(integrationCredentials.userId, userId),
        eq(integrationCredentials.integrationType, integrationType)
      )
    );

  return cred?.credentials || null;
}

/**
 * List all integrations for a user
 */
export async function listIntegrations(
  userId: string
): Promise<{ type: string; isValid: boolean; lastValidated: Date | null }[]> {
  const creds = await db
    .select()
    .from(integrationCredentials)
    .where(eq(integrationCredentials.userId, userId));

  return creds.map((c) => ({
    type: c.integrationType,
    isValid: c.isValid,
    lastValidated: c.lastValidatedAt,
  }));
}
