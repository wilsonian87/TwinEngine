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

  return httpServer;
}
