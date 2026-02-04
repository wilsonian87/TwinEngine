/**
 * Relationship Scoring
 *
 * Calculate semantic relatedness between content items.
 * Used for content discovery, recommendations, and benchmarking.
 */

import type {
  Audience,
  Specialty,
  TherapeuticArea,
  Channel,
  ContentType,
  AudienceContext,
  MarketContext,
  ChannelContext,
} from "../domain/types";
import {
  therapeuticAreaMappings,
  specialtyMappings,
  contentTypeMappings,
} from "../domain/mappings";

// ============================================================================
// TYPES
// ============================================================================

export interface ContentForScoring {
  contentType: ContentType;
  audienceContext?: Partial<AudienceContext>;
  marketContext?: Partial<MarketContext>;
  channelContext?: Partial<ChannelContext>;
  tags?: string[];
}

export interface RelationshipScoreFactors {
  audienceMatch: number;
  specialtyMatch: number;
  therapeuticAreaMatch: number;
  channelMatch: number;
  contentTypeMatch: number;
  tagMatch?: number;
}

export interface RelationshipScore {
  score: number; // 0.0 - 1.0
  factors: RelationshipScoreFactors;
  explanation: string[];
}

// ============================================================================
// WEIGHT CONFIGURATION
// ============================================================================

const WEIGHTS = {
  audienceMatch: 0.25,
  specialtyMatch: 0.2,
  therapeuticAreaMatch: 0.25,
  channelMatch: 0.15,
  contentTypeMatch: 0.1,
  tagMatch: 0.05,
};

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

/**
 * Calculate audience match score
 */
function scoreAudienceMatch(source: ContentForScoring, target: ContentForScoring): number {
  const sourceAudience = source.audienceContext?.audience;
  const targetAudience = target.audienceContext?.audience;

  if (!sourceAudience || !targetAudience) {
    return 0.5; // Neutral score when missing
  }

  if (sourceAudience === targetAudience) {
    return 1.0;
  }

  // Related audience pairs
  const relatedPairs: [Audience, Audience][] = [
    ["HCP", "Field"],
    ["Consumer", "Caregiver"],
  ];

  for (const [a, b] of relatedPairs) {
    if (
      (sourceAudience === a && targetAudience === b) ||
      (sourceAudience === b && targetAudience === a)
    ) {
      return 0.7;
    }
  }

  return 0.2;
}

/**
 * Calculate specialty match score
 */
function scoreSpecialtyMatch(source: ContentForScoring, target: ContentForScoring): number {
  const sourceSpecialty = source.audienceContext?.specialty;
  const targetSpecialty = target.audienceContext?.specialty;

  if (!sourceSpecialty || !targetSpecialty) {
    return 0.5;
  }

  if (sourceSpecialty === targetSpecialty) {
    return 1.0;
  }

  // Check for parent-child relationship
  const sourceMapping = specialtyMappings[sourceSpecialty as Specialty];
  const targetMapping = specialtyMappings[targetSpecialty as Specialty];

  if (sourceMapping?.parent === targetSpecialty || targetMapping?.parent === sourceSpecialty) {
    return 0.8;
  }

  // Check for shared therapeutic areas
  const sourceAreas = sourceMapping?.relatedTherapeuticAreas ?? [];
  const targetAreas = targetMapping?.relatedTherapeuticAreas ?? [];
  const sharedAreas = sourceAreas.filter((a) => targetAreas.includes(a));

  if (sharedAreas.length > 0) {
    return 0.5 + (0.3 * sharedAreas.length / Math.max(sourceAreas.length, targetAreas.length));
  }

  return 0.2;
}

/**
 * Calculate therapeutic area match score
 */
function scoreTherapeuticAreaMatch(source: ContentForScoring, target: ContentForScoring): number {
  const sourceTA = source.marketContext?.therapeuticArea;
  const targetTA = target.marketContext?.therapeuticArea;

  if (!sourceTA || !targetTA) {
    return 0.5;
  }

  if (sourceTA === targetTA) {
    return 1.0;
  }

  // Check for condition overlap
  const sourceMapping = therapeuticAreaMappings[sourceTA as TherapeuticArea];
  const targetMapping = therapeuticAreaMappings[targetTA as TherapeuticArea];

  if (sourceMapping && targetMapping) {
    const sourceConditions = sourceMapping.conditions;
    const targetConditions = targetMapping.conditions;
    const sharedConditions = sourceConditions.filter((c) =>
      targetConditions.some((tc) => tc.toLowerCase().includes(c.toLowerCase()))
    );

    if (sharedConditions.length > 0) {
      return 0.5 + (0.3 * sharedConditions.length / Math.max(sourceConditions.length, targetConditions.length));
    }

    // Check for shared specialties
    const sourceSpecs = sourceMapping.relatedSpecialties;
    const targetSpecs = targetMapping.relatedSpecialties;
    const sharedSpecs = sourceSpecs.filter((s) => targetSpecs.includes(s));

    if (sharedSpecs.length > 0) {
      return 0.4;
    }
  }

  return 0.1;
}

/**
 * Calculate channel match score
 */
function scoreChannelMatch(source: ContentForScoring, target: ContentForScoring): number {
  const sourceChannel = source.channelContext?.primaryChannel;
  const targetChannel = target.channelContext?.primaryChannel;

  if (!sourceChannel || !targetChannel) {
    return 0.5;
  }

  if (sourceChannel === targetChannel) {
    return 1.0;
  }

  // Group similar channels
  const digitalChannels: Channel[] = ["email", "digital_ad", "social_media", "webinar"];
  const personalChannels: Channel[] = ["rep_visit", "phone", "conference"];

  const sourceIsDigital = digitalChannels.includes(sourceChannel);
  const targetIsDigital = digitalChannels.includes(targetChannel);
  const sourceIsPersonal = personalChannels.includes(sourceChannel);
  const targetIsPersonal = personalChannels.includes(targetChannel);

  if ((sourceIsDigital && targetIsDigital) || (sourceIsPersonal && targetIsPersonal)) {
    return 0.7;
  }

  return 0.3;
}

/**
 * Calculate content type match score
 */
function scoreContentTypeMatch(source: ContentForScoring, target: ContentForScoring): number {
  if (source.contentType === target.contentType) {
    return 1.0;
  }

  const sourceMapping = contentTypeMappings[source.contentType];
  const targetMapping = contentTypeMappings[target.contentType];

  if (sourceMapping?.relatedTypes.includes(target.contentType)) {
    return 0.8;
  }

  if (targetMapping?.relatedTypes.includes(source.contentType)) {
    return 0.8;
  }

  // Same compliance level
  if (sourceMapping?.complianceLevel === targetMapping?.complianceLevel) {
    return 0.4;
  }

  return 0.2;
}

/**
 * Calculate tag match score
 */
function scoreTagMatch(source: ContentForScoring, target: ContentForScoring): number {
  const sourceTags = source.tags ?? [];
  const targetTags = target.tags ?? [];

  if (sourceTags.length === 0 || targetTags.length === 0) {
    return 0.5;
  }

  const sourceSet = new Set(sourceTags.map((t) => t.toLowerCase()));
  const targetSet = new Set(targetTags.map((t) => t.toLowerCase()));

  const intersection = Array.from(sourceSet).filter((t) => targetSet.has(t));
  const union = new Set([...Array.from(sourceSet), ...Array.from(targetSet)]);

  // Jaccard similarity
  return intersection.length / union.size;
}

// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================

/**
 * Calculate relationship score between two content items
 */
export function calculateRelationshipScore(
  source: ContentForScoring,
  target: ContentForScoring
): RelationshipScore {
  const factors: RelationshipScoreFactors = {
    audienceMatch: scoreAudienceMatch(source, target),
    specialtyMatch: scoreSpecialtyMatch(source, target),
    therapeuticAreaMatch: scoreTherapeuticAreaMatch(source, target),
    channelMatch: scoreChannelMatch(source, target),
    contentTypeMatch: scoreContentTypeMatch(source, target),
  };

  // Add tag match if both have tags
  if (source.tags || target.tags) {
    factors.tagMatch = scoreTagMatch(source, target);
  }

  // Calculate weighted score
  let totalWeight = 0;
  let weightedScore = 0;

  for (const [key, weight] of Object.entries(WEIGHTS)) {
    const factorKey = key as keyof RelationshipScoreFactors;
    if (factors[factorKey] !== undefined) {
      totalWeight += weight;
      weightedScore += factors[factorKey]! * weight;
    }
  }

  const score = totalWeight > 0 ? weightedScore / totalWeight : 0;

  // Generate explanation
  const explanation: string[] = [];

  if (factors.audienceMatch >= 0.8) {
    explanation.push("Same or related audience");
  }
  if (factors.specialtyMatch >= 0.8) {
    explanation.push("Same or related specialty");
  }
  if (factors.therapeuticAreaMatch >= 0.8) {
    explanation.push("Same therapeutic area");
  }
  if (factors.channelMatch >= 0.8) {
    explanation.push("Same channel");
  }
  if (factors.contentTypeMatch >= 0.8) {
    explanation.push("Same or related content type");
  }
  if (factors.tagMatch && factors.tagMatch >= 0.5) {
    explanation.push("Shared tags");
  }

  if (explanation.length === 0) {
    if (score >= 0.5) {
      explanation.push("Moderate relationship based on context");
    } else {
      explanation.push("Low relationship - different context");
    }
  }

  return {
    score: Math.round(score * 100) / 100,
    factors,
    explanation,
  };
}

/**
 * Find related content from a list
 */
export function findRelatedContent(
  source: ContentForScoring,
  candidates: ContentForScoring[],
  options?: {
    minScore?: number;
    maxResults?: number;
  }
): Array<{ content: ContentForScoring; score: RelationshipScore }> {
  const { minScore = 0.3, maxResults = 10 } = options ?? {};

  const scored = candidates
    .map((candidate) => ({
      content: candidate,
      score: calculateRelationshipScore(source, candidate),
    }))
    .filter((item) => item.score.score >= minScore)
    .sort((a, b) => b.score.score - a.score.score)
    .slice(0, maxResults);

  return scored;
}

/**
 * Get average relationship score across a set of content
 */
export function getAverageRelationshipScore(content: ContentForScoring[]): number {
  if (content.length < 2) {
    return 0;
  }

  let totalScore = 0;
  let count = 0;

  for (let i = 0; i < content.length; i++) {
    for (let j = i + 1; j < content.length; j++) {
      const score = calculateRelationshipScore(content[i], content[j]);
      totalScore += score.score;
      count++;
    }
  }

  return count > 0 ? Math.round((totalScore / count) * 100) / 100 : 0;
}
