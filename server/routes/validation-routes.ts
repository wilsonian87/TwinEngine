/**
 * Validation API Routes
 *
 * Endpoints for content validation:
 * - Validate content
 * - Get validation results
 * - Validation statistics
 */

import { Router } from "express";
import { z } from "zod";
import {
  validateContent,
  validateContentWithBlocking,
  validateContentQuick,
  validateContentCompliance,
  getValidationResult,
  saveValidationResult,
  getValidationHistory,
  markValidationReviewed,
  getValidationStats,
  getValidationCircuitStatus,
} from "../services/validation-service";
import { jwtAuth, requireJwtOrSession } from "../middleware/jwt-auth";
import {
  validateContentRequestSchema,
  knowledgeAudienceContextSchema,
  knowledgeMarketContextSchema,
  knowledgeChannelContextSchema,
} from "@shared/schema";
import { getAvailableRules, getRulesVersion } from "@twinengine/insightrx";

export const validationRouter = Router();

// Apply JWT auth middleware
validationRouter.use(jwtAuth);

// ============================================================================
// VALIDATION ENDPOINTS
// ============================================================================

/**
 * POST /api/validation/validate
 * Validate content
 */
validationRouter.post("/validate", requireJwtOrSession, async (req, res) => {
  try {
    const request = validateContentRequestSchema.parse(req.body);
    const result = await validateContent(request);

    res.json({
      status: result.status,
      score: result.score,
      summary: result.summary,
      ruleResults: result.ruleResults,
      suggestedFixes: result.suggestedFixes,
      metadata: result.metadata,
    });
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
    console.error("Validation error:", error);
    res.status(500).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Failed to validate content",
      },
    });
  }
});

/**
 * POST /api/validation/validate-blocking
 * Validate content with blocking check
 */
validationRouter.post("/validate-blocking", requireJwtOrSession, async (req, res) => {
  try {
    const request = validateContentRequestSchema.parse(req.body);
    const { result, blocked, reason } = await validateContentWithBlocking(request);

    res.json({
      status: result.status,
      score: result.score,
      summary: result.summary,
      ruleResults: result.ruleResults,
      suggestedFixes: result.suggestedFixes,
      blocked,
      blockReason: reason,
      metadata: result.metadata,
    });
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
    console.error("Validation error:", error);
    res.status(500).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Failed to validate content",
      },
    });
  }
});

/**
 * POST /api/validation/quick
 * Quick validation (fewer rules)
 */
validationRouter.post("/quick", requireJwtOrSession, async (req, res) => {
  try {
    const request = validateContentRequestSchema.parse(req.body);
    const result = await validateContentQuick(request);

    res.json({
      status: result.status,
      score: result.score,
      summary: result.summary,
      ruleResults: result.ruleResults,
    });
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
    console.error("Quick validation error:", error);
    res.status(500).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Failed to validate content",
      },
    });
  }
});

/**
 * POST /api/validation/compliance
 * Compliance-only validation
 */
validationRouter.post("/compliance", requireJwtOrSession, async (req, res) => {
  try {
    const request = validateContentRequestSchema.parse(req.body);
    const result = await validateContentCompliance(request);

    res.json({
      status: result.status,
      score: result.score,
      summary: result.summary,
      ruleResults: result.ruleResults,
    });
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
    console.error("Compliance validation error:", error);
    res.status(500).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Failed to validate content",
      },
    });
  }
});

/**
 * POST /api/validation/save
 * Validate and save result
 */
validationRouter.post("/save", requireJwtOrSession, async (req, res) => {
  try {
    const saveSchema = validateContentRequestSchema.extend({
      contentId: z.string(),
    });

    const request = saveSchema.parse(req.body);
    const result = await validateContent(request);

    const saved = await saveValidationResult(
      request.contentId,
      request.contentType,
      request.content,
      result
    );

    res.json({
      id: saved.id,
      status: result.status,
      score: result.score,
      summary: result.summary,
      ruleResults: result.ruleResults,
      createdAt: saved.createdAt.toISOString(),
    });
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
    console.error("Save validation error:", error);
    res.status(500).json({
      error: {
        code: "SAVE_ERROR",
        message: "Failed to save validation result",
      },
    });
  }
});

// ============================================================================
// RESULT ENDPOINTS
// ============================================================================

/**
 * GET /api/validation/result/:contentType/:contentId
 * Get cached validation result
 */
validationRouter.get("/result/:contentType/:contentId", requireJwtOrSession, async (req, res) => {
  try {
    const { contentType, contentId } = req.params;
    const result = await getValidationResult(contentId, contentType);

    if (!result) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "No validation result found",
        },
      });
    }

    res.json({
      id: result.id,
      contentId: result.contentId,
      contentType: result.contentType,
      status: result.validationStatus,
      score: result.complianceScore,
      results: result.validationResults,
      rulesVersion: result.rulesVersion,
      reviewedBy: result.reviewedBy,
      reviewedAt: result.reviewedAt?.toISOString(),
      reviewNotes: result.reviewNotes,
      createdAt: result.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Get validation result error:", error);
    res.status(500).json({
      error: {
        code: "GET_ERROR",
        message: "Failed to get validation result",
      },
    });
  }
});

/**
 * GET /api/validation/history/:contentType/:contentId
 * Get validation history
 */
validationRouter.get("/history/:contentType/:contentId", requireJwtOrSession, async (req, res) => {
  try {
    const { contentType, contentId } = req.params;
    const history = await getValidationHistory(contentId, contentType);

    const apiHistory = history.map((item) => ({
      id: item.id,
      status: item.validationStatus,
      score: item.complianceScore,
      rulesVersion: item.rulesVersion,
      reviewedBy: item.reviewedBy,
      reviewedAt: item.reviewedAt?.toISOString(),
      createdAt: item.createdAt.toISOString(),
    }));

    res.json({ history: apiHistory });
  } catch (error) {
    console.error("Get validation history error:", error);
    res.status(500).json({
      error: {
        code: "HISTORY_ERROR",
        message: "Failed to get validation history",
      },
    });
  }
});

/**
 * POST /api/validation/:id/review
 * Mark validation as reviewed
 */
validationRouter.post("/:id/review", requireJwtOrSession, async (req, res) => {
  try {
    const { id } = req.params;

    const reviewSchema = z.object({
      notes: z.string().optional(),
    });

    const { notes } = reviewSchema.parse(req.body);
    const reviewedBy = req.jwtUser?.sub || req.apiToken?.userId || req.user?.id;

    if (!reviewedBy) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "User ID required for review",
        },
      });
    }

    const updated = await markValidationReviewed(id, reviewedBy, notes);

    if (!updated) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Validation result not found",
        },
      });
    }

    res.json({
      id: updated.id,
      reviewedBy: updated.reviewedBy,
      reviewedAt: updated.reviewedAt?.toISOString(),
      reviewNotes: updated.reviewNotes,
    });
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
    console.error("Review validation error:", error);
    res.status(500).json({
      error: {
        code: "REVIEW_ERROR",
        message: "Failed to mark as reviewed",
      },
    });
  }
});

// ============================================================================
// STATS & HEALTH ENDPOINTS
// ============================================================================

/**
 * GET /api/validation/stats
 * Get validation statistics
 */
validationRouter.get("/stats", requireJwtOrSession, async (req, res) => {
  try {
    const stats = await getValidationStats();
    res.json(stats);
  } catch (error) {
    console.error("Validation stats error:", error);
    res.status(500).json({
      error: {
        code: "STATS_ERROR",
        message: "Failed to get validation statistics",
      },
    });
  }
});

/**
 * GET /api/validation/health
 * Get validation service health
 */
validationRouter.get("/health", async (req, res) => {
  try {
    const circuit = getValidationCircuitStatus();

    res.json({
      status: circuit.state === "closed" ? "healthy" : circuit.state,
      circuit: circuit.state,
      circuitStats: circuit.stats,
      rulesVersion: getRulesVersion(),
      availableRules: getAvailableRules().length,
    });
  } catch (error) {
    console.error("Validation health error:", error);
    res.status(500).json({
      status: "error",
      error: "Failed to get health status",
    });
  }
});

/**
 * GET /api/validation/rules
 * Get available validation rules
 */
validationRouter.get("/rules", requireJwtOrSession, async (req, res) => {
  try {
    const rules = getAvailableRules();
    const version = getRulesVersion();

    res.json({
      version,
      rules,
      count: rules.length,
    });
  } catch (error) {
    console.error("Get rules error:", error);
    res.status(500).json({
      error: {
        code: "RULES_ERROR",
        message: "Failed to get validation rules",
      },
    });
  }
});
