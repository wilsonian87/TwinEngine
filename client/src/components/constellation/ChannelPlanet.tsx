/**
 * ChannelPlanet - Orbiting channel node in L1 Solar System view
 *
 * Phase 11: Channels orbit the HCP nucleus, sized by reach and colored
 * by channel identity. Health is indicated via glow intensity.
 */

import { useState, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { cn } from '@/lib/utils';
import { getChannelConfig, getEngagementHealth, ENGAGEMENT_HEALTH_EFFECTS } from '@/lib/constellation/channelColors';
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

interface ChannelPlanetProps {
  channelId: string;
  label: string;
  hcpReach: number;
  avgEngagement: number;
  campaignCount: number;
  position: [number, number, number];
  onSelect: (channelId: string) => void;
  isHighlighted?: boolean;
  isDimmed?: boolean;
}

export function ChannelPlanet({
  channelId,
  label,
  hcpReach,
  avgEngagement,
  campaignCount,
  position,
  onSelect,
  isHighlighted = false,
  isDimmed = false,
}: ChannelPlanetProps) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const config = getChannelConfig(channelId);
  const health = getEngagementHealth(avgEngagement);
  const healthEffect = ENGAGEMENT_HEALTH_EFFECTS[health];

  // Size based on HCP reach (normalized)
  const radius = useMemo(() => {
    const minRadius = 8;
    const maxRadius = 20;
    const normalized = Math.min(hcpReach / 2000, 1);
    return minRadius + (maxRadius - minRadius) * normalized;
  }, [hcpReach]);

  // Glow intensity based on health
  const glowIntensity = useMemo(() => {
    const base = healthEffect.glowIntensity;
    return hovered || isHighlighted ? Math.min(base + 0.3, 1) : base;
  }, [healthEffect.glowIntensity, hovered, isHighlighted]);

  // Animate glow
  useFrame((state) => {
    if (glowRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.1 + 0.9;
      glowRef.current.scale.setScalar(pulse);
    }
  });

  // Get icon component
  const IconComponent = CHANNEL_ICONS[config.iconName] || Globe;

  // Opacity based on dimmed state
  const opacity = isDimmed ? 0.3 : 1;

  return (
    <group position={position}>
      {/* Main planet sphere */}
      <mesh
        ref={meshRef}
        onClick={() => onSelect(channelId)}
        onPointerOver={() => {
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={config.primary}
          emissive={config.primary}
          emissiveIntensity={hovered || isHighlighted ? 0.4 : 0.1}
          transparent
          opacity={opacity}
          roughness={0.4}
          metalness={0.2}
        />
      </mesh>

      {/* Glow sphere (outer) */}
      {glowIntensity > 0 && (
        <mesh ref={glowRef} scale={1.15}>
          <sphereGeometry args={[radius, 32, 32]} />
          <meshBasicMaterial
            color={config.glow}
            transparent
            opacity={glowIntensity * 0.2 * opacity}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Channel label button */}
      <Html
        position={[0, radius + 8, 0]}
        center
        style={{
          pointerEvents: isDimmed ? 'none' : 'auto',
          opacity,
          transition: 'opacity 0.3s ease',
        }}
      >
        <button
          onClick={() => onSelect(channelId)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
            'bg-white/95 backdrop-blur-sm shadow-md border-2',
            'hover:shadow-lg hover:scale-105',
            hovered || isHighlighted
              ? 'border-current scale-105'
              : 'border-transparent'
          )}
          style={{ color: config.label }}
        >
          <span className="flex items-center gap-2">
            <IconComponent className="w-4 h-4" />
            {label}
          </span>
        </button>
      </Html>

      {/* Metrics badge (on hover) */}
      {hovered && !isDimmed && (
        <Html
          position={[0, -radius - 10, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-slate-200 text-xs">
            <div className="flex items-center gap-3">
              <div>
                <div className="text-slate-500">Reach</div>
                <div className="font-semibold text-slate-900">
                  {hcpReach.toLocaleString()}
                </div>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div>
                <div className="text-slate-500">Campaigns</div>
                <div className="font-semibold text-slate-900">{campaignCount}</div>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div>
                <div className="text-slate-500">Engagement</div>
                <div
                  className="font-semibold"
                  style={{
                    color:
                      avgEngagement >= 70
                        ? '#22c55e'
                        : avgEngagement >= 50
                        ? '#f59e0b'
                        : '#ef4444',
                  }}
                >
                  {avgEngagement}%
                </div>
              </div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
