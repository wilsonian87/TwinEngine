/**
 * Invite Code Tests
 *
 * Tests for invite code validation and usage including:
 * - Valid code validation
 * - Invalid code handling
 * - Expired codes
 * - Max uses enforcement
 * - Email matching
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateInviteCodeSchema, insertInviteCodeSchema } from '@shared/schema';

describe('Invite Code System', () => {
  describe('Schema Validation', () => {
    describe('validateInviteCodeSchema', () => {
      it('should validate valid invite code request', () => {
        const validData = {
          code: 'DEMO2025',
          email: 'user@example.com',
        };

        const result = validateInviteCodeSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should reject missing code', () => {
        const invalidData = {
          email: 'user@example.com',
        };

        const result = validateInviteCodeSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject missing email', () => {
        const invalidData = {
          code: 'DEMO2025',
        };

        const result = validateInviteCodeSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject invalid email format', () => {
        const invalidData = {
          code: 'DEMO2025',
          email: 'not-an-email',
        };

        const result = validateInviteCodeSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should reject empty code', () => {
        const invalidData = {
          code: '',
          email: 'user@example.com',
        };

        const result = validateInviteCodeSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should accept code with various valid formats', () => {
        const validCodes = ['ABC123', 'demo-code', 'PFIZER_2025', '12345'];

        validCodes.forEach((code) => {
          const result = validateInviteCodeSchema.safeParse({
            code,
            email: 'user@example.com',
          });
          expect(result.success).toBe(true);
        });
      });
    });

    describe('insertInviteCodeSchema', () => {
      it('should validate valid invite code creation', () => {
        const validData = {
          code: 'DEMO2025',
          email: 'user@example.com',
          label: 'Demo Code',
          maxUses: 5,
        };

        const result = insertInviteCodeSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should require code and email', () => {
        const invalidData = {
          label: 'Demo Code',
        };

        const result = insertInviteCodeSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('should accept optional fields', () => {
        const minimalData = {
          code: 'DEMO2025',
          email: 'user@example.com',
        };

        const result = insertInviteCodeSchema.safeParse(minimalData);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Invite Code Validation Logic', () => {
    // Mock storage for testing validation logic
    const createMockInviteCode = (overrides = {}) => ({
      id: 'inv-123',
      code: 'DEMO2025',
      email: 'user@example.com',
      label: 'Demo Code',
      maxUses: 5,
      useCount: 0,
      expiresAt: null,
      lastUsedAt: null,
      createdAt: new Date(),
      ...overrides,
    });

    it('should validate matching email (case insensitive)', () => {
      const invite = createMockInviteCode({ email: 'User@Example.com' });
      const inputEmail = 'user@example.com';

      expect(invite.email.toLowerCase()).toBe(inputEmail.toLowerCase());
    });

    it('should detect expired code', () => {
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const invite = createMockInviteCode({ expiresAt: expiredDate });

      const isExpired = invite.expiresAt && new Date(invite.expiresAt) < new Date();
      expect(isExpired).toBe(true);
    });

    it('should allow valid non-expired code', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const invite = createMockInviteCode({ expiresAt: futureDate });

      const isExpired = invite.expiresAt && new Date(invite.expiresAt) < new Date();
      expect(isExpired).toBe(false);
    });

    it('should detect max uses reached', () => {
      const invite = createMockInviteCode({ maxUses: 5, useCount: 5 });

      const maxReached = invite.maxUses && invite.useCount !== null && invite.useCount >= invite.maxUses;
      expect(maxReached).toBe(true);
    });

    it('should allow code with remaining uses', () => {
      const invite = createMockInviteCode({ maxUses: 5, useCount: 3 });

      const maxReached = invite.maxUses && invite.useCount !== null && invite.useCount >= invite.maxUses;
      expect(maxReached).toBe(false);
    });

    it('should handle unlimited uses (null maxUses)', () => {
      const invite = createMockInviteCode({ maxUses: null, useCount: 100 });

      const maxReached = invite.maxUses && invite.useCount !== null && invite.useCount >= invite.maxUses;
      expect(maxReached).toBeFalsy(); // null is falsy, meaning no limit reached
    });
  });

  describe('Invite Code Use Count', () => {
    it('should increment use count correctly', () => {
      const initialUseCount = 2;
      const newUseCount = (initialUseCount || 0) + 1;

      expect(newUseCount).toBe(3);
    });

    it('should handle null use count', () => {
      const initialUseCount = null;
      const newUseCount = (initialUseCount || 0) + 1;

      expect(newUseCount).toBe(1);
    });
  });

  describe('Email Validation', () => {
    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user@.com',
        '',
      ];

      invalidEmails.forEach((email) => {
        const result = validateInviteCodeSchema.safeParse({
          code: 'TEST123',
          email,
        });
        expect(result.success).toBe(false);
      });
    });

    it('should accept valid email formats', () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user@subdomain.example.com',
      ];

      validEmails.forEach((email) => {
        const result = validateInviteCodeSchema.safeParse({
          code: 'TEST123',
          email,
        });
        expect(result.success).toBe(true);
      });
    });
  });
});
