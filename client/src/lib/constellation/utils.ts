/**
 * Constellation Utilities
 *
 * Phase 10H.2: Helper functions for constellation navigation and analysis.
 */

import type { ConstellationNode } from '@/stores/constellationStore';

/**
 * Compute the centroid (geometric center) of a set of nodes.
 *
 * @param nodes - Array of nodes with position data
 * @returns Centroid position as [x, y, z] tuple
 */
export function computeCentroid(
  nodes: Pick<ConstellationNode, 'position'>[]
): [number, number, number] {
  if (nodes.length === 0) {
    return [0, 0, 0];
  }

  let sumX = 0;
  let sumY = 0;
  let sumZ = 0;

  for (const node of nodes) {
    sumX += node.position[0];
    sumY += node.position[1];
    sumZ += node.position[2];
  }

  return [
    sumX / nodes.length,
    sumY / nodes.length,
    sumZ / nodes.length,
  ];
}

/**
 * Get nodes belonging to a specific channel.
 *
 * @param nodes - All constellation nodes
 * @param channelId - Channel identifier to filter by
 * @returns Filtered array of nodes
 */
export function getNodesByChannel(
  nodes: ConstellationNode[],
  channelId: string
): ConstellationNode[] {
  return nodes.filter(
    (node) => node.type === 'hcp' && node.channel === channelId
  );
}

/**
 * Get the channel node for a given channel ID.
 *
 * @param nodes - All constellation nodes
 * @param channelId - Channel identifier
 * @returns Channel node or undefined
 */
export function getChannelNode(
  nodes: ConstellationNode[],
  channelId: string
): ConstellationNode | undefined {
  return nodes.find(
    (node) => node.type === 'channel' && node.id === channelId
  );
}

/**
 * Find the parent channel for an HCP node.
 *
 * @param hcpNode - HCP node to find parent for
 * @returns Channel ID or null
 */
export function getParentChannel(hcpNode: ConstellationNode): string | null {
  if (hcpNode.type !== 'hcp') return null;
  return hcpNode.channel || null;
}
