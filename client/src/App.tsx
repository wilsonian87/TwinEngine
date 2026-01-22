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
import { PageTransition } from "@/components/transitions";
import { CommandPalette, CommandPaletteTrigger } from "@/components/ui/command-palette";
import { CommandPaletteProvider, useCommandPaletteState } from "@/hooks/use-command-palette";
import { KeyboardShortcutsProvider, useKeyboardShortcutsState } from "@/hooks/use-keyboard-shortcuts";
import { ShortcutsModal } from "@/components/ui/shortcuts-modal";
import { FirstRunGuide } from "@/components/onboarding";
import { DevToolbar } from "@/components/dev-toolbar";
import NotFound from "@/pages/not-found";
import HCPExplorer from "@/pages/hcp-explorer";
import Simulations from "@/pages/simulations";
import Dashboard from "@/pages/dashboard";
import FeatureStore from "@/pages/feature-store";
import AudienceBuilder from "@/pages/audience-builder";
import ActionQueuePage from "@/pages/action-queue";
import CohortCompare from "@/pages/cohort-compare";
import ModelEvaluationPage from "@/pages/model-evaluation";
import Settings from "@/pages/settings";
import Landing from "@/pages/landing";
import AgentsPage from "@/pages/agents";
import ConstraintsPage from "@/pages/constraints";
import AllocationLabPage from "@/pages/allocation-lab";
import MessageSaturationPage from "@/pages/message-saturation";
import NBODashboard from "@/pages/NBODashboard";

function Router() {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait">
      <PageTransition key={location} pageKey={location}>
        <Switch location={location}>
          <Route path="/" component={HCPExplorer} />
          <Route path="/hcp-explorer" component={HCPExplorer} />
          <Route path="/simulations" component={Simulations} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/audience-builder" component={AudienceBuilder} />
          <Route path="/action-queue" component={ActionQueuePage} />
          <Route path="/cohort-compare" component={CohortCompare} />
          <Route path="/feature-store" component={FeatureStore} />
          <Route path="/model-evaluation" component={ModelEvaluationPage} />
          <Route path="/settings" component={Settings} />
          <Route path="/agents" component={AgentsPage} />
          <Route path="/constraints" component={ConstraintsPage} />
          <Route path="/allocation-lab" component={AllocationLabPage} />
          <Route path="/message-saturation" component={MessageSaturationPage} />
          <Route path="/next-best-orbit" component={NBODashboard} />
          <Route component={NotFound} />
        </Switch>
      </PageTransition>
    </AnimatePresence>
  );
}

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
              <ThemeToggle />
            </div>
          </header>
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
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <KeyboardShortcutsWrapper>
              <CommandPaletteWrapper>
                <AuthenticatedApp />
                <DevToolbar />
              </CommandPaletteWrapper>
            </KeyboardShortcutsWrapper>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </BrandProvider>
    </ThemeProvider>
  );
}

export default App;
