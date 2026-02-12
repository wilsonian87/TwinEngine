/**
 * Ambient Alert Bar — Bloomberg-style persistent competitive ticker.
 *
 * Design analogue: Bloomberg Terminal ambient intelligence.
 * Competitive intelligence as atmosphere, not destination.
 *
 * Sits at the top of Direct Mode pages. Shows top competitive signals
 * as a scrolling ticker with severity coloring.
 */

import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, AlertTriangle, TrendingUp, Shield, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useMode } from "@/lib/mode-context";
import { MOTION_DURATION, MOTION_EASING } from "@/lib/motion-config";

interface CompetitiveAlert {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  therapeuticArea?: string;
  timestamp: string;
}

function useCriticalAlerts() {
  return useQuery<CompetitiveAlert[]>({
    queryKey: ["/api/competitive/alerts/ambient"],
    queryFn: async () => {
      const response = await fetch("/api/competitive/alerts/ambient", {
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000, // Every 5 minutes
    staleTime: 2 * 60 * 1000,
  });
}

const severityConfig = {
  critical: {
    icon: AlertCircle,
    bg: "bg-red-500/10 dark:bg-red-950/40",
    border: "border-red-300/50 dark:border-red-800/50",
    text: "text-red-700 dark:text-red-300",
    dot: "bg-red-500",
  },
  high: {
    icon: AlertTriangle,
    bg: "bg-amber-500/10 dark:bg-amber-950/40",
    border: "border-amber-300/50 dark:border-amber-800/50",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  medium: {
    icon: TrendingUp,
    bg: "bg-blue-500/10 dark:bg-blue-950/40",
    border: "border-blue-300/50 dark:border-blue-800/50",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  low: {
    icon: Shield,
    bg: "bg-muted/50",
    border: "border-border",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

function AlertTicker({ alerts }: { alerts: CompetitiveAlert[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (alerts.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % alerts.length);
    }, 6000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [alerts.length]);

  if (alerts.length === 0) return null;

  const alert = alerts[currentIndex];
  const config = severityConfig[alert.severity];
  const Icon = config.icon;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={alert.id}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: MOTION_DURATION.ui, ease: MOTION_EASING.out }}
        className="flex items-center gap-2 min-w-0"
      >
        <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0 animate-pulse", config.dot)} />
        <Icon className={cn("h-3 w-3 flex-shrink-0", config.text)} />
        <span className={cn("text-xs truncate", config.text)}>
          {alert.message}
        </span>
        {alert.therapeuticArea && (
          <span className="text-[10px] text-muted-foreground flex-shrink-0">
            {alert.therapeuticArea}
          </span>
        )}
        {alerts.length > 1 && (
          <span className="text-[10px] text-muted-foreground/50 flex-shrink-0 tabular-nums">
            {currentIndex + 1}/{alerts.length}
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export function AmbientAlertBar({ className }: { className?: string }) {
  const { isDirectMode } = useMode();
  const { data: alerts = [] } = useCriticalAlerts();
  const [dismissed, setDismissed] = useState(false);

  // Only show in Direct Mode
  if (!isDirectMode || alerts.length === 0 || dismissed) return null;

  const topSeverity = alerts[0]?.severity || "low";
  const config = severityConfig[topSeverity];

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: MOTION_DURATION.ui, ease: MOTION_EASING.out }}
      className={cn(
        "border-b px-4 py-1.5 flex items-center justify-between",
        config.bg,
        config.border,
        className
      )}
    >
      <AlertTicker alerts={alerts} />
      <button
        onClick={() => setDismissed(true)}
        className="ml-2 flex-shrink-0 rounded p-0.5 hover:bg-foreground/10 transition-colors"
      >
        <X className="h-3 w-3 text-muted-foreground" />
      </button>
    </motion.div>
  );
}
