/**
 * Prompt Manager Tests
 *
 * Phase 12D.4: Prompt Versioning & Testing
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  PromptManager,
  promptManager,
  promptRegistry,
  promptFilePaths,
  type PromptType,
  type RoleType,
  type PromptMetadata,
  type Prompt,
  type PromptValidationResult,
} from "../../server/services/agents/prompt-manager";

describe("PromptManager", () => {
  let manager: PromptManager;

  beforeEach(() => {
    manager = new PromptManager();
  });

  describe("Prompt Registry", () => {
    it("should have all expected prompt types", () => {
      const types = new Set(Object.values(promptRegistry).map(p => p.type));

      expect(types.has("system")).toBe(true);
      expect(types.has("role")).toBe(true);
      expect(types.has("task")).toBe(true);
      expect(types.has("guardrail")).toBe(true);
    });

    it("should have a system prompt", () => {
      const systemPrompts = Object.values(promptRegistry).filter(p => p.type === "system");
      expect(systemPrompts.length).toBeGreaterThan(0);
    });

    it("should have role prompts for all persona types", () => {
      const rolePrompts = Object.values(promptRegistry).filter(p => p.type === "role");
      const roleIds = rolePrompts.map(p => p.id);

      expect(roleIds.some(id => id.includes("brand-lead"))).toBe(true);
      expect(roleIds.some(id => id.includes("field-ops"))).toBe(true);
      expect(roleIds.some(id => id.includes("analytics"))).toBe(true);
      expect(roleIds.some(id => id.includes("medical"))).toBe(true);
      expect(roleIds.some(id => id.includes("platform-admin"))).toBe(true);
    });

    it("should have guardrail prompts", () => {
      const guardrailPrompts = Object.values(promptRegistry).filter(p => p.type === "guardrail");
      expect(guardrailPrompts.length).toBeGreaterThan(0);
    });

    it("should have valid metadata for all prompts", () => {
      for (const [id, metadata] of Object.entries(promptRegistry)) {
        expect(metadata.id).toBe(id);
        expect(metadata.name).toBeTruthy();
        expect(metadata.version).toBeTruthy();
        expect(metadata.description).toBeTruthy();
        expect(metadata.createdAt).toBeTruthy();
        expect(metadata.updatedAt).toBeTruthy();
        expect(Array.isArray(metadata.tags)).toBe(true);
        expect(typeof metadata.isActive).toBe("boolean");
      }
    });

    it("should have file paths for all registered prompts", () => {
      for (const id of Object.keys(promptRegistry)) {
        expect(promptFilePaths[id]).toBeTruthy();
        expect(promptFilePaths[id].endsWith(".md")).toBe(true);
      }
    });
  });

  describe("getRegistry", () => {
    it("should return a copy of the registry", () => {
      const registry = manager.getRegistry();

      expect(Object.keys(registry).length).toBe(Object.keys(promptRegistry).length);

      // Verify it's a copy, not the original
      const originalKeys = Object.keys(promptRegistry);
      const returnedKeys = Object.keys(registry);
      expect(returnedKeys).toEqual(originalKeys);
    });
  });

  describe("getMetadata", () => {
    it("should return metadata for known prompt ID", () => {
      const metadata = manager.getMetadata("system-prompt-v1");

      expect(metadata).toBeDefined();
      expect(metadata?.id).toBe("system-prompt-v1");
      expect(metadata?.type).toBe("system");
    });

    it("should return undefined for unknown prompt ID", () => {
      const metadata = manager.getMetadata("unknown-prompt");

      expect(metadata).toBeUndefined();
    });
  });

  describe("loadPrompt", () => {
    it("should load a prompt by ID", async () => {
      const prompt = await manager.loadPrompt("system-prompt-v1");

      expect(prompt).toBeDefined();
      expect(prompt?.id).toBe("system-prompt-v1");
      expect(prompt?.content).toBeTruthy();
      expect(prompt?.filePath).toBe("agent/prompts/base/system-prompt.md");
    });

    it("should return undefined for unknown prompt ID", async () => {
      const prompt = await manager.loadPrompt("unknown-prompt");

      expect(prompt).toBeUndefined();
    });

    it("should cache loaded prompts", async () => {
      // Load twice
      const prompt1 = await manager.loadPrompt("system-prompt-v1");
      const prompt2 = await manager.loadPrompt("system-prompt-v1");

      expect(prompt1).toBe(prompt2); // Same reference from cache
    });

    it("should load role prompts", async () => {
      const prompt = await manager.loadPrompt("brand-lead-v1");

      expect(prompt).toBeDefined();
      expect(prompt?.type).toBe("role");
      expect(prompt?.content).toBeTruthy();
    });

    it("should load guardrail prompts", async () => {
      const prompt = await manager.loadPrompt("compliance-rules-v1");

      expect(prompt).toBeDefined();
      expect(prompt?.type).toBe("guardrail");
      expect(prompt?.content).toBeTruthy();
    });
  });

  describe("loadPrompts", () => {
    it("should load all prompts when no options provided", async () => {
      const prompts = await manager.loadPrompts();

      expect(prompts.length).toBe(Object.keys(promptRegistry).length);
    });

    it("should filter by type", async () => {
      const rolePrompts = await manager.loadPrompts({ type: "role" });

      expect(rolePrompts.length).toBeGreaterThan(0);
      expect(rolePrompts.every(p => p.type === "role")).toBe(true);
    });

    it("should filter by active status", async () => {
      const activePrompts = await manager.loadPrompts({ activeOnly: true });

      expect(activePrompts.every(p => p.isActive)).toBe(true);
    });

    it("should filter by version", async () => {
      const v1Prompts = await manager.loadPrompts({ version: "1.0.0" });

      expect(v1Prompts.every(p => p.version === "1.0.0")).toBe(true);
    });

    it("should filter role prompts by role type", async () => {
      const brandLeadPrompts = await manager.loadPrompts({ type: "role", role: "brand-lead" });

      expect(brandLeadPrompts.length).toBe(1);
      expect(brandLeadPrompts[0].id).toContain("brand-lead");
    });
  });

  describe("loadSystemPrompt", () => {
    it("should load the active system prompt", async () => {
      const prompt = await manager.loadSystemPrompt();

      expect(prompt).toBeDefined();
      expect(prompt?.type).toBe("system");
      expect(prompt?.isActive).toBe(true);
    });
  });

  describe("loadRolePrompt", () => {
    it("should load brand-lead role prompt", async () => {
      const prompt = await manager.loadRolePrompt("brand-lead");

      expect(prompt).toBeDefined();
      expect(prompt?.type).toBe("role");
      expect(prompt?.id).toContain("brand-lead");
    });

    it("should load field-ops role prompt", async () => {
      const prompt = await manager.loadRolePrompt("field-ops");

      expect(prompt).toBeDefined();
      expect(prompt?.type).toBe("role");
      expect(prompt?.id).toContain("field-ops");
    });

    it("should load analytics role prompt", async () => {
      const prompt = await manager.loadRolePrompt("analytics");

      expect(prompt).toBeDefined();
      expect(prompt?.type).toBe("role");
      expect(prompt?.id).toContain("analytics");
    });

    it("should load medical role prompt", async () => {
      const prompt = await manager.loadRolePrompt("medical");

      expect(prompt).toBeDefined();
      expect(prompt?.type).toBe("role");
      expect(prompt?.id).toContain("medical");
    });

    it("should load platform-admin role prompt", async () => {
      const prompt = await manager.loadRolePrompt("platform-admin");

      expect(prompt).toBeDefined();
      expect(prompt?.type).toBe("role");
      expect(prompt?.id).toContain("platform-admin");
    });
  });

  describe("loadGuardrails", () => {
    it("should load all active guardrail prompts", async () => {
      const guardrails = await manager.loadGuardrails();

      expect(guardrails.length).toBeGreaterThan(0);
      expect(guardrails.every(g => g.type === "guardrail")).toBe(true);
      expect(guardrails.every(g => g.isActive)).toBe(true);
    });
  });

  describe("validatePrompt", () => {
    it("should pass validation for valid prompt", async () => {
      const prompt = await manager.loadPrompt("system-prompt-v1");
      if (!prompt) throw new Error("Prompt not found");

      const result = manager.validatePrompt(prompt);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail validation for missing ID", () => {
      const invalidPrompt: Prompt = {
        id: "",
        type: "system",
        name: "Test",
        version: "1.0.0",
        description: "Test",
        createdAt: "2025-01-19",
        updatedAt: "2025-01-19",
        tags: [],
        isActive: true,
        content: "Test content that is long enough to pass the minimum length check for validation",
        filePath: "test.md",
      };

      const result = manager.validatePrompt(invalidPrompt);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Prompt ID is required");
    });

    it("should fail validation for empty content", () => {
      const invalidPrompt: Prompt = {
        id: "test-prompt",
        type: "system",
        name: "Test",
        version: "1.0.0",
        description: "Test",
        createdAt: "2025-01-19",
        updatedAt: "2025-01-19",
        tags: [],
        isActive: true,
        content: "",
        filePath: "test.md",
      };

      const result = manager.validatePrompt(invalidPrompt);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Prompt content is empty");
    });

    it("should fail validation for missing version", () => {
      const invalidPrompt: Prompt = {
        id: "test-prompt",
        type: "system",
        name: "Test",
        version: "",
        description: "Test",
        createdAt: "2025-01-19",
        updatedAt: "2025-01-19",
        tags: [],
        isActive: true,
        content: "Test content that is long enough to pass the minimum length check for validation",
        filePath: "test.md",
      };

      const result = manager.validatePrompt(invalidPrompt);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Prompt version is required");
    });

    it("should warn for non-semver version format", () => {
      const prompt: Prompt = {
        id: "test-prompt",
        type: "task",
        name: "Test",
        version: "v1",
        description: "Test",
        createdAt: "2025-01-19",
        updatedAt: "2025-01-19",
        tags: [],
        isActive: true,
        content: "Test content that is long enough to pass the minimum length check for validation purposes",
        filePath: "test.md",
      };

      const result = manager.validatePrompt(prompt);

      expect(result.warnings.some(w => w.includes("semver"))).toBe(true);
    });

    it("should warn for very short content", () => {
      const prompt: Prompt = {
        id: "test-prompt",
        type: "task",
        name: "Test",
        version: "1.0.0",
        description: "Test",
        createdAt: "2025-01-19",
        updatedAt: "2025-01-19",
        tags: [],
        isActive: true,
        content: "Short content",
        filePath: "test.md",
      };

      const result = manager.validatePrompt(prompt);

      expect(result.warnings.some(w => w.includes("very short"))).toBe(true);
    });

    it("should warn if system prompt doesn't mention TwinEngine", () => {
      const prompt: Prompt = {
        id: "test-prompt",
        type: "system",
        name: "Test",
        version: "1.0.0",
        description: "Test",
        createdAt: "2025-01-19",
        updatedAt: "2025-01-19",
        tags: [],
        isActive: true,
        content: "This is a test system prompt without the product name that should trigger a warning about content requirements",
        filePath: "test.md",
      };

      const result = manager.validatePrompt(prompt);

      expect(result.warnings.some(w => w.includes("TwinEngine"))).toBe(true);
    });

    it("should warn if role prompt missing Role Context section", () => {
      const prompt: Prompt = {
        id: "test-prompt",
        type: "role",
        name: "Test Role",
        version: "1.0.0",
        description: "Test",
        createdAt: "2025-01-19",
        updatedAt: "2025-01-19",
        tags: [],
        isActive: true,
        content: "This is a test role prompt without the required section that should trigger a validation warning",
        filePath: "test.md",
      };

      const result = manager.validatePrompt(prompt);

      expect(result.warnings.some(w => w.includes("Role Context"))).toBe(true);
    });

    it("should warn if guardrail prompt missing NEVER/ALWAYS rules", () => {
      const prompt: Prompt = {
        id: "test-prompt",
        type: "guardrail",
        name: "Test Guardrail",
        version: "1.0.0",
        description: "Test",
        createdAt: "2025-01-19",
        updatedAt: "2025-01-19",
        tags: [],
        isActive: true,
        content: "This is a test guardrail prompt without explicit rules that should trigger a validation warning about content",
        filePath: "test.md",
      };

      const result = manager.validatePrompt(prompt);

      expect(result.warnings.some(w => w.includes("NEVER/ALWAYS"))).toBe(true);
    });
  });

  describe("validateAllPrompts", () => {
    it("should validate all registered prompts", async () => {
      const results = await manager.validateAllPrompts();

      expect(results.size).toBe(Object.keys(promptRegistry).length);
    });

    it("should return validation results for each prompt", async () => {
      const results = await manager.validateAllPrompts();

      for (const [promptId, result] of results) {
        expect(result).toHaveProperty("valid");
        expect(result).toHaveProperty("errors");
        expect(result).toHaveProperty("warnings");
      }
    });
  });

  describe("composePromptForRole", () => {
    it("should compose full prompt for brand-lead role", async () => {
      const composed = await manager.composePromptForRole("brand-lead");

      expect(composed).toBeDefined();
      expect(composed).toContain("# System Instructions");
      expect(composed).toContain("# Role-Specific Instructions");
      expect(composed).toContain("# Compliance & Safety Rules");
    });

    it("should compose full prompt for field-ops role", async () => {
      const composed = await manager.composePromptForRole("field-ops");

      expect(composed).toBeDefined();
      expect(composed).toContain("# System Instructions");
      expect(composed).toContain("# Role-Specific Instructions");
    });

    it("should compose full prompt for analytics role", async () => {
      const composed = await manager.composePromptForRole("analytics");

      expect(composed).toBeDefined();
      expect(composed).toContain("# System Instructions");
      expect(composed).toContain("# Role-Specific Instructions");
    });

    it("should compose full prompt for medical role", async () => {
      const composed = await manager.composePromptForRole("medical");

      expect(composed).toBeDefined();
      expect(composed).toContain("# System Instructions");
      expect(composed).toContain("# Role-Specific Instructions");
    });

    it("should compose full prompt for platform-admin role", async () => {
      const composed = await manager.composePromptForRole("platform-admin");

      expect(composed).toBeDefined();
      expect(composed).toContain("# System Instructions");
      expect(composed).toContain("# Role-Specific Instructions");
    });
  });

  describe("getStatistics", () => {
    it("should return prompt statistics", () => {
      const stats = manager.getStatistics();

      expect(stats.totalPrompts).toBe(Object.keys(promptRegistry).length);
      expect(stats.byType).toHaveProperty("system");
      expect(stats.byType).toHaveProperty("role");
      expect(stats.byType).toHaveProperty("task");
      expect(stats.byType).toHaveProperty("guardrail");
      expect(stats.activeCount).toBeGreaterThan(0);
      expect(typeof stats.cachedCount).toBe("number");
    });

    it("should count prompts by type correctly", () => {
      const stats = manager.getStatistics();
      const expectedCounts: Record<PromptType, number> = {
        system: 0,
        role: 0,
        task: 0,
        guardrail: 0,
      };

      for (const metadata of Object.values(promptRegistry)) {
        expectedCounts[metadata.type]++;
      }

      expect(stats.byType).toEqual(expectedCounts);
    });

    it("should track cached prompts", async () => {
      // Initially no cached prompts
      const initialStats = manager.getStatistics();
      expect(initialStats.cachedCount).toBe(0);

      // Load a prompt
      await manager.loadPrompt("system-prompt-v1");

      // Should have one cached prompt
      const afterLoadStats = manager.getStatistics();
      expect(afterLoadStats.cachedCount).toBe(1);
    });
  });

  describe("clearCache", () => {
    it("should clear the prompt cache", async () => {
      // Load some prompts
      await manager.loadPrompt("system-prompt-v1");
      await manager.loadPrompt("brand-lead-v1");

      expect(manager.getStatistics().cachedCount).toBe(2);

      // Clear cache
      manager.clearCache();

      expect(manager.getStatistics().cachedCount).toBe(0);
    });
  });

  describe("Singleton Instance", () => {
    it("should export a singleton promptManager instance", () => {
      expect(promptManager).toBeInstanceOf(PromptManager);
    });

    it("should have same methods as class instance", () => {
      expect(typeof promptManager.getRegistry).toBe("function");
      expect(typeof promptManager.getMetadata).toBe("function");
      expect(typeof promptManager.loadPrompt).toBe("function");
      expect(typeof promptManager.loadPrompts).toBe("function");
      expect(typeof promptManager.loadSystemPrompt).toBe("function");
      expect(typeof promptManager.loadRolePrompt).toBe("function");
      expect(typeof promptManager.loadGuardrails).toBe("function");
      expect(typeof promptManager.validatePrompt).toBe("function");
      expect(typeof promptManager.validateAllPrompts).toBe("function");
      expect(typeof promptManager.composePromptForRole).toBe("function");
      expect(typeof promptManager.getStatistics).toBe("function");
      expect(typeof promptManager.clearCache).toBe("function");
    });
  });

  describe("Prompt File Paths", () => {
    it("should have correct path structure for system prompts", () => {
      const systemPath = promptFilePaths["system-prompt-v1"];
      expect(systemPath).toContain("base/");
    });

    it("should have correct path structure for role prompts", () => {
      for (const [id, path] of Object.entries(promptFilePaths)) {
        const metadata = promptRegistry[id];
        if (metadata?.type === "role") {
          expect(path).toContain("roles/");
        }
      }
    });

    it("should have correct path structure for task prompts", () => {
      for (const [id, path] of Object.entries(promptFilePaths)) {
        const metadata = promptRegistry[id];
        if (metadata?.type === "task") {
          expect(path).toContain("tasks/");
        }
      }
    });

    it("should have correct path structure for guardrail prompts", () => {
      for (const [id, path] of Object.entries(promptFilePaths)) {
        const metadata = promptRegistry[id];
        if (metadata?.type === "guardrail") {
          expect(path).toContain("guardrails/");
        }
      }
    });
  });
});
