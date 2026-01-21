/**
 * Dev Mode Toolbar
 *
 * A persistent navigation bar that appears only in development mode.
 * Provides quick access to all modules without requiring authentication.
 *
 * This prevents "lockout" scenarios where developers can't access
 * interior modules due to auth issues or session problems.
 *
 * Remove or disable this component before production deployment.
 */

import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Search,
  Users,
  FlaskConical,
  Activity,
  Compass,
  LayoutDashboard,
  Bot,
  BarChart3,
  Thermometer,
  Target,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  category: "core" | "phase12" | "agents";
}

const navItems: NavItem[] = [
  // Core modules
  { path: "/", label: "Explorer", icon: <Search className="h-4 w-4" />, category: "core" },
  { path: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, category: "core" },
  { path: "/audience-builder", label: "Audiences", icon: <Users className="h-4 w-4" />, category: "core" },
  { path: "/simulations", label: "Simulations", icon: <FlaskConical className="h-4 w-4" />, category: "core" },
  { path: "/ecosystem", label: "Ecosystem", icon: <Compass className="h-4 w-4" />, category: "core" },
  { path: "/cohort-compare", label: "Cohorts", icon: <Activity className="h-4 w-4" />, category: "core" },

  // Phase 12 modules
  { path: "/message-saturation", label: "Saturation", icon: <Thermometer className="h-4 w-4" />, category: "phase12" },
  { path: "/next-best-orbit", label: "NBO", icon: <Target className="h-4 w-4" />, category: "phase12" },

  // Agent modules
  { path: "/agents", label: "Agents", icon: <Bot className="h-4 w-4" />, category: "agents" },
  { path: "/action-queue", label: "Actions", icon: <BarChart3 className="h-4 w-4" />, category: "agents" },
];

export function DevToolbar() {
  const [location] = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  // Only show in development mode
  if (import.meta.env.PROD || isDismissed) {
    return null;
  }

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-[9999]">
        <Button
          size="sm"
          onClick={() => setIsExpanded(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg"
        >
          <ChevronUp className="h-4 w-4 mr-1" />
          Dev Nav
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-zinc-900/95 backdrop-blur border-t border-amber-600/30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-2">
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
              Dev Mode Navigation
            </span>
            <span className="text-xs text-zinc-500">
              (Only visible in development)
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(false)}
              className="h-6 px-2 text-zinc-400 hover:text-white"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsDismissed(true)}
              className="h-6 px-2 text-zinc-400 hover:text-red-400"
              title="Dismiss for this session"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Navigation links */}
        <div className="flex flex-wrap items-center gap-1">
          {/* Core modules */}
          <div className="flex items-center gap-1 pr-2 border-r border-zinc-700">
            {navItems
              .filter((item) => item.category === "core")
              .map((item) => (
                <NavLink key={item.path} item={item} isActive={location === item.path} />
              ))}
          </div>

          {/* Phase 12 modules */}
          <div className="flex items-center gap-1 px-2 border-r border-zinc-700">
            <span className="text-[10px] text-zinc-500 uppercase mr-1">P12</span>
            {navItems
              .filter((item) => item.category === "phase12")
              .map((item) => (
                <NavLink key={item.path} item={item} isActive={location === item.path} />
              ))}
          </div>

          {/* Agent modules */}
          <div className="flex items-center gap-1 pl-2">
            <span className="text-[10px] text-zinc-500 uppercase mr-1">Agents</span>
            {navItems
              .filter((item) => item.category === "agents")
              .map((item) => (
                <NavLink key={item.path} item={item} isActive={location === item.path} />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Button
      asChild
      size="sm"
      variant="ghost"
      className={cn(
        "h-7 px-2 text-xs gap-1",
        isActive
          ? "bg-amber-600/20 text-amber-400 hover:bg-amber-600/30"
          : "text-zinc-400 hover:text-white hover:bg-zinc-800"
      )}
    >
      <Link href={item.path}>
        {item.icon}
        <span className="hidden sm:inline">{item.label}</span>
      </Link>
    </Button>
  );
}
