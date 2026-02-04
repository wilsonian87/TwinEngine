/**
 * Regulatory Sync Agent
 *
 * Orchestrator that extends BaseAgent to run all regulatory data adapters,
 * upsert events into the database, and log sync results.
 */
import {
  BaseAgent,
  type AgentInput,
  type AgentOutput,
  type AgentContext,
  type AgentType,
} from "../agents/base-agent";
import { regulatoryStorage } from "../../storage/regulatory-storage";
import { openFDAAdapter } from "./openfda-adapter";
import { clinicalTrialsAdapter } from "./clinicaltrials-adapter";
import { federalRegisterAdapter } from "./federal-register-adapter";
import { orangeBookAdapter } from "./orange-book-adapter";
import type { InsertRegulatoryEvent, RegulatoryDataSource } from "@shared/schema";

export interface RegulatorySyncInput extends AgentInput {
  sources?: RegulatoryDataSource[];
}

interface AdapterResult {
  source: RegulatoryDataSource;
  events: InsertRegulatoryEvent[];
  error?: string;
}

export class RegulatorySyncAgent extends BaseAgent<RegulatorySyncInput> {
  readonly type = "regulatory_sync" as AgentType;
  readonly name = "Regulatory Sync Agent";
  readonly description = "Syncs regulatory events from public FDA and clinical trial data sources";
  readonly version = "1.0.0";

  getInputSchema() {
    return {
      sources: {
        type: "array",
        required: false,
        description: "Optional list of sources to sync. Defaults to all sources.",
      },
    };
  }

  async execute(input: RegulatorySyncInput, context: AgentContext): Promise<AgentOutput> {
    const sources = input.sources ?? ["openfda", "clinicaltrials", "federal_register", "orange_book"];

    this.logger.info(`Starting regulatory sync for sources: ${sources.join(", ")}`);

    let totalCreated = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const source of sources) {
      const syncLog = await regulatoryStorage.createSyncLog({
        source,
        status: "running",
        startedAt: new Date(),
      });

      let result: AdapterResult;
      try {
        result = await this.fetchFromSource(source);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Adapter ${source} failed: ${errMsg}`);
        await regulatoryStorage.updateSyncLog(syncLog.id, {
          status: "failed",
          completedAt: new Date(),
          errorMessage: errMsg,
        });
        totalErrors++;
        continue;
      }

      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const eventData of result.events) {
        try {
          const { action } = await regulatoryStorage.upsertEvent(eventData);
          if (action === "created") created++;
          else if (action === "updated") updated++;
          else skipped++;
        } catch (error) {
          this.logger.error(`Failed to upsert event: ${error}`);
          skipped++;
        }
      }

      await regulatoryStorage.updateSyncLog(syncLog.id, {
        status: result.error ? "partial" : "completed",
        completedAt: new Date(),
        eventsFound: result.events.length,
        eventsCreated: created,
        eventsUpdated: updated,
        eventsSkipped: skipped,
        errorMessage: result.error ?? null,
      });

      totalCreated += created;
      totalUpdated += updated;
      totalSkipped += skipped;

      this.logger.info(`Source ${source}: found=${result.events.length} created=${created} updated=${updated} skipped=${skipped}`);
    }

    return {
      success: totalErrors < sources.length,
      summary: `Regulatory sync complete: ${totalCreated} created, ${totalUpdated} updated, ${totalSkipped} skipped, ${totalErrors} source errors`,
      metrics: {
        totalCreated,
        totalUpdated,
        totalSkipped,
        totalErrors,
        sourcesProcessed: sources.length,
      },
    };
  }

  private async fetchFromSource(source: RegulatoryDataSource): Promise<AdapterResult> {
    switch (source) {
      case "openfda":
        return { source, events: await openFDAAdapter.fetchEvents() };
      case "clinicaltrials":
        return { source, events: await clinicalTrialsAdapter.fetchEvents() };
      case "federal_register":
        return { source, events: await federalRegisterAdapter.fetchEvents() };
      case "orange_book":
        return { source, events: await orangeBookAdapter.fetchEvents() };
      default:
        return { source, events: [], error: `Unknown source: ${source}` };
    }
  }
}

export const regulatorySyncAgent = new RegulatorySyncAgent();
