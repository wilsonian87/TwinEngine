/**
 * Feature Flag Service
 *
 * Provides runtime feature flag evaluation with:
 * - Global enable/disable
 * - User/role targeting
 * - Percentage-based rollout
 * - Caching for performance
 */

import { db } from "../db";
import {
  featureFlags,
  type FeatureFlagContext,
  type FeatureFlagDB,
  type InsertFeatureFlag,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";

// In-memory cache for feature flags
const flagCache = new Map<string, { flag: FeatureFlagDB; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

/**
 * Generate a consistent hash for percentage-based rollout
 * Uses user ID and flag key to ensure consistent experience per user
 */
function hashForRollout(userId: string, flagKey: string): number {
  const hash = createHash("md5")
    .update(`${userId}:${flagKey}`)
    .digest("hex");
  // Convert first 8 chars of hex to a number between 0-100
  const num = parseInt(hash.substring(0, 8), 16);
  return num % 100;
}

/**
 * Check if a cached flag is still valid
 */
function getCachedFlag(flagKey: string): FeatureFlagDB | null {
  const cached = flagCache.get(flagKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.flag;
  }
  return null;
}

/**
 * Cache a flag
 */
function cacheFlag(flag: FeatureFlagDB): void {
  flagCache.set(flag.flagKey, {
    flag,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * Invalidate a flag's cache
 */
export function invalidateFlagCache(flagKey: string): void {
  flagCache.delete(flagKey);
}

/**
 * Invalidate all flag caches
 */
export function invalidateAllFlagCaches(): void {
  flagCache.clear();
}

/**
 * Get a feature flag from the database (with caching)
 */
async function getFlag(flagKey: string): Promise<FeatureFlagDB | null> {
  // Check cache first
  const cached = getCachedFlag(flagKey);
  if (cached) {
    return cached;
  }

  // Fetch from database
  const [flag] = await db
    .select()
    .from(featureFlags)
    .where(eq(featureFlags.flagKey, flagKey))
    .limit(1);

  if (flag) {
    cacheFlag(flag);
  }

  return flag || null;
}

/**
 * Evaluate a feature flag for a given context
 *
 * @param flagKey The unique key of the feature flag
 * @param context The evaluation context (user ID, roles, attributes)
 * @returns true if the flag is enabled for this context
 */
export async function isFeatureEnabled(
  flagKey: string,
  context: FeatureFlagContext = {}
): Promise<boolean> {
  const flag = await getFlag(flagKey);

  // Flag doesn't exist = disabled
  if (!flag) {
    return false;
  }

  // Flag is globally disabled
  if (!flag.enabled) {
    return false;
  }

  // Check user targeting
  if (flag.targetUsers && flag.targetUsers.length > 0) {
    if (context.userId && flag.targetUsers.includes(context.userId)) {
      return true;
    }
  }

  // Check role targeting
  if (flag.targetRoles && flag.targetRoles.length > 0) {
    if (context.roles && context.roles.some((role) => flag.targetRoles!.includes(role))) {
      return true;
    }
  }

  // Check percentage rollout
  if (flag.rolloutPercentage && flag.rolloutPercentage > 0) {
    if (!context.userId) {
      // No user ID = use global rollout percentage as probability
      return Math.random() * 100 < flag.rolloutPercentage;
    }

    // Use consistent hashing for the user
    const userBucket = hashForRollout(context.userId, flagKey);
    return userBucket < flag.rolloutPercentage;
  }

  // If no targeting rules matched but flag is enabled, check if it's 100% rollout
  if (flag.rolloutPercentage === 100) {
    return true;
  }

  // If targeting is configured but didn't match, return false
  if (
    (flag.targetUsers && flag.targetUsers.length > 0) ||
    (flag.targetRoles && flag.targetRoles.length > 0)
  ) {
    return false;
  }

  // Flag is enabled with no targeting = enabled for everyone
  return true;
}

/**
 * Get all feature flags (for admin UI)
 */
export async function getAllFlags(): Promise<FeatureFlagDB[]> {
  return db.select().from(featureFlags).orderBy(featureFlags.flagKey);
}

/**
 * Get a single feature flag by key
 */
export async function getFlagByKey(flagKey: string): Promise<FeatureFlagDB | null> {
  return getFlag(flagKey);
}

/**
 * Create a new feature flag
 */
export async function createFlag(flag: InsertFeatureFlag): Promise<FeatureFlagDB> {
  const [created] = await db.insert(featureFlags).values(flag).returning();
  cacheFlag(created);
  return created;
}

/**
 * Update a feature flag
 */
export async function updateFlag(
  flagKey: string,
  updates: Partial<InsertFeatureFlag>
): Promise<FeatureFlagDB | null> {
  const [updated] = await db
    .update(featureFlags)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(featureFlags.flagKey, flagKey))
    .returning();

  if (updated) {
    invalidateFlagCache(flagKey);
    cacheFlag(updated);
  }

  return updated || null;
}

/**
 * Delete a feature flag
 */
export async function deleteFlag(flagKey: string): Promise<boolean> {
  const result = await db
    .delete(featureFlags)
    .where(eq(featureFlags.flagKey, flagKey));

  invalidateFlagCache(flagKey);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Batch evaluate multiple flags for a context
 */
export async function evaluateFlags(
  flagKeys: string[],
  context: FeatureFlagContext = {}
): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};

  await Promise.all(
    flagKeys.map(async (key) => {
      results[key] = await isFeatureEnabled(key, context);
    })
  );

  return results;
}

/**
 * Seed initial InsightRx feature flags
 */
export async function seedInsightRxFlags(): Promise<void> {
  const flags: InsertFeatureFlag[] = [
    {
      flagKey: "insightrx.validation",
      name: "InsightRx Content Validation",
      description: "Enable content validation for campaigns and messaging themes",
      enabled: true,
      rolloutPercentage: 100,
    },
    {
      flagKey: "insightrx.validation.blocking",
      name: "InsightRx Validation Blocking Mode",
      description: "Block content save when validation fails (requires insightrx.validation)",
      enabled: false,
      rolloutPercentage: 0,
    },
    {
      flagKey: "insightrx.knowledge",
      name: "InsightRx Knowledge Enrichment",
      description: "Enable knowledge base search and enrichment",
      enabled: true,
      rolloutPercentage: 100,
    },
    {
      flagKey: "insightrx.knowledge.panels",
      name: "InsightRx Knowledge Panels",
      description: "Show knowledge panels in campaign editing UI",
      enabled: true,
      rolloutPercentage: 100,
    },
    {
      flagKey: "omnivoice.chat_widget",
      name: "Omni-Voice Chat Widget",
      description: "Enable the Omni-Voice chat widget in the UI",
      enabled: true,
      rolloutPercentage: 100,
    },
    {
      flagKey: "omnivor.platform_mode",
      name: "Platform Mode Toggle (Discover/Direct)",
      description: "Enable the Discover/Direct mode toggle in navigation. Controls dual-mode page rendering.",
      enabled: true,
      rolloutPercentage: 100,
    },
  ];

  for (const flag of flags) {
    const existing = await getFlag(flag.flagKey);
    if (!existing) {
      await createFlag(flag);
      console.log(`[FEATURE-FLAGS] Created flag: ${flag.flagKey}`);
    }
  }
}
