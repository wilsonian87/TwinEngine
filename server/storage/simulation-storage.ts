/**
 * Simulation Storage Module
 *
 * Handles simulation-related database operations including:
 * - Creating and running simulations
 * - Retrieving simulation history
 * - Dashboard metrics aggregation
 */
import { randomUUID } from "crypto";
import { db } from "../db";
import { eq, desc, sql } from "drizzle-orm";
import {
  hcpProfiles,
  simulationScenarios,
  simulationResults,
  auditLogs,
  type SimulationResult,
  type InsertSimulationScenario,
  type DashboardMetrics,
  type InsertAuditLog,
  type AuditLog,
} from "@shared/schema";
import { dbRowToSimulationResult, dbRowToAuditLog } from "./converters";
import { runSimulationEngine } from "../services/prediction-engine";

export class SimulationStorage {
  private getHcpCount: () => Promise<number>;

  constructor(getHcpCount: () => Promise<number>) {
    this.getHcpCount = getHcpCount;
  }

  async createSimulation(scenario: InsertSimulationScenario): Promise<SimulationResult> {
    const targetHcpIds = scenario.targetHcpIds || [];
    const hasTargetedAudience = targetHcpIds.length > 0;

    const hcpCount = hasTargetedAudience
      ? targetHcpIds.length
      : await this.getHcpCount();

    const result = runSimulationEngine(scenario, hcpCount);

    // Insert scenario
    const scenarioId = randomUUID();
    await db.insert(simulationScenarios).values({
      id: scenarioId,
      name: scenario.name,
      targetHcpIds: scenario.targetHcpIds || [],
      channelMix: scenario.channelMix,
      frequency: scenario.frequency,
      duration: scenario.duration,
      contentType: scenario.contentType,
      createdAt: new Date(),
    });

    // Insert result
    const resultId = randomUUID();
    await db.insert(simulationResults).values({
      id: resultId,
      scenarioId,
      scenarioName: scenario.name,
      predictedEngagementRate: result.predictedEngagementRate,
      predictedResponseRate: result.predictedResponseRate,
      predictedRxLift: result.predictedRxLift,
      predictedReach: result.predictedReach,
      efficiencyScore: result.efficiencyScore,
      channelPerformance: result.channelPerformance,
      vsBaseline: result.vsBaseline,
      runAt: new Date(),
    });

    return {
      id: resultId,
      scenarioId,
      scenarioName: scenario.name,
      ...result,
      runAt: new Date().toISOString(),
    };
  }

  async getSimulationHistory(): Promise<SimulationResult[]> {
    const rows = await db
      .select()
      .from(simulationResults)
      .orderBy(desc(simulationResults.runAt))
      .limit(50);
    return rows.map(dbRowToSimulationResult);
  }

  async getSimulationById(id: string): Promise<SimulationResult | undefined> {
    const rows = await db.select().from(simulationResults).where(eq(simulationResults.id, id));
    return rows.length > 0 ? dbRowToSimulationResult(rows[0]) : undefined;
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    // Get HCP stats
    const hcpRows = await db.select().from(hcpProfiles);
    const totalHcps = hcpRows.length;
    const avgEngagementScore =
      totalHcps > 0
        ? Math.round(
            hcpRows.reduce((sum, hcp) => sum + hcp.overallEngagementScore, 0) / totalHcps
          )
        : 0;

    // Get simulation stats
    const simRows = await db.select().from(simulationResults);
    const totalSimulations = simRows.length;
    const avgPredictedLift =
      totalSimulations > 0
        ? parseFloat(
            (
              simRows.reduce((sum, sim) => sum + sim.predictedRxLift, 0) / totalSimulations
            ).toFixed(1)
          )
        : 0;

    // Calculate segment distribution with proper typing
    const segmentCounts: Record<string, number> = {};
    hcpRows.forEach((hcp) => {
      segmentCounts[hcp.segment] = (segmentCounts[hcp.segment] || 0) + 1;
    });
    const segmentDistribution = Object.entries(segmentCounts).map(([segment, count]) => ({
      segment: segment as "High Prescriber" | "Growth Potential" | "New Target" | "Engaged Digital" | "Traditional Preference" | "Academic Leader",
      count,
      percentage: totalHcps > 0 ? Math.round((count / totalHcps) * 100) : 0,
    }));

    // Calculate channel effectiveness with proper typing
    const channelEffectiveness: { channel: "email" | "rep_visit" | "webinar" | "conference" | "digital_ad" | "phone"; avgResponseRate: number; avgEngagement: number; }[] = [
      { channel: "email", avgResponseRate: 32, avgEngagement: 68 },
      { channel: "rep_visit", avgResponseRate: 45, avgEngagement: 75 },
      { channel: "webinar", avgResponseRate: 28, avgEngagement: 62 },
      { channel: "phone", avgResponseRate: 38, avgEngagement: 58 },
      { channel: "digital_ad", avgResponseRate: 15, avgEngagement: 42 },
      { channel: "conference", avgResponseRate: 52, avgEngagement: 82 },
    ];

    // Calculate tier breakdown with proper typing
    const tierCounts: Record<string, { count: number; totalRx: number }> = {};
    hcpRows.forEach((hcp) => {
      if (!tierCounts[hcp.tier]) {
        tierCounts[hcp.tier] = { count: 0, totalRx: 0 };
      }
      tierCounts[hcp.tier].count += 1;
      tierCounts[hcp.tier].totalRx += hcp.monthlyRxVolume;
    });
    const tierBreakdown = Object.entries(tierCounts).map(([tier, data]) => ({
      tier: tier as "Tier 1" | "Tier 2" | "Tier 3",
      count: data.count,
      avgRxVolume: data.count > 0 ? Math.round(data.totalRx / data.count) : 0,
    }));

    // Generate engagement trend with proper typing
    const engagementTrend: { month: string; avgScore: number; responseRate: number; }[] = [
      { month: "Jul", avgScore: 58, responseRate: 28 },
      { month: "Aug", avgScore: 61, responseRate: 30 },
      { month: "Sep", avgScore: 59, responseRate: 27 },
      { month: "Oct", avgScore: 64, responseRate: 32 },
      { month: "Nov", avgScore: 66, responseRate: 34 },
      { month: "Dec", avgScore: avgEngagementScore, responseRate: 35 },
    ];

    return {
      totalHcps,
      avgEngagementScore,
      totalSimulations,
      avgPredictedLift,
      segmentDistribution,
      channelEffectiveness,
      tierBreakdown,
      engagementTrend,
    };
  }

  async logAction(log: InsertAuditLog): Promise<void> {
    await db.insert(auditLogs).values(log);
  }

  async getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    const rows = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
    return rows.map(dbRowToAuditLog);
  }
}
