/**
 * OmniVor Labs Splash Page
 *
 * Brand-first entry point with:
 * - Heavy Extended wordmark
 * - Rotating taglines (session-based)
 * - Hero glow animation
 * - Branded invite code form
 */

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineError } from "@/components/ui/error-state";
import { Loader2, ArrowRight, Hexagon, Search, Users, FlaskConical, Zap } from "lucide-react";
import { WordmarkDisplay, LogoIcon, useBrand } from "@/components/brand";
import { BRAND_CONFIG } from "@/lib/brand-config";
import { cn } from "@/lib/utils";

interface ValidateResponse {
  success?: boolean;
  error?: string;
  label?: string;
  email?: string;
}

export default function Landing() {
  const queryClient = useQueryClient();
  const { currentTagline, config } = useBrand();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [taglineVisible, setTaglineVisible] = useState(false);

  // Animate tagline on mount
  useEffect(() => {
    const timer = setTimeout(() => setTaglineVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const validateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/invite/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data: ValidateResponse = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Access denied");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    validateMutation.mutate();
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-zinc-950 dark">
      {/* Hero Glow Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Central glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] omnivor-hero-glow bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,_hsl(var(--primary)/0.25),_transparent)]" />
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

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-5xl">
          {/* Hero Section */}
          <div className="text-center mb-16 space-y-8">
            {/* Wordmark */}
            <div className="omnivor-animate-in">
              <WordmarkDisplay />
            </div>

            {/* Tagline with fade animation */}
            <div
              className={cn(
                "transition-all duration-700 ease-out",
                taglineVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
              )}
            >
              <p className="text-xl md:text-2xl font-light tracking-wide text-zinc-50/70">
                {currentTagline}
              </p>
            </div>

            {/* Subtle divider */}
            <div className="flex items-center justify-center gap-4 pt-4">
              <div className="h-px w-16 bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
              <Hexagon className="h-4 w-4 text-primary" />
              <div className="h-px w-16 bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
            </div>
          </div>

          {/* Access Form Card */}
          <div className="max-w-md mx-auto omnivor-animate-slide-up">
            <div className="p-8 rounded-2xl bg-zinc-950/85 backdrop-blur-xl border border-primary/20">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold mb-2 text-zinc-50">
                  Access {config.product.name}
                </h2>
                <p className="text-sm text-zinc-400">
                  Enter your credentials to connect
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <InlineError message={error} />
                )}

                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-xs font-semibold uppercase tracking-wider text-zinc-500"
                  >
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 border-0 rounded-lg bg-zinc-950 text-zinc-50 focus-visible:ring-2"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="code"
                    className="text-xs font-semibold uppercase tracking-wider text-zinc-500"
                  >
                    Invite Code
                  </Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="XXXX-XXXX"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    required
                    className="h-12 border-0 rounded-lg uppercase tracking-widest text-center font-mono bg-zinc-950 text-zinc-50 focus-visible:ring-2"
                  />
                </div>

                <Button
                  type="submit"
                  variant="accent"
                  className="w-full h-12 text-base font-semibold rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  disabled={validateMutation.isPending}
                >
                  {validateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Connect
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="text-xs text-center pt-2 text-zinc-500">
                  Need an invite?{" "}
                  <a
                    href="mailto:access@omnivorlabs.com"
                    className="text-primary hover:underline transition-colors"
                  >
                    Request access
                  </a>
                </p>

                {/* Dev mode skip */}
                {import.meta.env.DEV && (
                  <div className="pt-4 mt-4 border-t border-zinc-800">
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-xs text-zinc-400"
                      onClick={async () => {
                        const response = await fetch("/api/invite/dev-bypass", {
                          method: "POST",
                        });
                        if (response.ok) {
                          queryClient.invalidateQueries({ queryKey: ["session"] });
                        }
                      }}
                    >
                      Skip (Dev Mode)
                    </Button>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Capability Hints */}
          <div className="mt-16 max-w-3xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <CapabilityHint
                icon={<Search className="h-5 w-5" />}
                label="HCP Explorer"
                description="HCP exploration"
              />
              <CapabilityHint
                icon={<Users className="h-5 w-5" />}
                label="Audience Builder"
                description="Audience building"
              />
              <CapabilityHint
                icon={<FlaskConical className="h-5 w-5" />}
                label="Simulation Studio"
                description="Campaign simulation"
              />
              <CapabilityHint
                icon={<Zap className="h-5 w-5" />}
                label="Action Queue"
                description="Next best actions"
              />
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
      <div className="mx-auto w-10 h-10 rounded-lg flex items-center justify-center bg-primary/15 text-primary">
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
