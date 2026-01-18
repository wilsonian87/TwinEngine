/**
 * L2CampaignOrbit - Campaign orbit view for a selected channel
 *
 * Phase 11C: Shows channel as nucleus with campaigns orbiting,
 * colored by messaging theme, sized by HCP reach.
 */

import { useState, useEffect, useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CampaignNode } from './CampaignNode';
import { getL2Data } from '@/lib/constellation/dataService';
import { getChannelConfig } from '@/lib/constellation/channelColors';
import type { L2CampaignOrbitData } from '@shared/schema';
import {
  Mail,
  Users,
  Building2,
  Video,
  Megaphone,
  Globe,
} from 'lucide-react';

const CHANNEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Mail,
  Users,
  Building2,
  Video,
  Megaphone,
  Globe,
};

interface L2CampaignOrbitProps {
  channelId: string;
  channelLabel: string;
  onCampaignSelect: (campaignId: string, campaignName: string) => void;
  onBack: () => void;
  focusedCampaign?: string | null;
}

/**
 * Compute orbital positions for campaigns around channel nucleus
 */
function computeCampaignPositions(
  campaigns: L2CampaignOrbitData['campaigns']
): Record<string, [number, number, number]> {
  const positions: Record<string, [number, number, number]> = {};

  // Sort by reach - larger campaigns closer to nucleus
  const sorted = [...campaigns].sort((a, b) => b.hcpReach - a.hcpReach);

  const baseDistance = 35;
  const distanceIncrement = 8;
  const maxPerRing = 6;

  sorted.forEach((campaign, index) => {
    // Which ring (orbit) this campaign is on
    const ring = Math.floor(index / maxPerRing);
    const positionInRing = index % maxPerRing;
    const campaignsInThisRing = Math.min(maxPerRing, sorted.length - ring * maxPerRing);

    // Angle within the ring
    const angle = (positionInRing / campaignsInThisRing) * Math.PI * 2;
    // Offset each ring by half a slot for visual interest
    const angleOffset = ring * (Math.PI / maxPerRing);
    const finalAngle = angle + angleOffset;

    // Distance increases per ring
    const distance = baseDistance + ring * distanceIncrement;

    // Add Y variation based on ring for depth
    const yVariation = (ring % 2 === 0 ? 1 : -1) * (5 + ring * 3);

    positions[campaign.id] = [
      Math.cos(finalAngle) * distance,
      yVariation,
      Math.sin(finalAngle) * distance,
    ];
  });

  return positions;
}

export function L2CampaignOrbit({
  channelId,
  channelLabel,
  onCampaignSelect,
  onBack,
  focusedCampaign,
}: L2CampaignOrbitProps) {
  const [data, setData] = useState<L2CampaignOrbitData | null>(null);
  const [loading, setLoading] = useState(true);

  const channelConfig = getChannelConfig(channelId);
  const IconComponent = CHANNEL_ICONS[channelConfig.iconName] || Globe;

  // Load L2 data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const l2Data = await getL2Data(channelId);
        setData(l2Data);
      } catch (error) {
        console.error('[L2CampaignOrbit] Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [channelId]);

  // Compute campaign positions
  const campaignPositions = useMemo(() => {
    if (!data) return {};
    return computeCampaignPositions(data.campaigns);
  }, [data]);

  // Health color based on engagement - MUST be before early return to follow hooks rules
  const healthColor = useMemo(() => {
    if (!data) return '#64748b'; // default slate when no data
    if (data.nucleus.avgEngagement >= 70) return '#22c55e';
    if (data.nucleus.avgEngagement >= 50) return '#f59e0b';
    return '#ef4444';
  }, [data]);

  if (loading || !data) {
    return null;
  }

  return (
    <group>
      {/* Channel Nucleus (smaller than L1 HCP nucleus) */}
      <mesh>
        <sphereGeometry args={[18, 48, 48]} />
        <meshStandardMaterial
          color={channelConfig.primary}
          emissive={channelConfig.primary}
          emissiveIntensity={0.2}
          roughness={0.4}
          metalness={0.2}
        />
      </mesh>

      {/* Outer glow ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[20, 23, 64]} />
        <meshBasicMaterial
          color={channelConfig.glow}
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Channel Label */}
      <Html position={[0, 28, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="flex flex-col items-center gap-1">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border border-slate-200">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${channelConfig.primary}20`, color: channelConfig.primary }}
              >
                <IconComponent className="w-4 h-4" />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900">{channelLabel}</div>
                <div className="text-xs text-slate-500">
                  {data.nucleus.totalHcps.toLocaleString()} HCPs • {data.campaigns.length} Campaigns
                </div>
              </div>
            </div>
          </div>
          {/* Health indicator */}
          <div
            className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${healthColor}20`, color: healthColor }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: healthColor }}
            />
            {data.nucleus.avgEngagement}% Avg Engagement
          </div>
        </div>
      </Html>

      {/* Back button */}
      <Html position={[0, -30, 0]} center>
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/95 backdrop-blur-sm shadow-md border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1.5 text-slate-600"
        >
          <span>←</span>
          <span>Back to Ecosystem</span>
        </button>
      </Html>

      {/* Campaign Nodes */}
      {data.campaigns.map((campaign) => (
        <CampaignNode
          key={campaign.id}
          campaignId={campaign.id}
          name={campaign.name}
          brand={campaign.brand}
          therapeuticArea={campaign.therapeuticArea}
          hcpReach={campaign.hcpReach}
          primaryTheme={campaign.primaryTheme}
          primaryThemeColor={campaign.primaryThemeColor}
          secondaryTheme={campaign.secondaryTheme}
          kpis={campaign.kpis}
          position={campaignPositions[campaign.id] || [0, 0, 0]}
          onSelect={(id) => onCampaignSelect(id, campaign.name)}
          isHighlighted={focusedCampaign === campaign.id}
          isDimmed={focusedCampaign !== null && focusedCampaign !== campaign.id}
        />
      ))}

      {/* Orbital rings (decorative) */}
      {[35, 43, 51].map((radius, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius - 0.3, radius + 0.3, 64]} />
          <meshBasicMaterial
            color="#94a3b8"
            transparent
            opacity={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <pointLight position={[50, 50, 50]} intensity={0.7} />
      <pointLight position={[-50, -50, -50]} intensity={0.3} />
    </group>
  );
}
