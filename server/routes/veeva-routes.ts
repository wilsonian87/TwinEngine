import { Router } from "express";
import {
  initiateVeevaOAuth,
  handleVeevaCallback,
  getVeevaStatus,
  disconnectVeeva,
  testVeevaConnection,
  pushToVeeva,
  getVeevaFieldMappings,
} from "../services/veeva-integration";

export const veevaRouter = Router();

// ============================================================================
// OAUTH FLOW
// ============================================================================

/**
 * Initiate Veeva OAuth flow
 * GET /api/integrations/veeva/connect
 */
veevaRouter.get("/connect", async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { authUrl, state } = initiateVeevaOAuth(userId);

    // Store state in session for callback validation
    (req as any).session.veevaOAuthState = state;

    res.json({ authUrl });
  } catch (error) {
    console.error("Error initiating Veeva OAuth:", error);
    res.status(500).json({
      error: "Failed to initiate Veeva connection",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Handle Veeva OAuth callback
 * GET /api/integrations/veeva/callback
 */
veevaRouter.get("/callback", async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    // Handle OAuth error
    if (error) {
      console.error("Veeva OAuth error:", error, error_description);
      return res.redirect(
        `/settings/integrations?error=${encodeURIComponent(String(error_description || error))}`
      );
    }

    if (!code || !state) {
      return res.redirect("/settings/integrations?error=Missing+authorization+code");
    }

    // Exchange code for tokens
    const result = await handleVeevaCallback(String(code), String(state));

    if (result.success) {
      res.redirect("/settings/integrations?success=veeva");
    } else {
      res.redirect("/settings/integrations?error=Failed+to+connect+Veeva");
    }
  } catch (error) {
    console.error("Error handling Veeva callback:", error);
    res.redirect(
      `/settings/integrations?error=${encodeURIComponent(
        error instanceof Error ? error.message : "Connection failed"
      )}`
    );
  }
});

// ============================================================================
// STATUS & MANAGEMENT
// ============================================================================

/**
 * Get Veeva connection status
 * GET /api/integrations/veeva/status
 */
veevaRouter.get("/status", async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const status = await getVeevaStatus(userId);
    res.json(status);
  } catch (error) {
    console.error("Error getting Veeva status:", error);
    res.status(500).json({ error: "Failed to get Veeva status" });
  }
});

/**
 * Disconnect Veeva integration
 * POST /api/integrations/veeva/disconnect
 */
veevaRouter.post("/disconnect", async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await disconnectVeeva(userId);
    res.json({ success: true, message: "Veeva disconnected" });
  } catch (error) {
    console.error("Error disconnecting Veeva:", error);
    res.status(500).json({ error: "Failed to disconnect Veeva" });
  }
});

/**
 * Test Veeva connection
 * POST /api/integrations/veeva/test
 */
veevaRouter.post("/test", async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await testVeevaConnection(userId);
    res.json(result);
  } catch (error) {
    console.error("Error testing Veeva connection:", error);
    res.status(500).json({ error: "Failed to test Veeva connection" });
  }
});

// ============================================================================
// DATA OPERATIONS
// ============================================================================

/**
 * Push NBA recommendations to Veeva
 * POST /api/integrations/veeva/push
 */
veevaRouter.post("/push", async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { recommendations } = req.body;

    if (!recommendations || !Array.isArray(recommendations)) {
      return res.status(400).json({ error: "recommendations array required" });
    }

    if (recommendations.length === 0) {
      return res.status(400).json({ error: "At least one recommendation required" });
    }

    // Validate recommendation structure
    const validRecommendations = recommendations.map((rec: any) => ({
      hcpId: String(rec.hcpId),
      npi: rec.npi ? String(rec.npi) : undefined,
      firstName: String(rec.firstName || ""),
      lastName: String(rec.lastName || ""),
      action: String(rec.action || ""),
      rationale: String(rec.rationale || ""),
      confidence: Number(rec.confidence) || 0.5,
      priority: ["high", "medium", "low"].includes(rec.priority)
        ? rec.priority
        : "medium",
    }));

    const result = await pushToVeeva(userId, validRecommendations);

    res.json({
      success: result.success,
      recordsCreated: result.recordsCreated,
      recordsUpdated: result.recordsUpdated,
      errorCount: result.errors.length,
      errors: result.errors.slice(0, 10), // Return first 10 errors
    });
  } catch (error) {
    console.error("Error pushing to Veeva:", error);
    res.status(500).json({
      error: "Failed to push to Veeva",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Get Veeva field mappings
 * GET /api/integrations/veeva/field-mappings
 */
veevaRouter.get("/field-mappings", async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const mappings = getVeevaFieldMappings();
    res.json({ mappings });
  } catch (error) {
    console.error("Error getting field mappings:", error);
    res.status(500).json({ error: "Failed to get field mappings" });
  }
});
