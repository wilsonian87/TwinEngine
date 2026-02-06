import { describe, it, expect } from 'vitest';
import {
  hcpFilterSchema,
  insertSimulationScenarioSchema,
  createStimuliRequestSchema,
  createCounterfactualRequestSchema,
  nlQueryRequestSchema,
  recordOutcomeRequestSchema,
  runEvaluationRequestSchema,
  channels,
  specialties,
  tiers,
  segments,
  stimulusTypes,
} from '@shared/schema';

describe('Schema Validation', () => {
  describe('Constants', () => {
    it('should define valid channels', () => {
      expect(channels).toContain('email');
      expect(channels).toContain('rep_visit');
      expect(channels).toContain('webinar');
      expect(channels).toContain('conference');
      expect(channels).toContain('digital_ad');
      expect(channels).toContain('phone');
      expect(channels.length).toBe(6);
    });

    it('should define valid specialties', () => {
      expect(specialties).toContain('Oncology');
      expect(specialties).toContain('Cardiology');
      expect(specialties).toContain('Neurology');
      expect(specialties.length).toBe(10);
    });

    it('should define valid tiers', () => {
      expect(tiers).toContain('Tier 1');
      expect(tiers).toContain('Tier 2');
      expect(tiers).toContain('Tier 3');
      expect(tiers.length).toBe(3);
    });

    it('should define valid segments', () => {
      expect(segments).toContain('High Prescriber');
      expect(segments).toContain('Growth Potential');
      expect(segments).toContain('New Target');
      expect(segments.length).toBe(6);
    });

    it('should define valid stimulus types', () => {
      expect(stimulusTypes).toContain('rep_visit');
      expect(stimulusTypes).toContain('email_send');
      expect(stimulusTypes).toContain('webinar_attend');
      expect(stimulusTypes.length).toBe(12);
    });
  });

  describe('hcpFilterSchema', () => {
    it('should validate valid filter with all fields', () => {
      const validFilter = {
        search: 'John',
        specialties: ['Oncology', 'Cardiology'],
        tiers: ['Tier 1'],
        segments: ['High Prescriber'],
        minEngagementScore: 50,
        maxEngagementScore: 90,
        channelPreference: 'email',
        states: ['NY', 'CA'],
      };

      const result = hcpFilterSchema.safeParse(validFilter);
      expect(result.success).toBe(true);
    });

    it('should validate empty filter', () => {
      const result = hcpFilterSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject invalid specialty', () => {
      const invalidFilter = {
        specialties: ['InvalidSpecialty'],
      };

      const result = hcpFilterSchema.safeParse(invalidFilter);
      expect(result.success).toBe(false);
    });

    it('should reject invalid tier', () => {
      const invalidFilter = {
        tiers: ['Tier 4'],
      };

      const result = hcpFilterSchema.safeParse(invalidFilter);
      expect(result.success).toBe(false);
    });

    it('should reject invalid channel preference', () => {
      const invalidFilter = {
        channelPreferences: ['smoke_signal'],
      };

      const result = hcpFilterSchema.safeParse(invalidFilter);
      expect(result.success).toBe(false);
    });
  });

  describe('insertSimulationScenarioSchema', () => {
    it('should validate valid simulation scenario', () => {
      const validScenario = {
        name: 'Test Campaign',
        description: 'A test campaign',
        targetHcpIds: ['hcp-1', 'hcp-2'],
        channelMix: {
          email: 30,
          rep_visit: 40,
          webinar: 10,
          conference: 10,
          digital_ad: 5,
          phone: 5,
        },
        frequency: 4,
        duration: 3,
        contentType: 'educational',
      };

      const result = insertSimulationScenarioSchema.safeParse(validScenario);
      expect(result.success).toBe(true);
    });

    it('should require name', () => {
      const invalidScenario = {
        targetHcpIds: [],
        channelMix: { email: 100 },
        frequency: 4,
        duration: 3,
        contentType: 'mixed',
      };

      const result = insertSimulationScenarioSchema.safeParse(invalidScenario);
      expect(result.success).toBe(false);
    });

    it('should accept valid content types', () => {
      // Note: insertSimulationScenarioSchema uses Drizzle's auto-generated schema
      // which may be more lenient. This test validates that valid types work.
      const validTypes = ['educational', 'promotional', 'clinical_data', 'mixed'];

      for (const contentType of validTypes) {
        const scenario = {
          name: 'Test',
          targetHcpIds: [],
          channelMix: { email: 100 },
          frequency: 4,
          duration: 3,
          contentType,
        };

        const result = insertSimulationScenarioSchema.safeParse(scenario);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('createStimuliRequestSchema', () => {
    it('should validate valid stimuli request', () => {
      const validRequest = {
        hcpId: 'hcp-123',
        stimulusType: 'rep_visit',
        channel: 'rep_visit',
        contentType: 'educational',
        callToAction: 'Learn more about patient outcomes',
      };

      const result = createStimuliRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should require hcpId', () => {
      const invalidRequest = {
        stimulusType: 'email_send',
        channel: 'email',
      };

      const result = createStimuliRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should validate stimulus type enum', () => {
      const invalidRequest = {
        hcpId: 'hcp-123',
        stimulusType: 'invalid_stimulus',
        channel: 'email',
      };

      const result = createStimuliRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should validate channel enum', () => {
      const invalidRequest = {
        hcpId: 'hcp-123',
        stimulusType: 'email_send',
        channel: 'invalid_channel',
      };

      const result = createStimuliRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should allow optional fields', () => {
      const minimalRequest = {
        hcpId: 'hcp-123',
        stimulusType: 'email_send',
        channel: 'email',
      };

      const result = createStimuliRequestSchema.safeParse(minimalRequest);
      expect(result.success).toBe(true);
    });
  });

  describe('createCounterfactualRequestSchema', () => {
    it('should validate valid counterfactual request', () => {
      const validRequest = {
        name: 'What-if Analysis',
        description: 'Testing different channel mix',
        targetHcpIds: ['hcp-1', 'hcp-2'],
        changedVariables: [
          {
            variableName: 'channel_mix',
            variableType: 'channel_mix',
            originalValue: { email: 30, rep_visit: 70 },
            counterfactualValue: { email: 50, rep_visit: 50 },
          },
        ],
        analysisType: 'aggregate',
      };

      const result = createCounterfactualRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should require name', () => {
      const invalidRequest = {
        targetHcpIds: [],
        changedVariables: [],
      };

      const result = createCounterfactualRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should validate analysis type enum', () => {
      const invalidRequest = {
        name: 'Test',
        targetHcpIds: [],
        changedVariables: [],
        analysisType: 'invalid_type',
      };

      const result = createCounterfactualRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('nlQueryRequestSchema', () => {
    it('should validate valid NL query', () => {
      const validRequest = {
        query: 'Find high engagement oncologists in NY',
        includeRecommendations: true,
        maxResults: 20,
      };

      const result = nlQueryRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should require minimum query length', () => {
      const invalidRequest = {
        query: 'Hi',
      };

      const result = nlQueryRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should enforce maximum query length', () => {
      const invalidRequest = {
        query: 'a'.repeat(501),
      };

      const result = nlQueryRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should validate maxResults range', () => {
      const invalidRequest = {
        query: 'Find HCPs',
        maxResults: 150, // Max is 100
      };

      const result = nlQueryRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('recordOutcomeRequestSchema', () => {
    it('should validate valid outcome request', () => {
      const validRequest = {
        stimuliEventId: 'event-123',
        actualEngagementDelta: 5.5,
        actualConversionDelta: 2.1,
      };

      const result = recordOutcomeRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should require stimuliEventId', () => {
      const invalidRequest = {
        actualEngagementDelta: 5.5,
      };

      const result = recordOutcomeRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should allow optional actualConversionDelta', () => {
      const validRequest = {
        stimuliEventId: 'event-123',
        actualEngagementDelta: 5.5,
      };

      const result = recordOutcomeRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });
  });

  describe('runEvaluationRequestSchema', () => {
    it('should validate valid evaluation request', () => {
      const validRequest = {
        predictionType: 'stimuli_impact',
        periodStart: '2024-01-01',
        periodEnd: '2024-12-31',
      };

      const result = runEvaluationRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should validate prediction type enum', () => {
      const invalidRequest = {
        predictionType: 'invalid_type',
      };

      const result = runEvaluationRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should accept all valid prediction types', () => {
      const validTypes = ['stimuli_impact', 'counterfactual', 'conversion', 'engagement'];

      for (const type of validTypes) {
        const result = runEvaluationRequestSchema.safeParse({ predictionType: type });
        expect(result.success).toBe(true);
      }
    });
  });
});
