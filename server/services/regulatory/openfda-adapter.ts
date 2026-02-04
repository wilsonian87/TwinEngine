/**
 * openFDA Drugs@FDA Adapter
 *
 * Fetches drug approval and labeling data from the public openFDA API.
 * Filters to respiratory therapeutic area drugs.
 */
import { debugLog } from "../../utils/config";
import type { InsertRegulatoryEvent } from "@shared/schema";

const OPENFDA_BASE = "https://api.fda.gov/drug/drugsfda.json";

const RESPIRATORY_DRUGS = [
  "dupilumab", "tezepelumab", "benralizumab", "mepolizumab",
  "omalizumab", "fluticasone", "budesonide", "montelukast",
  "tiotropium", "umeclidinium",
];

const SEARCH_QUERY = RESPIRATORY_DRUGS.map(d => `"${d}"`).join("+");

interface OpenFDAResult {
  results?: Array<{
    application_number?: string;
    sponsor_name?: string;
    openfda?: {
      brand_name?: string[];
      generic_name?: string[];
    };
    products?: Array<{
      brand_name?: string;
      active_ingredients?: Array<{ name: string }>;
    }>;
    submissions?: Array<{
      submission_type?: string;
      submission_number?: string;
      submission_status?: string;
      submission_status_date?: string;
      review_priority?: string;
      application_docs?: Array<{
        id?: string;
        url?: string;
        title?: string;
        type?: string;
      }>;
    }>;
  }>;
}

function getMockData(): InsertRegulatoryEvent[] {
  return [
    {
      eventType: "approval",
      title: "Dupixent (dupilumab) - Original Approval",
      description: "FDA approval of dupilumab for moderate-to-severe atopic dermatitis and asthma",
      drugName: "dupilumab",
      brandName: "Dupixent",
      companyName: "Regeneron/Sanofi",
      therapeuticArea: "Respiratory",
      eventDate: new Date("2017-03-28"),
      status: "completed",
      source: "openfda",
      sourceId: "BLA761055-ORIG-1",
      metadata: { mock: true },
    },
    {
      eventType: "label_update",
      title: "Tezspire (tezepelumab) - Supplemental Approval",
      description: "Label update for tezepelumab with expanded indications",
      drugName: "tezepelumab",
      brandName: "Tezspire",
      companyName: "AstraZeneca/Amgen",
      therapeuticArea: "Respiratory",
      eventDate: new Date("2024-02-15"),
      status: "completed",
      source: "openfda",
      sourceId: "BLA761224-SUPPL",
      metadata: { mock: true },
    },
  ];
}

export class OpenFDAAdapter {
  private async fetchApi<T>(url: string): Promise<T | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        debugLog("OpenFDAAdapter", `API returned ${response.status}`);
        return null;
      }
      return await response.json() as T;
    } catch (error) {
      debugLog("OpenFDAAdapter", `Fetch failed: ${error}`);
      return null;
    }
  }

  async fetchEvents(): Promise<InsertRegulatoryEvent[]> {
    const url = `${OPENFDA_BASE}?search=openfda.generic_name:(${SEARCH_QUERY})&limit=100`;
    debugLog("OpenFDAAdapter", `Fetching from ${url}`);

    const data = await this.fetchApi<OpenFDAResult>(url);

    if (!data?.results) {
      debugLog("OpenFDAAdapter", "No results, returning mock data");
      return getMockData();
    }

    const events: InsertRegulatoryEvent[] = [];

    for (const result of data.results) {
      const genericName = result.openfda?.generic_name?.[0] ?? result.products?.[0]?.active_ingredients?.[0]?.name ?? "Unknown";
      const brandName = result.openfda?.brand_name?.[0] ?? result.products?.[0]?.brand_name;
      const appNumber = result.application_number;

      for (const sub of result.submissions ?? []) {
        if (!sub.submission_status_date) continue;

        const eventType = sub.submission_type === "ORIG" ? "approval"
          : sub.submission_type === "SUPPL" ? "label_update"
          : null;

        if (!eventType) continue;

        const dateStr = sub.submission_status_date;
        const eventDate = new Date(
          `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`
        );

        if (isNaN(eventDate.getTime())) continue;

        events.push({
          eventType,
          title: `${brandName ?? genericName} - ${sub.submission_type} ${sub.submission_number ?? ""}`.trim(),
          description: `${sub.submission_type} submission for ${genericName}. Status: ${sub.submission_status ?? "unknown"}. Priority: ${sub.review_priority ?? "unknown"}`,
          drugName: genericName.toLowerCase(),
          brandName: brandName ?? null,
          companyName: result.sponsor_name ?? null,
          therapeuticArea: "Respiratory",
          eventDate,
          status: sub.submission_status === "AP" ? "completed" : "active",
          source: "openfda",
          sourceId: `${appNumber}-${sub.submission_type}-${sub.submission_number}`,
          sourceUrl: sub.application_docs?.[0]?.url ?? null,
          applicationNumber: appNumber ?? null,
          metadata: {
            reviewPriority: sub.review_priority,
            submissionStatus: sub.submission_status,
          },
        });
      }
    }

    debugLog("OpenFDAAdapter", `Parsed ${events.length} events from openFDA`);
    return events.length > 0 ? events : getMockData();
  }
}

export const openFDAAdapter = new OpenFDAAdapter();
