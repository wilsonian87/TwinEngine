/**
 * L3HCPConstellation - HCP constellation view for a selected campaign
 *
 * Phase 11D: Shows HCPs as a constellation of specialty-colored nodes,
 * clustered by specialty with engagement-based sizing.
 */

import { useState, useEffect, useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { HCPNode } from './HCPNode';
import { getL3Data } from '@/lib/constellation/dataService';
import { getChannelConfig } from '@/lib/constellation/channelColors';
import { getSpecialtyConfig, SPECIALTY_ICONS } from '@/lib/constellation/specialtyIcons';
import type { L3HcpConstellationData } from '@shared/schema';

interface L3HCPConstellationProps {
  campaignId: string;
  campaignName: string;
  channelId: string;
  channelLabel: string;
  onHCPSelect?: (hcpId: string) => void;
  onBack: () => void;
}

// Safe click handler wrapper to prevent event propagation issues
function safeClickHandler(handler: () => void) {
  return (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    try {
      handler();
    } catch (error) {
      console.error('[L3HCPConstellation] Click handler error:', error);
    }
  };
}

/**
 * Compute positions for HCPs in a clustered constellation
 * Groups by specialty, with each specialty forming a cluster
 */
function computeHCPPositions(
  hcps: L3HcpConstellationData['hcps']
): Record<string, [number, number, number]> {
  const positions: Record<string, [number, number, number]> = {};

  // Group HCPs by specialty
  const bySpecialty: Record<string, typeof hcps> = {};
  hcps.forEach((hcp) => {
    if (!bySpecialty[hcp.specialty]) {
      bySpecialty[hcp.specialty] = [];
    }
    bySpecialty[hcp.specialty].push(hcp);
  });

  const specialties = Object.keys(bySpecialty);
  const clusterRadius = 25; // Radius of each specialty cluster
  const clusterDistance = 45; // Distance from center to cluster center

  specialties.forEach((specialty, specialtyIndex) => {
    const clusterHcps = bySpecialty[specialty];

    // Position cluster center around the campaign nucleus
    const clusterAngle = (specialtyIndex / specialties.length) * Math.PI * 2;
    const clusterCenterX = Math.cos(clusterAngle) * clusterDistance;
    const clusterCenterZ = Math.sin(clusterAngle) * clusterDistance;
    const clusterCenterY = (specialtyIndex % 2 === 0 ? 1 : -1) * 8;

    // Position HCPs within the cluster using spherical distribution
    clusterHcps.forEach((hcp, hcpIndex) => {
      // Golden ratio spiral for even distribution
      const phi = Math.acos(1 - 2 * (hcpIndex + 0.5) / clusterHcps.length);
      const theta = Math.PI * (1 + Math.sqrt(5)) * hcpIndex;

      // Scale radius by engagement (higher engagement = closer to center)
      const engagementFactor = 0.4 + (1 - hcp.engagementScore / 100) * 0.6;
      const r = clusterRadius * engagementFactor;

      const x = clusterCenterX + r * Math.sin(phi) * Math.cos(theta);
      const y = clusterCenterY + r * Math.cos(phi);
      const z = clusterCenterZ + r * Math.sin(phi) * Math.sin(theta);

      positions[hcp.id] = [x, y, z];
    });
  });

  return positions;
}

export function L3HCPConstellation({
  campaignId,
  campaignName,
  channelId,
  channelLabel,
  onHCPSelect,
  onBack,
}: L3HCPConstellationProps) {
  const [data, setData] = useState<L3HcpConstellationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);

  const channelConfig = getChannelConfig(channelId);

  // Load L3 data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const l3Data = await getL3Data(campaignId);
        setData(l3Data);
      } catch (error) {
        console.error('[L3HCPConstellation] Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [campaignId]);

  // Compute HCP positions
  const hcpPositions = useMemo(() => {
    if (!data) return {};
    return computeHCPPositions(data.hcps);
  }, [data]);

  // Get unique specialties for legend
  const specialtySummary = useMemo(() => {
    if (!data) return [];
    const counts: Record<string, number> = {};
    data.hcps.forEach((hcp) => {
      counts[hcp.specialty] = (counts[hcp.specialty] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([specialty, count]) => ({
        specialty,
        count,
        config: getSpecialtyConfig(specialty),
      }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  if (loading || !data) {
    return null;
  }

  // Calculate average engagement
  const avgEngagement = Math.round(
    data.hcps.reduce((sum, hcp) => sum + hcp.engagementScore, 0) / data.hcps.length
  );

  return (
    <group>
      {/* Campaign Nucleus (smaller) */}
      <mesh>
        <sphereGeometry args={[10, 32, 32]} />
        <meshStandardMaterial
          color={channelConfig.primary}
          emissive={channelConfig.primary}
          emissiveIntensity={0.15}
          roughness={0.5}
          metalness={0.1}
        />
      </mesh>

      {/* Campaign Label */}
      <Html position={[0, 18, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="flex flex-col items-center gap-1">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border border-slate-200">
            <div className="text-sm font-bold text-slate-900 text-center max-w-[200px] truncate">
              {campaignName}
            </div>
            <div className="text-xs text-slate-500 text-center">
              {data.totalHcps.toLocaleString()} HCPs • {avgEngagement}% Avg Engagement
            </div>
          </div>
        </div>
      </Html>

      {/* Back button */}
      <Html position={[0, -20, 0]} center>
        <button
          onClick={safeClickHandler(onBack)}
          className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/95 backdrop-blur-sm shadow-md border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1.5 text-slate-600"
        >
          <span>←</span>
          <span>Back to {channelLabel}</span>
        </button>
      </Html>

      {/* Specialty Legend */}
      <Html position={[-70, 30, 0]} style={{ pointerEvents: 'auto' }}>
        <div className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-slate-200 max-h-[200px] overflow-y-auto">
          <div className="text-xs font-semibold text-slate-700 mb-2">Specialties</div>
          <div className="space-y-1">
            {specialtySummary.slice(0, 8).map(({ specialty, count, config }) => (
              <button
                key={specialty}
                onClick={safeClickHandler(() => setSelectedSpecialty(
                  selectedSpecialty === specialty ? null : specialty
                ))}
                className={cn(
                  'flex items-center gap-2 w-full px-2 py-1 rounded text-xs transition-colors',
                  selectedSpecialty === specialty
                    ? 'bg-slate-100'
                    : 'hover:bg-slate-50'
                )}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-slate-700 truncate flex-1 text-left">
                  {config.abbr}
                </span>
                <span className="text-slate-400">{count}</span>
              </button>
            ))}
          </div>
          {selectedSpecialty && (
            <button
              onClick={safeClickHandler(() => setSelectedSpecialty(null))}
              className="mt-2 text-[10px] text-indigo-600 hover:text-indigo-700"
            >
              Clear filter
            </button>
          )}
        </div>
      </Html>

      {/* HCP Nodes */}
      {data.hcps.map((hcp) => (
        <HCPNode
          key={hcp.id}
          hcpId={hcp.id}
          name={hcp.name}
          specialty={hcp.specialty}
          specialtyAbbr={hcp.specialtyAbbr}
          specialtyColor={hcp.specialtyColor}
          engagementScore={hcp.engagementScore}
          sparkline={hcp.sparkline}
          rxTrend={hcp.rxTrend}
          channelAffinity={hcp.channelAffinity}
          adoptionStage={hcp.adoptionStage}
          lastTouchDate={hcp.lastTouchDate}
          position={hcpPositions[hcp.id] || [0, 0, 0]}
          onSelect={onHCPSelect}
          isDimmed={selectedSpecialty !== null && hcp.specialty !== selectedSpecialty}
        />
      ))}

      {/* Specialty cluster labels */}
      {specialtySummary.slice(0, 8).map(({ specialty, config }, index) => {
        const angle = (index / Math.min(specialtySummary.length, 8)) * Math.PI * 2;
        const distance = 45;
        const x = Math.cos(angle) * (distance + 30);
        const z = Math.sin(angle) * (distance + 30);
        const y = (index % 2 === 0 ? 1 : -1) * 8;

        return (
          <Html
            key={specialty}
            position={[x, y, z]}
            center
            style={{ pointerEvents: 'none', opacity: selectedSpecialty && selectedSpecialty !== specialty ? 0.3 : 1 }}
          >
            <div
              className="px-2 py-1 rounded-full text-[10px] font-bold text-white shadow-sm"
              style={{ backgroundColor: config.color }}
            >
              {config.abbr}
            </div>
          </Html>
        );
      })}

      {/* Lighting */}
      <ambientLight intensity={0.7} />
      <pointLight position={[40, 40, 40]} intensity={0.6} />
      <pointLight position={[-40, -40, -40]} intensity={0.3} />
    </group>
  );
}

// Import cn utility
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
