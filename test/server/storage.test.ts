import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { HCPProfile, HCPFilter, Segment, Channel, Tier } from '@shared/schema';
import { mockHcpProfile, mockSimulationResult } from '../mocks/storage.mock';

// Mock the database module
vi.mock('../../server/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn().mockResolvedValue([]),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([]),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([]),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn().mockResolvedValue(undefined),
    })),
  },
}));

// Mock the prediction-engine service
vi.mock('../../server/services/prediction-engine', () => ({
  predictStimuliImpact: vi.fn().mockReturnValue({
    engagementDelta: 5,
    conversionDelta: 2,
    confidenceLower: 3,
    confidenceUpper: 7,
  }),
  calculateSimilarityScore: vi.fn().mockReturnValue(0.75),
  runSimulationEngine: vi.fn().mockReturnValue({
    predictedEngagementRate: 55.5,
    predictedResponseRate: 32.1,
    predictedRxLift: 12.3,
    predictedReach: 85,
    efficiencyScore: 72,
    channelPerformance: [],
    vsBaseline: { engagementDelta: 8.5, responseDelta: 5.2, rxLiftDelta: 3.1 },
  }),
  runCounterfactualAnalysis: vi.fn().mockResolvedValue({}),
}));

// Mock the nl-query-parser service
vi.mock('../../server/services/nl-query-parser', () => ({
  parseNLQueryToFilters: vi.fn().mockReturnValue({}),
  detectQueryIntent: vi.fn().mockReturnValue('search_hcps'),
  generateRecommendations: vi.fn().mockReturnValue([]),
  convertToHcpFilter: vi.fn().mockReturnValue({}),
}));

// Mock the genai-service
vi.mock('../../server/services/genai-service', () => ({
  isGenAIAvailable: vi.fn().mockReturnValue(false),
  parseNLQueryWithAI: vi.fn(),
  detectIntentWithAI: vi.fn(),
  generateRecommendationsWithAI: vi.fn(),
}));

// Helper to create mock DB row for HCP
const createMockDbHcpRow = (overrides: Partial<any> = {}) => ({
  id: 'test-hcp-1',
  npi: '1234567890',
  firstName: 'John',
  lastName: 'Doe',
  specialty: 'Oncology',
  tier: 'Tier 1',
  segment: 'High Prescriber',
  organization: 'Test Hospital',
  city: 'New York',
  state: 'NY',
  overallEngagementScore: 75,
  channelPreference: 'email',
  channelEngagements: [
    { channel: 'email', score: 80, lastContact: '2 days ago', totalTouches: 15, responseRate: 45 },
  ],
  monthlyRxVolume: 45,
  yearlyRxVolume: 540,
  marketSharePct: 22.5,
  prescribingTrend: [{ month: 'Dec', rxCount: 45, marketShare: 22.5 }],
  conversionLikelihood: 68,
  churnRisk: 15,
  lastUpdated: new Date(),
  ...overrides,
});

// Helper to create mock DB row for simulation result
const createMockDbSimulationRow = (overrides: Partial<any> = {}) => ({
  id: 'sim-result-1',
  scenarioId: 'scenario-1',
  scenarioName: 'Test Campaign',
  predictedEngagementRate: 55.5,
  predictedResponseRate: 32.1,
  predictedRxLift: 12.3,
  predictedReach: 85,
  costPerEngagement: null,
  efficiencyScore: 72,
  channelPerformance: [],
  vsBaseline: { engagementDelta: 8.5, responseDelta: 5.2, rxLiftDelta: 3.1 },
  runAt: new Date(),
  ...overrides,
});

describe('DatabaseStorage', () => {
  let db: any;
  let DatabaseStorage: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Re-import to get fresh mocks
    const dbModule = await import('../../server/db');
    db = dbModule.db;
    const storageModule = await import('../../server/storage');
    DatabaseStorage = storageModule.DatabaseStorage;
  });

  describe('HCP Operations', () => {
    describe('getAllHcps', () => {
      it('should return all HCPs from database', async () => {
        const mockRows = [createMockDbHcpRow(), createMockDbHcpRow({ id: 'test-hcp-2', npi: '0987654321' })];

        db.select.mockReturnValue({
          from: vi.fn().mockResolvedValue(mockRows),
        });

        const storage = new DatabaseStorage();
        const hcps = await storage.getAllHcps();

        expect(hcps).toHaveLength(2);
        expect(hcps[0].id).toBe('test-hcp-1');
        expect(hcps[1].id).toBe('test-hcp-2');
      });

      it('should return empty array when no HCPs exist', async () => {
        db.select.mockReturnValue({
          from: vi.fn().mockResolvedValue([]),
        });

        const storage = new DatabaseStorage();
        const hcps = await storage.getAllHcps();

        expect(hcps).toHaveLength(0);
      });

      it('should transform DB rows to HCPProfile type', async () => {
        const mockRow = createMockDbHcpRow();

        db.select.mockReturnValue({
          from: vi.fn().mockResolvedValue([mockRow]),
        });

        const storage = new DatabaseStorage();
        const hcps = await storage.getAllHcps();

        const hcp = hcps[0];
        expect(hcp).toHaveProperty('id');
        expect(hcp).toHaveProperty('npi');
        expect(hcp).toHaveProperty('firstName');
        expect(hcp).toHaveProperty('lastName');
        expect(hcp).toHaveProperty('specialty');
        expect(hcp).toHaveProperty('tier');
        expect(hcp).toHaveProperty('segment');
        expect(hcp).toHaveProperty('channelEngagements');
        expect(hcp).toHaveProperty('prescribingTrend');
        expect(typeof hcp.lastUpdated).toBe('string'); // Should be ISO string
      });
    });

    describe('getHcpById', () => {
      it('should return HCP when found', async () => {
        const mockRow = createMockDbHcpRow();

        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockRow]),
          }),
        });

        const storage = new DatabaseStorage();
        const hcp = await storage.getHcpById('test-hcp-1');

        expect(hcp).toBeDefined();
        expect(hcp?.id).toBe('test-hcp-1');
      });

      it('should return undefined when HCP not found', async () => {
        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        });

        const storage = new DatabaseStorage();
        const hcp = await storage.getHcpById('non-existent');

        expect(hcp).toBeUndefined();
      });
    });

    describe('getHcpByNpi', () => {
      it('should return HCP when found by NPI', async () => {
        const mockRow = createMockDbHcpRow();

        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockRow]),
          }),
        });

        const storage = new DatabaseStorage();
        const hcp = await storage.getHcpByNpi('1234567890');

        expect(hcp).toBeDefined();
        expect(hcp?.npi).toBe('1234567890');
      });

      it('should return undefined when NPI not found', async () => {
        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        });

        const storage = new DatabaseStorage();
        const hcp = await storage.getHcpByNpi('0000000000');

        expect(hcp).toBeUndefined();
      });
    });

    describe('filterHcps', () => {
      it('should filter by specialties', async () => {
        const mockRows = [createMockDbHcpRow({ specialty: 'Oncology' })];

        const whereMock = vi.fn().mockResolvedValue(mockRows);
        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: whereMock,
          }),
        });

        const storage = new DatabaseStorage();
        const filter: HCPFilter = { specialties: ['Oncology'] };
        const hcps = await storage.filterHcps(filter);

        expect(hcps).toHaveLength(1);
        expect(hcps[0].specialty).toBe('Oncology');
      });

      it('should filter by tiers', async () => {
        const mockRows = [createMockDbHcpRow({ tier: 'Tier 1' })];

        const whereMock = vi.fn().mockResolvedValue(mockRows);
        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: whereMock,
          }),
        });

        const storage = new DatabaseStorage();
        const filter: HCPFilter = { tiers: ['Tier 1'] };
        const hcps = await storage.filterHcps(filter);

        expect(hcps).toHaveLength(1);
        expect(hcps[0].tier).toBe('Tier 1');
      });

      it('should filter by segments', async () => {
        const mockRows = [createMockDbHcpRow({ segment: 'High Prescriber' })];

        const whereMock = vi.fn().mockResolvedValue(mockRows);
        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: whereMock,
          }),
        });

        const storage = new DatabaseStorage();
        const filter: HCPFilter = { segments: ['High Prescriber'] };
        const hcps = await storage.filterHcps(filter);

        expect(hcps).toHaveLength(1);
        expect(hcps[0].segment).toBe('High Prescriber');
      });

      it('should filter by minimum engagement score', async () => {
        const mockRows = [createMockDbHcpRow({ overallEngagementScore: 80 })];

        const whereMock = vi.fn().mockResolvedValue(mockRows);
        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: whereMock,
          }),
        });

        const storage = new DatabaseStorage();
        const filter: HCPFilter = { minEngagementScore: 70 };
        const hcps = await storage.filterHcps(filter);

        expect(hcps).toHaveLength(1);
        expect(hcps[0].overallEngagementScore).toBeGreaterThanOrEqual(70);
      });

      it('should filter by maximum engagement score', async () => {
        const mockRows = [createMockDbHcpRow({ overallEngagementScore: 60 })];

        const whereMock = vi.fn().mockResolvedValue(mockRows);
        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: whereMock,
          }),
        });

        const storage = new DatabaseStorage();
        const filter: HCPFilter = { maxEngagementScore: 70 };
        const hcps = await storage.filterHcps(filter);

        expect(hcps).toHaveLength(1);
        expect(hcps[0].overallEngagementScore).toBeLessThanOrEqual(70);
      });

      it('should filter by channel preferences', async () => {
        const mockRows = [createMockDbHcpRow({ channelPreference: 'email' })];

        const whereMock = vi.fn().mockResolvedValue(mockRows);
        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: whereMock,
          }),
        });

        const storage = new DatabaseStorage();
        const filter: HCPFilter = { channelPreferences: ['email'] };
        const hcps = await storage.filterHcps(filter);

        expect(hcps).toHaveLength(1);
        expect(hcps[0].channelPreference).toBe('email');
      });

      it('should filter by states', async () => {
        const mockRows = [createMockDbHcpRow({ state: 'NY' })];

        const whereMock = vi.fn().mockResolvedValue(mockRows);
        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: whereMock,
          }),
        });

        const storage = new DatabaseStorage();
        const filter: HCPFilter = { states: ['NY', 'CA'] };
        const hcps = await storage.filterHcps(filter);

        expect(hcps).toHaveLength(1);
        expect(hcps[0].state).toBe('NY');
      });

      it('should apply text search filter on name', async () => {
        const mockRows = [
          createMockDbHcpRow({ firstName: 'John', lastName: 'Doe' }),
          createMockDbHcpRow({ id: 'test-hcp-2', firstName: 'Jane', lastName: 'Smith', npi: '9999999999' }),
        ];

        db.select.mockReturnValue({
          from: vi.fn().mockResolvedValue(mockRows),
        });

        const storage = new DatabaseStorage();
        const filter: HCPFilter = { search: 'John' };
        const hcps = await storage.filterHcps(filter);

        expect(hcps).toHaveLength(1);
        expect(hcps[0].firstName).toBe('John');
      });

      it('should apply text search filter on NPI', async () => {
        const mockRows = [
          createMockDbHcpRow({ npi: '1234567890' }),
          createMockDbHcpRow({ id: 'test-hcp-2', npi: '9999999999' }),
        ];

        db.select.mockReturnValue({
          from: vi.fn().mockResolvedValue(mockRows),
        });

        const storage = new DatabaseStorage();
        const filter: HCPFilter = { search: '1234' };
        const hcps = await storage.filterHcps(filter);

        expect(hcps).toHaveLength(1);
        expect(hcps[0].npi).toBe('1234567890');
      });

      it('should return all HCPs when filter is empty', async () => {
        const mockRows = [createMockDbHcpRow(), createMockDbHcpRow({ id: 'test-hcp-2', npi: '9999999999' })];

        db.select.mockReturnValue({
          from: vi.fn().mockResolvedValue(mockRows),
        });

        const storage = new DatabaseStorage();
        const hcps = await storage.filterHcps({});

        expect(hcps).toHaveLength(2);
      });

      it('should combine multiple filters', async () => {
        const mockRows = [createMockDbHcpRow({ specialty: 'Oncology', tier: 'Tier 1', state: 'NY' })];

        const whereMock = vi.fn().mockResolvedValue(mockRows);
        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: whereMock,
          }),
        });

        const storage = new DatabaseStorage();
        const filter: HCPFilter = {
          specialties: ['Oncology'],
          tiers: ['Tier 1'],
          states: ['NY'],
        };
        const hcps = await storage.filterHcps(filter);

        expect(hcps).toHaveLength(1);
      });
    });

    describe('findSimilarHcps', () => {
      it('should return similar HCPs', async () => {
        const targetHcp = createMockDbHcpRow({ id: 'target-hcp' });
        const similarHcp1 = createMockDbHcpRow({ id: 'similar-hcp-1', npi: '1111111111' });
        const similarHcp2 = createMockDbHcpRow({ id: 'similar-hcp-2', npi: '2222222222' });

        // First call for getHcpById
        db.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([targetHcp]),
          }),
        });

        // Second call for getAllHcps
        db.select.mockReturnValueOnce({
          from: vi.fn().mockResolvedValue([targetHcp, similarHcp1, similarHcp2]),
        });

        const storage = new DatabaseStorage();
        const similarHcps = await storage.findSimilarHcps('target-hcp', 5);

        expect(similarHcps).toBeDefined();
        // Should not include the target HCP itself
        expect(similarHcps.find(h => h.id === 'target-hcp')).toBeUndefined();
      });

      it('should return empty array when target HCP not found', async () => {
        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        });

        const storage = new DatabaseStorage();
        const similarHcps = await storage.findSimilarHcps('non-existent');

        expect(similarHcps).toHaveLength(0);
      });

      it('should respect limit parameter', async () => {
        const targetHcp = createMockDbHcpRow({ id: 'target-hcp' });
        const allHcps = [
          targetHcp,
          ...Array.from({ length: 20 }, (_, i) =>
            createMockDbHcpRow({ id: `hcp-${i}`, npi: `${1000000000 + i}` })
          ),
        ];

        db.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([targetHcp]),
          }),
        });

        db.select.mockReturnValueOnce({
          from: vi.fn().mockResolvedValue(allHcps),
        });

        const storage = new DatabaseStorage();
        const similarHcps = await storage.findSimilarHcps('target-hcp', 5);

        expect(similarHcps.length).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('Simulation Operations', () => {
    describe('createSimulation', () => {
      it('should create a simulation and return result', async () => {
        const mockResult = createMockDbSimulationRow();

        // Mock getHcpCount - uses sql count
        db.select.mockReturnValueOnce({
          from: vi.fn().mockResolvedValue([{ count: 100 }]),
        });

        // Mock insert with proper chaining
        const returningMock = vi.fn().mockResolvedValue([mockResult]);
        const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
        db.insert.mockReturnValueOnce({ values: valuesMock });

        // Mock logAction insert (doesn't need returning)
        db.insert.mockReturnValueOnce({
          values: vi.fn().mockResolvedValue(undefined),
        });

        const storage = new DatabaseStorage();
        const scenario = {
          name: 'Test Campaign',
          channelMix: { email: 30, rep_visit: 40, webinar: 15, conference: 5, digital_ad: 5, phone: 5 },
          frequency: 4,
          duration: 3,
          contentType: 'educational' as const,
        };

        const result = await storage.createSimulation(scenario);

        expect(result).toBeDefined();
        expect(result.scenarioName).toBe('Test Campaign');
      });

      it('should use targeted HCP count when targetHcpIds provided', async () => {
        const mockResult = createMockDbSimulationRow();

        db.insert.mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockResult]),
          }),
        });

        const storage = new DatabaseStorage();
        const scenario = {
          name: 'Targeted Campaign',
          targetHcpIds: ['hcp-1', 'hcp-2', 'hcp-3'],
          channelMix: { email: 50, rep_visit: 50, webinar: 0, conference: 0, digital_ad: 0, phone: 0 },
          frequency: 2,
          duration: 1,
          contentType: 'clinical_data' as const,
        };

        const result = await storage.createSimulation(scenario);

        expect(result).toBeDefined();
      });
    });

    describe('getSimulationHistory', () => {
      it('should return simulation history ordered by runAt desc', async () => {
        const mockResults = [
          createMockDbSimulationRow({ id: 'sim-1', runAt: new Date('2024-01-02') }),
          createMockDbSimulationRow({ id: 'sim-2', runAt: new Date('2024-01-01') }),
        ];

        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockResults),
          }),
        });

        const storage = new DatabaseStorage();
        const history = await storage.getSimulationHistory();

        expect(history).toHaveLength(2);
        expect(history[0].id).toBe('sim-1');
      });

      it('should return empty array when no simulations exist', async () => {
        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        });

        const storage = new DatabaseStorage();
        const history = await storage.getSimulationHistory();

        expect(history).toHaveLength(0);
      });
    });

    describe('getSimulationById', () => {
      it('should return simulation when found', async () => {
        const mockResult = createMockDbSimulationRow();

        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockResult]),
          }),
        });

        const storage = new DatabaseStorage();
        const simulation = await storage.getSimulationById('sim-result-1');

        expect(simulation).toBeDefined();
        expect(simulation?.id).toBe('sim-result-1');
      });

      it('should return undefined when simulation not found', async () => {
        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        });

        const storage = new DatabaseStorage();
        const simulation = await storage.getSimulationById('non-existent');

        expect(simulation).toBeUndefined();
      });
    });
  });

  describe('Dashboard Metrics', () => {
    describe('getDashboardMetrics', () => {
      it('should calculate metrics from HCPs and simulations', async () => {
        const mockHcps = [
          createMockDbHcpRow({ segment: 'High Prescriber', tier: 'Tier 1', overallEngagementScore: 80 }),
          createMockDbHcpRow({ id: 'hcp-2', npi: '2222222222', segment: 'Growth Potential', tier: 'Tier 2', overallEngagementScore: 60 }),
        ];
        const mockSimulations = [
          createMockDbSimulationRow({ predictedRxLift: 10 }),
          createMockDbSimulationRow({ id: 'sim-2', predictedRxLift: 15 }),
        ];

        // Mock getAllHcps
        db.select.mockReturnValueOnce({
          from: vi.fn().mockResolvedValue(mockHcps),
        });

        // Mock getSimulationHistory
        db.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockSimulations),
          }),
        });

        const storage = new DatabaseStorage();
        const metrics = await storage.getDashboardMetrics();

        expect(metrics).toHaveProperty('totalHcps');
        expect(metrics).toHaveProperty('avgEngagementScore');
        expect(metrics).toHaveProperty('totalSimulations');
        expect(metrics).toHaveProperty('avgPredictedLift');
        expect(metrics).toHaveProperty('segmentDistribution');
        expect(metrics).toHaveProperty('channelEffectiveness');
        expect(metrics).toHaveProperty('tierBreakdown');
        expect(metrics).toHaveProperty('engagementTrend');

        expect(metrics.totalHcps).toBe(2);
        expect(metrics.totalSimulations).toBe(2);
      });

      it('should handle empty data gracefully', async () => {
        db.select.mockReturnValueOnce({
          from: vi.fn().mockResolvedValue([]),
        });

        db.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        });

        const storage = new DatabaseStorage();
        const metrics = await storage.getDashboardMetrics();

        expect(metrics.totalHcps).toBe(0);
        expect(metrics.totalSimulations).toBe(0);
        expect(metrics.avgEngagementScore).toBe(0);
        expect(metrics.avgPredictedLift).toBe(0);
      });

      it('should calculate segment distribution correctly', async () => {
        const mockHcps = [
          createMockDbHcpRow({ segment: 'High Prescriber' }),
          createMockDbHcpRow({ id: 'hcp-2', npi: '2222222222', segment: 'High Prescriber' }),
          createMockDbHcpRow({ id: 'hcp-3', npi: '3333333333', segment: 'Growth Potential' }),
        ];

        db.select.mockReturnValueOnce({
          from: vi.fn().mockResolvedValue(mockHcps),
        });

        db.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        });

        const storage = new DatabaseStorage();
        const metrics = await storage.getDashboardMetrics();

        const highPrescriberSegment = metrics.segmentDistribution.find(
          (s: any) => s.segment === 'High Prescriber'
        );
        expect(highPrescriberSegment?.count).toBe(2);
      });

      it('should calculate tier breakdown correctly', async () => {
        const mockHcps = [
          createMockDbHcpRow({ tier: 'Tier 1', monthlyRxVolume: 50 }),
          createMockDbHcpRow({ id: 'hcp-2', npi: '2222222222', tier: 'Tier 1', monthlyRxVolume: 60 }),
          createMockDbHcpRow({ id: 'hcp-3', npi: '3333333333', tier: 'Tier 2', monthlyRxVolume: 30 }),
        ];

        db.select.mockReturnValueOnce({
          from: vi.fn().mockResolvedValue(mockHcps),
        });

        db.select.mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        });

        const storage = new DatabaseStorage();
        const metrics = await storage.getDashboardMetrics();

        const tier1Breakdown = metrics.tierBreakdown.find((t: any) => t.tier === 'Tier 1');
        expect(tier1Breakdown?.count).toBe(2);
        expect(tier1Breakdown?.avgRxVolume).toBe(55); // (50 + 60) / 2
      });
    });
  });

  describe('Audit Logging', () => {
    describe('logAction', () => {
      it('should insert audit log entry', async () => {
        const insertValuesMock = vi.fn().mockResolvedValue(undefined);
        db.insert.mockReturnValue({
          values: insertValuesMock,
        });

        const storage = new DatabaseStorage();
        await storage.logAction({
          action: 'hcp_view',
          entityType: 'hcp',
          entityId: 'test-hcp-1',
          details: { source: 'test' },
        });

        expect(db.insert).toHaveBeenCalled();
      });
    });

    describe('getAuditLogs', () => {
      it('should return audit logs', async () => {
        const mockLogs = [
          {
            id: 'log-1',
            action: 'hcp_view',
            entityType: 'hcp',
            entityId: 'test-hcp-1',
            details: null,
            userId: null,
            ipAddress: null,
            createdAt: new Date(),
          },
        ];

        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockLogs),
            }),
          }),
        });

        const storage = new DatabaseStorage();
        const logs = await storage.getAuditLogs(10);

        expect(logs).toHaveLength(1);
        expect(logs[0].action).toBe('hcp_view');
      });
    });
  });

  describe('Helper Function Tests', () => {
    describe('getHcpCount', () => {
      it('should return total HCP count', async () => {
        // getHcpCount uses SQL count(*) which returns [{count: N}]
        db.select.mockReturnValue({
          from: vi.fn().mockResolvedValue([{ count: 100 }]),
        });

        const storage = new DatabaseStorage();
        const count = await storage.getHcpCount();

        expect(count).toBe(100);
      });

      it('should return 0 when no HCPs exist', async () => {
        db.select.mockReturnValue({
          from: vi.fn().mockResolvedValue([{ count: 0 }]),
        });

        const storage = new DatabaseStorage();
        const count = await storage.getHcpCount();

        expect(count).toBe(0);
      });

      it('should handle null/undefined count gracefully', async () => {
        db.select.mockReturnValue({
          from: vi.fn().mockResolvedValue([{}]),
        });

        const storage = new DatabaseStorage();
        const count = await storage.getHcpCount();

        expect(count).toBe(0);
      });
    });
  });

  describe('User Operations', () => {
    const mockUserRow = {
      id: 'user-1',
      username: 'testuser',
      password: 'hashed_password',
      email: 'test@example.com',
      role: 'viewer',
      createdAt: new Date(),
      lastLoginAt: null,
    };

    describe('getUserById', () => {
      it('should return user when found', async () => {
        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockUserRow]),
          }),
        });

        const storage = new DatabaseStorage();
        const user = await storage.getUserById('user-1');

        expect(user).toBeDefined();
        expect(user?.id).toBe('user-1');
        expect(user?.username).toBe('testuser');
      });

      it('should return undefined when user not found', async () => {
        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        });

        const storage = new DatabaseStorage();
        const user = await storage.getUserById('non-existent');

        expect(user).toBeUndefined();
      });
    });

    describe('getUserByUsername', () => {
      it('should return user when found by username', async () => {
        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockUserRow]),
          }),
        });

        const storage = new DatabaseStorage();
        const user = await storage.getUserByUsername('testuser');

        expect(user).toBeDefined();
        expect(user?.username).toBe('testuser');
      });

      it('should return undefined when username not found', async () => {
        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        });

        const storage = new DatabaseStorage();
        const user = await storage.getUserByUsername('unknown');

        expect(user).toBeUndefined();
      });
    });

    describe('createUser', () => {
      it('should create and return new user', async () => {
        const returningMock = vi.fn().mockResolvedValue([mockUserRow]);
        const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
        db.insert.mockReturnValue({ values: valuesMock });

        const storage = new DatabaseStorage();
        const user = await storage.createUser({
          username: 'testuser',
          password: 'hashed_password',
          email: 'test@example.com',
          role: 'viewer' as const,
        });

        expect(user).toBeDefined();
        expect(user.username).toBe('testuser');
      });
    });
  });

  describe('Stimuli Event Operations', () => {
    const mockStimuliRow = {
      id: 'stimuli-1',
      hcpId: 'test-hcp-1',
      stimulusType: 'email_send',
      channel: 'email',
      contentType: 'educational',
      messageVariant: 'A',
      callToAction: 'Learn more',
      predictedEngagementDelta: 5.5,
      predictedConversionDelta: 2.1,
      confidenceLower: 3.0,
      confidenceUpper: 8.0,
      actualEngagementDelta: null,
      actualConversionDelta: null,
      outcomeRecordedAt: null,
      status: 'predicted',
      eventDate: new Date(),
      createdAt: new Date(),
    };

    describe('getStimuliEvents', () => {
      it('should return stimuli events', async () => {
        const limitMock = vi.fn().mockResolvedValue([mockStimuliRow]);
        const orderByMock = vi.fn().mockReturnValue({ limit: limitMock });
        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            orderBy: orderByMock,
          }),
        });

        const storage = new DatabaseStorage();
        const events = await storage.getStimuliEvents(undefined, 10);

        expect(events).toHaveLength(1);
        expect(events[0].stimulusType).toBe('email_send');
      });

      it('should filter by hcpId when provided', async () => {
        const whereMock = vi.fn().mockResolvedValue([mockStimuliRow]);
        const limitMock = vi.fn().mockReturnValue({ where: whereMock });
        const orderByMock = vi.fn().mockReturnValue({ limit: limitMock });
        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            orderBy: orderByMock,
          }),
        });

        const storage = new DatabaseStorage();
        const events = await storage.getStimuliEvents('test-hcp-1', 10);

        expect(events).toHaveLength(1);
      });
    });

    describe('recordStimuliOutcome', () => {
      it('should update stimuli with actual outcome', async () => {
        const updatedRow = {
          ...mockStimuliRow,
          actualEngagementDelta: 6.0,
          actualConversionDelta: 2.5,
          status: 'confirmed',
          outcomeRecordedAt: new Date(),
        };

        const returningMock = vi.fn().mockResolvedValue([updatedRow]);
        const whereMock = vi.fn().mockReturnValue({ returning: returningMock });
        const setMock = vi.fn().mockReturnValue({ where: whereMock });
        db.update.mockReturnValue({ set: setMock });

        // Mock logAction
        db.insert.mockReturnValue({
          values: vi.fn().mockResolvedValue(undefined),
        });

        const storage = new DatabaseStorage();
        const result = await storage.recordStimuliOutcome('stimuli-1', 6.0, 2.5);

        expect(result).toBeDefined();
        expect(result?.status).toBe('confirmed');
        expect(result?.actualEngagementDelta).toBe(6.0);
      });

      it('should return undefined when event not found', async () => {
        const returningMock = vi.fn().mockResolvedValue([]);
        const whereMock = vi.fn().mockReturnValue({ returning: returningMock });
        const setMock = vi.fn().mockReturnValue({ where: whereMock });
        db.update.mockReturnValue({ set: setMock });

        const storage = new DatabaseStorage();
        const result = await storage.recordStimuliOutcome('non-existent', 6.0, 2.5);

        expect(result).toBeUndefined();
      });
    });
  });

  describe('Invite Code Operations', () => {
    // Mock invite row structure matching actual DB schema
    const mockInviteRow = {
      id: 'invite-1',
      code: 'TESTCODE123',
      email: 'test@example.com',
      label: 'Test Invite',
      maxUses: 5,
      useCount: 0,
      expiresAt: new Date(Date.now() + 86400000), // Tomorrow
      lastUsedAt: null,
      createdAt: new Date(),
      createdBy: 'admin',
    };

    describe('validateInviteCode', () => {
      it('should return valid for valid invite code', async () => {
        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockInviteRow]),
          }),
        });

        const storage = new DatabaseStorage();
        const result = await storage.validateInviteCode('TESTCODE123', 'test@example.com');

        expect(result.valid).toBe(true);
        expect(result.inviteCode).toBeDefined();
      });

      it('should return invalid for non-existent code', async () => {
        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        });

        const storage = new DatabaseStorage();
        const result = await storage.validateInviteCode('INVALID', 'test@example.com');

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invalid invite code');
      });

      it('should return invalid for expired code', async () => {
        const expiredInvite = {
          ...mockInviteRow,
          expiresAt: new Date(Date.now() - 86400000), // Yesterday
        };

        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([expiredInvite]),
          }),
        });

        const storage = new DatabaseStorage();
        const result = await storage.validateInviteCode('TESTCODE123', 'test@example.com');

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invite code has expired');
      });

      it('should return invalid when max uses reached', async () => {
        const usedUpInvite = {
          ...mockInviteRow,
          maxUses: 5,
          useCount: 5,
        };

        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([usedUpInvite]),
          }),
        });

        const storage = new DatabaseStorage();
        const result = await storage.validateInviteCode('TESTCODE123', 'test@example.com');

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invite code has reached maximum uses');
      });

      it('should return invalid for wrong email', async () => {
        const emailSpecificInvite = {
          ...mockInviteRow,
          email: 'specific@example.com',
        };

        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([emailSpecificInvite]),
          }),
        });

        const storage = new DatabaseStorage();
        const result = await storage.validateInviteCode('TESTCODE123', 'wrong@example.com');

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Email does not match invite');
      });
    });

    describe('createInviteCode', () => {
      it('should create and return new invite code', async () => {
        const returningMock = vi.fn().mockResolvedValue([mockInviteRow]);
        const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
        db.insert.mockReturnValue({ values: valuesMock });

        const storage = new DatabaseStorage();
        const invite = await storage.createInviteCode({
          code: 'TESTCODE123',
          usesRemaining: 5,
          expiresAt: new Date(Date.now() + 86400000),
          createdBy: 'admin',
        });

        expect(invite).toBeDefined();
        expect(invite.code).toBe('TESTCODE123');
      });
    });

    describe('listInviteCodes', () => {
      it('should return all invite codes', async () => {
        const orderByMock = vi.fn().mockResolvedValue([mockInviteRow]);
        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            orderBy: orderByMock,
          }),
        });

        const storage = new DatabaseStorage();
        const invites = await storage.listInviteCodes();

        expect(invites).toHaveLength(1);
      });
    });

    describe('deleteInviteCode', () => {
      it('should delete invite code and return true', async () => {
        const countMock = vi.fn().mockResolvedValue([{ count: 1 }]);
        const whereMock = vi.fn().mockReturnValue(countMock);
        db.delete.mockReturnValue({ where: whereMock });

        const storage = new DatabaseStorage();
        const result = await storage.deleteInviteCode('invite-1');

        expect(result).toBe(true);
      });
    });
  });

  describe('Saved Audience Operations', () => {
    const mockAudienceRow = {
      id: 'audience-1',
      name: 'High Value Oncologists',
      description: 'Tier 1 oncology specialists',
      filter: { specialties: ['Oncology'], tiers: ['Tier 1'] },
      hcpCount: 25,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-1',
    };

    describe('createAudience', () => {
      it('should create and return new audience', async () => {
        const returningMock = vi.fn().mockResolvedValue([mockAudienceRow]);
        const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
        db.insert.mockReturnValue({ values: valuesMock });

        const storage = new DatabaseStorage();
        const audience = await storage.createAudience({
          name: 'High Value Oncologists',
          description: 'Tier 1 oncology specialists',
          filter: { specialties: ['Oncology'], tiers: ['Tier 1'] },
          hcpCount: 25,
          createdBy: 'user-1',
        });

        expect(audience).toBeDefined();
        expect(audience.name).toBe('High Value Oncologists');
      });
    });

    describe('getAudience', () => {
      it('should return audience when found', async () => {
        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockAudienceRow]),
          }),
        });

        const storage = new DatabaseStorage();
        const audience = await storage.getAudience('audience-1');

        expect(audience).toBeDefined();
        expect(audience?.id).toBe('audience-1');
      });

      it('should return undefined when not found', async () => {
        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        });

        const storage = new DatabaseStorage();
        const audience = await storage.getAudience('non-existent');

        expect(audience).toBeUndefined();
      });
    });

    describe('listAudiences', () => {
      it('should return all audiences', async () => {
        const orderByMock = vi.fn().mockResolvedValue([mockAudienceRow]);
        db.select.mockReturnValue({
          from: vi.fn().mockReturnValue({
            orderBy: orderByMock,
          }),
        });

        const storage = new DatabaseStorage();
        const audiences = await storage.listAudiences();

        expect(audiences).toHaveLength(1);
      });
    });

    describe('updateAudience', () => {
      it('should update and return audience', async () => {
        const updatedRow = { ...mockAudienceRow, name: 'Updated Name' };
        const returningMock = vi.fn().mockResolvedValue([updatedRow]);
        const whereMock = vi.fn().mockReturnValue({ returning: returningMock });
        const setMock = vi.fn().mockReturnValue({ where: whereMock });
        db.update.mockReturnValue({ set: setMock });

        const storage = new DatabaseStorage();
        const audience = await storage.updateAudience('audience-1', { name: 'Updated Name' });

        expect(audience).toBeDefined();
        expect(audience?.name).toBe('Updated Name');
      });

      it('should return undefined when not found', async () => {
        const returningMock = vi.fn().mockResolvedValue([]);
        const whereMock = vi.fn().mockReturnValue({ returning: returningMock });
        const setMock = vi.fn().mockReturnValue({ where: whereMock });
        db.update.mockReturnValue({ set: setMock });

        const storage = new DatabaseStorage();
        const audience = await storage.updateAudience('non-existent', { name: 'Updated' });

        expect(audience).toBeUndefined();
      });
    });

    describe('deleteAudience', () => {
      it('should delete audience and return true', async () => {
        const countMock = vi.fn().mockResolvedValue([{ count: 1 }]);
        const whereMock = vi.fn().mockReturnValue(countMock);
        db.delete.mockReturnValue({ where: whereMock });

        const storage = new DatabaseStorage();
        const result = await storage.deleteAudience('audience-1');

        expect(result).toBe(true);
      });
    });
  });
});
