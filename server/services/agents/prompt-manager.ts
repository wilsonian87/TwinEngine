/**
 * Prompt Manager Service
 *
 * Phase 12D.4: Prompt Versioning & Testing
 *
 * This service:
 * - Manages versioned agent prompts
 * - Provides prompt loading and validation
 * - Supports A/B testing of prompt variations
 * - Tracks prompt performance metrics
 */

import * as fs from "fs";
import * as path from "path";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Prompt type categories
 */
export type PromptType = "system" | "role" | "task" | "guardrail";

/**
 * Role persona types
 */
export type RoleType = "brand-lead" | "field-ops" | "analytics" | "medical" | "platform-admin";

/**
 * Prompt metadata
 */
export interface PromptMetadata {
  id: string;
  type: PromptType;
  name: string;
  version: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  isActive: boolean;
  abTestGroup?: "control" | "variant";
}

/**
 * Prompt with content
 */
export interface Prompt extends PromptMetadata {
  content: string;
  filePath: string;
}

/**
 * Prompt validation result
 */
export interface PromptValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Prompt loading options
 */
export interface PromptLoadOptions {
  type?: PromptType;
  role?: RoleType;
  version?: string;
  activeOnly?: boolean;
}

// ============================================================================
// PROMPT REGISTRY
// ============================================================================

/**
 * Registry of all available prompts with version metadata
 */
export const promptRegistry: Record<string, PromptMetadata> = {
  // Base System Prompt
  "system-prompt-v1": {
    id: "system-prompt-v1",
    type: "system",
    name: "TwinEngine Agent System Prompt",
    version: "1.0.0",
    description: "Base system prompt defining agent persona, capabilities, and constraints",
    createdAt: "2025-01-19",
    updatedAt: "2025-01-19",
    tags: ["base", "system", "production"],
    isActive: true,
  },

  // Role-specific prompts
  "brand-lead-v1": {
    id: "brand-lead-v1",
    type: "role",
    name: "Brand Lead Persona",
    version: "1.0.0",
    description: "Persona prompt for Brand Lead users",
    createdAt: "2025-01-19",
    updatedAt: "2025-01-19",
    tags: ["role", "brand-lead", "production"],
    isActive: true,
  },
  "field-ops-v1": {
    id: "field-ops-v1",
    type: "role",
    name: "Field Operations Persona",
    version: "1.0.0",
    description: "Persona prompt for Field Operations users",
    createdAt: "2025-01-19",
    updatedAt: "2025-01-19",
    tags: ["role", "field-ops", "production"],
    isActive: true,
  },
  "analytics-v1": {
    id: "analytics-v1",
    type: "role",
    name: "Analytics Persona",
    version: "1.0.0",
    description: "Persona prompt for Analytics users",
    createdAt: "2025-01-19",
    updatedAt: "2025-01-19",
    tags: ["role", "analytics", "production"],
    isActive: true,
  },
  "medical-v1": {
    id: "medical-v1",
    type: "role",
    name: "Medical Affairs Persona",
    version: "1.0.0",
    description: "Persona prompt for Medical Affairs users",
    createdAt: "2025-01-19",
    updatedAt: "2025-01-19",
    tags: ["role", "medical", "production"],
    isActive: true,
  },
  "platform-admin-v1": {
    id: "platform-admin-v1",
    type: "role",
    name: "Platform Administrator Persona",
    version: "1.0.0",
    description: "Persona prompt for Platform Administrators",
    createdAt: "2025-01-19",
    updatedAt: "2025-01-19",
    tags: ["role", "platform-admin", "production"],
    isActive: true,
  },

  // Task-specific prompts
  "reasoning-patterns-v1": {
    id: "reasoning-patterns-v1",
    type: "task",
    name: "Reasoning Patterns",
    version: "1.0.0",
    description: "Canonical reasoning patterns for agent tasks",
    createdAt: "2025-01-19",
    updatedAt: "2025-01-19",
    tags: ["task", "reasoning", "production"],
    isActive: true,
  },

  // Guardrail prompts
  "compliance-rules-v1": {
    id: "compliance-rules-v1",
    type: "guardrail",
    name: "Compliance & Safety Guardrails",
    version: "1.0.0",
    description: "Mandatory compliance and safety rules for all agents",
    createdAt: "2025-01-19",
    updatedAt: "2025-01-19",
    tags: ["guardrail", "compliance", "safety", "production"],
    isActive: true,
  },
};

// ============================================================================
// FILE PATH MAPPINGS
// ============================================================================

/**
 * Map prompt IDs to file paths
 */
export const promptFilePaths: Record<string, string> = {
  "system-prompt-v1": "agent/prompts/base/system-prompt.md",
  "brand-lead-v1": "agent/prompts/roles/brand-lead.md",
  "field-ops-v1": "agent/prompts/roles/field-ops.md",
  "analytics-v1": "agent/prompts/roles/analytics.md",
  "medical-v1": "agent/prompts/roles/medical.md",
  "platform-admin-v1": "agent/prompts/roles/platform-admin.md",
  "reasoning-patterns-v1": "agent/prompts/tasks/reasoning-patterns.md",
  "compliance-rules-v1": "agent/prompts/guardrails/compliance-rules.md",
};

// ============================================================================
// PROMPT MANAGER CLASS
// ============================================================================

/**
 * PromptManager handles loading, validation, and versioning of agent prompts
 */
export class PromptManager {
  private basePath: string;
  private loadedPrompts: Map<string, Prompt> = new Map();

  constructor(basePath?: string) {
    // Default to project root
    this.basePath = basePath || process.cwd();
  }

  /**
   * Get all registered prompts
   */
  getRegistry(): Record<string, PromptMetadata> {
    return { ...promptRegistry };
  }

  /**
   * Get prompt metadata by ID
   */
  getMetadata(promptId: string): PromptMetadata | undefined {
    return promptRegistry[promptId];
  }

  /**
   * Load a prompt by ID
   */
  async loadPrompt(promptId: string): Promise<Prompt | undefined> {
    // Check cache first
    if (this.loadedPrompts.has(promptId)) {
      return this.loadedPrompts.get(promptId);
    }

    const metadata = promptRegistry[promptId];
    if (!metadata) {
      return undefined;
    }

    const relativePath = promptFilePaths[promptId];
    if (!relativePath) {
      return undefined;
    }

    const fullPath = path.join(this.basePath, relativePath);

    try {
      const content = await fs.promises.readFile(fullPath, "utf-8");
      const prompt: Prompt = {
        ...metadata,
        content,
        filePath: relativePath,
      };

      this.loadedPrompts.set(promptId, prompt);
      return prompt;
    } catch (error) {
      console.error(`[PromptManager] Failed to load prompt ${promptId}:`, error);
      return undefined;
    }
  }

  /**
   * Load all prompts matching criteria
   */
  async loadPrompts(options: PromptLoadOptions = {}): Promise<Prompt[]> {
    const prompts: Prompt[] = [];

    for (const [promptId, metadata] of Object.entries(promptRegistry)) {
      // Filter by type
      if (options.type && metadata.type !== options.type) {
        continue;
      }

      // Filter by active status
      if (options.activeOnly && !metadata.isActive) {
        continue;
      }

      // Filter by version
      if (options.version && metadata.version !== options.version) {
        continue;
      }

      // Filter by role (for role-type prompts)
      if (options.role && metadata.type === "role") {
        const roleMatch = promptId.startsWith(options.role);
        if (!roleMatch) {
          continue;
        }
      }

      const prompt = await this.loadPrompt(promptId);
      if (prompt) {
        prompts.push(prompt);
      }
    }

    return prompts;
  }

  /**
   * Load the base system prompt
   */
  async loadSystemPrompt(): Promise<Prompt | undefined> {
    const systemPrompts = await this.loadPrompts({ type: "system", activeOnly: true });
    return systemPrompts[0];
  }

  /**
   * Load role-specific prompt
   */
  async loadRolePrompt(role: RoleType): Promise<Prompt | undefined> {
    const rolePrompts = await this.loadPrompts({ type: "role", role, activeOnly: true });
    return rolePrompts[0];
  }

  /**
   * Load guardrail prompts
   */
  async loadGuardrails(): Promise<Prompt[]> {
    return this.loadPrompts({ type: "guardrail", activeOnly: true });
  }

  /**
   * Validate a prompt's structure
   */
  validatePrompt(prompt: Prompt): PromptValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!prompt.id) {
      errors.push("Prompt ID is required");
    }

    if (!prompt.content) {
      errors.push("Prompt content is empty");
    }

    if (!prompt.version) {
      errors.push("Prompt version is required");
    }

    // Validate version format (semver)
    const semverRegex = /^\d+\.\d+\.\d+$/;
    if (prompt.version && !semverRegex.test(prompt.version)) {
      warnings.push(`Version '${prompt.version}' does not follow semver format (X.Y.Z)`);
    }

    // Check content length
    if (prompt.content && prompt.content.length < 100) {
      warnings.push("Prompt content is very short (< 100 characters)");
    }

    // Check for required sections based on type
    if (prompt.type === "system") {
      if (!prompt.content.includes("TwinEngine")) {
        warnings.push("System prompt should mention TwinEngine");
      }
    }

    if (prompt.type === "role") {
      if (!prompt.content.includes("## Role Context")) {
        warnings.push("Role prompt should have '## Role Context' section");
      }
    }

    if (prompt.type === "guardrail") {
      if (!prompt.content.includes("NEVER") && !prompt.content.includes("ALWAYS")) {
        warnings.push("Guardrail prompt should contain explicit NEVER/ALWAYS rules");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate all registered prompts
   */
  async validateAllPrompts(): Promise<Map<string, PromptValidationResult>> {
    const results = new Map<string, PromptValidationResult>();

    for (const promptId of Object.keys(promptRegistry)) {
      const prompt = await this.loadPrompt(promptId);
      if (prompt) {
        results.set(promptId, this.validatePrompt(prompt));
      } else {
        results.set(promptId, {
          valid: false,
          errors: [`Failed to load prompt: ${promptId}`],
          warnings: [],
        });
      }
    }

    return results;
  }

  /**
   * Compose a full prompt for a specific role
   */
  async composePromptForRole(role: RoleType): Promise<string | undefined> {
    const systemPrompt = await this.loadSystemPrompt();
    const rolePrompt = await this.loadRolePrompt(role);
    const guardrails = await this.loadGuardrails();

    if (!systemPrompt || !rolePrompt) {
      return undefined;
    }

    // Compose the full prompt
    const parts = [
      "# System Instructions",
      systemPrompt.content,
      "",
      "# Role-Specific Instructions",
      rolePrompt.content,
      "",
      "# Compliance & Safety Rules",
      ...guardrails.map(g => g.content),
    ];

    return parts.join("\n\n");
  }

  /**
   * Get prompt statistics
   */
  getStatistics(): {
    totalPrompts: number;
    byType: Record<PromptType, number>;
    activeCount: number;
    cachedCount: number;
  } {
    const byType: Record<PromptType, number> = {
      system: 0,
      role: 0,
      task: 0,
      guardrail: 0,
    };

    let activeCount = 0;

    for (const metadata of Object.values(promptRegistry)) {
      byType[metadata.type]++;
      if (metadata.isActive) {
        activeCount++;
      }
    }

    return {
      totalPrompts: Object.keys(promptRegistry).length,
      byType,
      activeCount,
      cachedCount: this.loadedPrompts.size,
    };
  }

  /**
   * Clear the prompt cache
   */
  clearCache(): void {
    this.loadedPrompts.clear();
  }
}

// Export singleton instance
export const promptManager = new PromptManager();
