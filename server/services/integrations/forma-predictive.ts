/**
 * Forma Predictive Integration Service
 *
 * Connects TwinEngine to the Forma Predictive ML API for drug launch forecasting.
 * Reads FORMA_API_URL and FORMA_API_KEY from environment variables.
 * Falls back to mock data in dev mode when FORMA_API_URL is not set.
 */

const FORMA_API_URL = process.env.FORMA_API_URL;
const FORMA_API_KEY = process.env.FORMA_API_KEY;

export interface FormaHealthResult {
  status: "connected" | "disconnected" | "dev_mode";
  message: string;
  timestamp: string;
  data?: unknown;
}

export interface FormaModelMetrics {
  status: string;
  data: unknown;
}

export interface FormaFeatureImportance {
  status: string;
  data: unknown;
}

export interface FormaPrediction {
  status: string;
  data: unknown;
}

export interface FormaBatchPredictions {
  status: string;
  data: unknown;
}

export interface FormaPipelineStatus {
  status: string;
  data: unknown;
}

// Mock data for dev mode
const MOCK_HEALTH = { status: "ok", version: "mock-dev" };
const MOCK_METRICS = { auc_roc: 0.87, precision: 0.82, recall: 0.79, f1: 0.80 };
const MOCK_FEATURE_IMPORTANCE = {
  features: [
    { name: "prior_launches", importance: 0.31 },
    { name: "market_size", importance: 0.24 },
    { name: "therapeutic_area", importance: 0.18 },
    { name: "competitive_density", importance: 0.15 },
    { name: "pipeline_stage", importance: 0.12 },
  ],
};
const MOCK_PREDICTION = {
  asset_id: "mock-asset",
  market: "US",
  probability: 0.72,
  confidence_interval: [0.65, 0.79],
};
const MOCK_BATCH_PREDICTIONS = {
  predictions: [MOCK_PREDICTION],
  generated_at: new Date().toISOString(),
};
const MOCK_PIPELINE_STATUS = {
  total_assets: 142,
  stages: { preclinical: 45, phase1: 32, phase2: 28, phase3: 22, filed: 15 },
};

class FormaPredictiveService {
  private lastSuccessfulCall: string | null = null;

  private get isConfigured(): boolean {
    return !!FORMA_API_URL;
  }

  private get headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (FORMA_API_KEY) {
      h["X-API-Key"] = FORMA_API_KEY;
    }
    return h;
  }

  private async fetchApi<T>(path: string): Promise<T> {
    const url = `${FORMA_API_URL}${path}`;
    const response = await fetch(url, { headers: this.headers });
    if (!response.ok) {
      throw new Error(`Forma API error: ${response.status} ${response.statusText}`);
    }
    this.lastSuccessfulCall = new Date().toISOString();
    return response.json() as Promise<T>;
  }

  async healthCheck(): Promise<FormaHealthResult> {
    if (!this.isConfigured) {
      return {
        status: "dev_mode",
        message: "FORMA_API_URL not configured — returning mock data",
        timestamp: new Date().toISOString(),
        data: MOCK_HEALTH,
      };
    }

    try {
      const data = await this.fetchApi("/health");
      return {
        status: "connected",
        message: "Forma Predictive API is reachable",
        timestamp: new Date().toISOString(),
        data,
      };
    } catch (error) {
      console.error("[Forma] Health check failed:", error);
      return {
        status: "disconnected",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getModelMetrics(): Promise<FormaModelMetrics> {
    if (!this.isConfigured) {
      return { status: "dev_mode", data: MOCK_METRICS };
    }
    try {
      const data = await this.fetchApi("/ml/metrics");
      return { status: "ok", data };
    } catch (error) {
      console.error("[Forma] getModelMetrics failed:", error);
      return { status: "error", data: null };
    }
  }

  async getFeatureImportance(): Promise<FormaFeatureImportance> {
    if (!this.isConfigured) {
      return { status: "dev_mode", data: MOCK_FEATURE_IMPORTANCE };
    }
    try {
      const data = await this.fetchApi("/ml/feature_importance");
      return { status: "ok", data };
    } catch (error) {
      console.error("[Forma] getFeatureImportance failed:", error);
      return { status: "error", data: null };
    }
  }

  async predictLaunch(assetId: string, market: string): Promise<FormaPrediction> {
    if (!this.isConfigured) {
      return { status: "dev_mode", data: { ...MOCK_PREDICTION, asset_id: assetId, market } };
    }
    try {
      const params = new URLSearchParams({ asset_id: assetId, market });
      const data = await this.fetchApi(`/ml/predict/launch12m?${params}`);
      return { status: "ok", data };
    } catch (error) {
      console.error("[Forma] predictLaunch failed:", error);
      return { status: "error", data: null };
    }
  }

  async getBatchPredictions(): Promise<FormaBatchPredictions> {
    if (!this.isConfigured) {
      return { status: "dev_mode", data: MOCK_BATCH_PREDICTIONS };
    }
    try {
      const data = await this.fetchApi("/ml/predict/launch12m/batch");
      return { status: "ok", data };
    } catch (error) {
      console.error("[Forma] getBatchPredictions failed:", error);
      return { status: "error", data: null };
    }
  }

  async getPipelineStatus(): Promise<FormaPipelineStatus> {
    if (!this.isConfigured) {
      return { status: "dev_mode", data: MOCK_PIPELINE_STATUS };
    }
    try {
      const data = await this.fetchApi("/staging/stats");
      return { status: "ok", data };
    } catch (error) {
      console.error("[Forma] getPipelineStatus failed:", error);
      return { status: "error", data: null };
    }
  }

  getConnectionStatus() {
    return {
      configured: this.isConfigured,
      url: this.isConfigured ? FORMA_API_URL : null,
      lastSuccessfulCall: this.lastSuccessfulCall,
    };
  }
}

export const formaPredictiveService = new FormaPredictiveService();
