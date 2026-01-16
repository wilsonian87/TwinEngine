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
} from "@shared/schema";

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

  return httpServer;
}
