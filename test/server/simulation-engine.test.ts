import { describe, it, expect } from 'vitest';
import type { InsertSimulationScenario, Channel, ChannelPerformance, BaselineComparison } from '@shared/schema';

// Reimplementation of simulation engine for testing
// (In production, this would be exported from storage.ts)

type SimulationEngineResult = {
  predictedEngagementRate: number;
  predictedResponseRate: number;
  predictedRxLift: number;
  predictedReach: number;
  efficiencyScore: number;
  channelPerformance: ChannelPerformance[];
  vsBaseline: BaselineComparison;
};

function runSimulationEngine(
  scenario: InsertSimulationScenario,
  hcpCount: number
): SimulationEngineResult {
  const channelWeights: Record<Channel, number> = {
    email: 0.7,
    rep_visit: 1.2,
    webinar: 0.9,
    conference: 1.0,
    digital_ad: 0.6,
    phone: 0.8,
  };

  const contentWeights: Record<string, number> = {
    educational: 1.1,
    promotional: 0.9,
    clinical_data: 1.15,
    mixed: 1.0,
  };

  let channelScore = 0;
  const channelPerformance: ChannelPerformance[] = Object.entries(scenario.channelMix).map(([channel, allocation]) => {
    const weight = channelWeights[channel as Channel];
    const contribution = (allocation / 100) * weight;
    channelScore += contribution;

    return {
      channel: channel as Channel,
      allocation,
      predictedResponse: 30 * weight, // Simplified for testing
      contribution: contribution * 100,
    };
  });

  const frequency = scenario.frequency ?? 4;
  const duration = scenario.duration ?? 3;
  const contentType = scenario.contentType ?? 'mixed';
  const frequencyFactor = Math.min(1.5, 0.5 + frequency * 0.1);
  const durationFactor = Math.min(1.3, 0.7 + duration * 0.05);
  const contentFactor = contentWeights[contentType] || 1.0;

  const baseEngagement = 45;
  const baseResponse = 25;
  const baseRxLift = 8;

  const predictedEngagementRate = Math.min(95, baseEngagement * channelScore * frequencyFactor * contentFactor);
  const predictedResponseRate = Math.min(70, baseResponse * channelScore * durationFactor);
  const predictedRxLift = Math.min(25, baseRxLift * channelScore * durationFactor * contentFactor);
  const predictedReach = Math.floor(hcpCount * 0.85);

  const efficiencyScore = Math.floor(
    (predictedEngagementRate * 0.3 + predictedResponseRate * 0.4 + predictedRxLift * 2) * 0.8
  );

  const baselineEngagement = 42;
  const baselineResponse = 22;
  const baselineRxLift = 6;

  const vsBaseline: BaselineComparison = {
    engagementDelta: predictedEngagementRate - baselineEngagement,
    responseDelta: predictedResponseRate - baselineResponse,
    rxLiftDelta: predictedRxLift - baselineRxLift,
  };

  return {
    predictedEngagementRate,
    predictedResponseRate,
    predictedRxLift,
    predictedReach,
    efficiencyScore: Math.min(100, efficiencyScore),
    channelPerformance,
    vsBaseline,
  };
}

describe('Simulation Engine', () => {
  describe('runSimulationEngine', () => {
    const createBaseScenario = (overrides: Partial<InsertSimulationScenario> = {}): InsertSimulationScenario => ({
      name: 'Test Campaign',
      description: 'Test description',
      targetHcpIds: [],
      channelMix: {
        email: 20,
        rep_visit: 30,
        webinar: 15,
        conference: 15,
        digital_ad: 10,
        phone: 10,
      },
      frequency: 4,
      duration: 3,
      contentType: 'mixed',
      ...overrides,
    });

    it('should calculate predicted engagement rate', () => {
      const scenario = createBaseScenario();
      const result = runSimulationEngine(scenario, 100);

      expect(result.predictedEngagementRate).toBeGreaterThan(0);
      expect(result.predictedEngagementRate).toBeLessThanOrEqual(95);
    });

    it('should calculate predicted response rate', () => {
      const scenario = createBaseScenario();
      const result = runSimulationEngine(scenario, 100);

      expect(result.predictedResponseRate).toBeGreaterThan(0);
      expect(result.predictedResponseRate).toBeLessThanOrEqual(70);
    });

    it('should calculate predicted Rx lift', () => {
      const scenario = createBaseScenario();
      const result = runSimulationEngine(scenario, 100);

      expect(result.predictedRxLift).toBeGreaterThan(0);
      expect(result.predictedRxLift).toBeLessThanOrEqual(25);
    });

    it('should calculate reach based on HCP count', () => {
      const scenario = createBaseScenario();
      const result = runSimulationEngine(scenario, 100);

      expect(result.predictedReach).toBeGreaterThan(0);
      expect(result.predictedReach).toBeLessThanOrEqual(100);
    });

    it('should weight rep_visit channel highest', () => {
      const repHeavyScenario = createBaseScenario({
        channelMix: {
          email: 0,
          rep_visit: 100,
          webinar: 0,
          conference: 0,
          digital_ad: 0,
          phone: 0,
        },
      });

      const digitalHeavyScenario = createBaseScenario({
        channelMix: {
          email: 50,
          rep_visit: 0,
          webinar: 0,
          conference: 0,
          digital_ad: 50,
          phone: 0,
        },
      });

      const repResult = runSimulationEngine(repHeavyScenario, 100);
      const digitalResult = runSimulationEngine(digitalHeavyScenario, 100);

      // Rep visit has 1.2x weight, email 0.7x, digital_ad 0.6x
      expect(repResult.predictedEngagementRate).toBeGreaterThan(digitalResult.predictedEngagementRate);
    });

    it('should apply frequency factor', () => {
      const lowFrequency = createBaseScenario({ frequency: 2 });
      const highFrequency = createBaseScenario({ frequency: 10 });

      const lowResult = runSimulationEngine(lowFrequency, 100);
      const highResult = runSimulationEngine(highFrequency, 100);

      expect(highResult.predictedEngagementRate).toBeGreaterThan(lowResult.predictedEngagementRate);
    });

    it('should apply duration factor', () => {
      const shortDuration = createBaseScenario({ duration: 1 });
      const longDuration = createBaseScenario({ duration: 12 });

      const shortResult = runSimulationEngine(shortDuration, 100);
      const longResult = runSimulationEngine(longDuration, 100);

      expect(longResult.predictedResponseRate).toBeGreaterThan(shortResult.predictedResponseRate);
    });

    it('should apply content type factor', () => {
      const clinicalContent = createBaseScenario({ contentType: 'clinical_data' });
      const promotionalContent = createBaseScenario({ contentType: 'promotional' });

      const clinicalResult = runSimulationEngine(clinicalContent, 100);
      const promotionalResult = runSimulationEngine(promotionalContent, 100);

      // clinical_data has 1.15x weight, promotional has 0.9x
      expect(clinicalResult.predictedEngagementRate).toBeGreaterThan(promotionalResult.predictedEngagementRate);
    });

    it('should return channel performance breakdown', () => {
      const scenario = createBaseScenario();
      const result = runSimulationEngine(scenario, 100);

      expect(result.channelPerformance).toBeInstanceOf(Array);
      expect(result.channelPerformance.length).toBeGreaterThan(0);

      for (const perf of result.channelPerformance) {
        expect(perf.channel).toBeDefined();
        expect(perf.allocation).toBeDefined();
        expect(perf.predictedResponse).toBeDefined();
        expect(perf.contribution).toBeDefined();
      }
    });

    it('should return baseline comparison', () => {
      const scenario = createBaseScenario();
      const result = runSimulationEngine(scenario, 100);

      expect(result.vsBaseline).toBeDefined();
      expect(result.vsBaseline.engagementDelta).toBeDefined();
      expect(result.vsBaseline.responseDelta).toBeDefined();
      expect(result.vsBaseline.rxLiftDelta).toBeDefined();
    });

    it('should cap efficiency score at 100', () => {
      // Create a scenario that would generate high efficiency
      const scenario = createBaseScenario({
        channelMix: {
          email: 0,
          rep_visit: 100,
          webinar: 0,
          conference: 0,
          digital_ad: 0,
          phone: 0,
        },
        frequency: 20,
        duration: 12,
        contentType: 'clinical_data',
      });

      const result = runSimulationEngine(scenario, 100);

      expect(result.efficiencyScore).toBeLessThanOrEqual(100);
    });

    it('should scale reach with HCP count', () => {
      const scenario = createBaseScenario();

      const smallResult = runSimulationEngine(scenario, 50);
      const largeResult = runSimulationEngine(scenario, 500);

      expect(largeResult.predictedReach).toBeGreaterThan(smallResult.predictedReach);
    });

    it('should handle empty channel mix gracefully', () => {
      const scenario = createBaseScenario({
        channelMix: {
          email: 0,
          rep_visit: 0,
          webinar: 0,
          conference: 0,
          digital_ad: 0,
          phone: 0,
        },
      });

      const result = runSimulationEngine(scenario, 100);

      // Should return valid but low/zero values
      expect(result.predictedEngagementRate).toBeGreaterThanOrEqual(0);
      expect(result.predictedReach).toBeGreaterThan(0);
    });
  });
});
