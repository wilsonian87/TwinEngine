import { NLAudienceBuilder } from "@/components/nl-audience-builder";

export default function AudienceBuilder() {
  return (
    <div className="h-full overflow-auto">
      <div className="sticky top-0 z-10 border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold" data-testid="text-page-title">Audience Builder</h1>
            <p className="text-sm text-muted-foreground">
              Build and explore HCP audiences using natural language
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <NLAudienceBuilder />
      </div>
    </div>
  );
}
