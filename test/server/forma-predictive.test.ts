/**
 * Forma Predictive Integration Tests
 *
 * Tests for the Forma Predictive service connectivity layer.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("FormaPredictiveService", () => {
  // We need to control env vars per test, so we dynamically import after setting them
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  async function loadService() {
    const mod = await import("../../server/services/integrations/forma-predictive");
    return mod.formaPredictiveService;
  }

  describe("dev mode (no FORMA_API_URL)", () => {
    beforeEach(() => {
      delete process.env.FORMA_API_URL;
      delete process.env.FORMA_API_KEY;
    });

    it("healthCheck returns dev_mode status", async () => {
      const service = await loadService();
      const result = await service.healthCheck();
      expect(result.status).toBe("dev_mode");
      expect(result.data).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it("getModelMetrics returns mock data in dev mode", async () => {
      const service = await loadService();
      const result = await service.getModelMetrics();
      expect(result.status).toBe("dev_mode");
      expect(result.data).toBeDefined();
    });

    it("getFeatureImportance returns mock data in dev mode", async () => {
      const service = await loadService();
      const result = await service.getFeatureImportance();
      expect(result.status).toBe("dev_mode");
      expect(result.data).toBeDefined();
    });

    it("predictLaunch returns mock data with provided params", async () => {
      const service = await loadService();
      const result = await service.predictLaunch("ASSET-123", "EU");
      expect(result.status).toBe("dev_mode");
      expect((result.data as any).asset_id).toBe("ASSET-123");
      expect((result.data as any).market).toBe("EU");
    });

    it("getBatchPredictions returns mock data in dev mode", async () => {
      const service = await loadService();
      const result = await service.getBatchPredictions();
      expect(result.status).toBe("dev_mode");
    });

    it("getPipelineStatus returns mock data in dev mode", async () => {
      const service = await loadService();
      const result = await service.getPipelineStatus();
      expect(result.status).toBe("dev_mode");
    });

    it("getConnectionStatus shows not configured", async () => {
      const service = await loadService();
      const status = service.getConnectionStatus();
      expect(status.configured).toBe(false);
      expect(status.url).toBeNull();
    });
  });

  describe("configured mode", () => {
    beforeEach(() => {
      process.env.FORMA_API_URL = "http://localhost:8001";
      process.env.FORMA_API_KEY = "test-key";
    });

    it("healthCheck calls the correct endpoint", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: "ok" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const service = await loadService();
      const result = await service.healthCheck();

      expect(result.status).toBe("connected");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/health",
        expect.objectContaining({
          headers: expect.objectContaining({ "X-API-Key": "test-key" }),
        }),
      );

      vi.unstubAllGlobals();
    });

    it("healthCheck returns disconnected on fetch failure", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

      const service = await loadService();
      const result = await service.healthCheck();

      expect(result.status).toBe("disconnected");
      expect(result.message).toContain("ECONNREFUSED");

      vi.unstubAllGlobals();
    });
  });
});
