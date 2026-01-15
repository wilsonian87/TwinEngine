/**
 * GenAI Service - Claude-powered natural language processing
 *
 * This module provides LLM-powered NL query parsing for the TwinEngine platform.
 * It uses Claude to extract structured filters and intent from natural language queries,
 * with fallback to rule-based parsing if the LLM fails or is unavailable.
 */

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { NLQueryFilters, NLRecommendation, HCPProfile } from '@shared/schema';
import { specialties, tiers, segments, channels } from '@shared/schema';
import {
  parseNLQueryToFilters as ruleBasedParse,
  detectQueryIntent as ruleBasedIntent,
  generateRecommendations as ruleBasedRecommendations,
} from './nl-query-parser';

// Zod schema for validating LLM-parsed filters
const llmFiltersSchema = z.object({
  specialties: z.array(z.enum(specialties as unknown as [string, ...string[]])).optional(),
  tiers: z.array(z.enum(tiers as unknown as [string, ...string[]])).optional(),
  segments: z.array(z.enum(segments as unknown as [string, ...string[]])).optional(),
  channels: z.array(z.enum(channels as unknown as [string, ...string[]])).optional(),
  engagementRange: z.object({
    min: z.number().min(0).max(100).optional(),
    max: z.number().min(0).max(100).optional(),
  }).optional(),
  states: z.array(z.string()).optional(),
});

// Zod schema for validating LLM intent detection
const llmIntentSchema = z.object({
  intent: z.enum(['optimization', 'discovery', 'analysis', 'comparison', 'general']),
  confidence: z.number().min(0).max(1),
  explanation: z.string().optional(),
});

// Zod schema for LLM-generated recommendations
const llmRecommendationSchema = z.object({
  recommendations: z.array(z.object({
    type: z.enum(['channel', 'frequency', 'content', 'timing', 'segment']),
    recommendation: z.string(),
    predictedImpact: z.number().min(0).max(100),
    confidence: z.number().min(0).max(1),
    rationale: z.string(),
  })),
});

// Rate limiting configuration
interface RateLimitState {
  requestCount: number;
  windowStart: number;
  totalTokensUsed: number;
  totalCost: number;
}

// GenAI service configuration
interface GenAIConfig {
  enabled: boolean;
  maxRequestsPerMinute: number;
  maxTokensPerRequest: number;
  costPerInputToken: number;
  costPerOutputToken: number;
}

// Default configuration
const DEFAULT_CONFIG: GenAIConfig = {
  enabled: true,
  maxRequestsPerMinute: 20,
  maxTokensPerRequest: 1024,
  costPerInputToken: 0.000003, // Claude 3 Haiku pricing (example)
  costPerOutputToken: 0.000015,
};

// Service state
let anthropicClient: Anthropic | null = null;
let config: GenAIConfig = DEFAULT_CONFIG;
let rateLimitState: RateLimitState = {
  requestCount: 0,
  windowStart: Date.now(),
  totalTokensUsed: 0,
  totalCost: 0,
};

/**
 * Initialize the GenAI service
 */
export function initializeGenAI(customConfig?: Partial<GenAIConfig>): boolean {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.warn('ANTHROPIC_API_KEY not set - GenAI features will use rule-based fallback');
    config = { ...DEFAULT_CONFIG, enabled: false, ...customConfig };
    return false;
  }

  try {
    anthropicClient = new Anthropic({ apiKey });
    config = { ...DEFAULT_CONFIG, ...customConfig };
    console.log('GenAI service initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize GenAI service:', error);
    config = { ...DEFAULT_CONFIG, enabled: false };
    return false;
  }
}

/**
 * Check if GenAI is available and within rate limits
 */
export function isGenAIAvailable(): boolean {
  if (!config.enabled || !anthropicClient) {
    return false;
  }

  // Check rate limit window
  const now = Date.now();
  const windowDuration = 60 * 1000; // 1 minute

  if (now - rateLimitState.windowStart > windowDuration) {
    // Reset window
    rateLimitState.requestCount = 0;
    rateLimitState.windowStart = now;
  }

  return rateLimitState.requestCount < config.maxRequestsPerMinute;
}

/**
 * Get current usage statistics
 */
export function getUsageStats(): {
  requestsInWindow: number;
  totalTokensUsed: number;
  totalCost: number;
  isAvailable: boolean;
} {
  return {
    requestsInWindow: rateLimitState.requestCount,
    totalTokensUsed: rateLimitState.totalTokensUsed,
    totalCost: rateLimitState.totalCost,
    isAvailable: isGenAIAvailable(),
  };
}

/**
 * Parse a natural language query using Claude
 * Falls back to rule-based parsing if LLM is unavailable or fails
 */
export async function parseNLQueryWithAI(
  query: string
): Promise<{ filters: NLQueryFilters; usedAI: boolean }> {
  // Check if GenAI is available
  if (!isGenAIAvailable()) {
    return {
      filters: ruleBasedParse(query),
      usedAI: false,
    };
  }

  const systemPrompt = `You are a query parser for an HCP (Healthcare Professional) analytics platform.
Extract structured filters from natural language queries about HCPs.

Available filter options:
- Specialties: ${specialties.join(', ')}
- Tiers: ${tiers.join(', ')}
- Segments: ${segments.join(', ')}
- Channels: ${channels.join(', ')}
- Engagement range: min and max values from 0-100
- States: US state abbreviations

Return a JSON object with only the filters mentioned in the query.
If a filter type is not mentioned, omit it from the response.
Be precise and only extract explicitly mentioned criteria.`;

  const userPrompt = `Parse this query and extract filters as JSON:
"${query}"

Return only valid JSON with this structure (include only relevant fields):
{
  "specialties": ["Oncology"],
  "tiers": ["Tier 1"],
  "segments": ["High Prescriber"],
  "channels": ["email"],
  "engagementRange": {"min": 70, "max": 100},
  "states": ["CA", "NY"]
}`;

  try {
    rateLimitState.requestCount++;

    const response = await anthropicClient!.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: config.maxTokensPerRequest,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      system: systemPrompt,
    });

    // Track usage
    const inputTokens = response.usage?.input_tokens || 0;
    const outputTokens = response.usage?.output_tokens || 0;
    rateLimitState.totalTokensUsed += inputTokens + outputTokens;
    rateLimitState.totalCost +=
      inputTokens * config.costPerInputToken +
      outputTokens * config.costPerOutputToken;

    // Extract text content
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    // Parse JSON from response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = llmFiltersSchema.parse(parsed);

    return {
      filters: validated as NLQueryFilters,
      usedAI: true,
    };
  } catch (error) {
    console.error('GenAI parsing failed, using rule-based fallback:', error);
    return {
      filters: ruleBasedParse(query),
      usedAI: false,
    };
  }
}

/**
 * Detect query intent using Claude
 * Falls back to rule-based detection if LLM is unavailable or fails
 */
export async function detectIntentWithAI(
  query: string
): Promise<{ intent: string; confidence: number; usedAI: boolean }> {
  if (!isGenAIAvailable()) {
    return {
      intent: ruleBasedIntent(query),
      confidence: 0.7,
      usedAI: false,
    };
  }

  const systemPrompt = `You are an intent classifier for an HCP analytics platform.
Classify the user's intent into one of these categories:
- optimization: User wants to improve or boost engagement/performance
- discovery: User wants to find or identify specific HCPs
- analysis: User wants to understand why something happened
- comparison: User wants to compare different groups or scenarios
- general: General inquiry or doesn't fit other categories

Return JSON with intent, confidence (0-1), and brief explanation.`;

  const userPrompt = `Classify the intent of this query:
"${query}"

Return JSON: {"intent": "category", "confidence": 0.95, "explanation": "brief reason"}`;

  try {
    rateLimitState.requestCount++;

    const response = await anthropicClient!.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 256,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    });

    // Track usage
    const inputTokens = response.usage?.input_tokens || 0;
    const outputTokens = response.usage?.output_tokens || 0;
    rateLimitState.totalTokensUsed += inputTokens + outputTokens;
    rateLimitState.totalCost +=
      inputTokens * config.costPerInputToken +
      outputTokens * config.costPerOutputToken;

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = llmIntentSchema.parse(parsed);

    return {
      intent: validated.intent,
      confidence: validated.confidence,
      usedAI: true,
    };
  } catch (error) {
    console.error('GenAI intent detection failed, using rule-based fallback:', error);
    return {
      intent: ruleBasedIntent(query),
      confidence: 0.7,
      usedAI: false,
    };
  }
}

/**
 * Generate recommendations using Claude
 * Falls back to rule-based recommendations if LLM is unavailable or fails
 */
export async function generateRecommendationsWithAI(
  filters: NLQueryFilters,
  hcps: HCPProfile[],
  query: string
): Promise<{ recommendations: NLRecommendation[]; usedAI: boolean }> {
  if (!isGenAIAvailable() || hcps.length === 0) {
    return {
      recommendations: ruleBasedRecommendations(filters, hcps),
      usedAI: false,
    };
  }

  // Prepare cohort summary for the LLM
  const cohortSummary = {
    totalHcps: hcps.length,
    avgEngagement: hcps.reduce((sum, h) => sum + h.overallEngagementScore, 0) / hcps.length,
    tierBreakdown: {
      tier1: hcps.filter(h => h.tier === 'Tier 1').length,
      tier2: hcps.filter(h => h.tier === 'Tier 2').length,
      tier3: hcps.filter(h => h.tier === 'Tier 3').length,
    },
    topChannels: getTopChannels(hcps),
    avgRxVolume: hcps.reduce((sum, h) => sum + h.monthlyRxVolume, 0) / hcps.length,
  };

  const systemPrompt = `You are a pharmaceutical engagement strategist.
Generate actionable recommendations for improving HCP engagement based on cohort data.
Focus on channel optimization, frequency adjustments, and content strategy.
Be specific and data-driven in your recommendations.`;

  const userPrompt = `Based on this HCP cohort analysis, generate engagement recommendations:

Query: "${query}"
Filters applied: ${JSON.stringify(filters)}

Cohort Summary:
- Total HCPs: ${cohortSummary.totalHcps}
- Average Engagement Score: ${cohortSummary.avgEngagement.toFixed(1)}%
- Tier Breakdown: Tier 1: ${cohortSummary.tierBreakdown.tier1}, Tier 2: ${cohortSummary.tierBreakdown.tier2}, Tier 3: ${cohortSummary.tierBreakdown.tier3}
- Top Preferred Channels: ${cohortSummary.topChannels.join(', ')}
- Average Monthly Rx Volume: ${cohortSummary.avgRxVolume.toFixed(0)}

Generate 2-3 specific recommendations as JSON:
{
  "recommendations": [
    {
      "type": "channel|frequency|content|timing|segment",
      "recommendation": "Specific actionable recommendation",
      "predictedImpact": 15,
      "confidence": 0.82,
      "rationale": "Why this recommendation makes sense for this cohort"
    }
  ]
}`;

  try {
    rateLimitState.requestCount++;

    const response = await anthropicClient!.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: config.maxTokensPerRequest,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    });

    // Track usage
    const inputTokens = response.usage?.input_tokens || 0;
    const outputTokens = response.usage?.output_tokens || 0;
    rateLimitState.totalTokensUsed += inputTokens + outputTokens;
    rateLimitState.totalCost +=
      inputTokens * config.costPerInputToken +
      outputTokens * config.costPerOutputToken;

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = llmRecommendationSchema.parse(parsed);

    return {
      recommendations: validated.recommendations as NLRecommendation[],
      usedAI: true,
    };
  } catch (error) {
    console.error('GenAI recommendations failed, using rule-based fallback:', error);
    return {
      recommendations: ruleBasedRecommendations(filters, hcps),
      usedAI: false,
    };
  }
}

/**
 * Helper function to get top channels from HCP list
 */
function getTopChannels(hcps: HCPProfile[]): string[] {
  const channelCounts = new Map<string, number>();
  hcps.forEach(h => {
    channelCounts.set(h.channelPreference, (channelCounts.get(h.channelPreference) || 0) + 1);
  });
  return Array.from(channelCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([channel]) => channel.replace('_', ' '));
}

/**
 * Reset rate limit state (for testing)
 */
export function resetRateLimitState(): void {
  rateLimitState = {
    requestCount: 0,
    windowStart: Date.now(),
    totalTokensUsed: 0,
    totalCost: 0,
  };
}

/**
 * Set configuration (for testing)
 */
export function setConfig(newConfig: Partial<GenAIConfig>): void {
  config = { ...config, ...newConfig };
}

/**
 * Check if the service is initialized
 */
export function isInitialized(): boolean {
  return anthropicClient !== null;
}
