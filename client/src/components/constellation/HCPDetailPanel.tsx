/**
 * HCPDetailPanel - Glassmorphic HCP Detail Sidebar
 *
 * Shows detailed information about hovered HCP node.
 * Features smooth enter/exit animations and glassmorphic styling.
 *
 * Phase 12A: Added Competitive Exposure section.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useConstellationStore } from '@/stores/constellationStore';
import { cn } from '@/lib/utils';
import { User, Activity, Radio, TrendingUp, TrendingDown, Minus, Target, Shield, AlertTriangle } from 'lucide-react';
import type { HcpCompetitiveSummary } from '@shared/schema';

export function HCPDetailPanel() {
  const hoveredNodeId = useConstellationStore((s) => s.hoveredNodeId);
  const nodes = useConstellationStore((s) => s.nodes);
  const hoveredNode = nodes.find(n => n.id === hoveredNodeId);

  // Phase 12A: Fetch competitive summary for hovered HCP
  const { data: competitiveSummary } = useQuery<HcpCompetitiveSummary | null>({
    queryKey: ['competitive-summary', hoveredNodeId],
    queryFn: async () => {
      if (!hoveredNodeId) return null;
      const res = await fetch(`/api/hcps/${hoveredNodeId}/competitive-summary`, {
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.summary ?? null;
    },
    enabled: !!hoveredNodeId && hoveredNode?.type === 'hcp',
    staleTime: 30000, // Cache for 30 seconds
  });

  // Light theme status config
  const statusConfig = {
    healthy: {
      color: 'text-green-700',
      bg: 'bg-green-50',
      border: 'border-green-200',
      glow: 'shadow-green-100',
      icon: TrendingUp,
      label: 'Healthy',
    },
    warning: {
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      glow: 'shadow-amber-100',
      icon: Minus,
      label: 'Warning',
    },
    critical: {
      color: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-200',
      glow: 'shadow-red-100',
      icon: TrendingDown,
      label: 'Critical',
    },
  };

  const channelLabels: Record<string, string> = {
    webinar: 'Webinars & Conferences',
    email: 'Email / Digital',
    field: 'Field Force / MSLs',
  };

  const channelIcons: Record<string, typeof Radio> = {
    webinar: Radio,
    email: Activity,
    field: User,
  };

  return (
    <AnimatePresence>
      {hoveredNode && hoveredNode.type === 'hcp' && (
        <motion.div
          initial={{ opacity: 0, x: 20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={cn(
            "absolute top-20 right-4 w-80 rounded-xl z-30",
            "bg-white/95 backdrop-blur-xl border border-slate-200",
            "shadow-xl shadow-slate-200/50",
            statusConfig[hoveredNode.status].glow
          )}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  statusConfig[hoveredNode.status].bg,
                  statusConfig[hoveredNode.status].border,
                  "border"
                )}>
                  <User className={cn("w-5 h-5", statusConfig[hoveredNode.status].color)} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{hoveredNode.label}</h3>
                  <p className="text-sm text-slate-500">{hoveredNode.specialty}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Status</span>
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                  statusConfig[hoveredNode.status].bg,
                  statusConfig[hoveredNode.status].color
                )}
              >
                {(() => {
                  const Icon = statusConfig[hoveredNode.status].icon;
                  return <Icon className="w-3 h-3" />;
                })()}
                <span>{statusConfig[hoveredNode.status].label}</span>
              </motion.div>
            </div>
          </div>

          {/* Metrics */}
          <div className="p-4 space-y-4">
            {/* Engagement Score */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 uppercase tracking-wider">
                  Engagement Score
                </span>
                <span className={cn(
                  "text-sm font-semibold tabular-nums",
                  statusConfig[hoveredNode.status].color
                )}>
                  {Math.round(hoveredNode.engagementScore * 100)}%
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${hoveredNode.engagementScore * 100}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={cn(
                    "h-full rounded-full",
                    hoveredNode.status === 'healthy' ? 'bg-gradient-to-r from-green-500 to-green-400' :
                    hoveredNode.status === 'warning' ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                    'bg-gradient-to-r from-red-500 to-red-400'
                  )}
                />
              </div>
            </div>

            {/* Primary Channel */}
            {hoveredNode.channel && (
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block mb-2">
                  Primary Channel
                </span>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                  {(() => {
                    const Icon = channelIcons[hoveredNode.channel] || Radio;
                    return <Icon className="w-4 h-4 text-slate-500" />;
                  })()}
                  <span className="text-sm text-slate-700">
                    {channelLabels[hoveredNode.channel] || hoveredNode.channel}
                  </span>
                </div>
              </div>
            )}

            {/* Phase 12A: Competitive Exposure Section */}
            {competitiveSummary && competitiveSummary.signals.length > 0 && (
              <CompetitiveExposureSection summary={competitiveSummary} />
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 rounded-b-xl">
            <p className="text-xs text-slate-400 font-mono">
              ID: {hoveredNode.id}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Phase 12A: Competitive Exposure Section Component
// ============================================================================

interface CompetitiveExposureSectionProps {
  summary: HcpCompetitiveSummary;
}

const riskLevelConfig = {
  low: {
    color: 'text-sky-700',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    label: 'Low Risk',
    icon: Shield,
  },
  medium: {
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    label: 'Medium Risk',
    icon: AlertTriangle,
  },
  high: {
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    label: 'High Risk',
    icon: AlertTriangle,
  },
  critical: {
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    label: 'Critical',
    icon: Target,
  },
};

function CompetitiveExposureSection({ summary }: CompetitiveExposureSectionProps) {
  const config = riskLevelConfig[summary.riskLevel];
  const RiskIcon = config.icon;

  return (
    <div className="pt-2 border-t border-slate-100">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-rose-600" />
        <span className="text-xs text-slate-500 uppercase tracking-wider">
          Competitive Exposure
        </span>
      </div>

      {/* CPI Score */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-500">CPI Score</span>
          <span className={cn("text-sm font-semibold tabular-nums", config.color)}>
            {summary.overallCpi.toFixed(0)}
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, summary.overallCpi)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={cn(
              "h-full rounded-full",
              summary.riskLevel === 'low' ? 'bg-gradient-to-r from-sky-500 to-sky-400' :
              summary.riskLevel === 'medium' ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
              summary.riskLevel === 'high' ? 'bg-gradient-to-r from-orange-500 to-orange-400' :
              'bg-gradient-to-r from-red-500 to-red-400'
            )}
          />
        </div>
      </div>

      {/* Risk Level Badge */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500">Risk Level</span>
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
            config.bg,
            config.color
          )}
        >
          <RiskIcon className="w-3 h-3" />
          <span>{config.label}</span>
        </motion.div>
      </div>

      {/* Top Competitor */}
      {summary.topCompetitor && (
        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: summary.topCompetitor.color ?? '#6B7280' }}
              />
              <span className="text-xs text-slate-600 font-medium">
                {summary.topCompetitor.name}
              </span>
            </div>
            <span className={cn(
              "text-xs font-semibold tabular-nums",
              summary.topCompetitor.cpi >= 75 ? 'text-red-600' :
              summary.topCompetitor.cpi >= 50 ? 'text-orange-600' :
              summary.topCompetitor.cpi >= 25 ? 'text-amber-600' :
              'text-slate-500'
            )}>
              CPI: {summary.topCompetitor.cpi.toFixed(0)}
            </span>
          </div>
        </div>
      )}

      {/* Competitor Count */}
      <div className="flex items-center justify-between mt-2 text-xs">
        <span className="text-slate-400">Active competitors</span>
        <span className="text-slate-600 font-medium">{summary.competitorCount}</span>
      </div>
    </div>
  );
}
