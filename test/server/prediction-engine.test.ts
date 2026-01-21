import { describe, it, expect } from 'vitest';
import type { HCPProfile, Channel, StimulusType, InsertSimulationScenario } from '@shared/schema';
import {
  predictStimuliImpact,
  calculateSimilarityScore,
  runSimulationEngine,
  runCounterfactualAnalysis,
} from '../../server/services/prediction-engine';

// Mock HCP for testing
const createMockHcp = (overrides: Partial<HCPProfile> = {}): HCPProfile => ({
  id: 'test-hcp-1',
  npi: '1234567890',
  firstName: 'John',
  lastName: 'Doe',
  specialty: 'Oncology',
  tier: 'Tier 1',
  segment: 'High Prescriber',
  organization: 'Test Hospital',
  city: 'New York',
  state: 'NY',
  overallEngagementScore: 75,
  channelPreference: 'email',
  channelEngagements: [
    { channel: 'email', score: 80, lastContact: '2 days ago', totalTouches: 15, responseRate: 45 },
    { channel: 'rep_visit', score: 65, lastContact: '1 week ago', totalTouches: 8, responseRate: 60 },
    { channel: 'webinar', score: 50, lastContact: null, totalTouches: 3, responseRate: 33 },
    { channel: 'conference', score: 40, lastContact: '1 month ago', totalTouches: 2, responseRate: 50 },
    { channel: 'digital_ad', score: 30, lastContact: '3 months ago', totalTouches: 20, responseRate: 15 },
    { channel: 'phone', score: 55, lastContact: '2 weeks ago', totalTouches: 5, responseRate: 40 },
  ],
  monthlyRxVolume: 45,
  yearlyRxVolume: 540,
  marketSharePct: 22.5,
  prescribingTrend: [
    { month: 'Jul', rxCount: 42, marketShare: 21 },
    { month: 'Aug', rxCount: 45, marketShare: 22 },
    { month: 'Sep', rxCount: 48, marketShare: 23 },
    { month: 'Oct', rxCount: 44, marketShare: 22 },
    { month: 'Nov', rxCount: 46, marketShare: 23 },
    { month: 'Dec', rxCount: 45, marketShare: 22.5 },
  ],
  conversionLikelihood: 68,
  churnRisk: 15,
  lastUpdated: new Date().toISOString(),
  ...overrides,
});

// Using imported functions from prediction-engine.ts

describe('Prediction Engine', () => {
  describe('predictStimuliImpact', () => {
    it('should calculate base impact for rep_visit stimulus', () => {
      const hcp = createMockHcp();
      const result = predictStimuliImpact(hcp, 'rep_visit', 'rep_visit');

      expect(result.engagementDelta).toBeGreaterThan(0);
      expect(result.conversionDelta).toBeGreaterThan(0);
      expect(result.confidenceLower).toBeLessThan(result.engagementDelta);
      expect(result.confidenceUpper).toBeGreaterThan(result.engagementDelta);
    });

    it('should apply channel affinity modifier when channel matches preference', () => {
      const hcp = createMockHcp({ channelPreference: 'email' });

      const matchingChannel = predictStimuliImpact(hcp, 'email_click', 'email');
      const nonMatchingChannel = predictStimuliImpact(hcp, 'email_click', 'phone');

      // Matching channel should have higher impact (1.3x vs 0.9x modifier)
      expect(matchingChannel.engagementDelta).toBeGreaterThan(nonMatchingChannel.engagementDelta);
    });

    it('should apply tier modifier - Tier 1 should have highest impact', () => {
      const tier1Hcp = createMockHcp({ tier: 'Tier 1' });
      const tier2Hcp = createMockHcp({ tier: 'Tier 2' });
      const tier3Hcp = createMockHcp({ tier: 'Tier 3' });

      const tier1Result = predictStimuliImpact(tier1Hcp, 'rep_visit', 'rep_visit');
      const tier2Result = predictStimuliImpact(tier2Hcp, 'rep_visit', 'rep_visit');
      const tier3Result = predictStimuliImpact(tier3Hcp, 'rep_visit', 'rep_visit');

      expect(tier1Result.engagementDelta).toBeGreaterThan(tier2Result.engagementDelta);
      expect(tier2Result.engagementDelta).toBeGreaterThan(tier3Result.engagementDelta);
    });

    it('should apply engagement score modifier', () => {
      const highEngagementHcp = createMockHcp({ overallEngagementScore: 90 });
      const lowEngagementHcp = createMockHcp({ overallEngagementScore: 30 });

      const highResult = predictStimuliImpact(highEngagementHcp, 'webinar_attend', 'webinar');
      const lowResult = predictStimuliImpact(lowEngagementHcp, 'webinar_attend', 'webinar');

      expect(highResult.engagementDelta).toBeGreaterThan(lowResult.engagementDelta);
    });

    it('should apply content type modifier', () => {
      const hcp = createMockHcp();

      const clinicalResult = predictStimuliImpact(hcp, 'email_click', 'email', 'clinical_data');
      const promotionalResult = predictStimuliImpact(hcp, 'email_click', 'email', 'promotional');

      // Clinical data has 1.15x modifier, promotional has 0.95x
      expect(clinicalResult.engagementDelta).toBeGreaterThan(promotionalResult.engagementDelta);
    });

    it('should apply CTA modifier for savings-related CTAs', () => {
      const hcp = createMockHcp();

      const savingsResult = predictStimuliImpact(hcp, 'email_click', 'email', undefined, 'Save on patient costs');
      const genericResult = predictStimuliImpact(hcp, 'email_click', 'email', undefined, 'Contact us today');

      expect(savingsResult.engagementDelta).toBeGreaterThan(genericResult.engagementDelta);
    });

    it('should return confidence intervals', () => {
      const hcp = createMockHcp();
      const result = predictStimuliImpact(hcp, 'conference_meeting', 'conference');

      expect(result.confidenceLower).toBeDefined();
      expect(result.confidenceUpper).toBeDefined();
      expect(result.confidenceLower).toBeLessThan(result.confidenceUpper);
      expect(result.engagementDelta).toBeGreaterThanOrEqual(result.confidenceLower);
      expect(result.engagementDelta).toBeLessThanOrEqual(result.confidenceUpper);
    });

    it('should handle all stimulus types', () => {
      const hcp = createMockHcp();
      const stimulusTypes: StimulusType[] = [
        'rep_visit', 'email_send', 'email_open', 'email_click',
        'webinar_invite', 'webinar_attend', 'conference_meeting',
        'phone_call', 'digital_ad_impression', 'digital_ad_click',
        'sample_delivery', 'content_download',
      ];

      for (const stimulus of stimulusTypes) {
        const result = predictStimuliImpact(hcp, stimulus, 'email');
        expect(result.engagementDelta).toBeGreaterThan(0);
        expect(result.conversionDelta).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('calculateSimilarityScore', () => {
    it('should give maximum score for identical HCPs', () => {
      const hcp1 = createMockHcp();
      const hcp2 = createMockHcp();

      const score = calculateSimilarityScore(hcp1, hcp2);

      // Max possible: 30 (specialty) + 20 (tier) + 20 (segment) + 15 (engagement) + 10 (rx) + 5 (channel) = 100
      expect(score).toBeGreaterThanOrEqual(95); // Allow for minor float differences
    });

    it('should give high score for same specialty', () => {
      const hcp1 = createMockHcp({ specialty: 'Oncology' });
      const hcp2 = createMockHcp({ specialty: 'Oncology' });
      const hcp3 = createMockHcp({ specialty: 'Cardiology' });

      const sameSpecialtyScore = calculateSimilarityScore(hcp1, hcp2);
      const diffSpecialtyScore = calculateSimilarityScore(hcp1, hcp3);

      expect(sameSpecialtyScore).toBeGreaterThan(diffSpecialtyScore);
    });

    it('should give high score for same tier', () => {
      const hcp1 = createMockHcp({ tier: 'Tier 1' });
      const hcp2 = createMockHcp({ tier: 'Tier 1' });
      const hcp3 = createMockHcp({ tier: 'Tier 3' });

      const sameTierScore = calculateSimilarityScore(hcp1, hcp2);
      const diffTierScore = calculateSimilarityScore(hcp1, hcp3);

      expect(sameTierScore).toBeGreaterThan(diffTierScore);
    });

    it('should penalize large engagement score differences', () => {
      const hcp1 = createMockHcp({ overallEngagementScore: 80 });
      const hcp2Close = createMockHcp({ overallEngagementScore: 85 });
      const hcp2Far = createMockHcp({ overallEngagementScore: 30 });

      const closeScore = calculateSimilarityScore(hcp1, hcp2Close);
      const farScore = calculateSimilarityScore(hcp1, hcp2Far);

      expect(closeScore).toBeGreaterThan(farScore);
    });

    it('should consider Rx volume similarity', () => {
      const hcp1 = createMockHcp({ monthlyRxVolume: 50 });
      const hcp2Similar = createMockHcp({ monthlyRxVolume: 48 });
      const hcp2Different = createMockHcp({ monthlyRxVolume: 10 });

      const similarRxScore = calculateSimilarityScore(hcp1, hcp2Similar);
      const differentRxScore = calculateSimilarityScore(hcp1, hcp2Different);

      expect(similarRxScore).toBeGreaterThan(differentRxScore);
    });

    it('should give bonus for same channel preference', () => {
      const hcp1 = createMockHcp({ channelPreference: 'email' });
      const hcp2Same = createMockHcp({ channelPreference: 'email' });
      const hcp2Diff = createMockHcp({ channelPreference: 'phone' });

      const sameChannelScore = calculateSimilarityScore(hcp1, hcp2Same);
      const diffChannelScore = calculateSimilarityScore(hcp1, hcp2Diff);

      expect(sameChannelScore).toBeGreaterThan(diffChannelScore);
    });

    it('should return a reasonable range of scores', () => {
      const hcp1 = createMockHcp({
        specialty: 'Oncology',
        tier: 'Tier 1',
        segment: 'High Prescriber',
        overallEngagementScore: 80,
        monthlyRxVolume: 50,
        channelPreference: 'email',
      });

      const hcpVeryDifferent = createMockHcp({
        specialty: 'Dermatology',
        tier: 'Tier 3',
        segment: 'New Target',
        overallEngagementScore: 20,
        monthlyRxVolume: 10,
        channelPreference: 'phone',
      });

      const score = calculateSimilarityScore(hcp1, hcpVeryDifferent);

      // Should be low but positive
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(50);
    });
  });

  describe('runSimulationEngine', () => {
    it('should return simulation results with required properties', () => {
      const scenario: InsertSimulationScenario = {
        name: 'Test Campaign',
        channelMix: {
          email: 30,
          rep_visit: 40,
          webinar: 15,
          conference: 5,
          digital_ad: 5,
          phone: 5,
        },
        frequency: 4,
        duration: 3,
        contentType: 'educational',
      };

      const result = runSimulationEngine(scenario, 100);

      expect(result).toHaveProperty('predictedEngagementRate');
      expect(result).toHaveProperty('predictedResponseRate');
      expect(result).toHaveProperty('predictedRxLift');
      expect(result).toHaveProperty('predictedReach');
      expect(result).toHaveProperty('efficiencyScore');
      expect(result).toHaveProperty('channelPerformance');
      expect(result).toHaveProperty('vsBaseline');
    });

    it('should return realistic rate values', () => {
      const scenario: InsertSimulationScenario = {
        name: 'Test Campaign',
        channelMix: {
          email: 20,
          rep_visit: 30,
          webinar: 20,
          conference: 10,
          digital_ad: 10,
          phone: 10,
        },
        frequency: 4,
        duration: 3,
        contentType: 'clinical_data',
      };

      const result = runSimulationEngine(scenario, 100);

      expect(result.predictedEngagementRate).toBeGreaterThan(0);
      expect(result.predictedEngagementRate).toBeLessThanOrEqual(95);
      expect(result.predictedResponseRate).toBeGreaterThan(0);
      expect(result.predictedResponseRate).toBeLessThanOrEqual(70);
      expect(result.predictedRxLift).toBeGreaterThan(0);
      expect(result.predictedRxLift).toBeLessThanOrEqual(25);
      expect(result.efficiencyScore).toBeGreaterThan(0);
      expect(result.efficiencyScore).toBeLessThanOrEqual(100);
    });

    it('should calculate predicted reach based on HCP count', () => {
      const scenario: InsertSimulationScenario = {
        name: 'Test Campaign',
        channelMix: { email: 50, rep_visit: 50, webinar: 0, conference: 0, digital_ad: 0, phone: 0 },
        frequency: 2,
        duration: 2,
        contentType: 'mixed',
      };

      const result = runSimulationEngine(scenario, 500);

      expect(result.predictedReach).toBeGreaterThan(0);
      expect(result.predictedReach).toBeLessThanOrEqual(500);
    });

    it('should generate channel performance for each channel in mix', () => {
      const scenario: InsertSimulationScenario = {
        name: 'Test Campaign',
        channelMix: {
          email: 30,
          rep_visit: 40,
          webinar: 15,
          conference: 5,
          digital_ad: 5,
          phone: 5,
        },
        frequency: 4,
        duration: 3,
        contentType: 'educational',
      };

      const result = runSimulationEngine(scenario, 100);

      expect(result.channelPerformance).toHaveLength(6);
      result.channelPerformance.forEach(cp => {
        expect(cp).toHaveProperty('channel');
        expect(cp).toHaveProperty('allocation');
        expect(cp).toHaveProperty('predictedResponse');
        expect(cp).toHaveProperty('contribution');
      });
    });

    it('should calculate baseline comparison', () => {
      const scenario: InsertSimulationScenario = {
        name: 'Test Campaign',
        channelMix: { email: 50, rep_visit: 50, webinar: 0, conference: 0, digital_ad: 0, phone: 0 },
        frequency: 4,
        duration: 3,
        contentType: 'clinical_data',
      };

      const result = runSimulationEngine(scenario, 100);

      expect(result.vsBaseline).toHaveProperty('engagementDelta');
      expect(result.vsBaseline).toHaveProperty('responseDelta');
      expect(result.vsBaseline).toHaveProperty('rxLiftDelta');
      expect(typeof result.vsBaseline.engagementDelta).toBe('number');
    });

    it('should handle different content types', () => {
      const baseScenario = {
        name: 'Test Campaign',
        channelMix: { email: 50, rep_visit: 50, webinar: 0, conference: 0, digital_ad: 0, phone: 0 },
        frequency: 4,
        duration: 3,
      };

      const clinicalResult = runSimulationEngine({ ...baseScenario, contentType: 'clinical_data' as const }, 100);
      const promotionalResult = runSimulationEngine({ ...baseScenario, contentType: 'promotional' as const }, 100);

      // Both should return valid results
      expect(clinicalResult.predictedEngagementRate).toBeGreaterThan(0);
      expect(promotionalResult.predictedEngagementRate).toBeGreaterThan(0);
    });

    it('should handle varying frequency values', () => {
      const baseScenario = {
        name: 'Test Campaign',
        channelMix: { email: 50, rep_visit: 50, webinar: 0, conference: 0, digital_ad: 0, phone: 0 },
        duration: 3,
        contentType: 'mixed' as const,
      };

      const lowFreq = runSimulationEngine({ ...baseScenario, frequency: 1 }, 100);
      const highFreq = runSimulationEngine({ ...baseScenario, frequency: 8 }, 100);

      // Both should return valid results
      expect(lowFreq.predictedEngagementRate).toBeGreaterThan(0);
      expect(highFreq.predictedEngagementRate).toBeGreaterThan(0);
    });
  });

  describe('runCounterfactualAnalysis', () => {
    it('should return counterfactual analysis results', () => {
      const hcps = [createMockHcp(), createMockHcp({ id: 'hcp-2', npi: '2222222222' })];
      const changedVariables = [
        {
          variableName: 'CTA',
          variableType: 'call_to_action' as const,
          originalValue: 'Learn More',
          counterfactualValue: 'Save on patient costs',
        },
      ];

      const result = runCounterfactualAnalysis(hcps, changedVariables, 'aggregate');

      expect(result).toHaveProperty('baselineOutcome');
      expect(result).toHaveProperty('counterfactualOutcome');
      expect(result).toHaveProperty('upliftDelta');
      expect(result).toHaveProperty('confidenceInterval');
    });

    it('should calculate baseline from HCP data', () => {
      const hcps = [
        createMockHcp({ overallEngagementScore: 70, conversionLikelihood: 60 }),
        createMockHcp({ id: 'hcp-2', npi: '2222222222', overallEngagementScore: 80, conversionLikelihood: 70 }),
      ];
      const changedVariables = [
        {
          variableName: 'Frequency',
          variableType: 'frequency' as const,
          originalValue: 4,
          counterfactualValue: 6,
        },
      ];

      const result = runCounterfactualAnalysis(hcps, changedVariables, 'aggregate');

      expect(result.baselineOutcome.engagementRate).toBeCloseTo(75, 0); // Average of 70 and 80
      expect(result.baselineOutcome.conversionRate).toBeCloseTo(65, 0); // Average of 60 and 70
    });

    it('should apply CTA variable changes', () => {
      const hcps = [createMockHcp()];
      const changedVariables = [
        {
          variableName: 'CTA',
          variableType: 'call_to_action' as const,
          originalValue: 'Click here',
          counterfactualValue: 'Save on patient outcomes',
        },
      ];

      const result = runCounterfactualAnalysis(hcps, changedVariables, 'aggregate');

      // Patient-related CTA should improve response and conversion
      expect(result.upliftDelta.responseDelta).toBeGreaterThan(0);
    });

    it('should apply channel mix variable changes', () => {
      const hcps = [createMockHcp()];
      const changedVariables = [
        {
          variableName: 'Channel Mix',
          variableType: 'channel_mix' as const,
          originalValue: { rep_visit: 20, email: 80 },
          counterfactualValue: { rep_visit: 50, email: 50 },
        },
      ];

      const result = runCounterfactualAnalysis(hcps, changedVariables, 'aggregate');

      expect(result).toHaveProperty('upliftDelta');
      expect(result.upliftDelta).toHaveProperty('engagementDelta');
    });

    it('should apply content type variable changes', () => {
      const hcps = [createMockHcp()];
      const changedVariables = [
        {
          variableName: 'Content',
          variableType: 'content_type' as const,
          originalValue: 'promotional',
          counterfactualValue: 'clinical_data',
        },
      ];

      const result = runCounterfactualAnalysis(hcps, changedVariables, 'aggregate');

      // Clinical data should improve response
      expect(result.upliftDelta.responseDelta).toBeGreaterThan(0);
    });

    it('should calculate confidence interval', () => {
      const hcps = [createMockHcp()];
      const changedVariables = [
        {
          variableName: 'Frequency',
          variableType: 'frequency' as const,
          originalValue: 2,
          counterfactualValue: 6,
        },
      ];

      const result = runCounterfactualAnalysis(hcps, changedVariables, 'aggregate');

      expect(result.confidenceInterval).toHaveProperty('lower');
      expect(result.confidenceInterval).toHaveProperty('upper');
      expect(result.confidenceInterval.lower).toBeLessThan(result.confidenceInterval.upper);
    });

    it('should handle individual analysis type', () => {
      const hcps = [
        createMockHcp({ id: 'hcp-1' }),
        createMockHcp({ id: 'hcp-2', npi: '2222222222' }),
      ];
      const changedVariables = [
        {
          variableName: 'Timing',
          variableType: 'timing' as const,
          originalValue: 'morning',
          counterfactualValue: 'afternoon',
        },
      ];

      const result = runCounterfactualAnalysis(hcps, changedVariables, 'individual');

      expect(result.hcpLevelResults).toBeDefined();
      if (result.hcpLevelResults) {
        expect(result.hcpLevelResults.length).toBeGreaterThan(0);
      }
    });

    it('should handle multiple variable changes', () => {
      const hcps = [createMockHcp()];
      const changedVariables = [
        {
          variableName: 'Frequency',
          variableType: 'frequency' as const,
          originalValue: 2,
          counterfactualValue: 4,
        },
        {
          variableName: 'Content',
          variableType: 'content_type' as const,
          originalValue: 'promotional',
          counterfactualValue: 'clinical_data',
        },
        {
          variableName: 'CTA',
          variableType: 'call_to_action' as const,
          originalValue: 'Learn more',
          counterfactualValue: 'Improve patient outcomes',
        },
      ];

      const result = runCounterfactualAnalysis(hcps, changedVariables, 'aggregate');

      expect(result.upliftDelta.percentageImprovement).toBeDefined();
      expect(typeof result.upliftDelta.percentageImprovement).toBe('number');
    });

    it('should handle budget variable changes', () => {
      const hcps = [createMockHcp()];
      const changedVariables = [
        {
          variableName: 'Budget',
          variableType: 'budget' as const,
          originalValue: 100000,
          counterfactualValue: 150000,
        },
      ];

      const result = runCounterfactualAnalysis(hcps, changedVariables, 'aggregate');

      // Increased budget should improve engagement
      expect(result.upliftDelta.engagementDelta).toBeGreaterThan(0);
    });
  });
});
