import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Shield,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  Pause,
  Target,
  Heart,
  Zap,
  Mail,
  Phone,
  Video,
  Calendar,
  Globe,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { useState } from "react";
import type { NBORecommendation } from "@shared/schema";

interface NBORecommendationCardProps {
  recommendation: NBORecommendation;
  onAccept?: (recommendation: NBORecommendation) => void;
  onDismiss?: (recommendation: NBORecommendation) => void;
  onHcpClick?: (hcpId: string) => void;
  showDetails?: boolean;
}

const actionTypeConfig: Record<string, { icon: React.ComponentType<any>; color: string; label: string; description: string }> = {
  engage: {
    icon: Zap,
    color: "bg-blue-500",
    label: "Engage",
    description: "Initiate or increase engagement with this HCP",
  },
  reinforce: {
    icon: TrendingUp,
    color: "bg-green-500",
    label: "Reinforce",
    description: "Continue building on positive engagement momentum",
  },
  defend: {
    icon: Shield,
    color: "bg-red-500",
    label: "Defend",
    description: "Counter competitive pressure with targeted outreach",
  },
  nurture: {
    icon: Heart,
    color: "bg-purple-500",
    label: "Nurture",
    description: "Maintain relationship with steady, value-added touchpoints",
  },
  expand: {
    icon: Users,
    color: "bg-cyan-500",
    label: "Expand",
    description: "Opportunity to explore additional channels",
  },
  pause: {
    icon: Pause,
    color: "bg-amber-500",
    label: "Pause",
    description: "Reduce messaging frequency to prevent fatigue",
  },
  reactivate: {
    icon: Target,
    color: "bg-amber-500",
    label: "Reactivate",
    description: "Re-establish connection with dormant HCP",
  },
};

const channelIcons: Record<string, React.ComponentType<any>> = {
  email: Mail,
  rep_visit: Users,
  webinar: Video,
  phone: Phone,
  conference: Calendar,
  digital_ad: Globe,
  social: MessageSquare,
};

const urgencyColors: Record<string, string> = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-green-100 text-green-800 border-green-200",
};

const confidenceColors: Record<string, string> = {
  high: "text-green-600",
  medium: "text-yellow-600",
  low: "text-red-600",
};

export function NBORecommendationCard({
  recommendation,
  onAccept,
  onDismiss,
  onHcpClick,
  showDetails = false,
}: NBORecommendationCardProps) {
  const [expanded, setExpanded] = useState(showDetails);

  const actionConfig = actionTypeConfig[recommendation.actionType] || actionTypeConfig.engage;
  const ActionIcon = actionConfig.icon;
  const ChannelIcon = channelIcons[recommendation.recommendedChannel] || Mail;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${actionConfig.color} text-white`}>
              <ActionIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle
                className={`text-lg ${onHcpClick ? 'cursor-pointer hover:text-primary transition-colors' : ''}`}
                onClick={() => onHcpClick?.(recommendation.hcpId)}
              >
                {recommendation.hcpName}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <span className="font-medium">{actionConfig.label}</span>
                <span className="text-gray-400">via</span>
                <span className="flex items-center gap-1">
                  <ChannelIcon className="h-4 w-4" />
                  {recommendation.recommendedChannel.replace("_", " ")}
                </span>
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className={urgencyColors[recommendation.urgency]}>
              {recommendation.urgency.toUpperCase()} PRIORITY
            </Badge>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger>
                  <span className={`text-sm font-semibold ${confidenceColors[recommendation.confidenceLevel]}`}>
                    {Math.round(recommendation.confidence * 100)}% confidence
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Recommendation confidence level: {recommendation.confidenceLevel}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {/* Rationale */}
        <p className="text-sm text-gray-600 mb-4">{recommendation.rationale}</p>

        {/* Key Factors */}
        {recommendation.keyFactors && recommendation.keyFactors.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {recommendation.keyFactors.slice(0, 3).map((factor, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {factor}
              </Badge>
            ))}
            {recommendation.keyFactors.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{recommendation.keyFactors.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Expected Impact */}
        {recommendation.expectedImpact && recommendation.expectedImpact.min != null && recommendation.expectedImpact.max != null && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Expected Impact</p>
            <p className="text-sm font-medium">{recommendation.expectedImpact.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <Progress
                value={(recommendation.expectedImpact.min + recommendation.expectedImpact.max) / 2}
                className="h-2 flex-1"
              />
              <span className="text-xs text-gray-500">
                {recommendation.expectedImpact.min}-{recommendation.expectedImpact.max}%
              </span>
            </div>
          </div>
        )}

        {/* Expandable Details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {expanded ? "Hide details" : "Show details"}
        </button>

        {expanded && (
          <div className="space-y-4 pt-2 border-t">
            {/* Component Scores */}
            {recommendation.componentScores && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  SIGNAL ANALYSIS
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { label: "Engagement", value: recommendation.componentScores.engagementScore },
                    { label: "Adoption", value: recommendation.componentScores.adoptionScore },
                    { label: "Channel", value: recommendation.componentScores.channelScore },
                    { label: "Saturation", value: recommendation.componentScores.saturationScore },
                    { label: "Competitive", value: recommendation.componentScores.competitiveScore },
                    { label: "Recency", value: recommendation.componentScores.recencyScore },
                  ].map((score) => (
                    <div key={score.label} className="text-center p-2 bg-gray-50 rounded">
                      <p className="text-xs text-gray-500">{score.label}</p>
                      <p className={`text-sm font-semibold ${score.value >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {score.value >= 0 ? "+" : ""}
                        {(score.value * 100).toFixed(0)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Composite Score */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium">Composite Score</span>
              <span className="text-lg font-bold text-blue-600">{recommendation.compositeScore}</span>
            </div>

            {/* Theme Recommendation */}
            {recommendation.recommendedTheme && (
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Recommended Theme</p>
                <p className="text-sm font-medium text-purple-700">{recommendation.recommendedTheme}</p>
              </div>
            )}

            {/* Validity */}
            {recommendation.validUntil && (
              <p className="text-xs text-gray-400">
                Valid until: {new Date(recommendation.validUntil).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        {(onAccept || onDismiss) && (
          <div className="flex gap-2 mt-4 pt-4 border-t">
            {onAccept && (
              <Button onClick={() => onAccept(recommendation)} className="flex-1">
                Accept Recommendation
              </Button>
            )}
            {onDismiss && (
              <Button onClick={() => onDismiss(recommendation)} variant="outline" className="flex-1">
                Dismiss
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
