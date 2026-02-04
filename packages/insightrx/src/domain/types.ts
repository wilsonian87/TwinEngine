/**
 * InsightRx Domain Types
 *
 * Core types for pharmaceutical HCP engagement domain.
 * These types align with TwinEngine's schema for seamless integration.
 */

// ============================================================================
// AUDIENCE TYPES
// ============================================================================

export const audiences = [
  "HCP",
  "Consumer",
  "Payer",
  "Field",
  "Caregiver",
] as const;

export type Audience = (typeof audiences)[number];

export const hcpSubAudiences = [
  "Physician",
  "Nurse_Practitioner",
  "Physician_Assistant",
  "Pharmacist",
  "Nurse",
] as const;

export type HCPSubAudience = (typeof hcpSubAudiences)[number];

// ============================================================================
// SPECIALTY TYPES
// ============================================================================

export const specialties = [
  "Internal_Medicine",
  "Cardiology",
  "Oncology",
  "Primary_Care",
  "Surgery",
  "Neurology",
  "Pediatrics",
  "Emergency_Medicine",
  "Psychiatry",
  "Dermatology",
  "Advanced_Practice",
  "Pharmacy",
  "Rheumatology",
  "Pulmonology",
  "Endocrinology",
  "Gastroenterology",
  "Nephrology",
] as const;

export type Specialty = (typeof specialties)[number];

// ============================================================================
// THERAPEUTIC AREA TYPES
// ============================================================================

export const therapeuticAreas = [
  "Cardiovascular",
  "Oncology",
  "Neurology",
  "Immunology",
  "Metabolic",
  "Respiratory",
  "Infectious_Disease",
  "Gastroenterology",
  "Dermatology",
  "Womens_Health",
] as const;

export type TherapeuticArea = (typeof therapeuticAreas)[number];

// ============================================================================
// CHANNEL TYPES
// ============================================================================

export const channels = [
  "email",
  "rep_visit",
  "webinar",
  "conference",
  "digital_ad",
  "phone",
  "direct_mail",
  "social_media",
  "dtc",
  "telehealth",
] as const;

export type Channel = (typeof channels)[number];

// ============================================================================
// CONTENT TYPES
// ============================================================================

export const contentTypes = [
  "market_research",
  "benchmark",
  "ranking",
  "field_promotion",
  "market_access",
  "digital_media",
  "advertising",
  "regulatory",
] as const;

export type ContentType = (typeof contentTypes)[number];

// ============================================================================
// STATUS AND STAGE TYPES
// ============================================================================

export const contentStatuses = [
  "draft",
  "review",
  "approved",
  "archived",
] as const;

export type ContentStatus = (typeof contentStatuses)[number];

export const marketStages = [
  "pre-clinical",
  "clinical",
  "launch",
  "post-launch",
] as const;

export type MarketStage = (typeof marketStages)[number];

export const experienceLevels = [
  "beginner",
  "intermediate",
  "advanced",
] as const;

export type ExperienceLevel = (typeof experienceLevels)[number];

// ============================================================================
// CONTEXT TYPES
// ============================================================================

export interface AudienceContext {
  audience: Audience;
  subAudience?: HCPSubAudience;
  specialty?: Specialty;
  experienceLevel?: ExperienceLevel;
  practiceType?: string;
  patientPopulation?: string[];
}

export interface MarketContext {
  therapeuticArea?: TherapeuticArea;
  brand?: string;
  competitors?: string[];
  marketStage?: MarketStage;
  indication?: string;
}

export interface ChannelContext {
  primaryChannel: Channel;
  secondaryChannels?: Channel[];
  format?: string;
  deliveryMode?: "push" | "pull" | "hybrid";
}

export interface RegulatoryContext {
  region?: string;
  complianceRequirements?: string[];
  isPromotional?: boolean;
  hasClaimSubstantiation?: boolean;
}

// ============================================================================
// CONTENT METADATA
// ============================================================================

export interface ContentMetadata {
  author?: string;
  version?: string;
  status: ContentStatus;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  validFrom?: Date;
  validUntil?: Date;
  tags?: string[];
  audience: Audience;
  region?: string;
  source?: string;
}

export interface ExtendedMetadata extends ContentMetadata {
  audienceContext?: AudienceContext;
  marketContext?: MarketContext;
  channelContext?: ChannelContext;
  regulatoryContext?: RegulatoryContext;
}

// ============================================================================
// INDUSTRY TYPES
// ============================================================================

export const industryTypes = [
  "biopharma",
  "vendor",
  "media",
] as const;

export type IndustryType = (typeof industryTypes)[number];

export interface IndustryRequirements {
  biopharma: {
    requiresCompetitors: boolean;
    requiresMarketSize: boolean;
    requiresKeyTrends: boolean;
  };
  vendor: {
    requiresMarketDynamics: boolean;
    requiresGrowthRate: boolean;
  };
  media: {
    requiresGrowthRate: boolean;
    requiresMarketShare: boolean;
  };
}
