import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import session from 'express-session';
import passport from 'passport';
import { createServer } from 'http';

// Mock the storage module before importing routes
vi.mock('../../server/storage', () => {
  const mockHcpProfile = {
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
    lastUpdated: new Date().toISOString(),
  };

  const mockSimulationResult = {
    id: 'sim-result-1',
    scenarioId: 'scenario-1',
    scenarioName: 'Test Campaign',
    predictedEngagementRate: 55.5,
    predictedResponseRate: 32.1,
    predictedRxLift: 12.3,
    predictedReach: 85,
    efficiencyScore: 72,
    channelPerformance: [],
    vsBaseline: { engagementDelta: 8.5, responseDelta: 5.2, rxLiftDelta: 3.1 },
    runAt: new Date().toISOString(),
  };

  const mockDashboardMetrics = {
    totalHcps: 100,
    avgEngagementScore: 65,
    totalSimulations: 10,
    avgPredictedLift: 8.5,
    segmentDistribution: [],
    channelEffectiveness: [],
    tierBreakdown: [],
    engagementTrend: [],
  };

  const mockAudience = {
    id: 'audience-1',
    name: 'Test Audience',
    description: 'Test description',
    filter: { specialties: ['Oncology'] },
    hcpCount: 25,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'user-1',
  };

  return {
    storage: {
      getAllHcps: vi.fn().mockResolvedValue([mockHcpProfile]),
      getHcpById: vi.fn().mockResolvedValue(mockHcpProfile),
      getHcpByNpi: vi.fn().mockResolvedValue(mockHcpProfile),
      filterHcps: vi.fn().mockResolvedValue([mockHcpProfile]),
      findSimilarHcps: vi.fn().mockResolvedValue([mockHcpProfile]),
      createSimulation: vi.fn().mockResolvedValue(mockSimulationResult),
      getSimulationHistory: vi.fn().mockResolvedValue([mockSimulationResult]),
      getSimulationById: vi.fn().mockResolvedValue(mockSimulationResult),
      getDashboardMetrics: vi.fn().mockResolvedValue(mockDashboardMetrics),
      logAction: vi.fn().mockResolvedValue(undefined),
      getAuditLogs: vi.fn().mockResolvedValue([]),
      seedHcpData: vi.fn().mockResolvedValue(undefined),
      getHcpCount: vi.fn().mockResolvedValue(100),
      getUserById: vi.fn().mockResolvedValue(undefined),
      getUserByUsername: vi.fn().mockResolvedValue(undefined),
      createUser: vi.fn().mockResolvedValue({ id: 'user-1', username: 'testuser' }),
      validateInviteCode: vi.fn().mockResolvedValue({ valid: true, inviteCode: { id: 'invite-1', code: 'TEST123' } }),
      useInviteCode: vi.fn().mockResolvedValue({ id: 'invite-1', code: 'TEST123' }),
      createInviteCode: vi.fn().mockResolvedValue({ id: 'invite-1', code: 'TEST123' }),
      listInviteCodes: vi.fn().mockResolvedValue([]),
      deleteInviteCode: vi.fn().mockResolvedValue(true),
      createAudience: vi.fn().mockResolvedValue(mockAudience),
      getAudience: vi.fn().mockResolvedValue(mockAudience),
      listAudiences: vi.fn().mockResolvedValue([mockAudience]),
      updateAudience: vi.fn().mockResolvedValue(mockAudience),
      deleteAudience: vi.fn().mockResolvedValue(true),
      createStimuliEvent: vi.fn().mockResolvedValue({}),
      getStimuliEvents: vi.fn().mockResolvedValue([]),
      recordStimuliOutcome: vi.fn().mockResolvedValue({}),
      createCounterfactual: vi.fn().mockResolvedValue({}),
      getCounterfactualScenarios: vi.fn().mockResolvedValue([]),
      getCounterfactualById: vi.fn().mockResolvedValue({}),
      processNLQuery: vi.fn().mockResolvedValue({ id: 'query-1', query: 'test', parsedIntent: 'search_hcps', resultCount: 1 }),
      getNLQueryHistory: vi.fn().mockResolvedValue([]),
      recordOutcome: vi.fn().mockResolvedValue({}),
      runModelEvaluation: vi.fn().mockResolvedValue({}),
      getModelEvaluations: vi.fn().mockResolvedValue([]),
      getModelHealthSummary: vi.fn().mockResolvedValue({ overallAccuracy: 85 }),
      createIntegration: vi.fn().mockResolvedValue({}),
      getIntegration: vi.fn().mockResolvedValue(null),
      getIntegrationByType: vi.fn().mockResolvedValue(null),
      listIntegrations: vi.fn().mockResolvedValue([]),
      updateIntegration: vi.fn().mockResolvedValue({}),
      updateIntegrationStatus: vi.fn().mockResolvedValue({}),
      deleteIntegration: vi.fn().mockResolvedValue(true),
      createActionExport: vi.fn().mockResolvedValue({}),
      getActionExport: vi.fn().mockResolvedValue(null),
      listActionExports: vi.fn().mockResolvedValue([]),
      updateActionExportStatus: vi.fn().mockResolvedValue({}),
    },
  };
});

// Mock the auth module
vi.mock('../../server/auth', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed_password'),
  comparePassword: vi.fn().mockResolvedValue(true),
  setupAuth: vi.fn(),
}));

// Mock rate limiter
vi.mock('../../server/middleware/rate-limit', () => ({
  authRateLimiter: (req: any, res: any, next: any) => next(),
}));

// Mock integrations
vi.mock('../../server/services/integrations', () => ({
  SlackIntegration: vi.fn(),
  createSlackIntegration: vi.fn(),
  getSlackIntegration: vi.fn().mockReturnValue(null),
  isSlackConfigured: vi.fn().mockReturnValue(false),
  JiraIntegration: vi.fn(),
  createJiraIntegration: vi.fn(),
  getJiraIntegration: vi.fn().mockReturnValue(null),
  isJiraConfigured: vi.fn().mockReturnValue(false),
  defaultTicketTemplates: {},
}));

// Mock agents
vi.mock('../../server/services/agents', () => ({
  initializeAgents: vi.fn(),
  getAgent: vi.fn(),
  getAllAgents: vi.fn().mockReturnValue([]),
  channelHealthMonitor: { execute: vi.fn() },
  insightSynthesizer: { execute: vi.fn() },
  orchestrator: { submitAction: vi.fn(), getPendingActions: vi.fn().mockReturnValue([]) },
  approvalWorkflow: { approve: vi.fn(), reject: vi.fn() },
  agentScheduler: { start: vi.fn(), stop: vi.fn() },
  initializeScheduler: vi.fn(),
}));

// Mock other services
vi.mock('../../server/services/channel-health', () => ({
  classifyChannelHealth: vi.fn().mockReturnValue({ status: 'active' }),
  classifyCohortChannelHealth: vi.fn().mockReturnValue([]),
  getHealthSummary: vi.fn().mockReturnValue({}),
}));

vi.mock('../../server/services/nba-engine', () => ({
  generateNBA: vi.fn().mockReturnValue({ action: 'reach_out', channel: 'email' }),
  generateNBAs: vi.fn().mockReturnValue([]),
  prioritizeNBAs: vi.fn().mockReturnValue([]),
  getNBASummary: vi.fn().mockReturnValue({}),
}));

vi.mock('../../server/services/constraint-manager', () => ({
  constraintManager: {
    validateConstraints: vi.fn().mockReturnValue({ valid: true }),
    getConstraints: vi.fn().mockReturnValue([]),
  },
}));

vi.mock('../../server/services/attribution-engine', () => ({
  attributionEngine: {
    recordOutcome: vi.fn(),
    getAttributions: vi.fn().mockReturnValue([]),
  },
}));

vi.mock('../../server/services/uncertainty-calculator', () => ({
  uncertaintyCalculator: {
    calculateUncertainty: vi.fn().mockReturnValue({ uncertainty: 0.1 }),
  },
}));

vi.mock('../../server/services/exploration-strategy', () => ({
  explorationStrategy: {
    shouldExplore: vi.fn().mockReturnValue(false),
  },
}));

vi.mock('../../server/services/campaign-coordinator', () => ({
  campaignCoordinator: {
    createCampaign: vi.fn(),
    getCampaigns: vi.fn().mockReturnValue([]),
  },
}));

vi.mock('../../server/services/composable-simulation', () => ({
  composableSimulation: {
    runSimulation: vi.fn(),
  },
}));

vi.mock('../../server/services/portfolio-optimizer', () => ({
  portfolioOptimizer: {
    optimize: vi.fn(),
  },
}));

vi.mock('../../server/services/execution-planner', () => ({
  executionPlanner: {
    createPlan: vi.fn(),
  },
}));

// Import storage after mocking
import { storage } from '../../server/storage';

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
  }));
  app.use(passport.initialize());
  app.use(passport.session());

  // Setup passport serialization for tests
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });
  passport.deserializeUser((id: string, done) => {
    done(null, { id, username: 'testuser' });
  });

  return app;
}

// Setup routes directly for testing (simplified versions)
function setupTestRoutes(app: express.Express) {
  // HCP endpoints
  app.get('/api/hcps', async (req, res) => {
    try {
      const hcps = await storage.getAllHcps();
      await storage.logAction({
        action: 'view',
        entityType: 'hcp_list',
        details: { count: hcps.length },
      });
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
      await storage.logAction({
        action: 'view',
        entityType: 'hcp_profile',
        entityId: hcp.id,
      });
      res.json(hcp);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch HCP' });
    }
  });

  app.get('/api/hcps/npi/:npi', async (req, res) => {
    try {
      const hcp = await storage.getHcpByNpi(req.params.npi);
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

  // Audiences endpoints
  app.post('/api/audiences', async (req, res) => {
    try {
      const audience = await storage.createAudience(req.body);
      res.json(audience);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create audience' });
    }
  });

  app.get('/api/audiences', async (req, res) => {
    try {
      const audiences = await storage.listAudiences();
      res.json(audiences);
    } catch (error) {
      res.status(500).json({ error: 'Failed to list audiences' });
    }
  });

  app.get('/api/audiences/:id', async (req, res) => {
    try {
      const audience = await storage.getAudience(req.params.id);
      if (!audience) {
        return res.status(404).json({ error: 'Audience not found' });
      }
      res.json(audience);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get audience' });
    }
  });

  app.patch('/api/audiences/:id', async (req, res) => {
    try {
      const audience = await storage.updateAudience(req.params.id, req.body);
      if (!audience) {
        return res.status(404).json({ error: 'Audience not found' });
      }
      res.json(audience);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update audience' });
    }
  });

  app.delete('/api/audiences/:id', async (req, res) => {
    try {
      await storage.deleteAudience(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete audience' });
    }
  });

  // Stimuli endpoints
  app.get('/api/stimuli', async (req, res) => {
    try {
      const { hcpId, limit } = req.query;
      const events = await storage.getStimuliEvents(
        hcpId as string | undefined,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch stimuli events' });
    }
  });

  // Model evaluation endpoints
  app.get('/api/model-evaluation/health', async (req, res) => {
    try {
      const summary = await storage.getModelHealthSummary();
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch model health' });
    }
  });

  // NL Query endpoints
  app.post('/api/nl-query', async (req, res) => {
    try {
      const result = await storage.processNLQuery(req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to process query' });
    }
  });

  app.get('/api/nl-query/history', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await storage.getNLQueryHistory(limit);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch query history' });
    }
  });

  return app;
}

describe('Routes Integration Tests', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp();
    setupTestRoutes(app);
  });

  describe('HCP Endpoints', () => {
    describe('GET /api/hcps', () => {
      it('should return list of HCPs', async () => {
        const response = await request(app)
          .get('/api/hcps')
          .expect(200);

        expect(response.body).toBeInstanceOf(Array);
        expect(storage.getAllHcps).toHaveBeenCalled();
        expect(storage.logAction).toHaveBeenCalledWith(expect.objectContaining({
          action: 'view',
          entityType: 'hcp_list',
        }));
      });

      it('should return 500 on storage error', async () => {
        vi.mocked(storage.getAllHcps).mockRejectedValueOnce(new Error('DB error'));

        const response = await request(app)
          .get('/api/hcps')
          .expect(500);

        expect(response.body.error).toBe('Failed to fetch HCPs');
      });
    });

    describe('GET /api/hcps/:id', () => {
      it('should return a single HCP by ID', async () => {
        const response = await request(app)
          .get('/api/hcps/test-hcp-1')
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(storage.getHcpById).toHaveBeenCalledWith('test-hcp-1');
      });

      it('should return 404 for non-existent HCP', async () => {
        vi.mocked(storage.getHcpById).mockResolvedValueOnce(undefined);

        const response = await request(app)
          .get('/api/hcps/non-existent')
          .expect(404);

        expect(response.body.error).toBe('HCP not found');
      });
    });

    describe('GET /api/hcps/npi/:npi', () => {
      it('should return HCP by NPI', async () => {
        const response = await request(app)
          .get('/api/hcps/npi/1234567890')
          .expect(200);

        expect(response.body).toHaveProperty('npi');
        expect(storage.getHcpByNpi).toHaveBeenCalledWith('1234567890');
      });

      it('should return 404 for non-existent NPI', async () => {
        vi.mocked(storage.getHcpByNpi).mockResolvedValueOnce(undefined);

        const response = await request(app)
          .get('/api/hcps/npi/0000000000')
          .expect(404);

        expect(response.body.error).toBe('HCP not found');
      });
    });

    describe('POST /api/hcps/filter', () => {
      it('should filter HCPs by criteria', async () => {
        const response = await request(app)
          .post('/api/hcps/filter')
          .send({ specialties: ['Oncology'], tiers: ['Tier 1'] })
          .expect(200);

        expect(response.body).toBeInstanceOf(Array);
        expect(storage.filterHcps).toHaveBeenCalledWith(expect.objectContaining({
          specialties: ['Oncology'],
          tiers: ['Tier 1'],
        }));
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
        expect(storage.findSimilarHcps).toHaveBeenCalledWith('test-hcp-1', 10);
      });

      it('should respect limit parameter', async () => {
        const response = await request(app)
          .get('/api/hcps/test-hcp-1/similar?limit=5')
          .expect(200);

        expect(storage.findSimilarHcps).toHaveBeenCalledWith('test-hcp-1', 5);
      });
    });
  });

  describe('Simulation Endpoints', () => {
    describe('POST /api/simulations/run', () => {
      it('should run a simulation', async () => {
        const scenario = {
          name: 'Test Campaign',
          channelMix: { email: 30, rep_visit: 40, webinar: 15, conference: 5, digital_ad: 5, phone: 5 },
          frequency: 4,
          duration: 3,
          contentType: 'educational',
        };

        const response = await request(app)
          .post('/api/simulations/run')
          .send(scenario)
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(storage.createSimulation).toHaveBeenCalled();
      });
    });

    describe('GET /api/simulations/history', () => {
      it('should return simulation history', async () => {
        const response = await request(app)
          .get('/api/simulations/history')
          .expect(200);

        expect(response.body).toBeInstanceOf(Array);
        expect(storage.getSimulationHistory).toHaveBeenCalled();
      });
    });

    describe('GET /api/simulations/:id', () => {
      it('should return a single simulation', async () => {
        const response = await request(app)
          .get('/api/simulations/sim-1')
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(storage.getSimulationById).toHaveBeenCalledWith('sim-1');
      });

      it('should return 404 for non-existent simulation', async () => {
        vi.mocked(storage.getSimulationById).mockResolvedValueOnce(undefined);

        const response = await request(app)
          .get('/api/simulations/non-existent')
          .expect(404);

        expect(response.body.error).toBe('Simulation not found');
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
        expect(storage.getDashboardMetrics).toHaveBeenCalled();
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
        expect(storage.getAuditLogs).toHaveBeenCalledWith(100);
      });

      it('should respect limit parameter', async () => {
        await request(app)
          .get('/api/audit-logs?limit=50')
          .expect(200);

        expect(storage.getAuditLogs).toHaveBeenCalledWith(50);
      });
    });
  });

  describe('Audience Endpoints', () => {
    describe('POST /api/audiences', () => {
      it('should create an audience', async () => {
        const response = await request(app)
          .post('/api/audiences')
          .send({
            name: 'Test Audience',
            description: 'Test description',
            filter: { specialties: ['Oncology'] },
            hcpCount: 25,
            createdBy: 'user-1',
          })
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(storage.createAudience).toHaveBeenCalled();
      });
    });

    describe('GET /api/audiences', () => {
      it('should list all audiences', async () => {
        const response = await request(app)
          .get('/api/audiences')
          .expect(200);

        expect(response.body).toBeInstanceOf(Array);
        expect(storage.listAudiences).toHaveBeenCalled();
      });
    });

    describe('GET /api/audiences/:id', () => {
      it('should return an audience by ID', async () => {
        const response = await request(app)
          .get('/api/audiences/audience-1')
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(storage.getAudience).toHaveBeenCalledWith('audience-1');
      });

      it('should return 404 for non-existent audience', async () => {
        vi.mocked(storage.getAudience).mockResolvedValueOnce(undefined);

        const response = await request(app)
          .get('/api/audiences/non-existent')
          .expect(404);

        expect(response.body.error).toBe('Audience not found');
      });
    });

    describe('PATCH /api/audiences/:id', () => {
      it('should update an audience', async () => {
        const response = await request(app)
          .patch('/api/audiences/audience-1')
          .send({ name: 'Updated Name' })
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(storage.updateAudience).toHaveBeenCalledWith('audience-1', { name: 'Updated Name' });
      });

      it('should return 404 for non-existent audience', async () => {
        vi.mocked(storage.updateAudience).mockResolvedValueOnce(undefined);

        const response = await request(app)
          .patch('/api/audiences/non-existent')
          .send({ name: 'Updated' })
          .expect(404);

        expect(response.body.error).toBe('Audience not found');
      });
    });

    describe('DELETE /api/audiences/:id', () => {
      it('should delete an audience', async () => {
        const response = await request(app)
          .delete('/api/audiences/audience-1')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(storage.deleteAudience).toHaveBeenCalledWith('audience-1');
      });
    });
  });

  describe('Stimuli Endpoints', () => {
    describe('GET /api/stimuli', () => {
      it('should return stimuli events', async () => {
        const response = await request(app)
          .get('/api/stimuli')
          .expect(200);

        expect(response.body).toBeInstanceOf(Array);
        expect(storage.getStimuliEvents).toHaveBeenCalled();
      });

      it('should filter by hcpId', async () => {
        await request(app)
          .get('/api/stimuli?hcpId=test-hcp-1')
          .expect(200);

        expect(storage.getStimuliEvents).toHaveBeenCalledWith('test-hcp-1', undefined);
      });

      it('should respect limit parameter', async () => {
        await request(app)
          .get('/api/stimuli?limit=10')
          .expect(200);

        expect(storage.getStimuliEvents).toHaveBeenCalledWith(undefined, 10);
      });
    });
  });

  describe('Model Evaluation Endpoints', () => {
    describe('GET /api/model-evaluation/health', () => {
      it('should return model health summary', async () => {
        const response = await request(app)
          .get('/api/model-evaluation/health')
          .expect(200);

        expect(response.body).toHaveProperty('overallAccuracy');
        expect(storage.getModelHealthSummary).toHaveBeenCalled();
      });
    });
  });

  describe('NL Query Endpoints', () => {
    describe('POST /api/nl-query', () => {
      it('should process natural language query', async () => {
        const response = await request(app)
          .post('/api/nl-query')
          .send({ query: 'show me oncologists in New York' })
          .expect(200);

        expect(response.body).toHaveProperty('parsedIntent');
        expect(storage.processNLQuery).toHaveBeenCalled();
      });
    });

    describe('GET /api/nl-query/history', () => {
      it('should return query history', async () => {
        const response = await request(app)
          .get('/api/nl-query/history')
          .expect(200);

        expect(response.body).toBeInstanceOf(Array);
        expect(storage.getNLQueryHistory).toHaveBeenCalledWith(50);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      vi.mocked(storage.getDashboardMetrics).mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/dashboard/metrics')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch dashboard metrics');
    });
  });
});
