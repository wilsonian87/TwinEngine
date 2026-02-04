/**
 * @twinengine/insightrx
 *
 * InsightRx content validation, domain knowledge, and relationship scoring
 * for pharmaceutical HCP engagement.
 *
 * Modules:
 * - validation: Content validation rules and engine
 * - domain: Audience, specialty, therapeutic area, and channel mappings
 * - scoring: Relationship scoring between content items
 */

// ============================================================================
// DOMAIN EXPORTS
// ============================================================================

export {
  // Types
  type Audience,
  type HCPSubAudience,
  type Specialty,
  type TherapeuticArea,
  type Channel,
  type ContentType,
  type ContentStatus,
  type MarketStage,
  type ExperienceLevel,
  type IndustryType,
  type AudienceContext,
  type MarketContext,
  type ChannelContext,
  type RegulatoryContext,
  type ContentMetadata,
  type ExtendedMetadata,
  // Constants
  audiences,
  hcpSubAudiences,
  specialties,
  therapeuticAreas,
  channels,
  contentTypes,
  contentStatuses,
  marketStages,
  experienceLevels,
  industryTypes,
} from "./domain/types";

export {
  // Mappings
  audienceMappings,
  specialtyMappings,
  therapeuticAreaMappings,
  channelMappings,
  contentTypeMappings,
  // Mapping types
  type AudienceMapping,
  type SpecialtyMapping,
  type TherapeuticAreaMapping,
  type ChannelMapping,
  type ContentTypeMapping,
  // Resolver functions
  isAudienceSynonym,
  isSpecialtySynonym,
  isTherapeuticAreaSynonym,
  isChannelSynonym,
  getRelatedChannels,
  getRelatedSpecialties,
  getRelatedTherapeuticAreas,
} from "./domain/mappings";

// ============================================================================
// VALIDATION EXPORTS
// ============================================================================

export {
  // Types
  type ValidationStatus,
  type RuleCategory,
  type RuleSeverity,
  type RuleResult,
  type ValidationResult,
  type ValidationInput,
  type ValidationRule,
  type RuleSet,
  type ContentStructureRequirements,
  type ComplianceCheck,
  // Constants
  validationStatuses,
  ruleCategories,
  ruleSeverities,
} from "./validation/types";

export {
  // Rules
  fairBalanceRule,
  indicationRule,
  referencesRule,
  minLengthRule,
  ctaRule,
  audienceTargetingRule,
  brandConsistencyRule,
  toneConsistencyRule,
  spellingRule,
  capitalizationRule,
  // Rule sets
  defaultRules,
  complianceOnlyRules,
  quickCheckRules,
} from "./validation/rules";

export {
  // Engine
  validateContent,
  validateFull,
  validateCompliance,
  validateQuick,
  validateBatch,
  getAvailableRules,
  getRulesVersion,
} from "./validation/engine";

// ============================================================================
// SCORING EXPORTS
// ============================================================================

export {
  // Types
  type ContentForScoring,
  type RelationshipScoreFactors,
  type RelationshipScore,
  // Functions
  calculateRelationshipScore,
  findRelatedContent,
  getAverageRelationshipScore,
} from "./scoring/relationship";
