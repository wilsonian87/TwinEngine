/**
 * JWT Service
 *
 * Tiered authentication system for TwinEngine:
 * - User tokens (session-based JWT for UI authentication)
 * - Service tokens (internal service-to-service communication)
 * - API keys (long-lived tokens for automation)
 *
 * Token types:
 * - user: Short-lived (15 min), refreshable, for UI sessions
 * - service: Medium-lived (1 hour), for internal calls between services
 * - api_key: Long-lived (configurable), for external automation
 */

import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "crypto";
import { db } from "../db";
import { apiTokens, type JWTPayload, type AuthScope, type TokenType } from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";
import { requireEnvVar } from "../utils/config";

// Configuration
const JWT_SECRET = requireEnvVar("JWT_SECRET", "twinengine-jwt-secret-dev");
const JWT_REFRESH_SECRET = requireEnvVar("JWT_REFRESH_SECRET", "twinengine-refresh-secret-dev");

// Token expiry defaults (in seconds)
const TOKEN_EXPIRY = {
  user: 15 * 60, // 15 minutes
  service: 60 * 60, // 1 hour
  api_key: 365 * 24 * 60 * 60, // 1 year
  refresh: 7 * 24 * 60 * 60, // 7 days
};

// Default audiences
const DEFAULT_AUDIENCES = ["twinengine"];

/**
 * Hash a token for storage (we never store raw tokens)
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Generate a cryptographically secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString("base64url");
}

/**
 * Issue a new JWT token
 */
export function issueToken(
  userId: string,
  options: {
    tokenType: TokenType;
    scopes: AuthScope[];
    roles?: string[];
    audiences?: string[];
    expiresIn?: number; // Override default expiry in seconds
    tokenId?: string; // For tracking/revocation
  }
): string {
  const { tokenType, scopes, roles = [], audiences = DEFAULT_AUDIENCES, expiresIn, tokenId } = options;

  const payload: JWTPayload = {
    sub: userId,
    roles,
    scopes,
    aud: audiences,
    typ: tokenType,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (expiresIn || TOKEN_EXPIRY[tokenType]),
    jti: tokenId || generateSecureToken(16),
  };

  return jwt.sign(payload, JWT_SECRET, { algorithm: "HS256" });
}

/**
 * Issue a refresh token
 */
export function issueRefreshToken(userId: string, tokenId: string): string {
  const payload = {
    sub: userId,
    jti: tokenId,
    typ: "refresh",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRY.refresh,
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, { algorithm: "HS256" });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as JWTPayload;
    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new TokenError("Token expired", "TOKEN_EXPIRED");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new TokenError("Invalid token", "INVALID_TOKEN");
    }
    throw new TokenError("Token verification failed", "VERIFICATION_FAILED");
  }
}

/**
 * Verify a refresh token
 */
export function verifyRefreshToken(token: string): { sub: string; jti: string } {
  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET, { algorithms: ["HS256"] }) as {
      sub: string;
      jti: string;
      typ: string;
    };

    if (payload.typ !== "refresh") {
      throw new TokenError("Invalid token type", "INVALID_TOKEN_TYPE");
    }

    return { sub: payload.sub, jti: payload.jti };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new TokenError("Refresh token expired", "REFRESH_TOKEN_EXPIRED");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new TokenError("Invalid refresh token", "INVALID_REFRESH_TOKEN");
    }
    throw error;
  }
}

/**
 * Check if a token has the required scope
 */
export function hasScope(payload: JWTPayload, requiredScope: AuthScope): boolean {
  // admin:* grants all permissions
  if (payload.scopes.includes("admin:*")) {
    return true;
  }
  return payload.scopes.includes(requiredScope);
}

/**
 * Check if a token has any of the required scopes
 */
export function hasAnyScope(payload: JWTPayload, requiredScopes: AuthScope[]): boolean {
  return requiredScopes.some((scope) => hasScope(payload, scope));
}

/**
 * Check if a token has all the required scopes
 */
export function hasAllScopes(payload: JWTPayload, requiredScopes: AuthScope[]): boolean {
  return requiredScopes.every((scope) => hasScope(payload, scope));
}

/**
 * Create and store an API token (for long-lived automation tokens)
 */
export async function createApiToken(
  userId: string,
  options: {
    name: string;
    tokenType: TokenType;
    scopes: AuthScope[];
    expiresInDays?: number;
  }
): Promise<{ token: string; id: string }> {
  const { name, tokenType, scopes, expiresInDays } = options;

  // Generate the raw token
  const rawToken = `te_${tokenType}_${generateSecureToken(32)}`;
  const tokenHash = hashToken(rawToken);

  // Calculate expiry
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  // Store in database
  const [inserted] = await db
    .insert(apiTokens)
    .values({
      userId,
      name,
      tokenHash,
      tokenType,
      scopes,
      expiresAt,
    })
    .returning({ id: apiTokens.id });

  return { token: rawToken, id: inserted.id };
}

/**
 * Validate an API token (for bearer token authentication)
 */
export async function validateApiToken(
  rawToken: string
): Promise<{ userId: string; scopes: AuthScope[]; tokenType: TokenType } | null> {
  const tokenHash = hashToken(rawToken);

  const [token] = await db
    .select()
    .from(apiTokens)
    .where(
      and(
        eq(apiTokens.tokenHash, tokenHash),
        isNull(apiTokens.revokedAt)
      )
    )
    .limit(1);

  if (!token) {
    return null;
  }

  // Check expiry
  if (token.expiresAt && token.expiresAt < new Date()) {
    return null;
  }

  // Update usage tracking
  await db
    .update(apiTokens)
    .set({
      lastUsedAt: new Date(),
      usageCount: (token.usageCount || 0) + 1,
    })
    .where(eq(apiTokens.id, token.id));

  return {
    userId: token.userId!,
    scopes: token.scopes as AuthScope[],
    tokenType: token.tokenType as TokenType,
  };
}

/**
 * Revoke an API token
 */
export async function revokeApiToken(tokenId: string, reason?: string): Promise<boolean> {
  const result = await db
    .update(apiTokens)
    .set({
      revokedAt: new Date(),
      revokedReason: reason,
    })
    .where(eq(apiTokens.id, tokenId));

  return (result.rowCount ?? 0) > 0;
}

/**
 * List API tokens for a user
 */
export async function listApiTokens(userId: string): Promise<typeof apiTokens.$inferSelect[]> {
  return db
    .select()
    .from(apiTokens)
    .where(eq(apiTokens.userId, userId));
}

/**
 * Issue a complete token pair (access + refresh)
 */
export async function issueTokenPair(
  userId: string,
  options: {
    scopes: AuthScope[];
    roles?: string[];
    audiences?: string[];
  }
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const tokenId = generateSecureToken(16);

  const accessToken = issueToken(userId, {
    tokenType: "user",
    scopes: options.scopes,
    roles: options.roles,
    audiences: options.audiences,
    tokenId,
  });

  const refreshToken = issueRefreshToken(userId, tokenId);

  return {
    accessToken,
    refreshToken,
    expiresIn: TOKEN_EXPIRY.user,
  };
}

/**
 * Refresh an access token using a refresh token
 */
export async function refreshAccessToken(
  refreshToken: string,
  options: {
    scopes: AuthScope[];
    roles?: string[];
    audiences?: string[];
  }
): Promise<{ accessToken: string; expiresIn: number }> {
  const { sub: userId, jti: tokenId } = verifyRefreshToken(refreshToken);

  const accessToken = issueToken(userId, {
    tokenType: "user",
    scopes: options.scopes,
    roles: options.roles,
    audiences: options.audiences,
    tokenId,
  });

  return {
    accessToken,
    expiresIn: TOKEN_EXPIRY.user,
  };
}

/**
 * Custom error class for token-related errors
 */
export class TokenError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "TokenError";
    this.code = code;
  }
}

/**
 * Extract bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Decode a token without verification (for inspection only)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    return decoded;
  } catch {
    return null;
  }
}
