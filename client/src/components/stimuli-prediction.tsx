import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Zap, TrendingUp, TrendingDown, ArrowUpRight, CheckCircle2, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { HCPProfile, Channel, StimuliEvent, InsertStimuliEvent } from "@shared/schema";

const channelLabels: Record<Channel, string> = {
  email: "Email Campaign",
  rep_visit: "Sales Rep Visit",
  webinar: "Webinar Invitation",
  conference: "Conference Meeting",
  digital_ad: "Digital Advertisement",
  phone: "Phone Call",
};

const contentTypeLabels: Record<string, string> = {
  clinical_data: "Clinical Data & Evidence",
  patient_outcomes: "Patient Outcome Stories",
  cost_savings: "Cost Savings Analysis",
  peer_comparison: "Peer Comparison Data",
  formulary_update: "Formulary Update",
  samples_offer: "Sample Request Offer",
};

const stimulusTypeLabels: Record<string, string> = {
  rep_visit: "Sales Rep Visit",
  email_send: "Email Send",
  email_open: "Email Open",
  email_click: "Email Click",
  webinar_invite: "Webinar Invitation",
  webinar_attend: "Webinar Attendance",
  conference_meeting: "Conference Meeting",
  phone_call: "Phone Call",
  digital_ad_impression: "Digital Ad Impression",
  digital_ad_click: "Digital Ad Click",
  sample_delivery: "Sample Delivery",
  content_download: "Content Download",
};

interface StimuliPredictionProps {
  hcp: HCPProfile;
}

export function StimuliPrediction({ hcp }: StimuliPredictionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<Partial<InsertStimuliEvent>>({
    hcpId: hcp.id,
    channel: hcp.channelPreference,
    stimulusType: "email_send",
    contentType: "clinical_data",
    messageVariant: "",
    callToAction: "",
  });
  
  const [prediction, setPrediction] = useState<StimuliEvent | null>(null);

  const { data: recentEvents = [], isLoading: isLoadingEvents } = useQuery<StimuliEvent[]>({
    queryKey: [`/api/stimuli?hcpId=${hcp.id}`],
  });

  const predictMutation = useMutation({
    mutationFn: async (data: Partial<InsertStimuliEvent>) => {
      const response = await apiRequest("POST", "/api/stimuli", {
        ...data,
        hcpId: hcp.id,
      });
      return response.json() as Promise<StimuliEvent>;
    },
    onSuccess: (result) => {
      setPrediction(result);
      queryClient.invalidateQueries({ queryKey: [`/api/stimuli?hcpId=${hcp.id}`] });
      const delta = result.predictedEngagementDelta ?? 0;
      toast({
        title: "Prediction Generated",
        description: `Predicted ${delta > 0 ? "+" : ""}${delta.toFixed(1)} engagement points`,
      });
    },
    onError: () => {
      toast({
        title: "Prediction Failed",
        description: "Unable to generate prediction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePredict = () => {
    predictMutation.mutate(formData);
  };

  const getImpactColor = (delta: number | null) => {
    if (delta === null) return "text-muted-foreground";
    if (delta >= 10) return "text-green-600 dark:text-green-400";
    if (delta >= 5) return "text-chart-1";
    if (delta > 0) return "text-yellow-600 dark:text-yellow-400";
    if (delta > -5) return "text-amber-600 dark:text-amber-400";
    return "text-destructive";
  };

  const engagementDelta = prediction?.predictedEngagementDelta ?? 0;
  const conversionDelta = prediction?.predictedConversionDelta ?? 0;
  const confidenceLower = prediction?.confidenceLower ?? 0;
  const confidenceUpper = prediction?.confidenceUpper ?? 20;

  return (
    <div className="space-y-6">
      <Card data-testid="card-stimuli-input">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Zap className="h-4 w-4 text-chart-1" />
            Configure Engagement Stimulus
          </CardTitle>
          <CardDescription>
            Predict the impact of a new customer engagement on this HCP
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="channel">Channel</Label>
              <Select
                value={formData.channel}
                onValueChange={(value) => setFormData({ ...formData, channel: value as Channel })}
              >
                <SelectTrigger id="channel" data-testid="select-channel">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(channelLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stimulus-type">Stimulus Type</Label>
              <Select
                value={formData.stimulusType}
                onValueChange={(value) => setFormData({ ...formData, stimulusType: value })}
              >
                <SelectTrigger id="stimulus-type" data-testid="select-stimulus-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(stimulusTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content-type">Content Type</Label>
            <Select
              value={formData.contentType ?? undefined}
              onValueChange={(value) => setFormData({ ...formData, contentType: value })}
            >
              <SelectTrigger id="content-type" data-testid="select-content-type">
                <SelectValue placeholder="Select content type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(contentTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message-variant">Message Variant (Optional)</Label>
            <Input
              id="message-variant"
              placeholder="e.g., Personalized clinical update"
              value={formData.messageVariant ?? ""}
              onChange={(e) => setFormData({ ...formData, messageVariant: e.target.value || undefined })}
              data-testid="input-message-variant"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cta">Call to Action (Optional)</Label>
            <Textarea
              id="cta"
              placeholder="e.g., Schedule a meeting to discuss patient outcomes"
              value={formData.callToAction ?? ""}
              onChange={(e) => setFormData({ ...formData, callToAction: e.target.value || undefined })}
              className="resize-none"
              rows={2}
              data-testid="input-cta"
            />
          </div>

          <Button
            className="w-full"
            onClick={handlePredict}
            disabled={predictMutation.isPending}
            data-testid="button-predict-impact"
          >
            {predictMutation.isPending ? (
              <>Generating Prediction...</>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Predict Impact
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {prediction && (
        <Card data-testid="card-prediction-result">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Prediction Result
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {new Date(prediction.createdAt).toLocaleTimeString()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  {engagementDelta >= 0 ? (
                    <TrendingUp className={`h-5 w-5 ${getImpactColor(engagementDelta)}`} />
                  ) : (
                    <TrendingDown className={`h-5 w-5 ${getImpactColor(engagementDelta)}`} />
                  )}
                  <span className={`font-mono text-2xl font-bold ${getImpactColor(engagementDelta)}`} data-testid="text-engagement-delta">
                    {engagementDelta > 0 ? "+" : ""}
                    {engagementDelta.toFixed(1)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">Engagement Points</span>
              </div>

              <div className="rounded-lg border p-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <ArrowUpRight className={`h-5 w-5 ${getImpactColor(conversionDelta)}`} />
                  <span className={`font-mono text-2xl font-bold ${getImpactColor(conversionDelta)}`} data-testid="text-conversion-delta">
                    {conversionDelta > 0 ? "+" : ""}
                    {conversionDelta.toFixed(1)}%
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">Conversion Lift</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  Confidence Interval
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        The 95% confidence range for the predicted engagement impact.
                        The actual result is likely to fall within this range.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </span>
                <span className="font-mono text-xs">
                  [{confidenceLower.toFixed(1)}, {confidenceUpper.toFixed(1)}]
                </span>
              </div>
              <div className="relative h-3 w-full rounded-full bg-muted">
                <div
                  className="absolute h-full rounded-full bg-chart-1/30"
                  style={{
                    left: `${Math.max(0, (confidenceLower / 20) * 100)}%`,
                    width: `${Math.min(100, ((confidenceUpper - confidenceLower) / 20) * 100)}%`,
                  }}
                />
                <div
                  className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-chart-1 border-2 border-background"
                  style={{
                    left: `calc(${Math.min(100, Math.max(0, (engagementDelta / 20) * 100))}% - 6px)`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span>+10</span>
                <span>+20</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Recommendation
              </span>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm">
                  {engagementDelta >= 8 ? (
                    <>High-impact engagement opportunity. This stimulus aligns well with Dr. {hcp.lastName}'s preferences.</>
                  ) : engagementDelta >= 4 ? (
                    <>Moderate impact expected. Consider enhancing the call-to-action for better results.</>
                  ) : engagementDelta > 0 ? (
                    <>Low but positive impact. A different channel or content type may yield better results.</>
                  ) : (
                    <>This engagement may not resonate well. Consider alternative approaches for this HCP.</>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-recent-predictions">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Recent Predictions</CardTitle>
          <CardDescription>
            Past stimuli predictions for this HCP
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingEvents ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : recentEvents.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No predictions yet. Create your first prediction above.
            </div>
          ) : (
            <div className="space-y-3">
              {recentEvents.slice(0, 5).map((event) => {
                const eventDelta = event.predictedEngagementDelta ?? 0;
                return (
                  <div
                    key={event.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                    data-testid={`event-row-${event.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {channelLabels[event.channel as Channel] || event.channel}
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate">
                          {event.contentType ? (contentTypeLabels[event.contentType] || event.contentType) : "N/A"}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {new Date(event.createdAt).toLocaleDateString()} at{" "}
                        {new Date(event.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <div className="text-right">
                        <div className={`font-mono text-sm font-semibold ${getImpactColor(eventDelta)}`}>
                          {eventDelta > 0 ? "+" : ""}
                          {eventDelta.toFixed(1)}
                        </div>
                        <div className="text-xs text-muted-foreground">Engagement</div>
                      </div>
                      <Badge
                        variant={event.status === "predicted" ? "outline" : event.status === "confirmed" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {event.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
