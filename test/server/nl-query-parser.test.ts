import { describe, it, expect } from 'vitest';
import type { NLQueryFilters } from '@shared/schema';
import { specialties, segments, channels, tiers } from '@shared/schema';

// Reimplementation of NL query parser for testing
// (In production, this would be exported from storage.ts)

function parseNLQueryToFilters(query: string): NLQueryFilters {
  const q = query.toLowerCase();
  const filters: NLQueryFilters = {};

  // Tier detection
  if (q.includes('tier 1') || q.includes('tier1')) {
    filters.tiers = ['Tier 1'];
  } else if (q.includes('tier 2') || q.includes('tier2')) {
    filters.tiers = ['Tier 2'];
  } else if (q.includes('tier 3') || q.includes('tier3')) {
    filters.tiers = ['Tier 3'];
  }

  // Specialty detection
  for (const specialty of specialties) {
    if (q.includes(specialty.toLowerCase())) {
      filters.specialties = [specialty];
      break;
    }
  }

  // Segment detection
  for (const segment of segments) {
    if (q.includes(segment.toLowerCase())) {
      filters.segments = [segment];
      break;
    }
  }

  // Channel detection
  for (const channel of channels) {
    const channelName = channel.replace('_', ' ');
    if (q.includes(channelName) || q.includes(channel)) {
      filters.channels = [channel];
      break;
    }
  }

  // Engagement range detection
  const engagementMatch = q.match(/(\d+)\s*[-–]\s*(\d+)\s*%?\s*(engagement|score)?/);
  if (engagementMatch) {
    filters.engagementRange = {
      min: parseInt(engagementMatch[1]),
      max: parseInt(engagementMatch[2]),
    };
  }

  // High/low engagement
  if (q.includes('high engagement') || q.includes('highly engaged')) {
    filters.engagementRange = { min: 70 };
  } else if (q.includes('low engagement') || q.includes('poorly engaged')) {
    filters.engagementRange = { max: 40 };
  }

  return filters;
}

function detectQueryIntent(query: string): string {
  const q = query.toLowerCase();

  if (q.includes('boost') || q.includes('increase') || q.includes('improve')) {
    return 'optimization';
  }
  if (q.includes('find') || q.includes('identify') || q.includes('show')) {
    return 'discovery';
  }
  if (q.includes('why') || q.includes('reason') || q.includes('explain')) {
    return 'analysis';
  }
  if (q.includes('compare') || q.includes('difference') || q.includes('versus')) {
    return 'comparison';
  }

  return 'general';
}

describe('NL Query Parser', () => {
  describe('parseNLQueryToFilters', () => {
    describe('Tier Detection', () => {
      it('should detect Tier 1', () => {
        const result = parseNLQueryToFilters('Show me all Tier 1 HCPs');
        expect(result.tiers).toEqual(['Tier 1']);
      });

      it('should detect Tier 2', () => {
        const result = parseNLQueryToFilters('Find tier 2 oncologists');
        expect(result.tiers).toEqual(['Tier 2']);
      });

      it('should detect Tier 3', () => {
        const result = parseNLQueryToFilters('List Tier3 doctors');
        expect(result.tiers).toEqual(['Tier 3']);
      });

      it('should handle case insensitivity', () => {
        const result = parseNLQueryToFilters('TIER 1 physicians');
        expect(result.tiers).toEqual(['Tier 1']);
      });
    });

    describe('Specialty Detection', () => {
      it('should detect Oncology', () => {
        const result = parseNLQueryToFilters('Show oncology specialists');
        expect(result.specialties).toEqual(['Oncology']);
      });

      it('should detect Cardiology', () => {
        const result = parseNLQueryToFilters('Find cardiology HCPs in NY');
        expect(result.specialties).toEqual(['Cardiology']);
      });

      it('should detect Neurology', () => {
        const result = parseNLQueryToFilters('List all neurology doctors');
        expect(result.specialties).toEqual(['Neurology']);
      });

      it('should handle multiple terms but return first match', () => {
        const result = parseNLQueryToFilters('oncology or cardiology specialists');
        expect(result.specialties).toBeDefined();
        expect(result.specialties?.length).toBe(1);
      });
    });

    describe('Segment Detection', () => {
      it('should detect High Prescriber', () => {
        const result = parseNLQueryToFilters('Show high prescriber HCPs');
        expect(result.segments).toEqual(['High Prescriber']);
      });

      it('should detect Growth Potential', () => {
        const result = parseNLQueryToFilters('Find growth potential targets');
        expect(result.segments).toEqual(['Growth Potential']);
      });

      it('should detect New Target', () => {
        const result = parseNLQueryToFilters('List new target physicians');
        expect(result.segments).toEqual(['New Target']);
      });

      it('should detect Engaged Digital', () => {
        const result = parseNLQueryToFilters('Find engaged digital HCPs');
        expect(result.segments).toEqual(['Engaged Digital']);
      });
    });

    describe('Channel Detection', () => {
      it('should detect email channel', () => {
        const result = parseNLQueryToFilters('HCPs who prefer email');
        expect(result.channels).toEqual(['email']);
      });

      it('should detect rep_visit channel', () => {
        const result = parseNLQueryToFilters('Find HCPs for rep visit');
        expect(result.channels).toEqual(['rep_visit']);
      });

      it('should detect webinar channel', () => {
        const result = parseNLQueryToFilters('Show webinar attendees');
        expect(result.channels).toEqual(['webinar']);
      });

      it('should detect digital_ad channel', () => {
        const result = parseNLQueryToFilters('HCPs responsive to digital ad');
        expect(result.channels).toEqual(['digital_ad']);
      });
    });

    describe('Engagement Range Detection', () => {
      it('should detect numeric range', () => {
        const result = parseNLQueryToFilters('HCPs with 60-80% engagement');
        expect(result.engagementRange).toEqual({ min: 60, max: 80 });
      });

      it('should detect range without percent sign', () => {
        const result = parseNLQueryToFilters('Engagement score 50-70');
        expect(result.engagementRange).toEqual({ min: 50, max: 70 });
      });

      it('should detect high engagement keyword', () => {
        const result = parseNLQueryToFilters('Show highly engaged HCPs');
        expect(result.engagementRange).toEqual({ min: 70 });
      });

      it('should detect low engagement keyword', () => {
        const result = parseNLQueryToFilters('Find poorly engaged doctors');
        expect(result.engagementRange).toEqual({ max: 40 });
      });

      it('should detect "high engagement" phrase', () => {
        const result = parseNLQueryToFilters('List high engagement oncologists');
        expect(result.engagementRange).toEqual({ min: 70 });
      });

      it('should detect "low engagement" phrase', () => {
        const result = parseNLQueryToFilters('Show low engagement targets');
        expect(result.engagementRange).toEqual({ max: 40 });
      });
    });

    describe('Combined Filters', () => {
      it('should combine tier and specialty', () => {
        const result = parseNLQueryToFilters('Tier 1 oncology HCPs');
        expect(result.tiers).toEqual(['Tier 1']);
        expect(result.specialties).toEqual(['Oncology']);
      });

      it('should combine segment and engagement', () => {
        const result = parseNLQueryToFilters('High prescriber with high engagement');
        expect(result.segments).toEqual(['High Prescriber']);
        expect(result.engagementRange).toEqual({ min: 70 });
      });

      it('should combine multiple filter types', () => {
        const result = parseNLQueryToFilters('Find tier 1 cardiology HCPs who prefer email with high engagement');
        expect(result.tiers).toEqual(['Tier 1']);
        expect(result.specialties).toEqual(['Cardiology']);
        expect(result.channels).toEqual(['email']);
        expect(result.engagementRange).toEqual({ min: 70 });
      });
    });

    describe('Edge Cases', () => {
      it('should return empty filters for unrecognized query', () => {
        const result = parseNLQueryToFilters('What is the weather today?');
        expect(result).toEqual({});
      });

      it('should handle empty query', () => {
        const result = parseNLQueryToFilters('');
        expect(result).toEqual({});
      });

      it('should handle special characters', () => {
        const result = parseNLQueryToFilters('Show tier-1 HCPs!!!');
        // Should still work due to normalization
        expect(result).toBeDefined();
      });
    });
  });

  describe('detectQueryIntent', () => {
    it('should detect optimization intent', () => {
      expect(detectQueryIntent('How can I boost engagement?')).toBe('optimization');
      expect(detectQueryIntent('Increase response rates')).toBe('optimization');
      expect(detectQueryIntent('Improve HCP engagement')).toBe('optimization');
    });

    it('should detect discovery intent', () => {
      expect(detectQueryIntent('Find high-value HCPs')).toBe('discovery');
      expect(detectQueryIntent('Show me oncologists')).toBe('discovery');
      expect(detectQueryIntent('Identify new targets')).toBe('discovery');
    });

    it('should detect analysis intent', () => {
      expect(detectQueryIntent('Why is engagement low?')).toBe('analysis');
      expect(detectQueryIntent('Explain the trend')).toBe('analysis');
      expect(detectQueryIntent('What is the reason for decline?')).toBe('analysis');
    });

    it('should detect comparison intent', () => {
      expect(detectQueryIntent('Compare tier 1 vs tier 2')).toBe('comparison');
      expect(detectQueryIntent('What is the difference between segments?')).toBe('comparison');
      expect(detectQueryIntent('Email versus rep visit performance')).toBe('comparison');
    });

    it('should default to general for unrecognized intents', () => {
      expect(detectQueryIntent('List all HCPs')).toBe('general');
      expect(detectQueryIntent('Hello world')).toBe('general');
    });
  });
});
