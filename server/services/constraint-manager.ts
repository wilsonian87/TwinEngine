/**
 * Phase 7A: Constraint Manager Service
 *
 * Manages all constraint types for the TwinEngine orchestration layer:
 * - Channel Capacity (daily/weekly/monthly limits)
 * - HCP Contact Limits (per-HCP frequency caps)
 * - Compliance Windows (blackout periods)
 * - Budget Allocations (spending limits)
 * - Territory Assignments (rep-HCP mappings)
 */

import { db } from "../db";
import { eq, and, gte, lte, or, inArray, isNull, sql, desc } from "drizzle-orm";
import {
  channelCapacity,
  hcpContactLimits,
  complianceWindows,
  budgetAllocations,
  territoryAssignments,
  hcpProfiles,
  type Channel,
  type ConstraintCheckResult,
  type ContactEligibility,
  type ConstraintSummary,
  type ProposedActionForConstraint,
  type ComplianceWindow,
  type BudgetAllocation,
  type InsertComplianceWindow,
  type InsertBudgetAllocation,
  type ComplianceWindowDB,
  type BudgetAllocationDB,
  type ChannelCapacityDB,
  type HcpContactLimitsDB,
  type TerritoryAssignmentDB,
  type InsertChannelCapacity,
  type InsertHcpContactLimits,
  type InsertTerritoryAssignment,
  channels,
} from "@shared/schema";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CapacityStatus {
  channel: string;
  dailyUsed: number;
  dailyLimit: number | null;
  weeklyUsed: number;
  weeklyLimit: number | null;
  monthlyUsed: number;
  monthlyLimit: number | null;
  utilizationPct: number;
  available: boolean;
}

export interface BudgetStatus {
  totalAllocated: number;
  totalSpent: number;
  totalCommitted: number;
  available: number;
  utilizationPct: number;
  // Aliases for constraint check result compatibility
  allocated: number;
  spent: number;
  committed: number;
}

export interface TerritoryAssignmentInfo {
  id: string;
  repId: string;
  repName: string;
  repEmail: string | null;
  assignmentType: string;
  territory: string | null;
  region: string | null;
  isActive: boolean;
}

// ============================================================================
// CONSTRAINT MANAGER SERVICE
// ============================================================================

export class ConstraintManager {
  // ==========================================================================
  // CAPACITY MANAGEMENT
  // ==========================================================================

  /**
   * Get capacity status for a channel
   */
  async getChannelCapacity(channel: Channel, repId?: string): Promise<CapacityStatus | null> {
    const conditions = [eq(channelCapacity.channel, channel), eq(channelCapacity.isActive, true)];

    if (repId) {
      conditions.push(eq(channelCapacity.repId, repId));
    } else {
      conditions.push(isNull(channelCapacity.repId));
    }

    const [capacity] = await db
      .select()
      .from(channelCapacity)
      .where(and(...conditions));

    if (!capacity) {
      return null;
    }

    const dailyLimit = capacity.dailyLimit ?? 0;
    const weeklyLimit = capacity.weeklyLimit ?? 0;
    const monthlyLimit = capacity.monthlyLimit ?? 0;
    const maxLimit = Math.max(dailyLimit, weeklyLimit, monthlyLimit);

    const dailyUsed = capacity.dailyUsed ?? 0;
    const weeklyUsed = capacity.weeklyUsed ?? 0;
    const monthlyUsed = capacity.monthlyUsed ?? 0;
    const maxUsed = Math.max(dailyUsed, weeklyUsed, monthlyUsed);

    const utilizationPct = maxLimit > 0 ? (maxUsed / maxLimit) * 100 : 0;

    const available = (
      (dailyLimit === null || dailyUsed < dailyLimit) &&
      (weeklyLimit === null || weeklyUsed < weeklyLimit) &&
      (monthlyLimit === null || monthlyUsed < monthlyLimit)
    );

    return {
      channel,
      dailyUsed,
      dailyLimit,
      weeklyUsed,
      weeklyLimit,
      monthlyUsed,
      monthlyLimit,
      utilizationPct,
      available,
    };
  }

  /**
   * Get all channel capacity records
   */
  async getAllChannelCapacity(): Promise<ChannelCapacityDB[]> {
    return db
      .select()
      .from(channelCapacity)
      .where(eq(channelCapacity.isActive, true))
      .orderBy(channelCapacity.channel);
  }

  /**
   * Consume capacity for a channel (increment usage)
   */
  async consumeCapacity(channel: Channel, amount: number = 1, repId?: string): Promise<boolean> {
    const capacity = await this.getChannelCapacity(channel, repId);
    if (!capacity || !capacity.available) {
      return false;
    }

    const conditions = [eq(channelCapacity.channel, channel), eq(channelCapacity.isActive, true)];
    if (repId) {
      conditions.push(eq(channelCapacity.repId, repId));
    } else {
      conditions.push(isNull(channelCapacity.repId));
    }

    await db
      .update(channelCapacity)
      .set({
        dailyUsed: (capacity.dailyUsed ?? 0) + amount,
        weeklyUsed: (capacity.weeklyUsed ?? 0) + amount,
        monthlyUsed: (capacity.monthlyUsed ?? 0) + amount,
        updatedAt: new Date(),
      })
      .where(and(...conditions));

    return true;
  }

  /**
   * Release capacity for a channel (decrement usage)
   */
  async releaseCapacity(channel: Channel, amount: number = 1, repId?: string): Promise<void> {
    const conditions = [eq(channelCapacity.channel, channel), eq(channelCapacity.isActive, true)];
    if (repId) {
      conditions.push(eq(channelCapacity.repId, repId));
    } else {
      conditions.push(isNull(channelCapacity.repId));
    }

    const [current] = await db
      .select()
      .from(channelCapacity)
      .where(and(...conditions));

    if (!current) return;

    await db
      .update(channelCapacity)
      .set({
        dailyUsed: Math.max(0, (current.dailyUsed ?? 0) - amount),
        weeklyUsed: Math.max(0, (current.weeklyUsed ?? 0) - amount),
        monthlyUsed: Math.max(0, (current.monthlyUsed ?? 0) - amount),
        updatedAt: new Date(),
      })
      .where(and(...conditions));
  }

  /**
   * Reset capacity counters (called on schedule)
   */
  async resetCapacity(channel: Channel, period: "daily" | "weekly" | "monthly"): Promise<void> {
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    switch (period) {
      case "daily":
        updates.dailyUsed = 0;
        break;
      case "weekly":
        updates.weeklyUsed = 0;
        break;
      case "monthly":
        updates.monthlyUsed = 0;
        break;
    }

    await db
      .update(channelCapacity)
      .set(updates)
      .where(eq(channelCapacity.channel, channel));
  }

  /**
   * Create or update channel capacity
   */
  async upsertChannelCapacity(data: InsertChannelCapacity): Promise<ChannelCapacityDB> {
    const conditions = [
      eq(channelCapacity.channel, data.channel),
      data.repId ? eq(channelCapacity.repId, data.repId) : isNull(channelCapacity.repId),
    ];

    const [existing] = await db
      .select()
      .from(channelCapacity)
      .where(and(...conditions));

    if (existing) {
      const [updated] = await db
        .update(channelCapacity)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(channelCapacity.id, existing.id))
        .returning();
      return updated;
    }

    const [inserted] = await db
      .insert(channelCapacity)
      .values(data)
      .returning();
    return inserted;
  }

  // ==========================================================================
  // HCP CONTACT LIMITS
  // ==========================================================================

  /**
   * Check if an HCP can be contacted on a specific channel
   */
  async canContactHcp(hcpId: string, channel: Channel): Promise<ContactEligibility> {
    const [limits] = await db
      .select()
      .from(hcpContactLimits)
      .where(eq(hcpContactLimits.hcpId, hcpId));

    // If no limits defined, contact is allowed
    if (!limits) {
      return {
        eligible: true,
        currentTouches: 0,
        maxTouches: 999,
      };
    }

    // Check do-not-contact flag
    if (limits.doNotContact) {
      return {
        eligible: false,
        reason: limits.doNotContactReason || "HCP has opted out of contact",
        currentTouches: 0,
        maxTouches: 0,
      };
    }

    // Check global limits
    const currentTouches = limits.touchesThisMonth ?? 0;
    const maxTouches = limits.maxTouchesPerMonth ?? 8;

    if (currentTouches >= maxTouches) {
      return {
        eligible: false,
        reason: `Monthly contact limit reached (${currentTouches}/${maxTouches})`,
        currentTouches,
        maxTouches,
        nextEligibleDate: this.getNextMonthStart().toISOString(),
      };
    }

    // Check channel-specific limits if defined
    const channelLimits = limits.channelLimits as Record<string, { maxPerWeek: number; maxPerMonth: number; minDaysBetween: number }> | null;
    if (channelLimits && channelLimits[channel]) {
      const chLimit = channelLimits[channel];

      // Check last contact cooldown
      if (limits.lastContactAt && limits.lastContactChannel === channel) {
        const daysSinceContact = Math.floor(
          (Date.now() - limits.lastContactAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceContact < chLimit.minDaysBetween) {
          return {
            eligible: false,
            reason: `Cooldown period not met for ${channel} (${daysSinceContact}/${chLimit.minDaysBetween} days)`,
            currentTouches,
            maxTouches,
            cooldownDaysRemaining: chLimit.minDaysBetween - daysSinceContact,
            nextEligibleDate: new Date(
              limits.lastContactAt.getTime() + chLimit.minDaysBetween * 24 * 60 * 60 * 1000
            ).toISOString(),
          };
        }
      }
    }

    return {
      eligible: true,
      currentTouches,
      maxTouches,
    };
  }

  /**
   * Record a contact with an HCP
   */
  async recordContact(hcpId: string, channel: Channel): Promise<void> {
    const now = new Date();

    const [existing] = await db
      .select()
      .from(hcpContactLimits)
      .where(eq(hcpContactLimits.hcpId, hcpId));

    if (existing) {
      await db
        .update(hcpContactLimits)
        .set({
          touchesThisWeek: (existing.touchesThisWeek ?? 0) + 1,
          touchesThisMonth: (existing.touchesThisMonth ?? 0) + 1,
          lastContactAt: now,
          lastContactChannel: channel,
          updatedAt: now,
        })
        .where(eq(hcpContactLimits.hcpId, hcpId));
    } else {
      await db
        .insert(hcpContactLimits)
        .values({
          hcpId,
          touchesThisWeek: 1,
          touchesThisMonth: 1,
          lastContactAt: now,
          lastContactChannel: channel,
        });
    }
  }

  /**
   * Get next eligible date for contacting an HCP
   */
  async getNextEligibleDate(hcpId: string, channel: Channel): Promise<Date | null> {
    const eligibility = await this.canContactHcp(hcpId, channel);
    if (eligibility.eligible) {
      return null; // Already eligible
    }
    return eligibility.nextEligibleDate ? new Date(eligibility.nextEligibleDate) : null;
  }

  /**
   * Get all HCP contact limits
   */
  async getAllHcpContactLimits(): Promise<HcpContactLimitsDB[]> {
    return db.select().from(hcpContactLimits);
  }

  /**
   * Get or create HCP contact limits
   */
  async getOrCreateHcpContactLimits(hcpId: string): Promise<HcpContactLimitsDB> {
    const [existing] = await db
      .select()
      .from(hcpContactLimits)
      .where(eq(hcpContactLimits.hcpId, hcpId));

    if (existing) return existing;

    const [inserted] = await db
      .insert(hcpContactLimits)
      .values({ hcpId })
      .returning();
    return inserted;
  }

  /**
   * Update HCP contact limits
   */
  async updateHcpContactLimits(hcpId: string, updates: Partial<InsertHcpContactLimits>): Promise<HcpContactLimitsDB | null> {
    const [updated] = await db
      .update(hcpContactLimits)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(hcpContactLimits.hcpId, hcpId))
      .returning();
    return updated || null;
  }

  // ==========================================================================
  // COMPLIANCE WINDOWS
  // ==========================================================================

  /**
   * Check if a channel is in blackout for a given date and HCP
   */
  async isInBlackout(channel: Channel, date: Date, hcpId?: string, specialty?: string): Promise<boolean> {
    const windows = await this.getActiveWindows(date);

    for (const window of windows) {
      if (window.windowType !== "blackout") continue;

      // Check channel match (null means all channels)
      if (window.channel && window.channel !== channel) continue;

      // Check HCP match (null means all HCPs)
      if (window.affectedHcpIds && hcpId && !window.affectedHcpIds.includes(hcpId)) continue;

      // Check specialty match (null means all specialties)
      if (window.affectedSpecialties && specialty && !window.affectedSpecialties.includes(specialty)) continue;

      return true;
    }

    return false;
  }

  /**
   * Get active compliance windows for a date
   */
  async getActiveWindows(date: Date): Promise<ComplianceWindowDB[]> {
    const windows = await db
      .select()
      .from(complianceWindows)
      .where(
        and(
          eq(complianceWindows.isActive, true),
          lte(complianceWindows.startDate, date),
          gte(complianceWindows.endDate, date)
        )
      );

    return windows;
  }

  /**
   * Get all compliance windows
   */
  async getAllComplianceWindows(): Promise<ComplianceWindowDB[]> {
    return db
      .select()
      .from(complianceWindows)
      .orderBy(desc(complianceWindows.startDate));
  }

  /**
   * Get upcoming compliance windows
   */
  async getUpcomingWindows(daysAhead: number = 30): Promise<ComplianceWindowDB[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    return db
      .select()
      .from(complianceWindows)
      .where(
        and(
          eq(complianceWindows.isActive, true),
          gte(complianceWindows.startDate, now),
          lte(complianceWindows.startDate, futureDate)
        )
      )
      .orderBy(complianceWindows.startDate);
  }

  /**
   * Create compliance window
   */
  async createComplianceWindow(data: {
    name: string;
    description?: string | null;
    channel?: string | null;
    windowType: string;
    startDate: Date;
    endDate: Date;
    recurrence?: string;
    affectedHcpIds?: string[] | null;
    affectedSpecialties?: string[] | null;
    affectedTerritories?: string[] | null;
    reason?: string | null;
    isActive?: boolean;
    createdBy?: string | null;
  }): Promise<ComplianceWindowDB> {
    const [inserted] = await db
      .insert(complianceWindows)
      .values({
        name: data.name,
        description: data.description,
        channel: data.channel,
        windowType: data.windowType,
        startDate: data.startDate,
        endDate: data.endDate,
        recurrence: data.recurrence,
        affectedHcpIds: data.affectedHcpIds,
        affectedSpecialties: data.affectedSpecialties,
        affectedTerritories: data.affectedTerritories,
        reason: data.reason,
        isActive: data.isActive,
        createdBy: data.createdBy,
      })
      .returning();
    return inserted;
  }

  /**
   * Update compliance window
   */
  async updateComplianceWindow(id: string, updates: {
    name?: string;
    description?: string | null;
    channel?: string | null;
    windowType?: string;
    startDate?: Date;
    endDate?: Date;
    recurrence?: string;
    affectedHcpIds?: string[] | null;
    affectedSpecialties?: string[] | null;
    affectedTerritories?: string[] | null;
    reason?: string | null;
    isActive?: boolean;
    createdBy?: string | null;
  }): Promise<ComplianceWindowDB | null> {
    const [updated] = await db
      .update(complianceWindows)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(complianceWindows.id, id))
      .returning();
    return updated || null;
  }

  /**
   * Delete compliance window
   */
  async deleteComplianceWindow(id: string): Promise<boolean> {
    const result = await db
      .delete(complianceWindows)
      .where(eq(complianceWindows.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ==========================================================================
  // BUDGET ALLOCATIONS
  // ==========================================================================

  /**
   * Get budget status for a campaign/channel
   */
  async getBudgetStatus(campaignId?: string, channel?: Channel): Promise<BudgetStatus> {
    const conditions = [eq(budgetAllocations.isActive, true)];

    if (campaignId) {
      conditions.push(eq(budgetAllocations.campaignId, campaignId));
    }
    if (channel) {
      conditions.push(eq(budgetAllocations.channel, channel));
    }

    const allocations = await db
      .select()
      .from(budgetAllocations)
      .where(and(...conditions));

    const totalAllocated = allocations.reduce((sum, a) => sum + (a.allocatedAmount ?? 0), 0);
    const totalSpent = allocations.reduce((sum, a) => sum + (a.spentAmount ?? 0), 0);
    const totalCommitted = allocations.reduce((sum, a) => sum + (a.committedAmount ?? 0), 0);
    const available = totalAllocated - totalSpent - totalCommitted;
    const utilizationPct = totalAllocated > 0 ? ((totalSpent + totalCommitted) / totalAllocated) * 100 : 0;

    return {
      totalAllocated,
      totalSpent,
      totalCommitted,
      available,
      utilizationPct,
      // Aliases for constraint check result
      allocated: totalAllocated,
      spent: totalSpent,
      committed: totalCommitted,
    };
  }

  /**
   * Get all budget allocations
   */
  async getAllBudgetAllocations(): Promise<BudgetAllocationDB[]> {
    return db
      .select()
      .from(budgetAllocations)
      .where(eq(budgetAllocations.isActive, true))
      .orderBy(desc(budgetAllocations.periodStart));
  }

  /**
   * Commit budget (reserve for planned action)
   */
  async commitBudget(amount: number, allocationId: string): Promise<boolean> {
    const [allocation] = await db
      .select()
      .from(budgetAllocations)
      .where(eq(budgetAllocations.id, allocationId));

    if (!allocation) return false;

    const available = allocation.allocatedAmount - allocation.spentAmount - allocation.committedAmount;
    if (amount > available) return false;

    await db
      .update(budgetAllocations)
      .set({
        committedAmount: allocation.committedAmount + amount,
        updatedAt: new Date(),
      })
      .where(eq(budgetAllocations.id, allocationId));

    return true;
  }

  /**
   * Release committed budget
   */
  async releaseBudget(amount: number, allocationId: string): Promise<void> {
    const [allocation] = await db
      .select()
      .from(budgetAllocations)
      .where(eq(budgetAllocations.id, allocationId));

    if (!allocation) return;

    await db
      .update(budgetAllocations)
      .set({
        committedAmount: Math.max(0, allocation.committedAmount - amount),
        updatedAt: new Date(),
      })
      .where(eq(budgetAllocations.id, allocationId));
  }

  /**
   * Record actual spend
   */
  async recordSpend(amount: number, allocationId: string, releaseCommitment: boolean = true): Promise<void> {
    const [allocation] = await db
      .select()
      .from(budgetAllocations)
      .where(eq(budgetAllocations.id, allocationId));

    if (!allocation) return;

    const updates: Record<string, unknown> = {
      spentAmount: allocation.spentAmount + amount,
      updatedAt: new Date(),
    };

    if (releaseCommitment) {
      updates.committedAmount = Math.max(0, allocation.committedAmount - amount);
    }

    await db
      .update(budgetAllocations)
      .set(updates)
      .where(eq(budgetAllocations.id, allocationId));
  }

  /**
   * Create budget allocation
   */
  async createBudgetAllocation(data: InsertBudgetAllocation): Promise<BudgetAllocationDB> {
    const [inserted] = await db
      .insert(budgetAllocations)
      .values(data)
      .returning();
    return inserted;
  }

  /**
   * Update budget allocation
   */
  async updateBudgetAllocation(id: string, updates: Partial<InsertBudgetAllocation>): Promise<BudgetAllocationDB | null> {
    const [updated] = await db
      .update(budgetAllocations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(budgetAllocations.id, id))
      .returning();
    return updated || null;
  }

  /**
   * Delete budget allocation
   */
  async deleteBudgetAllocation(id: string): Promise<boolean> {
    const result = await db
      .delete(budgetAllocations)
      .where(eq(budgetAllocations.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ==========================================================================
  // TERRITORY ASSIGNMENTS
  // ==========================================================================

  /**
   * Get reps assigned to an HCP
   */
  async getAssignedReps(hcpId: string): Promise<TerritoryAssignmentInfo[]> {
    const assignments = await db
      .select()
      .from(territoryAssignments)
      .where(
        and(
          eq(territoryAssignments.hcpId, hcpId),
          eq(territoryAssignments.isActive, true)
        )
      );

    return assignments.map((a) => ({
      id: a.id,
      repId: a.repId,
      repName: a.repName,
      repEmail: a.repEmail,
      assignmentType: a.assignmentType,
      territory: a.territory,
      region: a.region,
      isActive: a.isActive,
    }));
  }

  /**
   * Check if a rep can contact an HCP (based on territory assignment)
   */
  async canRepContactHcp(repId: string, hcpId: string): Promise<boolean> {
    const [assignment] = await db
      .select()
      .from(territoryAssignments)
      .where(
        and(
          eq(territoryAssignments.repId, repId),
          eq(territoryAssignments.hcpId, hcpId),
          eq(territoryAssignments.isActive, true)
        )
      );

    return !!assignment;
  }

  /**
   * Get all territory assignments
   */
  async getAllTerritoryAssignments(): Promise<TerritoryAssignmentDB[]> {
    return db
      .select()
      .from(territoryAssignments)
      .where(eq(territoryAssignments.isActive, true));
  }

  /**
   * Create territory assignment
   */
  async createTerritoryAssignment(data: InsertTerritoryAssignment): Promise<TerritoryAssignmentDB> {
    const [inserted] = await db
      .insert(territoryAssignments)
      .values(data)
      .returning();
    return inserted;
  }

  /**
   * Update territory assignment
   */
  async updateTerritoryAssignment(id: string, updates: Partial<InsertTerritoryAssignment>): Promise<TerritoryAssignmentDB | null> {
    const [updated] = await db
      .update(territoryAssignments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(territoryAssignments.id, id))
      .returning();
    return updated || null;
  }

  /**
   * Delete territory assignment
   */
  async deleteTerritoryAssignment(id: string): Promise<boolean> {
    const result = await db
      .delete(territoryAssignments)
      .where(eq(territoryAssignments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ==========================================================================
  // AGGREGATE CONSTRAINT CHECKING
  // ==========================================================================

  /**
   * Check all constraints for a proposed action
   */
  async checkConstraints(action: ProposedActionForConstraint): Promise<ConstraintCheckResult> {
    const violations: ConstraintCheckResult["violations"] = [];
    const warnings: string[] = [];

    const plannedDate = action.plannedDate ? new Date(action.plannedDate) : new Date();
    const channel = action.channel as Channel;

    // Get HCP info for specialty check
    const [hcp] = await db
      .select()
      .from(hcpProfiles)
      .where(eq(hcpProfiles.id, action.hcpId));

    // 1. Check capacity constraints
    const capacity = await this.getChannelCapacity(channel);
    if (capacity) {
      if (!capacity.available) {
        violations.push({
          constraintType: "capacity",
          reason: `Channel ${channel} capacity exhausted`,
          severity: "error",
          details: {
            dailyUsed: capacity.dailyUsed,
            dailyLimit: capacity.dailyLimit,
            weeklyUsed: capacity.weeklyUsed,
            weeklyLimit: capacity.weeklyLimit,
          },
        });
      } else if (capacity.utilizationPct > 80) {
        warnings.push(`Channel ${channel} capacity at ${capacity.utilizationPct.toFixed(1)}%`);
      }
    }

    // 2. Check HCP contact limits
    const contactEligibility = await this.canContactHcp(action.hcpId, channel);
    if (!contactEligibility.eligible) {
      violations.push({
        constraintType: "contact_limit",
        reason: contactEligibility.reason || "Contact limit reached",
        severity: "error",
        details: {
          currentTouches: contactEligibility.currentTouches,
          maxTouches: contactEligibility.maxTouches,
          nextEligibleDate: contactEligibility.nextEligibleDate,
        },
      });
    }

    // 3. Check compliance windows (blackouts)
    const inBlackout = await this.isInBlackout(
      channel,
      plannedDate,
      action.hcpId,
      hcp?.specialty
    );
    if (inBlackout) {
      const activeWindows = await this.getActiveWindows(plannedDate);
      const matchingWindow = activeWindows.find((w) => w.windowType === "blackout");

      violations.push({
        constraintType: "compliance",
        constraintId: matchingWindow?.id,
        reason: `Channel ${channel} is in blackout period${matchingWindow ? `: ${matchingWindow.name}` : ""}`,
        severity: "error",
        details: matchingWindow ? {
          windowName: matchingWindow.name,
          reason: matchingWindow.reason,
          endDate: matchingWindow.endDate.toISOString(),
        } : undefined,
      });
    }

    // 4. Check budget constraints
    if (action.estimatedCost && action.campaignId) {
      const budgetStatus = await this.getBudgetStatus(action.campaignId, channel);
      if (action.estimatedCost > budgetStatus.available) {
        violations.push({
          constraintType: "budget",
          reason: `Insufficient budget: ${action.estimatedCost} required, ${budgetStatus.available} available`,
          severity: "error",
          details: {
            required: action.estimatedCost,
            available: budgetStatus.available,
            allocated: budgetStatus.totalAllocated,
            spent: budgetStatus.totalSpent,
            committed: budgetStatus.totalCommitted,
          },
        });
      } else if (budgetStatus.utilizationPct > 90) {
        warnings.push(`Budget utilization at ${budgetStatus.utilizationPct.toFixed(1)}%`);
      }
    }

    // 5. Check territory constraints (if rep is specified)
    if (action.repId) {
      const canContact = await this.canRepContactHcp(action.repId, action.hcpId);
      if (!canContact) {
        violations.push({
          constraintType: "territory",
          reason: `Rep ${action.repId} not assigned to HCP ${action.hcpId}`,
          severity: "warning",
        });
      }
    }

    return {
      passed: violations.filter((v) => v.severity === "error").length === 0,
      violations,
      warnings,
      capacityStatus: capacity ? {
        available: capacity.dailyLimit ? capacity.dailyLimit - capacity.dailyUsed : 999,
        used: capacity.dailyUsed,
        limit: capacity.dailyLimit ?? 0,
        utilizationPct: capacity.utilizationPct,
      } : undefined,
      budgetStatus: action.campaignId ? await this.getBudgetStatus(action.campaignId, channel) : undefined,
    };
  }

  // ==========================================================================
  // SUMMARY & REPORTING
  // ==========================================================================

  /**
   * Get constraint summary for dashboard
   */
  async getConstraintSummary(): Promise<ConstraintSummary> {
    // Capacity summary by channel
    const capacityRecords = await this.getAllChannelCapacity();
    const capacitySummary = capacityRecords.map((c) => {
      const dailyLimit = c.dailyLimit ?? 0;
      const weeklyLimit = c.weeklyLimit ?? 0;
      const monthlyLimit = c.monthlyLimit ?? 0;
      const maxLimit = Math.max(dailyLimit, weeklyLimit, monthlyLimit);
      const maxUsed = Math.max(c.dailyUsed ?? 0, c.weeklyUsed ?? 0, c.monthlyUsed ?? 0);
      const utilizationPct = maxLimit > 0 ? (maxUsed / maxLimit) * 100 : 0;

      let status: "healthy" | "warning" | "critical" = "healthy";
      if (utilizationPct >= 90) status = "critical";
      else if (utilizationPct >= 70) status = "warning";

      return {
        channel: c.channel,
        dailyUsed: c.dailyUsed ?? 0,
        dailyLimit: c.dailyLimit ?? 0,
        weeklyUsed: c.weeklyUsed ?? 0,
        weeklyLimit: c.weeklyLimit ?? 0,
        monthlyUsed: c.monthlyUsed ?? 0,
        monthlyLimit: c.monthlyLimit ?? 0,
        utilizationPct,
        status,
      };
    });

    // Budget summary
    const budgetRecords = await this.getAllBudgetAllocations();
    const totalAllocated = budgetRecords.reduce((sum, b) => sum + b.allocatedAmount, 0);
    const totalSpent = budgetRecords.reduce((sum, b) => sum + b.spentAmount, 0);
    const totalCommitted = budgetRecords.reduce((sum, b) => sum + b.committedAmount, 0);
    const budgetUtilizationPct = totalAllocated > 0 ? ((totalSpent + totalCommitted) / totalAllocated) * 100 : 0;

    // Group by channel for budget
    const budgetByChannel = new Map<string, { allocated: number; spent: number }>();
    for (const b of budgetRecords) {
      const ch = b.channel || "unspecified";
      const current = budgetByChannel.get(ch) || { allocated: 0, spent: 0 };
      current.allocated += b.allocatedAmount;
      current.spent += b.spentAmount;
      budgetByChannel.set(ch, current);
    }

    // Compliance windows
    const now = new Date();
    const allWindows = await this.getAllComplianceWindows();
    const activeWindows = allWindows.filter(
      (w) => w.isActive && w.startDate <= now && w.endDate >= now
    );
    const upcomingWindows = await this.getUpcomingWindows(30);

    // Count affected HCPs
    let affectedHcpCount = 0;
    for (const w of activeWindows) {
      if (w.affectedHcpIds) {
        affectedHcpCount += w.affectedHcpIds.length;
      } else {
        // If null, all HCPs are affected - we'd need to count them
        const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(hcpProfiles);
        affectedHcpCount = count;
        break;
      }
    }

    // Contact limits summary
    const contactLimitsRecords = await this.getAllHcpContactLimits();
    const hcpsAtLimit = contactLimitsRecords.filter(
      (l) => (l.touchesThisMonth ?? 0) >= (l.maxTouchesPerMonth ?? 8)
    ).length;
    const hcpsNearLimit = contactLimitsRecords.filter(
      (l) => {
        const touches = l.touchesThisMonth ?? 0;
        const max = l.maxTouchesPerMonth ?? 8;
        return touches >= max * 0.8 && touches < max;
      }
    ).length;
    const avgUtilization = contactLimitsRecords.length > 0
      ? contactLimitsRecords.reduce(
          (sum, l) => sum + ((l.touchesThisMonth ?? 0) / (l.maxTouchesPerMonth ?? 8)) * 100,
          0
        ) / contactLimitsRecords.length
      : 0;

    return {
      capacity: capacitySummary,
      budget: {
        totalAllocated,
        totalSpent,
        totalCommitted,
        utilizationPct: budgetUtilizationPct,
        byChannel: Array.from(budgetByChannel.entries()).map(([channel, data]) => ({
          channel,
          allocated: data.allocated,
          spent: data.spent,
          remaining: data.allocated - data.spent,
        })),
      },
      compliance: {
        activeBlackouts: activeWindows.filter((w) => w.windowType === "blackout").length,
        upcomingBlackouts: upcomingWindows.filter((w) => w.windowType === "blackout").length,
        affectedHcpCount,
        windows: activeWindows.map((w) => ({
          id: w.id,
          name: w.name,
          windowType: w.windowType,
          startDate: w.startDate.toISOString(),
          endDate: w.endDate.toISOString(),
          affectedCount: w.affectedHcpIds?.length ?? affectedHcpCount,
        })),
      },
      contactLimits: {
        hcpsAtLimit,
        hcpsNearLimit,
        avgUtilization,
      },
    };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private getNextMonthStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
}

// Export singleton instance
export const constraintManager = new ConstraintManager();
