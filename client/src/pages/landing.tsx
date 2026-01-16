import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Activity, Users, BarChart3, Sparkles, Shield, Zap } from "lucide-react";

interface ValidateResponse {
  success?: boolean;
  error?: string;
  label?: string;
  email?: string;
}

export default function Landing() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/invite/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data: ValidateResponse = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Invalid invite code");
      }
      return data;
    },
    onSuccess: () => {
      // Invalidate session query to trigger re-check and show main app
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Header */}
      <header className="relative z-10 p-6">
        <div className="flex items-center gap-2">
          <Activity className="h-8 w-8 text-blue-400" />
          <span className="text-2xl font-bold text-white">TwinEngine</span>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Hero content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm">
                <Sparkles className="h-4 w-4" />
                AI-Powered HCP Analytics
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
                Digital Twin Simulation for{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                  Healthcare Engagement
                </span>
              </h1>
              <p className="text-lg text-slate-300 max-w-lg">
                Predict, simulate, and optimize your HCP engagement strategies with
                AI-powered analytics built for life sciences.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-2 gap-4">
              <FeatureCard
                icon={<Users className="h-5 w-5" />}
                title="HCP Profiling"
                description="Deep insights into healthcare professional behavior"
              />
              <FeatureCard
                icon={<BarChart3 className="h-5 w-5" />}
                title="Predictive Simulation"
                description="What-if scenarios for campaign optimization"
              />
              <FeatureCard
                icon={<Zap className="h-5 w-5" />}
                title="Channel Intelligence"
                description="Optimize omnichannel engagement mix"
              />
              <FeatureCard
                icon={<Shield className="h-5 w-5" />}
                title="Enterprise Ready"
                description="Built for pharma compliance requirements"
              />
            </div>

            {/* Trust signals */}
            <div className="flex items-center gap-6 pt-4 border-t border-slate-700">
              <div className="text-sm text-slate-400">Built for Life Sciences</div>
              <div className="h-4 w-px bg-slate-700" />
              <div className="text-sm text-slate-400">SOC 2 Compliant Architecture</div>
            </div>
          </div>

          {/* Right side - Gate form */}
          <div className="flex justify-center lg:justify-end">
            <Card className="w-full max-w-md bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-white">Request Access</CardTitle>
                <CardDescription className="text-slate-400">
                  Enter your email and invite code to access the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-200">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="code" className="text-slate-200">
                      Invite Code
                    </Label>
                    <Input
                      id="code"
                      type="text"
                      placeholder="Enter your invite code"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      required
                      className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 uppercase"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                    disabled={validateMutation.isPending}
                  >
                    {validateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      "Access Platform"
                    )}
                  </Button>

                  <p className="text-xs text-center text-slate-500 pt-2">
                    Don't have an invite code?{" "}
                    <a href="mailto:demo@twinengine.ai" className="text-blue-400 hover:underline">
                      Request access
                    </a>
                  </p>

                  {/* Dev mode skip button */}
                  {import.meta.env.DEV && (
                    <div className="pt-4 border-t border-slate-700 mt-4">
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full text-slate-400 hover:text-white hover:bg-slate-700"
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
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-6 text-center text-sm text-slate-500">
        <p>&copy; {new Date().getFullYear()} TwinEngine. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 space-y-2">
      <div className="text-blue-400">{icon}</div>
      <h3 className="font-medium text-white">{title}</h3>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  );
}
