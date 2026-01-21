/**
 * Storage Module Index
 *
 * Re-exports all storage interfaces and implementations.
 * Maintains backward compatibility while providing modular access.
 */

// Export interfaces
export type {
  HCPProfile,
  HCPFilter,
  SimulationResult,
  InsertSimulationScenario,
  DashboardMetrics,
  InsertAuditLog,
  AuditLog,
  User,
  InsertUser,
  InviteCode,
  InsertInviteCode,
  SavedAudience,
  InsertSavedAudience,
  StimuliEvent,
  CreateStimuliRequest,
  CounterfactualScenario,
  CreateCounterfactualRequest,
  NLQueryResponse,
  NLQueryRequest,
  ModelEvaluation,
  ModelHealthSummary,
  RecordOutcomeRequest,
  RunEvaluationRequest,
  IntegrationConfig,
  InsertIntegrationConfig,
  ActionExport,
  InsertActionExport,
  IntegrationType,
  IntegrationStatus,
  AgentDefinition,
  InsertAgentDefinition,
  AgentRun,
  InsertAgentRun,
  AgentAction,
  InsertAgentAction,
  AgentRunStatus,
  AgentActionStatus,
  Alert,
  InsertAlert,
  // Phase 12A: Competitive types
  Competitor,
  InsertCompetitorDim,
  HcpCompetitiveSignal,
  InsertHcpCompetitiveSignalFact,
  HcpCompetitiveSummary,
  CompetitiveOrbitData,
  CompetitiveFilter,
  CPIComponents,
  CPIDirection,
  // Phase 12B: Message Saturation types
  MessageTheme,
  InsertMessageThemeDim,
  MessageExposure,
  InsertMessageExposureFact,
  HcpMessageSaturationSummary,
  MessageSaturationHeatmapData,
  MessageSaturationFilter,
  MsiComponents,
  MsiDirection,
  SaturationRiskLevel,
  AdoptionStage,
} from "@shared/schema";

// Export converters
export * from "./converters";

// Export utilities
export * from "./utils";

// Export domain storage modules
export { HcpStorage, hcpStorage } from "./hcp-storage";
export { SimulationStorage } from "./simulation-storage";
export { UserStorage, userStorage } from "./user-storage";
export { AudienceStorage, audienceStorage } from "./audience-storage";
export { CompetitiveStorage, competitiveStorage, calculateCPIComponents, determineCPIDirection, cpiToRiskLevel } from "./competitive-storage";
export { messageSaturationStorage, calculateMsiComponents, calculateMsi, msiToRiskLevel, determineMsiDirection } from "./message-saturation-storage";

// Re-export the main storage instance from the original file for backward compatibility
// This will be updated once the full migration is complete
export { storage, IStorage, DatabaseStorage } from "../storage";
