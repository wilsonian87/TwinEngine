/**
 * Knowledge Hooks
 *
 * React hooks for knowledge base operations.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ============================================================================
// TYPES
// ============================================================================

interface KnowledgeContent {
  id: string;
  title: string;
  content: string;
  contentType: string;
  source: string | null;
  sourceUrl: string | null;
  audienceContext: {
    audience?: string;
    specialty?: string;
    experienceLevel?: string;
  } | null;
  marketContext: {
    therapeuticArea?: string;
    brand?: string;
    competitors?: string[];
    marketStage?: string;
  } | null;
  channelContext: {
    primaryChannel?: string;
    format?: string;
    deliveryMode?: string;
  } | null;
  metadata: Record<string, unknown> | null;
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
}

interface KnowledgeSearchResult {
  id: string;
  title: string;
  content: string;
  contentType: string;
  source: string | null;
  similarity: number;
}

interface KnowledgeSearchFilters {
  contentType?: string;
  therapeuticArea?: string;
  audience?: string;
  specialty?: string;
}

interface KnowledgeStats {
  totalItems: number;
  byContentType: Record<string, number>;
  byTherapeuticArea: Record<string, number>;
  withEmbeddings: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function searchKnowledge(
  query: string,
  filters?: KnowledgeSearchFilters,
  limit?: number
): Promise<KnowledgeSearchResult[]> {
  const response = await fetch("/api/knowledge/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ query, filters, limit }),
  });

  if (!response.ok) {
    throw new Error("Failed to search knowledge base");
  }

  const data = await response.json();
  return data.results;
}

async function getKnowledgeItem(id: string): Promise<KnowledgeContent> {
  const response = await fetch(`/api/knowledge/${id}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to get knowledge item");
  }

  return response.json();
}

async function listKnowledge(options?: {
  limit?: number;
  offset?: number;
  contentType?: string;
}): Promise<KnowledgeContent[]> {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", options.limit.toString());
  if (options?.offset) params.set("offset", options.offset.toString());
  if (options?.contentType) params.set("contentType", options.contentType);

  const response = await fetch(`/api/knowledge?${params}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to list knowledge items");
  }

  const data = await response.json();
  return data.items;
}

async function getSimilarContent(id: string, limit?: number): Promise<KnowledgeSearchResult[]> {
  const params = limit ? `?limit=${limit}` : "";
  const response = await fetch(`/api/knowledge/${id}/similar${params}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to get similar content");
  }

  const data = await response.json();
  return data.similar;
}

async function getKnowledgeStats(): Promise<KnowledgeStats> {
  const response = await fetch("/api/knowledge/stats/overview", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to get knowledge stats");
  }

  return response.json();
}

async function createKnowledgeItem(
  data: Omit<KnowledgeContent, "id" | "createdAt" | "updatedAt">
): Promise<KnowledgeContent> {
  const response = await fetch("/api/knowledge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to create knowledge item");
  }

  return response.json();
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook for semantic search
 */
export function useKnowledgeSearch(
  query: string,
  options?: {
    filters?: KnowledgeSearchFilters;
    limit?: number;
    enabled?: boolean;
  }
) {
  const { filters, limit = 10, enabled = true } = options ?? {};

  return useQuery({
    queryKey: ["knowledge", "search", query, filters, limit],
    queryFn: () => searchKnowledge(query, filters, limit),
    enabled: enabled && query.length >= 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for getting a single knowledge item
 */
export function useKnowledgeItem(id: string | null) {
  return useQuery({
    queryKey: ["knowledge", "item", id],
    queryFn: () => getKnowledgeItem(id!),
    enabled: !!id,
  });
}

/**
 * Hook for listing knowledge items
 */
export function useKnowledgeList(options?: {
  limit?: number;
  offset?: number;
  contentType?: string;
}) {
  return useQuery({
    queryKey: ["knowledge", "list", options],
    queryFn: () => listKnowledge(options),
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook for finding similar content
 */
export function useSimilarContent(id: string | null, limit?: number) {
  return useQuery({
    queryKey: ["knowledge", "similar", id, limit],
    queryFn: () => getSimilarContent(id!, limit),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for knowledge base stats
 */
export function useKnowledgeStats() {
  return useQuery({
    queryKey: ["knowledge", "stats"],
    queryFn: getKnowledgeStats,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook for creating knowledge items
 */
export function useCreateKnowledge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createKnowledgeItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
    },
  });
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const KNOWLEDGE_CONTENT_TYPES = [
  { value: "research", label: "Research" },
  { value: "guideline", label: "Guideline" },
  { value: "campaign", label: "Campaign" },
  { value: "benchmark", label: "Benchmark" },
  { value: "market_research", label: "Market Research" },
  { value: "field_promotion", label: "Field Promotion" },
  { value: "market_access", label: "Market Access" },
  { value: "digital_media", label: "Digital Media" },
  { value: "advertising", label: "Advertising" },
  { value: "regulatory", label: "Regulatory" },
] as const;
