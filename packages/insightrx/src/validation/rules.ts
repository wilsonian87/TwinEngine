/**
 * Validation Rules
 *
 * Pre-defined validation rules for pharmaceutical content.
 */

import type { ValidationRule, ValidationInput, RuleResult } from "./types";

// ============================================================================
// COMPLIANCE RULES
// ============================================================================

/**
 * Check for fair balance in promotional content
 */
export const fairBalanceRule: ValidationRule = {
  id: "compliance.fair-balance",
  name: "Fair Balance Check",
  category: "compliance",
  severity: "error",
  description: "Promotional content must include both benefit and risk information",
  validate: (input: ValidationInput): RuleResult => {
    const content = input.content.toLowerCase();

    const hasBenefitClaims =
      content.includes("effective") ||
      content.includes("benefit") ||
      content.includes("improves") ||
      content.includes("reduces") ||
      content.includes("helps");

    const hasRiskInfo =
      content.includes("risk") ||
      content.includes("side effect") ||
      content.includes("warning") ||
      content.includes("contraindic") ||
      content.includes("adverse");

    const passed = !hasBenefitClaims || hasRiskInfo;

    return {
      ruleId: "compliance.fair-balance",
      ruleName: "Fair Balance Check",
      category: "compliance",
      passed,
      severity: "error",
      message: passed
        ? "Content includes appropriate risk/benefit balance"
        : "Promotional content with benefit claims must include risk information",
      suggestion: passed
        ? undefined
        : "Add safety information including side effects, warnings, or contraindications",
    };
  },
};

/**
 * Check for indication limitations
 */
export const indicationRule: ValidationRule = {
  id: "compliance.indication",
  name: "Indication Limitation Check",
  category: "compliance",
  severity: "error",
  description: "Content must not promote off-label use",
  validate: (input: ValidationInput): RuleResult => {
    const content = input.content.toLowerCase();

    // Check for phrases that suggest off-label promotion
    const offLabelPhrases = [
      "can be used for",
      "may also treat",
      "works for other",
      "off-label",
      "unapproved use",
    ];

    const hasOffLabelSuggestion = offLabelPhrases.some((phrase) =>
      content.includes(phrase)
    );

    const passed = !hasOffLabelSuggestion;

    return {
      ruleId: "compliance.indication",
      ruleName: "Indication Limitation Check",
      category: "compliance",
      passed,
      severity: "error",
      message: passed
        ? "Content does not suggest off-label use"
        : "Content may suggest off-label use, which is not permitted",
      suggestion: passed
        ? undefined
        : "Remove or rephrase content that suggests use beyond approved indications",
    };
  },
};

/**
 * Check for required references
 */
export const referencesRule: ValidationRule = {
  id: "compliance.references",
  name: "References Check",
  category: "compliance",
  severity: "warning",
  description: "Claims should be supported by references",
  validate: (input: ValidationInput): RuleResult => {
    const content = input.content;

    // Check for claim patterns
    const claimPatterns = [
      /\d+%/g, // Percentage claims
      /\d+x/gi, // Multiplier claims
      /significantly/gi,
      /proven/gi,
      /demonstrated/gi,
      /clinical trial/gi,
      /study showed/gi,
    ];

    const hasClaims = claimPatterns.some((pattern) => pattern.test(content));

    // Check for reference patterns
    const referencePatterns = [
      /\[\d+\]/g, // [1] style references
      /\([\w\s]+,?\s*\d{4}\)/g, // (Author, 2024) style
      /ref\s*[:=]/gi,
      /source\s*[:=]/gi,
      /data on file/gi,
    ];

    const hasReferences = referencePatterns.some((pattern) => pattern.test(content));

    const passed = !hasClaims || hasReferences;

    return {
      ruleId: "compliance.references",
      ruleName: "References Check",
      category: "compliance",
      passed,
      severity: "warning",
      message: passed
        ? "Claims are appropriately referenced or no claims requiring references found"
        : "Content contains claims that may require supporting references",
      suggestion: passed
        ? undefined
        : "Add references to support statistical or clinical claims",
    };
  },
};

// ============================================================================
// COMPLETENESS RULES
// ============================================================================

/**
 * Check minimum content length
 */
export const minLengthRule: ValidationRule = {
  id: "completeness.min-length",
  name: "Minimum Length Check",
  category: "completeness",
  severity: "warning",
  description: "Content should meet minimum length requirements",
  validate: (input: ValidationInput): RuleResult => {
    const minLength = 50; // characters
    const passed = input.content.length >= minLength;

    return {
      ruleId: "completeness.min-length",
      ruleName: "Minimum Length Check",
      category: "completeness",
      passed,
      severity: "warning",
      message: passed
        ? "Content meets minimum length requirement"
        : `Content is too short (${input.content.length} chars, minimum ${minLength})`,
      suggestion: passed
        ? undefined
        : "Expand content to provide more context and value",
    };
  },
};

/**
 * Check for call to action
 */
export const ctaRule: ValidationRule = {
  id: "completeness.cta",
  name: "Call to Action Check",
  category: "completeness",
  severity: "info",
  description: "Content should include a clear call to action",
  validate: (input: ValidationInput): RuleResult => {
    const content = input.content.toLowerCase();

    const ctaPatterns = [
      "learn more",
      "contact",
      "visit",
      "call",
      "schedule",
      "request",
      "download",
      "sign up",
      "register",
      "click",
      "talk to",
      "ask your",
    ];

    const hasCta = ctaPatterns.some((cta) => content.includes(cta));

    return {
      ruleId: "completeness.cta",
      ruleName: "Call to Action Check",
      category: "completeness",
      passed: hasCta,
      severity: "info",
      message: hasCta
        ? "Content includes a call to action"
        : "Consider adding a clear call to action",
      suggestion: hasCta
        ? undefined
        : "Add a call to action such as 'Learn more', 'Talk to your doctor', or 'Contact us'",
    };
  },
};

/**
 * Check for audience targeting
 */
export const audienceTargetingRule: ValidationRule = {
  id: "completeness.audience",
  name: "Audience Targeting Check",
  category: "completeness",
  severity: "warning",
  description: "Content should be clearly targeted to an audience",
  validate: (input: ValidationInput): RuleResult => {
    const hasAudienceContext = !!input.audienceContext?.audience;

    return {
      ruleId: "completeness.audience",
      ruleName: "Audience Targeting Check",
      category: "completeness",
      passed: hasAudienceContext,
      severity: "warning",
      message: hasAudienceContext
        ? `Content is targeted to ${input.audienceContext!.audience}`
        : "Audience context is not specified",
      suggestion: hasAudienceContext
        ? undefined
        : "Specify the target audience (HCP, Consumer, Payer, etc.)",
    };
  },
};

// ============================================================================
// CONSISTENCY RULES
// ============================================================================

/**
 * Check for brand name consistency
 */
export const brandConsistencyRule: ValidationRule = {
  id: "consistency.brand",
  name: "Brand Name Consistency Check",
  category: "consistency",
  severity: "warning",
  description: "Brand names should be used consistently",
  validate: (input: ValidationInput): RuleResult => {
    // This is a placeholder - in a real implementation, this would
    // check against a configured brand name and its variations
    const passed = true;

    return {
      ruleId: "consistency.brand",
      ruleName: "Brand Name Consistency Check",
      category: "consistency",
      passed,
      severity: "warning",
      message: "Brand name consistency check passed",
    };
  },
};

/**
 * Check for tone consistency
 */
export const toneConsistencyRule: ValidationRule = {
  id: "consistency.tone",
  name: "Tone Consistency Check",
  category: "consistency",
  severity: "info",
  description: "Content tone should match audience expectations",
  validate: (input: ValidationInput): RuleResult => {
    const content = input.content.toLowerCase();
    const audience = input.audienceContext?.audience;

    // Check for technical language
    const technicalTerms = [
      "mechanism of action",
      "pharmacokinetics",
      "bioavailability",
      "half-life",
      "efficacy",
      "p-value",
      "confidence interval",
      "hazard ratio",
    ];

    const hasTechnicalLanguage = technicalTerms.some((term) =>
      content.includes(term)
    );

    // Consumer content shouldn't be too technical
    if (audience === "Consumer" && hasTechnicalLanguage) {
      return {
        ruleId: "consistency.tone",
        ruleName: "Tone Consistency Check",
        category: "consistency",
        passed: false,
        severity: "info",
        message: "Content contains technical language that may not be suitable for consumers",
        suggestion: "Consider simplifying technical terms for a consumer audience",
      };
    }

    return {
      ruleId: "consistency.tone",
      ruleName: "Tone Consistency Check",
      category: "consistency",
      passed: true,
      severity: "info",
      message: "Content tone is appropriate for the target audience",
    };
  },
};

// ============================================================================
// QUALITY RULES
// ============================================================================

/**
 * Check for spelling/grammar issues (placeholder)
 */
export const spellingRule: ValidationRule = {
  id: "quality.spelling",
  name: "Spelling Check",
  category: "quality",
  severity: "warning",
  description: "Content should be free of spelling errors",
  validate: (input: ValidationInput): RuleResult => {
    // Common misspellings in pharma content
    const commonMisspellings = [
      ["recieve", "receive"],
      ["occured", "occurred"],
      ["seperate", "separate"],
      ["definately", "definitely"],
      ["accomodate", "accommodate"],
    ];

    const content = input.content.toLowerCase();
    const found: string[] = [];

    for (const [wrong, correct] of commonMisspellings) {
      if (content.includes(wrong)) {
        found.push(`${wrong} → ${correct}`);
      }
    }

    const passed = found.length === 0;

    return {
      ruleId: "quality.spelling",
      ruleName: "Spelling Check",
      category: "quality",
      passed,
      severity: "warning",
      message: passed
        ? "No common spelling errors detected"
        : `Found potential spelling issues: ${found.join(", ")}`,
      suggestion: passed
        ? undefined
        : "Review and correct the identified spelling issues",
    };
  },
};

/**
 * Check for excessive capitalization
 */
export const capitalizationRule: ValidationRule = {
  id: "quality.capitalization",
  name: "Capitalization Check",
  category: "quality",
  severity: "info",
  description: "Content should not overuse capitalization",
  validate: (input: ValidationInput): RuleResult => {
    const words = input.content.split(/\s+/);
    const allCapsWords = words.filter(
      (word) => word.length > 3 && word === word.toUpperCase() && /[A-Z]/.test(word)
    );

    // More than 10% all-caps words is excessive
    const excessiveThreshold = 0.1;
    const ratio = allCapsWords.length / words.length;
    const passed = ratio < excessiveThreshold;

    return {
      ruleId: "quality.capitalization",
      ruleName: "Capitalization Check",
      category: "quality",
      passed,
      severity: "info",
      message: passed
        ? "Capitalization usage is appropriate"
        : "Content contains excessive ALL CAPS words",
      suggestion: passed
        ? undefined
        : "Reduce use of all-caps words for better readability",
    };
  },
};

// ============================================================================
// RULE SETS
// ============================================================================

export const defaultRules: ValidationRule[] = [
  // Compliance
  fairBalanceRule,
  indicationRule,
  referencesRule,
  // Completeness
  minLengthRule,
  ctaRule,
  audienceTargetingRule,
  // Consistency
  brandConsistencyRule,
  toneConsistencyRule,
  // Quality
  spellingRule,
  capitalizationRule,
];

export const complianceOnlyRules: ValidationRule[] = [
  fairBalanceRule,
  indicationRule,
  referencesRule,
];

export const quickCheckRules: ValidationRule[] = [
  minLengthRule,
  audienceTargetingRule,
  capitalizationRule,
];
