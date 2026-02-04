/**
 * Knowledge API Routes
 *
 * Endpoints for knowledge base operations:
 * - Semantic search
 * - CRUD operations
 * - Similar content discovery
 */

import { Router } from "express";
import { z } from "zod";
import {
  createKnowledgeContent,
  getKnowledgeContentById,
  updateKnowledgeContent,
  deleteKnowledgeContent,
  listKnowledgeContent,
  searchKnowledgeContent,
  findSimilarContent,
  getKnowledgeStats,
} from "../storage/knowledge-storage";
import { jwtAuth, requireJwtOrSession, requireScope } from "../middleware/jwt-auth";
import {
  knowledgeSearchRequestSchema,
  insertKnowledgeContentSchema,
  knowledgeContentTypes,
  knowledgeAudienceContextSchema,
  knowledgeMarketContextSchema,
  knowledgeChannelContextSchema,
} from "@shared/schema";

export const knowledgeRouter = Router();

// Apply JWT auth middleware
knowledgeRouter.use(jwtAuth);

// ============================================================================
// SEARCH ENDPOINTS
// ============================================================================

/**
 * POST /api/knowledge/search
 * Semantic search for knowledge content
 */
knowledgeRouter.post("/search", requireJwtOrSession, async (req, res) => {
  try {
    const request = knowledgeSearchRequestSchema.parse(req.body);
    const results = await searchKnowledgeContent(request);

    res.json({
      query: request.query,
      results,
      count: results.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid search request",
          details: error.errors,
        },
      });
    }
    console.error("Knowledge search error:", error);
    res.status(500).json({
      error: {
        code: "SEARCH_ERROR",
        message: "Failed to search knowledge base",
      },
    });
  }
});

/**
 * GET /api/knowledge/:id/similar
 * Find content similar to a specific item
 */
knowledgeRouter.get("/:id/similar", requireJwtOrSession, async (req, res) => {
  try {
    const { id } = req.params;
    const limitParam = req.query.limit as string | undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : 5;

    const results = await findSimilarContent(id, limit);

    res.json({
      sourceId: id,
      similar: results,
      count: results.length,
    });
  } catch (error) {
    console.error("Find similar error:", error);
    res.status(500).json({
      error: {
        code: "SIMILAR_ERROR",
        message: "Failed to find similar content",
      },
    });
  }
});

// ============================================================================
// CRUD ENDPOINTS
// ============================================================================

/**
 * GET /api/knowledge
 * List all knowledge content (paginated)
 */
knowledgeRouter.get("/", requireJwtOrSession, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    const contentType = req.query.contentType as string | undefined;

    const items = await listKnowledgeContent({ limit, offset, contentType });

    // Transform to API format
    const apiItems = items.map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      contentType: item.contentType,
      source: item.source,
      sourceUrl: item.sourceUrl,
      audienceContext: item.audienceContext,
      marketContext: item.marketContext,
      channelContext: item.channelContext,
      metadata: item.metadata,
      tags: item.tags,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));

    res.json({
      items: apiItems,
      count: apiItems.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("List knowledge error:", error);
    res.status(500).json({
      error: {
        code: "LIST_ERROR",
        message: "Failed to list knowledge content",
      },
    });
  }
});

/**
 * GET /api/knowledge/:id
 * Get a specific knowledge item
 */
knowledgeRouter.get("/:id", requireJwtOrSession, async (req, res) => {
  try {
    const { id } = req.params;
    const item = await getKnowledgeContentById(id);

    if (!item) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Knowledge content not found",
        },
      });
    }

    res.json({
      id: item.id,
      title: item.title,
      content: item.content,
      contentType: item.contentType,
      source: item.source,
      sourceUrl: item.sourceUrl,
      audienceContext: item.audienceContext,
      marketContext: item.marketContext,
      channelContext: item.channelContext,
      metadata: item.metadata,
      tags: item.tags,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Get knowledge error:", error);
    res.status(500).json({
      error: {
        code: "GET_ERROR",
        message: "Failed to get knowledge content",
      },
    });
  }
});

/**
 * POST /api/knowledge
 * Create new knowledge content
 */
knowledgeRouter.post("/", requireJwtOrSession, async (req, res) => {
  try {
    const createSchema = z.object({
      title: z.string().min(1).max(500),
      content: z.string().min(1),
      contentType: z.enum(knowledgeContentTypes),
      source: z.string().optional(),
      sourceUrl: z.string().url().optional(),
      audienceContext: knowledgeAudienceContextSchema.optional(),
      marketContext: knowledgeMarketContextSchema.optional(),
      channelContext: knowledgeChannelContextSchema.optional(),
      metadata: z.record(z.unknown()).optional(),
      tags: z.array(z.string()).optional(),
    });

    const data = createSchema.parse(req.body);
    const created = await createKnowledgeContent(data);

    res.status(201).json({
      id: created.id,
      title: created.title,
      content: created.content,
      contentType: created.contentType,
      source: created.source,
      sourceUrl: created.sourceUrl,
      audienceContext: created.audienceContext,
      marketContext: created.marketContext,
      channelContext: created.channelContext,
      metadata: created.metadata,
      tags: created.tags,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid content data",
          details: error.errors,
        },
      });
    }
    console.error("Create knowledge error:", error);
    res.status(500).json({
      error: {
        code: "CREATE_ERROR",
        message: "Failed to create knowledge content",
      },
    });
  }
});

/**
 * PATCH /api/knowledge/:id
 * Update knowledge content
 */
knowledgeRouter.patch("/:id", requireJwtOrSession, async (req, res) => {
  try {
    const { id } = req.params;

    const updateSchema = z.object({
      title: z.string().min(1).max(500).optional(),
      content: z.string().min(1).optional(),
      contentType: z.enum(knowledgeContentTypes).optional(),
      source: z.string().optional(),
      sourceUrl: z.string().url().optional().nullable(),
      audienceContext: knowledgeAudienceContextSchema.optional().nullable(),
      marketContext: knowledgeMarketContextSchema.optional().nullable(),
      channelContext: knowledgeChannelContextSchema.optional().nullable(),
      metadata: z.record(z.unknown()).optional().nullable(),
      tags: z.array(z.string()).optional().nullable(),
    });

    const updates = updateSchema.parse(req.body);
    const updated = await updateKnowledgeContent(id, updates);

    if (!updated) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Knowledge content not found",
        },
      });
    }

    res.json({
      id: updated.id,
      title: updated.title,
      content: updated.content,
      contentType: updated.contentType,
      source: updated.source,
      sourceUrl: updated.sourceUrl,
      audienceContext: updated.audienceContext,
      marketContext: updated.marketContext,
      channelContext: updated.channelContext,
      metadata: updated.metadata,
      tags: updated.tags,
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
    console.error("Update knowledge error:", error);
    res.status(500).json({
      error: {
        code: "UPDATE_ERROR",
        message: "Failed to update knowledge content",
      },
    });
  }
});

/**
 * DELETE /api/knowledge/:id
 * Delete knowledge content
 */
knowledgeRouter.delete("/:id", requireJwtOrSession, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteKnowledgeContent(id);

    if (!deleted) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Knowledge content not found",
        },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Delete knowledge error:", error);
    res.status(500).json({
      error: {
        code: "DELETE_ERROR",
        message: "Failed to delete knowledge content",
      },
    });
  }
});

// ============================================================================
// STATS ENDPOINT
// ============================================================================

/**
 * GET /api/knowledge/stats
 * Get knowledge base statistics
 */
knowledgeRouter.get("/stats/overview", requireJwtOrSession, async (req, res) => {
  try {
    const stats = await getKnowledgeStats();
    res.json(stats);
  } catch (error) {
    console.error("Knowledge stats error:", error);
    res.status(500).json({
      error: {
        code: "STATS_ERROR",
        message: "Failed to get knowledge statistics",
      },
    });
  }
});
