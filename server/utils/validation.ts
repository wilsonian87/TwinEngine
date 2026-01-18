/**
 * Validation Utilities
 *
 * Provides type-safe query parameter and input validation.
 */

import { z } from "zod";

/**
 * Schema for pagination parameters
 */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

/**
 * Safely parse limit/offset from query parameters
 * Returns defaults if parsing fails
 */
export function safeParseLimitOffset(query: Record<string, unknown>): PaginationParams {
  const result = paginationSchema.safeParse(query);
  return result.success ? result.data : { limit: 50, offset: 0 };
}

/**
 * Safely parse a limit from query parameters
 * Returns the default if parsing fails
 */
export function safeParseLimit(query: Record<string, unknown>, defaultLimit = 50): number {
  const schema = z.object({
    limit: z.coerce.number().int().min(1).max(1000).default(defaultLimit),
  });
  const result = schema.safeParse(query);
  return result.success ? result.data.limit : defaultLimit;
}
