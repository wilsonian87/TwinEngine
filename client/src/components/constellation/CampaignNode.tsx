/**
 * CampaignNode - Campaign sphere in L2 Campaign Orbit view
 *
 * Phase 11C: Campaigns orbit around the channel nucleus, colored by
 * primary messaging theme, sized by HCP reach.
 */

import { useState, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { cn } from '@/lib/utils';

interface CampaignNodeProps {
  campaignId: string;
  name: string;
  brand: string | null;
  therapeuticArea: string | null;
  hcpReach: number;
  primaryTheme: string | null;
  primaryThemeColor: string | null;
  secondaryTheme: string | null;
  kpis: Record<string, number>;
  position: [number, number, number];
  onSelect: (campaignId: string) => void;
  isHighlighted?: boolean;
  isDimmed?: boolean;
}

export function CampaignNode({
  campaignId,
  name,
  brand,
  therapeuticArea,
  hcpReach,
  primaryTheme,
  primaryThemeColor,
  secondaryTheme,
  kpis,
  position,
  onSelect,
  isHighlighted = false,
  isDimmed = false,
}: CampaignNodeProps) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  // Size based on HCP reach (normalized)
  const radius = useMemo(() => {
    const minRadius = 4;
    const maxRadius = 12;
    const normalized = Math.min(hcpReach / 1000, 1);
    return minRadius + (maxRadius - minRadius) * Math.sqrt(normalized);
  }, [hcpReach]);

  // Color from primary theme or default
  const color = primaryThemeColor || '#64748B';

  // Animate glow on hover
  useFrame((state) => {
    if (glowRef.current && (hovered || isHighlighted)) {
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.1 + 1.0;
      glowRef.current.scale.setScalar(pulse);
    }
  });

  // Opacity based on dimmed state
  const opacity = isDimmed ? 0.25 : 1;

  return (
    <group position={position}>
      {/* Main campaign sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          try {
            onSelect(campaignId);
          } catch (error) {
            console.error('[CampaignNode] Click handler error:', error);
          }
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[radius, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered || isHighlighted ? 0.5 : 0.15}
          transparent
          opacity={opacity}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      {/* Glow sphere */}
      {(hovered || isHighlighted) && !isDimmed && (
        <mesh ref={glowRef} scale={1.2}>
          <sphereGeometry args={[radius, 24, 24]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.2}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Campaign label */}
      <Html
        position={[0, radius + 6, 0]}
        center
        style={{
          pointerEvents: isDimmed ? 'none' : 'auto',
          opacity,
          transition: 'opacity 0.3s ease',
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            try {
              onSelect(campaignId);
            } catch (error) {
              console.error('[CampaignNode] Label click error:', error);
            }
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={cn(
            'px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200',
            'bg-white/95 backdrop-blur-sm shadow-md border-2 max-w-[140px]',
            'hover:shadow-lg hover:scale-105',
            hovered || isHighlighted
              ? 'border-current scale-105'
              : 'border-transparent'
          )}
          style={{ borderColor: hovered || isHighlighted ? color : 'transparent' }}
        >
          <div className="truncate text-slate-900">{name}</div>
          {primaryTheme && (
            <div
              className="text-[10px] truncate mt-0.5"
              style={{ color }}
            >
              {primaryTheme}
            </div>
          )}
        </button>
      </Html>

      {/* Hover tooltip with KPIs */}
      {hovered && !isDimmed && (
        <Html
          position={[0, -radius - 8, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-slate-200 text-xs min-w-[180px]">
            {/* Header */}
            <div className="mb-2 pb-2 border-b border-slate-100">
              <div className="font-semibold text-slate-900 truncate">{name}</div>
              <div className="flex items-center gap-2 text-slate-500">
                {brand && <span>{brand}</span>}
                {therapeuticArea && (
                  <>
                    <span>•</span>
                    <span>{therapeuticArea}</span>
                  </>
                )}
              </div>
            </div>

            {/* KPIs */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">HCP Reach</span>
                <span className="font-medium text-slate-900">
                  {hcpReach.toLocaleString()}
                </span>
              </div>
              {Object.entries(kpis).slice(0, 3).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-slate-500 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className="font-medium text-slate-900">
                    {formatKpiValue(key, value)}
                  </span>
                </div>
              ))}
            </div>

            {/* Themes */}
            <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
              {primaryTheme && (
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                  style={{ backgroundColor: `${color}20`, color }}
                >
                  {primaryTheme}
                </span>
              )}
              {secondaryTheme && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                  {secondaryTheme}
                </span>
              )}
            </div>

            {/* CTA */}
            <div className="mt-2 pt-2 border-t border-slate-100 text-slate-400 text-center">
              Click to view HCPs →
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

function formatKpiValue(key: string, value: number): string {
  // Format based on KPI type
  if (key.includes('Rate') || key.includes('Percent') || key.includes('Index')) {
    return `${Math.round(value * 100)}%`;
  }
  if (key.includes('cost') || key.includes('Cost')) {
    return `$${value.toFixed(2)}`;
  }
  if (Number.isInteger(value)) {
    return value.toLocaleString();
  }
  return value.toFixed(1);
}
