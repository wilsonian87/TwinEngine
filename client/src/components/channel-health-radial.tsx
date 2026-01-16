import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Video, Globe, Calendar, Users } from "lucide-react";
import type { Channel } from "@shared/schema";
import type { ChannelHealth, HealthStatus } from "../../../server/services/channel-health";

/**
 * Channel Health Radial Visualization
 *
 * A hub-and-spoke radial diagram showing channel health for an HCP.
 * - HCP name at center
 * - 6 channels radiating outward
 * - Spoke thickness = engagement score
 * - Spoke color = health status
 * - Glow effect for opportunities
 */

interface ChannelHealthRadialProps {
  channelHealth: ChannelHealth[];
  hcpName?: string;
  size?: "sm" | "md" | "lg";
  showLegend?: boolean;
}

// Channel icons
const channelIcons: Record<Channel, typeof Mail> = {
  email: Mail,
  rep_visit: Users,
  webinar: Video,
  conference: Calendar,
  digital_ad: Globe,
  phone: Phone,
};

// Channel display names
const channelLabels: Record<Channel, string> = {
  email: "Email",
  rep_visit: "Rep Visit",
  webinar: "Webinar",
  conference: "Conference",
  digital_ad: "Digital",
  phone: "Phone",
};

// Health status colors
const statusColors: Record<HealthStatus, { stroke: string; fill: string; glow?: string }> = {
  active: { stroke: "#22c55e", fill: "#22c55e" }, // green-500
  declining: { stroke: "#eab308", fill: "#eab308" }, // yellow-500
  dark: { stroke: "#6b7280", fill: "#6b7280" }, // gray-500
  blocked: { stroke: "#ef4444", fill: "#ef4444" }, // red-500
  opportunity: { stroke: "#a855f7", fill: "#a855f7", glow: "rgba(168, 85, 247, 0.5)" }, // purple-500
};

// Status labels for badges
const statusLabels: Record<HealthStatus, string> = {
  active: "Active",
  declining: "Declining",
  dark: "Dark",
  blocked: "Blocked",
  opportunity: "Opportunity",
};

// Size configurations
const sizeConfig = {
  sm: { width: 200, height: 200, centerRadius: 30, maxSpokeLength: 55, strokeMax: 8, iconSize: 14 },
  md: { width: 280, height: 280, centerRadius: 40, maxSpokeLength: 80, strokeMax: 12, iconSize: 16 },
  lg: { width: 360, height: 360, centerRadius: 50, maxSpokeLength: 110, strokeMax: 16, iconSize: 20 },
};

// Calculate position on circle
function getPointOnCircle(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees - 90) * (Math.PI / 180);
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

export function ChannelHealthRadial({
  channelHealth,
  hcpName,
  size = "md",
  showLegend = true,
}: ChannelHealthRadialProps) {
  const config = sizeConfig[size];
  const centerX = config.width / 2;
  const centerY = config.height / 2;

  // Sort channels in consistent order
  const channelOrder: Channel[] = ["email", "rep_visit", "webinar", "conference", "digital_ad", "phone"];
  const sortedHealth = useMemo(() => {
    return channelOrder.map(
      (channel) => channelHealth.find((h) => h.channel === channel) || {
        channel,
        status: "dark" as HealthStatus,
        score: 0,
        lastContactDays: null,
        totalTouches: 0,
        responseRate: 0,
        reasoning: "No data available",
      }
    );
  }, [channelHealth]);

  // Calculate angle for each channel (60 degrees apart)
  const angleStep = 360 / 6;

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={config.width} height={config.height} className="overflow-visible">
        {/* Definitions for glow effects */}
        <defs>
          <filter id="opportunityGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background circle guides */}
        <circle
          cx={centerX}
          cy={centerY}
          r={config.centerRadius + config.maxSpokeLength * 0.5}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.1"
          strokeDasharray="4 4"
        />
        <circle
          cx={centerX}
          cy={centerY}
          r={config.centerRadius + config.maxSpokeLength}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.1"
          strokeDasharray="4 4"
        />

        {/* Channel spokes */}
        {sortedHealth.map((health, index) => {
          const angle = index * angleStep;
          const spokeLength = (health.score / 100) * config.maxSpokeLength;
          const strokeWidth = Math.max(2, (health.score / 100) * config.strokeMax);
          const colors = statusColors[health.status];
          const Icon = channelIcons[health.channel];

          const startPoint = getPointOnCircle(centerX, centerY, config.centerRadius, angle);
          const endPoint = getPointOnCircle(centerX, centerY, config.centerRadius + spokeLength, angle);
          const iconPoint = getPointOnCircle(centerX, centerY, config.centerRadius + config.maxSpokeLength + 15, angle);

          return (
            <Tooltip key={health.channel}>
              <TooltipTrigger asChild>
                <g className="cursor-pointer transition-opacity hover:opacity-80">
                  {/* Spoke line */}
                  <line
                    x1={startPoint.x}
                    y1={startPoint.y}
                    x2={endPoint.x}
                    y2={endPoint.y}
                    stroke={colors.stroke}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    filter={health.status === "opportunity" ? "url(#opportunityGlow)" : undefined}
                    opacity={health.status === "dark" ? 0.5 : 1}
                  />

                  {/* Score dot at end */}
                  <circle
                    cx={endPoint.x}
                    cy={endPoint.y}
                    r={strokeWidth / 2 + 2}
                    fill={colors.fill}
                    filter={health.status === "opportunity" ? "url(#opportunityGlow)" : undefined}
                  />

                  {/* Channel icon */}
                  <foreignObject
                    x={iconPoint.x - config.iconSize / 2}
                    y={iconPoint.y - config.iconSize / 2}
                    width={config.iconSize}
                    height={config.iconSize}
                  >
                    <div className="flex h-full w-full items-center justify-center">
                      <Icon
                        className="transition-colors"
                        style={{
                          width: config.iconSize,
                          height: config.iconSize,
                          color: colors.stroke,
                        }}
                      />
                    </div>
                  </foreignObject>
                </g>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px]">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-medium">{channelLabels[health.channel]}</span>
                    <Badge
                      variant={health.status === "opportunity" ? "default" : "secondary"}
                      className="text-xs"
                      style={{
                        backgroundColor:
                          health.status === "active"
                            ? "rgb(34 197 94 / 0.2)"
                            : health.status === "blocked"
                            ? "rgb(239 68 68 / 0.2)"
                            : health.status === "opportunity"
                            ? "rgb(168 85 247 / 0.2)"
                            : health.status === "declining"
                            ? "rgb(234 179 8 / 0.2)"
                            : "rgb(107 114 128 / 0.2)",
                        color: colors.stroke,
                      }}
                    >
                      {statusLabels[health.status]}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span className="text-muted-foreground">Score:</span>
                    <span className="font-medium">{health.score}</span>
                    <span className="text-muted-foreground">Response:</span>
                    <span className="font-medium">{health.responseRate}%</span>
                    <span className="text-muted-foreground">Touches:</span>
                    <span className="font-medium">{health.totalTouches}</span>
                    <span className="text-muted-foreground">Last Contact:</span>
                    <span className="font-medium">
                      {health.lastContactDays !== null ? `${health.lastContactDays}d ago` : "Never"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground border-t pt-2">{health.reasoning}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Center hub */}
        <circle cx={centerX} cy={centerY} r={config.centerRadius} className="fill-background stroke-border" strokeWidth="2" />

        {/* Center text */}
        {hcpName && (
          <text
            x={centerX}
            y={centerY}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-foreground text-xs font-medium"
          >
            {hcpName.length > 10 ? hcpName.substring(0, 10) + "..." : hcpName}
          </text>
        )}
      </svg>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap justify-center gap-3 text-xs">
          {(Object.entries(statusColors) as [HealthStatus, typeof statusColors.active][]).map(([status, colors]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: colors.fill,
                  boxShadow: status === "opportunity" ? `0 0 6px ${colors.glow}` : undefined,
                }}
              />
              <span className="text-muted-foreground">{statusLabels[status]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for card displays
 */
export function ChannelHealthBadges({ channelHealth }: { channelHealth: ChannelHealth[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {channelHealth.map((health) => {
        const colors = statusColors[health.status];
        const Icon = channelIcons[health.channel];
        return (
          <Tooltip key={health.channel}>
            <TooltipTrigger asChild>
              <div
                className="flex h-6 w-6 items-center justify-center rounded-md transition-colors"
                style={{
                  backgroundColor: `${colors.fill}20`,
                  color: colors.fill,
                }}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p className="font-medium">{channelLabels[health.channel]}</p>
              <p className="text-muted-foreground">{statusLabels[health.status]} • Score: {health.score}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
