/**
 * L1SolarSystem - Top-level constellation view
 *
 * Phase 11: The "Solar System" view with HCP nucleus at center
 * and channel planets orbiting around it.
 */

import { useState, useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { HCPNucleus } from './HCPNucleus';
import { ChannelPlanet } from './ChannelPlanet';
import { ChannelEdgesL1 } from './ChannelEdgesL1';
import { getL1Data } from '@/lib/constellation/dataService';
import type { L1SolarSystemData } from '@shared/schema';

interface L1SolarSystemProps {
  onChannelSelect: (channelId: string) => void;
  focusedChannel?: string | null;
}

/**
 * Compute orbital positions for channel planets
 */
function computeChannelPositions(
  channels: L1SolarSystemData['channels']
): Record<string, [number, number, number]> {
  const positions: Record<string, [number, number, number]> = {};

  // Sort by reach - largest channels get inner orbits (more gravitational pull)
  const sorted = [...channels].sort((a, b) => b.hcpReach - a.hcpReach);

  const baseDistance = 70;
  const distanceIncrement = 15;

  sorted.forEach((channel, index) => {
    // Distribute evenly around the nucleus
    const angle = (index / sorted.length) * Math.PI * 2;
    // Add slight offset to avoid perfect symmetry
    const angleOffset = (index % 2 === 0 ? 0.1 : -0.1);
    const finalAngle = angle + angleOffset;

    // Outer channels are further from nucleus
    const distance = baseDistance + index * distanceIncrement;

    // Add slight Y variation for depth
    const yVariation = (Math.sin(index * 1.5) * 15);

    positions[channel.id] = [
      Math.cos(finalAngle) * distance,
      yVariation,
      Math.sin(finalAngle) * distance,
    ];
  });

  return positions;
}

export function L1SolarSystem({
  onChannelSelect,
  focusedChannel,
}: L1SolarSystemProps) {
  const [data, setData] = useState<L1SolarSystemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredChannel, setHoveredChannel] = useState<string | null>(null);

  // Load L1 data
  useEffect(() => {
    async function loadData() {
      try {
        const l1Data = await getL1Data();
        setData(l1Data);
      } catch (error) {
        console.error('[L1SolarSystem] Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute channel positions
  const channelPositions = useMemo(() => {
    if (!data) return {};
    return computeChannelPositions(data.channels);
  }, [data]);

  if (loading || !data) {
    return null; // Will show loading state from parent
  }

  return (
    <group>
      {/* Central HCP Nucleus */}
      <HCPNucleus
        totalHcps={data.nucleus.totalHcps}
        avgEngagement={data.nucleus.avgEngagement}
        size="large"
      />

      {/* Channel Interconnection Edges */}
      <ChannelEdgesL1
        interconnections={data.interconnections}
        channelPositions={channelPositions}
        hoveredChannel={hoveredChannel}
      />

      {/* Channel Planets */}
      {data.channels.map((channel) => (
        <ChannelPlanet
          key={channel.id}
          channelId={channel.id}
          label={channel.label}
          hcpReach={channel.hcpReach}
          avgEngagement={channel.avgEngagement}
          campaignCount={channel.campaignCount}
          position={channelPositions[channel.id] || [0, 0, 0]}
          onSelect={(id) => {
            setHoveredChannel(null);
            onChannelSelect(id);
          }}
          isHighlighted={focusedChannel === channel.id}
          isDimmed={focusedChannel !== null && focusedChannel !== channel.id}
        />
      ))}

      {/* Ambient lighting for the scene */}
      <ambientLight intensity={0.6} />
      <pointLight position={[100, 100, 100]} intensity={0.8} />
      <pointLight position={[-100, -100, -100]} intensity={0.4} />
    </group>
  );
}
