/**
 * Audience Builder Direct Mode — Spotify staging + lifecycle states.
 *
 * Design analogues:
 * - Spotify: persistent staging area, smart playlists, collection identity
 * - Letterboxd: lifecycle states (Draft → Active → Archived)
 * - Are.na: multi-audience membership, annotation on inclusion
 *
 * NLQ is the hero. Saved audiences feel like a curated collection.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Users,
  FlaskConical,
  GitCompare,
  Sparkles,
  ArrowRight,
  Plus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  staggerContainer,
  staggerChild,
  MOTION_DURATION,
  MOTION_EASING,
} from "@/lib/motion-config";
import { NLAudienceBuilder } from "@/components/nl-audience-builder";
import type { SavedAudience } from "@shared/schema";

// ============================================================================
// HELPERS
// ============================================================================

function getTierMosaic(audience: SavedAudience): { color: string; label: string }[] {
  // Generate a visual signature from HCP count
  const count = audience.hcpIds.length;
  if (count > 500) return [
    { color: "bg-purple-500", label: "Large" },
    { color: "bg-purple-400", label: "" },
    { color: "bg-purple-300", label: "" },
  ];
  if (count > 100) return [
    { color: "bg-blue-500", label: "Medium" },
    { color: "bg-blue-400", label: "" },
  ];
  return [
    { color: "bg-slate-400", label: "Small" },
  ];
}

function getLifecycleBadge(audience: SavedAudience): {
  label: string;
  variant: "default" | "secondary" | "outline";
} {
  // Infer lifecycle from source and age
  const source = (audience as { source?: string }).source;
  if (source === "simulation") return { label: "Simulated", variant: "secondary" };
  if (audience.hcpIds.length === 0) return { label: "Draft", variant: "outline" };
  return { label: "Active", variant: "default" };
}

// ============================================================================
// AUDIENCE CARD — Collection identity pattern
// ============================================================================

function AudienceCard({
  audience,
  onNavigate,
}: {
  audience: SavedAudience;
  onNavigate: (path: string) => void;
}) {
  const mosaic = getTierMosaic(audience);
  const lifecycle = getLifecycleBadge(audience);

  return (
    <motion.div variants={staggerChild}>
      <Card className="hover:shadow-md hover:border-primary/30 transition-all group cursor-pointer">
        <CardContent className="p-4">
          {/* Visual Mosaic — mini tier visualization */}
          <div className="flex gap-0.5 mb-3">
            {mosaic.map((tile, i) => (
              <div
                key={i}
                className={cn("h-1.5 rounded-full flex-1", tile.color)}
              />
            ))}
          </div>

          {/* Name + Lifecycle */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm truncate">
                {audience.name}
              </h3>
              {audience.description && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {audience.description}
                </p>
              )}
            </div>
            <Badge variant={lifecycle.variant} className="text-[10px] h-5 shrink-0">
              {lifecycle.label}
            </Badge>
          </div>

          {/* Count */}
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span className="tabular-nums">{audience.hcpIds.length.toLocaleString()} HCPs</span>
          </div>

          {/* Quick Actions — appear on hover */}
          <div className="mt-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(`/simulations?audience=${audience.id}`);
              }}
            >
              <FlaskConical className="h-2.5 w-2.5 mr-1" />
              Simulate
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(`/action-queue?audience=${audience.id}`);
              }}
            >
              <ArrowRight className="h-2.5 w-2.5 mr-1" />
              Actions
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AudienceBuilderDirect() {
  const [, navigate] = useLocation();

  const { data: audiences = [], isLoading } = useQuery<SavedAudience[]>({
    queryKey: ["/api/audiences"],
    queryFn: async () => {
      const response = await fetch("/api/audiences", { credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
  });

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-lg font-semibold"
              data-testid="text-page-title"
            >
              Audience Builder
            </h1>
          </div>
          {audiences.length >= 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/cohort-compare")}
            >
              <GitCompare className="h-3.5 w-3.5 mr-1.5" />
              Compare
            </Button>
          )}
        </div>
      </div>

      {/* NLQ Hero — full width so the two-column layout has room */}
      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: MOTION_DURATION.data,
            ease: MOTION_EASING.out,
          }}
        >
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles
                className="h-4 w-4"
                style={{ color: "var(--catalyst-gold, #d97706)" }}
              />
              <span className="text-xs font-medium text-muted-foreground">
                Describe your audience in plain language
              </span>
            </div>
          </div>
          <NLAudienceBuilder />
        </motion.div>
      </div>

      {/* Saved Audiences Collection — constrained for readability */}
      <div className="px-6 pb-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Your Audiences
            {audiences.length > 0 && (
              <span className="ml-2 text-foreground">{audiences.length}</span>
            )}
          </h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-lg" />
            ))}
          </div>
        ) : audiences.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No audiences yet</p>
            <p className="text-xs mt-1">
              Use natural language above to create your first audience
            </p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="enter"
            className="grid grid-cols-2 sm:grid-cols-3 gap-3"
          >
            {audiences.map((audience) => (
              <AudienceCard
                key={audience.id}
                audience={audience}
                onNavigate={navigate}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
