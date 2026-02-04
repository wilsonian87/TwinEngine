/**
 * Token Management Routes
 *
 * API endpoints for:
 * - JWT token issuance and refresh
 * - API key management (create, list, revoke)
 * - Token introspection
 */

import { Router } from "express";
import { z } from "zod";
import {
  issueTokenPair,
  refreshAccessToken,
  createApiToken,
  listApiTokens,
  revokeApiToken,
  verifyToken,
  TokenError,
} from "../services/jwt-service";
import { requireAuth } from "../auth";
import { jwtAuth, requireJwtOrSession, requireScope } from "../middleware/jwt-auth";
import {
  createApiTokenRequestSchema,
  type AuthScope,
} from "@shared/schema";

export const tokenRouter = Router();

// Apply JWT auth middleware to all routes
tokenRouter.use(jwtAuth);

/**
 * POST /api/auth/token
 * Issue a new JWT token pair (access + refresh)
 * Requires session authentication first
 */
tokenRouter.post("/token", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Default scopes for user tokens
    const defaultScopes: AuthScope[] = [
      "content:read",
      "content:write",
      "insightrx:validate",
      "insightrx:knowledge",
    ];

    const { accessToken, refreshToken, expiresIn } = await issueTokenPair(userId, {
      scopes: defaultScopes,
      roles: [], // TODO: Get from user profile
    });

    res.json({
      accessToken,
      refreshToken,
      expiresIn,
      tokenType: "Bearer",
    });
  } catch (error) {
    console.error("Token issuance error:", error);
    res.status(500).json({
      error: {
        code: "TOKEN_ISSUANCE_FAILED",
        message: "Failed to issue token",
      },
    });
  }
});

/**
 * POST /api/auth/token/refresh
 * Refresh an access token using a refresh token
 */
tokenRouter.post("/token/refresh", async (req, res) => {
  try {
    const refreshTokenSchema = z.object({
      refreshToken: z.string(),
    });

    const { refreshToken } = refreshTokenSchema.parse(req.body);

    // Default scopes for refreshed tokens
    const defaultScopes: AuthScope[] = [
      "content:read",
      "content:write",
      "insightrx:validate",
      "insightrx:knowledge",
    ];

    const { accessToken, expiresIn } = await refreshAccessToken(refreshToken, {
      scopes: defaultScopes,
    });

    res.json({
      accessToken,
      expiresIn,
      tokenType: "Bearer",
    });
  } catch (error) {
    if (error instanceof TokenError) {
      return res.status(401).json({
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: error.errors,
        },
      });
    }
    console.error("Token refresh error:", error);
    res.status(500).json({
      error: {
        code: "TOKEN_REFRESH_FAILED",
        message: "Failed to refresh token",
      },
    });
  }
});

/**
 * POST /api/auth/token/introspect
 * Validate and get info about a token
 */
tokenRouter.post("/token/introspect", async (req, res) => {
  try {
    const introspectSchema = z.object({
      token: z.string(),
    });

    const { token } = introspectSchema.parse(req.body);

    const payload = verifyToken(token);

    res.json({
      active: true,
      sub: payload.sub,
      scopes: payload.scopes,
      aud: payload.aud,
      exp: payload.exp,
      iat: payload.iat,
      tokenType: payload.typ,
    });
  } catch (error) {
    if (error instanceof TokenError) {
      return res.json({
        active: false,
        error: error.code,
      });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
        },
      });
    }
    res.json({ active: false });
  }
});

/**
 * POST /api/auth/api-keys
 * Create a new API key
 */
tokenRouter.post("/api-keys", requireJwtOrSession, async (req, res) => {
  try {
    const request = createApiTokenRequestSchema.parse(req.body);
    const userId = req.jwtUser?.sub || req.apiToken?.userId || req.user!.id;

    const { token, id } = await createApiToken(userId, {
      name: request.name,
      tokenType: request.tokenType,
      scopes: request.scopes,
      expiresInDays: request.expiresInDays,
    });

    // Only return the raw token once
    res.status(201).json({
      id,
      token,
      message: "Store this token securely. It will not be shown again.",
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
    console.error("API key creation error:", error);
    res.status(500).json({
      error: {
        code: "API_KEY_CREATION_FAILED",
        message: "Failed to create API key",
      },
    });
  }
});

/**
 * GET /api/auth/api-keys
 * List all API keys for the current user
 */
tokenRouter.get("/api-keys", requireJwtOrSession, async (req, res) => {
  try {
    const userId = req.jwtUser?.sub || req.apiToken?.userId || req.user!.id;
    const tokens = await listApiTokens(userId);

    // Transform to API format (never expose token hash)
    const apiTokens = tokens.map((token) => ({
      id: token.id,
      name: token.name,
      tokenType: token.tokenType,
      scopes: token.scopes,
      lastUsedAt: token.lastUsedAt?.toISOString() || null,
      usageCount: token.usageCount,
      expiresAt: token.expiresAt?.toISOString() || null,
      revokedAt: token.revokedAt?.toISOString() || null,
      createdAt: token.createdAt.toISOString(),
    }));

    res.json({ apiKeys: apiTokens });
  } catch (error) {
    console.error("API key list error:", error);
    res.status(500).json({
      error: {
        code: "API_KEY_LIST_FAILED",
        message: "Failed to list API keys",
      },
    });
  }
});

/**
 * DELETE /api/auth/api-keys/:id
 * Revoke an API key
 */
tokenRouter.delete("/api-keys/:id", requireJwtOrSession, async (req, res) => {
  try {
    const { id } = req.params;

    const revokeSchema = z.object({
      reason: z.string().optional(),
    });

    const { reason } = revokeSchema.parse(req.body || {});

    const success = await revokeApiToken(id, reason);

    if (!success) {
      return res.status(404).json({
        error: {
          code: "API_KEY_NOT_FOUND",
          message: "API key not found",
        },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("API key revocation error:", error);
    res.status(500).json({
      error: {
        code: "API_KEY_REVOCATION_FAILED",
        message: "Failed to revoke API key",
      },
    });
  }
});
