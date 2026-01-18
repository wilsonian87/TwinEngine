/**
 * HCPNode - Individual HCP node in L3 Constellation view
 *
 * Phase 11D: HCPs displayed with specialty-colored nodes,
 * engagement sparklines, Rx trend indicators, and adoption stage badges.
 */

import { useState, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface HCPNodeProps {
  hcpId: string;
  name: string;
  specialty: string;
  specialtyAbbr: string;
  specialtyColor: string;
  engagementScore: number;
  sparkline: number[];
  rxTrend: 'up' | 'down' | 'flat';
  channelAffinity: string;
  adoptionStage: 'Aware' | 'Trial' | 'Regular';
  lastTouchDate: string;
  position: [number, number, number];
  onSelect?: (hcpId: string) => void;
  isHighlighted?: boolean;
  isDimmed?: boolean;
}

const ADOPTION_STAGE_COLORS = {
  Aware: { bg: '#fef3c7', text: '#92400e' },    // amber
  Trial: { bg: '#dbeafe', text: '#1e40af' },    // blue
  Regular: { bg: '#dcfce7', text: '#166534' },  // green
};

export function HCPNode({
  hcpId,
  name,
  specialty,
  specialtyAbbr,
  specialtyColor,
  engagementScore,
  sparkline,
  rxTrend,
  channelAffinity,
  adoptionStage,
  lastTouchDate,
  position,
  onSelect,
  isHighlighted = false,
  isDimmed = false,
}: HCPNodeProps) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  // Size based on engagement score
  const radius = useMemo(() => {
    const minRadius = 1.5;
    const maxRadius = 4;
    const normalized = engagementScore / 100;
    return minRadius + (maxRadius - minRadius) * normalized;
  }, [engagementScore]);

  // Animate glow on hover/highlight
  useFrame((state) => {
    if (glowRef.current && (hovered || isHighlighted)) {
      const pulse = Math.sin(state.clock.elapsedTime * 4) * 0.15 + 1.0;
      glowRef.current.scale.setScalar(pulse);
    }
  });

  // Opacity based on dimmed state
  const opacity = isDimmed ? 0.2 : 1;

  // Trend icon
  const TrendIcon = rxTrend === 'up' ? TrendingUp : rxTrend === 'down' ? TrendingDown : Minus;
  const trendColor = rxTrend === 'up' ? '#22c55e' : rxTrend === 'down' ? '#ef4444' : '#64748b';

  return (
    <group position={position}>
      {/* Main HCP sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          try {
            onSelect?.(hcpId);
          } catch (error) {
            console.error('[HCPNode] Click handler error:', error);
          }
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = onSelect ? 'pointer' : 'default';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[radius, 16, 16]} />
        <meshStandardMaterial
          color={specialtyColor}
          emissive={specialtyColor}
          emissiveIntensity={hovered || isHighlighted ? 0.5 : 0.1}
          transparent
          opacity={opacity}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      {/* Glow sphere */}
      {(hovered || isHighlighted) && !isDimmed && (
        <mesh ref={glowRef} scale={1.3}>
          <sphereGeometry args={[radius, 16, 16]} />
          <meshBasicMaterial
            color={specialtyColor}
            transparent
            opacity={0.25}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Specialty abbreviation badge (always visible) */}
      {!isDimmed && (
        <Html
          position={[0, radius + 2, 0]}
          center
          style={{
            pointerEvents: 'none',
            opacity: hovered ? 0 : opacity * 0.9,
            transition: 'opacity 0.2s ease',
          }}
        >
          <div
            className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-sm"
            style={{ backgroundColor: specialtyColor }}
          >
            {specialtyAbbr}
          </div>
        </Html>
      )}

      {/* Hover tooltip with full details */}
      {hovered && !isDimmed && (
        <Html
          position={[0, radius + 8, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2.5 shadow-xl border border-slate-200 text-xs min-w-[200px]">
            {/* Header */}
            <div className="flex items-start gap-2 mb-2 pb-2 border-b border-slate-100">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                style={{ backgroundColor: specialtyColor }}
              >
                {specialtyAbbr}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 truncate">{name}</div>
                <div className="text-slate-500">{specialty}</div>
              </div>
            </div>

            {/* Engagement Score with Sparkline */}
            <div className="mb-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-500">Engagement</span>
                <span className="font-semibold text-slate-900">{engagementScore}%</span>
              </div>
              <Sparkline data={sparkline} color={specialtyColor} />
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <div className="text-slate-500">Rx Trend</div>
                <div className="flex items-center gap-1 font-medium" style={{ color: trendColor }}>
                  <TrendIcon className="w-3 h-3" />
                  <span className="capitalize">{rxTrend}</span>
                </div>
              </div>
              <div>
                <div className="text-slate-500">Affinity</div>
                <div className="font-medium text-slate-900">{channelAffinity}</div>
              </div>
            </div>

            {/* Adoption Stage & Last Touch */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{
                  backgroundColor: ADOPTION_STAGE_COLORS[adoptionStage].bg,
                  color: ADOPTION_STAGE_COLORS[adoptionStage].text,
                }}
              >
                {adoptionStage}
              </span>
              <span className="text-slate-400 text-[10px]">
                Last: {formatDate(lastTouchDate)}
              </span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * Mini sparkline component for engagement trend
 */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const width = 160;
  const height = 24;
  const padding = 2;

  const points = useMemo(() => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    return data.map((value, i) => {
      const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((value - min) / range) * (height - 2 * padding);
      return `${x},${y}`;
    }).join(' ');
  }, [data]);

  return (
    <svg width={width} height={height} className="block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Area fill */}
      <polygon
        points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
        fill={color}
        fillOpacity={0.1}
      />
    </svg>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}
