/**
 * Sankey Data Transformation Utilities
 *
 * Converts raw HCP-like records into Sankey-compatible node/link structures
 * for journey flow visualization.
 *
 * @see sankey-flow.tsx
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SankeyNode {
  id: string;
  label: string;
  count: number;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
  channel?: string;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

/**
 * Minimal HCP record shape expected by the transformer.
 * Accepts any record with stage, previous stage, and optional channel fields.
 */
export interface HCPRecord {
  id: string;
  stage: string;
  previousStage?: string;
  channel?: string;
}

// ============================================================================
// TRANSFORMATION
// ============================================================================

/**
 * Transform raw HCP records into Sankey-compatible node and link data.
 *
 * Groups records by stage transitions, counting how many HCPs moved
 * between each pair of stages, optionally broken out by channel.
 */
export function transformToSankeyData(records: HCPRecord[]): SankeyData {
  const nodeCounts = new Map<string, number>();
  const linkMap = new Map<string, { source: string; target: string; value: number; channel?: string }>();

  for (const record of records) {
    // Count nodes by current stage
    nodeCounts.set(record.stage, (nodeCounts.get(record.stage) ?? 0) + 1);

    // Count previous stage if present
    if (record.previousStage) {
      nodeCounts.set(
        record.previousStage,
        (nodeCounts.get(record.previousStage) ?? 0),
      );

      // Build link key including channel for granularity
      const linkKey = `${record.previousStage}|${record.stage}|${record.channel ?? ""}`;
      const existing = linkMap.get(linkKey);

      if (existing) {
        existing.value += 1;
      } else {
        linkMap.set(linkKey, {
          source: record.previousStage,
          target: record.stage,
          value: 1,
          channel: record.channel,
        });
      }
    }
  }

  const nodes: SankeyNode[] = Array.from(nodeCounts.entries()).map(
    ([id, count]) => ({
      id,
      label: id,
      count,
    }),
  );

  const links: SankeyLink[] = Array.from(linkMap.values());

  return { nodes, links };
}
