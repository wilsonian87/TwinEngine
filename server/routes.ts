import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import { storage } from "./storage";
import { hashPassword } from "./auth";
import { classifyChannelHealth, classifyCohortChannelHealth, getHealthSummary } from "./services/channel-health";
import { generateNBA, generateNBAs, prioritizeNBAs, getNBASummary } from "./services/nba-engine";
import {
  insertSimulationScenarioSchema,
  hcpFilterSchema,
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
import type { Channel, RebalanceTrigger } from "@shared/schema";

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
  // Seed database on startup
  try {
    await storage.seedHcpData(100);
  } catch (error) {
    console.error("Error seeding database:", error);
  }

  // ============ Authentication Endpoints ============

  // Register a new user
  app.post("/api/auth/register", async (req, res) => {
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
  app.post("/api/auth/login", (req, res, next) => {
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
  app.post("/api/invite/validate", async (req, res) => {
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
      (req.session as any).inviteCodeId = inviteCode.id;
      (req.session as any).inviteEmail = email;
      (req.session as any).inviteLabel = inviteCode.label;

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
    const session = req.session as any;
    if (session.inviteCodeId) {
      res.json({
        authenticated: true,
        email: session.inviteEmail,
        label: session.inviteLabel,
      });
    } else {
      res.json({ authenticated: false });
    }
  });

  // Dev mode bypass (only available in development)
  app.post("/api/invite/dev-bypass", (req, res) => {
    if (process.env.NODE_ENV !== "development") {
      return res.status(403).json({ error: "Only available in development mode" });
    }

    const session = req.session as any;
    session.inviteCodeId = "dev-bypass";
    session.inviteEmail = "dev@localhost";
    session.inviteLabel = "Development Mode";

    res.json({
      success: true,
      label: "Development Mode",
      email: "dev@localhost",
    });
  });

  // Admin: Create invite code (protected by env secret)
  app.post("/api/admin/codes", async (req, res) => {
    const adminSecret = process.env.ADMIN_SECRET || "admin-secret-change-me";
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
    const adminSecret = process.env.ADMIN_SECRET || "admin-secret-change-me";
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
    const adminSecret = process.env.ADMIN_SECRET || "admin-secret-change-me";
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
      const limit = parseInt(req.query.limit as string) || 10;
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

  // Get aggregate channel health for a cohort (via POST with HCP IDs)
  app.post("/api/channel-health/cohort", async (req, res) => {
    try {
      const { hcpIds } = req.body as { hcpIds?: string[] };

      if (!hcpIds || !Array.isArray(hcpIds) || hcpIds.length === 0) {
        return res.status(400).json({ error: "hcpIds array required" });
      }

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

  // Generate NBAs for multiple HCPs (cohort)
  app.post("/api/nba/generate", async (req, res) => {
    try {
      const { hcpIds, prioritize, limit } = req.body as {
        hcpIds?: string[];
        prioritize?: boolean;
        limit?: number;
      };

      if (!hcpIds || !Array.isArray(hcpIds) || hcpIds.length === 0) {
        return res.status(400).json({ error: "hcpIds array required" });
      }

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
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
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

  // Differential simulation: compare two scenarios
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
      const limit = parseInt(req.query.limit as string) || 100;
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
      const limit = parseInt(req.query.limit as string) || 50;
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
      const limit = parseInt(req.query.limit as string) || 50;
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
      const limit = parseInt(req.query.limit as string) || 50;
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
      const limit = parseInt(req.query.limit as string) || 50;
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

  // ============ Action Export Endpoints ============

  // List action exports
  app.get("/api/action-exports", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const sourceType = req.query.sourceType as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

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
      const userId = (req.user as any)?.id || "system";

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
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

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
      const status = statusParam && validStatuses.includes(statusParam as any) ? statusParam as typeof validStatuses[number] : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

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
      const userId = (req.user as any)?.id || "unknown";
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
      const userId = (req.user as any)?.id || "unknown";
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
      const userId = (req.user as any)?.id || "unknown";
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
      const userId = (req.user as any)?.id || "unknown";
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
      const userId = (req.user as any)?.id || "unknown";
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

  // ============ Alert Endpoints ============

  // List alerts
  app.get("/api/alerts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const status = req.query.status as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

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
      const userId = (req.user as any)?.id || "unknown";
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
      const userId = (req.user as any)?.id || "unknown";
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

      const userId = (req.user as any)?.username || "unknown";
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

      const userId = (req.user as any)?.username || "unknown";
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
      const limit = parseInt(req.query.limit as string) || 100;

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
      const { status, brand, businessUnit, limit, offset } = req.query;
      const campaigns = await campaignCoordinator.listCampaigns({
        status: status as any,
        brand: brand as string,
        businessUnit: businessUnit as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
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
        createdBy: (req.user as any)?.username,
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
        (req.user as any)?.username || "unknown",
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
      const { status, limit } = req.query;
      const problems = await portfolioOptimizer.listProblems({
        status: status as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
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
      const { channel, limit, offset } = req.query;
      const allocations = await portfolioOptimizer.getAllocations(req.params.id, {
        channel: channel as Channel | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
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
      const { status, resultId, limit } = req.query;
      const plans = await executionPlanner.listPlans({
        status: status as any,
        resultId: resultId as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
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

  return httpServer;
}
