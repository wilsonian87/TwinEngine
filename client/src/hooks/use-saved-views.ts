import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// ============================================================================
// TYPES
// ============================================================================

export interface SavedView {
  id: string;
  userId: string;
  name: string;
  viewType: string;
  filters: Record<string, unknown>;
  columns: string[] | null;
  sort: { field: string; direction: "asc" | "desc" } | null;
  isDefault: boolean;
  shared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaveViewInput {
  name: string;
  filters?: Record<string, unknown>;
  columns?: string[];
  sort?: { field: string; direction: "asc" | "desc" };
  isDefault?: boolean;
  shared?: boolean;
}

interface ViewsResponse {
  views: SavedView[];
  total: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function fetchViews(viewType: string): Promise<ViewsResponse> {
  const res = await fetch(`/api/views?type=${encodeURIComponent(viewType)}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch views");
  }
  return res.json();
}

async function createView(data: SaveViewInput & { viewType: string }): Promise<SavedView> {
  const res = await apiRequest("POST", "/api/views", data);
  return res.json();
}

async function updateView(id: string, data: Partial<SaveViewInput>): Promise<SavedView> {
  const res = await apiRequest("PUT", `/api/views/${id}`, data);
  return res.json();
}

async function deleteView(id: string): Promise<void> {
  await apiRequest("DELETE", `/api/views/${id}`);
}

async function setDefaultView(id: string): Promise<SavedView> {
  const res = await apiRequest("POST", `/api/views/${id}/default`);
  return res.json();
}

// ============================================================================
// HOOK
// ============================================================================

export function useSavedViews(viewType: string) {
  const queryClient = useQueryClient();
  const queryKey = ["saved-views", viewType];

  // Fetch views for this type
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ViewsResponse>({
    queryKey,
    queryFn: () => fetchViews(viewType),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const views = data?.views || [];
  const defaultView = views.find((v) => v.isDefault);

  // Save new view
  const saveView = useMutation({
    mutationFn: (input: SaveViewInput) => createView({ ...input, viewType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Update existing view
  const updateViewMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SaveViewInput> }) =>
      updateView(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Delete view
  const deleteViewMutation = useMutation({
    mutationFn: (id: string) => deleteView(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Set as default
  const setDefault = useMutation({
    mutationFn: (viewId: string) => setDefaultView(viewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    views,
    defaultView,
    isLoading,
    isError,
    error,
    refetch,
    saveView,
    updateView: updateViewMutation,
    deleteView: deleteViewMutation,
    setDefault,
  };
}
