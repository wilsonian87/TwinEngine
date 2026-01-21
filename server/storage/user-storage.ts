/**
 * User Storage Module
 *
 * Handles user and invite code database operations including:
 * - User CRUD
 * - Invite code validation and management
 */
import { randomUUID } from "crypto";
import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import {
  users,
  inviteCodes,
  type User,
  type InsertUser,
  type InviteCode,
  type InsertInviteCode,
} from "@shared/schema";

export class UserStorage {
  // User operations
  async getUserById(id: string): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.id, id));
    return rows[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.username, username));
    return rows[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = randomUUID();
    const [created] = await db
      .insert(users)
      .values({ ...user, id })
      .returning();
    return created;
  }

  // Invite code operations
  async validateInviteCode(
    code: string,
    email: string
  ): Promise<{ valid: boolean; error?: string; inviteCode?: InviteCode }> {
    const rows = await db
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.code, code.toUpperCase()));

    if (rows.length === 0) {
      return { valid: false, error: "Invalid invite code" };
    }

    const inviteCode = rows[0];

    // Check if expired
    if (inviteCode.expiresAt && new Date(inviteCode.expiresAt) < new Date()) {
      return { valid: false, error: "Invite code has expired" };
    }

    // Check if max uses reached
    const currentUseCount = inviteCode.useCount ?? 0;
    if (inviteCode.maxUses && currentUseCount >= inviteCode.maxUses) {
      return { valid: false, error: "Invite code has reached maximum uses" };
    }

    // Check email restriction
    if (inviteCode.email && inviteCode.email.toLowerCase() !== email.toLowerCase()) {
      return { valid: false, error: "Invite code is not valid for this email" };
    }

    return { valid: true, inviteCode };
  }

  async useInviteCode(code: string, email: string): Promise<InviteCode | undefined> {
    const rows = await db
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.code, code.toUpperCase()));

    if (rows.length === 0) return undefined;

    const inviteCode = rows[0];
    const currentUseCount = inviteCode.useCount ?? 0;

    // Increment use count
    const [updated] = await db
      .update(inviteCodes)
      .set({
        useCount: currentUseCount + 1,
        lastUsedAt: new Date(),
      })
      .where(eq(inviteCodes.id, inviteCode.id))
      .returning();

    return updated;
  }

  async createInviteCode(invite: InsertInviteCode): Promise<InviteCode> {
    const id = randomUUID();
    const [created] = await db
      .insert(inviteCodes)
      .values({
        ...invite,
        id,
        code: invite.code.toUpperCase(),
        useCount: 0,
      })
      .returning();
    return created;
  }

  async listInviteCodes(): Promise<InviteCode[]> {
    return db.select().from(inviteCodes).orderBy(desc(inviteCodes.createdAt));
  }

  async deleteInviteCode(id: string): Promise<boolean> {
    const result = await db.delete(inviteCodes).where(eq(inviteCodes.id, id));
    return true;
  }
}

// Singleton instance
export const userStorage = new UserStorage();
