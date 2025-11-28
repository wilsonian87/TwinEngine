import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSimulationScenarioSchema, hcpFilterSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // HCP endpoints
  app.get("/api/hcps", async (req, res) => {
    try {
      const hcps = await storage.getAllHcps();
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

  // Simulation endpoints
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

  // Dashboard endpoints
  app.get("/api/dashboard/metrics", async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ error: "Failed to fetch dashboard metrics" });
    }
  });

  return httpServer;
}
