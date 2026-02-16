/**
 * Saturation Generator
 * Converts stimuli events into message_exposure_fact records
 * for the Message Saturation Index (MSI) analytics.
 *
 * Groups each HCP's stimuli by content category → message theme,
 * computes exposure metrics, then calculates MSI via the existing formula.
 */

import { getRng } from "../rng";
import { CONTENT_TO_THEME_MAP } from "../config";
import type { ContentCategory } from "../config";
import type { AdoptionStage, Segment } from "@shared/schema";
import type { messageExposureFact } from "@shared/schema";
import {
  calculateMsiComponents,
  calculateMsi,
  msiToRiskLevel,
  determineMsiDirection,
} from "../../../storage/message-saturation-storage";

// Types matching the data we receive from the pipeline
interface StimulusRecord {
  id: string;
  hcpId: string;
  channel: string;
  contentCategory: string | null;
  eventDate: Date;
  actualEngagementDelta: number | null;
}

interface OutcomeRecord {
  hcpId: string;
  stimulusId: string | null;
  eventDate: Date;
}

interface MessageTheme {
  id: string;
  category: string;
}

/**
 * Map HCP segment to adoption stage.
 * High Prescriber / Academic Leader → loyalty (established relationship)
 * Growth Potential / Engaged Digital → consideration (actively evaluating)
 * Traditional Preference → trial (known but not fully adopted)
 * New Target → awareness (early funnel)
 */
const SEGMENT_TO_ADOPTION_STAGE: Record<Segment, AdoptionStage> = {
  "High Prescriber": "loyalty",
  "Academic Leader": "loyalty",
  "Growth Potential": "consideration",
  "Engaged Digital": "consideration",
  "Traditional Preference": "trial",
  "New Target": "awareness",
};

/**
 * Calculate Shannon entropy for channel distribution, normalized to 0-1.
 */
function shannonEntropy(channelCounts: Map<string, number>): number {
  const counts = Array.from(channelCounts.values());
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;

  let entropy = 0;
  for (const count of counts) {
    if (count === 0) continue;
    const p = count / total;
    entropy -= p * Math.log2(p);
  }

  // Normalize: max entropy = log2(numChannels)
  const numChannels = channelCounts.size;
  const maxEntropy = numChannels > 1 ? Math.log2(numChannels) : 1;
  return entropy / maxEntropy;
}

/**
 * Simple linear regression slope for engagement deltas over time.
 * Positive slope = engagement declining (getting worse).
 */
function engagementDecaySlope(
  deltas: { date: Date; delta: number }[]
): number {
  if (deltas.length < 2) return 0;

  // Sort by date
  const sorted = [...deltas].sort((a, b) => a.date.getTime() - b.date.getTime());

  const n = sorted.length;
  const firstTime = sorted[0].date.getTime();

  // Convert dates to days from first event
  const xs = sorted.map((d) => (d.date.getTime() - firstTime) / (1000 * 60 * 60 * 24));
  const ys = sorted.map((d) => d.delta);

  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
  const sumXX = xs.reduce((acc, x) => acc + x * x, 0);

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;

  // Slope: negative delta means engagement improving, positive means declining
  // We invert so positive = declining (matches MSI convention)
  const slope = (n * sumXY - sumX * sumY) / denom;
  return -slope * 30; // Scale to per-month, inverted
}

/**
 * Generate message exposure records from stimuli events.
 *
 * For each HCP, groups their stimuli by mapped theme and computes:
 * - touchFrequency, uniqueChannels, channelDiversity
 * - avgTimeBetweenTouches, engagementRate, engagementDecay
 * - adoptionStage (from HCP segment)
 * - MSI (via the canonical formula)
 */
/** Record shape for batch insert into message_exposure_fact */
export type MessageExposureInsert = typeof messageExposureFact.$inferInsert;

export function generateMessageExposures(
  stimuli: StimulusRecord[],
  themes: MessageTheme[],
  outcomes: OutcomeRecord[],
  hcpSegments: Map<string, string>
): MessageExposureInsert[] {
  const rng = getRng();
  const results: MessageExposureInsert[] = [];

  // Build theme lookup: category → themeId
  const categoryToThemeId = new Map<string, string>();
  for (const theme of themes) {
    categoryToThemeId.set(theme.category, theme.id);
  }

  // Build outcome lookup: stimulusId → outcomeRecord
  const stimulusToOutcome = new Map<string, OutcomeRecord>();
  for (const outcome of outcomes) {
    if (outcome.stimulusId) {
      stimulusToOutcome.set(outcome.stimulusId, outcome);
    }
  }

  // Group stimuli by HCP
  const hcpStimuli = new Map<string, StimulusRecord[]>();
  for (const s of stimuli) {
    const list = hcpStimuli.get(s.hcpId) || [];
    list.push(s);
    hcpStimuli.set(s.hcpId, list);
  }

  for (const [hcpId, hcpEvents] of Array.from(hcpStimuli.entries())) {
    const segment = hcpSegments.get(hcpId) || "Growth Potential";
    const adoptionStage = SEGMENT_TO_ADOPTION_STAGE[segment as Segment] || "consideration";

    // Group by mapped theme (themeId → stimulus records)
    const themeGroups: Map<string, StimulusRecord[]> = new Map();
    for (const event of hcpEvents) {
      const contentCat = event.contentCategory as ContentCategory | null;
      if (!contentCat) continue;

      const themeCategory = CONTENT_TO_THEME_MAP[contentCat];
      if (!themeCategory) continue;

      const themeId = categoryToThemeId.get(themeCategory);
      if (!themeId) continue;

      const group = themeGroups.get(themeId) || [];
      group.push(event);
      themeGroups.set(themeId, group);
    }

    // Generate one exposure record per theme
    for (const [themeId, events] of Array.from(themeGroups.entries())) {
      const sortedEvents = [...events].sort(
        (a, b) => a.eventDate.getTime() - b.eventDate.getTime()
      );

      const touchFrequency = events.length;

      // Channel metrics
      const channelCounts = new Map<string, number>();
      for (const e of events) {
        channelCounts.set(e.channel, (channelCounts.get(e.channel) || 0) + 1);
      }
      const uniqueChannels = channelCounts.size;
      const channelDiversity = shannonEntropy(channelCounts);

      // Average time between touches
      let avgTimeBetweenTouches: number | null = null;
      if (sortedEvents.length >= 2) {
        const gaps: number[] = [];
        for (let i = 1; i < sortedEvents.length; i++) {
          const gapDays =
            (sortedEvents[i].eventDate.getTime() - sortedEvents[i - 1].eventDate.getTime()) /
            (1000 * 60 * 60 * 24);
          gaps.push(gapDays);
        }
        avgTimeBetweenTouches = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      }

      // Engagement metrics
      const eventsWithDelta = events.filter((e) => e.actualEngagementDelta != null);
      const engagementRate = events.length > 0 ? eventsWithDelta.length / events.length : 0;

      // Engagement decay: slope of engagement deltas over time
      const engagementDecay = engagementDecaySlope(
        eventsWithDelta.map((e) => ({
          date: e.eventDate,
          delta: e.actualEngagementDelta!,
        }))
      );

      // Last engagement date
      const lastEvent = sortedEvents[sortedEvents.length - 1];
      const lastEngagementDate = lastEvent.eventDate;

      // Calculate MSI
      const components = calculateMsiComponents(
        touchFrequency,
        channelDiversity,
        engagementDecay,
        adoptionStage
      );
      const msi = calculateMsi(components);
      const msiDirection = determineMsiDirection(msi, null);
      const saturationRisk = msiToRiskLevel(msi);

      results.push({
        hcpId,
        messageThemeId: themeId,
        touchFrequency,
        uniqueChannels,
        channelDiversity,
        avgTimeBetweenTouches,
        engagementRate,
        engagementDecay,
        lastEngagementDate,
        adoptionStage,
        measurementPeriod: "trailing-12mo",
        msi,
        msiDirection,
        saturationRisk,
      });
    }
  }

  return results;
}
