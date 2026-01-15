/**
 * Services Index - Exports all service modules
 */

// Prediction Engine
export {
  predictStimuliImpact,
  calculateSimilarityScore,
  runSimulationEngine,
  runCounterfactualAnalysis,
  type SimulationEngineResult,
  type StimuliImpactResult,
  type CounterfactualAnalysisResult,
} from './prediction-engine';

// NL Query Parser
export {
  parseNLQueryToFilters,
  detectQueryIntent,
  generateRecommendations,
  convertToHcpFilter,
} from './nl-query-parser';

// GenAI Service (Claude-powered NL processing)
export {
  initializeGenAI,
  isGenAIAvailable,
  getUsageStats,
  parseNLQueryWithAI,
  detectIntentWithAI,
  generateRecommendationsWithAI,
  resetRateLimitState,
  setConfig,
  isInitialized,
} from './genai-service';
