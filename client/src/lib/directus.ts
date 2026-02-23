/**
 * Directus CMS Client
 *
 * Lightweight client for fetching public content from the Directus CMS.
 * No SDK dependency — uses plain fetch against the public REST API.
 * All collections have public read access; no auth token needed.
 */

const DIRECTUS_URL = import.meta.env.VITE_DIRECTUS_URL || "";

interface SiteCopyItem {
  id: number;
  key: string;
  value: string;
  page: string | null;
  locale: string;
  notes: string | null;
}

interface FeatureFlagItem {
  id: number;
  key: string;
  enabled: boolean;
  description: string | null;
  target_app: string;
}

interface AnnouncementItem {
  id: number;
  title: string;
  body: string | null;
  active: boolean;
  start_date: string | null;
  end_date: string | null;
  target_app: string;
}

export type { SiteCopyItem, FeatureFlagItem, AnnouncementItem };

/**
 * Fetch items from a Directus collection.
 * Returns empty array if Directus is unreachable (graceful degradation).
 */
async function fetchCollection<T>(
  collection: string,
  params?: Record<string, string>
): Promise<T[]> {
  if (!DIRECTUS_URL) return [];

  const url = new URL(`/items/${collection}`, DIRECTUS_URL);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    // Directus unreachable — return empty so fallback strings kick in
    return [];
  }
}

/** Fetch all site copy entries, optionally filtered by page */
export async function fetchSiteCopy(page?: string): Promise<SiteCopyItem[]> {
  const params: Record<string, string> = { limit: "-1" };
  if (page) {
    params["filter[page][_eq]"] = page;
  }
  return fetchCollection<SiteCopyItem>("site_copy", params);
}

/** Fetch all CMS feature flags for a given app */
export async function fetchCmsFeatureFlags(
  targetApp = "twinengine"
): Promise<FeatureFlagItem[]> {
  return fetchCollection<FeatureFlagItem>("feature_flags", {
    "filter[target_app][_eq]": targetApp,
    limit: "-1",
  });
}

/** Fetch active announcements for a given app */
export async function fetchAnnouncements(
  targetApp = "twinengine"
): Promise<AnnouncementItem[]> {
  return fetchCollection<AnnouncementItem>("announcements", {
    "filter[target_app][_eq]": targetApp,
    "filter[active][_eq]": "true",
    limit: "-1",
  });
}
