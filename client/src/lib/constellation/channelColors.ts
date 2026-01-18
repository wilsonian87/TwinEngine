/**
 * Channel Brand Colors
 *
 * Each channel has a fixed identity color. Engagement health is visualized
 * separately via glow intensity, particle effects, or diagnostic overlays.
 */

import {
  Mail,
  Users,
  Building2,
  Video,
  Megaphone,
  Globe,
  type LucideIcon,
} from 'lucide-react';

export interface ChannelColorConfig {
  primary: string;    // Main planet color
  glow: string;       // Emissive/hover glow
  label: string;      // Text/badge color
  icon: LucideIcon;   // Lucide icon component
  iconName: string;   // Icon name for serialization
  displayName: string; // Human-readable label
}

export const CHANNEL_COLORS: Record<string, ChannelColorConfig> = {
  email: {
    primary: '#3B82F6',   // Blue - digital communication
    glow: '#60A5FA',
    label: '#1D4ED8',
    icon: Mail,
    iconName: 'Mail',
    displayName: 'Email',
  },
  field: {
    primary: '#F97316',   // Orange - warm, personal, human
    glow: '#FB923C',
    label: '#EA580C',
    icon: Users,
    iconName: 'Users',
    displayName: 'Field/MSL',
  },
  congress: {
    primary: '#8B5CF6',   // Purple - premium, event, prestige
    glow: '#A78BFA',
    label: '#7C3AED',
    icon: Building2,
    iconName: 'Building2',
    displayName: 'Congress',
  },
  webinar: {
    primary: '#22C55E',   // Green - growth, engagement, live
    glow: '#4ADE80',
    label: '#16A34A',
    icon: Video,
    iconName: 'Video',
    displayName: 'Webinar',
  },
  paid_media: {
    primary: '#EC4899',   // Pink - attention, advertising
    glow: '#F472B6',
    label: '#DB2777',
    icon: Megaphone,
    iconName: 'Megaphone',
    displayName: 'Paid Digital',
  },
  web: {
    primary: '#06B6D4',   // Cyan - information, self-service
    glow: '#22D3EE',
    label: '#0891B2',
    icon: Globe,
    iconName: 'Globe',
    displayName: 'Web',
  },
};

// Default fallback for unknown channels
export const DEFAULT_CHANNEL: ChannelColorConfig = {
  primary: '#64748B',
  glow: '#94A3B8',
  label: '#475569',
  icon: Globe,
  iconName: 'Globe',
  displayName: 'Unknown',
};

/**
 * Get channel configuration with fallback
 */
export function getChannelConfig(channelId: string): ChannelColorConfig {
  return CHANNEL_COLORS[channelId] || DEFAULT_CHANNEL;
}

/**
 * Get channel display name
 */
export function getChannelDisplayName(channelId: string): string {
  return CHANNEL_COLORS[channelId]?.displayName || channelId;
}

/**
 * Get all channel IDs
 */
export function getAllChannelIds(): string[] {
  return Object.keys(CHANNEL_COLORS);
}

/**
 * Engagement health visual treatments
 * Applied as separate overlay/effect based on channel health score
 */
export type EngagementHealth = 'healthy' | 'warning' | 'critical';

export function getEngagementHealth(avgEngagement: number): EngagementHealth {
  if (avgEngagement >= 70) return 'healthy';
  if (avgEngagement >= 50) return 'warning';
  return 'critical';
}

export const ENGAGEMENT_HEALTH_EFFECTS: Record<EngagementHealth, {
  description: string;
  glowIntensity: number;
  particleDecay: boolean;
  desaturate: boolean;
}> = {
  healthy: {
    description: 'Steady glow, smooth edges',
    glowIntensity: 1.0,
    particleDecay: false,
    desaturate: false,
  },
  warning: {
    description: 'Dimmed glow, slight flicker',
    glowIntensity: 0.5,
    particleDecay: false,
    desaturate: false,
  },
  critical: {
    description: 'No glow, particle decay effect, desaturated',
    glowIntensity: 0,
    particleDecay: true,
    desaturate: true,
  },
};
