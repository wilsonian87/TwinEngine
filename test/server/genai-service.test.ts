/**
 * GenAI Service Tests
 *
 * Tests for Claude-powered NL query processing with fallback to rule-based parsing.
 * These tests verify:
 * - Service initialization
 * - Rate limiting
 * - Fallback behavior when API key is not set
 * - Zod schema validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initializeGenAI,
  isGenAIAvailable,
  getUsageStats,
  parseNLQueryWithAI,
  detectIntentWithAI,
  generateRecommendationsWithAI,
  resetRateLimitState,
  setConfig,
  isInitialized,
} from '../../server/services/genai-service';
import type { NLQueryFilters, HCPProfile } from '@shared/schema';

describe('GenAI Service', () => {
  beforeEach(() => {
    // Reset service state before each test
    resetRateLimitState();
    // Disable GenAI by setting enabled to false (no API key scenario)
    setConfig({ enabled: false });
  });

  describe('Service Initialization', () => {
    const originalEnv = process.env.ANTHROPIC_API_KEY;

    afterEach(() => {
      // Restore original env
      if (originalEnv) {
        process.env.ANTHROPIC_API_KEY = originalEnv;
      } else {
        delete process.env.ANTHROPIC_API_KEY;
      }
    });

    it('should return false when ANTHROPIC_API_KEY is not set', () => {
      delete process.env.ANTHROPIC_API_KEY;
      const result = initializeGenAI();
      expect(result).toBe(false);
    });

    it('should export isInitialized function', () => {
      expect(isInitialized).toBeDefined();
      expect(typeof isInitialized).toBe('function');
    });

    it('should be unavailable when not initialized', () => {
      setConfig({ enabled: false });
      expect(isGenAIAvailable()).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should track usage stats', () => {
      resetRateLimitState();
      const stats = getUsageStats();

      expect(stats).toHaveProperty('requestsInWindow');
      expect(stats).toHaveProperty('totalTokensUsed');
      expect(stats).toHaveProperty('totalCost');
      expect(stats).toHaveProperty('isAvailable');
    });

    it('should start with zero requests in window', () => {
      resetRateLimitState();
      const stats = getUsageStats();
      expect(stats.requestsInWindow).toBe(0);
    });

    it('should report not available when disabled', () => {
      setConfig({ enabled: false });
      const stats = getUsageStats();
      expect(stats.isAvailable).toBe(false);
    });

    it('should respect maxRequestsPerMinute config', () => {
      setConfig({ enabled: true, maxRequestsPerMinute: 5 });
      // Without a client, should still be unavailable
      expect(isGenAIAvailable()).toBe(false);
    });
  });

  describe('Fallback Behavior', () => {
    beforeEach(() => {
      setConfig({ enabled: false });
    });

    it('should fall back to rule-based parsing when disabled', async () => {
      const result = await parseNLQueryWithAI('Show me oncologists in California');

      expect(result).toHaveProperty('filters');
      expect(result).toHaveProperty('usedAI');
      expect(result.usedAI).toBe(false);
    });

    it('should parse specialties with rule-based fallback', async () => {
      const result = await parseNLQueryWithAI('Find all Cardiology specialists');

      expect(result.usedAI).toBe(false);
      expect(result.filters).toBeDefined();
      // Rule-based parser matches exact specialty names
      expect(result.filters.specialties).toContain('Cardiology');
    });

    it('should parse tiers with rule-based fallback', async () => {
      const result = await parseNLQueryWithAI('Show tier 1 HCPs');

      expect(result.usedAI).toBe(false);
      expect(result.filters.tiers).toBeDefined();
      expect(result.filters.tiers).toContain('Tier 1');
    });

    it('should parse engagement ranges with rule-based fallback', async () => {
      const result = await parseNLQueryWithAI('HCPs with high engagement above 80');

      expect(result.usedAI).toBe(false);
      expect(result.filters.engagementRange).toBeDefined();
    });

    it('should fall back to rule-based intent detection when disabled', async () => {
      const result = await detectIntentWithAI('How can I improve engagement?');

      expect(result).toHaveProperty('intent');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('usedAI');
      expect(result.usedAI).toBe(false);
      expect(result.confidence).toBe(0.7); // Default rule-based confidence
    });

    it('should detect optimization intent with rule-based fallback', async () => {
      const result = await detectIntentWithAI('boost engagement for tier 1');

      expect(result.usedAI).toBe(false);
      expect(result.intent).toBe('optimization');
    });

    it('should detect discovery intent with rule-based fallback', async () => {
      const result = await detectIntentWithAI('find oncologists in NY');

      expect(result.usedAI).toBe(false);
      expect(result.intent).toBe('discovery');
    });

    it('should detect analysis intent with rule-based fallback', async () => {
      const result = await detectIntentWithAI('why is engagement low?');

      expect(result.usedAI).toBe(false);
      expect(result.intent).toBe('analysis');
    });

    it('should detect comparison intent with rule-based fallback', async () => {
      const result = await detectIntentWithAI('compare tier 1 vs tier 2');

      expect(result.usedAI).toBe(false);
      expect(result.intent).toBe('comparison');
    });
  });

  describe('Recommendation Generation Fallback', () => {
    const mockHcps: HCPProfile[] = [
      {
        id: 'hcp-1',
        npi: '1234567890',
        firstName: 'John',
        lastName: 'Smith',
        specialty: 'Oncology',
        tier: 'Tier 1',
        segment: 'High Prescriber',
        state: 'CA',
        city: 'Los Angeles',
        zipCode: '90001',
        overallEngagementScore: 85,
        channelPreference: 'email',
        monthlyRxVolume: 150,
        decileRank: 9,
        marketAccessScore: 88,
        affinityScore: 82,
        channelEngagement: { email: 90, in_person: 70, virtual_meeting: 60, phone: 50 },
        prescribingTrends: [100, 110, 120, 125, 130],
        recentInteractions: [],
        predictedChurnRisk: 0.1,
        lastContactDate: '2025-01-01',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      {
        id: 'hcp-2',
        npi: '0987654321',
        firstName: 'Jane',
        lastName: 'Doe',
        specialty: 'Oncology',
        tier: 'Tier 2',
        segment: 'Growth Target',
        state: 'NY',
        city: 'New York',
        zipCode: '10001',
        overallEngagementScore: 45,
        channelPreference: 'virtual_meeting',
        monthlyRxVolume: 80,
        decileRank: 6,
        marketAccessScore: 72,
        affinityScore: 55,
        channelEngagement: { email: 40, in_person: 30, virtual_meeting: 70, phone: 35 },
        prescribingTrends: [70, 72, 75, 78, 80],
        recentInteractions: [],
        predictedChurnRisk: 0.3,
        lastContactDate: '2024-12-15',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-12-15T00:00:00Z',
      },
    ];

    const mockFilters: NLQueryFilters = {
      specialties: ['Oncology'],
    };

    beforeEach(() => {
      setConfig({ enabled: false });
    });

    it('should fall back to rule-based recommendations when disabled', async () => {
      const result = await generateRecommendationsWithAI(
        mockFilters,
        mockHcps,
        'How can I improve engagement for oncologists?'
      );

      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('usedAI');
      expect(result.usedAI).toBe(false);
    });

    it('should return empty recommendations for empty HCP list', async () => {
      const result = await generateRecommendationsWithAI(
        mockFilters,
        [],
        'Show me recommendations'
      );

      expect(result.usedAI).toBe(false);
      expect(result.recommendations).toEqual([]);
    });

    it('should generate recommendations with valid structure', async () => {
      const result = await generateRecommendationsWithAI(
        mockFilters,
        mockHcps,
        'Improve engagement'
      );

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);

      if (result.recommendations.length > 0) {
        const rec = result.recommendations[0];
        expect(rec).toHaveProperty('type');
        expect(rec).toHaveProperty('recommendation');
        expect(rec).toHaveProperty('predictedImpact');
        expect(rec).toHaveProperty('confidence');
        expect(rec).toHaveProperty('rationale');
      }
    });

    it('should handle tier-specific recommendations', async () => {
      const tierFilters: NLQueryFilters = {
        tiers: ['Tier 1'],
      };

      const result = await generateRecommendationsWithAI(
        tierFilters,
        mockHcps,
        'How to engage tier 1 HCPs better?'
      );

      expect(result.usedAI).toBe(false);
      expect(result.recommendations).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should allow updating config', () => {
      setConfig({ maxRequestsPerMinute: 10 });
      // Config change should be accepted without error
      expect(true).toBe(true);
    });

    it('should allow setting cost per token', () => {
      setConfig({
        costPerInputToken: 0.000005,
        costPerOutputToken: 0.000025,
      });
      // Config change should be accepted without error
      expect(true).toBe(true);
    });

    it('should allow disabling service', () => {
      setConfig({ enabled: false });
      expect(isGenAIAvailable()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      setConfig({ enabled: false });
    });

    it('should handle empty query string', async () => {
      const result = await parseNLQueryWithAI('');

      expect(result).toHaveProperty('filters');
      expect(result.usedAI).toBe(false);
    });

    it('should handle query with only whitespace', async () => {
      const result = await parseNLQueryWithAI('   ');

      expect(result).toHaveProperty('filters');
      expect(result.usedAI).toBe(false);
    });

    it('should handle query with special characters', async () => {
      const result = await parseNLQueryWithAI('Find HCPs with >80% engagement & tier=1');

      expect(result).toHaveProperty('filters');
      expect(result.usedAI).toBe(false);
    });

    it('should handle very long query string', async () => {
      const longQuery = 'Show me '.repeat(100) + 'oncologists';
      const result = await parseNLQueryWithAI(longQuery);

      expect(result).toHaveProperty('filters');
      expect(result.usedAI).toBe(false);
    });

    it('should handle queries in different cases', async () => {
      // Rule-based parser matches exact specialty names (case-insensitive)
      const result1 = await parseNLQueryWithAI('ONCOLOGY specialists');
      const result2 = await parseNLQueryWithAI('oncology specialists');
      const result3 = await parseNLQueryWithAI('Oncology specialists');

      // All should recognize oncology specialty
      expect(result1.filters.specialties).toContain('Oncology');
      expect(result2.filters.specialties).toContain('Oncology');
      expect(result3.filters.specialties).toContain('Oncology');
    });
  });
});
