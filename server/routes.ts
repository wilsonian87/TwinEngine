import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import { storage } from "./storage";
import { competitiveStorage } from "./storage/competitive-storage";
import { messageSaturationStorage } from "./storage/message-saturation-storage";
import { hashPassword } from "./auth";
import { requireEnvVar, debugLog } from "./utils/config";
import { safeParseLimitOffset, safeParseLimit } from "./utils/validation";
import { authRateLimiter } from "./middleware/rate-limit";
import { jwtAuth } from "./middleware/jwt-auth";
import { tokenRouter } from "./routes/token-routes";
import { featureFlagRouter } from "./routes/feature-flag-routes";
import { seedInsightRxFlags } from "./services/feature-flags";
import { knowledgeRouter } from "./routes/knowledge-routes";
import { validationRouter } from "./routes/validation-routes";
import { observabilityRouter } from "./routes/observability-routes";
import { exportRouter } from "./routes/export-routes";
import { seedKnowledgeContent } from "./storage/knowledge-storage";
import { requestMetrics, requestId } from "./middleware/observability";
import { logAudit } from "./services/audit-service";
import { classifyChannelHealth, classifyCohortChannelHealth, getHealthSummary } from "./services/channel-health";
import { generateNBA, generateNBAs, prioritizeNBAs, getNBASummary, generateCompetitiveAwareNBA, generateCompetitiveAwareNBAs, prioritizeCompetitiveAwareNBAs, getCompetitiveAwareNBASummary } from "./services/nba-engine";
import {
  generateSaturationAwareNBA,
  generateSaturationAwareNBAs,
  prioritizeSaturationAwareNBAs,
  getSaturationAwareNBASummary,
  generateHcpSaturationWarnings,
  simulateThemePause,
  calculateOptimalPauseDuration,
  getRecommendedThemes,
  isThemeBlocked,
} from "./services/saturation-aware-nba";
import { campaignPlanningService } from "./services/campaign-planning";
import {
  insertSimulationScenarioSchema,
  hcpFilterSchema,
  cohortRequestSchema,
  nbaGenerationRequestSchema,
  createStimuliRequestSchema,
  createCounterfactualRequestSchema,
  nlQueryRequestSchema,
  recordOutcomeRequestSchema,
  runEvaluationRequestSchema,
  insertUserSchema,
  validateInviteCodeSchema,
  insertInviteCodeSchema,
  insertSavedAudienceSchema,
  // Phase 6: Integration schemas
  createIntegrationRequestSchema,
  slackSendRequestSchema,
  jiraCreateTicketRequestSchema,
  jiraTemplateTicketRequestSchema,
  jiraUpdateIssueRequestSchema,
  // Phase 7B: Attribution schemas
  recordOutcomeWithAttributionRequestSchema,
  batchOutcomeIngestionRequestSchema,
  webhookOutcomePayloadSchema,
  updateAttributionConfigRequestSchema,
  type OutcomeType,
  outcomeTypes,
  // Phase 7C: Uncertainty schemas
  batchUncertaintyRequestSchema,
  explorationDecisionRequestSchema,
  updateExplorationConfigRequestSchema,
  // Phase 7D: Campaign coordination schemas
  createCampaignRequestSchema,
  reserveHcpRequestSchema,
  batchReserveRequestSchema,
  checkAvailabilityRequestSchema,
  resolveConflictRequestSchema,
  autoResolveConflictsRequestSchema,
  // Phase 7E: Batch simulation schemas
  createBatchRequestSchema,
  runBatchRequestSchema,
  generateVariantsRequestSchema,
  incrementalSimulationRequestSchema,
  compareScenarioRequestSchema,
  // Phase 7F: Optimization schemas
  createOptimizationProblemRequestSchema,
  solveOptimizationRequestSchema,
  whatIfRequestSchema,
  createExecutionPlanRequestSchema,
  rebalancePlanRequestSchema,
  // Phase 12A: Competitive schemas
  createCompetitorRequestSchema,
  recordCompetitiveSignalRequestSchema,
  competitiveFilterSchema,
  createCompetitiveAlertConfigSchema,
  // Phase 12C.4: NBO Learning schemas
  recordNBOFeedbackRequestSchema,
  measureNBOOutcomeRequestSchema,
} from "@shared/schema";
import {
  SlackIntegration,
  createSlackIntegration,
  getSlackIntegration,
  isSlackConfigured,
  JiraIntegration,
  createJiraIntegration,
  getJiraIntegration,
  isJiraConfigured,
  defaultTicketTemplates,
  formaPredictiveService,
} from "./services/integrations";
import {
  initializeAgents,
  getAgent,
  getAllAgents,
  channelHealthMonitor,
  insightSynthesizer,
  orchestrator,
  approvalWorkflow,
  agentScheduler,
  initializeScheduler,
  agentExecutor,
  actionCapabilities,
  type AgentType,
} from "./services/agents";
import { constraintManager } from "./services/constraint-manager";
import { attributionEngine } from "./services/attribution-engine";
import { uncertaintyCalculator } from "./services/uncertainty-calculator";
import { explorationStrategy } from "./services/exploration-strategy";
import { campaignCoordinator } from "./services/campaign-coordinator";
import { composableSimulation } from "./services/composable-simulation";
import { portfolioOptimizer } from "./services/portfolio-optimizer";
import { executionPlanner } from "./services/execution-planner";
import { competitiveInsightEngine, competitiveSignalsToCSV, competitiveAlertsToCSV } from "./services/competitive-insight-engine";
import {
  generateNBORecommendation,
  generateBatchNBORecommendations,
  prioritizeNBORecommendations,
  type NBOEngineInput,
} from "./services/next-best-orbit-engine";
import { nboLearningService } from "./services/nbo-learning";
import type { Channel, RebalanceTrigger, HcpCompetitiveSummary, MessageSaturationFilter, NBORecommendation } from "@shared/schema";
import {
  createMessageThemeRequestSchema,
  recordMessageExposureRequestSchema,
  messageSaturationFilterSchema,
  createMsiBenchmarkRequestSchema,
  generatePreCampaignReportRequestSchema,
  saturationExportRequestSchema,
} from "@shared/schema";

// Helper functions for webhook event mapping
function mapWebhookEventToOutcomeType(sourceSystem: string, eventType: string): OutcomeType | null {
  const mappings: Record<string, Record<string, OutcomeType>> = {
    veeva: {
      "call_completed": "call_completed",
      "meeting_scheduled": "meeting_scheduled",
      "meeting_completed": "meeting_completed",
      "sample_delivered": "sample_request",
    },
    salesforce: {
      "EmailOpened": "email_open",
      "EmailClicked": "email_click",
      "FormSubmit": "form_submit",
      "LeadConverted": "rx_written",
    },
    email_platform: {
      "open": "email_open",
      "click": "email_click",
      "unsubscribe": "form_submit",
    },
    custom: {
      "email_open": "email_open",
      "email_click": "email_click",
      "webinar_register": "webinar_register",
      "webinar_attend": "webinar_attend",
      "content_download": "content_download",
      "sample_request": "sample_request",
      "meeting_scheduled": "meeting_scheduled",
      "meeting_completed": "meeting_completed",
      "rx_written": "rx_written",
      "form_submit": "form_submit",
      "call_completed": "call_completed",
      "referral": "referral",
    },
  };

  const systemMappings = mappings[sourceSystem];
  if (systemMappings && systemMappings[eventType]) {
    return systemMappings[eventType];
  }

  // Try direct mapping if event type is a valid outcome type
  if (outcomeTypes.includes(eventType as OutcomeType)) {
    return eventType as OutcomeType;
  }

  return null;
}

function getChannelFromOutcomeType(outcomeType: OutcomeType): string {
  const channelMap: Record<OutcomeType, string> = {
    email_open: "email",
    email_click: "email",
    webinar_register: "webinar",
    webinar_attend: "webinar",
    content_download: "digital_ad",
    sample_request: "rep_visit",
    meeting_scheduled: "rep_visit",
    meeting_completed: "rep_visit",
    rx_written: "rep_visit",
    form_submit: "digital_ad",
    call_completed: "phone",
    referral: "conference",
  };
  return channelMap[outcomeType] ?? "email";
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed database on startup (development only)
  if (process.env.NODE_ENV !== "production") {
    try {
      await storage.seedHcpData(100);
      debugLog("STARTUP", "HCP database seeding completed successfully");

      // Seed message saturation data
      const saturationResult = await messageSaturationStorage.seedMessageSaturationData();
      debugLog("STARTUP", `Message saturation seeding completed: ${saturationResult.themesCreated} themes, ${saturationResult.exposuresCreated} exposures`);
    } catch (error) {
      console.error("[STARTUP] Error seeding database:", error);
    }
  }

  // ============ Observability Middleware ============
  // Request ID and metrics collection
  app.use(requestId);
  app.use(requestMetrics);

  // Log system startup
  logAudit({
    action: "system.startup",
    entityType: "system",
    details: {
      nodeVersion: process.version,
      env: process.env.NODE_ENV,
    },
  }).catch((err) => console.error("[Audit] Failed to log startup:", err));

  // ============ JWT Authentication Middleware ============
  // Apply JWT auth middleware globally (works alongside session auth)
  app.use(jwtAuth);

  // ============ Token Management Endpoints ============
  // JWT token issuance, refresh, and API key management
  app.use("/api/auth", tokenRouter);

  // ============ Feature Flag Endpoints ============
  // Feature flag evaluation and admin management
  app.use("/api/feature-flags", featureFlagRouter);

  // Seed InsightRx feature flags
  try {
    await seedInsightRxFlags();
    debugLog("STARTUP", "InsightRx feature flags seeded");
  } catch (error) {
    console.error("[STARTUP] Error seeding feature flags:", error);
  }

  // ============ Knowledge Base Endpoints ============
  // Knowledge content CRUD and semantic search
  app.use("/api/knowledge", knowledgeRouter);

  // Seed knowledge content in development
  if (process.env.NODE_ENV !== "production") {
    try {
      await seedKnowledgeContent();
      debugLog("STARTUP", "Knowledge base seeded");
    } catch (error) {
      console.error("[STARTUP] Error seeding knowledge base:", error);
    }
  }

  // ============ Validation Endpoints ============
  // Content validation with @twinengine/insightrx
  app.use("/api/validation", validationRouter);

  // ============ Observability Endpoints ============
  // Audit logs, metrics, and health checks
  app.use("/api/observability", observabilityRouter);

  // ============ PDF Export Endpoints ============
  // PDF generation for simulations, audiences, HCPs, and comparisons
  app.use("/api/exports", exportRouter);

  // ============ Authentication Endpoints ============

  // Register a new user
  app.post("/api/auth/register", authRateLimiter, async (req, res) => {
    try {
      const parseResult = insertUserSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid registration data",
          details: parseResult.error.errors,
        });
      }

      const { username, password } = parseResult.data;

      // Check if user already exists
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ error: "Username already exists" });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
      });

      // Log registration
      await storage.logAction({
        action: "user_registered",
        entityType: "user",
        entityId: user.id,
        details: { username },
      });

      // Auto-login after registration
      req.login({ id: user.id, username: user.username }, (err) => {
        if (err) {
          console.error("Error logging in after registration:", err);
          return res.status(500).json({ error: "Registration succeeded but login failed" });
        }
        res.status(201).json({
          id: user.id,
          username: user.username,
        });
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });

  // Login
  app.post("/api/auth/login", authRateLimiter, (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) {
        console.error("Error during login:", err);
        return res.status(500).json({ error: "Login failed" });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }
      req.login(user, async (loginErr) => {
        if (loginErr) {
          console.error("Error establishing session:", loginErr);
          return res.status(500).json({ error: "Failed to establish session" });
        }

        // Log login
        await storage.logAction({
          action: "user_login",
          entityType: "user",
          entityId: user.id,
          details: { username: user.username },
        });

        res.json({
          id: user.id,
          username: user.username,
        });
      });
    })(req, res, next);
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    const userId = req.user?.id;
    const username = req.user?.username;

    req.logout((err) => {
      if (err) {
        console.error("Error during logout:", err);
        return res.status(500).json({ error: "Logout failed" });
      }

      // Log logout if user was authenticated
      if (userId) {
        storage.logAction({
          action: "user_logout",
          entityType: "user",
          entityId: userId,
          details: { username },
        }).catch(console.error);
      }

      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get("/api/auth/user", (req, res) => {
    if (req.isAuthenticated() && req.user) {
      res.json({
        id: req.user.id,
        username: req.user.username,
      });
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  // ============ Invite Code Endpoints ============

  // Validate invite code (public - used on splash page)
  app.post("/api/invite/validate", authRateLimiter, async (req, res) => {
    try {
      const parseResult = validateInviteCodeSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: parseResult.error.errors,
        });
      }

      const { code, email } = parseResult.data;
      const result = await storage.validateInviteCode(code, email);

      if (!result.valid) {
        return res.status(401).json({ error: result.error });
      }

      // Use the invite code (increment counter)
      const inviteCode = await storage.useInviteCode(code, email);
      if (!inviteCode) {
        return res.status(500).json({ error: "Failed to process invite code" });
      }

      // Set session to mark user as authenticated via invite code
      req.session.inviteCodeId = inviteCode.id;
      req.session.inviteEmail = email;
      req.session.inviteLabel = inviteCode.label;

      res.json({
        success: true,
        label: inviteCode.label,
        email: email,
      });
    } catch (error) {
      console.error("Error validating invite code:", error);
      res.status(500).json({ error: "Failed to validate invite code" });
    }
  });

  // Check if session has valid invite
  app.get("/api/invite/session", (req, res) => {
    if (req.session.inviteCodeId) {
      res.json({
        authenticated: true,
        email: req.session.inviteEmail,
        label: req.session.inviteLabel,
      });
    } else {
      res.json({ authenticated: false });
    }
  });

  // Dev mode bypass (only available in development with explicit flag)
  app.post("/api/invite/dev-bypass", (req, res) => {
    if (process.env.NODE_ENV !== "development") {
      return res.status(403).json({ error: "Only available in development mode" });
    }

    if (!process.env.ALLOW_DEV_BYPASS) {
      return res.status(403).json({ error: "Dev bypass not enabled" });
    }

    req.session.inviteCodeId = "dev-bypass";
    req.session.inviteEmail = "dev@localhost";
    req.session.inviteLabel = "Development Mode";

    res.json({
      success: true,
      label: "Development Mode",
      email: "dev@localhost",
    });
  });

  // Admin: Create invite code (protected by env secret)
  app.post("/api/admin/codes", async (req, res) => {
    const adminSecret = requireEnvVar("ADMIN_SECRET", "dev-admin-secret");
    const authHeader = req.headers["x-admin-secret"];

    if (authHeader !== adminSecret) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const parseResult = insertInviteCodeSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: parseResult.error.errors,
        });
      }

      const inviteCode = await storage.createInviteCode(parseResult.data);
      res.json(inviteCode);
    } catch (error) {
      console.error("Error creating invite code:", error);
      res.status(500).json({ error: "Failed to create invite code" });
    }
  });

  // Admin: List invite codes
  app.get("/api/admin/codes", async (req, res) => {
    const adminSecret = requireEnvVar("ADMIN_SECRET", "dev-admin-secret");
    const authHeader = req.headers["x-admin-secret"];

    if (authHeader !== adminSecret) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const codes = await storage.listInviteCodes();
      res.json(codes);
    } catch (error) {
      console.error("Error listing invite codes:", error);
      res.status(500).json({ error: "Failed to list invite codes" });
    }
  });

  // Admin: Delete invite code
  app.delete("/api/admin/codes/:id", async (req, res) => {
    const adminSecret = requireEnvVar("ADMIN_SECRET", "dev-admin-secret");
    const authHeader = req.headers["x-admin-secret"];

    if (authHeader !== adminSecret) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      await storage.deleteInviteCode(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting invite code:", error);
      res.status(500).json({ error: "Failed to delete invite code" });
    }
  });

  // ============ Saved Audiences Endpoints ============

  app.post("/api/audiences", async (req, res) => {
    try {
      const parseResult = insertSavedAudienceSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: parseResult.error.errors,
        });
      }

      const audience = await storage.createAudience(parseResult.data);
      res.json(audience);
    } catch (error) {
      console.error("Error creating audience:", error);
      res.status(500).json({ error: "Failed to create audience" });
    }
  });

  app.get("/api/audiences", async (req, res) => {
    try {
      const audiences = await storage.listAudiences();
      res.json(audiences);
    } catch (error) {
      console.error("Error listing audiences:", error);
      res.status(500).json({ error: "Failed to list audiences" });
    }
  });

  app.get("/api/audiences/:id", async (req, res) => {
    try {
      const audience = await storage.getAudience(req.params.id);
      if (!audience) {
        return res.status(404).json({ error: "Audience not found" });
      }
      res.json(audience);
    } catch (error) {
      console.error("Error getting audience:", error);
      res.status(500).json({ error: "Failed to get audience" });
    }
  });

  app.patch("/api/audiences/:id", async (req, res) => {
    try {
      const audience = await storage.updateAudience(req.params.id, req.body);
      if (!audience) {
        return res.status(404).json({ error: "Audience not found" });
      }
      res.json(audience);
    } catch (error) {
      console.error("Error updating audience:", error);
      res.status(500).json({ error: "Failed to update audience" });
    }
  });

  app.delete("/api/audiences/:id", async (req, res) => {
    try {
      await storage.deleteAudience(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting audience:", error);
      res.status(500).json({ error: "Failed to delete audience" });
    }
  });

  // ============ HCP endpoints (protected) ============
  // NOTE: NPI is included in HCP responses by design for internal analytics use.
  // This is acceptable for authenticated internal tools but should be reviewed
  // if exposing to external clients. See DOMAIN-ANCHOR Part 6 (Anti-Patterns).
  // Consider: response transformer to omit NPI for external-facing APIs.

  app.get("/api/hcps", async (req, res) => {
    try {
      const hcps = await storage.getAllHcps();
      
      // Log view action
      await storage.logAction({
        action: "view",
        entityType: "hcp_list",
        details: { count: hcps.length },
      });
      
      res.json(hcps);
    } catch (error) {
      console.error("Error fetching HCPs:", error);
      res.status(500).json({ error: "Failed to fetch HCPs" });
    }
  });

  app.get("/api/hcps/:id", async (req, res) => {
    try {
      const hcp = await storage.getHcpById(req.params.id);
      if (!hcp) {
        return res.status(404).json({ error: "HCP not found" });
      }
      
      // Log view action
      await storage.logAction({
        action: "view",
        entityType: "hcp_profile",
        entityId: hcp.id,
        details: { npi: hcp.npi, name: `${hcp.firstName} ${hcp.lastName}` },
      });
      
      res.json(hcp);
    } catch (error) {
      console.error("Error fetching HCP:", error);
      res.status(500).json({ error: "Failed to fetch HCP" });
    }
  });

  app.get("/api/hcps/npi/:npi", async (req, res) => {
    try {
      const hcp = await storage.getHcpByNpi(req.params.npi);
      if (!hcp) {
        return res.status(404).json({ error: "HCP not found" });
      }
      res.json(hcp);
    } catch (error) {
      console.error("Error fetching HCP by NPI:", error);
      res.status(500).json({ error: "Failed to fetch HCP" });
    }
  });

  app.post("/api/hcps/filter", async (req, res) => {
    try {
      const parseResult = hcpFilterSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid filter parameters" });
      }
      const hcps = await storage.filterHcps(parseResult.data);
      res.json(hcps);
    } catch (error) {
      console.error("Error filtering HCPs:", error);
      res.status(500).json({ error: "Failed to filter HCPs" });
    }
  });

  // Lookalike/similar HCPs endpoint
  app.get("/api/hcps/:id/similar", async (req, res) => {
    try {
      const limit = safeParseLimit(req.query, 10);
      const similarHcps = await storage.findSimilarHcps(req.params.id, limit);

      // Log lookalike search
      await storage.logAction({
        action: "lookalike_search",
        entityType: "hcp_profile",
        entityId: req.params.id,
        details: { resultCount: similarHcps.length, limit },
      });

      res.json(similarHcps);
    } catch (error) {
      console.error("Error finding similar HCPs:", error);
      res.status(500).json({ error: "Failed to find similar HCPs" });
    }
  });

  // ============ Channel Health Endpoints ============

  // Get channel health for a single HCP
  app.get("/api/hcps/:id/channel-health", async (req, res) => {
    try {
      const hcp = await storage.getHcpById(req.params.id);
      if (!hcp) {
        return res.status(404).json({ error: "HCP not found" });
      }

      const channelHealth = classifyChannelHealth(hcp);
      const summary = getHealthSummary(channelHealth);

      res.json({
        hcpId: hcp.id,
        hcpName: `${hcp.firstName} ${hcp.lastName}`,
        channelHealth,
        summary,
      });
    } catch (error) {
      console.error("Error getting channel health:", error);
      res.status(500).json({ error: "Failed to get channel health" });
    }
  });

  // Get activity timeline for an HCP
  app.get("/api/hcps/:id/activities", async (req, res) => {
    try {
      const hcp = await storage.getHcpById(req.params.id);
      if (!hcp) {
        return res.status(404).json({ error: "HCP not found" });
      }

      // Parse query params
      const channel = req.query.channel as string | undefined;
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

      // Get stimuli events for this HCP
      const allEvents = await storage.getStimuliEvents(req.params.id, 200);

      // Filter by channel if specified
      let filteredEvents = allEvents;
      if (channel && channel !== "all") {
        filteredEvents = filteredEvents.filter((e) => e.channel === channel);
      }

      // Filter by date range if specified
      if (from) {
        const fromDate = new Date(from);
        filteredEvents = filteredEvents.filter((e) => new Date(e.eventDate) >= fromDate);
      }
      if (to) {
        const toDate = new Date(to);
        filteredEvents = filteredEvents.filter((e) => new Date(e.eventDate) <= toDate);
      }

      // Map to activity format
      const activities = filteredEvents.slice(0, limit).map((event) => ({
        id: event.id,
        timestamp: event.eventDate,
        channel: event.channel,
        actionType: event.stimulusType,
        outcome: event.status === "confirmed"
          ? event.actualEngagementDelta !== null
            ? `${event.actualEngagementDelta > 0 ? "+" : ""}${(event.actualEngagementDelta * 100).toFixed(1)}% engagement`
            : "Confirmed"
          : event.status === "predicted"
          ? "Pending response"
          : event.status === "rejected"
          ? "No response"
          : event.status,
        metadata: {
          subject: event.messageVariant || event.contentType || undefined,
          callToAction: event.callToAction || undefined,
          predictedImpact: event.predictedEngagementDelta
            ? `${(event.predictedEngagementDelta * 100).toFixed(1)}%`
            : undefined,
        },
      }));

      res.json({
        activities,
        total: filteredEvents.length,
        hcpId: req.params.id,
        filters: { channel, from, to, limit },
      });
    } catch (error) {
      console.error("Error getting HCP activities:", error);
      res.status(500).json({ error: "Failed to get HCP activities" });
    }
  });

  // Get aggregate channel health for a cohort (via POST with HCP IDs)
  app.post("/api/channel-health/cohort", async (req, res) => {
    try {
      const parseResult = cohortRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: parseResult.error.errors,
        });
      }

      const { hcpIds } = parseResult.data;

      // Fetch all HCPs by IDs
      const allHcps = await storage.getAllHcps();
      const cohort = allHcps.filter((h) => hcpIds.includes(h.id));

      if (cohort.length === 0) {
        return res.status(404).json({ error: "No HCPs found for given IDs" });
      }

      const cohortHealth = classifyCohortChannelHealth(cohort);

      res.json({
        totalHcps: cohort.length,
        channelHealth: cohortHealth,
      });
    } catch (error) {
      console.error("Error getting cohort channel health:", error);
      res.status(500).json({ error: "Failed to get cohort channel health" });
    }
  });

  // ============ Next Best Action (NBA) Endpoints ============

  // Get NBA recommendation for a single HCP
  app.get("/api/hcps/:id/nba", async (req, res) => {
    try {
      const hcp = await storage.getHcpById(req.params.id);
      if (!hcp) {
        return res.status(404).json({ error: "HCP not found" });
      }

      // Get channel health first
      const channelHealth = classifyChannelHealth(hcp);
      const nba = generateNBA(hcp, channelHealth);

      // Log NBA generation
      await storage.logAction({
        action: "nba_generated",
        entityType: "hcp_profile",
        entityId: hcp.id,
        details: {
          recommendedChannel: nba.recommendedChannel,
          actionType: nba.actionType,
          urgency: nba.urgency,
        },
      });

      res.json(nba);
    } catch (error) {
      console.error("Error generating NBA:", error);
      res.status(500).json({ error: "Failed to generate NBA" });
    }
  });

  // Phase 12A: Get competitive-aware NBA recommendation for a single HCP
  app.get("/api/hcps/:id/nba/competitive", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const hcp = await storage.getHcpById(req.params.id);
      if (!hcp) {
        return res.status(404).json({ error: "HCP not found" });
      }

      // Get channel health
      const channelHealth = classifyChannelHealth(hcp);

      // Get competitive summary
      const competitiveSummary = await competitiveStorage.getHcpCompetitiveSummary(hcp.id);

      // Generate competitive-aware NBA
      const nba = generateCompetitiveAwareNBA(hcp, competitiveSummary ?? null, channelHealth);

      // Log NBA generation
      await storage.logAction({
        action: "competitive_nba_generated",
        entityType: "hcp_profile",
        entityId: hcp.id,
        details: {
          recommendedChannel: nba.recommendedChannel,
          actionType: nba.actionType,
          urgency: nba.urgency,
          hasCompetitiveContext: !!nba.competitiveContext,
          cpi: nba.competitiveContext?.cpi,
          riskLevel: nba.competitiveContext?.riskLevel,
        },
      });

      res.json(nba);
    } catch (error) {
      console.error("Error generating competitive-aware NBA:", error);
      res.status(500).json({ error: "Failed to generate competitive-aware NBA" });
    }
  });

  // Phase 12A: Generate competitive-aware NBAs for multiple HCPs (cohort)
  app.post("/api/nba/generate/competitive", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parseResult = nbaGenerationRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: parseResult.error.errors,
        });
      }

      const { hcpIds, prioritize, limit } = parseResult.data;

      // Fetch all HCPs by IDs
      const allHcps = await storage.getAllHcps();
      const cohort = allHcps.filter((h) => hcpIds.includes(h.id));

      if (cohort.length === 0) {
        return res.json({ nbas: [], summary: null });
      }

      // Fetch competitive summaries for all HCPs
      const competitiveSummaries = new Map<string, HcpCompetitiveSummary | null>();
      await Promise.all(
        cohort.map(async (hcp) => {
          const summary = await competitiveStorage.getHcpCompetitiveSummary(hcp.id);
          competitiveSummaries.set(hcp.id, summary ?? null);
        })
      );

      // Generate competitive-aware NBAs
      let nbas = generateCompetitiveAwareNBAs(cohort, competitiveSummaries);

      // Prioritize if requested
      if (prioritize) {
        nbas = prioritizeCompetitiveAwareNBAs(nbas, limit, true);
      } else if (limit) {
        nbas = nbas.slice(0, limit);
      }

      const summary = getCompetitiveAwareNBASummary(nbas);

      res.json({ nbas, summary });
    } catch (error) {
      console.error("Error generating competitive-aware NBAs:", error);
      res.status(500).json({ error: "Failed to generate competitive-aware NBAs" });
    }
  });

  // Generate NBAs for multiple HCPs (cohort)
  app.post("/api/nba/generate", async (req, res) => {
    try {
      const parseResult = nbaGenerationRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: parseResult.error.errors,
        });
      }

      const { hcpIds, prioritize, limit } = parseResult.data;

      // Fetch all HCPs by IDs
      const allHcps = await storage.getAllHcps();
      const cohort = allHcps.filter((h) => hcpIds.includes(h.id));

      if (cohort.length === 0) {
        return res.status(404).json({ error: "No HCPs found for given IDs" });
      }

      // Generate NBAs for all HCPs
      let nbas = generateNBAs(cohort);

      // Optionally prioritize
      if (prioritize !== false) {
        nbas = prioritizeNBAs(nbas, limit);
      } else if (limit) {
        nbas = nbas.slice(0, limit);
      }

      // Get summary statistics
      const summary = getNBASummary(nbas);

      // Log batch NBA generation
      await storage.logAction({
        action: "nba_batch_generated",
        entityType: "cohort",
        details: {
          inputCount: hcpIds.length,
          outputCount: nbas.length,
          summary,
        },
      });

      res.json({
        nbas,
        summary,
        totalProcessed: cohort.length,
      });
    } catch (error) {
      console.error("Error generating batch NBAs:", error);
      res.status(500).json({ error: "Failed to generate batch NBAs" });
    }
  });

  // Simulation endpoints (protected)
  app.post("/api/simulations/run", async (req, res) => {
    try {
      const parseResult = insertSimulationScenarioSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid simulation parameters",
          details: parseResult.error.errors 
        });
      }
      const result = await storage.createSimulation(parseResult.data);
      res.json(result);
    } catch (error) {
      console.error("Error running simulation:", error);
      res.status(500).json({ error: "Failed to run simulation" });
    }
  });

  app.get("/api/simulations/history", async (req, res) => {
    try {
      const history = await storage.getSimulationHistory();
      res.json(history);
    } catch (error) {
      console.error("Error fetching simulation history:", error);
      res.status(500).json({ error: "Failed to fetch simulation history" });
    }
  });

  app.get("/api/simulations/:id", async (req, res) => {
    try {
      const simulation = await storage.getSimulationById(req.params.id);
      if (!simulation) {
        return res.status(404).json({ error: "Simulation not found" });
      }
      res.json(simulation);
    } catch (error) {
      console.error("Error fetching simulation:", error);
      res.status(500).json({ error: "Failed to fetch simulation" });
    }
  });

  // ============ Phase 7E: Batch Simulation Endpoints ============

  // Create a new simulation batch
  app.post("/api/simulations/batch", async (req, res) => {
    try {
      const parseResult = createBatchRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid batch parameters",
          details: parseResult.error.errors,
        });
      }

      const { name, baseScenarioId, ...options } = parseResult.data;
      const batch = await composableSimulation.createBatch(name, baseScenarioId, options);
      res.status(201).json(batch);
    } catch (error) {
      console.error("Error creating simulation batch:", error);
      res.status(500).json({ error: "Failed to create simulation batch" });
    }
  });

  // List all batches
  app.get("/api/simulations/batches", async (req, res) => {
    try {
      const batches = await composableSimulation.listBatches();
      res.json(batches);
    } catch (error) {
      console.error("Error listing simulation batches:", error);
      res.status(500).json({ error: "Failed to list simulation batches" });
    }
  });

  // Get batch details
  app.get("/api/simulations/batch/:id", async (req, res) => {
    try {
      const batch = await composableSimulation.getBatch(req.params.id);
      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }
      res.json(batch);
    } catch (error) {
      console.error("Error fetching simulation batch:", error);
      res.status(500).json({ error: "Failed to fetch simulation batch" });
    }
  });

  // Get batch progress
  app.get("/api/simulations/batch/:id/progress", async (req, res) => {
    try {
      const progress = await composableSimulation.getBatchProgress(req.params.id);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching batch progress:", error);
      res.status(500).json({ error: "Failed to fetch batch progress" });
    }
  });

  // Run a batch simulation
  app.post("/api/simulations/batch/:id/run", async (req, res) => {
    try {
      const parseResult = runBatchRequestSchema.safeParse({
        batchId: req.params.id,
        ...req.body,
      });
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid run parameters",
          details: parseResult.error.errors,
        });
      }

      const { batchId, concurrency } = parseResult.data;
      const result = await composableSimulation.runBatch(batchId, concurrency);
      res.json(result);
    } catch (error) {
      console.error("Error running simulation batch:", error);
      res.status(500).json({ error: "Failed to run simulation batch" });
    }
  });

  // Get batch results summary
  app.get("/api/simulations/batch/:id/results", async (req, res) => {
    try {
      const results = await composableSimulation.getBatchResultSummary(req.params.id);
      res.json(results);
    } catch (error) {
      console.error("Error fetching batch results:", error);
      res.status(500).json({ error: "Failed to fetch batch results" });
    }
  });

  // Get best variant from batch
  app.get("/api/simulations/batch/:id/best", async (req, res) => {
    try {
      const best = await composableSimulation.getBestVariant(req.params.id);
      if (!best) {
        return res.status(404).json({ error: "No best variant found" });
      }
      res.json(best);
    } catch (error) {
      console.error("Error fetching best variant:", error);
      res.status(500).json({ error: "Failed to fetch best variant" });
    }
  });

  // Get variants for a batch
  app.get("/api/simulations/batch/:id/variants", async (req, res) => {
    try {
      const { limit, offset } = safeParseLimitOffset(req.query);
      const variants = await composableSimulation.getBatchVariants(req.params.id, { limit, offset });
      res.json(variants);
    } catch (error) {
      console.error("Error fetching batch variants:", error);
      res.status(500).json({ error: "Failed to fetch batch variants" });
    }
  });

  // Delete a batch
  app.delete("/api/simulations/batch/:id", async (req, res) => {
    try {
      await composableSimulation.deleteBatch(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting simulation batch:", error);
      res.status(500).json({ error: "Failed to delete simulation batch" });
    }
  });

  // Generate variant specs without creating batch
  app.post("/api/simulations/generate-variants", async (req, res) => {
    try {
      const parseResult = generateVariantsRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid generation parameters",
          details: parseResult.error.errors,
        });
      }

      const { parameterRanges, strategy, maxVariants } = parseResult.data;
      const specs = composableSimulation.generateVariantSpecs(
        parameterRanges,
        strategy,
        maxVariants
      );
      res.json({
        strategy,
        variantCount: specs.length,
        specs,
      });
    } catch (error) {
      console.error("Error generating variants:", error);
      res.status(500).json({ error: "Failed to generate variants" });
    }
  });

  // Incremental simulation: extend or subtract HCPs
  app.post("/api/simulations/incremental", async (req, res) => {
    try {
      const parseResult = incrementalSimulationRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid incremental simulation parameters",
          details: parseResult.error.errors,
        });
      }

      const { baseResultId, addHcpIds, removeHcpIds } = parseResult.data;

      if (addHcpIds && addHcpIds.length > 0) {
        const result = await composableSimulation.extendSimulation(baseResultId, addHcpIds);
        res.json(result);
      } else if (removeHcpIds && removeHcpIds.length > 0) {
        const result = await composableSimulation.subtractSimulation(baseResultId, removeHcpIds);
        res.json(result);
      } else {
        res.status(400).json({ error: "Must provide either addHcpIds or removeHcpIds" });
      }
    } catch (error) {
      console.error("Error running incremental simulation:", error);
      res.status(500).json({ error: "Failed to run incremental simulation" });
    }
  });

  // Differential simulation: compare two scenarios (POST)
  app.post("/api/simulations/compare", async (req, res) => {
    try {
      const parseResult = compareScenarioRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid compare parameters",
          details: parseResult.error.errors,
        });
      }

      const { scenarioAId, scenarioBId } = parseResult.data;
      const comparison = await composableSimulation.compareScenarios(scenarioAId, scenarioBId);
      res.json(comparison);
    } catch (error) {
      console.error("Error comparing scenarios:", error);
      res.status(500).json({ error: "Failed to compare scenarios" });
    }
  });

  // GET endpoint for comparing multiple simulations via query string
  app.get("/api/simulations/compare", async (req, res) => {
    try {
      const idsParam = req.query.ids as string;
      if (!idsParam) {
        return res.status(400).json({
          error: "Missing ids parameter",
          message: "Provide comma-separated simulation IDs via ?ids=id1,id2,id3",
        });
      }

      const ids = idsParam.split(",").filter((id) => id.trim());
      if (ids.length < 2 || ids.length > 5) {
        return res.status(400).json({
          error: "Invalid number of IDs",
          message: "Provide 2-5 simulation IDs for comparison",
        });
      }

      // Fetch all simulations
      const simulations = await Promise.all(
        ids.map((id) => storage.getSimulationById(id))
      );

      // Check for missing simulations
      const missingIds = ids.filter((id, idx) => !simulations[idx]);
      if (missingIds.length > 0) {
        return res.status(404).json({
          error: "Simulations not found",
          missingIds,
        });
      }

      // Build scenarios array with full data
      const scenarios = simulations.map((sim) => ({
        id: sim!.id,
        name: sim!.scenarioName,
        config: {
          scenarioId: sim!.scenarioId,
        },
        results: {
          predictedRxLift: sim!.predictedRxLift,
          predictedEngagementRate: sim!.predictedEngagementRate,
          predictedResponseRate: sim!.predictedResponseRate,
          predictedReach: sim!.predictedReach,
          costPerEngagement: sim!.costPerEngagement,
          efficiencyScore: sim!.efficiencyScore,
          channelPerformance: sim!.channelPerformance,
          vsBaseline: sim!.vsBaseline,
        },
        createdAt: sim!.runAt,
      }));

      // Compute deltas between first two scenarios (primary comparison)
      const [a, b] = scenarios;
      const computeDelta = (valA: number, valB: number) => ({
        absolute: valB - valA,
        percent: valA !== 0 ? ((valB - valA) / Math.abs(valA)) * 100 : 0,
      });

      const deltas = {
        rxLift: computeDelta(a.results.predictedRxLift, b.results.predictedRxLift),
        engagement: computeDelta(a.results.predictedEngagementRate, b.results.predictedEngagementRate),
        response: computeDelta(a.results.predictedResponseRate, b.results.predictedResponseRate),
        reach: computeDelta(a.results.predictedReach, b.results.predictedReach),
        efficiency: computeDelta(a.results.efficiencyScore, b.results.efficiencyScore),
        costPerEngagement: a.results.costPerEngagement && b.results.costPerEngagement
          ? computeDelta(a.results.costPerEngagement, b.results.costPerEngagement)
          : null,
      };

      res.json({
        scenarios,
        deltas,
        comparedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error comparing simulations:", error);
      res.status(500).json({ error: "Failed to compare simulations" });
    }
  });

  // Dashboard endpoints (protected)
  app.get("/api/dashboard/metrics", async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ error: "Failed to fetch dashboard metrics" });
    }
  });

  // Audit log endpoints (protected)
  app.get("/api/audit-logs", async (req, res) => {
    try {
      const limit = safeParseLimit(req.query, 100);
      const logs = await storage.getAuditLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // Export endpoint (for governance/compliance, protected)
  app.get("/api/export/hcps", async (req, res) => {
    try {
      const hcps = await storage.getAllHcps();
      
      // Log export action
      await storage.logAction({
        action: "export",
        entityType: "hcp_data",
        details: { count: hcps.length, format: "json" },
      });
      
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", "attachment; filename=hcp-export.json");
      res.json(hcps);
    } catch (error) {
      console.error("Error exporting HCPs:", error);
      res.status(500).json({ error: "Failed to export HCP data" });
    }
  });

  // ============ Stimuli Impact Prediction Endpoints (protected) ============

  app.post("/api/stimuli", async (req, res) => {
    try {
      const parseResult = createStimuliRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid stimuli parameters",
          details: parseResult.error.errors 
        });
      }
      const event = await storage.createStimuliEvent(parseResult.data);
      res.json(event);
    } catch (error) {
      console.error("Error creating stimuli event:", error);
      res.status(500).json({ error: "Failed to create stimuli event" });
    }
  });

  app.get("/api/stimuli", async (req, res) => {
    try {
      const hcpId = req.query.hcpId as string | undefined;
      const limit = safeParseLimit(req.query);
      const events = await storage.getStimuliEvents(hcpId, limit);
      res.json(events);
    } catch (error) {
      console.error("Error fetching stimuli events:", error);
      res.status(500).json({ error: "Failed to fetch stimuli events" });
    }
  });

  app.patch("/api/stimuli/:id/outcome", async (req, res) => {
    try {
      const { actualEngagementDelta, actualConversionDelta } = req.body;
      if (typeof actualEngagementDelta !== "number" || typeof actualConversionDelta !== "number") {
        return res.status(400).json({ error: "Invalid outcome parameters" });
      }
      const event = await storage.recordStimuliOutcome(
        req.params.id,
        actualEngagementDelta,
        actualConversionDelta
      );
      if (!event) {
        return res.status(404).json({ error: "Stimuli event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error recording stimuli outcome:", error);
      res.status(500).json({ error: "Failed to record outcome" });
    }
  });

  // ============ Counterfactual Backtesting Endpoints (protected) ============

  app.post("/api/counterfactuals", async (req, res) => {
    try {
      const parseResult = createCounterfactualRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid counterfactual parameters",
          details: parseResult.error.errors 
        });
      }
      const scenario = await storage.createCounterfactual(parseResult.data);
      res.json(scenario);
    } catch (error) {
      console.error("Error creating counterfactual:", error);
      res.status(500).json({ error: "Failed to create counterfactual analysis" });
    }
  });

  app.get("/api/counterfactuals", async (req, res) => {
    try {
      const limit = safeParseLimit(req.query);
      const scenarios = await storage.getCounterfactualScenarios(limit);
      res.json(scenarios);
    } catch (error) {
      console.error("Error fetching counterfactuals:", error);
      res.status(500).json({ error: "Failed to fetch counterfactual scenarios" });
    }
  });

  app.get("/api/counterfactuals/:id", async (req, res) => {
    try {
      const scenario = await storage.getCounterfactualById(req.params.id);
      if (!scenario) {
        return res.status(404).json({ error: "Counterfactual scenario not found" });
      }
      res.json(scenario);
    } catch (error) {
      console.error("Error fetching counterfactual:", error);
      res.status(500).json({ error: "Failed to fetch counterfactual scenario" });
    }
  });

  // ============ Natural Language Query Endpoints (protected) ============

  app.post("/api/nl-query", async (req, res) => {
    try {
      const parseResult = nlQueryRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid query parameters",
          details: parseResult.error.errors 
        });
      }
      const response = await storage.processNLQuery(parseResult.data);
      res.json(response);
    } catch (error) {
      console.error("Error processing NL query:", error);
      res.status(500).json({ error: "Failed to process natural language query" });
    }
  });

  app.get("/api/nl-query/history", async (req, res) => {
    try {
      const limit = safeParseLimit(req.query);
      const history = await storage.getNLQueryHistory(limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching NL query history:", error);
      res.status(500).json({ error: "Failed to fetch query history" });
    }
  });

  // ============ Model Evaluation & Closed-Loop Learning Endpoints (protected) ============

  app.post("/api/stimuli/:id/outcome", async (req, res) => {
    try {
      const parseResult = recordOutcomeRequestSchema.safeParse({
        ...req.body,
        stimuliEventId: req.params.id,
      });
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid outcome parameters",
          details: parseResult.error.errors 
        });
      }
      const event = await storage.recordOutcome(parseResult.data);
      if (!event) {
        return res.status(404).json({ error: "Stimuli event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error recording outcome:", error);
      res.status(500).json({ error: "Failed to record outcome" });
    }
  });

  app.post("/api/model-evaluation", async (req, res) => {
    try {
      const parseResult = runEvaluationRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid evaluation parameters",
          details: parseResult.error.errors 
        });
      }
      const evaluation = await storage.runModelEvaluation(parseResult.data);
      res.json(evaluation);
    } catch (error) {
      console.error("Error running model evaluation:", error);
      res.status(500).json({ error: "Failed to run model evaluation" });
    }
  });

  app.get("/api/model-evaluation", async (req, res) => {
    try {
      const limit = safeParseLimit(req.query);
      const evaluations = await storage.getModelEvaluations(limit);
      res.json(evaluations);
    } catch (error) {
      console.error("Error fetching model evaluations:", error);
      res.status(500).json({ error: "Failed to fetch model evaluations" });
    }
  });

  app.get("/api/model-health", async (req, res) => {
    try {
      const summary = await storage.getModelHealthSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error fetching model health:", error);
      res.status(500).json({ error: "Failed to fetch model health summary" });
    }
  });

  // ============ Phase 6: Integration Endpoints ============

  // List all integrations
  app.get("/api/integrations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const integrations = await storage.listIntegrations();
      // Mask credentials in response
      const safeIntegrations = integrations.map(i => ({
        ...i,
        credentials: i.credentials ? { type: (i.credentials as any).type, configured: true } : null,
      }));
      res.json(safeIntegrations);
    } catch (error) {
      console.error("Error listing integrations:", error);
      res.status(500).json({ error: "Failed to list integrations" });
    }
  });

  // Get a specific integration
  app.get("/api/integrations/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const integration = await storage.getIntegration(req.params.id);
      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }
      // Mask credentials
      const safeIntegration = {
        ...integration,
        credentials: integration.credentials ? { type: (integration.credentials as any).type, configured: true } : null,
      };
      res.json(safeIntegration);
    } catch (error) {
      console.error("Error fetching integration:", error);
      res.status(500).json({ error: "Failed to fetch integration" });
    }
  });

  // Create a new integration
  app.post("/api/integrations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parseResult = createIntegrationRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid integration configuration",
          details: parseResult.error.errors,
        });
      }

      const config = parseResult.data;
      const integration = await storage.createIntegration({
        type: config.type,
        name: config.name,
        description: config.description,
        credentials: config.credentials,
        defaultSettings: config.defaultSettings,
        status: "pending_auth",
      });

      // Mask credentials in response
      res.status(201).json({
        ...integration,
        credentials: { type: config.type, configured: true },
      });
    } catch (error) {
      console.error("Error creating integration:", error);
      res.status(500).json({ error: "Failed to create integration" });
    }
  });

  // Update an integration
  app.patch("/api/integrations/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const integration = await storage.getIntegration(req.params.id);
      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }

      const updated = await storage.updateIntegration(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Integration not found" });
      }

      res.json({
        ...updated,
        credentials: updated.credentials ? { type: (updated.credentials as any).type, configured: true } : null,
      });
    } catch (error) {
      console.error("Error updating integration:", error);
      res.status(500).json({ error: "Failed to update integration" });
    }
  });

  // Delete an integration
  app.delete("/api/integrations/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      await storage.deleteIntegration(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting integration:", error);
      res.status(500).json({ error: "Failed to delete integration" });
    }
  });

  // Test integration connection / health check
  app.post("/api/integrations/:id/test", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const integration = await storage.getIntegration(req.params.id);
      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }

      if (integration.type === "slack") {
        const slackIntegration = createSlackIntegration(integration);
        const health = await slackIntegration.healthCheck();
        res.json(health);
      } else {
        // Generic response for other integration types (to be implemented)
        res.json({
          healthy: false,
          error: `Health check not implemented for ${integration.type}`,
          lastCheck: new Date(),
        });
      }
    } catch (error) {
      console.error("Error testing integration:", error);
      res.status(500).json({ error: "Failed to test integration" });
    }
  });

  // ============ Slack-Specific Endpoints ============

  // Send message to Slack
  app.post("/api/integrations/slack/send", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parseResult = slackSendRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid Slack message request",
          details: parseResult.error.errors,
        });
      }

      const request = parseResult.data;

      // Get the integration
      const integration = await storage.getIntegration(request.integrationId);
      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }

      if (integration.type !== "slack") {
        return res.status(400).json({ error: "Integration is not a Slack integration" });
      }

      // Send the message
      const slackIntegration = createSlackIntegration(integration);
      const result = await slackIntegration.sendMessage(request);

      if (result.success) {
        res.json({
          success: true,
          messageTs: result.messageTs,
          channel: result.channel,
          actionExportId: result.actionExportId,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          actionExportId: result.actionExportId,
        });
      }
    } catch (error) {
      console.error("Error sending Slack message:", error);
      res.status(500).json({ error: "Failed to send Slack message" });
    }
  });

  // Check if Slack is configured
  app.get("/api/integrations/slack/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const configured = await isSlackConfigured();
      const integration = await storage.getIntegrationByType("slack");

      res.json({
        configured,
        status: integration?.status || "not_configured",
        integrationId: integration?.id,
      });
    } catch (error) {
      console.error("Error checking Slack status:", error);
      res.status(500).json({ error: "Failed to check Slack status" });
    }
  });

  // ============ Jira-Specific Endpoints ============

  // Create a Jira ticket
  app.post("/api/integrations/jira/create-ticket", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      // Try template-based request first
      const templateParseResult = jiraTemplateTicketRequestSchema.safeParse(req.body);

      if (templateParseResult.success) {
        // Template-based ticket creation
        const request = templateParseResult.data;

        // Get the integration
        const integration = await storage.getIntegration(request.integrationId);
        if (!integration) {
          return res.status(404).json({ error: "Integration not found" });
        }
        if (integration.type !== "jira") {
          return res.status(400).json({ error: "Integration is not a Jira integration" });
        }

        const jiraIntegration = createJiraIntegration(integration);
        const template = { ...defaultTicketTemplates[request.templateType], projectKey: request.projectKey };

        let issueRequest;

        if (request.templateType === "nba_action" && request.nba) {
          // Format NBA as issue request
          issueRequest = jiraIntegration.formatNBAAsIssue(
            request.nba as Parameters<typeof jiraIntegration.formatNBAAsIssue>[0],
            request.projectKey,
            template
          );
        } else if (request.templateType === "simulation_result" && request.simulation) {
          // Format simulation as issue request
          issueRequest = jiraIntegration.formatSimulationAsIssue(
            request.simulation,
            request.projectKey,
            template
          );
        } else {
          return res.status(400).json({
            error: `Missing required data for template type: ${request.templateType}`,
          });
        }

        const result = await jiraIntegration.createIssue(issueRequest);

        if (result.success) {
          return res.json({
            success: true,
            issueKey: result.issueKey,
            issueId: result.issueId,
            issueUrl: result.issueUrl,
            actionExportId: result.actionExportId,
          });
        } else {
          return res.status(400).json({
            success: false,
            error: result.error,
            actionExportId: result.actionExportId,
          });
        }
      }

      // Fall back to direct ticket creation
      const parseResult = jiraCreateTicketRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid Jira ticket request",
          details: parseResult.error.errors,
        });
      }

      const request = parseResult.data;

      // Get the integration
      const integration = await storage.getIntegration(request.integrationId);
      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }

      if (integration.type !== "jira") {
        return res.status(400).json({ error: "Integration is not a Jira integration" });
      }

      // Create the ticket
      const jiraIntegration = createJiraIntegration(integration);
      const result = await jiraIntegration.createIssue({
        integrationId: request.integrationId,
        projectKey: request.projectKey,
        issueType: request.issueType || "Task",
        summary: request.summary,
        description: request.description,
        priority: request.priority,
        labels: request.labels,
        customFields: request.customFields,
        sourceType: request.sourceType,
        sourceId: request.sourceId,
      });

      if (result.success) {
        res.json({
          success: true,
          issueKey: result.issueKey,
          issueId: result.issueId,
          issueUrl: result.issueUrl,
          actionExportId: result.actionExportId,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          actionExportId: result.actionExportId,
        });
      }
    } catch (error) {
      console.error("Error creating Jira ticket:", error);
      res.status(500).json({ error: "Failed to create Jira ticket" });
    }
  });

  // Get a Jira issue
  app.get("/api/integrations/jira/issue/:issueKey", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const integrationId = req.query.integrationId as string;
      if (!integrationId) {
        return res.status(400).json({ error: "integrationId query parameter required" });
      }

      const integration = await storage.getIntegration(integrationId);
      if (!integration || integration.type !== "jira") {
        return res.status(404).json({ error: "Jira integration not found" });
      }

      const jiraIntegration = createJiraIntegration(integration);
      const result = await jiraIntegration.getIssue(req.params.issueKey);

      if (result.success) {
        res.json(result.issue);
      } else {
        res.status(404).json({ error: result.error });
      }
    } catch (error) {
      console.error("Error fetching Jira issue:", error);
      res.status(500).json({ error: "Failed to fetch Jira issue" });
    }
  });

  // Update a Jira issue
  app.patch("/api/integrations/jira/issue/:issueKey", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parseResult = jiraUpdateIssueRequestSchema.safeParse({
        ...req.body,
        issueKey: req.params.issueKey,
      });
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid update request",
          details: parseResult.error.errors,
        });
      }

      const request = parseResult.data;

      const integration = await storage.getIntegration(request.integrationId);
      if (!integration || integration.type !== "jira") {
        return res.status(404).json({ error: "Jira integration not found" });
      }

      const jiraIntegration = createJiraIntegration(integration);
      const result = await jiraIntegration.updateIssue(request);

      if (result.success) {
        res.json({ success: true, issueKey: result.issueKey });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error("Error updating Jira issue:", error);
      res.status(500).json({ error: "Failed to update Jira issue" });
    }
  });

  // Get available Jira projects
  app.get("/api/integrations/jira/projects", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const integrationId = req.query.integrationId as string;
      if (!integrationId) {
        return res.status(400).json({ error: "integrationId query parameter required" });
      }

      const integration = await storage.getIntegration(integrationId);
      if (!integration || integration.type !== "jira") {
        return res.status(404).json({ error: "Jira integration not found" });
      }

      const jiraIntegration = createJiraIntegration(integration);
      const projects = await jiraIntegration.getProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching Jira projects:", error);
      res.status(500).json({ error: "Failed to fetch Jira projects" });
    }
  });

  // Get issue types for a Jira project
  app.get("/api/integrations/jira/projects/:projectKey/issue-types", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const integrationId = req.query.integrationId as string;
      if (!integrationId) {
        return res.status(400).json({ error: "integrationId query parameter required" });
      }

      const integration = await storage.getIntegration(integrationId);
      if (!integration || integration.type !== "jira") {
        return res.status(404).json({ error: "Jira integration not found" });
      }

      const jiraIntegration = createJiraIntegration(integration);
      const issueTypes = await jiraIntegration.getIssueTypes(req.params.projectKey);
      res.json(issueTypes);
    } catch (error) {
      console.error("Error fetching Jira issue types:", error);
      res.status(500).json({ error: "Failed to fetch Jira issue types" });
    }
  });

  // Check if Jira is configured
  app.get("/api/integrations/jira/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const configured = await isJiraConfigured();
      const integration = await storage.getIntegrationByType("jira");

      res.json({
        configured,
        status: integration?.status || "not_configured",
        integrationId: integration?.id,
      });
    } catch (error) {
      console.error("Error checking Jira status:", error);
      res.status(500).json({ error: "Failed to check Jira status" });
    }
  });

  // ============ Forma Predictive Endpoints ============

  app.get("/api/integrations/forma/health", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const result = await formaPredictiveService.healthCheck();
      res.json(result);
    } catch (error) {
      console.error("Error checking Forma health:", error);
      res.status(500).json({ error: "Failed to check Forma Predictive health" });
    }
  });

  app.get("/api/integrations/forma/metrics", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const result = await formaPredictiveService.getModelMetrics();
      res.json(result);
    } catch (error) {
      console.error("Error fetching Forma metrics:", error);
      res.status(500).json({ error: "Failed to fetch Forma Predictive metrics" });
    }
  });

  app.get("/api/integrations/forma/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const health = await formaPredictiveService.healthCheck();
      const connection = formaPredictiveService.getConnectionStatus();
      res.json({ ...connection, health: health.status });
    } catch (error) {
      console.error("Error checking Forma status:", error);
      res.status(500).json({ error: "Failed to check Forma Predictive status" });
    }
  });

  // ============ Action Export Endpoints ============

  // List action exports
  app.get("/api/action-exports", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const sourceType = req.query.sourceType as string | undefined;
      const limit = safeParseLimit(req.query);

      const exports = await storage.listActionExports(sourceType, limit);
      res.json(exports);
    } catch (error) {
      console.error("Error listing action exports:", error);
      res.status(500).json({ error: "Failed to list action exports" });
    }
  });

  // Get a specific action export
  app.get("/api/action-exports/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const actionExport = await storage.getActionExport(req.params.id);
      if (!actionExport) {
        return res.status(404).json({ error: "Action export not found" });
      }
      res.json(actionExport);
    } catch (error) {
      console.error("Error fetching action export:", error);
      res.status(500).json({ error: "Failed to fetch action export" });
    }
  });

  // ============ Agent Endpoints (Phase 6C) ============

  // Initialize agents and scheduler on startup
  initializeAgents();
  initializeScheduler().catch(err => {
    console.error("[Scheduler] Failed to initialize scheduler:", err);
  });

  // List all registered agents
  app.get("/api/agents", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const agents = getAllAgents();
      const agentDefinitions = await storage.listAgentDefinitions();

      // Merge runtime agent info with stored definitions
      const agentList = agents.map(agent => {
        const stored = agentDefinitions.find(d => d.type === agent.type);
        return {
          type: agent.type,
          name: agent.name,
          description: agent.description,
          version: agent.version,
          stored: stored || null,
        };
      });

      res.json(agentList);
    } catch (error) {
      console.error("Error listing agents:", error);
      res.status(500).json({ error: "Failed to list agents" });
    }
  });

  // Get agent by type
  app.get("/api/agents/:type", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const agentType = req.params.type as AgentType;
      const agent = getAgent(agentType);

      if (!agent) {
        return res.status(404).json({ error: `Agent type '${agentType}' not found` });
      }

      const stored = await storage.getAgentDefinitionByType(agentType);
      const recentRuns = await storage.listAgentRuns(stored?.id, 5);

      res.json({
        type: agent.type,
        name: agent.name,
        description: agent.description,
        version: agent.version,
        inputSchema: agent.getInputSchema(),
        defaultInput: agent.getDefaultInput(),
        stored: stored || null,
        recentRuns,
      });
    } catch (error) {
      console.error("Error fetching agent:", error);
      res.status(500).json({ error: "Failed to fetch agent" });
    }
  });

  // Trigger agent execution
  app.post("/api/agents/:type/run", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const agentType = req.params.type as AgentType;
      const agent = getAgent(agentType);

      if (!agent) {
        return res.status(404).json({ error: `Agent type '${agentType}' not found` });
      }

      // For channel health monitor, we need to provide HCP data
      if (agentType === "channel_health_monitor") {
        const hcps = await storage.getAllHcps();
        channelHealthMonitor.setHcpData(hcps);
      }

      const input = req.body.input || agent.getDefaultInput();
      const userId = req.user?.id || "system";

      // Run the agent
      const result = await agent.run(input, userId, "on_demand");

      // Store the run record
      const runRecord = await storage.createAgentRun({
        agentId: result.runId,
        agentType: agent.type,
        agentVersion: agent.version,
        triggerType: "on_demand",
        triggeredBy: userId,
        inputs: input,
        outputs: {
          alerts: result.output.alerts?.map((a, idx) => ({
            id: `alert-${result.runId}-${idx}`,
            severity: a.severity,
            title: a.title,
            message: a.message,
          })),
          recommendations: result.output.insights?.map((i, idx) => ({
            id: `insight-${result.runId}-${idx}`,
            type: i.type,
            description: i.description,
            confidence: 0.8,
          })),
          metrics: result.output.metrics,
          raw: { summary: result.output.summary },
        },
        status: result.status,
        startedAt: new Date(Date.now() - result.duration),
        completedAt: new Date(),
        executionTimeMs: result.duration,
        actionsProposed: result.output.proposedActions?.length || 0,
        errorMessage: result.output.error,
      });

      // Create alerts if any
      if (result.output.alerts && result.output.alerts.length > 0) {
        for (const alert of result.output.alerts) {
          await storage.createAlert({
            agentId: result.runId,
            agentRunId: runRecord.id,
            severity: alert.severity,
            title: alert.title,
            message: alert.message,
            affectedEntities: alert.affectedEntities ? {
              type: alert.affectedEntities.type as "channel" | "segment" | "audience" | "hcp",
              ids: alert.affectedEntities.ids,
              count: alert.affectedEntities.count,
            } : undefined,
            status: "active",
          });
        }
      }

      res.json({
        runId: result.runId,
        status: result.status,
        duration: result.duration,
        output: result.output,
        storedRunId: runRecord.id,
      });
    } catch (error) {
      console.error("Error running agent:", error);
      res.status(500).json({ error: "Failed to run agent" });
    }
  });

  // Get agent run history
  app.get("/api/agents/:type/history", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const agentType = req.params.type;
      const limit = safeParseLimit(req.query, 20);

      const stored = await storage.getAgentDefinitionByType(agentType);
      const runs = await storage.listAgentRuns(stored?.id, limit);

      res.json(runs);
    } catch (error) {
      console.error("Error fetching agent history:", error);
      res.status(500).json({ error: "Failed to fetch agent history" });
    }
  });

  // Get a specific agent run
  app.get("/api/agent-runs/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const run = await storage.getAgentRun(req.params.id);
      if (!run) {
        return res.status(404).json({ error: "Agent run not found" });
      }
      res.json(run);
    } catch (error) {
      console.error("Error fetching agent run:", error);
      res.status(500).json({ error: "Failed to fetch agent run" });
    }
  });

  // ============ Agent Action Endpoints (Approval Queue) ============

  // List agent actions (approval queue)
  app.get("/api/agent-actions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const validStatuses = ["pending", "approved", "rejected", "modified", "auto_approved", "executing", "executed", "failed"] as const;
      const statusParam = req.query.status as string | undefined;
      const status = statusParam && validStatuses.includes(statusParam as typeof validStatuses[number]) ? statusParam as typeof validStatuses[number] : undefined;
      const limit = safeParseLimit(req.query);

      const actions = await storage.listAgentActions(status, limit);
      res.json(actions);
    } catch (error) {
      console.error("Error listing agent actions:", error);
      res.status(500).json({ error: "Failed to list agent actions" });
    }
  });

  // Get pending agent actions
  app.get("/api/agent-actions/pending", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const actions = await storage.getPendingAgentActions();
      res.json(actions);
    } catch (error) {
      console.error("Error fetching pending actions:", error);
      res.status(500).json({ error: "Failed to fetch pending actions" });
    }
  });

  // Get a specific agent action
  app.get("/api/agent-actions/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const action = await storage.getAgentAction(req.params.id);
      if (!action) {
        return res.status(404).json({ error: "Agent action not found" });
      }
      res.json(action);
    } catch (error) {
      console.error("Error fetching agent action:", error);
      res.status(500).json({ error: "Failed to fetch agent action" });
    }
  });

  // Approve an agent action
  app.post("/api/agent-actions/:id/approve", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const userId = req.user?.id || "unknown";
      const modifiedAction = req.body.modifiedAction;

      const action = await storage.approveAgentAction(req.params.id, userId, modifiedAction);
      if (!action) {
        return res.status(404).json({ error: "Agent action not found" });
      }
      res.json(action);
    } catch (error) {
      console.error("Error approving agent action:", error);
      res.status(500).json({ error: "Failed to approve agent action" });
    }
  });

  // Reject an agent action
  app.post("/api/agent-actions/:id/reject", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const userId = req.user?.id || "unknown";
      const reason = req.body.reason;

      const action = await storage.rejectAgentAction(req.params.id, userId, reason);
      if (!action) {
        return res.status(404).json({ error: "Agent action not found" });
      }
      res.json(action);
    } catch (error) {
      console.error("Error rejecting agent action:", error);
      res.status(500).json({ error: "Failed to reject agent action" });
    }
  });

  // Batch approve agent actions
  app.post("/api/agent-actions/batch/approve", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const userId = req.user?.id || "unknown";
      const actionIds = req.body.actionIds as string[];

      if (!actionIds || !Array.isArray(actionIds) || actionIds.length === 0) {
        return res.status(400).json({ error: "actionIds array is required" });
      }

      const result = await approvalWorkflow.batchApprove(actionIds, userId);
      res.json(result);
    } catch (error) {
      console.error("Error batch approving actions:", error);
      res.status(500).json({ error: "Failed to batch approve actions" });
    }
  });

  // Batch reject agent actions
  app.post("/api/agent-actions/batch/reject", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const userId = req.user?.id || "unknown";
      const { actionIds, reason } = req.body;

      if (!actionIds || !Array.isArray(actionIds) || actionIds.length === 0) {
        return res.status(400).json({ error: "actionIds array is required" });
      }

      const result = await approvalWorkflow.batchReject(actionIds, userId, reason);
      res.json(result);
    } catch (error) {
      console.error("Error batch rejecting actions:", error);
      res.status(500).json({ error: "Failed to batch reject actions" });
    }
  });

  // Get approval queue statistics
  app.get("/api/agent-actions/stats", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const stats = await approvalWorkflow.getQueueStats();
      res.json(stats);
    } catch (error) {
      console.error("Error getting queue stats:", error);
      res.status(500).json({ error: "Failed to get queue statistics" });
    }
  });

  // ============ Approval Rules Endpoints ============

  // Get approval rules
  app.get("/api/approval-rules", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const rules = approvalWorkflow.getRules();
      res.json(rules);
    } catch (error) {
      console.error("Error getting approval rules:", error);
      res.status(500).json({ error: "Failed to get approval rules" });
    }
  });

  // Get enabled approval rules
  app.get("/api/approval-rules/enabled", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const rules = approvalWorkflow.getEnabledRules();
      res.json(rules);
    } catch (error) {
      console.error("Error getting enabled approval rules:", error);
      res.status(500).json({ error: "Failed to get enabled approval rules" });
    }
  });

  // Add a new approval rule
  app.post("/api/approval-rules", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const rule = req.body;
      if (!rule.id || !rule.name || !rule.conditions || !rule.action) {
        return res.status(400).json({ error: "Missing required fields: id, name, conditions, action" });
      }

      approvalWorkflow.addRule(rule);
      res.status(201).json(rule);
    } catch (error) {
      console.error("Error adding approval rule:", error);
      res.status(500).json({ error: "Failed to add approval rule" });
    }
  });

  // Update an approval rule
  app.patch("/api/approval-rules/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const updates = req.body;
      const rule = approvalWorkflow.updateRule(req.params.id, updates);
      if (!rule) {
        return res.status(404).json({ error: "Approval rule not found" });
      }
      res.json(rule);
    } catch (error) {
      console.error("Error updating approval rule:", error);
      res.status(500).json({ error: "Failed to update approval rule" });
    }
  });

  // Delete an approval rule
  app.delete("/api/approval-rules/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const deleted = approvalWorkflow.deleteRule(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Approval rule not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting approval rule:", error);
      res.status(500).json({ error: "Failed to delete approval rule" });
    }
  });

  // ============ Orchestrator Endpoints ============

  // Run orchestration cycle
  app.post("/api/orchestrator/run", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const userId = req.user?.id || "unknown";
      const input = req.body || {};

      // Load data for the orchestrator if it needs to run agents
      if (input.agentsToRun?.includes("channel_health_monitor")) {
        const hcps = await storage.getAllHcps();
        channelHealthMonitor.setHcpData(hcps);
      }
      if (input.agentsToRun?.includes("insight_synthesizer")) {
        const [hcps, recentAlerts, recentAgentRuns] = await Promise.all([
          storage.getAllHcps(),
          storage.listAlerts(undefined, 100),
          storage.listAgentRuns(undefined, 50),
        ]);
        const recentSimulations = await storage.getSimulationHistory();
        insightSynthesizer.setData({
          hcps,
          recentAlerts,
          recentAgentRuns,
          recentSimulations: recentSimulations.slice(0, 20),
        });
      }

      const result = await orchestrator.run(input, userId, "on_demand");
      res.json(result);
    } catch (error) {
      console.error("Error running orchestration:", error);
      res.status(500).json({ error: "Failed to run orchestration" });
    }
  });

  // Get orchestrator status
  app.get("/api/orchestrator/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const definition = orchestrator.getDefinition({
        onDemand: true,
        scheduled: { enabled: false },
      });
      const rules = approvalWorkflow.getRules();
      const queueStats = await approvalWorkflow.getQueueStats();

      res.json({
        agent: definition,
        approvalRulesCount: rules.length,
        enabledRulesCount: rules.filter(r => r.enabled).length,
        queueStats,
      });
    } catch (error) {
      console.error("Error getting orchestrator status:", error);
      res.status(500).json({ error: "Failed to get orchestrator status" });
    }
  });

  // ============ Agent Executor Endpoints (Phase 12D.3) ============

  // Get all action capabilities
  app.get("/api/agent-executor/capabilities", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const category = req.query.category as string | undefined;

      if (category) {
        const capabilities = agentExecutor.getCapabilitiesByCategory(category as any);
        return res.json(capabilities);
      }

      res.json(actionCapabilities);
    } catch (error) {
      console.error("Error getting action capabilities:", error);
      res.status(500).json({ error: "Failed to get action capabilities" });
    }
  });

  // Get a specific action capability
  app.get("/api/agent-executor/capabilities/:type", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const capability = agentExecutor.getCapability(req.params.type);
      if (!capability) {
        return res.status(404).json({ error: "Action capability not found" });
      }
      res.json(capability);
    } catch (error) {
      console.error("Error getting action capability:", error);
      res.status(500).json({ error: "Failed to get action capability" });
    }
  });

  // Check if action can be auto-approved
  app.post("/api/agent-executor/check-auto-approve", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { actionType, affectedEntityCount } = req.body;

      if (!actionType) {
        return res.status(400).json({ error: "actionType is required" });
      }

      const canAutoApprove = agentExecutor.canAutoApprove(actionType, affectedEntityCount || 0);
      const capability = agentExecutor.getCapability(actionType);

      res.json({
        actionType,
        canAutoApprove,
        capability: capability ? {
          riskLevel: capability.riskLevel,
          requiresApproval: capability.requiresApproval,
          maxAffectedEntities: capability.maxAffectedEntities,
        } : null,
      });
    } catch (error) {
      console.error("Error checking auto-approve:", error);
      res.status(500).json({ error: "Failed to check auto-approve" });
    }
  });

  // Check rate limit for an action type
  app.get("/api/agent-executor/rate-limit/:type", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const rateCheck = agentExecutor.checkRateLimit(req.params.type);
      const capability = agentExecutor.getCapability(req.params.type);

      res.json({
        actionType: req.params.type,
        ...rateCheck,
        rateLimitPerHour: capability?.rateLimitPerHour,
      });
    } catch (error) {
      console.error("Error checking rate limit:", error);
      res.status(500).json({ error: "Failed to check rate limit" });
    }
  });

  // Check guardrails for an action
  app.post("/api/agent-executor/check-guardrails", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { actionId } = req.body;

      if (!actionId) {
        return res.status(400).json({ error: "actionId is required" });
      }

      const action = await storage.getAgentAction(actionId);
      if (!action) {
        return res.status(404).json({ error: "Agent action not found" });
      }

      const guardrailCheck = await agentExecutor.checkGuardrails(action);
      res.json({
        actionId,
        ...guardrailCheck,
      });
    } catch (error) {
      console.error("Error checking guardrails:", error);
      res.status(500).json({ error: "Failed to check guardrails" });
    }
  });

  // Execute an approved action
  app.post("/api/agent-executor/execute/:actionId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const action = await storage.getAgentAction(req.params.actionId);
      if (!action) {
        return res.status(404).json({ error: "Agent action not found" });
      }

      // Only allow execution of approved or auto_approved actions
      if (action.status !== "approved" && action.status !== "auto_approved") {
        return res.status(400).json({
          error: `Cannot execute action with status '${action.status}'. Action must be approved first.`
        });
      }

      const userId = req.user?.username || "unknown";
      const result = await agentExecutor.execute(action, userId);

      res.json(result);
    } catch (error) {
      console.error("Error executing action:", error);
      res.status(500).json({ error: "Failed to execute action" });
    }
  });

  // Batch execute approved actions
  app.post("/api/agent-executor/execute-batch", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { actionIds } = req.body;

      if (!actionIds || !Array.isArray(actionIds) || actionIds.length === 0) {
        return res.status(400).json({ error: "actionIds array is required" });
      }

      const userId = req.user?.username || "unknown";
      const results = [];

      for (const actionId of actionIds) {
        const action = await storage.getAgentAction(actionId);
        if (!action) {
          results.push({ actionId, success: false, error: "Action not found" });
          continue;
        }

        if (action.status !== "approved" && action.status !== "auto_approved") {
          results.push({
            actionId,
            success: false,
            error: `Cannot execute action with status '${action.status}'`
          });
          continue;
        }

        const result = await agentExecutor.execute(action, userId);
        results.push(result);
      }

      res.json({
        total: actionIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      });
    } catch (error) {
      console.error("Error batch executing actions:", error);
      res.status(500).json({ error: "Failed to batch execute actions" });
    }
  });

  // ============ Prompt Analytics Endpoints (Phase 12D.4) ============

  // Track prompt usage
  app.post("/api/prompt-analytics/usage", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { context, metrics } = req.body;

      if (!context?.promptId || !context?.promptVersion || !context?.promptType) {
        return res.status(400).json({ error: "Missing required context fields" });
      }

      if (metrics?.responseTimeMs === undefined || metrics?.wasSuccessful === undefined) {
        return res.status(400).json({ error: "Missing required metrics fields" });
      }

      const { promptAnalytics } = await import("./services/agents/prompt-analytics");
      const usageId = await promptAnalytics.trackUsage(context, metrics);

      res.json({ usageId });
    } catch (error) {
      console.error("Error tracking prompt usage:", error);
      res.status(500).json({ error: "Failed to track prompt usage" });
    }
  });

  // Get usage statistics for a prompt
  app.get("/api/prompt-analytics/usage/stats/:promptId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { promptId } = req.params;
      const { version, startDate, endDate } = req.query;

      const { promptAnalytics } = await import("./services/agents/prompt-analytics");
      const stats = await promptAnalytics.getUsageStats(promptId, {
        version: version as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.json(stats);
    } catch (error) {
      console.error("Error fetching usage stats:", error);
      res.status(500).json({ error: "Failed to fetch usage stats" });
    }
  });

  // Update satisfaction score for a usage event
  app.patch("/api/prompt-analytics/usage/:usageId/satisfaction", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { usageId } = req.params;
      const { score } = req.body;

      if (typeof score !== "number" || score < 1 || score > 5) {
        return res.status(400).json({ error: "Score must be a number between 1 and 5" });
      }

      const { promptAnalytics } = await import("./services/agents/prompt-analytics");
      await promptAnalytics.updateSatisfaction(usageId, score);

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating satisfaction:", error);
      res.status(500).json({ error: "Failed to update satisfaction" });
    }
  });

  // Record a correction
  app.post("/api/prompt-analytics/corrections", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const submission = req.body;

      if (!submission.promptId || !submission.promptVersion || !submission.correctionType || !submission.severity) {
        return res.status(400).json({ error: "Missing required correction fields" });
      }

      // Set correctedBy from authenticated user if not provided
      if (!submission.correctedBy) {
        submission.correctedBy = req.user?.id || "unknown";
      }

      const { promptAnalytics } = await import("./services/agents/prompt-analytics");
      const correctionId = await promptAnalytics.recordCorrection(submission);

      res.json({ correctionId });
    } catch (error) {
      console.error("Error recording correction:", error);
      res.status(500).json({ error: "Failed to record correction" });
    }
  });

  // Get corrections for a prompt
  app.get("/api/prompt-analytics/corrections/:promptId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { promptId } = req.params;
      const { status, limit } = req.query;

      const { promptAnalytics } = await import("./services/agents/prompt-analytics");
      const corrections = await promptAnalytics.getCorrections(promptId, {
        status: status as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      res.json(corrections);
    } catch (error) {
      console.error("Error fetching corrections:", error);
      res.status(500).json({ error: "Failed to fetch corrections" });
    }
  });

  // Get correction summary for improvement pipeline
  app.get("/api/prompt-analytics/corrections/:promptId/summary", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { promptId } = req.params;
      const { version } = req.query;

      const { promptAnalytics } = await import("./services/agents/prompt-analytics");
      const summary = await promptAnalytics.getCorrectionSummary(promptId, version as string | undefined);

      res.json(summary);
    } catch (error) {
      console.error("Error fetching correction summary:", error);
      res.status(500).json({ error: "Failed to fetch correction summary" });
    }
  });

  // Review a correction
  app.post("/api/prompt-analytics/corrections/:correctionId/review", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { correctionId } = req.params;
      const { status, notes } = req.body;

      if (!["reviewed", "incorporated", "dismissed"].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be: reviewed, incorporated, or dismissed" });
      }

      const reviewedBy = req.user?.id || "unknown";

      const { promptAnalytics } = await import("./services/agents/prompt-analytics");
      await promptAnalytics.reviewCorrection(correctionId, reviewedBy, status, notes);

      res.json({ success: true });
    } catch (error) {
      console.error("Error reviewing correction:", error);
      res.status(500).json({ error: "Failed to review correction" });
    }
  });

  // Create an A/B test
  app.post("/api/prompt-analytics/ab-tests", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const config = req.body;

      if (!config.name || !config.basePromptId || !config.variantPromptId || !config.primaryMetric) {
        return res.status(400).json({ error: "Missing required A/B test configuration fields" });
      }

      // Set createdBy from authenticated user
      config.createdBy = req.user?.id || "unknown";

      const { promptAnalytics } = await import("./services/agents/prompt-analytics");
      const testId = await promptAnalytics.createAbTest(config);

      res.json({ testId });
    } catch (error) {
      console.error("Error creating A/B test:", error);
      res.status(500).json({ error: "Failed to create A/B test" });
    }
  });

  // List A/B tests
  app.get("/api/prompt-analytics/ab-tests", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { status, limit } = req.query;

      const { promptAnalytics } = await import("./services/agents/prompt-analytics");
      const tests = await promptAnalytics.listAbTests({
        status: status as any,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      res.json(tests);
    } catch (error) {
      console.error("Error listing A/B tests:", error);
      res.status(500).json({ error: "Failed to list A/B tests" });
    }
  });

  // Get A/B test by ID
  app.get("/api/prompt-analytics/ab-tests/:testId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { testId } = req.params;

      const { promptAnalytics } = await import("./services/agents/prompt-analytics");
      const test = await promptAnalytics.getAbTest(testId);

      if (!test) {
        return res.status(404).json({ error: "A/B test not found" });
      }

      res.json(test);
    } catch (error) {
      console.error("Error fetching A/B test:", error);
      res.status(500).json({ error: "Failed to fetch A/B test" });
    }
  });

  // Get A/B test results
  app.get("/api/prompt-analytics/ab-tests/:testId/results", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { testId } = req.params;

      const { promptAnalytics } = await import("./services/agents/prompt-analytics");
      const results = await promptAnalytics.getAbTestResults(testId);

      if (!results) {
        return res.status(404).json({ error: "A/B test not found" });
      }

      res.json(results);
    } catch (error) {
      console.error("Error fetching A/B test results:", error);
      res.status(500).json({ error: "Failed to fetch A/B test results" });
    }
  });

  // Start an A/B test
  app.post("/api/prompt-analytics/ab-tests/:testId/start", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { testId } = req.params;

      const { promptAnalytics } = await import("./services/agents/prompt-analytics");
      await promptAnalytics.startAbTest(testId);

      res.json({ success: true });
    } catch (error) {
      console.error("Error starting A/B test:", error);
      res.status(500).json({ error: "Failed to start A/B test" });
    }
  });

  // End an A/B test
  app.post("/api/prompt-analytics/ab-tests/:testId/end", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { testId } = req.params;
      const { winner, rationale } = req.body;

      const { promptAnalytics } = await import("./services/agents/prompt-analytics");
      await promptAnalytics.endAbTest(testId, winner, rationale);

      res.json({ success: true });
    } catch (error) {
      console.error("Error ending A/B test:", error);
      res.status(500).json({ error: "Failed to end A/B test" });
    }
  });

  // Assign user to A/B test group
  app.get("/api/prompt-analytics/ab-tests/:testId/assign", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { testId } = req.params;
      const userId = req.user?.id || "unknown";

      const { promptAnalytics } = await import("./services/agents/prompt-analytics");
      const group = promptAnalytics.assignAbTestGroup(testId, userId);

      res.json({ group });
    } catch (error) {
      console.error("Error assigning A/B test group:", error);
      res.status(500).json({ error: "Failed to assign A/B test group" });
    }
  });

  // Get prompt health dashboard
  app.get("/api/prompt-analytics/health", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { promptAnalytics } = await import("./services/agents/prompt-analytics");
      const dashboard = await promptAnalytics.getHealthDashboard();

      res.json(dashboard);
    } catch (error) {
      console.error("Error fetching health dashboard:", error);
      res.status(500).json({ error: "Failed to fetch health dashboard" });
    }
  });

  // ============ Alert Endpoints ============

  // List alerts
  app.get("/api/alerts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const status = req.query.status as string | undefined;
      const limit = safeParseLimit(req.query);

      const alerts = await storage.listAlerts(status, limit);
      res.json(alerts);
    } catch (error) {
      console.error("Error listing alerts:", error);
      res.status(500).json({ error: "Failed to list alerts" });
    }
  });

  // Get active alert count
  app.get("/api/alerts/count", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const count = await storage.getActiveAlertCount();
      res.json({ count });
    } catch (error) {
      console.error("Error counting alerts:", error);
      res.status(500).json({ error: "Failed to count alerts" });
    }
  });

  // Get a specific alert
  app.get("/api/alerts/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const alert = await storage.getAlert(req.params.id);
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }
      res.json(alert);
    } catch (error) {
      console.error("Error fetching alert:", error);
      res.status(500).json({ error: "Failed to fetch alert" });
    }
  });

  // Acknowledge an alert
  app.post("/api/alerts/:id/acknowledge", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const userId = req.user?.id || "unknown";
      const alert = await storage.acknowledgeAlert(req.params.id, userId);
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }
      res.json(alert);
    } catch (error) {
      console.error("Error acknowledging alert:", error);
      res.status(500).json({ error: "Failed to acknowledge alert" });
    }
  });

  // Dismiss an alert
  app.post("/api/alerts/:id/dismiss", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const userId = req.user?.id || "unknown";
      const alert = await storage.dismissAlert(req.params.id, userId);
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }
      res.json(alert);
    } catch (error) {
      console.error("Error dismissing alert:", error);
      res.status(500).json({ error: "Failed to dismiss alert" });
    }
  });

  // Resolve an alert
  app.post("/api/alerts/:id/resolve", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const alert = await storage.resolveAlert(req.params.id);
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }
      res.json(alert);
    } catch (error) {
      console.error("Error resolving alert:", error);
      res.status(500).json({ error: "Failed to resolve alert" });
    }
  });

  // ============ Scheduler Endpoints ============

  // Get scheduler status
  app.get("/api/scheduler/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const status = agentScheduler.getStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting scheduler status:", error);
      res.status(500).json({ error: "Failed to get scheduler status" });
    }
  });

  // Start the scheduler
  app.post("/api/scheduler/start", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      agentScheduler.start();
      const status = agentScheduler.getStatus();
      res.json({ message: "Scheduler started", status });
    } catch (error) {
      console.error("Error starting scheduler:", error);
      res.status(500).json({ error: "Failed to start scheduler" });
    }
  });

  // Stop the scheduler
  app.post("/api/scheduler/stop", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      agentScheduler.stop();
      const status = agentScheduler.getStatus();
      res.json({ message: "Scheduler stopped", status });
    } catch (error) {
      console.error("Error stopping scheduler:", error);
      res.status(500).json({ error: "Failed to stop scheduler" });
    }
  });

  // Trigger an agent manually
  app.post("/api/scheduler/trigger/:agentType", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const agentType = req.params.agentType;
      await agentScheduler.triggerAgent(agentType);
      res.json({ message: `Agent ${agentType} triggered successfully` });
    } catch (error) {
      console.error("Error triggering agent:", error);
      res.status(500).json({ error: "Failed to trigger agent" });
    }
  });

  // ============ Phase 7A: Constraint Management Endpoints ============

  // Get constraint summary (dashboard view)
  app.get("/api/constraints/summary", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const summary = await constraintManager.getConstraintSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error fetching constraint summary:", error);
      res.status(500).json({ error: "Failed to fetch constraint summary" });
    }
  });

  // Check constraints for a proposed action
  app.post("/api/constraints/check", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const action = req.body;
      if (!action.hcpId || !action.channel || !action.actionType) {
        return res.status(400).json({
          error: "Missing required fields: hcpId, channel, actionType"
        });
      }

      const result = await constraintManager.checkConstraints(action);
      res.json(result);
    } catch (error) {
      console.error("Error checking constraints:", error);
      res.status(500).json({ error: "Failed to check constraints" });
    }
  });

  // ---- Channel Capacity Endpoints ----

  // Get all channel capacity records
  app.get("/api/constraints/capacity", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const records = await constraintManager.getAllChannelCapacity();
      res.json(records);
    } catch (error) {
      console.error("Error fetching channel capacity:", error);
      res.status(500).json({ error: "Failed to fetch channel capacity" });
    }
  });

  // Get capacity for a specific channel
  app.get("/api/constraints/capacity/:channel", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const channel = req.params.channel as Channel;
      const repId = req.query.repId as string | undefined;
      const capacity = await constraintManager.getChannelCapacity(channel, repId);

      if (!capacity) {
        return res.status(404).json({ error: "Capacity record not found" });
      }
      res.json(capacity);
    } catch (error) {
      console.error("Error fetching channel capacity:", error);
      res.status(500).json({ error: "Failed to fetch channel capacity" });
    }
  });

  // Create/update channel capacity
  app.post("/api/constraints/capacity", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const data = req.body;
      if (!data.channel) {
        return res.status(400).json({ error: "channel is required" });
      }

      const record = await constraintManager.upsertChannelCapacity(data);
      res.json(record);
    } catch (error) {
      console.error("Error upserting channel capacity:", error);
      res.status(500).json({ error: "Failed to upsert channel capacity" });
    }
  });

  // Reset capacity counters
  app.post("/api/constraints/capacity/:channel/reset", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const channel = req.params.channel as Channel;
      const period = req.body.period as "daily" | "weekly" | "monthly";

      if (!period || !["daily", "weekly", "monthly"].includes(period)) {
        return res.status(400).json({ error: "period must be daily, weekly, or monthly" });
      }

      await constraintManager.resetCapacity(channel, period);
      res.json({ success: true, channel, period });
    } catch (error) {
      console.error("Error resetting capacity:", error);
      res.status(500).json({ error: "Failed to reset capacity" });
    }
  });

  // ---- HCP Contact Limits Endpoints ----

  // Get all HCP contact limits
  app.get("/api/constraints/contact-limits", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const records = await constraintManager.getAllHcpContactLimits();
      res.json(records);
    } catch (error) {
      console.error("Error fetching contact limits:", error);
      res.status(500).json({ error: "Failed to fetch contact limits" });
    }
  });

  // Check if HCP can be contacted
  app.get("/api/constraints/contact-limits/:hcpId/check", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const hcpId = req.params.hcpId;
      const channel = req.query.channel as Channel;

      if (!channel) {
        return res.status(400).json({ error: "channel query parameter is required" });
      }

      const eligibility = await constraintManager.canContactHcp(hcpId, channel);
      res.json(eligibility);
    } catch (error) {
      console.error("Error checking contact eligibility:", error);
      res.status(500).json({ error: "Failed to check contact eligibility" });
    }
  });

  // Record a contact with HCP
  app.post("/api/constraints/contact-limits/:hcpId/record", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const hcpId = req.params.hcpId;
      const channel = req.body.channel as Channel;

      if (!channel) {
        return res.status(400).json({ error: "channel is required in body" });
      }

      await constraintManager.recordContact(hcpId, channel);
      res.json({ success: true, hcpId, channel });
    } catch (error) {
      console.error("Error recording contact:", error);
      res.status(500).json({ error: "Failed to record contact" });
    }
  });

  // Update HCP contact limits
  app.patch("/api/constraints/contact-limits/:hcpId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const hcpId = req.params.hcpId;
      const updates = req.body;

      const record = await constraintManager.updateHcpContactLimits(hcpId, updates);
      if (!record) {
        return res.status(404).json({ error: "Contact limits record not found" });
      }
      res.json(record);
    } catch (error) {
      console.error("Error updating contact limits:", error);
      res.status(500).json({ error: "Failed to update contact limits" });
    }
  });

  // ---- Compliance Windows Endpoints ----

  // Get all compliance windows
  app.get("/api/constraints/compliance-windows", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const windows = await constraintManager.getAllComplianceWindows();
      res.json(windows);
    } catch (error) {
      console.error("Error fetching compliance windows:", error);
      res.status(500).json({ error: "Failed to fetch compliance windows" });
    }
  });

  // Get upcoming compliance windows
  app.get("/api/constraints/compliance-windows/upcoming", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const daysAhead = req.query.days ? parseInt(req.query.days as string, 10) : 30;
      const windows = await constraintManager.getUpcomingWindows(daysAhead);
      res.json(windows);
    } catch (error) {
      console.error("Error fetching upcoming windows:", error);
      res.status(500).json({ error: "Failed to fetch upcoming windows" });
    }
  });

  // Check if channel is in blackout
  app.get("/api/constraints/compliance-windows/blackout-check", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const channel = req.query.channel as Channel;
      const dateStr = req.query.date as string | undefined;
      const hcpId = req.query.hcpId as string | undefined;
      const specialty = req.query.specialty as string | undefined;

      if (!channel) {
        return res.status(400).json({ error: "channel query parameter is required" });
      }

      const date = dateStr ? new Date(dateStr) : new Date();
      const inBlackout = await constraintManager.isInBlackout(channel, date, hcpId, specialty);

      res.json({
        inBlackout,
        channel,
        date: date.toISOString(),
        hcpId,
        specialty
      });
    } catch (error) {
      console.error("Error checking blackout:", error);
      res.status(500).json({ error: "Failed to check blackout" });
    }
  });

  // Create compliance window
  app.post("/api/constraints/compliance-windows", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const data = req.body;
      if (!data.name || !data.windowType || !data.startDate || !data.endDate) {
        return res.status(400).json({
          error: "Missing required fields: name, windowType, startDate, endDate"
        });
      }

      const userId = req.user?.username || "unknown";
      const window = await constraintManager.createComplianceWindow({
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        createdBy: userId,
      });
      res.status(201).json(window);
    } catch (error) {
      console.error("Error creating compliance window:", error);
      res.status(500).json({ error: "Failed to create compliance window" });
    }
  });

  // Update compliance window
  app.patch("/api/constraints/compliance-windows/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const id = req.params.id;
      const updates = { ...req.body };

      if (updates.startDate) updates.startDate = new Date(updates.startDate);
      if (updates.endDate) updates.endDate = new Date(updates.endDate);

      const window = await constraintManager.updateComplianceWindow(id, updates);
      if (!window) {
        return res.status(404).json({ error: "Compliance window not found" });
      }
      res.json(window);
    } catch (error) {
      console.error("Error updating compliance window:", error);
      res.status(500).json({ error: "Failed to update compliance window" });
    }
  });

  // Delete compliance window
  app.delete("/api/constraints/compliance-windows/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const deleted = await constraintManager.deleteComplianceWindow(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Compliance window not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting compliance window:", error);
      res.status(500).json({ error: "Failed to delete compliance window" });
    }
  });

  // ---- Budget Allocations Endpoints ----

  // Get all budget allocations
  app.get("/api/constraints/budget", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const allocations = await constraintManager.getAllBudgetAllocations();
      res.json(allocations);
    } catch (error) {
      console.error("Error fetching budget allocations:", error);
      res.status(500).json({ error: "Failed to fetch budget allocations" });
    }
  });

  // Get budget status
  app.get("/api/constraints/budget/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const campaignId = req.query.campaignId as string | undefined;
      const channel = req.query.channel as Channel | undefined;

      const status = await constraintManager.getBudgetStatus(campaignId, channel);
      res.json(status);
    } catch (error) {
      console.error("Error fetching budget status:", error);
      res.status(500).json({ error: "Failed to fetch budget status" });
    }
  });

  // Create budget allocation
  app.post("/api/constraints/budget", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const data = req.body;
      if (!data.periodType || !data.periodStart || !data.periodEnd || data.allocatedAmount === undefined) {
        return res.status(400).json({
          error: "Missing required fields: periodType, periodStart, periodEnd, allocatedAmount"
        });
      }

      const userId = req.user?.username || "unknown";
      const allocation = await constraintManager.createBudgetAllocation({
        ...data,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
        createdBy: userId,
      });
      res.status(201).json(allocation);
    } catch (error) {
      console.error("Error creating budget allocation:", error);
      res.status(500).json({ error: "Failed to create budget allocation" });
    }
  });

  // Update budget allocation
  app.patch("/api/constraints/budget/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const id = req.params.id;
      const updates = { ...req.body };

      if (updates.periodStart) updates.periodStart = new Date(updates.periodStart);
      if (updates.periodEnd) updates.periodEnd = new Date(updates.periodEnd);

      const allocation = await constraintManager.updateBudgetAllocation(id, updates);
      if (!allocation) {
        return res.status(404).json({ error: "Budget allocation not found" });
      }
      res.json(allocation);
    } catch (error) {
      console.error("Error updating budget allocation:", error);
      res.status(500).json({ error: "Failed to update budget allocation" });
    }
  });

  // Commit budget
  app.post("/api/constraints/budget/:id/commit", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const id = req.params.id;
      const amount = req.body.amount;

      if (amount === undefined || amount <= 0) {
        return res.status(400).json({ error: "amount must be a positive number" });
      }

      const success = await constraintManager.commitBudget(amount, id);
      if (!success) {
        return res.status(400).json({ error: "Insufficient budget or allocation not found" });
      }
      res.json({ success: true, committed: amount });
    } catch (error) {
      console.error("Error committing budget:", error);
      res.status(500).json({ error: "Failed to commit budget" });
    }
  });

  // Release committed budget
  app.post("/api/constraints/budget/:id/release", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const id = req.params.id;
      const amount = req.body.amount;

      if (amount === undefined || amount <= 0) {
        return res.status(400).json({ error: "amount must be a positive number" });
      }

      await constraintManager.releaseBudget(amount, id);
      res.json({ success: true, released: amount });
    } catch (error) {
      console.error("Error releasing budget:", error);
      res.status(500).json({ error: "Failed to release budget" });
    }
  });

  // Record spend
  app.post("/api/constraints/budget/:id/spend", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const id = req.params.id;
      const { amount, releaseCommitment } = req.body;

      if (amount === undefined || amount <= 0) {
        return res.status(400).json({ error: "amount must be a positive number" });
      }

      await constraintManager.recordSpend(amount, id, releaseCommitment !== false);
      res.json({ success: true, spent: amount });
    } catch (error) {
      console.error("Error recording spend:", error);
      res.status(500).json({ error: "Failed to record spend" });
    }
  });

  // Delete budget allocation
  app.delete("/api/constraints/budget/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const deleted = await constraintManager.deleteBudgetAllocation(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Budget allocation not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting budget allocation:", error);
      res.status(500).json({ error: "Failed to delete budget allocation" });
    }
  });

  // ---- Territory Assignment Endpoints ----

  // Get all territory assignments
  app.get("/api/constraints/territories", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const assignments = await constraintManager.getAllTerritoryAssignments();
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching territory assignments:", error);
      res.status(500).json({ error: "Failed to fetch territory assignments" });
    }
  });

  // Get reps assigned to an HCP
  app.get("/api/constraints/territories/hcp/:hcpId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const hcpId = req.params.hcpId;
      const reps = await constraintManager.getAssignedReps(hcpId);
      res.json(reps);
    } catch (error) {
      console.error("Error fetching assigned reps:", error);
      res.status(500).json({ error: "Failed to fetch assigned reps" });
    }
  });

  // Check if rep can contact HCP
  app.get("/api/constraints/territories/check", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const repId = req.query.repId as string;
      const hcpId = req.query.hcpId as string;

      if (!repId || !hcpId) {
        return res.status(400).json({ error: "repId and hcpId query parameters are required" });
      }

      const canContact = await constraintManager.canRepContactHcp(repId, hcpId);
      res.json({ canContact, repId, hcpId });
    } catch (error) {
      console.error("Error checking territory assignment:", error);
      res.status(500).json({ error: "Failed to check territory assignment" });
    }
  });

  // Create territory assignment
  app.post("/api/constraints/territories", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const data = req.body;
      if (!data.repId || !data.repName || !data.hcpId || !data.assignmentType) {
        return res.status(400).json({
          error: "Missing required fields: repId, repName, hcpId, assignmentType"
        });
      }

      const assignment = await constraintManager.createTerritoryAssignment({
        ...data,
        effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : new Date(),
        effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : undefined,
      });
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error creating territory assignment:", error);
      res.status(500).json({ error: "Failed to create territory assignment" });
    }
  });

  // Update territory assignment
  app.patch("/api/constraints/territories/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const id = req.params.id;
      const updates = { ...req.body };

      if (updates.effectiveFrom) updates.effectiveFrom = new Date(updates.effectiveFrom);
      if (updates.effectiveTo) updates.effectiveTo = new Date(updates.effectiveTo);

      const assignment = await constraintManager.updateTerritoryAssignment(id, updates);
      if (!assignment) {
        return res.status(404).json({ error: "Territory assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      console.error("Error updating territory assignment:", error);
      res.status(500).json({ error: "Failed to update territory assignment" });
    }
  });

  // Delete territory assignment
  app.delete("/api/constraints/territories/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const deleted = await constraintManager.deleteTerritoryAssignment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Territory assignment not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting territory assignment:", error);
      res.status(500).json({ error: "Failed to delete territory assignment" });
    }
  });

  // ============ Phase 7B: Outcome Stream & Attribution Endpoints ============

  // Record a single outcome with automatic attribution
  app.post("/api/outcomes", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parseResult = recordOutcomeWithAttributionRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid outcome data",
          details: parseResult.error.errors,
        });
      }

      const result = await attributionEngine.recordOutcome(parseResult.data);

      await storage.logAction({
        action: "outcome_recorded",
        entityType: "outcome_event",
        entityId: result.outcomeId,
        details: {
          hcpId: parseResult.data.hcpId,
          outcomeType: parseResult.data.outcomeType,
          attributedActions: result.attribution.totalContributingActions,
        },
      });

      res.json(result);
    } catch (error) {
      console.error("Error recording outcome:", error);
      res.status(500).json({ error: "Failed to record outcome" });
    }
  });

  // Batch outcome ingestion
  app.post("/api/outcomes/batch", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parseResult = batchOutcomeIngestionRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid batch data",
          details: parseResult.error.errors,
        });
      }

      const results = [];
      const errors = [];

      for (const outcome of parseResult.data.outcomes) {
        try {
          const result = await attributionEngine.recordOutcome(outcome);
          results.push(result);
        } catch (err) {
          errors.push({
            outcome,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }

      await storage.logAction({
        action: "batch_outcomes_ingested",
        entityType: "outcome_event",
        details: {
          sourceSystem: parseResult.data.sourceSystem,
          totalSubmitted: parseResult.data.outcomes.length,
          successful: results.length,
          failed: errors.length,
        },
      });

      res.json({
        processed: results.length,
        failed: errors.length,
        results,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error("Error processing batch outcomes:", error);
      res.status(500).json({ error: "Failed to process batch outcomes" });
    }
  });

  // Webhook endpoint for external systems
  app.post("/api/outcomes/webhook", async (req, res) => {
    try {
      const parseResult = webhookOutcomePayloadSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid webhook payload",
          details: parseResult.error.errors,
        });
      }

      const payload = parseResult.data;

      // Resolve HCP ID
      let hcpId = payload.hcpId;
      if (!hcpId && payload.npi) {
        const hcp = await storage.getHcpByNpi(payload.npi);
        hcpId = hcp?.id;
      }

      if (!hcpId) {
        return res.status(400).json({ error: "Could not resolve HCP from payload" });
      }

      // Map external event type to outcome type
      const outcomeType = mapWebhookEventToOutcomeType(payload.sourceSystem, payload.eventType);
      if (!outcomeType) {
        return res.status(400).json({ error: `Unknown event type: ${payload.eventType}` });
      }

      const result = await attributionEngine.recordOutcome({
        hcpId,
        outcomeType,
        channel: getChannelFromOutcomeType(outcomeType),
        eventDate: payload.timestamp,
        outcomeValue: payload.data.value as number | undefined,
        sourceSystem: payload.sourceSystem,
        sourceEventId: payload.sourceEventId,
      });

      await storage.logAction({
        action: "webhook_outcome_received",
        entityType: "outcome_event",
        entityId: result.outcomeId,
        details: {
          sourceSystem: payload.sourceSystem,
          sourceEventId: payload.sourceEventId,
          eventType: payload.eventType,
        },
      });

      res.json({ success: true, outcomeId: result.outcomeId });
    } catch (error) {
      console.error("Error processing webhook:", error);
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  // Get outcome velocity metrics
  app.get("/api/outcomes/velocity", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const periodStart = req.query.periodStart
        ? new Date(req.query.periodStart as string)
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: last 7 days
      const periodEnd = req.query.periodEnd
        ? new Date(req.query.periodEnd as string)
        : new Date();

      const velocity = await attributionEngine.getOutcomeVelocity(periodStart, periodEnd);
      res.json(velocity);
    } catch (error) {
      console.error("Error getting outcome velocity:", error);
      res.status(500).json({ error: "Failed to get outcome velocity" });
    }
  });

  // Get outcomes for an HCP
  app.get("/api/outcomes/hcp/:hcpId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const outcomes = await storage.getOutcomeEventsByHcp(req.params.hcpId);
      res.json(outcomes);
    } catch (error) {
      console.error("Error getting HCP outcomes:", error);
      res.status(500).json({ error: "Failed to get HCP outcomes" });
    }
  });

  // ============ Attribution Config Endpoints ============

  // Get all attribution configs
  app.get("/api/attribution-config", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const configs = await storage.getAttributionConfigs();
      res.json(configs);
    } catch (error) {
      console.error("Error getting attribution configs:", error);
      res.status(500).json({ error: "Failed to get attribution configs" });
    }
  });

  // Get attribution config for a channel
  app.get("/api/attribution-config/:channel", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const config = await attributionEngine.getAttributionConfig(req.params.channel);
      if (!config) {
        return res.status(404).json({ error: "No config found for channel" });
      }
      res.json(config);
    } catch (error) {
      console.error("Error getting attribution config:", error);
      res.status(500).json({ error: "Failed to get attribution config" });
    }
  });

  // Create or update attribution config
  app.post("/api/attribution-config", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parseResult = updateAttributionConfigRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid config data",
          details: parseResult.error.errors,
        });
      }

      const { channel, ...config } = parseResult.data;
      await attributionEngine.upsertAttributionConfig(channel, config);

      await storage.logAction({
        action: "attribution_config_updated",
        entityType: "attribution_config",
        details: { channel },
      });

      const updated = await attributionEngine.getAttributionConfig(channel);
      res.json(updated);
    } catch (error) {
      console.error("Error updating attribution config:", error);
      res.status(500).json({ error: "Failed to update attribution config" });
    }
  });

  // ============ Prediction Staleness Endpoints ============

  // Get staleness report
  app.get("/api/staleness/report", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const report = await attributionEngine.getStalenessReport();
      res.json(report);
    } catch (error) {
      console.error("Error getting staleness report:", error);
      res.status(500).json({ error: "Failed to get staleness report" });
    }
  });

  // Get staleness for specific HCP
  app.get("/api/staleness/hcp/:hcpId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const records = await storage.getPredictionStalenessForHcp(req.params.hcpId);
      res.json(records);
    } catch (error) {
      console.error("Error getting HCP staleness:", error);
      res.status(500).json({ error: "Failed to get HCP staleness" });
    }
  });

  // Calculate and refresh staleness for an HCP/prediction type
  app.post("/api/staleness/calculate", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { hcpId, predictionType } = req.body;
      if (!hcpId || !predictionType) {
        return res.status(400).json({ error: "hcpId and predictionType required" });
      }

      const score = await attributionEngine.calculateStaleness(hcpId, predictionType);
      res.json({ hcpId, predictionType, stalenessScore: score });
    } catch (error) {
      console.error("Error calculating staleness:", error);
      res.status(500).json({ error: "Failed to calculate staleness" });
    }
  });

  // Mark prediction as needing refresh
  app.post("/api/staleness/mark-refresh", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { hcpId, predictionType, reason } = req.body;
      if (!hcpId || !predictionType) {
        return res.status(400).json({ error: "hcpId and predictionType required" });
      }

      await attributionEngine.markRefreshNeeded(
        hcpId,
        predictionType,
        reason || "Manual refresh requested"
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking refresh needed:", error);
      res.status(500).json({ error: "Failed to mark refresh needed" });
    }
  });

  // Get HCPs needing prediction refresh
  app.get("/api/staleness/needs-refresh", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const predictionType = req.query.predictionType as string | undefined;
      const limit = safeParseLimit(req.query, 100);

      const hcps = await storage.getHcpsNeedingRefresh(predictionType, limit);
      res.json(hcps);
    } catch (error) {
      console.error("Error getting HCPs needing refresh:", error);
      res.status(500).json({ error: "Failed to get HCPs needing refresh" });
    }
  });

  // ============ Attribution Records Endpoints ============

  // Get attributions for an outcome
  app.get("/api/attributions/outcome/:outcomeId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const attributions = await storage.getAttributionsForOutcome(req.params.outcomeId);
      res.json(attributions);
    } catch (error) {
      console.error("Error getting outcome attributions:", error);
      res.status(500).json({ error: "Failed to get outcome attributions" });
    }
  });

  // Get attributions for a stimulus
  app.get("/api/attributions/stimulus/:stimulusId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const attributions = await storage.getAttributionsForStimulus(req.params.stimulusId);
      res.json(attributions);
    } catch (error) {
      console.error("Error getting stimulus attributions:", error);
      res.status(500).json({ error: "Failed to get stimulus attributions" });
    }
  });

  // ============ Phase 7C: Uncertainty & Exploration Endpoints ============

  // Get uncertainty for a specific HCP
  app.get("/api/uncertainty/:hcpId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const channel = req.query.channel as string | undefined;
      const predictionType = (req.query.predictionType as string) || "engagement";

      const metrics = await uncertaintyCalculator.calculateUncertainty(
        req.params.hcpId,
        channel,
        predictionType
      );
      res.json(metrics);
    } catch (error) {
      console.error("Error getting uncertainty:", error);
      res.status(500).json({ error: "Failed to get uncertainty metrics" });
    }
  });

  // Batch uncertainty calculation
  app.post("/api/uncertainty/batch", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parseResult = batchUncertaintyRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: parseResult.error.errors,
        });
      }

      const { hcpIds, channel } = parseResult.data;
      const results = await uncertaintyCalculator.calculateBatchUncertainty(hcpIds, channel);
      res.json(results);
    } catch (error) {
      console.error("Error calculating batch uncertainty:", error);
      res.status(500).json({ error: "Failed to calculate batch uncertainty" });
    }
  });

  // Get uncertainty summary
  app.get("/api/uncertainty/summary", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const summary = await uncertaintyCalculator.getUncertaintySummary();
      res.json(summary);
    } catch (error) {
      console.error("Error getting uncertainty summary:", error);
      res.status(500).json({ error: "Failed to get uncertainty summary" });
    }
  });

  // Assess data quality for an HCP
  app.get("/api/uncertainty/:hcpId/data-quality", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const report = await uncertaintyCalculator.assessDataQuality(req.params.hcpId);
      res.json(report);
    } catch (error) {
      console.error("Error assessing data quality:", error);
      res.status(500).json({ error: "Failed to assess data quality" });
    }
  });

  // Detect feature drift for an HCP
  app.get("/api/uncertainty/:hcpId/drift", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const since = req.query.since ? new Date(req.query.since as string) : undefined;
      const report = await uncertaintyCalculator.detectFeatureDrift(req.params.hcpId, since);
      res.json(report);
    } catch (error) {
      console.error("Error detecting drift:", error);
      res.status(500).json({ error: "Failed to detect feature drift" });
    }
  });

  // ============ Exploration Strategy Endpoints ============

  // Get exploration decision for HCP/channel
  app.post("/api/exploration/decision", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parseResult = explorationDecisionRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: parseResult.error.errors,
        });
      }

      const { hcpId, channel } = parseResult.data;
      const decision = await explorationStrategy.shouldExplore(hcpId, channel);
      res.json(decision);
    } catch (error) {
      console.error("Error getting exploration decision:", error);
      res.status(500).json({ error: "Failed to get exploration decision" });
    }
  });

  // Suggest exploration action for HCP
  app.get("/api/exploration/suggest/:hcpId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const action = await explorationStrategy.suggestExplorationAction(req.params.hcpId);
      if (!action) {
        return res.status(404).json({ error: "No exploration action suggested" });
      }
      res.json(action);
    } catch (error) {
      console.error("Error suggesting exploration:", error);
      res.status(500).json({ error: "Failed to suggest exploration action" });
    }
  });

  // Get exploration statistics
  app.get("/api/exploration/statistics", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const stats = await uncertaintyCalculator.getExplorationStatistics();
      res.json(stats);
    } catch (error) {
      console.error("Error getting exploration statistics:", error);
      res.status(500).json({ error: "Failed to get exploration statistics" });
    }
  });

  // Get exploration config
  app.get("/api/exploration/config", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const channel = req.query.channel as string | undefined;
      const config = await explorationStrategy.getExplorationConfig(channel);
      res.json(config || { message: "No config found, using defaults" });
    } catch (error) {
      console.error("Error getting exploration config:", error);
      res.status(500).json({ error: "Failed to get exploration config" });
    }
  });

  // Update exploration config
  app.post("/api/exploration/config", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parseResult = updateExplorationConfigRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid config",
          details: parseResult.error.errors,
        });
      }

      const config = await explorationStrategy.upsertExplorationConfig(parseResult.data);

      await storage.logAction({
        action: "exploration_config_updated",
        entityType: "exploration_config",
        details: { channel: parseResult.data.channel },
      });

      res.json(config);
    } catch (error) {
      console.error("Error updating exploration config:", error);
      res.status(500).json({ error: "Failed to update exploration config" });
    }
  });

  // Adapt exploration rate
  app.post("/api/exploration/adapt-rate", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const channel = req.body.channel as string | undefined;
      const newRate = await explorationStrategy.adaptExplorationRate(channel);
      res.json({ newEpsilon: newRate, channel: channel || "global" });
    } catch (error) {
      console.error("Error adapting exploration rate:", error);
      res.status(500).json({ error: "Failed to adapt exploration rate" });
    }
  });

  // Calculate exploration budget
  app.post("/api/exploration/budget", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { totalBudget, explorationRate } = req.body;
      if (typeof totalBudget !== "number") {
        return res.status(400).json({ error: "totalBudget must be a number" });
      }

      const budget = explorationStrategy.calculateExplorationBudget(
        totalBudget,
        explorationRate
      );
      res.json({
        totalBudget,
        explorationRate: explorationRate || 0.1,
        explorationBudget: budget,
        exploitationBudget: totalBudget - budget,
      });
    } catch (error) {
      console.error("Error calculating exploration budget:", error);
      res.status(500).json({ error: "Failed to calculate exploration budget" });
    }
  });

  // ============================================================================
  // PHASE 7D: CAMPAIGN COORDINATION ENDPOINTS
  // ============================================================================

  // Get campaign summary
  app.get("/api/campaigns/summary", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const summary = await campaignCoordinator.getCampaignSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error getting campaign summary:", error);
      res.status(500).json({ error: "Failed to get campaign summary" });
    }
  });

  // List campaigns
  app.get("/api/campaigns", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { status, brand, businessUnit } = req.query;
      const pagination = safeParseLimitOffset(req.query);
      const validStatuses = ["draft", "active", "paused", "completed", "cancelled"] as const;
      const statusValue = status && typeof status === "string" && validStatuses.includes(status as typeof validStatuses[number])
        ? (status as typeof validStatuses[number])
        : undefined;
      const campaigns = await campaignCoordinator.listCampaigns({
        status: statusValue,
        brand: brand as string,
        businessUnit: businessUnit as string,
        limit: pagination.limit,
        offset: pagination.offset,
      });
      res.json(campaigns);
    } catch (error) {
      console.error("Error listing campaigns:", error);
      res.status(500).json({ error: "Failed to list campaigns" });
    }
  });

  // Get single campaign
  app.get("/api/campaigns/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const campaign = await campaignCoordinator.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("Error getting campaign:", error);
      res.status(500).json({ error: "Failed to get campaign" });
    }
  });

  // Create campaign
  app.post("/api/campaigns", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parsed = createCampaignRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const campaign = await campaignCoordinator.createCampaign({
        ...parsed.data,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
        createdBy: req.user?.username,
      });
      res.status(201).json(campaign);
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(500).json({ error: "Failed to create campaign" });
    }
  });

  // Update campaign
  app.patch("/api/campaigns/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const campaign = await campaignCoordinator.updateCampaign(req.params.id, {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      });
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("Error updating campaign:", error);
      res.status(500).json({ error: "Failed to update campaign" });
    }
  });

  // Activate campaign
  app.post("/api/campaigns/:id/activate", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const campaign = await campaignCoordinator.activateCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("Error activating campaign:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to activate campaign" });
    }
  });

  // Pause campaign
  app.post("/api/campaigns/:id/pause", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const campaign = await campaignCoordinator.pauseCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("Error pausing campaign:", error);
      res.status(500).json({ error: "Failed to pause campaign" });
    }
  });

  // Complete campaign
  app.post("/api/campaigns/:id/complete", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const campaign = await campaignCoordinator.completeCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("Error completing campaign:", error);
      res.status(500).json({ error: "Failed to complete campaign" });
    }
  });

  // Delete campaign
  app.delete("/api/campaigns/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const deleted = await campaignCoordinator.deleteCampaign(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to delete campaign" });
    }
  });

  // Get campaign reservations
  app.get("/api/campaigns/:id/reservations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { status } = req.query;
      const reservations = await campaignCoordinator.getCampaignReservations(
        req.params.id,
        status as any
      );
      res.json(reservations);
    } catch (error) {
      console.error("Error getting campaign reservations:", error);
      res.status(500).json({ error: "Failed to get campaign reservations" });
    }
  });

  // Detect conflicts for campaign
  app.get("/api/campaigns/:id/conflicts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const conflicts = await campaignCoordinator.detectCampaignConflicts(req.params.id);
      res.json(conflicts);
    } catch (error) {
      console.error("Error detecting campaign conflicts:", error);
      res.status(500).json({ error: "Failed to detect campaign conflicts" });
    }
  });

  // ============================================================================
  // RESERVATION ENDPOINTS
  // ============================================================================

  // Reserve HCP for campaign
  app.post("/api/reservations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parsed = reserveHcpRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const result = await campaignCoordinator.reserveHcp(
        parsed.data.campaignId,
        parsed.data.hcpId,
        parsed.data.channel,
        new Date(parsed.data.reservedFrom),
        new Date(parsed.data.reservedUntil),
        {
          reservationType: parsed.data.reservationType,
          plannedActionDate: parsed.data.plannedActionDate ? new Date(parsed.data.plannedActionDate) : undefined,
          canPreempt: parsed.data.canPreempt,
        }
      );
      res.status(result.success ? 201 : 409).json(result);
    } catch (error) {
      console.error("Error creating reservation:", error);
      res.status(500).json({ error: "Failed to create reservation" });
    }
  });

  // Batch reserve HCPs
  app.post("/api/reservations/batch", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parsed = batchReserveRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const result = await campaignCoordinator.batchReserveHcps(
        parsed.data.campaignId,
        parsed.data.reservations.map(r => ({
          ...r,
          reservedFrom: new Date(r.reservedFrom),
          reservedUntil: new Date(r.reservedUntil),
          plannedActionDate: r.plannedActionDate ? new Date(r.plannedActionDate) : undefined,
        }))
      );
      res.json(result);
    } catch (error) {
      console.error("Error batch reserving HCPs:", error);
      res.status(500).json({ error: "Failed to batch reserve HCPs" });
    }
  });

  // Check availability for HCP on channel
  app.post("/api/reservations/check-availability", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parsed = checkAvailabilityRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const result = await campaignCoordinator.getAvailableSlots(
        parsed.data.hcpId,
        parsed.data.channel,
        {
          start: new Date(parsed.data.startDate),
          end: new Date(parsed.data.endDate),
        },
        parsed.data.excludeCampaignId
      );
      res.json(result);
    } catch (error) {
      console.error("Error checking availability:", error);
      res.status(500).json({ error: "Failed to check availability" });
    }
  });

  // Release reservation
  app.post("/api/reservations/:id/release", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const released = await campaignCoordinator.releaseReservation(req.params.id);
      if (!released) {
        return res.status(404).json({ error: "Reservation not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error releasing reservation:", error);
      res.status(500).json({ error: "Failed to release reservation" });
    }
  });

  // Mark reservation as executed
  app.post("/api/reservations/:id/execute", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      await campaignCoordinator.markReservationExecuted(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking reservation executed:", error);
      res.status(500).json({ error: "Failed to mark reservation executed" });
    }
  });

  // Get HCP active reservations
  app.get("/api/hcps/:hcpId/reservations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const reservations = await campaignCoordinator.getActiveReservations(req.params.hcpId);
      res.json(reservations);
    } catch (error) {
      console.error("Error getting HCP reservations:", error);
      res.status(500).json({ error: "Failed to get HCP reservations" });
    }
  });

  // Get HCP campaign view
  app.get("/api/hcps/:hcpId/campaigns", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const view = await campaignCoordinator.getHcpCampaignView(req.params.hcpId);
      res.json(view);
    } catch (error) {
      console.error("Error getting HCP campaign view:", error);
      res.status(500).json({ error: "Failed to get HCP campaign view" });
    }
  });

  // ============================================================================
  // CONFLICT ENDPOINTS
  // ============================================================================

  // List unresolved conflicts
  app.get("/api/conflicts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { campaignId } = req.query;
      const conflicts = await campaignCoordinator.listUnresolvedConflicts(campaignId as string);
      res.json(conflicts);
    } catch (error) {
      console.error("Error listing conflicts:", error);
      res.status(500).json({ error: "Failed to list conflicts" });
    }
  });

  // Detect HCP conflicts
  app.get("/api/hcps/:hcpId/conflicts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { startDate, endDate } = req.query;
      const dateRange = startDate && endDate
        ? { start: new Date(startDate as string), end: new Date(endDate as string) }
        : undefined;
      const conflicts = await campaignCoordinator.detectHcpConflicts(req.params.hcpId, dateRange);
      res.json(conflicts);
    } catch (error) {
      console.error("Error detecting HCP conflicts:", error);
      res.status(500).json({ error: "Failed to detect HCP conflicts" });
    }
  });

  // Resolve conflict
  app.post("/api/conflicts/:id/resolve", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parsed = resolveConflictRequestSchema.safeParse({
        conflictId: req.params.id,
        ...req.body,
      });
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const conflict = await campaignCoordinator.resolveConflict(
        parsed.data.conflictId,
        parsed.data.resolution,
        req.user?.username || "unknown",
        parsed.data.resolutionNotes
      );
      if (!conflict) {
        return res.status(404).json({ error: "Conflict not found" });
      }
      res.json(conflict);
    } catch (error) {
      console.error("Error resolving conflict:", error);
      res.status(500).json({ error: "Failed to resolve conflict" });
    }
  });

  // Auto-resolve conflicts
  app.post("/api/conflicts/auto-resolve", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parsed = autoResolveConflictsRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const report = await campaignCoordinator.autoResolveConflicts(
        parsed.data.campaignId,
        parsed.data.strategy
      );
      res.json(report);
    } catch (error) {
      console.error("Error auto-resolving conflicts:", error);
      res.status(500).json({ error: "Failed to auto-resolve conflicts" });
    }
  });

  // Expire stale reservations (admin endpoint)
  app.post("/api/reservations/expire-stale", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const count = await campaignCoordinator.expireStaleReservations();
      res.json({ expiredCount: count });
    } catch (error) {
      console.error("Error expiring stale reservations:", error);
      res.status(500).json({ error: "Failed to expire stale reservations" });
    }
  });

  // ============================================================================
  // PHASE 7F: PORTFOLIO OPTIMIZATION ENDPOINTS
  // ============================================================================

  // List optimization problems
  app.get("/api/optimization/problems", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { status } = req.query;
      const problems = await portfolioOptimizer.listProblems({
        status: status as string | undefined,
        limit: safeParseLimit(req.query),
      });
      res.json(problems);
    } catch (error) {
      console.error("Error listing optimization problems:", error);
      res.status(500).json({ error: "Failed to list optimization problems" });
    }
  });

  // Create optimization problem
  app.post("/api/optimization/problems", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parsed = createOptimizationProblemRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const problem = await portfolioOptimizer.createProblem(parsed.data);
      res.status(201).json(problem);
    } catch (error) {
      console.error("Error creating optimization problem:", error);
      res.status(500).json({ error: "Failed to create optimization problem" });
    }
  });

  // Get optimization problem
  app.get("/api/optimization/problems/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const problem = await portfolioOptimizer.getProblem(req.params.id);
      if (!problem) {
        return res.status(404).json({ error: "Problem not found" });
      }
      res.json(problem);
    } catch (error) {
      console.error("Error getting optimization problem:", error);
      res.status(500).json({ error: "Failed to get optimization problem" });
    }
  });

  // Delete optimization problem
  app.delete("/api/optimization/problems/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      await portfolioOptimizer.deleteProblem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting optimization problem:", error);
      res.status(500).json({ error: "Failed to delete optimization problem" });
    }
  });

  // Solve optimization problem
  app.post("/api/optimization/problems/:id/solve", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parsed = solveOptimizationRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const result = await portfolioOptimizer.solve(req.params.id, parsed.data);
      res.json(result);
    } catch (error) {
      console.error("Error solving optimization problem:", error);
      res.status(500).json({ error: "Failed to solve optimization problem" });
    }
  });

  // Get optimization result
  app.get("/api/optimization/results/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const result = await portfolioOptimizer.getResult(req.params.id);
      if (!result) {
        return res.status(404).json({ error: "Result not found" });
      }
      res.json(result);
    } catch (error) {
      console.error("Error getting optimization result:", error);
      res.status(500).json({ error: "Failed to get optimization result" });
    }
  });

  // Get allocations for a result
  app.get("/api/optimization/results/:id/allocations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { channel } = req.query;
      const pagination = safeParseLimitOffset(req.query);
      const allocations = await portfolioOptimizer.getAllocations(req.params.id, {
        channel: channel as Channel | undefined,
        limit: pagination.limit,
        offset: pagination.offset,
      });
      res.json(allocations);
    } catch (error) {
      console.error("Error getting allocations:", error);
      res.status(500).json({ error: "Failed to get allocations" });
    }
  });

  // Export optimization result
  app.get("/api/optimization/results/:id/export", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const format = (req.query.format as "csv" | "json") || "json";
      const data = await portfolioOptimizer.exportPlan(req.params.id, format);

      if (format === "csv") {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=allocation-${req.params.id}.csv`);
      }
      res.send(data);
    } catch (error) {
      console.error("Error exporting result:", error);
      res.status(500).json({ error: "Failed to export result" });
    }
  });

  // What-if analysis
  app.post("/api/optimization/results/:id/what-if", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parsed = whatIfRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const result = await portfolioOptimizer.whatIf(req.params.id, parsed.data);
      res.json(result);
    } catch (error) {
      console.error("Error running what-if analysis:", error);
      res.status(500).json({ error: "Failed to run what-if analysis" });
    }
  });

  // Sensitivity analysis
  app.get("/api/optimization/results/:id/sensitivity", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const report = await portfolioOptimizer.analyzeSensitivity(req.params.id);
      res.json(report);
    } catch (error) {
      console.error("Error analyzing sensitivity:", error);
      res.status(500).json({ error: "Failed to analyze sensitivity" });
    }
  });

  // ============================================================================
  // PHASE 7F: EXECUTION PLAN ENDPOINTS
  // ============================================================================

  // List execution plans
  app.get("/api/execution-plans", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { status, resultId } = req.query;
      const validStatuses = ["draft", "scheduled", "executing", "paused", "completed", "cancelled"] as const;
      const statusValue = status && typeof status === "string" && validStatuses.includes(status as typeof validStatuses[number])
        ? (status as typeof validStatuses[number])
        : undefined;
      const plans = await executionPlanner.listPlans({
        status: statusValue,
        resultId: resultId as string | undefined,
        limit: safeParseLimit(req.query),
      });
      res.json(plans);
    } catch (error) {
      console.error("Error listing execution plans:", error);
      res.status(500).json({ error: "Failed to list execution plans" });
    }
  });

  // Create execution plan
  app.post("/api/execution-plans", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parsed = createExecutionPlanRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const plan = await executionPlanner.createPlan(
        parsed.data.resultId,
        parsed.data.name,
        parsed.data.description,
        parsed.data.scheduledStartAt
      );
      res.status(201).json(plan);
    } catch (error) {
      console.error("Error creating execution plan:", error);
      res.status(500).json({ error: "Failed to create execution plan" });
    }
  });

  // Get execution plan
  app.get("/api/execution-plans/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const plan = await executionPlanner.getPlan(req.params.id);
      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }
      res.json(plan);
    } catch (error) {
      console.error("Error getting execution plan:", error);
      res.status(500).json({ error: "Failed to get execution plan" });
    }
  });

  // Delete execution plan
  app.delete("/api/execution-plans/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      await executionPlanner.deletePlan(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting execution plan:", error);
      res.status(500).json({ error: "Failed to delete execution plan" });
    }
  });

  // Get plan progress
  app.get("/api/execution-plans/:id/progress", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const progress = await executionPlanner.getPlanProgress(req.params.id);
      res.json(progress);
    } catch (error) {
      console.error("Error getting plan progress:", error);
      res.status(500).json({ error: "Failed to get plan progress" });
    }
  });

  // Get scheduled actions
  app.get("/api/execution-plans/:id/schedule", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const plan = await executionPlanner.getPlan(req.params.id);
      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }
      const schedule = await executionPlanner.scheduleActions(plan.resultId);
      res.json(schedule);
    } catch (error) {
      console.error("Error getting schedule:", error);
      res.status(500).json({ error: "Failed to get schedule" });
    }
  });

  // Book resources for plan
  app.post("/api/execution-plans/:id/book", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const result = await executionPlanner.bookResources(req.params.id);
      res.json(result);
    } catch (error) {
      console.error("Error booking resources:", error);
      res.status(500).json({ error: "Failed to book resources" });
    }
  });

  // Release resources for plan
  app.post("/api/execution-plans/:id/release", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      await executionPlanner.releaseResources(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error releasing resources:", error);
      res.status(500).json({ error: "Failed to release resources" });
    }
  });

  // Execute plan
  app.post("/api/execution-plans/:id/execute", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const report = await executionPlanner.executePlan(req.params.id);
      res.json(report);
    } catch (error) {
      console.error("Error executing plan:", error);
      res.status(500).json({ error: "Failed to execute plan" });
    }
  });

  // Pause plan
  app.post("/api/execution-plans/:id/pause", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      await executionPlanner.pausePlan(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error pausing plan:", error);
      res.status(500).json({ error: "Failed to pause plan" });
    }
  });

  // Resume plan
  app.post("/api/execution-plans/:id/resume", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      await executionPlanner.resumePlan(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error resuming plan:", error);
      res.status(500).json({ error: "Failed to resume plan" });
    }
  });

  // Cancel plan
  app.post("/api/execution-plans/:id/cancel", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      await executionPlanner.cancelPlan(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error cancelling plan:", error);
      res.status(500).json({ error: "Failed to cancel plan" });
    }
  });

  // Get execution report
  app.get("/api/execution-plans/:id/report", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const report = await executionPlanner.getExecutionReport(req.params.id);
      res.json(report);
    } catch (error) {
      console.error("Error getting execution report:", error);
      res.status(500).json({ error: "Failed to get execution report" });
    }
  });

  // Suggest rebalance
  app.get("/api/execution-plans/:id/suggest-rebalance", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const suggestion = await executionPlanner.suggestRebalance(req.params.id);
      res.json(suggestion);
    } catch (error) {
      console.error("Error suggesting rebalance:", error);
      res.status(500).json({ error: "Failed to suggest rebalance" });
    }
  });

  // Rebalance plan
  app.post("/api/execution-plans/:id/rebalance", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parsed = rebalancePlanRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const plan = await executionPlanner.rebalancePlan(
        req.params.id,
        parsed.data.trigger as RebalanceTrigger,
        parsed.data.reason
      );
      res.json(plan);
    } catch (error) {
      console.error("Error rebalancing plan:", error);
      res.status(500).json({ error: "Failed to rebalance plan" });
    }
  });

  // ============================================================================
  // PHASE 12A: COMPETITIVE ORBIT ENDPOINTS
  // ============================================================================

  // Get all competitors
  app.get("/api/competitors", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const activeOnly = req.query.activeOnly !== "false";
      const competitors = await competitiveStorage.getAllCompetitors(activeOnly);
      res.json(competitors);
    } catch (error) {
      console.error("Error fetching competitors:", error);
      res.status(500).json({ error: "Failed to fetch competitors" });
    }
  });

  // Get competitor by ID
  app.get("/api/competitors/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const competitor = await competitiveStorage.getCompetitorById(req.params.id);
      if (!competitor) {
        return res.status(404).json({ error: "Competitor not found" });
      }
      res.json(competitor);
    } catch (error) {
      console.error("Error fetching competitor:", error);
      res.status(500).json({ error: "Failed to fetch competitor" });
    }
  });

  // Create competitor
  app.post("/api/competitors", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parsed = createCompetitorRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }
      const competitor = await competitiveStorage.createCompetitor(parsed.data);
      res.status(201).json(competitor);
    } catch (error) {
      console.error("Error creating competitor:", error);
      res.status(500).json({ error: "Failed to create competitor" });
    }
  });

  // Get competitive orbit visualization data
  app.get("/api/competitive/orbit-data", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const orbitData = await competitiveStorage.getCompetitiveOrbitData();
      res.json(orbitData);
    } catch (error) {
      console.error("Error fetching competitive orbit data:", error);
      res.status(500).json({ error: "Failed to fetch competitive orbit data" });
    }
  });

  // Get competitive signals for an HCP
  app.get("/api/hcps/:id/competitive-signals", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const signals = await competitiveStorage.getCompetitiveSignalsForHcp(req.params.id);
      res.json(signals);
    } catch (error) {
      console.error("Error fetching competitive signals:", error);
      res.status(500).json({ error: "Failed to fetch competitive signals" });
    }
  });

  // Get HCP competitive summary (aggregated)
  app.get("/api/hcps/:id/competitive-summary", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const summary = await competitiveStorage.getHcpCompetitiveSummary(req.params.id);
      if (!summary) {
        return res.status(404).json({ error: "HCP not found" });
      }
      res.json(summary);
    } catch (error) {
      console.error("Error fetching competitive summary:", error);
      res.status(500).json({ error: "Failed to fetch competitive summary" });
    }
  });

  // Record competitive signal
  app.post("/api/competitive/signals", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parsed = recordCompetitiveSignalRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const signal = await competitiveStorage.recordCompetitiveSignal({
        ...parsed.data,
        measurementDate: parsed.data.measurementDate ? new Date(parsed.data.measurementDate) : new Date(),
      });
      res.status(201).json(signal);
    } catch (error) {
      console.error("Error recording competitive signal:", error);
      res.status(500).json({ error: "Failed to record competitive signal" });
    }
  });

  // Filter competitive signals
  app.post("/api/competitive/signals/filter", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parsed = competitiveFilterSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const signals = await competitiveStorage.getCompetitiveSignalsByFilter(parsed.data);
      res.json(signals);
    } catch (error) {
      console.error("Error filtering competitive signals:", error);
      res.status(500).json({ error: "Failed to filter competitive signals" });
    }
  });

  // Seed competitive data (for development/demo)
  app.post("/api/competitive/seed", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const result = await competitiveStorage.seedCompetitorData();
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Error seeding competitive data:", error);
      res.status(500).json({ error: "Failed to seed competitive data" });
    }
  });

  // ============================================================================
  // Phase 12A: Competitive Insight Engine Endpoints
  // ============================================================================

  // Generate competitive alerts for an HCP
  app.get("/api/hcps/:id/competitive-alerts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const hcpId = req.params.id;
      const engagementTrend = req.query.engagementTrend as "improving" | "stable" | "declining" | undefined;

      const summary = await competitiveStorage.getHcpCompetitiveSummary(hcpId);
      if (!summary || summary.signals.length === 0) {
        return res.json({ alerts: [], message: "No competitive data for this HCP" });
      }

      const alerts = competitiveInsightEngine.generateAlertsForHcp(summary, engagementTrend);
      res.json({ alerts, hcpId, totalAlerts: alerts.length });
    } catch (error) {
      console.error("Error generating competitive alerts:", error);
      res.status(500).json({ error: "Failed to generate competitive alerts" });
    }
  });

  // Get competitive flag for an HCP
  app.get("/api/hcps/:id/competitive-flag", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const hcpId = req.params.id;
      const engagementTrend = req.query.engagementTrend as "improving" | "stable" | "declining" | undefined;

      const summary = await competitiveStorage.getHcpCompetitiveSummary(hcpId);
      if (!summary || summary.signals.length === 0) {
        return res.json({ flag: null, message: "No competitive data for this HCP" });
      }

      const flag = competitiveInsightEngine.getCompetitiveFlag(summary, engagementTrend);
      res.json({ flag, hcpId, overallCpi: summary.overallCpi, riskLevel: summary.riskLevel });
    } catch (error) {
      console.error("Error getting competitive flag:", error);
      res.status(500).json({ error: "Failed to get competitive flag" });
    }
  });

  // Get NBA competitive adjustment for an HCP
  app.get("/api/hcps/:id/competitive-nba-adjustment", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const hcpId = req.params.id;

      const summary = await competitiveStorage.getHcpCompetitiveSummary(hcpId);
      if (!summary || summary.signals.length === 0) {
        return res.json({
          adjustment: { urgencyBoost: 0, confidenceAdjustment: 0 },
          message: "No competitive data for this HCP",
        });
      }

      const adjustment = competitiveInsightEngine.getNBACompetitiveAdjustment(summary);
      res.json({ adjustment, hcpId, overallCpi: summary.overallCpi });
    } catch (error) {
      console.error("Error getting NBA competitive adjustment:", error);
      res.status(500).json({ error: "Failed to get NBA competitive adjustment" });
    }
  });

  // Get portfolio-level competitive insights
  app.get("/api/competitive/portfolio-insights", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const insights = await competitiveInsightEngine.generatePortfolioInsights();
      res.json(insights);
    } catch (error) {
      console.error("Error generating portfolio insights:", error);
      res.status(500).json({ error: "Failed to generate portfolio insights" });
    }
  });

  // Export competitive signals as CSV
  app.get("/api/competitive/export/signals", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const signals = await competitiveStorage.getCompetitiveSignalsByFilter({});
      const csv = competitiveSignalsToCSV(signals);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=competitive-signals.csv");
      res.send(csv);
    } catch (error) {
      console.error("Error exporting competitive signals:", error);
      res.status(500).json({ error: "Failed to export competitive signals" });
    }
  });

  // Export competitive alerts as CSV for a specific HCP
  app.get("/api/competitive/export/alerts/:hcpId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const hcpId = req.params.hcpId;
      const summary = await competitiveStorage.getHcpCompetitiveSummary(hcpId);

      if (!summary || summary.signals.length === 0) {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=competitive-alerts-${hcpId}.csv`);
        return res.send("No competitive data for this HCP");
      }

      const alerts = competitiveInsightEngine.generateAlertsForHcp(summary);
      const csv = competitiveAlertsToCSV(alerts);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=competitive-alerts-${hcpId}.csv`);
      res.send(csv);
    } catch (error) {
      console.error("Error exporting competitive alerts:", error);
      res.status(500).json({ error: "Failed to export competitive alerts" });
    }
  });

  // Export all portfolio alerts as CSV
  app.get("/api/competitive/export/portfolio-alerts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      // Get all HCPs with competitive data
      const orbitData = await competitiveStorage.getCompetitiveOrbitData();
      if (!orbitData) {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=portfolio-alerts.csv");
        return res.send("No competitive data available");
      }

      // Generate alerts for all HCPs with signals
      const allSignals = await competitiveStorage.getCompetitiveSignalsByFilter({});

      // Group signals by HCP
      const hcpSignalMap = new Map<string, typeof allSignals>();
      for (const signal of allSignals) {
        const existing = hcpSignalMap.get(signal.hcpId) || [];
        existing.push(signal);
        hcpSignalMap.set(signal.hcpId, existing);
      }

      // Generate alerts for each HCP
      const allAlerts: Awaited<ReturnType<typeof competitiveInsightEngine.generateAlertsForHcp>> = [];
      for (const [hcpId] of Array.from(hcpSignalMap.entries())) {
        const summary = await competitiveStorage.getHcpCompetitiveSummary(hcpId);
        if (summary) {
          const alerts = competitiveInsightEngine.generateAlertsForHcp(summary);
          allAlerts.push(...alerts);
        }
      }

      const csv = competitiveAlertsToCSV(allAlerts);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=portfolio-alerts.csv");
      res.send(csv);
    } catch (error) {
      console.error("Error exporting portfolio alerts:", error);
      res.status(500).json({ error: "Failed to export portfolio alerts" });
    }
  });

  // ============================================================================
  // Phase 12A.4: TA-Specific Filtering & Governance
  // ============================================================================

  // Get therapeutic area summary (competitor counts by TA)
  app.get("/api/competitive/therapeutic-areas", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const summary = await competitiveStorage.getTherapeuticAreaSummary();
      res.json({ therapeuticAreas: summary, total: summary.length });
    } catch (error) {
      console.error("Error getting therapeutic area summary:", error);
      res.status(500).json({ error: "Failed to get therapeutic area summary" });
    }
  });

  // Get competitors by therapeutic area
  app.get("/api/competitive/by-ta/:therapeuticArea/competitors", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { therapeuticArea } = req.params;
      const activeOnly = req.query.activeOnly !== "false";
      const competitors = await competitiveStorage.getCompetitorsByTherapeuticArea(therapeuticArea, activeOnly);
      res.json({ competitors, therapeuticArea, total: competitors.length });
    } catch (error) {
      console.error("Error getting competitors by TA:", error);
      res.status(500).json({ error: "Failed to get competitors by therapeutic area" });
    }
  });

  // Get competitive signals by therapeutic area
  app.get("/api/competitive/by-ta/:therapeuticArea/signals", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { therapeuticArea } = req.params;
      const minCpi = req.query.minCpi ? parseFloat(req.query.minCpi as string) : undefined;
      const maxCpi = req.query.maxCpi ? parseFloat(req.query.maxCpi as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 500;

      const signals = await competitiveStorage.getCompetitiveSignalsByTherapeuticArea(therapeuticArea, {
        minCpi,
        maxCpi,
        limit,
      });

      res.json({ signals, therapeuticArea, total: signals.length });
    } catch (error) {
      console.error("Error getting signals by TA:", error);
      res.status(500).json({ error: "Failed to get competitive signals by therapeutic area" });
    }
  });

  // Get competitive orbit data by therapeutic area
  app.get("/api/competitive/by-ta/:therapeuticArea/orbit-data", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { therapeuticArea } = req.params;
      const orbitData = await competitiveStorage.getCompetitiveOrbitDataByTA(therapeuticArea);
      res.json({ ...orbitData, therapeuticArea });
    } catch (error) {
      console.error("Error getting orbit data by TA:", error);
      res.status(500).json({ error: "Failed to get competitive orbit data by therapeutic area" });
    }
  });

  // Get alert thresholds configuration
  app.get("/api/competitive/config/thresholds", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Return the default thresholds from the insight engine
    // In a production system, these would be stored in the database
    res.json({
      thresholds: {
        criticalCpi: 75,
        warningCpi: 50,
        cpiTrendThreshold: 10,
        engagementAsymmetryThreshold: 20,
        shareErosionThreshold: 5,
      },
      description: {
        criticalCpi: "CPI above this value triggers critical alerts",
        warningCpi: "CPI above this value triggers warning alerts",
        cpiTrendThreshold: "QoQ change percentage that triggers trending alerts",
        engagementAsymmetryThreshold: "Engagement score difference that triggers alerts",
        shareErosionThreshold: "Share loss percentage that triggers erosion alerts",
      },
    });
  });

  // Export competitive signals by therapeutic area as CSV
  app.get("/api/competitive/export/by-ta/:therapeuticArea/signals", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { therapeuticArea } = req.params;
      const signals = await competitiveStorage.getCompetitiveSignalsByTherapeuticArea(therapeuticArea);
      const csv = competitiveSignalsToCSV(signals);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=competitive-signals-${therapeuticArea.toLowerCase().replace(/\s+/g, "-")}.csv`);
      res.send(csv);
    } catch (error) {
      console.error("Error exporting signals by TA:", error);
      res.status(500).json({ error: "Failed to export competitive signals by therapeutic area" });
    }
  });

  // ============================================================================
  // Phase 12A.3: Competitive Alert Configuration Endpoints
  // ============================================================================

  // Get all alert configurations
  app.get("/api/competitive/alert-configs", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const activeOnly = req.query.activeOnly === "true";
      const configs = await competitiveStorage.getAllAlertConfigs(activeOnly);
      res.json({ configs, total: configs.length });
    } catch (error) {
      console.error("Error getting alert configs:", error);
      res.status(500).json({ error: "Failed to get alert configurations" });
    }
  });

  // Get alert configuration by ID
  app.get("/api/competitive/alert-configs/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const config = await competitiveStorage.getAlertConfigById(req.params.id);
      if (!config) {
        return res.status(404).json({ error: "Alert configuration not found" });
      }
      res.json(config);
    } catch (error) {
      console.error("Error getting alert config:", error);
      res.status(500).json({ error: "Failed to get alert configuration" });
    }
  });

  // Create a new alert configuration
  app.post("/api/competitive/alert-configs", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parsed = createCompetitiveAlertConfigSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const config = await competitiveStorage.createAlertConfig(parsed.data);
      res.status(201).json(config);
    } catch (error) {
      console.error("Error creating alert config:", error);
      res.status(500).json({ error: "Failed to create alert configuration" });
    }
  });

  // Update an alert configuration
  app.patch("/api/competitive/alert-configs/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parsed = createCompetitiveAlertConfigSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const config = await competitiveStorage.updateAlertConfig(req.params.id, parsed.data);
      if (!config) {
        return res.status(404).json({ error: "Alert configuration not found" });
      }
      res.json(config);
    } catch (error) {
      console.error("Error updating alert config:", error);
      res.status(500).json({ error: "Failed to update alert configuration" });
    }
  });

  // Delete an alert configuration
  app.delete("/api/competitive/alert-configs/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const deleted = await competitiveStorage.deleteAlertConfig(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Alert configuration not found" });
      }
      res.json({ success: true, message: "Alert configuration deleted" });
    } catch (error) {
      console.error("Error deleting alert config:", error);
      res.status(500).json({ error: "Failed to delete alert configuration" });
    }
  });

  // Resolve alert thresholds for a given context
  app.get("/api/competitive/resolve-thresholds", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const therapeuticArea = req.query.therapeuticArea as string | undefined;
      const competitorId = req.query.competitorId as string | undefined;
      const thresholds = await competitiveStorage.resolveAlertThresholds(therapeuticArea, competitorId);
      res.json(thresholds);
    } catch (error) {
      console.error("Error resolving thresholds:", error);
      res.status(500).json({ error: "Failed to resolve alert thresholds" });
    }
  });

  // Generate alerts with configurable thresholds
  app.get("/api/hcps/:id/competitive-alerts/configurable", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const summary = await competitiveStorage.getHcpCompetitiveSummary(req.params.id);
      if (!summary) {
        return res.status(404).json({ error: "HCP competitive summary not found" });
      }

      const engagementTrend = req.query.engagementTrend as "improving" | "stable" | "declining" | undefined;
      const therapeuticArea = req.query.therapeuticArea as string | undefined;
      const competitorId = req.query.competitorId as string | undefined;

      const result = await competitiveInsightEngine.generateAlertsWithConfigurableThresholds(
        summary,
        engagementTrend,
        therapeuticArea,
        competitorId
      );

      res.json(result);
    } catch (error) {
      console.error("Error generating configurable alerts:", error);
      res.status(500).json({ error: "Failed to generate alerts with configurable thresholds" });
    }
  });

  // Get alert configs by therapeutic area
  app.get("/api/competitive/alert-configs/by-ta/:therapeuticArea", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const configs = await competitiveStorage.getAlertConfigsByTherapeuticArea(req.params.therapeuticArea);
      res.json({ configs, total: configs.length });
    } catch (error) {
      console.error("Error getting alert configs by TA:", error);
      res.status(500).json({ error: "Failed to get alert configurations by therapeutic area" });
    }
  });

  // ============================================================================
  // Phase 12A.4: Competitive Governance Endpoints
  // ============================================================================

  // Get competitive audit trail
  app.get("/api/competitive/governance/audit-trail", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const options: {
        entityType?: string;
        entityId?: string;
        action?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
      } = {};

      if (req.query.entityType) options.entityType = req.query.entityType as string;
      if (req.query.entityId) options.entityId = req.query.entityId as string;
      if (req.query.action) options.action = req.query.action as string;
      if (req.query.startDate) options.startDate = new Date(req.query.startDate as string);
      if (req.query.endDate) options.endDate = new Date(req.query.endDate as string);
      if (req.query.limit) options.limit = parseInt(req.query.limit as string, 10);

      const auditTrail = await competitiveStorage.getCompetitiveAuditTrail(options);
      res.json({ auditTrail, total: auditTrail.length });
    } catch (error) {
      console.error("Error getting competitive audit trail:", error);
      res.status(500).json({ error: "Failed to get competitive audit trail" });
    }
  });

  // Get governance summary
  app.get("/api/competitive/governance/summary", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const summary = await competitiveStorage.getGovernanceSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error getting governance summary:", error);
      res.status(500).json({ error: "Failed to get governance summary" });
    }
  });

  // Log a competitive claim review
  app.post("/api/competitive/governance/review", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { claimType, entityId, reviewAction, reviewNotes } = req.body;

      if (!claimType || !entityId || !reviewAction) {
        return res.status(400).json({
          error: "Missing required fields: claimType, entityId, reviewAction",
        });
      }

      const validClaimTypes = ["cpi_threshold", "alert_generated", "signal_recorded"];
      const validReviewActions = ["approved", "rejected", "modified"];

      if (!validClaimTypes.includes(claimType)) {
        return res.status(400).json({
          error: `Invalid claimType. Must be one of: ${validClaimTypes.join(", ")}`,
        });
      }

      if (!validReviewActions.includes(reviewAction)) {
        return res.status(400).json({
          error: `Invalid reviewAction. Must be one of: ${validReviewActions.join(", ")}`,
        });
      }

      const userId = (req.user as any)?.id;
      await competitiveStorage.logClaimReview(
        claimType,
        entityId,
        reviewAction,
        reviewNotes,
        userId
      );

      res.json({ success: true, message: "Review logged successfully" });
    } catch (error) {
      console.error("Error logging claim review:", error);
      res.status(500).json({ error: "Failed to log claim review" });
    }
  });

  // Get therapeutic area summary (for governance UI)
  app.get("/api/competitive/therapeutic-areas/summary", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const summary = await competitiveStorage.getTherapeuticAreaSummary();
      res.json({ therapeuticAreas: summary });
    } catch (error) {
      console.error("Error getting therapeutic area summary:", error);
      res.status(500).json({ error: "Failed to get therapeutic area summary" });
    }
  });

  // ============================================================================
  // Phase 12B: Message Saturation Index (MSI) Endpoints
  // ============================================================================

  // Get all message themes
  app.get("/api/message-themes", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const activeOnly = req.query.activeOnly !== "false";
      const themes = await messageSaturationStorage.getAllMessageThemes(activeOnly);
      res.json({ themes, total: themes.length });
    } catch (error) {
      console.error("Error getting message themes:", error);
      res.status(500).json({ error: "Failed to get message themes" });
    }
  });

  // Get message theme by ID
  app.get("/api/message-themes/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const theme = await messageSaturationStorage.getMessageThemeById(req.params.id);
      if (!theme) {
        return res.status(404).json({ error: "Message theme not found" });
      }
      res.json(theme);
    } catch (error) {
      console.error("Error getting message theme:", error);
      res.status(500).json({ error: "Failed to get message theme" });
    }
  });

  // Create a new message theme
  app.post("/api/message-themes", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parsed = createMessageThemeRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const theme = await messageSaturationStorage.createMessageTheme(parsed.data);
      res.status(201).json(theme);
    } catch (error) {
      console.error("Error creating message theme:", error);
      res.status(500).json({ error: "Failed to create message theme" });
    }
  });

  // Get message themes by category
  app.get("/api/message-themes/category/:category", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const themes = await messageSaturationStorage.getMessageThemesByCategory(req.params.category);
      res.json({ themes, total: themes.length });
    } catch (error) {
      console.error("Error getting message themes by category:", error);
      res.status(500).json({ error: "Failed to get message themes" });
    }
  });

  // Record message exposure for an HCP
  app.post("/api/message-exposures", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parsed = recordMessageExposureRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const exposure = await messageSaturationStorage.recordMessageExposure(parsed.data);
      res.status(201).json(exposure);
    } catch (error) {
      console.error("Error recording message exposure:", error);
      res.status(500).json({ error: "Failed to record message exposure" });
    }
  });

  // Get message exposures for an HCP
  app.get("/api/hcps/:id/message-exposures", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const exposures = await messageSaturationStorage.getHcpMessageExposures(req.params.id);
      res.json({ exposures, total: exposures.length });
    } catch (error) {
      console.error("Error getting HCP message exposures:", error);
      res.status(500).json({ error: "Failed to get message exposures" });
    }
  });

  // Get message saturation summary for an HCP
  app.get("/api/hcps/:id/message-saturation-summary", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const summary = await messageSaturationStorage.getHcpMessageSaturationSummary(req.params.id);
      if (!summary) {
        return res.json({ summary: null, message: "No message exposure data for this HCP" });
      }
      res.json({ summary });
    } catch (error) {
      console.error("Error getting HCP message saturation summary:", error);
      res.status(500).json({ error: "Failed to get message saturation summary" });
    }
  });

  // Filter message exposures
  app.post("/api/message-exposures/filter", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parsed = messageSaturationFilterSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid filter", details: parsed.error.errors });
      }

      const exposures = await messageSaturationStorage.getMessageExposuresByFilter(parsed.data);
      res.json({ exposures, total: exposures.length });
    } catch (error) {
      console.error("Error filtering message exposures:", error);
      res.status(500).json({ error: "Failed to filter message exposures" });
    }
  });

  // Get message saturation heatmap data (for visualization)
  app.get("/api/message-saturation/heatmap-data", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const heatmapData = await messageSaturationStorage.getMessageSaturationHeatmapData();
      res.json(heatmapData);
    } catch (error) {
      console.error("Error getting message saturation heatmap data:", error);
      res.status(500).json({ error: "Failed to get heatmap data" });
    }
  });

  // Seed message saturation data (for development/demo)
  app.post("/api/message-saturation/seed", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const result = await messageSaturationStorage.seedMessageSaturationData();
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Error seeding message saturation data:", error);
      res.status(500).json({ error: "Failed to seed message saturation data" });
    }
  });

  // ============================================================================
  // PHASE 12B.3: SATURATION-AWARE NBA ENDPOINTS
  // ============================================================================

  // Generate saturation-aware NBA for a single HCP
  app.get("/api/hcps/:id/saturation-aware-nba", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const hcpId = req.params.id;
      const hcp = await storage.getHcpById(hcpId);
      if (!hcp) {
        return res.status(404).json({ error: "HCP not found" });
      }

      const saturationSummary = await messageSaturationStorage.getHcpMessageSaturationSummary(hcpId);
      const allThemes = await messageSaturationStorage.getAllMessageThemes(true);

      const nba = generateSaturationAwareNBA(hcp, saturationSummary || null, allThemes);
      res.json(nba);
    } catch (error) {
      console.error("Error generating saturation-aware NBA:", error);
      res.status(500).json({ error: "Failed to generate saturation-aware NBA" });
    }
  });

  // Generate saturation-aware NBAs for multiple HCPs
  app.post("/api/nbas/saturation-aware", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { hcpIds, limit, prioritizeLowSaturation = true } = req.body;

      // Get HCPs
      let hcps;
      if (hcpIds && hcpIds.length > 0) {
        hcps = await Promise.all(hcpIds.map((id: string) => storage.getHcpById(id)));
        hcps = hcps.filter(Boolean);
      } else {
        const allHcps = await storage.getAllHcps();
        hcps = allHcps.slice(0, 100); // Limit to 100 for performance
      }

      // Get saturation summaries for all HCPs
      const saturationSummaries = new Map<string, any>();
      for (const hcp of hcps) {
        const summary = await messageSaturationStorage.getHcpMessageSaturationSummary(hcp.id);
        saturationSummaries.set(hcp.id, summary || null);
      }

      // Get all themes
      const allThemes = await messageSaturationStorage.getAllMessageThemes(true);

      // Generate NBAs
      const nbas = generateSaturationAwareNBAs(hcps, saturationSummaries, allThemes);
      const prioritized = prioritizeSaturationAwareNBAs(nbas, limit, prioritizeLowSaturation);
      const summary = getSaturationAwareNBASummary(prioritized);

      res.json({
        nbas: prioritized,
        summary,
      });
    } catch (error) {
      console.error("Error generating saturation-aware NBAs:", error);
      res.status(500).json({ error: "Failed to generate saturation-aware NBAs" });
    }
  });

  // Get saturation warnings for an HCP
  app.get("/api/hcps/:id/saturation-warnings", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const hcpId = req.params.id;
      const exposures = await messageSaturationStorage.getHcpMessageExposures(hcpId);
      const warnings = generateHcpSaturationWarnings(exposures);

      res.json({
        hcpId,
        warnings,
        summary: {
          total: warnings.length,
          critical: warnings.filter((w) => w.severity === "critical").length,
          warning: warnings.filter((w) => w.severity === "warning").length,
          info: warnings.filter((w) => w.severity === "info").length,
        },
      });
    } catch (error) {
      console.error("Error getting saturation warnings:", error);
      res.status(500).json({ error: "Failed to get saturation warnings" });
    }
  });

  // Simulate theme pause for an HCP
  app.post("/api/hcps/:id/simulate-theme-pause", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const hcpId = req.params.id;
      const { themeId, pauseDays = 30 } = req.body;

      if (!themeId) {
        return res.status(400).json({ error: "themeId is required" });
      }

      // Get the exposure for this HCP-theme combination
      const exposures = await messageSaturationStorage.getHcpMessageExposures(hcpId);
      const exposure = exposures.find((e) => e.messageThemeId === themeId);

      if (!exposure) {
        return res.status(404).json({ error: "No exposure found for this HCP-theme combination" });
      }

      const simulation = simulateThemePause(exposure, pauseDays);
      const optimalDays = calculateOptimalPauseDuration(exposure.msi ?? 0);

      res.json({
        simulation,
        optimalPauseDays: optimalDays,
      });
    } catch (error) {
      console.error("Error simulating theme pause:", error);
      res.status(500).json({ error: "Failed to simulate theme pause" });
    }
  });

  // Get recommended themes for an HCP
  app.get("/api/hcps/:id/recommended-themes", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const hcpId = req.params.id;
      const saturationSummary = await messageSaturationStorage.getHcpMessageSaturationSummary(hcpId);

      if (!saturationSummary) {
        // No saturation data - all themes are recommended
        const allThemes = await messageSaturationStorage.getAllMessageThemes(true);
        return res.json({
          recommended: allThemes.map((t) => ({
            theme: t,
            msi: 0,
            reason: "No previous exposure - fresh opportunity",
          })),
          avoid: [],
        });
      }

      const allThemes = await messageSaturationStorage.getAllMessageThemes(true);
      const recommendations = getRecommendedThemes(saturationSummary, allThemes);

      res.json(recommendations);
    } catch (error) {
      console.error("Error getting recommended themes:", error);
      res.status(500).json({ error: "Failed to get recommended themes" });
    }
  });

  // Check if a theme is blocked for an HCP
  app.get("/api/hcps/:hcpId/themes/:themeId/blocked", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { hcpId, themeId } = req.params;
      const saturationSummary = await messageSaturationStorage.getHcpMessageSaturationSummary(hcpId);
      const result = isThemeBlocked(themeId, saturationSummary || null);

      res.json(result);
    } catch (error) {
      console.error("Error checking theme block status:", error);
      res.status(500).json({ error: "Failed to check theme block status" });
    }
  });

  // ============================================================================
  // PHASE 12B.4: CAMPAIGN PLANNING ENDPOINTS
  // ============================================================================

  // Get all MSI benchmarks
  app.get("/api/msi-benchmarks", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const activeOnly = req.query.activeOnly !== "false";
      const benchmarks = await campaignPlanningService.getAllBenchmarks(activeOnly);
      res.json(benchmarks);
    } catch (error) {
      console.error("Error getting MSI benchmarks:", error);
      res.status(500).json({ error: "Failed to get MSI benchmarks" });
    }
  });

  // Get default MSI benchmark
  app.get("/api/msi-benchmarks/default", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const benchmark = await campaignPlanningService.getDefaultBenchmark();
      res.json(benchmark);
    } catch (error) {
      console.error("Error getting default benchmark:", error);
      res.status(500).json({ error: "Failed to get default benchmark" });
    }
  });

  // Get MSI benchmark by ID
  app.get("/api/msi-benchmarks/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const benchmark = await campaignPlanningService.getBenchmarkById(req.params.id);
      if (!benchmark) {
        return res.status(404).json({ error: "Benchmark not found" });
      }
      res.json(benchmark);
    } catch (error) {
      console.error("Error getting benchmark:", error);
      res.status(500).json({ error: "Failed to get benchmark" });
    }
  });

  // Create new MSI benchmark
  app.post("/api/msi-benchmarks", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parsed = createMsiBenchmarkRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const benchmark = await campaignPlanningService.createBenchmark(parsed.data);
      res.status(201).json(benchmark);
    } catch (error) {
      console.error("Error creating benchmark:", error);
      res.status(500).json({ error: "Failed to create benchmark" });
    }
  });

  // Update MSI benchmark
  app.put("/api/msi-benchmarks/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parsed = createMsiBenchmarkRequestSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const benchmark = await campaignPlanningService.updateBenchmark(req.params.id, parsed.data);
      if (!benchmark) {
        return res.status(404).json({ error: "Benchmark not found" });
      }
      res.json(benchmark);
    } catch (error) {
      console.error("Error updating benchmark:", error);
      res.status(500).json({ error: "Failed to update benchmark" });
    }
  });

  // Get benchmarks by therapeutic area
  app.get("/api/msi-benchmarks/therapeutic-area/:ta", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const benchmarks = await campaignPlanningService.getBenchmarksByTherapeuticArea(req.params.ta);
      res.json(benchmarks);
    } catch (error) {
      console.error("Error getting benchmarks by TA:", error);
      res.status(500).json({ error: "Failed to get benchmarks" });
    }
  });

  // Generate pre-campaign saturation report
  app.post("/api/campaign-planning/pre-campaign-report", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parsed = generatePreCampaignReportRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const report = await campaignPlanningService.generatePreCampaignReport(parsed.data);
      res.json(report);
    } catch (error) {
      console.error("Error generating pre-campaign report:", error);
      res.status(500).json({ error: "Failed to generate pre-campaign report" });
    }
  });

  // Generate campaign launch checklist
  app.post("/api/campaign-planning/launch-checklist", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { campaignName, hcpIds, themeIds } = req.body;
      if (!campaignName || !hcpIds || !Array.isArray(hcpIds)) {
        return res.status(400).json({ error: "campaignName and hcpIds are required" });
      }

      const checklist = await campaignPlanningService.generateLaunchChecklist(
        campaignName,
        hcpIds,
        themeIds
      );
      res.json(checklist);
    } catch (error) {
      console.error("Error generating launch checklist:", error);
      res.status(500).json({ error: "Failed to generate launch checklist" });
    }
  });

  // Export saturation data as CSV
  app.post("/api/campaign-planning/export/csv", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parsed = saturationExportRequestSchema.safeParse({ ...req.body, format: "csv" });
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const csv = await campaignPlanningService.generateCsvExport(parsed.data);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=saturation-export.csv");
      res.send(csv);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      res.status(500).json({ error: "Failed to export CSV" });
    }
  });

  // Export saturation data as JSON
  app.post("/api/campaign-planning/export/json", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parsed = saturationExportRequestSchema.safeParse({ ...req.body, format: "json" });
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const data = await campaignPlanningService.generateJsonExport(parsed.data);
      res.json(data);
    } catch (error) {
      console.error("Error exporting JSON:", error);
      res.status(500).json({ error: "Failed to export JSON" });
    }
  });

  // Seed MSI benchmarks (for development/demo)
  app.post("/api/msi-benchmarks/seed", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const result = await campaignPlanningService.seedBenchmarks();
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Error seeding benchmarks:", error);
      res.status(500).json({ error: "Failed to seed benchmarks" });
    }
  });

  // ============================================================================
  // PHASE 12C: NEXT BEST ORBIT RECOMMENDATION ENDPOINTS
  // ============================================================================

  // Generate NBO recommendation for a single HCP
  app.get("/api/hcps/:id/nbo", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const hcp = await storage.getHcpById(req.params.id);
      if (!hcp) {
        return res.status(404).json({ error: "HCP not found" });
      }

      // Get saturation and competitive summaries
      const saturationSummary = await messageSaturationStorage.getHcpMessageSaturationSummary(hcp.id) ?? null;
      const competitiveSummary = await competitiveStorage.getHcpCompetitiveSummary(hcp.id) ?? null;

      const input: NBOEngineInput = {
        hcp,
        saturationSummary,
        competitiveSummary,
      };

      const recommendation = generateNBORecommendation(input);
      res.json(recommendation);
    } catch (error) {
      console.error("Error generating NBO recommendation:", error);
      res.status(500).json({ error: "Failed to generate NBO recommendation" });
    }
  });

  // Generate NBO recommendations for multiple HCPs (batch)
  app.post("/api/nbo/batch", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parsed = nbaGenerationRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const { hcpIds, prioritize = true, limit } = parsed.data;

      // Fetch all HCPs
      const hcps = await Promise.all(
        hcpIds.map(async (id: string) => storage.getHcpById(id))
      );

      // Filter out not found
      const validHcps = hcps.filter((h): h is NonNullable<typeof h> => h !== undefined);

      if (validHcps.length === 0) {
        return res.json({ recommendations: [], summary: { total: 0, generated: 0 } });
      }

      // Build inputs with saturation and competitive data
      const inputs: NBOEngineInput[] = await Promise.all(
        validHcps.map(async (hcp) => {
          const saturationSummary = await messageSaturationStorage.getHcpMessageSaturationSummary(hcp.id) ?? null;
          const competitiveSummary = await competitiveStorage.getHcpCompetitiveSummary(hcp.id) ?? null;
          return { hcp, saturationSummary, competitiveSummary };
        })
      );

      // Generate recommendations
      let recommendations = generateBatchNBORecommendations(inputs);

      // Prioritize if requested
      if (prioritize) {
        recommendations = prioritizeNBORecommendations(recommendations, limit);
      } else if (limit) {
        recommendations = recommendations.slice(0, limit);
      }

      // Generate summary
      const actionDistribution: Record<string, number> = {};
      const confidenceDistribution = { high: 0, medium: 0, low: 0 };
      const urgencyDistribution = { high: 0, medium: 0, low: 0 };

      for (const rec of recommendations) {
        actionDistribution[rec.actionType] = (actionDistribution[rec.actionType] || 0) + 1;
        confidenceDistribution[rec.confidenceLevel]++;
        urgencyDistribution[rec.urgency]++;
      }

      res.json({
        recommendations,
        summary: {
          total: hcpIds.length,
          generated: recommendations.length,
          actionDistribution,
          confidenceDistribution,
          urgencyDistribution,
          avgConfidence: recommendations.length > 0
            ? recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length
            : 0,
        },
      });
    } catch (error) {
      console.error("Error generating batch NBO recommendations:", error);
      res.status(500).json({ error: "Failed to generate NBO recommendations" });
    }
  });

  // Generate NBO recommendations for filtered HCPs
  app.post("/api/nbo/cohort", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { filter, prioritize = true, limit = 100 } = req.body;

      // Validate filter if provided
      if (filter) {
        const parsed = hcpFilterSchema.safeParse(filter);
        if (!parsed.success) {
          return res.status(400).json({ error: "Invalid filter", details: parsed.error.errors });
        }
      }

      // Get matching HCPs
      const hcps = filter ? await storage.filterHcps(filter) : await storage.getAllHcps();

      if (hcps.length === 0) {
        return res.json({ recommendations: [], summary: { total: 0, generated: 0 } });
      }

      // Build inputs
      const inputs: NBOEngineInput[] = await Promise.all(
        hcps.map(async (hcp) => {
          const saturationSummary = await messageSaturationStorage.getHcpMessageSaturationSummary(hcp.id) ?? null;
          const competitiveSummary = await competitiveStorage.getHcpCompetitiveSummary(hcp.id) ?? null;
          return { hcp, saturationSummary, competitiveSummary };
        })
      );

      // Generate recommendations
      let recommendations = generateBatchNBORecommendations(inputs);

      // Prioritize
      if (prioritize) {
        recommendations = prioritizeNBORecommendations(recommendations, limit);
      } else {
        recommendations = recommendations.slice(0, limit);
      }

      // Summary
      const actionDistribution: Record<string, number> = {};
      const channelDistribution: Record<string, number> = {};

      for (const rec of recommendations) {
        actionDistribution[rec.actionType] = (actionDistribution[rec.actionType] || 0) + 1;
        channelDistribution[rec.recommendedChannel] = (channelDistribution[rec.recommendedChannel] || 0) + 1;
      }

      res.json({
        recommendations,
        summary: {
          totalHcps: hcps.length,
          generated: recommendations.length,
          actionDistribution,
          channelDistribution,
        },
      });
    } catch (error) {
      console.error("Error generating cohort NBO recommendations:", error);
      res.status(500).json({ error: "Failed to generate NBO recommendations" });
    }
  });

  // Get NBO summary for a cohort (quick stats without full recommendations)
  app.post("/api/nbo/summary", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { hcpIds } = req.body;
      if (!Array.isArray(hcpIds) || hcpIds.length === 0) {
        return res.status(400).json({ error: "hcpIds array required" });
      }

      // Sample up to 100 HCPs for summary
      const sampleIds = hcpIds.slice(0, 100);
      const hcps = await Promise.all(sampleIds.map((id: string) => storage.getHcpById(id)));
      const validHcps = hcps.filter((h): h is NonNullable<typeof h> => h !== undefined);

      // Generate recommendations for sample
      const inputs: NBOEngineInput[] = await Promise.all(
        validHcps.map(async (hcp) => {
          const saturationSummary = await messageSaturationStorage.getHcpMessageSaturationSummary(hcp.id) ?? null;
          const competitiveSummary = await competitiveStorage.getHcpCompetitiveSummary(hcp.id) ?? null;
          return { hcp, saturationSummary, competitiveSummary };
        })
      );

      const recommendations = generateBatchNBORecommendations(inputs);

      // Calculate distributions
      const actionDistribution: Record<string, number> = {};
      const urgencyDistribution = { high: 0, medium: 0, low: 0 };
      let totalConfidence = 0;

      for (const rec of recommendations) {
        actionDistribution[rec.actionType] = (actionDistribution[rec.actionType] || 0) + 1;
        urgencyDistribution[rec.urgency]++;
        totalConfidence += rec.confidence;
      }

      // Extrapolate to full cohort
      const scaleFactor = hcpIds.length / sampleIds.length;

      res.json({
        totalHcps: hcpIds.length,
        sampled: sampleIds.length,
        actionDistribution: Object.fromEntries(
          Object.entries(actionDistribution).map(([k, v]) => [k, Math.round(v * scaleFactor)])
        ),
        urgencyDistribution: {
          high: Math.round(urgencyDistribution.high * scaleFactor),
          medium: Math.round(urgencyDistribution.medium * scaleFactor),
          low: Math.round(urgencyDistribution.low * scaleFactor),
        },
        avgConfidence: recommendations.length > 0 ? totalConfidence / recommendations.length : 0,
        topActions: Object.entries(actionDistribution)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([action, count]) => ({ action, estimatedCount: Math.round(count * scaleFactor) })),
      });
    } catch (error) {
      console.error("Error generating NBO summary:", error);
      res.status(500).json({ error: "Failed to generate NBO summary" });
    }
  });

  // Get prioritized NBO recommendations (top N by urgency/confidence)
  app.get("/api/nbo/priority-queue", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const limit = safeParseLimit(req.query as Record<string, unknown>, 20);

      // Get all HCPs and generate recommendations
      const hcps = await storage.getAllHcps();

      const inputs: NBOEngineInput[] = await Promise.all(
        hcps.map(async (hcp) => {
          const saturationSummary = await messageSaturationStorage.getHcpMessageSaturationSummary(hcp.id) ?? null;
          const competitiveSummary = await competitiveStorage.getHcpCompetitiveSummary(hcp.id) ?? null;
          return { hcp, saturationSummary, competitiveSummary };
        })
      );

      const allRecommendations = generateBatchNBORecommendations(inputs);
      const prioritized = prioritizeNBORecommendations(allRecommendations, limit);

      res.json({
        recommendations: prioritized,
        totalAnalyzed: hcps.length,
        returned: prioritized.length,
      });
    } catch (error) {
      console.error("Error getting NBO priority queue:", error);
      res.status(500).json({ error: "Failed to get NBO priority queue" });
    }
  });

  // ============================================================================
  // NBO Learning Loop Endpoints (Phase 12C.4)
  // ============================================================================

  // Record feedback on an NBO recommendation
  app.post("/api/nbo/feedback", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parsed = recordNBOFeedbackRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      // Add the current user as feedbackBy if not provided
      const feedbackData = {
        ...parsed.data,
        feedbackBy: parsed.data.feedbackBy ?? req.user?.username ?? "unknown",
      };

      const feedback = await nboLearningService.recordFeedback(feedbackData);
      res.json(feedback);
    } catch (error) {
      console.error("Error recording NBO feedback:", error);
      const message = error instanceof Error ? error.message : "Failed to record feedback";
      res.status(error instanceof Error && error.message.includes("not found") ? 404 : 500).json({ error: message });
    }
  });

  // Record outcome measurement for a feedback entry
  app.post("/api/nbo/feedback/:id/outcome", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const parsed = measureNBOOutcomeRequestSchema.safeParse({
        ...req.body,
        feedbackId: req.params.id,
      });
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const feedback = await nboLearningService.measureOutcome(parsed.data);
      res.json(feedback);
    } catch (error) {
      console.error("Error measuring NBO outcome:", error);
      const message = error instanceof Error ? error.message : "Failed to measure outcome";
      res.status(error instanceof Error && error.message.includes("not found") ? 404 : 500).json({ error: message });
    }
  });

  // Get feedback for a specific recommendation
  app.get("/api/nbo/feedback/:recommendationId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const feedback = await nboLearningService.getFeedback(req.params.recommendationId);
      if (!feedback) {
        return res.status(404).json({ error: "Feedback not found" });
      }
      res.json(feedback);
    } catch (error) {
      console.error("Error getting NBO feedback:", error);
      res.status(500).json({ error: "Failed to get feedback" });
    }
  });

  // Get all feedback for an HCP
  app.get("/api/hcps/:id/nbo/feedback", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const limit = safeParseLimit(req.query as Record<string, unknown>, 50);
      const feedback = await nboLearningService.getHcpFeedback(req.params.id, limit);
      res.json({ feedback, count: feedback.length });
    } catch (error) {
      console.error("Error getting HCP NBO feedback:", error);
      res.status(500).json({ error: "Failed to get HCP feedback" });
    }
  });

  // Get learning metrics for a time period
  app.get("/api/nbo/metrics", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      // Default to last 30 days
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      const metrics = await nboLearningService.calculateMetrics(startDate, endDate);
      res.json(metrics);
    } catch (error) {
      console.error("Error calculating NBO metrics:", error);
      res.status(500).json({ error: "Failed to calculate metrics" });
    }
  });

  // Get model performance summary
  app.get("/api/nbo/model-performance", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const performance = await nboLearningService.getModelPerformance();
      res.json(performance);
    } catch (error) {
      console.error("Error getting NBO model performance:", error);
      res.status(500).json({ error: "Failed to get model performance" });
    }
  });

  // Trigger batch outcome measurement (admin endpoint)
  app.post("/api/nbo/measure-pending-outcomes", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const result = await nboLearningService.measurePendingOutcomes();
      res.json({
        message: "Pending outcomes measured",
        measured: result.measured,
        errors: result.errors,
      });
    } catch (error) {
      console.error("Error measuring pending outcomes:", error);
      res.status(500).json({ error: "Failed to measure pending outcomes" });
    }
  });

  // ==========================================================================
  // PHASE 0: REGULATORY CALENDAR ENDPOINTS
  // ==========================================================================

  const { regulatoryStorage: regStorage } = await import("./storage/regulatory-storage");
  const { regulatorySyncAgent: regSyncAgent } = await import("./services/regulatory/regulatory-sync-agent");

  // List regulatory events with filters
  app.get("/api/regulatory-events", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const filter = {
        drugName: req.query.drugName as string | undefined,
        eventType: req.query.eventType as string | undefined,
        therapeuticArea: req.query.therapeuticArea as string | undefined,
        status: req.query.status as string | undefined,
        source: req.query.source as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };
      const events = await regStorage.listEvents(filter);
      res.json(events);
    } catch (error) {
      console.error("Error listing regulatory events:", error);
      res.status(500).json({ error: "Failed to list regulatory events" });
    }
  });

  // Get upcoming regulatory events
  app.get("/api/regulatory-events/upcoming", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 90;
      const events = await regStorage.getUpcomingEvents(days);
      res.json(events);
    } catch (error) {
      console.error("Error getting upcoming regulatory events:", error);
      res.status(500).json({ error: "Failed to get upcoming events" });
    }
  });

  // Get latest sync status
  app.get("/api/regulatory-events/sync/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const source = req.query.source as string | undefined;
      const log = await regStorage.getLatestSyncLog(source);
      const allLogs = await regStorage.listSyncLogs(10);
      res.json({ latest: log ?? null, recent: allLogs });
    } catch (error) {
      console.error("Error getting sync status:", error);
      res.status(500).json({ error: "Failed to get sync status" });
    }
  });

  // Trigger manual sync
  app.post("/api/regulatory-events/sync", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const sources = req.body?.sources;
      const result = await regSyncAgent.run(
        { sources },
        (req.user as any)?.username ?? "system",
        "on_demand"
      );
      res.json({
        runId: result.runId,
        status: result.status,
        summary: result.output.summary,
        metrics: result.output.metrics,
        duration: result.duration,
      });
    } catch (error) {
      console.error("Error triggering regulatory sync:", error);
      res.status(500).json({ error: "Failed to trigger sync" });
    }
  });

  // Get single regulatory event with relations
  app.get("/api/regulatory-events/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const result = await regStorage.getEventWithRelations(req.params.id);
      if (!result) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json(result);
    } catch (error) {
      console.error("Error getting regulatory event:", error);
      res.status(500).json({ error: "Failed to get event" });
    }
  });

  // Create annotation for an event
  app.post("/api/regulatory-events/:id/annotations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const event = await regStorage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const annotation = await regStorage.createAnnotation({
        eventId: req.params.id,
        userId: (req.user as any)?.username ?? null,
        annotationType: req.body.annotationType ?? "note",
        title: req.body.title,
        content: req.body.content ?? null,
        priority: req.body.priority ?? "medium",
        metadata: req.body.metadata ?? null,
      });
      res.status(201).json(annotation);
    } catch (error) {
      console.error("Error creating annotation:", error);
      res.status(500).json({ error: "Failed to create annotation" });
    }
  });

  // Update annotation
  app.put("/api/regulatory-events/annotations/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const annotation = await regStorage.updateAnnotation(req.params.id, {
        title: req.body.title,
        content: req.body.content,
        priority: req.body.priority,
        annotationType: req.body.annotationType,
        metadata: req.body.metadata,
      });
      if (!annotation) {
        return res.status(404).json({ error: "Annotation not found" });
      }
      res.json(annotation);
    } catch (error) {
      console.error("Error updating annotation:", error);
      res.status(500).json({ error: "Failed to update annotation" });
    }
  });

  // Delete annotation
  app.delete("/api/regulatory-events/annotations/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const deleted = await regStorage.deleteAnnotation(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Annotation not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting annotation:", error);
      res.status(500).json({ error: "Failed to delete annotation" });
    }
  });

  return httpServer;
}
