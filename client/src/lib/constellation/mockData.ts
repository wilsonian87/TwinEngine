/**
 * Mock Data Generator for Constellation Visualization
 *
 * Generates pharma-realistic demo scenario: "Digital Fatigue vs. Physical Access"
 * Distribution: 60% Healthy (Webinars) / 25% Warning (Email) / 15% Critical (Field)
 */

import type { ConstellationNode, ConstellationEdge, NodeStatus } from './types';

interface ChannelConfig {
  name: string;
  status: NodeStatus;
  weight: number;
}

const CHANNELS: Record<string, ChannelConfig> = {
  webinar: { name: 'Webinars & Conferences', status: 'healthy', weight: 0.6 },
  email: { name: 'Email / Digital', status: 'warning', weight: 0.25 },
  field: { name: 'Field Force / MSLs', status: 'critical', weight: 0.15 },
};

const SPECIALTIES = [
  'Oncology',
  'Cardiology',
  'Neurology',
  'Endocrinology',
  'Rheumatology',
  'Gastroenterology',
  'Pulmonology',
  'Dermatology',
];

const FIRST_NAMES = [
  'Smith', 'Johnson', 'Chen', 'Garcia', 'Kim', 'Patel', 'Williams', 'Brown',
  'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Lee', 'White', 'Harris', 'Clark',
];

const LAST_INITS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S'];

function generateName(index: number): string {
  return `${FIRST_NAMES[index % FIRST_NAMES.length]} ${LAST_INITS[index % LAST_INITS.length]}.`;
}

function generateEngagementScore(status: NodeStatus): number {
  switch (status) {
    case 'healthy': return 0.7 + Math.random() * 0.3;
    case 'warning': return 0.3 + Math.random() * 0.4;
    case 'critical': return Math.random() * 0.3;
  }
}

/**
 * Apply variance to status within channel - not all nodes in a channel
 * have exactly the same status, creating visual diversity
 */
function applyStatusVariance(baseStatus: NodeStatus): NodeStatus {
  const variance = Math.random();
  if (baseStatus === 'healthy' && variance < 0.1) return 'warning';
  if (baseStatus === 'warning' && variance < 0.2) return 'critical';
  if (baseStatus === 'critical' && variance < 0.1) return 'warning';
  return baseStatus;
}

export interface ConstellationData {
  nodes: ConstellationNode[];
  edges: ConstellationEdge[];
}

/**
 * Generate constellation mock data
 *
 * @param nodeCount - Total number of HCP nodes (default 2500)
 * @returns Object containing nodes and edges arrays
 */
export function generateMockConstellation(nodeCount: number = 2500): ConstellationData {
  const startTime = performance.now();

  const nodes: ConstellationNode[] = [];
  const edges: ConstellationEdge[] = [];

  // Create channel nodes (L1 - cluster centers)
  Object.entries(CHANNELS).forEach(([key, channel]) => {
    nodes.push({
      id: `channel-${key}`,
      label: channel.name,
      type: 'channel',
      status: channel.status,
      engagementScore: channel.status === 'healthy' ? 0.85 :
                       channel.status === 'warning' ? 0.45 : 0.15,
      position: [0, 0, 0], // Will be positioned by physics
    });
  });

  // Create HCP nodes (L3) with weighted distribution
  let hcpIndex = 0;
  Object.entries(CHANNELS).forEach(([channelKey, channel]) => {
    const count = Math.floor(nodeCount * channel.weight);

    for (let i = 0; i < count && hcpIndex < nodeCount; i++) {
      const hcpId = `hcp-${hcpIndex}`;
      const status = applyStatusVariance(channel.status);

      nodes.push({
        id: hcpId,
        label: `Dr. ${generateName(hcpIndex)}`,
        type: 'hcp',
        status,
        engagementScore: generateEngagementScore(status),
        channel: channelKey,
        specialty: SPECIALTIES[hcpIndex % SPECIALTIES.length],
        position: [0, 0, 0], // Will be computed by physics worker
      });

      // Connect HCP to their channel
      edges.push({
        id: `edge-${channelKey}-${hcpId}`,
        source: `channel-${channelKey}`,
        target: hcpId,
        weight: Math.random() * 0.5 + 0.5,
      });

      hcpIndex++;
    }
  });

  const endTime = performance.now();
  console.log(`[Constellation] Generated ${nodes.length} nodes and ${edges.length} edges in ${(endTime - startTime).toFixed(2)}ms`);

  return { nodes, edges };
}

/**
 * Get summary statistics for generated constellation
 */
export function getConstellationStats(data: ConstellationData): {
  totalNodes: number;
  byStatus: Record<NodeStatus, number>;
  byChannel: Record<string, number>;
  byType: Record<string, number>;
} {
  const byStatus: Record<NodeStatus, number> = { healthy: 0, warning: 0, critical: 0 };
  const byChannel: Record<string, number> = {};
  const byType: Record<string, number> = { channel: 0, campaign: 0, hcp: 0 };

  data.nodes.forEach(node => {
    byStatus[node.status]++;
    byType[node.type]++;
    if (node.channel) {
      byChannel[node.channel] = (byChannel[node.channel] || 0) + 1;
    }
  });

  return {
    totalNodes: data.nodes.length,
    byStatus,
    byChannel,
    byType,
  };
}
