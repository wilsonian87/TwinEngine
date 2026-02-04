/**
 * PDF Export Routes
 *
 * API endpoints for generating and downloading PDF reports:
 * - POST /api/exports/pdf - Generate PDF for simulation, audience, HCP, or comparison
 */

import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth";
import {
  generatePDF,
  getExportFilename,
  type ExportType,
  type SimulationExportData,
  type AudienceExportData,
  type HCPProfileExportData,
  type ComparisonExportData,
} from "../services/export-service";
import { storage } from "../storage";
import { logAudit } from "../services/audit-service";

export const exportRouter = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const exportRequestSchema = z.object({
  type: z.enum(["simulation", "audience", "hcp-profile", "comparison"]),
  entityId: z.string().optional(),
  entityIds: z.array(z.string()).optional(),
  options: z.object({
    title: z.string().optional(),
    includeConfidential: z.boolean().optional().default(false),
    subtitle: z.string().optional(),
  }).optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/exports/pdf
 * Generate a PDF export for the specified entity
 */
exportRouter.post("/pdf", requireAuth, async (req, res) => {
  try {
    const request = exportRequestSchema.parse(req.body);
    const userId = req.user!.id;
    const userName = req.user!.username || "Unknown User";

    let data: SimulationExportData | AudienceExportData | HCPProfileExportData | ComparisonExportData;
    let title = request.options?.title || "";

    switch (request.type) {
      case "simulation": {
        if (!request.entityId) {
          return res.status(400).json({
            error: { code: "MISSING_ENTITY_ID", message: "entityId is required for simulation export" },
          });
        }

        // Fetch simulation from storage
        const simulation = await storage.getSimulationById(request.entityId);
        if (!simulation) {
          return res.status(404).json({
            error: { code: "NOT_FOUND", message: "Simulation not found" },
          });
        }

        title = title || simulation.scenarioName;
        data = {
          id: simulation.id,
          scenarioName: simulation.scenarioName,
          runAt: simulation.runAt,
          predictedRxLift: simulation.predictedRxLift,
          predictedEngagementRate: simulation.predictedEngagementRate,
          predictedResponseRate: simulation.predictedResponseRate,
          predictedReach: simulation.predictedReach,
          vsBaseline: simulation.vsBaseline as {
            rxLiftDelta: number;
            engagementDelta: number;
            responseDelta: number;
          },
        };
        break;
      }

      case "audience": {
        if (!request.entityId) {
          return res.status(400).json({
            error: { code: "MISSING_ENTITY_ID", message: "entityId is required for audience export" },
          });
        }

        // Fetch audience from storage
        const audience = await storage.getAudience(request.entityId);
        if (!audience) {
          return res.status(404).json({
            error: { code: "NOT_FOUND", message: "Audience not found" },
          });
        }

        // Calculate additional stats
        let topSpecialties: Array<{ specialty: string; count: number }> = [];
        let tierDistribution: Array<{ tier: string; count: number }> = [];
        let avgEngagement: number | undefined;
        let avgRxVolume: number | undefined;

        if (audience.hcpIds && audience.hcpIds.length > 0) {
          // Fetch HCPs in audience for stats (limit to 500 for performance)
          const hcpIds = audience.hcpIds.slice(0, 500);
          const hcps = await Promise.all(hcpIds.map((id) => storage.getHcpById(id)));
          const validHcps = hcps.filter((h) => h !== null);

          if (validHcps.length > 0) {
            // Calculate specialty distribution
            const specialtyCounts: Record<string, number> = {};
            const tierCounts: Record<string, number> = {};
            let totalEngagement = 0;
            let totalRx = 0;

            for (const hcp of validHcps) {
              if (hcp) {
                specialtyCounts[hcp.specialty] = (specialtyCounts[hcp.specialty] || 0) + 1;
                tierCounts[hcp.tier] = (tierCounts[hcp.tier] || 0) + 1;
                totalEngagement += hcp.overallEngagementScore;
                totalRx += hcp.monthlyRxVolume;
              }
            }

            topSpecialties = Object.entries(specialtyCounts)
              .map(([specialty, count]) => ({ specialty, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 5);

            tierDistribution = Object.entries(tierCounts)
              .map(([tier, count]) => ({ tier, count }))
              .sort((a, b) => b.count - a.count);

            avgEngagement = totalEngagement / validHcps.length;
            avgRxVolume = totalRx / validHcps.length;
          }
        }

        title = title || audience.name;
        data = {
          id: audience.id,
          name: audience.name,
          description: audience.description || undefined,
          hcpCount: audience.hcpIds?.length || audience.hcpCount || 0,
          createdAt: audience.createdAt.toISOString(),
          filters: audience.filters as Record<string, unknown> | undefined,
          source: audience.source || "manual",
          topSpecialties,
          tierDistribution,
          avgEngagement,
          avgRxVolume,
        };
        break;
      }

      case "hcp-profile": {
        if (!request.entityId) {
          return res.status(400).json({
            error: { code: "MISSING_ENTITY_ID", message: "entityId is required for HCP profile export" },
          });
        }

        // Fetch HCP from storage
        const hcp = await storage.getHcpById(request.entityId);
        if (!hcp) {
          return res.status(404).json({
            error: { code: "NOT_FOUND", message: "HCP not found" },
          });
        }

        title = title || `Dr. ${hcp.firstName} ${hcp.lastName}`;
        data = {
          id: hcp.id,
          npi: hcp.npi,
          firstName: hcp.firstName,
          lastName: hcp.lastName,
          specialty: hcp.specialty,
          tier: hcp.tier,
          state: hcp.state,
          city: hcp.city,
          engagementScore: hcp.overallEngagementScore,
          rxVolume: hcp.monthlyRxVolume,
          marketShare: hcp.marketSharePct,
          channelPreferences: hcp.channelPreference ? JSON.parse(hcp.channelPreference) as Record<string, number> : undefined,
          segment: hcp.segment || undefined,
        };
        break;
      }

      case "comparison": {
        if (!request.entityIds || request.entityIds.length !== 2) {
          return res.status(400).json({
            error: {
              code: "INVALID_ENTITY_IDS",
              message: "comparison export requires exactly 2 entityIds",
            },
          });
        }

        const [audienceA, audienceB] = await Promise.all([
          storage.getAudience(request.entityIds[0]),
          storage.getAudience(request.entityIds[1]),
        ]);

        if (!audienceA || !audienceB) {
          return res.status(404).json({
            error: { code: "NOT_FOUND", message: "One or both audiences not found" },
          });
        }

        // Calculate comparison metrics
        const hcpIdsA = new Set(audienceA.hcpIds || []);
        const hcpIdsB = new Set(audienceB.hcpIds || []);

        const overlap = Array.from(hcpIdsA).filter((id) => hcpIdsB.has(id)).length;
        const uniqueToA = hcpIdsA.size - overlap;
        const uniqueToB = hcpIdsB.size - overlap;

        // Calculate average metrics for both audiences
        const getAudienceStats = async (hcpIds: string[]) => {
          if (hcpIds.length === 0) return { avgEngagement: 0, avgRxVolume: 0 };

          const sampleIds = hcpIds.slice(0, 200);
          const hcps = await Promise.all(sampleIds.map((id) => storage.getHcpById(id)));
          const validHcps = hcps.filter((h) => h !== null);

          if (validHcps.length === 0) return { avgEngagement: 0, avgRxVolume: 0 };

          const totalEngagement = validHcps.reduce((sum, h) => sum + (h?.overallEngagementScore || 0), 0);
          const totalRx = validHcps.reduce((sum, h) => sum + (h?.monthlyRxVolume || 0), 0);

          return {
            avgEngagement: totalEngagement / validHcps.length,
            avgRxVolume: totalRx / validHcps.length,
          };
        };

        const [statsA, statsB] = await Promise.all([
          getAudienceStats(audienceA.hcpIds || []),
          getAudienceStats(audienceB.hcpIds || []),
        ]);

        title = title || `${audienceA.name} vs ${audienceB.name}`;
        data = {
          audienceA: {
            id: audienceA.id,
            name: audienceA.name,
            hcpCount: audienceA.hcpIds?.length || audienceA.hcpCount || 0,
            avgEngagement: statsA.avgEngagement,
            avgRxVolume: statsA.avgRxVolume,
          },
          audienceB: {
            id: audienceB.id,
            name: audienceB.name,
            hcpCount: audienceB.hcpIds?.length || audienceB.hcpCount || 0,
            avgEngagement: statsB.avgEngagement,
            avgRxVolume: statsB.avgRxVolume,
          },
          comparison: {
            engagementDelta: statsA.avgEngagement - statsB.avgEngagement,
            rxVolumeDelta: ((statsA.avgRxVolume - statsB.avgRxVolume) / (statsB.avgRxVolume || 1)) * 100,
            overlap,
            uniqueToA,
            uniqueToB,
          },
        };
        break;
      }

      default:
        return res.status(400).json({
          error: { code: "INVALID_TYPE", message: `Unsupported export type: ${request.type}` },
        });
    }

    // Generate PDF
    const pdfBuffer = await generatePDF(request.type as ExportType, data, {
      title,
      generatedBy: userName,
      includeConfidential: request.options?.includeConfidential,
      subtitle: request.options?.subtitle,
    });

    const filename = getExportFilename(request.type as ExportType, title);

    // Log audit event
    await logAudit({
      action: "hcp.exported",
      entityType: "hcp",
      entityId: request.entityId || request.entityIds?.join(",") || "unknown",
      details: {
        exportType: request.type,
        filename,
        sizeBytes: pdfBuffer.length,
      },
      context: {
        userId,
      },
    });

    // Send PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: error.errors,
        },
      });
    }
    console.error("PDF export error:", error);
    res.status(500).json({
      error: {
        code: "EXPORT_FAILED",
        message: error instanceof Error ? error.message : "Failed to generate PDF export",
      },
    });
  }
});

/**
 * GET /api/exports/types
 * List available export types
 */
exportRouter.get("/types", requireAuth, (req, res) => {
  res.json({
    types: [
      {
        type: "simulation",
        label: "Simulation Results",
        description: "Export simulation scenario results with metrics and configuration",
        requiresEntityId: true,
      },
      {
        type: "audience",
        label: "Audience Profile",
        description: "Export audience details with demographics and statistics",
        requiresEntityId: true,
      },
      {
        type: "hcp-profile",
        label: "HCP Profile",
        description: "Export individual HCP profile with engagement history",
        requiresEntityId: true,
      },
      {
        type: "comparison",
        label: "Audience Comparison",
        description: "Export side-by-side comparison of two audiences",
        requiresEntityIds: true,
        entityCount: 2,
      },
    ],
  });
});
