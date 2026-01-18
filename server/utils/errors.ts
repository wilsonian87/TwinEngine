/**
 * Error Response Utilities
 *
 * Provides standardized error responses for API endpoints.
 */

import type { Response } from "express";

export type ErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INTERNAL_ERROR";

interface ErrorResponse {
  error: string;
  code: ErrorCode;
  details?: unknown;
}

/**
 * Send a 400 Bad Request response
 */
export function badRequest(res: Response, message: string, details?: unknown): Response {
  const body: ErrorResponse = { error: message, code: "BAD_REQUEST" };
  if (details !== undefined) body.details = details;
  return res.status(400).json(body);
}

/**
 * Send a 400 Validation Error response (for Zod validation failures)
 */
export function validationError(res: Response, message: string, details?: unknown): Response {
  const body: ErrorResponse = { error: message, code: "VALIDATION_ERROR" };
  if (details !== undefined) body.details = details;
  return res.status(400).json(body);
}

/**
 * Send a 404 Not Found response
 */
export function notFound(res: Response, resource = "Resource"): Response {
  return res.status(404).json({
    error: `${resource} not found`,
    code: "NOT_FOUND",
  });
}

/**
 * Send a 401 Unauthorized response
 */
export function unauthorized(res: Response, message = "Authentication required"): Response {
  return res.status(401).json({
    error: message,
    code: "UNAUTHORIZED",
  });
}

/**
 * Send a 403 Forbidden response
 */
export function forbidden(res: Response, message = "Access denied"): Response {
  return res.status(403).json({
    error: message,
    code: "FORBIDDEN",
  });
}

/**
 * Send a 500 Internal Server Error response
 */
export function internalError(res: Response, message = "Internal server error"): Response {
  return res.status(500).json({
    error: message,
    code: "INTERNAL_ERROR",
  });
}
