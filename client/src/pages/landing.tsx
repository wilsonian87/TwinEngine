/**
 * OmniVor Labs Login Page
 *
 * Brand-first entry point with:
 * - Heavy Extended wordmark (left/center hero)
 * - Username/password login form (upper-right, glassmorphic card)
 * - Hero glow animation
 * - Capability hints at bottom
 */

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineError } from "@/components/ui/error-state";
import { Loader2, ArrowRight, Hexagon, Search, Users, FlaskConical, Zap } from "lucide-react";
import { WordmarkDisplay, LogoIcon, useBrand } from "@/components/brand";
import { cn } from "@/lib/utils";

export default function Landing() {
  const queryClient = useQueryClient();
  const { currentTagline, config } = useBrand();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [taglineVisible, setTaglineVisible] = useState(false);

  // Animate tagline on mount
  useEffect(() => {
    const timer = setTimeout(() => setTaglineVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Invalid credentials");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }
      return data;
    },
    onSuccess: (data) => {
      setSuccess(data.message);
      setError(null);
      setUsername("");
      setPassword("");
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (mode === "login") {
      loginMutation.mutate();
    } else {
      registerMutation.mutate();
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError(null);
    setSuccess(null);
  };

  const isPending = mode === "login" ? loginMutation.isPending : registerMutation.isPending;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-zinc-950 dark">
      {/* Hero Glow Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Central glow */}
        <div className="absolute top-0 left-1/3 -translate-x-1/2 w-[800px] h-[600px] omnivor-hero-glow bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,_hsl(var(--primary)/0.25),_transparent)]" />
        {/* Secondary ambient glow */}
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[400px] opacity-30 bg-[radial-gradient(ellipse_at_center,_hsl(var(--primary)/0.2),_transparent_70%)] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] opacity-20 bg-[radial-gradient(ellipse_at_center,_hsl(var(--accent)/0.15),_transparent_70%)] animate-pulse" />
      </div>

      {/* Header */}
      <header className="relative z-10 p-6">
        <div className="flex items-center gap-3">
          <LogoIcon size="md" />
          <span className="text-lg font-semibold tracking-wide text-zinc-50">
            {config.product.name}
          </span>
        </div>
      </header>

      {/* Main Content — centered layout */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 md:px-12 lg:px-20 py-12">
        {/* Hero wordmark */}
        <div className="omnivor-animate-in text-center">
          <WordmarkDisplay />
        </div>

        {/* Tagline with fade animation */}
        <div
          className={cn(
            "mt-8 text-center transition-all duration-700 ease-out",
            taglineVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          )}
        >
          <p className="text-xl md:text-2xl font-light tracking-wide text-zinc-50/70">
            {currentTagline}
          </p>
        </div>

        {/* Subtle divider */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <div className="h-px w-16 bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
          <Hexagon className="h-4 w-4 text-primary" />
          <div className="h-px w-16 bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
        </div>

        {/* Capability Hints — centered under wordmark */}
        <div className="mt-10 w-full max-w-3xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <CapabilityHint
              icon={<Search className="h-6 w-6" />}
              label="HCP Explorer"
              description="Convert target lists into interactive experiences"
            />
            <CapabilityHint
              icon={<Users className="h-6 w-6" />}
              label="Audience Builder"
              description="Dynamically create & deploy custom audiences"
            />
            <CapabilityHint
              icon={<FlaskConical className="h-6 w-6" />}
              label="Simulation Studio"
              description="Predictive modeling & scenario planning, democratized"
            />
            <CapabilityHint
              icon={<Zap className="h-6 w-6" />}
              label="Action Queue"
              description="AI-curated insights, better HUMAN decisionmaking"
            />
          </div>
        </div>

        {/* Login form — centered below capabilities */}
        <div className="mt-12 w-full max-w-sm">
          <div className="omnivor-animate-slide-up">
            <div className="p-8 rounded-2xl bg-zinc-950/60 backdrop-blur-xl border border-primary/20 shadow-2xl shadow-primary/5">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold mb-2 text-zinc-50">
                  {mode === "login" ? "Sign In" : "Request Access"}
                </h2>
                <p className="text-sm text-zinc-400">
                  {mode === "login"
                    ? "Enter your credentials to continue"
                    : "Submit your details for admin approval"}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <InlineError message={error} />
                )}
                {success && (
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-400">
                    {success}
                  </div>
                )}

                <div className="space-y-2">
                  <Label
                    htmlFor="username"
                    className="text-xs font-semibold uppercase tracking-wider text-zinc-500"
                  >
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="admin@omnivorlabs.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    className="h-12 border-0 rounded-lg bg-zinc-950 text-zinc-50 focus-visible:ring-2"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-xs font-semibold uppercase tracking-wider text-zinc-500"
                  >
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-12 border-0 rounded-lg bg-zinc-950 text-zinc-50 focus-visible:ring-2"
                  />
                </div>

                <Button
                  type="submit"
                  variant="accent"
                  className="w-full h-12 text-base font-semibold rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {mode === "login" ? "Signing in..." : "Submitting..."}
                    </>
                  ) : (
                    <>
                      {mode === "login" ? "Sign In" : "Request Access"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {mode === "login"
                    ? "Need access? Request an account"
                    : "Already have an account? Sign in"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-6 text-center">
        <p className="text-xs text-zinc-500">
          {config.company.copyright}
        </p>
      </footer>
    </div>
  );
}

function CapabilityHint({
  icon,
  label,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <div className="space-y-2 opacity-60 hover:opacity-100 transition-opacity duration-200">
      <div className="mx-auto w-[2.875rem] h-[2.875rem] rounded-lg flex items-center justify-center bg-primary/15 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-50">
          {label}
        </p>
        <p className="text-xs text-zinc-400">
          {description}
        </p>
      </div>
    </div>
  );
}
