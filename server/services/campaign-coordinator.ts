/**
 * Campaign Coordinator Service
 *
 * Phase 7D: Prevents conflicts between concurrent campaigns targeting overlapping HCPs.
 * Handles campaign lifecycle, HCP reservations, conflict detection, and resolution.
 */

import { db } from "../db";
import {
  campaigns,
  hcpReservations,
  conflictLog,
  hcpProfiles,
  savedAudiences,
  type CampaignDB,
  type HcpReservation,
  type ConflictLog,
  type InsertCampaign,
  type InsertHcpReservation,
  type InsertConflictLog,
  type CampaignApi,
  type ReservationApi,
  type ConflictApi,
  type TimeSlot,
  type CampaignSummary,
  type ReservationResult,
  type BatchReservationResult,
  type AvailabilityResult,
  type ResolutionReport,
  type HcpCampaignView,
  type ReservationType,
  type ReservationStatus,
  type ConflictType,
  type ConflictResolution,
  type CampaignStatus,
} from "@shared/schema";
import { eq, and, or, gte, lte, desc, asc, sql, inArray, isNull, ne } from "drizzle-orm";

// ============================================================================
// TYPES
// ============================================================================

interface DateRange {
  start: Date;
  end: Date;
}

interface ConflictDetectionResult {
  hasConflict: boolean;
  conflicts: ConflictApi[];
  canProceed: boolean;
  message?: string;
}

// ============================================================================
// CAMPAIGN COORDINATOR SERVICE
// ============================================================================

class CampaignCoordinator {
  // ==========================================================================
  // CAMPAIGN MANAGEMENT
  // ==========================================================================

  /**
   * Create a new campaign
   */
  async createCampaign(data: Partial<InsertCampaign>): Promise<CampaignDB> {
    const [campaign] = await db
      .insert(campaigns)
      .values({
        name: data.name || "Untitled Campaign",
        description: data.description,
        brand: data.brand,
        businessUnit: data.businessUnit,
        priority: data.priority ?? 50,
        status: "draft",
        startDate: data.startDate,
        endDate: data.endDate,
        targetAudienceId: data.targetAudienceId,
        channelMix: data.channelMix,
        budget: data.budget,
        createdBy: data.createdBy,
        campaignType: data.campaignType,
        therapeuticArea: data.therapeuticArea,
        product: data.product,
        primaryChannel: data.primaryChannel,
        targetSegments: data.targetSegments,
        targetSpecialties: data.targetSpecialties,
        targetTiers: data.targetTiers,
        goalType: data.goalType,
        goalValue: data.goalValue,
      })
      .returning();

    return campaign;
  }

  /**
   * Get campaign by ID with computed fields
   */
  async getCampaign(campaignId: string): Promise<CampaignApi | null> {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId));

    if (!campaign) return null;

    // Get reservation counts
    const reservations = await db
      .select({ count: sql<number>`count(*)` })
      .from(hcpReservations)
      .where(eq(hcpReservations.campaignId, campaignId));

    const activeReservations = await db
      .select({ count: sql<number>`count(*)` })
      .from(hcpReservations)
      .where(and(
        eq(hcpReservations.campaignId, campaignId),
        eq(hcpReservations.status, "active")
      ));

    // Get conflict count
    const conflicts = await db
      .select({ count: sql<number>`count(*)` })
      .from(conflictLog)
      .where(and(
        or(
          eq(conflictLog.campaign1Id, campaignId),
          eq(conflictLog.campaign2Id, campaignId)
        ),
        isNull(conflictLog.resolution)
      ));

    return this.toCampaignApi(campaign, {
      reservationCount: Number(reservations[0]?.count || 0),
      activeReservationCount: Number(activeReservations[0]?.count || 0),
      conflictCount: Number(conflicts[0]?.count || 0),
    });
  }

  /**
   * List all campaigns with optional filters
   */
  async listCampaigns(filters?: {
    status?: CampaignStatus;
    brand?: string;
    businessUnit?: string;
    limit?: number;
    offset?: number;
  }): Promise<CampaignApi[]> {
    const conditions = [];

    if (filters?.status) {
      conditions.push(eq(campaigns.status, filters.status));
    }
    if (filters?.brand) {
      conditions.push(eq(campaigns.brand, filters.brand));
    }
    if (filters?.businessUnit) {
      conditions.push(eq(campaigns.businessUnit, filters.businessUnit));
    }

    const query = db
      .select()
      .from(campaigns)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(campaigns.priority), desc(campaigns.createdAt))
      .limit(filters?.limit || 100)
      .offset(filters?.offset || 0);

    const results = await query;
    return results.map(c => this.toCampaignApi(c));
  }

  /**
   * Update a campaign
   */
  async updateCampaign(campaignId: string, data: Partial<InsertCampaign>): Promise<CampaignDB | null> {
    const [updated] = await db
      .update(campaigns)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaignId))
      .returning();

    return updated || null;
  }

  /**
   * Activate a campaign
   */
  async activateCampaign(campaignId: string): Promise<CampaignDB | null> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) return null;

    // Check for unresolved conflicts
    if (campaign.conflictCount && campaign.conflictCount > 0) {
      throw new Error(`Cannot activate campaign with ${campaign.conflictCount} unresolved conflicts`);
    }

    const [updated] = await db
      .update(campaigns)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(campaigns.id, campaignId))
      .returning();

    return updated || null;
  }

  /**
   * Pause a campaign
   */
  async pauseCampaign(campaignId: string): Promise<CampaignDB | null> {
    const [updated] = await db
      .update(campaigns)
      .set({ status: "paused", updatedAt: new Date() })
      .where(eq(campaigns.id, campaignId))
      .returning();

    return updated || null;
  }

  /**
   * Complete a campaign
   */
  async completeCampaign(campaignId: string): Promise<CampaignDB | null> {
    // Release all active reservations
    await db
      .update(hcpReservations)
      .set({ status: "released", updatedAt: new Date() })
      .where(and(
        eq(hcpReservations.campaignId, campaignId),
        eq(hcpReservations.status, "active")
      ));

    const [updated] = await db
      .update(campaigns)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(campaigns.id, campaignId))
      .returning();

    return updated || null;
  }

  /**
   * Delete a campaign (only if draft)
   */
  async deleteCampaign(campaignId: string): Promise<boolean> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) return false;

    if (campaign.status !== "draft") {
      throw new Error("Can only delete draft campaigns");
    }

    await db.delete(campaigns).where(eq(campaigns.id, campaignId));
    return true;
  }

  // ==========================================================================
  // RESERVATION MANAGEMENT
  // ==========================================================================

  /**
   * Reserve an HCP for a campaign on a specific channel
   */
  async reserveHcp(
    campaignId: string,
    hcpId: string,
    channel: string,
    reservedFrom: Date,
    reservedUntil: Date,
    options?: {
      reservationType?: ReservationType;
      plannedActionDate?: Date;
      canPreempt?: boolean;
    }
  ): Promise<ReservationResult> {
    // Get campaign for priority
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) {
      return {
        success: false,
        reservation: null,
        message: "Campaign not found",
      };
    }

    // Check for conflicts
    const conflictResult = await this.detectReservationConflicts(
      hcpId,
      channel,
      reservedFrom,
      reservedUntil,
      campaignId
    );

    if (conflictResult.hasConflict && !conflictResult.canProceed) {
      // Log conflicts
      for (const conflict of conflictResult.conflicts) {
        await this.logConflict({
          hcpId,
          channel,
          conflictType: "overlap" as ConflictType,
          campaign1Id: campaignId,
          campaign2Id: conflict.campaign2Id || campaignId,
          conflictDate: new Date(conflict.conflictDate),
          severity: "medium",
          description: conflict.description || undefined,
        });
      }

      return {
        success: false,
        reservation: null,
        conflicts: conflictResult.conflicts,
        message: conflictResult.message,
      };
    }

    // Create reservation
    const [reservation] = await db
      .insert(hcpReservations)
      .values({
        campaignId,
        hcpId,
        channel,
        reservationType: options?.reservationType || "priority",
        priority: campaign.priority,
        reservedFrom,
        reservedUntil,
        plannedActionDate: options?.plannedActionDate,
        canPreempt: options?.canPreempt ?? true,
        status: "active",
      })
      .returning();

    // Update campaign HCP count
    await this.updateCampaignHcpCount(campaignId);

    return {
      success: true,
      reservation: this.toReservationApi(reservation, campaign.name),
      conflicts: conflictResult.conflicts.length > 0 ? conflictResult.conflicts : undefined,
    };
  }

  /**
   * Batch reserve HCPs for a campaign
   */
  async batchReserveHcps(
    campaignId: string,
    reservations: Array<{
      hcpId: string;
      channel: string;
      reservedFrom: Date;
      reservedUntil: Date;
      reservationType?: ReservationType;
      plannedActionDate?: Date;
    }>
  ): Promise<BatchReservationResult> {
    const results: ReservationApi[] = [];
    const conflicts: ConflictApi[] = [];
    const errors: Array<{ hcpId: string; channel: string; error: string }> = [];

    for (const req of reservations) {
      try {
        const result = await this.reserveHcp(
          campaignId,
          req.hcpId,
          req.channel,
          req.reservedFrom,
          req.reservedUntil,
          {
            reservationType: req.reservationType,
            plannedActionDate: req.plannedActionDate,
          }
        );

        if (result.success && result.reservation) {
          results.push(result.reservation);
        }
        if (result.conflicts) {
          conflicts.push(...result.conflicts);
        }
        if (!result.success && !result.conflicts) {
          errors.push({
            hcpId: req.hcpId,
            channel: req.channel,
            error: result.message || "Unknown error",
          });
        }
      } catch (error) {
        errors.push({
          hcpId: req.hcpId,
          channel: req.channel,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      totalRequested: reservations.length,
      successCount: results.length,
      failedCount: errors.length,
      conflictCount: conflicts.length,
      reservations: results,
      conflicts,
      errors,
    };
  }

  /**
   * Release a reservation
   */
  async releaseReservation(reservationId: string): Promise<boolean> {
    const [reservation] = await db
      .select()
      .from(hcpReservations)
      .where(eq(hcpReservations.id, reservationId));

    if (!reservation) return false;

    await db
      .update(hcpReservations)
      .set({ status: "released", updatedAt: new Date() })
      .where(eq(hcpReservations.id, reservationId));

    await this.updateCampaignHcpCount(reservation.campaignId);
    return true;
  }

  /**
   * Extend a reservation
   */
  async extendReservation(reservationId: string, newEndDate: Date): Promise<boolean> {
    const [reservation] = await db
      .select()
      .from(hcpReservations)
      .where(eq(hcpReservations.id, reservationId));

    if (!reservation) return false;

    // Check for conflicts with the extended period
    const conflictResult = await this.detectReservationConflicts(
      reservation.hcpId,
      reservation.channel,
      reservation.reservedUntil, // Start from current end
      newEndDate,
      reservation.campaignId
    );

    if (conflictResult.hasConflict && !conflictResult.canProceed) {
      throw new Error("Cannot extend reservation due to conflicts");
    }

    await db
      .update(hcpReservations)
      .set({ reservedUntil: newEndDate, updatedAt: new Date() })
      .where(eq(hcpReservations.id, reservationId));

    return true;
  }

  /**
   * Mark a reservation as executed
   */
  async markReservationExecuted(reservationId: string): Promise<boolean> {
    await db
      .update(hcpReservations)
      .set({ status: "executed", executedAt: new Date(), updatedAt: new Date() })
      .where(eq(hcpReservations.id, reservationId));
    return true;
  }

  /**
   * Get active reservations for an HCP
   */
  async getActiveReservations(hcpId: string): Promise<ReservationApi[]> {
    const now = new Date();
    const reservations = await db
      .select()
      .from(hcpReservations)
      .where(and(
        eq(hcpReservations.hcpId, hcpId),
        eq(hcpReservations.status, "active"),
        lte(hcpReservations.reservedFrom, now),
        gte(hcpReservations.reservedUntil, now)
      ))
      .orderBy(desc(hcpReservations.priority));

    return reservations.map(r => this.toReservationApi(r));
  }

  /**
   * Get all reservations for a campaign
   */
  async getCampaignReservations(campaignId: string, status?: ReservationStatus): Promise<ReservationApi[]> {
    const conditions = [eq(hcpReservations.campaignId, campaignId)];
    if (status) {
      conditions.push(eq(hcpReservations.status, status));
    }

    const reservations = await db
      .select()
      .from(hcpReservations)
      .where(and(...conditions))
      .orderBy(asc(hcpReservations.reservedFrom));

    return reservations.map(r => this.toReservationApi(r));
  }

  /**
   * Get available time slots for an HCP on a channel
   */
  async getAvailableSlots(
    hcpId: string,
    channel: string,
    dateRange: DateRange,
    excludeCampaignId?: string
  ): Promise<AvailabilityResult> {
    // Get existing reservations in the date range
    const conditions = [
      eq(hcpReservations.hcpId, hcpId),
      eq(hcpReservations.channel, channel),
      eq(hcpReservations.status, "active"),
      lte(hcpReservations.reservedFrom, dateRange.end),
      gte(hcpReservations.reservedUntil, dateRange.start),
    ];

    if (excludeCampaignId) {
      conditions.push(ne(hcpReservations.campaignId, excludeCampaignId));
    }

    const existingReservations = await db
      .select({
        reservation: hcpReservations,
        campaign: campaigns,
      })
      .from(hcpReservations)
      .leftJoin(campaigns, eq(hcpReservations.campaignId, campaigns.id))
      .where(and(...conditions))
      .orderBy(asc(hcpReservations.reservedFrom));

    // Calculate available slots
    const slots: TimeSlot[] = [];
    let currentStart = dateRange.start;

    for (const { reservation, campaign } of existingReservations) {
      const resStart = new Date(reservation.reservedFrom);
      const resEnd = new Date(reservation.reservedUntil);

      // Add available slot before this reservation
      if (currentStart < resStart) {
        slots.push({
          start: currentStart.toISOString(),
          end: resStart.toISOString(),
          available: true,
          reservedBy: null,
          reservationType: null,
        });
      }

      // Add reserved slot
      slots.push({
        start: resStart.toISOString(),
        end: resEnd.toISOString(),
        available: false,
        reservedBy: reservation.campaignId,
        reservationType: reservation.reservationType as ReservationType,
      });

      currentStart = resEnd;
    }

    // Add remaining available time
    if (currentStart < dateRange.end) {
      slots.push({
        start: currentStart.toISOString(),
        end: dateRange.end.toISOString(),
        available: true,
        reservedBy: null,
        reservationType: null,
      });
    }

    const hasAvailableSlot = slots.some(s => s.available);

    return {
      hcpId,
      channel,
      available: hasAvailableSlot,
      slots,
      existingReservations: existingReservations.map(({ reservation, campaign }) => ({
        campaignId: reservation.campaignId,
        campaignName: campaign?.name || "Unknown",
        reservedFrom: reservation.reservedFrom.toISOString(),
        reservedUntil: reservation.reservedUntil.toISOString(),
        canPreempt: reservation.canPreempt,
        priority: reservation.priority,
      })),
    };
  }

  // ==========================================================================
  // CONFLICT DETECTION
  // ==========================================================================

  /**
   * Detect conflicts for a proposed reservation
   */
  async detectReservationConflicts(
    hcpId: string,
    channel: string,
    reservedFrom: Date,
    reservedUntil: Date,
    campaignId: string
  ): Promise<ConflictDetectionResult> {
    // Get campaign priority
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) {
      return {
        hasConflict: false,
        conflicts: [],
        canProceed: false,
        message: "Campaign not found",
      };
    }

    // Find overlapping reservations
    const overlapping = await db
      .select({
        reservation: hcpReservations,
        campaign: campaigns,
      })
      .from(hcpReservations)
      .leftJoin(campaigns, eq(hcpReservations.campaignId, campaigns.id))
      .where(and(
        eq(hcpReservations.hcpId, hcpId),
        eq(hcpReservations.channel, channel),
        eq(hcpReservations.status, "active"),
        ne(hcpReservations.campaignId, campaignId),
        // Overlap check: new reservation overlaps with existing
        lte(hcpReservations.reservedFrom, reservedUntil),
        gte(hcpReservations.reservedUntil, reservedFrom)
      ));

    if (overlapping.length === 0) {
      return {
        hasConflict: false,
        conflicts: [],
        canProceed: true,
      };
    }

    const conflicts: ConflictApi[] = [];
    let canProceed = true;

    for (const { reservation, campaign: existingCampaign } of overlapping) {
      const conflict: ConflictApi = {
        id: "", // Will be assigned when logged
        hcpId,
        channel,
        conflictType: "overlap",
        campaign1Id: campaignId,
        campaign1Name: campaign.name,
        campaign2Id: reservation.campaignId,
        campaign2Name: existingCampaign?.name || null,
        reservation1Id: null,
        reservation2Id: reservation.id,
        conflictDate: new Date().toISOString(),
        severity: this.calculateConflictSeverity(campaign.priority, reservation.priority),
        description: `Overlapping reservation with campaign "${existingCampaign?.name || 'Unknown'}"`,
        resolution: null,
        resolutionNotes: null,
        resolvedAt: null,
        resolvedBy: null,
        autoResolved: null,
        createdAt: new Date().toISOString(),
      };

      conflicts.push(conflict);

      // Check if we can proceed (higher priority or can preempt)
      if (reservation.reservationType === "exclusive") {
        canProceed = false;
      } else if (campaign.priority <= reservation.priority && !reservation.canPreempt) {
        canProceed = false;
      }
    }

    return {
      hasConflict: true,
      conflicts,
      canProceed,
      message: canProceed
        ? "Conflicts detected but can proceed due to higher priority"
        : "Conflicts prevent reservation - existing reservations have higher or equal priority",
    };
  }

  /**
   * Detect all conflicts for a campaign
   */
  async detectCampaignConflicts(campaignId: string): Promise<ConflictApi[]> {
    const reservations = await this.getCampaignReservations(campaignId, "active");
    const conflicts: ConflictApi[] = [];

    for (const reservation of reservations) {
      const result = await this.detectReservationConflicts(
        reservation.hcpId,
        reservation.channel,
        new Date(reservation.reservedFrom),
        new Date(reservation.reservedUntil),
        campaignId
      );
      conflicts.push(...result.conflicts);
    }

    return conflicts;
  }

  /**
   * Detect conflicts for an HCP across all campaigns
   */
  async detectHcpConflicts(hcpId: string, dateRange?: DateRange): Promise<ConflictApi[]> {
    const now = new Date();
    const start = dateRange?.start || now;
    const end = dateRange?.end || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days ahead

    const reservations = await db
      .select({
        reservation: hcpReservations,
        campaign: campaigns,
      })
      .from(hcpReservations)
      .leftJoin(campaigns, eq(hcpReservations.campaignId, campaigns.id))
      .where(and(
        eq(hcpReservations.hcpId, hcpId),
        eq(hcpReservations.status, "active"),
        lte(hcpReservations.reservedFrom, end),
        gte(hcpReservations.reservedUntil, start)
      ))
      .orderBy(asc(hcpReservations.reservedFrom));

    const conflicts: ConflictApi[] = [];

    // Check for overlaps between reservations
    for (let i = 0; i < reservations.length; i++) {
      for (let j = i + 1; j < reservations.length; j++) {
        const r1 = reservations[i];
        const r2 = reservations[j];

        if (r1.reservation.channel !== r2.reservation.channel) continue;

        const start1 = new Date(r1.reservation.reservedFrom);
        const end1 = new Date(r1.reservation.reservedUntil);
        const start2 = new Date(r2.reservation.reservedFrom);
        const end2 = new Date(r2.reservation.reservedUntil);

        // Check for overlap
        if (start1 <= end2 && end1 >= start2) {
          conflicts.push({
            id: "",
            hcpId,
            channel: r1.reservation.channel,
            conflictType: "overlap",
            campaign1Id: r1.reservation.campaignId,
            campaign1Name: r1.campaign?.name || undefined,
            campaign2Id: r2.reservation.campaignId,
            campaign2Name: r2.campaign?.name || null,
            reservation1Id: r1.reservation.id,
            reservation2Id: r2.reservation.id,
            conflictDate: new Date().toISOString(),
            severity: "medium",
            description: `Overlapping reservations on channel ${r1.reservation.channel}`,
            resolution: null,
            resolutionNotes: null,
            resolvedAt: null,
            resolvedBy: null,
            autoResolved: null,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    return conflicts;
  }

  // ==========================================================================
  // CONFLICT RESOLUTION
  // ==========================================================================

  /**
   * Log a conflict
   */
  async logConflict(data: {
    hcpId: string;
    channel: string;
    conflictType: ConflictType;
    campaign1Id: string;
    campaign2Id?: string | null;
    reservation1Id?: string | null;
    reservation2Id?: string | null;
    conflictDate: Date;
    severity?: string;
    description?: string;
  }): Promise<ConflictLog> {
    const [conflict] = await db
      .insert(conflictLog)
      .values({
        hcpId: data.hcpId,
        channel: data.channel,
        conflictType: data.conflictType,
        campaign1Id: data.campaign1Id,
        campaign2Id: data.campaign2Id,
        reservation1Id: data.reservation1Id,
        reservation2Id: data.reservation2Id,
        conflictDate: data.conflictDate,
        severity: data.severity || "medium",
        description: data.description,
      })
      .returning();
    return conflict;
  }

  /**
   * Resolve a conflict manually
   */
  async resolveConflict(
    conflictId: string,
    resolution: ConflictResolution,
    resolvedBy: string,
    notes?: string
  ): Promise<ConflictLog | null> {
    const [conflict] = await db
      .select()
      .from(conflictLog)
      .where(eq(conflictLog.id, conflictId));

    if (!conflict) return null;

    // Apply resolution
    await this.applyResolution(conflict, resolution);

    // Update conflict log
    const [updated] = await db
      .update(conflictLog)
      .set({
        resolution,
        resolutionNotes: notes,
        resolvedAt: new Date(),
        resolvedBy,
        autoResolved: false,
      })
      .where(eq(conflictLog.id, conflictId))
      .returning();

    return updated || null;
  }

  /**
   * Auto-resolve conflicts for a campaign based on strategy
   */
  async autoResolveConflicts(
    campaignId?: string,
    strategy: "priority" | "first_come" | "budget_efficiency" = "priority"
  ): Promise<ResolutionReport> {
    // Get unresolved conflicts
    const conditions = [isNull(conflictLog.resolution)];
    if (campaignId) {
      conditions.push(or(
        eq(conflictLog.campaign1Id, campaignId),
        eq(conflictLog.campaign2Id, campaignId)
      )!);
    }

    const unresolvedConflicts = await db
      .select()
      .from(conflictLog)
      .where(and(...conditions));

    const report: ResolutionReport = {
      totalConflicts: unresolvedConflicts.length,
      resolved: 0,
      unresolved: unresolvedConflicts.length,
      byResolution: [],
      actions: [],
    };

    const resolutionCounts: Record<string, number> = {};

    for (const conflict of unresolvedConflicts) {
      try {
        const resolution = await this.determineAutoResolution(conflict, strategy);
        if (resolution) {
          await this.applyResolution(conflict, resolution);

          await db
            .update(conflictLog)
            .set({
              resolution,
              resolvedAt: new Date(),
              resolvedBy: "system",
              autoResolved: true,
            })
            .where(eq(conflictLog.id, conflict.id));

          report.resolved++;
          report.unresolved--;
          resolutionCounts[resolution] = (resolutionCounts[resolution] || 0) + 1;

          report.actions.push({
            conflictId: conflict.id,
            resolution,
            affectedReservations: [conflict.reservation1Id, conflict.reservation2Id].filter((x): x is string => !!x),
          });
        }
      } catch {
        // Skip conflicts that can't be auto-resolved
      }
    }

    report.byResolution = Object.entries(resolutionCounts).map(([resolution, count]) => ({
      resolution,
      count,
    }));

    return report;
  }

  /**
   * Determine auto-resolution based on strategy
   */
  private async determineAutoResolution(
    conflict: ConflictLog,
    strategy: "priority" | "first_come" | "budget_efficiency"
  ): Promise<ConflictResolution | null> {
    const [campaign1] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, conflict.campaign1Id));

    const [campaign2] = conflict.campaign2Id
      ? await db.select().from(campaigns).where(eq(campaigns.id, conflict.campaign2Id))
      : [null];

    if (!campaign1) return null;

    switch (strategy) {
      case "priority":
        if (!campaign2) return "campaign1_wins";
        if (campaign1.priority > campaign2.priority) return "campaign1_wins";
        if (campaign2.priority > campaign1.priority) return "campaign2_wins";
        return "deferred"; // Equal priority needs manual resolution

      case "first_come":
        if (!campaign2) return "campaign1_wins";
        if (campaign1.createdAt < campaign2.createdAt) return "campaign1_wins";
        return "campaign2_wins";

      case "budget_efficiency":
        // Winner has better budget utilization
        if (!campaign2) return "campaign1_wins";
        const util1 = campaign1.budget && campaign1.spentToDate
          ? (campaign1.spentToDate / campaign1.budget)
          : 0;
        const util2 = campaign2.budget && campaign2.spentToDate
          ? (campaign2.spentToDate / campaign2.budget)
          : 0;
        return util1 < util2 ? "campaign1_wins" : "campaign2_wins";

      default:
        return null;
    }
  }

  /**
   * Apply a conflict resolution
   */
  private async applyResolution(conflict: ConflictLog, resolution: ConflictResolution): Promise<void> {
    switch (resolution) {
      case "campaign1_wins":
        // Release campaign2's reservation if exists
        if (conflict.reservation2Id) {
          await this.releaseReservation(conflict.reservation2Id);
        }
        break;

      case "campaign2_wins":
        // Release campaign1's reservation if exists
        if (conflict.reservation1Id) {
          await this.releaseReservation(conflict.reservation1Id);
        }
        break;

      case "merged":
        // Both reservations remain, conflict acknowledged
        break;

      case "deferred":
        // No action taken, needs manual review
        break;

      case "cancelled":
        // Both reservations released
        if (conflict.reservation1Id) await this.releaseReservation(conflict.reservation1Id);
        if (conflict.reservation2Id) await this.releaseReservation(conflict.reservation2Id);
        break;
    }
  }

  // ==========================================================================
  // PREEMPTION
  // ==========================================================================

  /**
   * Check if a campaign can preempt an existing reservation
   */
  async canPreempt(newCampaignId: string, existingReservationId: string): Promise<boolean> {
    const [newCampaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, newCampaignId));

    const [reservation] = await db
      .select()
      .from(hcpReservations)
      .where(eq(hcpReservations.id, existingReservationId));

    if (!newCampaign || !reservation) return false;

    // Can preempt if:
    // 1. New campaign has higher priority
    // 2. Existing reservation allows preemption
    return newCampaign.priority > reservation.priority && reservation.canPreempt;
  }

  /**
   * Preempt an existing reservation with a new campaign
   */
  async preempt(newCampaignId: string, existingReservationId: string): Promise<boolean> {
    const canDo = await this.canPreempt(newCampaignId, existingReservationId);
    if (!canDo) return false;

    await db
      .update(hcpReservations)
      .set({
        status: "preempted",
        preemptedBy: newCampaignId,
        updatedAt: new Date(),
      })
      .where(eq(hcpReservations.id, existingReservationId));

    return true;
  }

  // ==========================================================================
  // QUERIES & SUMMARIES
  // ==========================================================================

  /**
   * Get campaign summary for dashboard
   */
  async getCampaignSummary(): Promise<CampaignSummary> {
    const allCampaigns = await db.select().from(campaigns);
    const allReservations = await db.select().from(hcpReservations);
    const allConflicts = await db.select().from(conflictLog);

    const summary: CampaignSummary = {
      totalCampaigns: allCampaigns.length,
      activeCampaigns: allCampaigns.filter(c => c.status === "active").length,
      draftCampaigns: allCampaigns.filter(c => c.status === "draft").length,
      pausedCampaigns: allCampaigns.filter(c => c.status === "paused").length,
      completedCampaigns: allCampaigns.filter(c => c.status === "completed").length,
      totalBudget: allCampaigns.reduce((sum, c) => sum + (c.budget || 0), 0),
      totalSpent: allCampaigns.reduce((sum, c) => sum + (c.spentToDate || 0), 0),
      totalReservations: allReservations.length,
      activeReservations: allReservations.filter(r => r.status === "active").length,
      pendingConflicts: allConflicts.filter(c => !c.resolution).length,
      resolvedConflicts: allConflicts.filter(c => c.resolution).length,
      byBrand: [],
      byStatus: [],
    };

    // Group by brand
    const brandMap = new Map<string, { campaignCount: number; totalBudget: number; reservationCount: number }>();
    for (const campaign of allCampaigns) {
      const brand = campaign.brand || "Unassigned";
      const existing = brandMap.get(brand) || { campaignCount: 0, totalBudget: 0, reservationCount: 0 };
      existing.campaignCount++;
      existing.totalBudget += campaign.budget || 0;
      existing.reservationCount += allReservations.filter(r => r.campaignId === campaign.id).length;
      brandMap.set(brand, existing);
    }
    summary.byBrand = Array.from(brandMap.entries()).map(([brand, data]) => ({
      brand,
      ...data,
    }));

    // Group by status
    const statusMap = new Map<string, number>();
    for (const campaign of allCampaigns) {
      const count = statusMap.get(campaign.status) || 0;
      statusMap.set(campaign.status, count + 1);
    }
    summary.byStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
    }));

    return summary;
  }

  /**
   * Get HCP campaign view - all campaigns targeting an HCP
   */
  async getHcpCampaignView(hcpId: string): Promise<HcpCampaignView> {
    const reservations = await db
      .select({
        reservation: hcpReservations,
        campaign: campaigns,
      })
      .from(hcpReservations)
      .leftJoin(campaigns, eq(hcpReservations.campaignId, campaigns.id))
      .where(eq(hcpReservations.hcpId, hcpId))
      .orderBy(desc(hcpReservations.priority));

    // Group by campaign
    const campaignMap = new Map<string, {
      campaignId: string;
      campaignName: string;
      priority: number;
      status: string;
      channels: Set<string>;
      reservations: Array<{
        id: string;
        channel: string;
        reservedFrom: string;
        reservedUntil: string;
        status: string;
      }>;
    }>();

    for (const { reservation, campaign } of reservations) {
      const existing = campaignMap.get(reservation.campaignId);
      if (existing) {
        existing.channels.add(reservation.channel);
        existing.reservations.push({
          id: reservation.id,
          channel: reservation.channel,
          reservedFrom: reservation.reservedFrom.toISOString(),
          reservedUntil: reservation.reservedUntil.toISOString(),
          status: reservation.status,
        });
      } else {
        campaignMap.set(reservation.campaignId, {
          campaignId: reservation.campaignId,
          campaignName: campaign?.name || "Unknown",
          priority: campaign?.priority || 50,
          status: campaign?.status || "unknown",
          channels: new Set([reservation.channel]),
          reservations: [{
            id: reservation.id,
            channel: reservation.channel,
            reservedFrom: reservation.reservedFrom.toISOString(),
            reservedUntil: reservation.reservedUntil.toISOString(),
            status: reservation.status,
          }],
        });
      }
    }

    const now = new Date();
    const activeCount = reservations.filter(
      r => r.reservation.status === "active" &&
           new Date(r.reservation.reservedFrom) <= now &&
           new Date(r.reservation.reservedUntil) >= now
    ).length;

    const upcomingCount = reservations.filter(
      r => r.reservation.status === "active" &&
           r.reservation.plannedActionDate &&
           new Date(r.reservation.plannedActionDate) > now
    ).length;

    return {
      hcpId,
      campaigns: Array.from(campaignMap.values()).map(c => ({
        ...c,
        channels: Array.from(c.channels),
      })),
      totalReservations: reservations.length,
      activeReservations: activeCount,
      upcomingActions: upcomingCount,
    };
  }

  /**
   * List unresolved conflicts
   */
  async listUnresolvedConflicts(campaignId?: string): Promise<ConflictApi[]> {
    const conditions = [isNull(conflictLog.resolution)];
    if (campaignId) {
      conditions.push(or(
        eq(conflictLog.campaign1Id, campaignId),
        eq(conflictLog.campaign2Id, campaignId)
      )!);
    }

    const conflicts = await db
      .select()
      .from(conflictLog)
      .where(and(...conditions))
      .orderBy(desc(conflictLog.createdAt));

    return conflicts.map(c => this.toConflictApi(c));
  }

  /**
   * Expire stale reservations
   */
  async expireStaleReservations(): Promise<number> {
    const now = new Date();
    const result = await db
      .update(hcpReservations)
      .set({ status: "expired", updatedAt: now })
      .where(and(
        eq(hcpReservations.status, "active"),
        lte(hcpReservations.reservedUntil, now)
      ))
      .returning();

    // Update campaign HCP counts
    const campaignIds = Array.from(new Set(result.map(r => r.campaignId)));
    for (const campaignId of campaignIds) {
      await this.updateCampaignHcpCount(campaignId);
    }

    return result.length;
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private toCampaignApi(campaign: CampaignDB, computed?: {
    reservationCount?: number;
    activeReservationCount?: number;
    conflictCount?: number;
  }): CampaignApi {
    return {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      brand: campaign.brand,
      businessUnit: campaign.businessUnit,
      priority: campaign.priority,
      status: campaign.status as CampaignStatus,
      startDate: campaign.startDate?.toISOString() ?? null,
      endDate: campaign.endDate?.toISOString() ?? null,
      targetAudienceId: campaign.targetAudienceId,
      channelMix: campaign.channelMix,
      budget: campaign.budget,
      budgetSpent: campaign.spentToDate,
      targetHcpCount: null, // Not in current schema
      actualHcpCount: null, // Not in current schema
      createdBy: campaign.createdBy,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
      reservationCount: computed?.reservationCount,
      activeReservationCount: computed?.activeReservationCount,
      conflictCount: computed?.conflictCount,
    };
  }

  private toReservationApi(reservation: HcpReservation, campaignName?: string): ReservationApi {
    return {
      id: reservation.id,
      campaignId: reservation.campaignId,
      campaignName,
      hcpId: reservation.hcpId,
      channel: reservation.channel,
      reservationType: reservation.reservationType as ReservationType,
      priority: reservation.priority,
      reservedFrom: reservation.reservedFrom.toISOString(),
      reservedUntil: reservation.reservedUntil.toISOString(),
      plannedActionDate: reservation.plannedActionDate?.toISOString() ?? null,
      status: reservation.status as ReservationStatus,
      canPreempt: reservation.canPreempt,
      preemptedBy: reservation.preemptedBy,
      executedAt: reservation.executedAt?.toISOString() ?? null,
      createdAt: reservation.createdAt.toISOString(),
      updatedAt: reservation.updatedAt.toISOString(),
    };
  }

  private toConflictApi(conflict: ConflictLog): ConflictApi {
    return {
      id: conflict.id,
      hcpId: conflict.hcpId,
      channel: conflict.channel,
      conflictType: conflict.conflictType as ConflictType,
      campaign1Id: conflict.campaign1Id,
      campaign2Id: conflict.campaign2Id,
      reservation1Id: conflict.reservation1Id,
      reservation2Id: conflict.reservation2Id,
      conflictDate: conflict.conflictDate.toISOString(),
      severity: conflict.severity,
      description: conflict.description,
      resolution: conflict.resolution as ConflictResolution | null,
      resolutionNotes: conflict.resolutionNotes,
      resolvedAt: conflict.resolvedAt?.toISOString() ?? null,
      resolvedBy: conflict.resolvedBy,
      autoResolved: conflict.autoResolved,
      createdAt: conflict.createdAt.toISOString(),
    };
  }

  private calculateConflictSeverity(priority1: number, priority2: number): string {
    const diff = Math.abs(priority1 - priority2);
    if (diff > 30) return "low"; // Clear priority difference
    if (diff > 10) return "medium"; // Some priority difference
    return "high"; // Similar priorities, harder to resolve
  }

  private async updateCampaignHcpCount(campaignId: string): Promise<void> {
    const result = await db
      .select({ count: sql<number>`count(distinct ${hcpReservations.hcpId})` })
      .from(hcpReservations)
      .where(and(
        eq(hcpReservations.campaignId, campaignId),
        eq(hcpReservations.status, "active")
      ));

    await db
      .update(campaigns)
      .set({ totalReach: Number(result[0]?.count || 0), updatedAt: new Date() })
      .where(eq(campaigns.id, campaignId));
  }
}

// Export singleton instance
export const campaignCoordinator = new CampaignCoordinator();
