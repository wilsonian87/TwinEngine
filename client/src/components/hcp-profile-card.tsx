import { Mail, Phone, Video, Globe, Calendar, Users, Heart, Brain, Bone, Pill, Stethoscope, Activity, Eye, Syringe, Microscope, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { HCPProfile, Channel, Specialty } from "@shared/schema";

const channelIcons: Record<Channel, typeof Mail> = {
  email: Mail,
  rep_visit: Users,
  webinar: Video,
  conference: Calendar,
  digital_ad: Globe,
  phone: Phone,
};

const channelLabels: Record<Channel, string> = {
  email: "Email",
  rep_visit: "Rep Visit",
  webinar: "Webinar",
  conference: "Conference",
  digital_ad: "Digital",
  phone: "Phone",
};

const tierColors: Record<string, string> = {
  "Tier 1": "bg-chart-1 text-primary-foreground",
  "Tier 2": "bg-chart-2 text-primary-foreground",
  "Tier 3": "bg-chart-3 text-primary-foreground",
};

// Specialty icons and colors for visual distinction
const specialtyConfig: Record<Specialty, { icon: typeof Heart; color: string; bgColor: string }> = {
  "Oncology": { icon: Activity, color: "text-rose-500", bgColor: "bg-rose-500/10" },
  "Cardiology": { icon: Heart, color: "text-red-500", bgColor: "bg-red-500/10" },
  "Neurology": { icon: Brain, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  "Endocrinology": { icon: Pill, color: "text-amber-500", bgColor: "bg-amber-500/10" },
  "Rheumatology": { icon: Bone, color: "text-orange-500", bgColor: "bg-orange-500/10" },
  "Pulmonology": { icon: Stethoscope, color: "text-sky-500", bgColor: "bg-sky-500/10" },
  "Gastroenterology": { icon: Microscope, color: "text-green-500", bgColor: "bg-green-500/10" },
  "Nephrology": { icon: Syringe, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  "Dermatology": { icon: Sparkles, color: "text-pink-500", bgColor: "bg-pink-500/10" },
  "Psychiatry": { icon: Eye, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
};

interface HCPProfileCardProps {
  hcp: HCPProfile;
  onSelect?: (hcp: HCPProfile) => void;
  isSelected?: boolean;
  isMultiSelected?: boolean;
  onMultiSelectClick?: (hcp: HCPProfile, event: React.MouseEvent) => void;
  compact?: boolean;
}

export function HCPProfileCard({
  hcp,
  onSelect,
  isSelected = false,
  isMultiSelected = false,
  onMultiSelectClick,
  compact = false,
}: HCPProfileCardProps) {
  const PreferredIcon = channelIcons[hcp.channelPreference];

  const getEngagementColor = (score: number) => {
    if (score >= 70) return "text-chart-1";
    if (score >= 40) return "text-chart-3";
    return "text-muted-foreground";
  };

  const handleClick = (e: React.MouseEvent) => {
    if (onMultiSelectClick && (e.shiftKey || e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onMultiSelectClick(hcp, e);
    } else {
      onSelect?.(hcp);
    }
  };

  if (compact) {
    return (
      <Card
        className={`cursor-pointer transition-all hover-elevate ${
          isSelected ? "ring-2 ring-primary" : ""
        } ${isMultiSelected ? "ring-2 ring-chart-1 bg-chart-1/5" : ""}`}
        onClick={handleClick}
        data-testid={`card-hcp-${hcp.npi}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-medium" data-testid={`text-hcp-name-${hcp.npi}`}>
                  {hcp.firstName} {hcp.lastName}
                </h3>
                <Badge variant="secondary" className={`shrink-0 text-xs ${tierColors[hcp.tier]}`}>
                  {hcp.tier}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {hcp.specialty} • NPI: {hcp.npi}
              </p>
            </div>
            <div className="text-right">
              <span className={`font-mono text-lg font-semibold ${getEngagementColor(hcp.overallEngagementScore)}`}>
                {hcp.overallEngagementScore}
              </span>
              <p className="text-xs text-muted-foreground">Engagement</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const specialtyStyle = specialtyConfig[hcp.specialty as Specialty] || specialtyConfig["Oncology"];
  const SpecialtyIcon = specialtyStyle.icon;

  return (
    <Card
      className={`cursor-pointer transition-all hover-elevate relative overflow-hidden ${
        isSelected ? "ring-2 ring-primary" : ""
      } ${isMultiSelected ? "ring-2 ring-chart-1 bg-chart-1/5" : ""}`}
      onClick={handleClick}
      data-testid={`card-hcp-${hcp.npi}`}
    >
      {/* Specialty accent */}
      <div className={`absolute top-0 right-0 p-2 ${specialtyStyle.bgColor} rounded-bl-xl`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <SpecialtyIcon className={`h-5 w-5 ${specialtyStyle.color}`} />
          </TooltipTrigger>
          <TooltipContent>
            <p>{hcp.specialty}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 pr-10">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold" data-testid={`text-hcp-name-${hcp.npi}`}>
                Dr. {hcp.firstName} {hcp.lastName}
              </h3>
              <Badge variant="secondary" className={`text-xs ${tierColors[hcp.tier]}`}>
                {hcp.tier}
              </Badge>
            </div>
            <p className={`mt-1 text-sm ${specialtyStyle.color} font-medium`}>
              {hcp.specialty}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {hcp.organization} • {hcp.city}, {hcp.state}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <span className={`block font-mono text-xl font-semibold ${getEngagementColor(hcp.overallEngagementScore)}`} data-testid={`text-engagement-${hcp.npi}`}>
              {hcp.overallEngagementScore}
            </span>
            <span className="text-xs text-muted-foreground">Engagement</span>
          </div>
          <div className="text-center">
            <span className="block font-mono text-xl font-semibold text-foreground" data-testid={`text-rxvolume-${hcp.npi}`}>
              {hcp.monthlyRxVolume}
            </span>
            <span className="text-xs text-muted-foreground">Monthly Rx</span>
          </div>
          <div className="text-center">
            <span className="block font-mono text-xl font-semibold text-foreground" data-testid={`text-marketshare-${hcp.npi}`}>
              {hcp.marketSharePct}%
            </span>
            <span className="text-xs text-muted-foreground">Mkt Share</span>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Channel Preference</span>
            <div className="flex items-center gap-1">
              <PreferredIcon className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium">{channelLabels[hcp.channelPreference]}</span>
            </div>
          </div>
          <div className="flex gap-1">
            {hcp.channelEngagements.slice(0, 4).map((engagement) => {
              const Icon = channelIcons[engagement.channel];
              return (
                <Tooltip key={engagement.channel}>
                  <TooltipTrigger asChild>
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-md ${
                        engagement.channel === hcp.channelPreference
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{channelLabels[engagement.channel]}</p>
                    <p className="text-xs">Score: {engagement.score} | Response: {engagement.responseRate}%</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Conversion Likelihood</span>
            <span className="font-medium">{hcp.conversionLikelihood}%</span>
          </div>
          <Progress value={hcp.conversionLikelihood} className="h-1.5" />
        </div>

        <div className="flex items-center justify-between pt-2">
          <Badge variant="outline" className="text-xs" data-testid={`badge-segment-${hcp.npi}`}>
            {hcp.segment}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(hcp);
            }}
            data-testid={`button-view-profile-${hcp.npi}`}
          >
            View Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
