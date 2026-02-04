/**
 * JWT Authentication Middleware
 *
 * Provides JWT-based authentication that works alongside session-based auth.
 * Supports:
 * - Bearer tokens (JWT)
 * - API keys (te_api_key_xxx format)
 * - Scope-based authorization
 */

import type { Request, Response, NextFunction, RequestHandler } from "express";
import {
  verifyToken,
  validateApiToken,
  extractBearerToken,
  hasScope,
  hasAnyScope,
  hasAllScopes,
  TokenError,
} from "../services/jwt-service";
import type { JWTPayload, AuthScope, TokenType } from "@shared/schema";

// Extend Express Request to include JWT user info
declare global {
  namespace Express {
    interface Request {
      jwtUser?: JWTPayload;
      apiToken?: {
        userId: string;
        scopes: AuthScope[];
        tokenType: TokenType;
      };
      authMethod?: "session" | "jwt" | "api_key";
    }
  }
}

/**
 * Middleware to authenticate via JWT or API key
 * Does NOT reject if no token is present - allows session auth to work
 */
export const jwtAuth: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = extractBearerToken(authHeader);

  if (!token) {
    // No bearer token, continue to allow session auth
    return next();
  }

  try {
    // Check if it's an API key (te_xxx_ format)
    if (token.startsWith("te_")) {
      const apiTokenInfo = await validateApiToken(token);

      if (!apiTokenInfo) {
        return res.status(401).json({
          error: {
            code: "INVALID_API_KEY",
            message: "Invalid or expired API key",
          },
        });
      }

      req.apiToken = apiTokenInfo;
      req.authMethod = "api_key";

      // Also set user for compatibility with existing code
      if (!req.user) {
        req.user = { id: apiTokenInfo.userId, username: "api_user" };
      }

      return next();
    }

    // It's a JWT token
    const payload = verifyToken(token);
    req.jwtUser = payload;
    req.authMethod = "jwt";

    // Also set user for compatibility with existing code
    if (!req.user) {
      req.user = { id: payload.sub, username: "jwt_user" };
    }

    return next();
  } catch (error) {
    if (error instanceof TokenError) {
      return res.status(401).json({
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    console.error("JWT auth error:", error);
    return res.status(500).json({
      error: {
        code: "AUTH_ERROR",
        message: "Authentication error",
      },
    });
  }
};

/**
 * Middleware that requires either JWT/API key or session authentication
 */
export const requireJwtOrSession: RequestHandler = (req, res, next) => {
  // Check if authenticated via any method
  if (req.jwtUser || req.apiToken || req.isAuthenticated?.()) {
    return next();
  }

  return res.status(401).json({
    error: {
      code: "AUTHENTICATION_REQUIRED",
      message: "Authentication required",
    },
  });
};

/**
 * Middleware that requires JWT or API key authentication (no session fallback)
 */
export const requireJwt: RequestHandler = (req, res, next) => {
  if (req.jwtUser || req.apiToken) {
    return next();
  }

  return res.status(401).json({
    error: {
      code: "JWT_REQUIRED",
      message: "JWT or API key authentication required",
    },
  });
};

/**
 * Factory function for scope-based authorization middleware
 *
 * @param requiredScope The scope required to access the resource
 */
export function requireScope(requiredScope: AuthScope): RequestHandler {
  return (req, res, next) => {
    // Check JWT scopes
    if (req.jwtUser && hasScope(req.jwtUser, requiredScope)) {
      return next();
    }

    // Check API key scopes
    if (req.apiToken) {
      const payload: JWTPayload = {
        sub: req.apiToken.userId,
        scopes: req.apiToken.scopes,
        aud: ["twinengine"],
        typ: req.apiToken.tokenType,
        iat: 0,
        exp: 0,
      };
      if (hasScope(payload, requiredScope)) {
        return next();
      }
    }

    // For session auth, check if admin (fallback)
    if (req.isAuthenticated?.()) {
      // Session users get full access (backwards compatible)
      // TODO: Add role-based scopes for session users
      return next();
    }

    return res.status(403).json({
      error: {
        code: "INSUFFICIENT_SCOPE",
        message: `Required scope: ${requiredScope}`,
      },
    });
  };
}

/**
 * Factory function for requiring any of multiple scopes
 */
export function requireAnyScope(...requiredScopes: AuthScope[]): RequestHandler {
  return (req, res, next) => {
    // Check JWT scopes
    if (req.jwtUser && hasAnyScope(req.jwtUser, requiredScopes)) {
      return next();
    }

    // Check API key scopes
    if (req.apiToken) {
      const payload: JWTPayload = {
        sub: req.apiToken.userId,
        scopes: req.apiToken.scopes,
        aud: ["twinengine"],
        typ: req.apiToken.tokenType,
        iat: 0,
        exp: 0,
      };
      if (hasAnyScope(payload, requiredScopes)) {
        return next();
      }
    }

    // Session auth fallback
    if (req.isAuthenticated?.()) {
      return next();
    }

    return res.status(403).json({
      error: {
        code: "INSUFFICIENT_SCOPE",
        message: `Required one of: ${requiredScopes.join(", ")}`,
      },
    });
  };
}

/**
 * Factory function for requiring all of multiple scopes
 */
export function requireAllScopes(...requiredScopes: AuthScope[]): RequestHandler {
  return (req, res, next) => {
    // Check JWT scopes
    if (req.jwtUser && hasAllScopes(req.jwtUser, requiredScopes)) {
      return next();
    }

    // Check API key scopes
    if (req.apiToken) {
      const payload: JWTPayload = {
        sub: req.apiToken.userId,
        scopes: req.apiToken.scopes,
        aud: ["twinengine"],
        typ: req.apiToken.tokenType,
        iat: 0,
        exp: 0,
      };
      if (hasAllScopes(payload, requiredScopes)) {
        return next();
      }
    }

    // Session auth fallback
    if (req.isAuthenticated?.()) {
      return next();
    }

    return res.status(403).json({
      error: {
        code: "INSUFFICIENT_SCOPE",
        message: `Required all of: ${requiredScopes.join(", ")}`,
      },
    });
  };
}

/**
 * Get the authenticated user ID from any auth method
 */
export function getAuthenticatedUserId(req: Request): string | null {
  if (req.jwtUser) {
    return req.jwtUser.sub;
  }
  if (req.apiToken) {
    return req.apiToken.userId;
  }
  if (req.user?.id) {
    return req.user.id;
  }
  return null;
}

/**
 * Get all scopes for the current request
 */
export function getRequestScopes(req: Request): AuthScope[] {
  if (req.jwtUser) {
    return req.jwtUser.scopes;
  }
  if (req.apiToken) {
    return req.apiToken.scopes;
  }
  // Session users get admin scope by default (backwards compatible)
  if (req.isAuthenticated?.()) {
    return ["admin:*"];
  }
  return [];
}
