/**
 * Regulatory Storage Module
 *
 * Phase 0: Regulatory Calendar Data Foundation
 * CRUD operations for regulatory events, annotations, impacts, and sync logs.
 */
import { db } from "../db";
import { eq, desc, and, gte, lte, sql, asc } from "drizzle-orm";
import { debugLog } from "../utils/config";
import {
  regulatoryEvents,
  regulatoryEventAnnotations,
  regulatoryEventImpacts,
  regulatorySyncLog,
  type RegulatoryEvent,
  type InsertRegulatoryEvent,
  type RegulatoryEventAnnotation,
  type InsertRegulatoryEventAnnotation,
  type RegulatoryEventImpact,
  type InsertRegulatoryEventImpact,
  type RegulatorySyncLog,
  type InsertRegulatorySyncLog,
} from "@shared/schema";

export interface RegulatoryEventFilter {
  drugName?: string;
  eventType?: string;
  therapeuticArea?: string;
  status?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export class RegulatoryStorage {
  // --- Events ---

  async listEvents(filter: RegulatoryEventFilter = {}): Promise<RegulatoryEvent[]> {
    const conditions = [];

    if (filter.drugName) {
      conditions.push(sql`${regulatoryEvents.drugName} ILIKE ${'%' + filter.drugName + '%'}`);
    }
    if (filter.eventType) {
      conditions.push(eq(regulatoryEvents.eventType, filter.eventType));
    }
    if (filter.therapeuticArea) {
      conditions.push(eq(regulatoryEvents.therapeuticArea, filter.therapeuticArea));
    }
    if (filter.status) {
      conditions.push(eq(regulatoryEvents.status, filter.status));
    }
    if (filter.source) {
      conditions.push(eq(regulatoryEvents.source, filter.source));
    }
    if (filter.startDate) {
      conditions.push(gte(regulatoryEvents.eventDate, new Date(filter.startDate)));
    }
    if (filter.endDate) {
      conditions.push(lte(regulatoryEvents.eventDate, new Date(filter.endDate)));
    }

    const query = db
      .select()
      .from(regulatoryEvents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(regulatoryEvents.eventDate))
      .limit(filter.limit ?? 100)
      .offset(filter.offset ?? 0);

    return query;
  }

  async getEvent(id: string): Promise<RegulatoryEvent | undefined> {
    const [event] = await db
      .select()
      .from(regulatoryEvents)
      .where(eq(regulatoryEvents.id, id))
      .limit(1);
    return event;
  }

  async getEventWithRelations(id: string): Promise<{
    event: RegulatoryEvent;
    annotations: RegulatoryEventAnnotation[];
    impacts: RegulatoryEventImpact[];
  } | undefined> {
    const event = await this.getEvent(id);
    if (!event) return undefined;

    const [annotations, impacts] = await Promise.all([
      this.getAnnotationsForEvent(id),
      this.getImpactsForEvent(id),
    ]);

    return { event, annotations, impacts };
  }

  async createEvent(data: InsertRegulatoryEvent): Promise<RegulatoryEvent> {
    const [event] = await db
      .insert(regulatoryEvents)
      .values(data)
      .returning();
    debugLog("RegulatoryStorage", `Created event: ${event.title}`);
    return event;
  }

  async upsertEvent(data: InsertRegulatoryEvent): Promise<{ event: RegulatoryEvent; action: "created" | "updated" | "skipped" }> {
    // Lookup by drugName + eventType + eventDate
    const existing = await db
      .select()
      .from(regulatoryEvents)
      .where(
        and(
          eq(regulatoryEvents.drugName, data.drugName),
          eq(regulatoryEvents.eventType, data.eventType),
          eq(regulatoryEvents.eventDate, data.eventDate),
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Check if anything changed
      const ex = existing[0];
      if (ex.title === data.title && ex.description === data.description && ex.status === data.status) {
        return { event: ex, action: "skipped" };
      }

      const [updated] = await db
        .update(regulatoryEvents)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(regulatoryEvents.id, ex.id))
        .returning();
      return { event: updated, action: "updated" };
    }

    const event = await this.createEvent(data);
    return { event, action: "created" };
  }

  async updateEvent(id: string, data: Partial<InsertRegulatoryEvent>): Promise<RegulatoryEvent | undefined> {
    const [event] = await db
      .update(regulatoryEvents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(regulatoryEvents.id, id))
      .returning();
    return event;
  }

  async getUpcomingEvents(days: number = 90): Promise<RegulatoryEvent[]> {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    return db
      .select()
      .from(regulatoryEvents)
      .where(
        and(
          gte(regulatoryEvents.eventDate, now),
          lte(regulatoryEvents.eventDate, future),
        )
      )
      .orderBy(asc(regulatoryEvents.eventDate));
  }

  // --- Annotations ---

  async createAnnotation(data: InsertRegulatoryEventAnnotation): Promise<RegulatoryEventAnnotation> {
    const [annotation] = await db
      .insert(regulatoryEventAnnotations)
      .values(data)
      .returning();
    return annotation;
  }

  async updateAnnotation(id: string, data: Partial<InsertRegulatoryEventAnnotation>): Promise<RegulatoryEventAnnotation | undefined> {
    const [annotation] = await db
      .update(regulatoryEventAnnotations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(regulatoryEventAnnotations.id, id))
      .returning();
    return annotation;
  }

  async deleteAnnotation(id: string): Promise<boolean> {
    const result = await db
      .delete(regulatoryEventAnnotations)
      .where(eq(regulatoryEventAnnotations.id, id))
      .returning();
    return result.length > 0;
  }

  async getAnnotationsForEvent(eventId: string): Promise<RegulatoryEventAnnotation[]> {
    return db
      .select()
      .from(regulatoryEventAnnotations)
      .where(eq(regulatoryEventAnnotations.eventId, eventId))
      .orderBy(desc(regulatoryEventAnnotations.createdAt));
  }

  // --- Impacts ---

  async createImpact(data: InsertRegulatoryEventImpact): Promise<RegulatoryEventImpact> {
    const [impact] = await db
      .insert(regulatoryEventImpacts)
      .values(data)
      .returning();
    return impact;
  }

  async getImpactsForEvent(eventId: string): Promise<RegulatoryEventImpact[]> {
    return db
      .select()
      .from(regulatoryEventImpacts)
      .where(eq(regulatoryEventImpacts.eventId, eventId))
      .orderBy(desc(regulatoryEventImpacts.createdAt));
  }

  // --- Sync Log ---

  async createSyncLog(data: InsertRegulatorySyncLog): Promise<RegulatorySyncLog> {
    const [log] = await db
      .insert(regulatorySyncLog)
      .values(data)
      .returning();
    return log;
  }

  async updateSyncLog(id: string, data: Partial<InsertRegulatorySyncLog>): Promise<RegulatorySyncLog | undefined> {
    const [log] = await db
      .update(regulatorySyncLog)
      .set(data)
      .where(eq(regulatorySyncLog.id, id))
      .returning();
    return log;
  }

  async getLatestSyncLog(source?: string): Promise<RegulatorySyncLog | undefined> {
    const conditions = source ? eq(regulatorySyncLog.source, source) : undefined;
    const [log] = await db
      .select()
      .from(regulatorySyncLog)
      .where(conditions)
      .orderBy(desc(regulatorySyncLog.startedAt))
      .limit(1);
    return log;
  }

  async listSyncLogs(limit: number = 20): Promise<RegulatorySyncLog[]> {
    return db
      .select()
      .from(regulatorySyncLog)
      .orderBy(desc(regulatorySyncLog.startedAt))
      .limit(limit);
  }
}

export const regulatoryStorage = new RegulatoryStorage();
