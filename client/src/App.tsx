import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { BrandProvider } from "@/components/brand";
import { ModeProvider } from "@/lib/mode-context";
import { PageTransition } from "@/components/transitions";
import { CommandPalette, CommandPaletteTrigger } from "@/components/ui/command-palette";
import { CommandPaletteProvider, useCommandPaletteState } from "@/hooks/use-command-palette";
import { KeyboardShortcutsProvider, useKeyboardShortcutsState } from "@/hooks/use-keyboard-shortcuts";
import { ShortcutsModal } from "@/components/ui/shortcuts-modal";
import { FirstRunGuide } from "@/components/onboarding";
// DevToolbar import removed - dev navigation widget disabled
// OmniVoice imports disabled - module not production ready
// import { OmniVoiceProvider, useOmniVoiceCtx } from "@/contexts/omnivoice-context";
// import { OmniVoiceChat } from "@/components/omnivoice-chat";
import { useFeatureFlag, INSIGHTRX_FLAGS } from "@/hooks/use-feature-flags";
import { AlertBell } from "@/components/alerts/AlertBell";
import NotFound from "@/pages/not-found";
import HCPExplorer from "@/pages/hcp-explorer";
import HCPExplorerDirect from "@/pages/hcp-explorer-direct";
import Simulations from "@/pages/simulations";
import SimulationsDirect from "@/pages/simulations-direct";
import Dashboard from "@/pages/dashboard";
import FeatureStore from "@/pages/feature-store";
import AudienceBuilder from "@/pages/audience-builder";
import AudienceBuilderDirect from "@/pages/audience-builder-direct";
import ChannelHealthDirect from "@/pages/channel-health-direct";
import ActionQueuePage from "@/pages/action-queue";
import ActionQueueDirect from "@/pages/action-queue-direct";
import { ModePage } from "@/components/mode-page";
import DashboardDirect from "@/pages/dashboard-direct";
import CohortCompare from "@/pages/cohort-compare";
import CohortCompareDirect from "@/pages/cohort-compare-direct";
import { AmbientAlertBar } from "@/components/shared/ambient-alert-bar";
import ModelEvaluationPage from "@/pages/model-evaluation";
import Settings from "@/pages/settings";
// Landing import removed - bypassing login page in dev mode
import AgentsPage from "@/pages/agents";
import ConstraintsPage from "@/pages/constraints";
import AllocationLabPage from "@/pages/allocation-lab";
import MessageSaturationPage from "@/pages/message-saturation";
import MessageSaturationDirect from "@/pages/message-saturation-direct";
import NBODashboard from "@/pages/NBODashboard";
import NBODirect from "@/pages/nbo-direct";
import SimulationComparePage from "@/pages/SimulationComparePage";
import AlertsPage from "@/pages/alerts";
import IntegrationsPage from "@/pages/settings/IntegrationsPage";
import WebhooksPage from "@/pages/settings/WebhooksPage";
import ApprovalsPage from "@/pages/ApprovalsPage";
import AuditLogPage from "@/pages/admin/AuditLogPage";

function Router() {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait">
      <PageTransition key={location} pageKey={location}>
        <Switch location={location}>
          <Route path="/">
            {() => <ModePage discover={HCPExplorer} direct={HCPExplorerDirect} />}
          </Route>
          <Route path="/hcp-explorer">
            {() => <ModePage discover={HCPExplorer} direct={HCPExplorerDirect} />}
          </Route>
          <Route path="/simulations">
            {() => <ModePage discover={Simulations} direct={SimulationsDirect} />}
          </Route>
          <Route path="/simulations/compare" component={SimulationComparePage} />
          <Route path="/dashboard">
            {() => <ModePage discover={Dashboard} direct={DashboardDirect} />}
          </Route>
          <Route path="/audience-builder">
            {() => <ModePage discover={AudienceBuilder} direct={AudienceBuilderDirect} />}
          </Route>
          <Route path="/channel-health">
            {() => <ModePage discover={ChannelHealthDirect} direct={ChannelHealthDirect} />}
          </Route>
          <Route path="/action-queue">
            {() => <ModePage discover={ActionQueuePage} direct={ActionQueueDirect} />}
          </Route>
          <Route path="/cohort-compare">
            {() => <ModePage discover={CohortCompare} direct={CohortCompareDirect} />}
          </Route>
          <Route path="/feature-store" component={FeatureStore} />
          <Route path="/model-evaluation" component={ModelEvaluationPage} />
          <Route path="/settings" component={Settings} />
          <Route path="/settings/integrations" component={IntegrationsPage} />
          <Route path="/settings/webhooks" component={WebhooksPage} />
          <Route path="/approvals" component={ApprovalsPage} />
          <Route path="/admin/audit-logs" component={AuditLogPage} />
          <Route path="/agents" component={AgentsPage} />
          <Route path="/constraints" component={ConstraintsPage} />
          <Route path="/allocation-lab" component={AllocationLabPage} />
          <Route path="/message-saturation">
            {() => <ModePage discover={MessageSaturationPage} direct={MessageSaturationDirect} />}
          </Route>
          <Route path="/next-best-orbit">
            {() => <ModePage discover={NBODashboard} direct={NBODirect} />}
          </Route>
          <Route path="/alerts" component={AlertsPage} />
          <Route component={NotFound} />
        </Switch>
      </PageTransition>
    </AnimatePresence>
  );
}

// OmniVoice Chat Widget disabled - module not production ready
// function OmniVoiceChatWidget() { ... }

function AppLayout() {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <CommandPaletteTrigger />
              <AlertBell />
              <ThemeToggle />
            </div>
          </header>
          <AmbientAlertBar />
          <main className="flex-1 overflow-hidden">
            <Router />
          </main>
        </div>
      </div>
      <CommandPalette />
      <FirstRunGuide />
    </SidebarProvider>
  );
}

function AuthenticatedApp() {
  // Development mode: skip auth check and go straight to platform
  // To re-enable auth, restore the session check below
  /*
  const { data: session, isLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const response = await fetch("/api/invite/session");
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session?.authenticated) {
    return <Landing />;
  }
  */

  return <AppLayout />;
}

function CommandPaletteWrapper({ children }: { children: React.ReactNode }) {
  const commandPaletteState = useCommandPaletteState();
  return (
    <CommandPaletteProvider value={commandPaletteState}>
      {children}
    </CommandPaletteProvider>
  );
}

function KeyboardShortcutsWrapper({ children }: { children: React.ReactNode }) {
  const keyboardShortcutsState = useKeyboardShortcutsState();
  return (
    <KeyboardShortcutsProvider value={keyboardShortcutsState}>
      {children}
      <ShortcutsModal
        open={keyboardShortcutsState.isShortcutsModalOpen}
        onClose={keyboardShortcutsState.closeShortcutsModal}
      />
    </KeyboardShortcutsProvider>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="omnivor-theme">
      <BrandProvider>
        <ModeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <KeyboardShortcutsWrapper>
              <CommandPaletteWrapper>
                <AuthenticatedApp />
                {/* DevToolbar removed - was dev navigation widget */}
              </CommandPaletteWrapper>
            </KeyboardShortcutsWrapper>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
        </ModeProvider>
      </BrandProvider>
    </ThemeProvider>
  );
}

export default App;
