/**
 * PDF Export Hook
 *
 * Hook for generating and downloading PDF exports from the TwinEngine platform.
 * Supports simulation results, audience profiles, HCP profiles, and comparisons.
 */

import { useState, useCallback } from "react";
import { useToast } from "./use-toast";

// ============================================================================
// TYPES
// ============================================================================

export type ExportType = "simulation" | "audience" | "hcp-profile" | "comparison";

export interface ExportOptions {
  /** Custom title for the PDF */
  title?: string;
  /** Include confidential data markers */
  includeConfidential?: boolean;
  /** Custom subtitle */
  subtitle?: string;
}

interface ExportRequest {
  type: ExportType;
  entityId?: string;
  entityIds?: string[];
  options?: ExportOptions;
}

interface UseExportPDFResult {
  /** Trigger PDF export and download */
  exportPDF: () => Promise<void>;
  /** Whether export is in progress */
  isExporting: boolean;
  /** Error from last export attempt */
  error: Error | null;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for exporting entities to PDF
 *
 * @example
 * // Export a simulation
 * const { exportPDF, isExporting } = useExportPDF("simulation", simulationId, {
 *   title: "Q1 Campaign Simulation",
 * });
 *
 * @example
 * // Export a comparison
 * const { exportPDF, isExporting } = useExportPDF("comparison", undefined, {
 *   title: "Audience Comparison",
 * }, [audienceAId, audienceBId]);
 */
export function useExportPDF(
  type: ExportType,
  entityId?: string,
  options?: ExportOptions,
  entityIds?: string[]
): UseExportPDFResult {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const exportPDF = useCallback(async () => {
    setIsExporting(true);
    setError(null);

    try {
      const request: ExportRequest = {
        type,
        options,
      };

      if (entityId) {
        request.entityId = entityId;
      }

      if (entityIds && entityIds.length > 0) {
        request.entityIds = entityIds;
      }

      const response = await fetch("/api/exports/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `Export failed with status ${response.status}`
        );
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `omnivor_${type}_export.pdf`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Convert response to blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `${filename} has been downloaded.`,
      });
    } catch (err) {
      const exportError = err instanceof Error ? err : new Error("Export failed");
      setError(exportError);

      toast({
        title: "Export Failed",
        description: exportError.message,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [type, entityId, entityIds, options, toast]);

  return {
    exportPDF,
    isExporting,
    error,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get available export types from the API
 */
export async function getExportTypes(): Promise<
  Array<{
    type: ExportType;
    label: string;
    description: string;
    requiresEntityId?: boolean;
    requiresEntityIds?: boolean;
    entityCount?: number;
  }>
> {
  const response = await fetch("/api/exports/types", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch export types");
  }

  const data = await response.json();
  return data.types;
}

/**
 * Export multiple entities in a batch (creates separate PDFs)
 */
export async function batchExportPDF(
  exports: Array<{
    type: ExportType;
    entityId?: string;
    entityIds?: string[];
    options?: ExportOptions;
  }>
): Promise<void> {
  // Sequential export to avoid overwhelming the server
  for (const exportRequest of exports) {
    const response = await fetch("/api/exports/pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(exportRequest),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message ||
          `Export failed for ${exportRequest.type}: ${response.status}`
      );
    }

    // Download the file
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = `omnivor_${exportRequest.type}_export.pdf`;

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    // Small delay between downloads
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

// ============================================================================
// PRESET EXPORT HELPERS
// ============================================================================

/**
 * Export a simulation result to PDF
 */
export function useExportSimulation(simulationId: string, options?: ExportOptions) {
  return useExportPDF("simulation", simulationId, options);
}

/**
 * Export an audience profile to PDF
 */
export function useExportAudience(audienceId: string, options?: ExportOptions) {
  return useExportPDF("audience", audienceId, options);
}

/**
 * Export an HCP profile to PDF
 */
export function useExportHCPProfile(hcpId: string, options?: ExportOptions) {
  return useExportPDF("hcp-profile", hcpId, options);
}

/**
 * Export an audience comparison to PDF
 */
export function useExportComparison(
  audienceAId: string,
  audienceBId: string,
  options?: ExportOptions
) {
  return useExportPDF("comparison", undefined, options, [audienceAId, audienceBId]);
}
