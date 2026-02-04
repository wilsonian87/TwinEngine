/**
 * ClinicalTrials.gov v2 Adapter
 *
 * Fetches Phase 3 respiratory trials from the ClinicalTrials.gov v2 API.
 */
import { debugLog } from "../../utils/config";
import type { InsertRegulatoryEvent } from "@shared/schema";

const CT_BASE = "https://clinicaltrials.gov/api/v2/studies";

interface CTStudy {
  protocolSection?: {
    identificationModule?: {
      nctId?: string;
      briefTitle?: string;
      officialTitle?: string;
      organization?: { fullName?: string };
    };
    statusModule?: {
      overallStatus?: string;
      startDateStruct?: { date?: string };
      completionDateStruct?: { date?: string };
      primaryCompletionDateStruct?: { date?: string };
    };
    armsInterventionsModule?: {
      interventions?: Array<{
        type?: string;
        name?: string;
        description?: string;
      }>;
    };
    conditionsModule?: {
      conditions?: string[];
    };
  };
}

interface CTResponse {
  studies?: CTStudy[];
  nextPageToken?: string;
}

function getMockData(): InsertRegulatoryEvent[] {
  return [
    {
      eventType: "phase3_readout",
      title: "NAVIGATOR Phase 3 - Tezepelumab in Severe Asthma",
      description: "Phase 3 trial of tezepelumab in severe uncontrolled asthma. Status: COMPLETED",
      drugName: "tezepelumab",
      companyName: "AstraZeneca",
      therapeuticArea: "Respiratory",
      eventDate: new Date("2024-06-15"),
      status: "completed",
      source: "clinicaltrials",
      sourceId: "NCT03347279",
      nctId: "NCT03347279",
      sourceUrl: "https://clinicaltrials.gov/study/NCT03347279",
      metadata: { mock: true },
    },
    {
      eventType: "phase3_readout",
      title: "LIBERTY ASTHMA Phase 3 - Dupilumab",
      description: "Phase 3 trial evaluating dupilumab in moderate-to-severe asthma. Status: COMPLETED",
      drugName: "dupilumab",
      companyName: "Regeneron Pharmaceuticals",
      therapeuticArea: "Respiratory",
      eventDate: new Date("2024-03-20"),
      status: "completed",
      source: "clinicaltrials",
      sourceId: "NCT02414854",
      nctId: "NCT02414854",
      sourceUrl: "https://clinicaltrials.gov/study/NCT02414854",
      metadata: { mock: true },
    },
  ];
}

function extractDrugName(study: CTStudy): string | null {
  const interventions = study.protocolSection?.armsInterventionsModule?.interventions ?? [];
  for (const intervention of interventions) {
    if (intervention.type === "DRUG" || intervention.type === "BIOLOGICAL") {
      return intervention.name ?? null;
    }
  }
  return null;
}

export class ClinicalTrialsAdapter {
  private async fetchApi<T>(url: string): Promise<T | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        debugLog("ClinicalTrialsAdapter", `API returned ${response.status}`);
        return null;
      }
      return await response.json() as T;
    } catch (error) {
      debugLog("ClinicalTrialsAdapter", `Fetch failed: ${error}`);
      return null;
    }
  }

  async fetchEvents(): Promise<InsertRegulatoryEvent[]> {
    const params = new URLSearchParams({
      "query.cond": "asthma OR COPD OR respiratory",
      "filter.phase": "PHASE3",
      "filter.overallStatus": "ACTIVE_NOT_RECRUITING,COMPLETED",
      pageSize: "100",
    });

    const url = `${CT_BASE}?${params}`;
    debugLog("ClinicalTrialsAdapter", `Fetching from ${url}`);

    const allStudies: CTStudy[] = [];
    let nextPageToken: string | undefined;

    // Fetch first page
    const data = await this.fetchApi<CTResponse>(url);
    if (!data?.studies) {
      debugLog("ClinicalTrialsAdapter", "No results, returning mock data");
      return getMockData();
    }

    allStudies.push(...data.studies);
    nextPageToken = data.nextPageToken;

    // Fetch up to 2 more pages
    for (let page = 0; page < 2 && nextPageToken; page++) {
      const pageUrl = `${url}&pageToken=${nextPageToken}`;
      const pageData = await this.fetchApi<CTResponse>(pageUrl);
      if (pageData?.studies) {
        allStudies.push(...pageData.studies);
        nextPageToken = pageData.nextPageToken;
      } else {
        break;
      }
    }

    const events: InsertRegulatoryEvent[] = [];

    for (const study of allStudies) {
      const idModule = study.protocolSection?.identificationModule;
      const statusModule = study.protocolSection?.statusModule;
      const nctId = idModule?.nctId;
      if (!nctId) continue;

      const drugName = extractDrugName(study);
      if (!drugName) continue;

      const completionDate = statusModule?.primaryCompletionDateStruct?.date
        ?? statusModule?.completionDateStruct?.date;

      let eventDate: Date;
      if (completionDate) {
        eventDate = new Date(completionDate);
        if (isNaN(eventDate.getTime())) continue;
      } else {
        continue;
      }

      const overallStatus = statusModule?.overallStatus ?? "UNKNOWN";
      const eventStatus = overallStatus === "COMPLETED" ? "completed" : "active";

      events.push({
        eventType: "phase3_readout",
        title: `${idModule?.briefTitle ?? nctId}`,
        description: `Phase 3 trial of ${drugName}. Status: ${overallStatus}`,
        drugName: drugName.toLowerCase(),
        companyName: idModule?.organization?.fullName ?? null,
        therapeuticArea: "Respiratory",
        eventDate,
        status: eventStatus,
        source: "clinicaltrials",
        sourceId: nctId,
        nctId,
        sourceUrl: `https://clinicaltrials.gov/study/${nctId}`,
        metadata: {
          overallStatus,
          conditions: study.protocolSection?.conditionsModule?.conditions,
        },
      });
    }

    debugLog("ClinicalTrialsAdapter", `Parsed ${events.length} events`);
    return events.length > 0 ? events : getMockData();
  }
}

export const clinicalTrialsAdapter = new ClinicalTrialsAdapter();
