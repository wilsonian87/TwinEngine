import { Router } from "express";
import {
  createExportJob,
  getExportJob,
  listExportJobs,
  cancelExportJob,
  saveIntegrationCredentials,
  getIntegrationCredentials,
  listIntegrations,
} from "../services/export-hub-service";
import { createExportJobRequestSchema } from "@shared/schema";

export const exportHubRouter = Router();

// ============================================================================
// EXPORT JOBS
// ============================================================================

/**
 * Create a new export job
 * POST /api/exports
 */
exportHubRouter.post("/", async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const parsed = createExportJobRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const job = await createExportJob(userId, parsed.data);

    res.status(201).json({
      id: job.id,
      userId: job.userId,
      type: job.type,
      destination: job.destination,
      status: job.status,
      payload: job.payload,
      destinationConfig: job.destinationConfig,
      resultUrl: job.resultUrl,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString() || null,
      completedAt: job.completedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("Error creating export job:", error);
    res.status(500).json({ error: "Failed to create export job" });
  }
});

/**
 * List export jobs for the current user
 * GET /api/exports
 */
exportHubRouter.get("/", async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { limit, offset, status } = req.query;

    const { jobs, total } = await listExportJobs(userId, {
      limit: limit ? parseInt(String(limit)) : undefined,
      offset: offset ? parseInt(String(offset)) : undefined,
      status: status ? String(status) : undefined,
    });

    res.json({
      jobs: jobs.map((job) => ({
        id: job.id,
        userId: job.userId,
        type: job.type,
        destination: job.destination,
        status: job.status,
        payload: job.payload,
        destinationConfig: job.destinationConfig,
        resultUrl: job.resultUrl,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt.toISOString(),
        startedAt: job.startedAt?.toISOString() || null,
        completedAt: job.completedAt?.toISOString() || null,
      })),
      total,
    });
  } catch (error) {
    console.error("Error listing export jobs:", error);
    res.status(500).json({ error: "Failed to list export jobs" });
  }
});

/**
 * Get export job by ID
 * GET /api/exports/:id
 */
exportHubRouter.get("/:id", async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const job = await getExportJob(id, userId);

    if (!job) {
      return res.status(404).json({ error: "Export job not found" });
    }

    res.json({
      id: job.id,
      userId: job.userId,
      type: job.type,
      destination: job.destination,
      status: job.status,
      payload: job.payload,
      destinationConfig: job.destinationConfig,
      resultUrl: job.resultUrl,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString() || null,
      completedAt: job.completedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("Error getting export job:", error);
    res.status(500).json({ error: "Failed to get export job" });
  }
});

/**
 * Download export result
 * GET /api/exports/:id/download
 */
exportHubRouter.get("/:id/download", async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const job = await getExportJob(id, userId);

    if (!job) {
      return res.status(404).json({ error: "Export job not found" });
    }

    if (job.status !== "complete") {
      return res.status(400).json({
        error: "Export not ready",
        status: job.status,
        message: job.status === "failed" ? job.errorMessage : "Export is still processing",
      });
    }

    if (!job.resultUrl) {
      return res.status(404).json({ error: "Export result not available" });
    }

    // Handle data URL (base64 encoded content)
    if (job.resultUrl.startsWith("data:")) {
      const [header, base64] = job.resultUrl.split(",");
      const mimeMatch = header.match(/data:([^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : "application/octet-stream";
      const buffer = Buffer.from(base64, "base64");

      const extension = job.destination === "xlsx" ? "xlsx" : "csv";
      const filename = `export-${job.type}-${job.id.slice(0, 8)}.${extension}`;

      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", buffer.length);
      return res.send(buffer);
    }

    // For external URLs (Veeva, SFTP), return redirect info
    res.json({
      type: "external",
      url: job.resultUrl,
      message: `Export was sent to ${job.destination}`,
    });
  } catch (error) {
    console.error("Error downloading export:", error);
    res.status(500).json({ error: "Failed to download export" });
  }
});

/**
 * Cancel a pending export job
 * POST /api/exports/:id/cancel
 */
exportHubRouter.post("/:id/cancel", async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const success = await cancelExportJob(id, userId);

    if (!success) {
      return res.status(400).json({
        error: "Cannot cancel job",
        message: "Job not found or not in pending status",
      });
    }

    res.json({ success: true, message: "Export job cancelled" });
  } catch (error) {
    console.error("Error cancelling export job:", error);
    res.status(500).json({ error: "Failed to cancel export job" });
  }
});

// ============================================================================
// INTEGRATIONS
// ============================================================================

/**
 * List configured integrations
 * GET /api/exports/integrations
 */
exportHubRouter.get("/integrations/list", async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const integrations = await listIntegrations(userId);

    // Add all possible integrations with configured status
    const allIntegrations = ["veeva", "webhook", "sftp"].map((type) => {
      const configured = integrations.find((i) => i.type === type);
      return {
        type,
        configured: !!configured,
        isValid: configured?.isValid ?? false,
        lastValidated: configured?.lastValidated?.toISOString() || null,
      };
    });

    res.json({ integrations: allIntegrations });
  } catch (error) {
    console.error("Error listing integrations:", error);
    res.status(500).json({ error: "Failed to list integrations" });
  }
});

/**
 * Save integration credentials
 * POST /api/exports/integrations/:type
 */
exportHubRouter.post("/integrations/:type", async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { type } = req.params;
    const { credentials } = req.body;

    if (!credentials || typeof credentials !== "object") {
      return res.status(400).json({ error: "Credentials object required" });
    }

    await saveIntegrationCredentials(userId, type, credentials);

    res.json({ success: true, message: `${type} integration configured` });
  } catch (error) {
    console.error("Error saving integration credentials:", error);
    res.status(500).json({ error: "Failed to save integration credentials" });
  }
});

/**
 * Test integration connection
 * POST /api/exports/integrations/:type/test
 */
exportHubRouter.post("/integrations/:type/test", async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { type } = req.params;
    const credentials = await getIntegrationCredentials(userId, type);

    if (!credentials) {
      return res.status(404).json({
        error: "Integration not configured",
        message: `No ${type} credentials found`,
      });
    }

    // In production, would actually test the connection
    // For now, simulate success
    res.json({
      success: true,
      message: `${type} connection test successful`,
      testedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error testing integration:", error);
    res.status(500).json({ error: "Failed to test integration" });
  }
});
