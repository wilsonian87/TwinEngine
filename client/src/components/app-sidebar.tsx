/**
 * OmniVor Application Sidebar
 *
 * Navigation with branded module names:
 * - Signal Index (HCP Explorer)
 * - Cohort Lab (Audience Builder)
 * - Catalyst Queue (Action Queue)
 * - Scenario Lab (Simulations)
 * - Nerve Center (Dashboard)
 */

import { useLocation, Link } from "wouter";
import {
  Search,
  Users,
  FlaskConical,
  Activity,
  Settings,
  Database,
  TrendingUp,
  BarChart3,
  GitCompare,
  Bot,
  Shield,
  Beaker,
  Zap,
  Hexagon,
  Info,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { LogoIcon } from "@/components/brand";
import { BRAND_CONFIG } from "@/lib/brand-config";
import { FeatureTooltip, NOMENCLATURE_TOOLTIPS } from "@/components/onboarding";

// Primary navigation - data exploration & analysis modules
const navigationItems = [
  {
    title: "Signal Index",
    url: "/",
    icon: Search,
    description: "HCP profile exploration",
    tooltip: NOMENCLATURE_TOOLTIPS.signalIndex,
  },
  {
    title: "Cohort Lab",
    url: "/audience-builder",
    icon: Users,
    description: "AI-powered audience building",
    tooltip: NOMENCLATURE_TOOLTIPS.cohortLab,
  },
  {
    title: "Catalyst Queue",
    url: "/action-queue",
    icon: Zap,
    description: "Next best actions",
  },
  {
    title: "Cohort Compare",
    url: "/cohort-compare",
    icon: GitCompare,
    description: "Side-by-side analysis",
  },
  {
    title: "Scenario Lab",
    url: "/simulations",
    icon: FlaskConical,
    description: "Campaign simulation",
    tooltip: NOMENCLATURE_TOOLTIPS.scenarioLab,
  },
  {
    title: "Nerve Center",
    url: "/dashboard",
    icon: Activity,
    description: "Analytics dashboard",
    tooltip: NOMENCLATURE_TOOLTIPS.nerveCenter,
  },
];

// System modules - configuration & infrastructure
const systemItems = [
  {
    title: "Feature Store",
    url: "/feature-store",
    icon: Database,
    description: "Data pipeline status",
  },
  {
    title: "Model Evaluation",
    url: "/model-evaluation",
    icon: BarChart3,
    description: "Prediction accuracy tracking",
  },
  {
    title: "Agent Orchestrator",
    url: "/agents",
    icon: Bot,
    description: "Autonomous agents & alerts",
  },
  {
    title: "Constraint Surface",
    url: "/constraints",
    icon: Shield,
    description: "Capacity, budget & compliance",
  },
  {
    title: "Allocation Lab",
    url: "/allocation-lab",
    icon: Beaker,
    description: "Portfolio optimization",
    tooltip: NOMENCLATURE_TOOLTIPS.allocationLab,
  },
];

// OmniVor Labs section
const labsItems = [
  {
    title: "About OmniVor",
    url: "/settings",
    icon: Info,
    description: "Product information",
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    description: "Configuration",
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      {/* Header with OmniVor branding */}
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <LogoIcon size="md" />
          <div className="flex flex-col">
            <span
              className="text-sm font-bold tracking-wide"
              style={{ color: "var(--signal-white, #fafafa)" }}
              data-testid="text-app-title"
            >
              {BRAND_CONFIG.product.name}
            </span>
            <span
              className="text-xs"
              style={{ color: "var(--muted-gray, #52525b)" }}
            >
              {BRAND_CONFIG.product.subtitle}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Primary Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel
            className="text-xs font-semibold uppercase tracking-wider px-4"
            style={{ color: "var(--muted-gray, #52525b)" }}
          >
            Modules
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = location === item.url || (item.url === "/" && location === "/hcp-explorer");
                const menuButton = (
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.description}
                    className="transition-all duration-200"
                  >
                    <Link
                      href={item.url}
                      data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                );

                return (
                  <SidebarMenuItem key={item.title}>
                    {item.tooltip ? (
                      <FeatureTooltip
                        id={item.tooltip.id}
                        title={item.tooltip.title}
                        description={item.tooltip.description}
                        formerName={item.tooltip.formerName}
                        position="right"
                      >
                        {menuButton}
                      </FeatureTooltip>
                    ) : (
                      menuButton
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System Modules */}
        <SidebarGroup>
          <SidebarGroupLabel
            className="text-xs font-semibold uppercase tracking-wider px-4"
            style={{ color: "var(--muted-gray, #52525b)" }}
          >
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => {
                const isActive = location === item.url;
                const menuButton = (
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.description}
                    className="transition-all duration-200"
                  >
                    <Link
                      href={item.url}
                      data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                );

                return (
                  <SidebarMenuItem key={item.title}>
                    {item.tooltip ? (
                      <FeatureTooltip
                        id={item.tooltip.id}
                        title={item.tooltip.title}
                        description={item.tooltip.description}
                        formerName={item.tooltip.formerName}
                        position="right"
                      >
                        {menuButton}
                      </FeatureTooltip>
                    ) : (
                      menuButton
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* OmniVor Labs Section */}
        <SidebarGroup>
          <SidebarGroupLabel
            className="text-xs font-semibold uppercase tracking-wider px-4 flex items-center gap-2"
            style={{ color: "var(--consumption-purple, #6b21a8)" }}
          >
            <Hexagon className="h-3 w-3" />
            OmniVor Labs
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {labsItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.description}
                      className="transition-all duration-200"
                    >
                      <Link
                        href={item.url}
                        data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with status */}
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp
              className="h-4 w-4"
              style={{ color: "var(--catalyst-gold, #d97706)" }}
            />
            <span
              className="text-xs"
              style={{ color: "var(--muted-gray, #52525b)" }}
            >
              Signal Status
            </span>
          </div>
          <Badge
            variant="outline"
            className="text-xs"
            style={{
              borderColor: "var(--consumption-purple, #6b21a8)",
              color: "var(--process-violet, #a855f7)",
            }}
            data-testid="badge-model-status"
          >
            Active
          </Badge>
        </div>
        <div
          className="mt-2 text-xs"
          style={{ color: "var(--muted-gray, #52525b)" }}
        >
          {BRAND_CONFIG.company.copyright}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
