/**
 * Constellation Data Service
 *
 * Abstraction layer for Phase 11 three-level visualization data.
 * Currently returns mock data; later connects to API endpoints.
 */

import type {
  L1SolarSystemData,
  L2CampaignOrbitData,
  L3HcpConstellationData,
} from '@shared/schema';

import themesData from './mockData/themes.json';
import campaignsData from './mockData/campaigns.json';
import channelOverlapData from './mockData/channelOverlap.json';
import channelKPIsData from './mockData/channelKPIs.json';

import { CHANNEL_COLORS, getChannelConfig, getEngagementHealth } from './channelColors';
import { getSpecialtyConfig, SPECIALTY_ICONS } from './specialtyIcons';

// Types for mock data
interface MockTheme {
  id: string;
  name: string;
  description: string;
  color: string;
  lifecycleStage: string;
  appliesToTAs: string[];
}

interface MockCampaign {
  id: string;
  name: string;
  brand: string;
  ta: string;
  channel: string;
  primaryTheme: string;
  primaryThemeId: string;
  secondaryTheme: string;
  secondaryThemeId: string;
  startDate: string;
  endDate: string;
  hcpReach: number;
  kpis: Record<string, number>;
}

interface MockOverlap {
  source: string;
  target: string;
  overlapIndex: number;
  overlapCount: number;
}

interface MockChannelKPI {
  kpis: { key: string; label: string; format: 'percent' | 'number' | 'currency' | 'decimal' }[];
  benchmarks: Record<string, { good: number; warning: number }>;
}

// Cast imported JSON with proper typing
const themes = themesData as MockTheme[];
const campaigns = campaignsData as unknown as MockCampaign[];
const channelOverlaps = channelOverlapData.interconnections as MockOverlap[];
const channelKPIs = channelKPIsData as Record<string, MockChannelKPI>;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getThemeColor(themeName: string): string {
  const theme = themes.find(t => t.name === themeName);
  return theme?.color || '#64748B';
}

function generateSparkline(): number[] {
  // Generate 12 data points for sparkline (12 months)
  const base = Math.random() * 40 + 30;
  return Array.from({ length: 12 }, () =>
    Math.max(0, Math.min(100, base + (Math.random() - 0.5) * 30))
  );
}

function generateRxTrend(): 'up' | 'down' | 'flat' {
  const rand = Math.random();
  if (rand < 0.4) return 'up';
  if (rand < 0.7) return 'down';
  return 'flat';
}

function generateAdoptionStage(): 'Aware' | 'Trial' | 'Regular' {
  const rand = Math.random();
  if (rand < 0.3) return 'Aware';
  if (rand < 0.6) return 'Trial';
  return 'Regular';
}

function generateLastTouchDate(): string {
  const daysAgo = Math.floor(Math.random() * 90);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

// ============================================================================
// L1: SOLAR SYSTEM DATA
// ============================================================================

/**
 * Get L1 Solar System data - ecosystem overview with HCP nucleus and channel planets
 */
export async function getL1Data(): Promise<L1SolarSystemData> {
  // Calculate channel-level metrics from campaigns
  const channelMetrics: Record<string, {
    hcpReach: number;
    campaigns: number;
    totalEngagement: number;
  }> = {};

  for (const campaign of campaigns) {
    const channel = campaign.channel;
    if (!channelMetrics[channel]) {
      channelMetrics[channel] = { hcpReach: 0, campaigns: 0, totalEngagement: 0 };
    }
    channelMetrics[channel].hcpReach += campaign.hcpReach;
    channelMetrics[channel].campaigns += 1;
    // Use open rate or engagement score as proxy
    const engagementKpi = campaign.kpis.openRate || campaign.kpis.engagementScore ||
                          campaign.kpis.attendancePercent || campaign.kpis.accessRate || 0.5;
    channelMetrics[channel].totalEngagement += engagementKpi * 100;
  }

  // Build channel data
  const channelList = Object.entries(channelMetrics).map(([channelId, metrics]) => {
    const config = getChannelConfig(channelId);
    const avgEngagement = metrics.campaigns > 0
      ? Math.round(metrics.totalEngagement / metrics.campaigns)
      : 50;

    return {
      id: channelId,
      label: config.displayName,
      hcpReach: metrics.hcpReach,
      avgEngagement,
      campaignCount: metrics.campaigns,
      color: config.primary,
      icon: config.iconName,
    };
  });

  // Calculate nucleus (total unique HCPs - approximate with highest channel reach)
  const totalHcps = Math.max(...channelList.map(c => c.hcpReach), 2500);
  const avgEngagement = Math.round(
    channelList.reduce((sum, c) => sum + c.avgEngagement, 0) / channelList.length
  );

  return {
    nucleus: {
      totalHcps,
      avgEngagement,
    },
    channels: channelList,
    interconnections: channelOverlaps.map(o => ({
      source: o.source,
      target: o.target,
      overlapIndex: o.overlapIndex,
      overlapCount: o.overlapCount,
    })),
  };
}

// ============================================================================
// L2: CAMPAIGN ORBIT DATA
// ============================================================================

/**
 * Get L2 Campaign Orbit data for a specific channel
 */
export async function getL2Data(channelId: string): Promise<L2CampaignOrbitData> {
  const channelCampaigns = campaigns.filter(c => c.channel === channelId);
  const config = getChannelConfig(channelId);
  const kpiConfig = channelKPIs[channelId]?.kpis || [];

  // Calculate channel-level nucleus metrics
  const totalHcps = channelCampaigns.reduce((sum, c) => sum + c.hcpReach, 0);
  const avgEngagement = channelCampaigns.length > 0
    ? Math.round(
        channelCampaigns.reduce((sum, c) => {
          const engKpi = c.kpis.openRate || c.kpis.engagementScore ||
                         c.kpis.attendancePercent || c.kpis.accessRate || 0.5;
          return sum + engKpi * 100;
        }, 0) / channelCampaigns.length
      )
    : 50;

  return {
    channelId,
    channelLabel: config.displayName,
    nucleus: {
      totalHcps,
      avgEngagement,
    },
    campaigns: channelCampaigns.map(c => ({
      id: c.id,
      name: c.name,
      brand: c.brand,
      therapeuticArea: c.ta,
      hcpReach: c.hcpReach,
      primaryTheme: c.primaryTheme,
      primaryThemeColor: getThemeColor(c.primaryTheme),
      secondaryTheme: c.secondaryTheme,
      kpis: c.kpis,
    })),
    kpiConfig,
  };
}

// ============================================================================
// L3: HCP CONSTELLATION DATA
// ============================================================================

// Mock HCP first names and last names for generation
const FIRST_NAMES = [
  'Sarah', 'James', 'Priya', 'Michael', 'Chen', 'Maria', 'David', 'Jennifer',
  'Robert', 'Emily', 'William', 'Lisa', 'Richard', 'Jessica', 'Daniel', 'Amanda',
  'Christopher', 'Michelle', 'Matthew', 'Ashley', 'Anthony', 'Nicole', 'Mark', 'Stephanie',
  'Donald', 'Heather', 'Steven', 'Elizabeth', 'Paul', 'Rebecca', 'Andrew', 'Laura',
];

const LAST_NAMES = [
  'Chen', 'Smith', 'Patel', 'Johnson', 'Kim', 'Williams', 'Garcia', 'Martinez',
  'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson',
  'White', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen',
  'King', 'Wright', 'Scott', 'Green', 'Baker', 'Adams', 'Nelson', 'Hill',
];

/**
 * Get L3 HCP Constellation data for a specific campaign
 */
export async function getL3Data(campaignId: string): Promise<L3HcpConstellationData> {
  const campaign = campaigns.find(c => c.id === campaignId);

  if (!campaign) {
    throw new Error(`Campaign not found: ${campaignId}`);
  }

  // Generate mock HCPs for this campaign
  const hcpCount = campaign.hcpReach;
  const specialties = Object.keys(SPECIALTY_ICONS);

  // Distribution of channel affinities based on campaign channel
  const channelAffinities = [campaign.channel, 'email', 'field', 'webinar'];

  const hcps = Array.from({ length: Math.min(hcpCount, 500) }, (_, i) => {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length];
    const specialty = specialties[i % specialties.length];
    const specialtyConfig = getSpecialtyConfig(specialty);

    return {
      id: `hcp-${campaignId}-${i}`,
      name: `Dr. ${firstName} ${lastName}`,
      specialty,
      specialtyAbbr: specialtyConfig.abbr,
      specialtyColor: specialtyConfig.color,
      engagementScore: Math.round(Math.random() * 60 + 30),
      sparkline: generateSparkline(),
      rxTrend: generateRxTrend(),
      channelAffinity: getChannelConfig(channelAffinities[i % channelAffinities.length]).displayName,
      adoptionStage: generateAdoptionStage(),
      lastTouchDate: generateLastTouchDate(),
    };
  });

  return {
    campaignId,
    campaignName: campaign.name,
    channelId: campaign.channel,
    totalHcps: hcpCount,
    hcps,
  };
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Get all messaging themes
 */
export function getMessagingThemes(): MockTheme[] {
  return themes;
}

/**
 * Get theme by ID
 */
export function getThemeById(themeId: string): MockTheme | undefined {
  return themes.find(t => t.id === themeId);
}

/**
 * Get all campaigns
 */
export function getAllCampaigns(): MockCampaign[] {
  return campaigns;
}

/**
 * Get campaign by ID
 */
export function getCampaignById(campaignId: string): MockCampaign | undefined {
  return campaigns.find(c => c.id === campaignId);
}

/**
 * Get channel KPI configuration
 */
export function getChannelKPIConfig(channelId: string): MockChannelKPI | undefined {
  return channelKPIs[channelId];
}

/**
 * Format KPI value based on format type
 */
export function formatKPIValue(value: number, format: string): string {
  switch (format) {
    case 'percent':
      return `${Math.round(value * 100)}%`;
    case 'currency':
      return `$${value.toFixed(2)}`;
    case 'decimal':
      return value.toFixed(1);
    case 'number':
    default:
      return value.toLocaleString();
  }
}

// ============================================================================
// PHASE 12A: COMPETITIVE ORBIT DATA
// ============================================================================

import type { CompetitiveOrbitData } from '@shared/schema';

/**
 * Fetch competitive orbit visualization data from API
 */
export async function getCompetitiveOrbitData(): Promise<CompetitiveOrbitData | null> {
  try {
    const response = await fetch('/api/competitive/orbit-data', {
      credentials: 'include',
    });

    if (!response.ok) {
      console.warn('[DataService] Failed to fetch competitive orbit data:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[DataService] Error fetching competitive orbit data:', error);
    return null;
  }
}

/**
 * Seed competitive data (for development/demo)
 */
export async function seedCompetitiveData(): Promise<{ success: boolean; competitors?: number; signals?: number }> {
  try {
    const response = await fetch('/api/competitive/seed', {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      return { success: false };
    }

    return await response.json();
  } catch (error) {
    console.error('[DataService] Error seeding competitive data:', error);
    return { success: false };
  }
}
