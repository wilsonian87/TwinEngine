/**
 * OmniVor Application Sidebar
 *
 * Phase 13 Navigation Overhaul:
 * - Descriptive module names (white-label ready)
 * - Organized into Explore / Analyze / Activate / System sections
 * - Light mode compatible styling
 */

import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  LayoutDashboard,
  FlaskConical,
  Activity,
  Settings,
  TrendingUp,
  BarChart3,
  GitCompare,
  Bot,
  ListTodo,
  Sliders,
  PieChart,
  Hexagon,
  Info,
  Flame,
  Target,
  Bell,
  Shield,
  CheckSquare,
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
import { ModeToggle } from "@/components/mode-toggle";

// Phase 13: Organized navigation sections (Explore / Analyze / Activate / System)

// EXPLORE - Finding and organizing HCPs
const exploreItems = [
  {
    title: "HCP Explorer",
    url: "/",
    icon: Users,
    description: "Search and browse HCP profiles",
  },
  {
    title: "Audience Builder",
    url: "/audience-builder",
    icon: UserPlus,
    description: "Create and manage HCP audiences",
  },
];

// ANALYZE - Understanding what's happening
const analyzeItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview metrics and insights",
  },
  {
    title: "Audience Comparison",
    url: "/cohort-compare",
    icon: GitCompare,
    description: "Side-by-side audience analysis",
  },
  {
    title: "Channel Health",
    url: "/channel-health",
    icon: Activity,
    description: "Channel performance diagnostics",
  },
  {
    title: "Message Saturation",
    url: "/message-saturation",
    icon: Flame,
    description: "Track message theme fatigue",
  },
];

// ACTIVATE - Taking action on insights
const activateItems = [
  {
    title: "Simulation Studio",
    url: "/simulations",
    icon: FlaskConical,
    description: "Campaign simulation and forecasting",
  },
  {
    title: "Action Queue",
    url: "/action-queue",
    icon: ListTodo,
    description: "Review and approve recommendations",
  },
  {
    title: "Next Best Orbit",
    url: "/next-best-orbit",
    icon: Target,
    description: "AI-powered engagement recommendations",
  },
  {
    title: "Portfolio Optimizer",
    url: "/allocation-lab",
    icon: PieChart,
    description: "Resource allocation optimization",
  },
];

// SYSTEM - Configuration and advanced features
const systemItems = [
  {
    title: "Alerts",
    url: "/alerts",
    icon: Bell,
    description: "Configure threshold alerts",
    hasBadge: true,
  },
  {
    title: "Agent Manager",
    url: "/agents",
    icon: Bot,
    description: "Autonomous agents and automation",
  },
  {
    title: "Constraints",
    url: "/constraints",
    icon: Sliders,
    description: "Capacity, budget, and compliance",
  },
  {
    title: "Model Evaluation",
    url: "/model-evaluation",
    icon: BarChart3,
    description: "Prediction accuracy tracking",
  },
  {
    title: "Approvals",
    url: "/approvals",
    icon: CheckSquare,
    description: "Review pending approval requests",
  },
  {
    title: "Audit Logs",
    url: "/admin/audit-logs",
    icon: Shield,
    description: "System audit trail (Admin)",
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

  // Fetch unacknowledged alert count for badge
  const { data: alertCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/alerts/events/count"],
    refetchInterval: 60000, // Refresh every minute
  });
  const unacknowledgedAlertCount = alertCountData?.count || 0;

  return (
    <Sidebar>
      {/* Header with OmniVor branding */}
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <LogoIcon size="md" />
          <div className="flex flex-col">
            <span
              className="text-sm font-bold tracking-wide text-foreground"
              data-testid="text-app-title"
            >
              {BRAND_CONFIG.product.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {BRAND_CONFIG.product.subtitle}
            </span>
          </div>
        </div>
        <div className="mt-3">
          <ModeToggle />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* EXPLORE - Finding and organizing HCPs */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider px-4 text-muted-foreground">
            Explore
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {exploreItems.map((item) => {
                const isActive = location === item.url || (item.url === "/" && location === "/hcp-explorer");
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

        {/* ANALYZE - Understanding what's happening */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider px-4 text-muted-foreground">
            Analyze
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analyzeItems.map((item) => {
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

        {/* ACTIVATE - Taking action on insights */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider px-4 text-muted-foreground">
            Activate
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {activateItems.map((item) => {
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

        {/* SYSTEM - Configuration and advanced features */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider px-4 text-muted-foreground">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => {
                const isActive = location === item.url;
                const showBadge = (item as { hasBadge?: boolean }).hasBadge && unacknowledgedAlertCount > 0;
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
                        <span className="flex-1">{item.title}</span>
                        {showBadge && (
                          <Badge variant="destructive" className="h-5 px-1.5 text-xs ml-auto">
                            {unacknowledgedAlertCount > 99 ? "99+" : unacknowledgedAlertCount}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* OmniVor Labs Section */}
        <SidebarGroup>
          <SidebarGroupLabel
            className="text-xs font-semibold uppercase tracking-wider px-4 flex items-center gap-2 text-primary"
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
            <span className="text-xs text-muted-foreground">
              Signal Status
            </span>
          </div>
          <Badge
            variant="outline"
            className="text-xs border-primary text-primary"
            data-testid="badge-model-status"
          >
            Active
          </Badge>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          {BRAND_CONFIG.company.copyright}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
