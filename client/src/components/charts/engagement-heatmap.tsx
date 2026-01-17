/**
 * EngagementHeatmap Component
 *
 * Brand-styled heatmap for visualizing engagement across HCPs and channels.
 * Uses CSS Grid with staggered entrance animations.
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9A.5
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CHART_THEME } from '@/lib/chart-theme';
import { BRAND_CONFIG } from '@/lib/brand-config';
import { gridStaggerDelay } from '@/lib/chart-animations';
import { MOTION_DURATION, MOTION_EASING } from '@/lib/motion-config';

// ============================================================================
// TYPES
// ============================================================================

export interface HeatmapDataPoint {
  /** Row identifier (e.g., HCP ID) */
  rowId: string;
  /** Row label (e.g., HCP name) */
  rowLabel?: string;
  /** Column identifier (e.g., channel) */
  columnId: string;
  /** Column label (e.g., channel name) */
  columnLabel?: string;
  /** Engagement score (0-100) */
  score: number;
  /** Optional metadata for tooltip */
  metadata?: Record<string, string | number>;
}

export interface EngagementHeatmapProps {
  /** Heatmap data points */
  data: HeatmapDataPoint[];
  /** Available channels (column headers) */
  channels: string[];
  /** Click handler for cells */
  onCellClick?: (rowId: string, columnId: string, score: number) => void;
  /** Maximum value for color scale (default 100) */
  maxValue?: number;
  /** Whether to animate on mount */
  animate?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Cell size in pixels */
  cellSize?: number;
  /** Whether to show row labels */
  showRowLabels?: boolean;
  /** Whether to show column labels */
  showColumnLabels?: boolean;
  /** Maximum rows to display (for virtualization hint) */
  maxRows?: number;
}

// ============================================================================
// COLOR SCALE
// ============================================================================

function getHeatmapColor(value: number, maxValue: number = 100): string {
  const normalized = Math.min(value / maxValue, 1);

  // Brand color scale: Void Black → Purple → Gold
  if (normalized < 0.2) {
    return 'rgba(10, 10, 11, 0.9)';                      // Very low
  }
  if (normalized < 0.35) {
    return 'rgba(107, 33, 168, 0.3)';                    // Low purple
  }
  if (normalized < 0.5) {
    return 'rgba(107, 33, 168, 0.5)';                    // Medium-low purple
  }
  if (normalized < 0.65) {
    return 'rgba(107, 33, 168, 0.7)';                    // Medium purple
  }
  if (normalized < 0.8) {
    return 'rgba(168, 85, 247, 0.8)';                    // Process violet
  }
  if (normalized < 0.9) {
    return 'rgba(192, 132, 252, 0.85)';                  // Light violet
  }
  return 'rgba(217, 119, 6, 0.9)';                       // Catalyst gold (high)
}

// ============================================================================
// CELL COMPONENT
// ============================================================================

interface HeatmapCellProps {
  rowId: string;
  columnId: string;
  score: number;
  maxValue: number;
  rowIndex: number;
  colIndex: number;
  size: number;
  animate: boolean;
  onClick?: (rowId: string, columnId: string, score: number) => void;
  metadata?: Record<string, string | number>;
}

const HeatmapCell: React.FC<HeatmapCellProps> = ({
  rowId,
  columnId,
  score,
  maxValue,
  rowIndex,
  colIndex,
  size,
  animate,
  onClick,
  metadata,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const color = getHeatmapColor(score, maxValue);
  const delay = gridStaggerDelay(rowIndex, colIndex, 1, 0.02);

  return (
    <motion.div
      className={cn(
        'relative cursor-pointer transition-all duration-150',
        onClick && 'hover:ring-2 hover:ring-process-violet/50'
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: 4,
      }}
      initial={animate ? { opacity: 0, scale: 0.8 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: MOTION_DURATION.ui,
        delay: animate ? delay : 0,
        ease: MOTION_EASING.out,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick?.(rowId, columnId, score)}
      role="gridcell"
      aria-label={`${columnId}: ${score}`}
    >
      {/* Hover glow effect */}
      {isHovered && (
        <motion.div
          className="absolute inset-0 rounded"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            boxShadow: `0 0 16px 4px ${score > maxValue * 0.8 ? BRAND_CONFIG.colors.catalystGold : BRAND_CONFIG.colors.processViolet}40`,
          }}
        />
      )}

      {/* Tooltip */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
          >
            <div
              className="px-3 py-2 rounded-lg text-xs whitespace-nowrap"
              style={{
                background: 'rgba(10, 10, 11, 0.95)',
                border: `1px solid ${BRAND_CONFIG.colors.borderGray}`,
                backdropFilter: 'blur(8px)',
              }}
            >
              <div className="font-medium text-signal-white">{columnId}</div>
              <div className="text-data-gray">
                Score: <span className="text-process-violet font-semibold">{score}</span>
              </div>
              {metadata && Object.entries(metadata).map(([key, value]) => (
                <div key={key} className="text-muted-gray">
                  {key}: {value}
                </div>
              ))}
            </div>
            {/* Tooltip arrow */}
            <div
              className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 rotate-45"
              style={{
                background: 'rgba(10, 10, 11, 0.95)',
                borderRight: `1px solid ${BRAND_CONFIG.colors.borderGray}`,
                borderBottom: `1px solid ${BRAND_CONFIG.colors.borderGray}`,
                marginTop: -4,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============================================================================
// LEGEND COMPONENT
// ============================================================================

interface HeatmapLegendProps {
  maxValue: number;
}

const HeatmapLegend: React.FC<HeatmapLegendProps> = ({ maxValue }) => {
  const steps = [0, 25, 50, 75, 100].map((pct) => ({
    value: Math.round((pct / 100) * maxValue),
    color: getHeatmapColor((pct / 100) * maxValue, maxValue),
  }));

  return (
    <div className="flex items-center gap-3 mt-4">
      <span className="text-xs text-data-gray">Low</span>
      <div className="flex gap-1">
        {steps.map((step, i) => (
          <div
            key={i}
            className="w-6 h-4 rounded"
            style={{ backgroundColor: step.color }}
            title={String(step.value)}
          />
        ))}
      </div>
      <span className="text-xs text-data-gray">High</span>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const EngagementHeatmap: React.FC<EngagementHeatmapProps> = ({
  data,
  channels,
  onCellClick,
  maxValue = 100,
  animate = true,
  className,
  cellSize = 40,
  showRowLabels = true,
  showColumnLabels = true,
  maxRows,
}) => {
  // Group data by row
  const rows = useMemo(() => {
    const rowMap = new Map<string, { label: string; cells: Map<string, HeatmapDataPoint> }>();

    data.forEach((point) => {
      if (!rowMap.has(point.rowId)) {
        rowMap.set(point.rowId, {
          label: point.rowLabel || point.rowId,
          cells: new Map(),
        });
      }
      rowMap.get(point.rowId)!.cells.set(point.columnId, point);
    });

    let rowsArray = Array.from(rowMap.entries());

    // Apply maxRows limit if specified
    if (maxRows && rowsArray.length > maxRows) {
      rowsArray = rowsArray.slice(0, maxRows);
    }

    return rowsArray;
  }, [data, maxRows]);

  const gridTemplateColumns = showRowLabels
    ? `120px repeat(${channels.length}, ${cellSize}px)`
    : `repeat(${channels.length}, ${cellSize}px)`;

  return (
    <div className={cn('overflow-auto', className)}>
      {/* Column headers */}
      {showColumnLabels && (
        <div
          className="grid gap-1 mb-2"
          style={{
            gridTemplateColumns,
          }}
        >
          {showRowLabels && <div />}
          {channels.map((channel) => (
            <div
              key={channel}
              className="text-xs font-medium text-data-gray text-center truncate"
              style={{ width: cellSize }}
              title={channel}
            >
              {channel.substring(0, 6)}
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="space-y-1">
        {rows.map(([rowId, row], rowIndex) => (
          <div
            key={rowId}
            className="grid gap-1 items-center"
            style={{ gridTemplateColumns }}
            role="row"
          >
            {/* Row label */}
            {showRowLabels && (
              <div
                className="text-xs text-data-gray truncate pr-2"
                title={row.label}
              >
                {row.label}
              </div>
            )}

            {/* Cells */}
            {channels.map((channel, colIndex) => {
              const cellData = row.cells.get(channel);
              const score = cellData?.score ?? 0;

              return (
                <HeatmapCell
                  key={`${rowId}-${channel}`}
                  rowId={rowId}
                  columnId={channel}
                  score={score}
                  maxValue={maxValue}
                  rowIndex={rowIndex}
                  colIndex={colIndex}
                  size={cellSize}
                  animate={animate}
                  onClick={onCellClick}
                  metadata={cellData?.metadata}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <HeatmapLegend maxValue={maxValue} />

      {/* Truncation notice */}
      {maxRows && data.length > maxRows * channels.length && (
        <div className="text-xs text-muted-gray mt-2">
          Showing {maxRows} of {Math.ceil(data.length / channels.length)} rows
        </div>
      )}
    </div>
  );
};

// ============================================================================
// VARIANTS
// ============================================================================

/**
 * Compact heatmap for dashboard widgets
 */
export const CompactHeatmap: React.FC<Omit<EngagementHeatmapProps, 'cellSize' | 'showRowLabels'>> = (
  props
) => (
  <EngagementHeatmap
    {...props}
    cellSize={24}
    showRowLabels={false}
  />
);

/**
 * Channel engagement heatmap (pre-configured for channel data)
 */
export const ChannelHeatmap: React.FC<{
  data: Array<{
    hcpId: string;
    hcpName?: string;
    channelScores: Record<string, number>;
  }>;
  onCellClick?: (hcpId: string, channel: string, score: number) => void;
  className?: string;
}> = ({ data, onCellClick, className }) => {
  // Extract unique channels
  const channels = useMemo(() => {
    const channelSet = new Set<string>();
    data.forEach((hcp) => {
      Object.keys(hcp.channelScores).forEach((ch) => channelSet.add(ch));
    });
    return Array.from(channelSet);
  }, [data]);

  // Convert to heatmap data format
  const heatmapData = useMemo(() => {
    return data.flatMap((hcp) =>
      Object.entries(hcp.channelScores).map(([channel, score]) => ({
        rowId: hcp.hcpId,
        rowLabel: hcp.hcpName,
        columnId: channel,
        score,
      }))
    );
  }, [data]);

  return (
    <EngagementHeatmap
      data={heatmapData}
      channels={channels}
      onCellClick={onCellClick}
      className={className}
    />
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default EngagementHeatmap;
