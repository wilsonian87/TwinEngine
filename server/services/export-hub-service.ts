import { eq, desc, and, inArray } from "drizzle-orm";
import { stringify } from "csv-stringify/sync";
import ExcelJS from "exceljs";
import { db } from "../db";
import {
  exportJobs,
  integrationCredentials,
  hcpProfiles,
  savedAudiences,
  auditLogs,
  webhookDestinations,
  webhookLogs,
  type ExportJob,
  type ExportType,
  type ExportDestination,
} from "@shared/schema";
import { pushToVeeva, getVeevaCredentials } from "./veeva-integration";
import { renderPayloadTemplate } from "../routes/webhook-routes";

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

// In-memory file storage (in production, use S3/cloud storage)
const fileStorage: Map<string, { buffer: Buffer; contentType: string; filename: string }> = new Map();

// ============================================================================
// FIELD DEFINITIONS
// ============================================================================

export const FIELD_DEFINITIONS: Record<string, { label: string; sensitive: boolean }> = {
  id: { label: "ID", sensitive: false },
  npi: { label: "NPI", sensitive: true },
  firstName: { label: "First Name", sensitive: false },
  lastName: { label: "Last Name", sensitive: false },
  specialty: { label: "Specialty", sensitive: false },
  tier: { label: "Tier", sensitive: false },
  segment: { label: "Segment", sensitive: false },
  organization: { label: "Organization", sensitive: false },
  city: { label: "City", sensitive: false },
  state: { label: "State", sensitive: false },
  overallEngagementScore: { label: "Engagement Score", sensitive: false },
  channelPreference: { label: "Channel Preference", sensitive: false },
  monthlyRxVolume: { label: "Monthly Rx Volume", sensitive: false },
  yearlyRxVolume: { label: "Yearly Rx Volume", sensitive: false },
  marketSharePct: { label: "Market Share %", sensitive: false },
  conversionLikelihood: { label: "Conversion Likelihood", sensitive: false },
  churnRisk: { label: "Churn Risk", sensitive: false },
  nbaAction: { label: "NBA Recommendation", sensitive: false },
  nbaRationale: { label: "NBA Rationale", sensitive: false },
  nbaConfidence: { label: "NBA Confidence", sensitive: false },
};

function formatFieldLabel(field: string): string {
  return FIELD_DEFINITIONS[field]?.label || field;
}

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
 * Export to CSV format using csv-stringify
 */
async function exportToCSV(
  job: ExportJob,
  data: Record<string, unknown>[]
): Promise<ExportResult> {
  if (data.length === 0) {
    throw new Error("No data to export");
  }

  const payload = job.payload as { fields: string[]; includeNBA?: boolean };
  const fields = payload.fields || Object.keys(data[0]);

  // Generate CSV with proper headers
  const columns = fields.map((f) => ({
    key: f,
    header: formatFieldLabel(f),
  }));

  const csvContent = stringify(data, {
    header: true,
    columns,
  });

  const buffer = Buffer.from(csvContent);
  const filename = `export-${job.type}-${job.id.slice(0, 8)}.csv`;

  // Store file for download
  fileStorage.set(job.id, {
    buffer,
    contentType: "text/csv",
    filename,
  });

  // Log to audit trail
  await logExportAudit(job, data.length, fields);

  return {
    url: `/api/exports/${job.id}/download`,
    filename,
    size: buffer.length,
    recordCount: data.length,
  };
}

/**
 * Export to XLSX format using ExcelJS
 */
async function exportToXLSX(
  job: ExportJob,
  data: Record<string, unknown>[]
): Promise<ExportResult> {
  if (data.length === 0) {
    throw new Error("No data to export");
  }

  const payload = job.payload as { fields: string[]; includeNBA?: boolean };
  const fields = payload.fields || Object.keys(data[0]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "OmniVor TwinEngine";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Export");

  // Configure columns with proper headers and widths
  worksheet.columns = fields.map((f) => ({
    header: formatFieldLabel(f),
    key: f,
    width: getColumnWidth(f),
  }));

  // Add data rows
  data.forEach((row) => {
    const rowData: Record<string, unknown> = {};
    fields.forEach((f) => {
      rowData[f] = row[f];
    });
    worksheet.addRow(rowData);
  });

  // Style the header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF6B21A8" }, // Purple brand color
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 24;

  // Add alternating row colors for readability
  for (let i = 2; i <= data.length + 1; i++) {
    const row = worksheet.getRow(i);
    if (i % 2 === 0) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF5F5F5" },
      };
    }
  }

  // Freeze the header row
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  // Auto-filter on all columns
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: fields.length },
  };

  // Generate buffer
  const buffer = (await workbook.xlsx.writeBuffer()) as Buffer;
  const filename = `export-${job.type}-${job.id.slice(0, 8)}.xlsx`;

  // Store file for download
  fileStorage.set(job.id, {
    buffer,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filename,
  });

  // Log to audit trail
  await logExportAudit(job, data.length, fields);

  return {
    url: `/api/exports/${job.id}/download`,
    filename,
    size: buffer.length,
    recordCount: data.length,
  };
}

/**
 * Get appropriate column width based on field type
 */
function getColumnWidth(field: string): number {
  const widths: Record<string, number> = {
    id: 36,
    npi: 12,
    firstName: 15,
    lastName: 15,
    specialty: 18,
    organization: 30,
    city: 15,
    state: 8,
    tier: 10,
    segment: 20,
    overallEngagementScore: 18,
    channelPreference: 18,
    monthlyRxVolume: 16,
    yearlyRxVolume: 16,
    marketSharePct: 14,
    conversionLikelihood: 20,
    churnRisk: 12,
    nbaAction: 25,
    nbaRationale: 40,
    nbaConfidence: 14,
  };
  return widths[field] || 15;
}

/**
 * Log export to audit trail
 */
async function logExportAudit(
  job: ExportJob,
  recordCount: number,
  fields: string[]
): Promise<void> {
  try {
    const sensitiveFields = fields.filter((f) => FIELD_DEFINITIONS[f]?.sensitive);

    await db.insert(auditLogs).values({
      userId: job.userId,
      action: "EXPORT",
      entityType: job.type,
      entityId: job.id,
      details: {
        destination: job.destination,
        recordCount,
        fields,
        hasSensitiveData: sensitiveFields.length > 0,
        sensitiveFields,
      },
    });
  } catch (error) {
    console.error("Failed to log export audit:", error);
    // Don't fail the export if audit logging fails
  }
}

/**
 * Get stored file for download
 */
export function getStoredFile(jobId: string): { buffer: Buffer; contentType: string; filename: string } | null {
  return fileStorage.get(jobId) || null;
}

/**
 * Export to Veeva CRM
 */
async function exportToVeeva(
  job: ExportJob,
  data: Record<string, unknown>[]
): Promise<ExportResult> {
  // Check if user has Veeva credentials
  const veevaCredentials = await getVeevaCredentials(job.userId);
  if (!veevaCredentials) {
    throw new Error("Veeva CRM not connected. Please connect in Settings > Integrations.");
  }

  // Transform data to Veeva recommendation format
  const recommendations = data.map((record) => ({
    hcpId: String(record.id || ""),
    npi: record.npi ? String(record.npi) : undefined,
    firstName: String(record.firstName || ""),
    lastName: String(record.lastName || ""),
    action: String(record.nbaAction || "Follow Up"),
    rationale: String(record.nbaRationale || "Generated by TwinEngine"),
    confidence: Number(record.nbaConfidence) || 0.75,
    priority: determinePriority(record),
  }));

  // Push to Veeva
  const result = await pushToVeeva(job.userId, recommendations);

  if (!result.success && result.errors.length > 0) {
    throw new Error(`Veeva push failed: ${result.errors[0]?.error || "Unknown error"}`);
  }

  // Log audit
  await db.insert(auditLogs).values({
    userId: job.userId,
    action: "veeva_push",
    entityType: "export",
    entityId: job.id,
    details: {
      recordsCreated: result.recordsCreated,
      recordsUpdated: result.recordsUpdated,
      errorCount: result.errors.length,
    },
  });

  return {
    url: `veeva://push/${job.id}`,
    filename: `veeva-push-${job.id}`,
    size: JSON.stringify(data).length,
    recordCount: result.recordsCreated + result.recordsUpdated,
  };
}

/**
 * Determine priority based on HCP data
 */
function determinePriority(record: Record<string, unknown>): "high" | "medium" | "low" {
  const churnRisk = Number(record.churnRisk) || 0;
  const conversionLikelihood = Number(record.conversionLikelihood) || 0;

  if (churnRisk > 0.7 || conversionLikelihood > 0.8) return "high";
  if (churnRisk > 0.4 || conversionLikelihood > 0.5) return "medium";
  return "low";
}

/**
 * Export to webhook endpoint
 */
async function exportToWebhook(
  job: ExportJob,
  data: Record<string, unknown>[]
): Promise<ExportResult> {
  const config = job.destinationConfig as {
    webhookId?: string;
    url?: string;
    headers?: Record<string, string>;
  } | null;

  // Try to use saved webhook destination first
  if (config?.webhookId) {
    const [destination] = await db
      .select()
      .from(webhookDestinations)
      .where(
        and(
          eq(webhookDestinations.id, config.webhookId),
          eq(webhookDestinations.userId, job.userId)
        )
      );

    if (!destination) {
      throw new Error("Webhook destination not found");
    }

    if (!destination.isActive) {
      throw new Error("Webhook destination is inactive");
    }

    // Build payload using template
    const payload = job.payload as {
      audienceName?: string;
      entityId?: string;
    };

    const webhookPayload = renderPayloadTemplate(destination.payloadTemplate, {
      hcps: data,
      hcp_ids: data.map((h) => h.id),
      npis: data.map((h) => h.npi),
      audience_name: payload.audienceName || "Export",
      export_date: new Date().toISOString(),
      export_id: job.id,
    });

    let statusCode: number;
    let responseBody: string | null = null;
    let errorMessage: string | null = null;

    try {
      const response = await fetch(destination.url, {
        method: destination.method || "POST",
        headers: {
          "Content-Type": "application/json",
          ...(destination.headers || {}),
        },
        body: JSON.stringify(webhookPayload),
      });

      statusCode = response.status;
      responseBody = await response.text().catch(() => null);
    } catch (err) {
      statusCode = 0;
      errorMessage = err instanceof Error ? err.message : "Network error";
    }

    // Log the webhook call
    await db.insert(webhookLogs).values({
      destinationId: destination.id,
      exportJobId: job.id,
      statusCode,
      responseBody,
      errorMessage,
    });

    // Update last used timestamp
    await db
      .update(webhookDestinations)
      .set({ lastUsedAt: new Date() })
      .where(eq(webhookDestinations.id, destination.id));

    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(`Webhook failed: ${statusCode} ${errorMessage || responseBody?.substring(0, 100) || ""}`);
    }

    return {
      url: destination.url,
      filename: `webhook-${job.id}`,
      size: JSON.stringify(data).length,
      recordCount: data.length,
    };
  }

  // Fallback: Use direct URL from config (legacy behavior)
  if (!config?.url) {
    throw new Error("Webhook URL or webhookId required in destination config");
  }

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...config.headers,
    },
    body: JSON.stringify({
      source: "TwinEngine",
      jobId: job.id,
      type: job.type,
      timestamp: new Date().toISOString(),
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
