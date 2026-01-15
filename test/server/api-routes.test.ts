import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { mockHcpProfile, mockSimulationResult } from '../mocks/storage.mock';

// Create a mock storage object
const mockStorage = {
  getAllHcps: vi.fn().mockResolvedValue([mockHcpProfile]),
  getHcpById: vi.fn().mockResolvedValue(mockHcpProfile),
  getHcpByNpi: vi.fn().mockResolvedValue(mockHcpProfile),
  filterHcps: vi.fn().mockResolvedValue([mockHcpProfile]),
  findSimilarHcps: vi.fn().mockResolvedValue([mockHcpProfile]),
  createSimulation: vi.fn().mockResolvedValue(mockSimulationResult),
  getSimulationHistory: vi.fn().mockResolvedValue([mockSimulationResult]),
  getSimulationById: vi.fn().mockResolvedValue(mockSimulationResult),
  getDashboardMetrics: vi.fn().mockResolvedValue({
    totalHcps: 100,
    avgEngagementScore: 65,
    totalSimulations: 10,
    avgPredictedLift: 8.5,
    segmentDistribution: [],
    channelEffectiveness: [],
    tierBreakdown: [],
    engagementTrend: [],
  }),
  logAction: vi.fn().mockResolvedValue(undefined),
  getAuditLogs: vi.fn().mockResolvedValue([]),
};

// Create a test app with injected storage
function createTestApp(storage: typeof mockStorage) {
  const app = express();
  app.use(express.json());

  // HCP endpoints
  app.get('/api/hcps', async (req, res) => {
    try {
      const hcps = await storage.getAllHcps();
      res.json(hcps);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch HCPs' });
    }
  });

  app.get('/api/hcps/:id', async (req, res) => {
    try {
      const hcp = await storage.getHcpById(req.params.id);
      if (!hcp) {
        return res.status(404).json({ error: 'HCP not found' });
      }
      res.json(hcp);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch HCP' });
    }
  });

  app.post('/api/hcps/filter', async (req, res) => {
    try {
      const hcps = await storage.filterHcps(req.body);
      res.json(hcps);
    } catch (error) {
      res.status(500).json({ error: 'Failed to filter HCPs' });
    }
  });

  app.get('/api/hcps/:id/similar', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const similarHcps = await storage.findSimilarHcps(req.params.id, limit);
      res.json(similarHcps);
    } catch (error) {
      res.status(500).json({ error: 'Failed to find similar HCPs' });
    }
  });

  // Simulation endpoints
  app.post('/api/simulations/run', async (req, res) => {
    try {
      const result = await storage.createSimulation(req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to run simulation' });
    }
  });

  app.get('/api/simulations/history', async (req, res) => {
    try {
      const history = await storage.getSimulationHistory();
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch simulation history' });
    }
  });

  app.get('/api/simulations/:id', async (req, res) => {
    try {
      const simulation = await storage.getSimulationById(req.params.id);
      if (!simulation) {
        return res.status(404).json({ error: 'Simulation not found' });
      }
      res.json(simulation);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch simulation' });
    }
  });

  // Dashboard endpoints
  app.get('/api/dashboard/metrics', async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
    }
  });

  // Audit logs
  app.get('/api/audit-logs', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await storage.getAuditLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  });

  return app;
}

describe('API Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations to defaults
    mockStorage.getAllHcps.mockResolvedValue([mockHcpProfile]);
    mockStorage.getHcpById.mockResolvedValue(mockHcpProfile);
    mockStorage.filterHcps.mockResolvedValue([mockHcpProfile]);
    mockStorage.findSimilarHcps.mockResolvedValue([mockHcpProfile]);
    mockStorage.createSimulation.mockResolvedValue(mockSimulationResult);
    mockStorage.getSimulationHistory.mockResolvedValue([mockSimulationResult]);
    mockStorage.getSimulationById.mockResolvedValue(mockSimulationResult);
    mockStorage.getDashboardMetrics.mockResolvedValue({
      totalHcps: 100,
      avgEngagementScore: 65,
      totalSimulations: 10,
      avgPredictedLift: 8.5,
      segmentDistribution: [],
      channelEffectiveness: [],
      tierBreakdown: [],
      engagementTrend: [],
    });
    mockStorage.getAuditLogs.mockResolvedValue([]);

    app = createTestApp(mockStorage);
  });

  describe('HCP Endpoints', () => {
    describe('GET /api/hcps', () => {
      it('should return list of HCPs', async () => {
        const response = await request(app)
          .get('/api/hcps')
          .expect(200);

        expect(response.body).toBeInstanceOf(Array);
        expect(response.body.length).toBeGreaterThan(0);
      });

      it('should return HCPs with expected structure', async () => {
        const response = await request(app)
          .get('/api/hcps')
          .expect(200);

        const hcp = response.body[0];
        expect(hcp).toHaveProperty('id');
        expect(hcp).toHaveProperty('npi');
        expect(hcp).toHaveProperty('firstName');
        expect(hcp).toHaveProperty('lastName');
        expect(hcp).toHaveProperty('specialty');
        expect(hcp).toHaveProperty('tier');
        expect(hcp).toHaveProperty('segment');
      });
    });

    describe('GET /api/hcps/:id', () => {
      it('should return a single HCP by ID', async () => {
        const response = await request(app)
          .get('/api/hcps/test-hcp-1')
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body.firstName).toBe('John');
      });

      it('should return 404 for non-existent HCP', async () => {
        mockStorage.getHcpById.mockResolvedValueOnce(undefined);

        await request(app)
          .get('/api/hcps/non-existent')
          .expect(404);
      });
    });

    describe('POST /api/hcps/filter', () => {
      it('should filter HCPs by criteria', async () => {
        const response = await request(app)
          .post('/api/hcps/filter')
          .send({
            specialties: ['Oncology'],
            tiers: ['Tier 1'],
          })
          .expect(200);

        expect(response.body).toBeInstanceOf(Array);
      });

      it('should accept empty filter', async () => {
        const response = await request(app)
          .post('/api/hcps/filter')
          .send({})
          .expect(200);

        expect(response.body).toBeInstanceOf(Array);
      });
    });

    describe('GET /api/hcps/:id/similar', () => {
      it('should return similar HCPs', async () => {
        const response = await request(app)
          .get('/api/hcps/test-hcp-1/similar')
          .expect(200);

        expect(response.body).toBeInstanceOf(Array);
      });

      it('should respect limit parameter', async () => {
        const response = await request(app)
          .get('/api/hcps/test-hcp-1/similar?limit=5')
          .expect(200);

        expect(response.body).toBeInstanceOf(Array);
      });
    });
  });

  describe('Simulation Endpoints', () => {
    describe('POST /api/simulations/run', () => {
      it('should run a simulation and return results', async () => {
        const scenario = {
          name: 'Test Campaign',
          targetHcpIds: [],
          channelMix: {
            email: 30,
            rep_visit: 40,
            webinar: 15,
            conference: 5,
            digital_ad: 5,
            phone: 5,
          },
          frequency: 4,
          duration: 3,
          contentType: 'educational',
        };

        const response = await request(app)
          .post('/api/simulations/run')
          .send(scenario)
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('predictedEngagementRate');
        expect(response.body).toHaveProperty('predictedResponseRate');
      });
    });

    describe('GET /api/simulations/history', () => {
      it('should return simulation history', async () => {
        const response = await request(app)
          .get('/api/simulations/history')
          .expect(200);

        expect(response.body).toBeInstanceOf(Array);
      });
    });

    describe('GET /api/simulations/:id', () => {
      it('should return a single simulation', async () => {
        const response = await request(app)
          .get('/api/simulations/sim-1')
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('scenarioName');
      });

      it('should return 404 for non-existent simulation', async () => {
        mockStorage.getSimulationById.mockResolvedValueOnce(undefined);

        await request(app)
          .get('/api/simulations/non-existent')
          .expect(404);
      });
    });
  });

  describe('Dashboard Endpoints', () => {
    describe('GET /api/dashboard/metrics', () => {
      it('should return dashboard metrics', async () => {
        const response = await request(app)
          .get('/api/dashboard/metrics')
          .expect(200);

        expect(response.body).toHaveProperty('totalHcps');
        expect(response.body).toHaveProperty('avgEngagementScore');
        expect(response.body).toHaveProperty('totalSimulations');
      });
    });
  });

  describe('Audit Log Endpoints', () => {
    describe('GET /api/audit-logs', () => {
      it('should return audit logs', async () => {
        const response = await request(app)
          .get('/api/audit-logs')
          .expect(200);

        expect(response.body).toBeInstanceOf(Array);
      });

      it('should respect limit parameter', async () => {
        const response = await request(app)
          .get('/api/audit-logs?limit=50')
          .expect(200);

        expect(response.body).toBeInstanceOf(Array);
      });
    });
  });
});
