/**
 * Rate Limiting Middleware
 *
 * Provides rate limiting for authentication endpoints
 * to prevent brute force attacks.
 */

import rateLimit from "express-rate-limit";

/**
 * Rate limiter for authentication endpoints.
 * Allows 10 attempts per 15 minutes per IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: "Too many attempts, please try again later", code: "RATE_LIMITED" },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

/**
 * More lenient rate limiter for general API endpoints.
 * Allows 100 requests per minute per IP.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { error: "Too many requests, please try again later", code: "RATE_LIMITED" },
  standardHeaders: true,
  legacyHeaders: false,
});
