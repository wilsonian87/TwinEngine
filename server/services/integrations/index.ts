/**
 * Integration Services Module
 *
 * Phase 6: Enterprise Integrations for TwinEngine
 *
 * Provides integration capabilities for:
 * - Slack (messaging, alerts)
 * - Jira (ticket creation, status sync) [Phase 6B]
 * - Box (document storage) [Phase 6D]
 * - Teams (messaging) [Future]
 */

// Slack Integration
export {
  SlackIntegration,
  createSlackIntegration,
  getSlackIntegration,
  isSlackConfigured,
  type SlackBlock,
  type SlackSendResult,
  type SlackHealthCheckResult,
} from "./slack";

// Jira Integration
export {
  JiraIntegration,
  createJiraIntegration,
  getJiraIntegration,
  isJiraConfigured,
  defaultTicketTemplates,
  type JiraCreateIssueRequest,
  type JiraUpdateIssueRequest,
  type JiraCreateResult,
  type JiraGetResult,
  type JiraUpdateResult,
  type TicketTemplate,
  type TicketTemplateType,
} from "./jira";

// Forma Predictive Integration
export {
  formaPredictiveService,
  type FormaHealthResult,
  type FormaModelMetrics,
  type FormaFeatureImportance,
  type FormaPrediction,
  type FormaBatchPredictions,
  type FormaPipelineStatus,
} from "./forma-predictive";
