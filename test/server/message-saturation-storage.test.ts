/**
 * Message Saturation Storage Module Tests
 *
 * Phase 12B: Tests for MSI calculation logic and storage operations.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  calculateMsiComponents,
  calculateMsi,
  msiToRiskLevel,
  determineMsiDirection,
} from "../../server/storage/message-saturation-storage";
import type { MsiComponents } from "@shared/schema";

describe("Message Saturation Index (MSI) Calculation", () => {
  describe("calculateMsiComponents", () => {
    it("should calculate components for low saturation scenario", () => {
      // Low touch frequency, high diversity, no decay
      const components = calculateMsiComponents(5, 0.8, -5, "awareness");

      expect(components.frequencyComponent).toBeGreaterThanOrEqual(0);
      expect(components.frequencyComponent).toBeLessThanOrEqual(40);
      expect(components.diversityComponent).toBeGreaterThanOrEqual(0);
      expect(components.diversityComponent).toBeLessThanOrEqual(20);
      expect(components.decayComponent).toBeGreaterThanOrEqual(0);
      expect(components.decayComponent).toBeLessThanOrEqual(40);
      expect(components.stageModifier).toBe(0.7); // awareness stage
    });

    it("should calculate components for high saturation scenario", () => {
      // High touch frequency, low diversity, high decay
      const components = calculateMsiComponents(30, 0.1, 40, "loyalty");

      expect(components.frequencyComponent).toBeGreaterThan(20);
      expect(components.diversityComponent).toBeGreaterThan(15);
      expect(components.decayComponent).toBeGreaterThan(25);
      expect(components.stageModifier).toBe(1.1); // loyalty stage
    });

    it("should use default values for null inputs", () => {
      const components = calculateMsiComponents(10, null, null, null);

      expect(components.diversityComponent).toBe(10); // 0.5 diversity -> 10
      expect(components.decayComponent).toBe(20); // 0 decay -> 20
      expect(components.stageModifier).toBe(0.85); // consideration default
    });

    it("should respect stage-specific thresholds", () => {
      // Same touch frequency, different stages
      const awarenessComponents = calculateMsiComponents(15, 0.5, 0, "awareness");
      const loyaltyComponents = calculateMsiComponents(15, 0.5, 0, "loyalty");

      // Loyalty should have higher frequency component (lower threshold)
      expect(loyaltyComponents.frequencyComponent).toBeGreaterThan(
        awarenessComponents.frequencyComponent
      );
    });

    it("should cap components at their maximum values", () => {
      // Extreme values
      const components = calculateMsiComponents(100, 0, 100, "loyalty");

      expect(components.frequencyComponent).toBeLessThanOrEqual(40);
      expect(components.diversityComponent).toBeLessThanOrEqual(20);
      expect(components.decayComponent).toBeLessThanOrEqual(40);
    });
  });

  describe("calculateMsi", () => {
    it("should calculate MSI from components", () => {
      const components: MsiComponents = {
        frequencyComponent: 20,
        diversityComponent: 10,
        decayComponent: 20,
        stageModifier: 1.0,
      };

      const msi = calculateMsi(components);
      expect(msi).toBe(50); // 20 + 10 + 20 = 50
    });

    it("should apply stage modifier correctly", () => {
      const components: MsiComponents = {
        frequencyComponent: 20,
        diversityComponent: 10,
        decayComponent: 20,
        stageModifier: 0.7, // awareness
      };

      const msi = calculateMsi(components);
      expect(msi).toBe(35); // (20 + 10 + 20) * 0.7 = 35
    });

    it("should cap MSI at 100", () => {
      const components: MsiComponents = {
        frequencyComponent: 40,
        diversityComponent: 20,
        decayComponent: 40,
        stageModifier: 1.5, // would be 150 without cap
      };

      const msi = calculateMsi(components);
      expect(msi).toBe(100);
    });

    it("should not go below 0", () => {
      const components: MsiComponents = {
        frequencyComponent: 0,
        diversityComponent: 0,
        decayComponent: 0,
        stageModifier: 0.5,
      };

      const msi = calculateMsi(components);
      expect(msi).toBe(0);
    });
  });

  describe("msiToRiskLevel", () => {
    it("should return low for MSI 0-25", () => {
      expect(msiToRiskLevel(0)).toBe("low");
      expect(msiToRiskLevel(10)).toBe("low");
      expect(msiToRiskLevel(25)).toBe("low");
    });

    it("should return medium for MSI 26-50", () => {
      expect(msiToRiskLevel(26)).toBe("medium");
      expect(msiToRiskLevel(40)).toBe("medium");
      expect(msiToRiskLevel(50)).toBe("medium");
    });

    it("should return high for MSI 51-75", () => {
      expect(msiToRiskLevel(51)).toBe("high");
      expect(msiToRiskLevel(65)).toBe("high");
      expect(msiToRiskLevel(75)).toBe("high");
    });

    it("should return critical for MSI 76-100", () => {
      expect(msiToRiskLevel(76)).toBe("critical");
      expect(msiToRiskLevel(90)).toBe("critical");
      expect(msiToRiskLevel(100)).toBe("critical");
    });
  });

  describe("determineMsiDirection", () => {
    it("should return stable when no previous MSI", () => {
      expect(determineMsiDirection(50, null)).toBe("stable");
    });

    it("should return increasing when MSI increased by more than 5", () => {
      expect(determineMsiDirection(60, 50)).toBe("increasing");
      expect(determineMsiDirection(70, 55)).toBe("increasing");
    });

    it("should return decreasing when MSI decreased by more than 5", () => {
      expect(determineMsiDirection(40, 50)).toBe("decreasing");
      expect(determineMsiDirection(45, 60)).toBe("decreasing");
    });

    it("should return stable when change is within 5 points", () => {
      expect(determineMsiDirection(52, 50)).toBe("stable");
      expect(determineMsiDirection(48, 50)).toBe("stable");
      expect(determineMsiDirection(55, 50)).toBe("stable");
      expect(determineMsiDirection(45, 50)).toBe("stable");
    });
  });

  describe("End-to-end MSI calculation scenarios", () => {
    it("should produce low MSI for new, engaged HCP", () => {
      // Few touches, diverse channels, improving engagement
      const components = calculateMsiComponents(4, 0.9, -10, "awareness");
      const msi = calculateMsi(components);

      expect(msiToRiskLevel(msi)).toBe("low");
    });

    it("should produce high or critical MSI for fatigued loyal prescriber", () => {
      // Many touches, single channel, declining engagement
      const components = calculateMsiComponents(25, 0.15, 35, "loyalty");
      const msi = calculateMsi(components);

      // Should be high or critical - fatigued loyalty is serious
      expect(["high", "critical"]).toContain(msiToRiskLevel(msi));
    });

    it("should produce medium MSI for typical consideration stage HCP", () => {
      // Moderate values across the board
      const components = calculateMsiComponents(12, 0.5, 10, "consideration");
      const msi = calculateMsi(components);

      expect(msiToRiskLevel(msi)).toBe("medium");
    });

    it("should show saturation risk increases faster for loyalty stage", () => {
      // Same exposure for different stages
      const awarenessComponents = calculateMsiComponents(15, 0.4, 15, "awareness");
      const loyaltyComponents = calculateMsiComponents(15, 0.4, 15, "loyalty");

      const awarenessMsi = calculateMsi(awarenessComponents);
      const loyaltyMsi = calculateMsi(loyaltyComponents);

      // Loyalty should have higher MSI due to lower tolerance
      expect(loyaltyMsi).toBeGreaterThan(awarenessMsi);
    });
  });
});

describe("MSI Thresholds by Adoption Stage", () => {
  const stages = ["awareness", "consideration", "trial", "loyalty"] as const;

  it("should have increasing saturation sensitivity from awareness to loyalty", () => {
    const touchFrequency = 15;
    const channelDiversity = 0.5;
    const engagementDecay = 10;

    const msiByStage = stages.map((stage) => {
      const components = calculateMsiComponents(
        touchFrequency,
        channelDiversity,
        engagementDecay,
        stage
      );
      return calculateMsi(components);
    });

    // MSI should generally increase from awareness to loyalty
    expect(msiByStage[0]).toBeLessThan(msiByStage[3]); // awareness < loyalty
  });

  it("should allow more touches in awareness stage before saturation", () => {
    // High touch frequency that would cause saturation in loyalty
    const highTouchFrequency = 20;

    const awarenessComponents = calculateMsiComponents(highTouchFrequency, 0.5, 0, "awareness");
    const loyaltyComponents = calculateMsiComponents(highTouchFrequency, 0.5, 0, "loyalty");

    const awarenessMsi = calculateMsi(awarenessComponents);
    const loyaltyMsi = calculateMsi(loyaltyComponents);

    expect(msiToRiskLevel(awarenessMsi)).not.toBe("critical");
    // Loyalty might be critical or high with same touches
    expect(["high", "critical"]).toContain(msiToRiskLevel(loyaltyMsi));
  });
});
