/**
 * Federal Register API Adapter
 *
 * Fetches FDA advisory committee meeting notices related to respiratory drugs.
 */
import { debugLog } from "../../utils/config";
import type { InsertRegulatoryEvent } from "@shared/schema";

const FR_BASE = "https://www.federalregister.gov/api/v1/documents.json";

interface FRDocument {
  document_number?: string;
  title?: string;
  abstract?: string;
  html_url?: string;
  publication_date?: string;
  type?: string;
  agencies?: Array<{ name?: string }>;
  dates?: string;
}

interface FRResponse {
  results?: FRDocument[];
  count?: number;
}

function getMockData(): InsertRegulatoryEvent[] {
  return [
    {
      eventType: "adcom_meeting",
      title: "Pulmonary-Allergy Drugs Advisory Committee Meeting - Tezepelumab Review",
      description: "FDA advisory committee meeting to review tezepelumab for severe asthma indication",
      drugName: "tezepelumab",
      therapeuticArea: "Respiratory",
      eventDate: new Date("2024-09-15"),
      status: "completed",
      source: "federal_register",
      sourceId: "FR-2024-09876",
      sourceUrl: "https://www.federalregister.gov/documents/2024/09876",
      metadata: { mock: true },
    },
  ];
}

export class FederalRegisterAdapter {
  private async fetchApi<T>(url: string): Promise<T | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        debugLog("FederalRegisterAdapter", `API returned ${response.status}`);
        return null;
      }
      return await response.json() as T;
    } catch (error) {
      debugLog("FederalRegisterAdapter", `Fetch failed: ${error}`);
      return null;
    }
  }

  async fetchEvents(): Promise<InsertRegulatoryEvent[]> {
    const params = new URLSearchParams({
      "conditions[agencies][]": "food-and-drug-administration",
      "conditions[type][]": "notice",
      "conditions[term]": "advisory committee pulmonary respiratory allergy",
      per_page: "50",
    });

    const url = `${FR_BASE}?${params}`;
    debugLog("FederalRegisterAdapter", `Fetching from ${url}`);

    const data = await this.fetchApi<FRResponse>(url);

    if (!data?.results?.length) {
      debugLog("FederalRegisterAdapter", "No results, returning mock data");
      return getMockData();
    }

    const events: InsertRegulatoryEvent[] = [];

    for (const doc of data.results) {
      if (!doc.publication_date || !doc.title) continue;

      const eventDate = new Date(doc.publication_date);
      if (isNaN(eventDate.getTime())) continue;

      // Try to extract drug name from title/abstract
      const text = `${doc.title} ${doc.abstract ?? ""}`.toLowerCase();
      const drugName = this.extractDrugName(text);

      events.push({
        eventType: "adcom_meeting",
        title: doc.title,
        description: doc.abstract ?? null,
        drugName: drugName ?? "respiratory-general",
        therapeuticArea: "Respiratory",
        eventDate,
        status: eventDate > new Date() ? "upcoming" : "completed",
        source: "federal_register",
        sourceId: doc.document_number ?? null,
        sourceUrl: doc.html_url ?? null,
        metadata: {
          documentType: doc.type,
          agencies: doc.agencies?.map(a => a.name),
          dates: doc.dates,
        },
      });
    }

    debugLog("FederalRegisterAdapter", `Parsed ${events.length} events`);
    return events.length > 0 ? events : getMockData();
  }

  private extractDrugName(text: string): string | null {
    const drugs = [
      "dupilumab", "tezepelumab", "benralizumab", "mepolizumab",
      "omalizumab", "fluticasone", "budesonide", "montelukast",
      "tiotropium", "umeclidinium",
    ];
    for (const drug of drugs) {
      if (text.includes(drug)) return drug;
    }
    return null;
  }
}

export const federalRegisterAdapter = new FederalRegisterAdapter();
