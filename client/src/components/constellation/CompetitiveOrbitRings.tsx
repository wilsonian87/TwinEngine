/**
 * CompetitiveOrbitRings - Outer gravity rings showing competitive pressure
 *
 * Phase 12A: Competitors rendered as concentric rings outside the HCP solar system.
 * Ring distance from center = competitive pressure (closer = more pressure)
 * Ring thickness = competitor market share
 * Ring color = competitor identity
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Ring } from '@react-three/drei';
import * as THREE from 'three';
import { cn } from '@/lib/utils';
import type { CompetitiveOrbitData } from '@shared/schema';

// WCAG 2.1 AA compliant colors with good contrast
export const COMPETITOR_COLORS = {
  accessible: [
    '#E63946', // Crimson Red
    '#457B9D', // Steel Blue
    '#2A9D8F', // Persian Green
    '#E9C46A', // Maize Yellow
    '#F4A261', // Sandy Brown
    '#264653', // Charcoal
    '#6D6875', // Old Lavender
    '#9B2335', // Jester Red
  ],
  // High contrast alternative for colorblind users
  highContrast: [
    '#000000', // Black
    '#0072B2', // Blue
    '#D55E00', // Vermillion
    '#CC79A7', // Reddish Purple
    '#009E73', // Bluish Green
    '#F0E442', // Yellow
    '#56B4E9', // Sky Blue
    '#E69F00', // Orange
  ],
};

interface CompetitorRingProps {
  id: string;
  name: string;
  color: string;
  avgCpi: number;
  affectedHcpCount: number;
  ringDistance: number;
  ringThickness: number;
  marketShare: number;
  isSelected: boolean;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

function CompetitorRing({
  id,
  name,
  color,
  avgCpi,
  affectedHcpCount,
  ringDistance,
  ringThickness,
  marketShare,
  isSelected,
  isHovered,
  onHover,
  onSelect,
}: CompetitorRingProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Base distance: channel planets are at ~70-130 units
  // Competitive rings start at ~150 units outward
  const baseDistance = 150;
  const distanceMultiplier = 100;

  // Inner radius based on competitive pressure
  // Higher CPI = closer to center (more pressure)
  const innerRadius = baseDistance + (1 - ringDistance) * distanceMultiplier;

  // Outer radius based on market share / thickness
  const outerRadius = innerRadius + ringThickness * 8;

  // Animate ring opacity
  const [opacity, setOpacity] = useState(0.5);

  useFrame((state) => {
    if (meshRef.current) {
      // Subtle rotation animation
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.02;

      // Pulse effect when hovered or selected
      if (isHovered || isSelected) {
        const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.1 + 0.8;
        setOpacity(pulse);
      } else {
        setOpacity(0.5);
      }
    }
  });

  // Convert hex color to THREE.Color
  const threeColor = useMemo(() => new THREE.Color(color), [color]);

  return (
    <group>
      {/* Main ring */}
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerOver={() => onHover(id)}
        onPointerOut={() => onHover(null)}
        onClick={() => onSelect(id)}
      >
        <ringGeometry args={[innerRadius, outerRadius, 64]} />
        <meshStandardMaterial
          color={threeColor}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          emissive={threeColor}
          emissiveIntensity={isHovered || isSelected ? 0.3 : 0.1}
        />
      </mesh>

      {/* Outer glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[outerRadius, outerRadius + 2, 64]} />
        <meshBasicMaterial
          color={threeColor}
          transparent
          opacity={isHovered || isSelected ? 0.6 : 0.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Label (HTML overlay) - shows on hover */}
      {(isHovered || isSelected) && (
        <Html
          position={[innerRadius + (outerRadius - innerRadius) / 2, 20, 0]}
          center
          distanceFactor={200}
        >
          <div
            className={cn(
              "px-3 py-2 rounded-lg shadow-lg border backdrop-blur-sm",
              "bg-white/95 border-slate-200",
              "pointer-events-none select-none",
              "animate-in fade-in zoom-in-95 duration-200"
            )}
            style={{ borderLeftColor: color, borderLeftWidth: 4 }}
          >
            <div className="text-sm font-semibold text-slate-900">{name}</div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-600">
              <span>CPI: <strong className="text-slate-900">{avgCpi.toFixed(0)}</strong></span>
              <span>Share: <strong className="text-slate-900">{marketShare.toFixed(1)}%</strong></span>
              <span>HCPs: <strong className="text-slate-900">{affectedHcpCount}</strong></span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

interface CompetitiveOrbitRingsProps {
  data: CompetitiveOrbitData | null;
  visible: boolean;
  selectedCompetitor: string | null;
  onCompetitorSelect: (id: string | null) => void;
  highlightedHcpIds?: Set<string>;
}

export function CompetitiveOrbitRings({
  data,
  visible,
  selectedCompetitor,
  onCompetitorSelect,
  highlightedHcpIds,
}: CompetitiveOrbitRingsProps) {
  const [hoveredCompetitor, setHoveredCompetitor] = useState<string | null>(null);

  // Don't render if not visible or no data
  if (!visible || !data || data.competitors.length === 0) {
    return null;
  }

  return (
    <group>
      {/* Competitor rings */}
      {data.competitors.map((competitor) => (
        <CompetitorRing
          key={competitor.id}
          id={competitor.id}
          name={competitor.name}
          color={competitor.color}
          avgCpi={competitor.avgCpi}
          affectedHcpCount={competitor.affectedHcpCount}
          ringDistance={competitor.ringDistance}
          ringThickness={competitor.ringThickness}
          marketShare={competitor.marketShare}
          isSelected={selectedCompetitor === competitor.id}
          isHovered={hoveredCompetitor === competitor.id}
          onHover={setHoveredCompetitor}
          onSelect={onCompetitorSelect}
        />
      ))}

      {/* Drift vectors - subtle lines showing HCP drift toward competitor */}
      {/* Only show for selected competitor */}
      {selectedCompetitor && data.hcpDriftVectors
        .filter(v => v.competitorId === selectedCompetitor && v.driftStrength > 0.5)
        .slice(0, 50) // Limit for performance
        .map((vector, i) => {
          const competitor = data.competitors.find(c => c.id === vector.competitorId);
          if (!competitor) return null;

          // Calculate ring position
          const baseDistance = 150;
          const distanceMultiplier = 100;
          const innerRadius = baseDistance + (1 - competitor.ringDistance) * distanceMultiplier;

          // Random angle for the drift line
          const angle = (i / 50) * Math.PI * 2 + Math.random() * 0.2;
          const startRadius = 70; // Near HCP nucleus
          const endRadius = innerRadius - 10;

          const start = new THREE.Vector3(
            Math.cos(angle) * startRadius,
            0,
            Math.sin(angle) * startRadius
          );
          const end = new THREE.Vector3(
            Math.cos(angle) * endRadius,
            0,
            Math.sin(angle) * endRadius
          );

          return (
            <line key={`drift-${vector.hcpId}-${i}`}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([
                    start.x, start.y, start.z,
                    end.x, end.y, end.z,
                  ])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial
                color={competitor.color}
                transparent
                opacity={vector.driftStrength * 0.3}
                linewidth={1}
              />
            </line>
          );
        })}
    </group>
  );
}

/**
 * Summary panel showing competitive pressure overview
 */
interface CompetitiveSummaryPanelProps {
  data: CompetitiveOrbitData | null;
  visible: boolean;
}

export function CompetitiveSummaryPanel({ data, visible }: CompetitiveSummaryPanelProps) {
  if (!visible || !data) return null;

  const { summary } = data;

  // Determine overall risk level
  const getRiskColor = (cpi: number) => {
    if (cpi <= 25) return 'text-green-600 bg-green-50';
    if (cpi <= 50) return 'text-yellow-600 bg-yellow-50';
    if (cpi <= 75) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getRiskLabel = (cpi: number) => {
    if (cpi <= 25) return 'Low';
    if (cpi <= 50) return 'Medium';
    if (cpi <= 75) return 'High';
    return 'Critical';
  };

  return (
    <div className="absolute bottom-4 left-4 z-30 bg-white/95 backdrop-blur-sm rounded-lg border border-slate-200 shadow-lg p-4 w-72">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">Competitive Pressure</h3>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="text-center p-2 rounded bg-slate-50">
          <div className="text-2xl font-bold text-slate-900">{summary.avgOverallCpi.toFixed(0)}</div>
          <div className="text-xs text-slate-500">Avg CPI</div>
        </div>
        <div className="text-center p-2 rounded bg-slate-50">
          <div className="text-2xl font-bold text-slate-900">{summary.totalHcpsUnderPressure}</div>
          <div className="text-xs text-slate-500">HCPs at Risk</div>
        </div>
      </div>

      <div className={cn(
        "text-center py-2 px-3 rounded text-sm font-medium",
        getRiskColor(summary.avgOverallCpi)
      )}>
        Overall Risk: {getRiskLabel(summary.avgOverallCpi)}
      </div>

      {summary.highestPressureCompetitor && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <div className="text-xs text-slate-500">Highest Pressure</div>
          <div className="text-sm font-medium text-slate-900">{summary.highestPressureCompetitor}</div>
        </div>
      )}
    </div>
  );
}
