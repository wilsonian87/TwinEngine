/**
 * Audience Storage Module
 *
 * Handles saved audience database operations including:
 * - CRUD for saved audiences/cohorts
 */
import { randomUUID } from "crypto";
import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import {
  savedAudiences,
  type SavedAudience,
  type InsertSavedAudience,
} from "@shared/schema";

export class AudienceStorage {
  async createAudience(audience: InsertSavedAudience): Promise<SavedAudience> {
    const id = randomUUID();
    const now = new Date();
    const [created] = await db
      .insert(savedAudiences)
      .values({
        ...audience,
        id,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return created;
  }

  async getAudience(id: string): Promise<SavedAudience | undefined> {
    const rows = await db
      .select()
      .from(savedAudiences)
      .where(eq(savedAudiences.id, id));
    return rows[0];
  }

  async listAudiences(): Promise<SavedAudience[]> {
    return db.select().from(savedAudiences).orderBy(desc(savedAudiences.createdAt));
  }

  async updateAudience(
    id: string,
    updates: Partial<InsertSavedAudience>
  ): Promise<SavedAudience | undefined> {
    const [updated] = await db
      .update(savedAudiences)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(savedAudiences.id, id))
      .returning();
    return updated;
  }

  async deleteAudience(id: string): Promise<boolean> {
    await db.delete(savedAudiences).where(eq(savedAudiences.id, id));
    return true;
  }
}

// Singleton instance
export const audienceStorage = new AudienceStorage();
