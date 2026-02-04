/**
 * Feature Flag Routes
 *
 * API endpoints for:
 * - Evaluating feature flags (for clients)
 * - Admin management (CRUD)
 */

import { Router } from "express";
import { z } from "zod";
import {
  isFeatureEnabled,
  getAllFlags,
  getFlagByKey,
  createFlag,
  updateFlag,
  deleteFlag,
  evaluateFlags,
  invalidateFlagCache,
} from "../services/feature-flags";
import { requireAuth } from "../auth";
import { jwtAuth, requireJwtOrSession, requireScope } from "../middleware/jwt-auth";
import { insertFeatureFlagSchema, featureFlagContextSchema } from "@shared/schema";

export const featureFlagRouter = Router();

// Apply JWT auth middleware
featureFlagRouter.use(jwtAuth);

/**
 * POST /api/feature-flags/evaluate
 * Evaluate a single flag or multiple flags
 * Public endpoint (for client-side evaluation)
 */
featureFlagRouter.post("/evaluate", async (req, res) => {
  try {
    const evaluateSchema = z.object({
      flagKeys: z.array(z.string()).min(1).max(50),
      context: featureFlagContextSchema.optional(),
    });

    const { flagKeys, context } = evaluateSchema.parse(req.body);

    // Build context from request if not provided
    const evalContext = context || {
      userId: req.jwtUser?.sub || req.apiToken?.userId || req.user?.id,
      roles: req.jwtUser?.roles || [],
    };

    const results = await evaluateFlags(flagKeys, evalContext);

    res.json({ flags: results });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: error.errors,
        },
      });
    }
    console.error("Feature flag evaluation error:", error);
    res.status(500).json({
      error: {
        code: "EVALUATION_ERROR",
        message: "Failed to evaluate feature flags",
      },
    });
  }
});

/**
 * GET /api/feature-flags/:flagKey
 * Check if a specific flag is enabled
 * Public endpoint
 */
featureFlagRouter.get("/:flagKey", async (req, res) => {
  try {
    const { flagKey } = req.params;

    const context = {
      userId: req.jwtUser?.sub || req.apiToken?.userId || req.user?.id,
      roles: req.jwtUser?.roles || [],
    };

    const enabled = await isFeatureEnabled(flagKey, context);

    res.json({ flagKey, enabled });
  } catch (error) {
    console.error("Feature flag check error:", error);
    res.status(500).json({
      error: {
        code: "CHECK_ERROR",
        message: "Failed to check feature flag",
      },
    });
  }
});

// ============ Admin Endpoints ============

/**
 * GET /api/feature-flags/admin/all
 * List all feature flags (admin only)
 */
featureFlagRouter.get("/admin/all", requireJwtOrSession, async (req, res) => {
  try {
    const flags = await getAllFlags();

    const apiFlags = flags.map((flag) => ({
      id: flag.id,
      flagKey: flag.flagKey,
      name: flag.name,
      description: flag.description,
      enabled: flag.enabled,
      rolloutPercentage: flag.rolloutPercentage,
      targetUsers: flag.targetUsers,
      targetRoles: flag.targetRoles,
      metadata: flag.metadata,
      createdAt: flag.createdAt.toISOString(),
      updatedAt: flag.updatedAt.toISOString(),
    }));

    res.json({ flags: apiFlags });
  } catch (error) {
    console.error("Feature flag list error:", error);
    res.status(500).json({
      error: {
        code: "LIST_ERROR",
        message: "Failed to list feature flags",
      },
    });
  }
});

/**
 * GET /api/feature-flags/admin/:flagKey
 * Get a specific flag's full details (admin only)
 */
featureFlagRouter.get("/admin/:flagKey", requireJwtOrSession, async (req, res) => {
  try {
    const { flagKey } = req.params;
    const flag = await getFlagByKey(flagKey);

    if (!flag) {
      return res.status(404).json({
        error: {
          code: "FLAG_NOT_FOUND",
          message: "Feature flag not found",
        },
      });
    }

    res.json({
      id: flag.id,
      flagKey: flag.flagKey,
      name: flag.name,
      description: flag.description,
      enabled: flag.enabled,
      rolloutPercentage: flag.rolloutPercentage,
      targetUsers: flag.targetUsers,
      targetRoles: flag.targetRoles,
      metadata: flag.metadata,
      createdAt: flag.createdAt.toISOString(),
      updatedAt: flag.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Feature flag get error:", error);
    res.status(500).json({
      error: {
        code: "GET_ERROR",
        message: "Failed to get feature flag",
      },
    });
  }
});

/**
 * POST /api/feature-flags/admin
 * Create a new feature flag (admin only)
 */
featureFlagRouter.post("/admin", requireJwtOrSession, async (req, res) => {
  try {
    const createSchema = insertFeatureFlagSchema.extend({
      flagKey: z.string().min(1).max(100).regex(/^[a-z][a-z0-9._-]*$/i, {
        message: "Flag key must start with a letter and contain only letters, numbers, dots, underscores, and hyphens",
      }),
    });

    const flagData = createSchema.parse(req.body);

    // Check if flag already exists
    const existing = await getFlagByKey(flagData.flagKey);
    if (existing) {
      return res.status(409).json({
        error: {
          code: "FLAG_EXISTS",
          message: "Feature flag with this key already exists",
        },
      });
    }

    const created = await createFlag(flagData);

    res.status(201).json({
      id: created.id,
      flagKey: created.flagKey,
      name: created.name,
      description: created.description,
      enabled: created.enabled,
      rolloutPercentage: created.rolloutPercentage,
      targetUsers: created.targetUsers,
      targetRoles: created.targetRoles,
      metadata: created.metadata,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid flag data",
          details: error.errors,
        },
      });
    }
    console.error("Feature flag create error:", error);
    res.status(500).json({
      error: {
        code: "CREATE_ERROR",
        message: "Failed to create feature flag",
      },
    });
  }
});

/**
 * PATCH /api/feature-flags/admin/:flagKey
 * Update a feature flag (admin only)
 */
featureFlagRouter.patch("/admin/:flagKey", requireJwtOrSession, async (req, res) => {
  try {
    const { flagKey } = req.params;

    const updateSchema = insertFeatureFlagSchema.partial();
    const updates = updateSchema.parse(req.body);

    // Don't allow changing the flagKey
    if ("flagKey" in updates) {
      delete (updates as any).flagKey;
    }

    const updated = await updateFlag(flagKey, updates);

    if (!updated) {
      return res.status(404).json({
        error: {
          code: "FLAG_NOT_FOUND",
          message: "Feature flag not found",
        },
      });
    }

    res.json({
      id: updated.id,
      flagKey: updated.flagKey,
      name: updated.name,
      description: updated.description,
      enabled: updated.enabled,
      rolloutPercentage: updated.rolloutPercentage,
      targetUsers: updated.targetUsers,
      targetRoles: updated.targetRoles,
      metadata: updated.metadata,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid update data",
          details: error.errors,
        },
      });
    }
    console.error("Feature flag update error:", error);
    res.status(500).json({
      error: {
        code: "UPDATE_ERROR",
        message: "Failed to update feature flag",
      },
    });
  }
});

/**
 * DELETE /api/feature-flags/admin/:flagKey
 * Delete a feature flag (admin only)
 */
featureFlagRouter.delete("/admin/:flagKey", requireJwtOrSession, async (req, res) => {
  try {
    const { flagKey } = req.params;

    const deleted = await deleteFlag(flagKey);

    if (!deleted) {
      return res.status(404).json({
        error: {
          code: "FLAG_NOT_FOUND",
          message: "Feature flag not found",
        },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Feature flag delete error:", error);
    res.status(500).json({
      error: {
        code: "DELETE_ERROR",
        message: "Failed to delete feature flag",
      },
    });
  }
});

/**
 * POST /api/feature-flags/admin/:flagKey/invalidate-cache
 * Invalidate the cache for a specific flag
 */
featureFlagRouter.post("/admin/:flagKey/invalidate-cache", requireJwtOrSession, async (req, res) => {
  try {
    const { flagKey } = req.params;
    invalidateFlagCache(flagKey);
    res.json({ success: true });
  } catch (error) {
    console.error("Cache invalidation error:", error);
    res.status(500).json({
      error: {
        code: "CACHE_ERROR",
        message: "Failed to invalidate cache",
      },
    });
  }
});
