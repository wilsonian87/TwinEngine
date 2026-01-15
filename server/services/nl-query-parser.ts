/**
 * NLQueryParser - Natural language query parsing service
 *
 * This module contains rule-based parsing for natural language queries.
 * It extracts filters and detects query intent from user input.
 * This will be enhanced with GenAI integration in M6.
 */

import type { NLQueryFilters, NLRecommendation, HCPProfile, Channel, HCPFilter } from '@shared/schema';
import { specialties, tiers, segments, channels } from '@shared/schema';

/**
 * Parses a natural language query into structured filters
 */
export function parseNLQueryToFilters(query: string): NLQueryFilters {
  const q = query.toLowerCase();
  const filters: NLQueryFilters = {};

  // Tier detection
  if (q.includes('tier 1') || q.includes('tier1')) {
    filters.tiers = ['Tier 1'];
  } else if (q.includes('tier 2') || q.includes('tier2')) {
    filters.tiers = ['Tier 2'];
  } else if (q.includes('tier 3') || q.includes('tier3')) {
    filters.tiers = ['Tier 3'];
  }

  // Specialty detection
  for (const specialty of specialties) {
    if (q.includes(specialty.toLowerCase())) {
      filters.specialties = [specialty];
      break;
    }
  }

  // Segment detection
  for (const segment of segments) {
    if (q.includes(segment.toLowerCase())) {
      filters.segments = [segment];
      break;
    }
  }

  // Channel detection
  for (const channel of channels) {
    const channelName = channel.replace('_', ' ');
    if (q.includes(channelName) || q.includes(channel)) {
      filters.channels = [channel];
      break;
    }
  }

  // Engagement range detection
  const engagementMatch = q.match(/(\d+)\s*[-–]\s*(\d+)\s*%?\s*(engagement|score)?/);
  if (engagementMatch) {
    filters.engagementRange = {
      min: parseInt(engagementMatch[1]),
      max: parseInt(engagementMatch[2]),
    };
  }

  // High/low engagement
  if (q.includes('high engagement') || q.includes('highly engaged')) {
    filters.engagementRange = { min: 70 };
  } else if (q.includes('low engagement') || q.includes('poorly engaged')) {
    filters.engagementRange = { max: 40 };
  }

  return filters;
}

/**
 * Detects the intent of a natural language query
 */
export function detectQueryIntent(query: string): string {
  const q = query.toLowerCase();

  if (q.includes('boost') || q.includes('increase') || q.includes('improve')) {
    return 'optimization';
  }
  if (q.includes('find') || q.includes('identify') || q.includes('show')) {
    return 'discovery';
  }
  if (q.includes('why') || q.includes('reason') || q.includes('explain')) {
    return 'analysis';
  }
  if (q.includes('compare') || q.includes('difference') || q.includes('versus')) {
    return 'comparison';
  }

  return 'general';
}

/**
 * Generates recommendations based on filters and HCP data
 */
export function generateRecommendations(filters: NLQueryFilters, hcps: HCPProfile[]): NLRecommendation[] {
  const recommendations: NLRecommendation[] = [];

  if (hcps.length === 0) return recommendations;

  // Analyze channel preferences
  const channelCounts = new Map<Channel, number>();
  hcps.forEach(h => {
    channelCounts.set(h.channelPreference, (channelCounts.get(h.channelPreference) || 0) + 1);
  });

  // Find most effective channel
  const sortedChannels = Array.from(channelCounts.entries()).sort((a, b) => b[1] - a[1]);
  if (sortedChannels.length > 0) {
    const [topChannel, count] = sortedChannels[0];
    const percentage = (count / hcps.length) * 100;
    recommendations.push({
      type: 'channel',
      recommendation: `Focus on ${topChannel.replace('_', ' ')} communications`,
      predictedImpact: 12 + Math.random() * 8,
      confidence: 0.78,
      rationale: `${percentage.toFixed(0)}% of this cohort prefers ${topChannel.replace('_', ' ')} as their primary channel`,
    });
  }

  // Engagement-based recommendation
  const avgEngagement = hcps.reduce((sum, h) => sum + h.overallEngagementScore, 0) / hcps.length;
  if (avgEngagement < 50) {
    recommendations.push({
      type: 'frequency',
      recommendation: 'Increase touch frequency to 6+ per month',
      predictedImpact: 8 + Math.random() * 5,
      confidence: 0.72,
      rationale: 'Low-engagement HCPs typically respond to more frequent, consistent outreach',
    });
  }

  // Content recommendation
  recommendations.push({
    type: 'content',
    recommendation: 'Use clinical data and patient outcome content',
    predictedImpact: 10 + Math.random() * 6,
    confidence: 0.81,
    rationale: 'Clinical evidence-based content shows highest engagement across similar cohorts',
  });

  return recommendations;
}

/**
 * Converts NL query filters to HCP filter format
 */
export function convertToHcpFilter(nlFilters: NLQueryFilters): HCPFilter {
  const filter: HCPFilter = {};

  if (nlFilters.tiers) filter.tiers = nlFilters.tiers;
  if (nlFilters.segments) filter.segments = nlFilters.segments;
  if (nlFilters.specialties) filter.specialties = nlFilters.specialties;
  if (nlFilters.engagementRange?.min) filter.minEngagementScore = nlFilters.engagementRange.min;
  if (nlFilters.engagementRange?.max) filter.maxEngagementScore = nlFilters.engagementRange.max;
  if (nlFilters.channels && nlFilters.channels.length > 0) filter.channelPreference = nlFilters.channels[0];

  return filter;
}
