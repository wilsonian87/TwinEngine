/**
 * Real routes.ts integration tests
 * These tests actually import and call registerRoutes to get real coverage
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import session from 'express-session';
import passport from 'passport';
import { createServer } from 'http';
import type { Server } from 'http';

// Set test environment before any imports
process.env.NODE_ENV = 'test';
process.env.ADMIN_SECRET = 'test-admin-secret';

// Use vi.hoisted() to define mock data that can be used in hoisted vi.mock calls
const { mockHcpProfile, mockSimulationResult, mockDashboardMetrics, mockAudience, mockNLQueryResponse } = vi.hoisted(() => ({
  mockHcpProfile: {
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
      { channel: 'rep_visit', score: 65, lastContact: '1 week ago', totalTouches: 8, responseRate: 60 },
    ],
    monthlyRxVolume: 45,
    yearlyRxVolume: 540,
    marketSharePct: 22.5,
    prescribingTrend: [{ month: 'Dec', rxCount: 45, marketShare: 22.5 }],
    conversionLikelihood: 68,
    churnRisk: 15,
    lastUpdated: new Date().toISOString(),
  },
  mockSimulationResult: {
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
  },
  mockDashboardMetrics: {
    totalHcps: 100,
    avgEngagementScore: 65,
    totalSimulations: 10,
    avgPredictedLift: 8.5,
    segmentDistribution: [],
    channelEffectiveness: [],
    tierBreakdown: [],
    engagementTrend: [],
  },
  mockAudience: {
    id: 'audience-1',
    name: 'Test Audience',
    description: 'Test description',
    filter: { specialties: ['Oncology'] },
    hcpCount: 25,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'user-1',
  },
  mockNLQueryResponse: {
    id: 'query-1',
    query: 'test query',
    parsedIntent: 'search_hcps',
    filters: {},
    resultCount: 1,
    recommendations: [],
    executionTimeMs: 50,
    createdAt: new Date().toISOString(),
  },
}));

// Mock storage module
vi.mock('../../server/storage', () => ({
  storage: {
    getAllHcps: vi.fn().mockResolvedValue([mockHcpProfile]),
    getHcpById: vi.fn().mockImplementation((id) =>
      id === 'test-hcp-1' ? Promise.resolve(mockHcpProfile) : Promise.resolve(undefined)
    ),
    getHcpByNpi: vi.fn().mockImplementation((npi) =>
      npi === '1234567890' ? Promise.resolve(mockHcpProfile) : Promise.resolve(undefined)
    ),
    filterHcps: vi.fn().mockResolvedValue([mockHcpProfile]),
    findSimilarHcps: vi.fn().mockResolvedValue([mockHcpProfile]),
    createSimulation: vi.fn().mockResolvedValue(mockSimulationResult),
    getSimulationHistory: vi.fn().mockResolvedValue([mockSimulationResult]),
    getSimulationById: vi.fn().mockImplementation((id) =>
      id === 'sim-result-1' ? Promise.resolve(mockSimulationResult) : Promise.resolve(undefined)
    ),
    getDashboardMetrics: vi.fn().mockResolvedValue(mockDashboardMetrics),
    logAction: vi.fn().mockResolvedValue(undefined),
    getAuditLogs: vi.fn().mockResolvedValue([]),
    seedHcpData: vi.fn().mockResolvedValue(undefined),
    getHcpCount: vi.fn().mockResolvedValue(100),
    getUserById: vi.fn().mockResolvedValue(undefined),
    getUserByUsername: vi.fn().mockResolvedValue(undefined),
    createUser: vi.fn().mockResolvedValue({ id: 'user-1', username: 'testuser' }),
    validateInviteCode: vi.fn().mockResolvedValue({ valid: true, inviteCode: { id: 'invite-1', code: 'TEST123', email: 'test@example.com' } }),
    useInviteCode: vi.fn().mockResolvedValue({ id: 'invite-1', code: 'TEST123' }),
    createInviteCode: vi.fn().mockResolvedValue({ id: 'invite-1', code: 'NEWCODE', email: 'new@example.com' }),
    listInviteCodes: vi.fn().mockResolvedValue([{ id: 'invite-1', code: 'TEST123' }]),
    deleteInviteCode: vi.fn().mockResolvedValue(true),
    createAudience: vi.fn().mockResolvedValue(mockAudience),
    getAudience: vi.fn().mockImplementation((id) =>
      id === 'audience-1' ? Promise.resolve(mockAudience) : Promise.resolve(undefined)
    ),
    listAudiences: vi.fn().mockResolvedValue([mockAudience]),
    updateAudience: vi.fn().mockImplementation((id, updates) =>
      id === 'audience-1' ? Promise.resolve({ ...mockAudience, ...updates }) : Promise.resolve(undefined)
    ),
    deleteAudience: vi.fn().mockResolvedValue(true),
    createStimuliEvent: vi.fn().mockResolvedValue({ id: 'stimuli-1' }),
    getStimuliEvents: vi.fn().mockResolvedValue([]),
    recordStimuliOutcome: vi.fn().mockResolvedValue({ id: 'stimuli-1' }),
    createCounterfactual: vi.fn().mockResolvedValue({ id: 'cf-1' }),
    getCounterfactualScenarios: vi.fn().mockResolvedValue([]),
    getCounterfactualById: vi.fn().mockResolvedValue(null),
    processNLQuery: vi.fn().mockResolvedValue(mockNLQueryResponse),
    getNLQueryHistory: vi.fn().mockResolvedValue([mockNLQueryResponse]),
    recordOutcome: vi.fn().mockResolvedValue({ id: 'outcome-1' }),
    runModelEvaluation: vi.fn().mockResolvedValue({ id: 'eval-1' }),
    getModelEvaluations: vi.fn().mockResolvedValue([]),
    getModelHealthSummary: vi.fn().mockResolvedValue({ overallAccuracy: 85, totalEvaluations: 10 }),
    createIntegration: vi.fn().mockResolvedValue({ id: 'int-1' }),
    getIntegration: vi.fn().mockResolvedValue(null),
    getIntegrationByType: vi.fn().mockResolvedValue(null),
    listIntegrations: vi.fn().mockResolvedValue([]),
    updateIntegration: vi.fn().mockResolvedValue(null),
    updateIntegrationStatus: vi.fn().mockResolvedValue(null),
    deleteIntegration: vi.fn().mockResolvedValue(true),
    createActionExport: vi.fn().mockResolvedValue({ id: 'action-1' }),
    getActionExport: vi.fn().mockResolvedValue(null),
    listActionExports: vi.fn().mockResolvedValue([]),
    updateActionExportStatus: vi.fn().mockResolvedValue(null),
  },
}));

// Mock auth module
vi.mock('../../server/auth', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed_password'),
  comparePassword: vi.fn().mockResolvedValue(true),
  setupAuth: vi.fn(),
}));

// Mock rate limiter - bypass for tests
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
  getAgent: vi.fn().mockReturnValue(null),
  getAllAgents: vi.fn().mockReturnValue([]),
  channelHealthMonitor: { id: 'channel-health', execute: vi.fn().mockResolvedValue({}) },
  insightSynthesizer: { id: 'insight-synth', execute: vi.fn().mockResolvedValue({}) },
  orchestrator: {
    submitAction: vi.fn().mockResolvedValue({ id: 'action-1' }),
    getPendingActions: vi.fn().mockReturnValue([]),
  },
  approvalWorkflow: {
    approve: vi.fn().mockResolvedValue({}),
    reject: vi.fn().mockResolvedValue({}),
  },
  agentScheduler: {
    start: vi.fn(),
    stop: vi.fn(),
    getScheduledJobs: vi.fn().mockReturnValue([]),
  },
  initializeScheduler: vi.fn().mockResolvedValue(undefined),
}));

// Mock channel-health service
vi.mock('../../server/services/channel-health', () => ({
  classifyChannelHealth: vi.fn().mockReturnValue({
    hcpId: 'test-hcp-1',
    channel: 'email',
    status: 'active',
    score: 80,
  }),
  classifyCohortChannelHealth: vi.fn().mockReturnValue([]),
  getHealthSummary: vi.fn().mockReturnValue({ totalHcps: 100, healthyCount: 80 }),
}));

// Mock nba-engine service
vi.mock('../../server/services/nba-engine', () => ({
  generateNBA: vi.fn().mockReturnValue({
    hcpId: 'test-hcp-1',
    action: 'reach_out',
    channel: 'email',
    priority: 'high',
    reasoning: 'Test reasoning',
  }),
  generateNBAs: vi.fn().mockReturnValue([]),
  prioritizeNBAs: vi.fn().mockReturnValue([]),
  getNBASummary: vi.fn().mockReturnValue({ totalNBAs: 10, highPriority: 3 }),
}));

// Mock constraint-manager
vi.mock('../../server/services/constraint-manager', () => ({
  constraintManager: {
    validateConstraints: vi.fn().mockReturnValue({ valid: true, violations: [] }),
    getConstraints: vi.fn().mockReturnValue([]),
    setConstraint: vi.fn(),
  },
}));

// Mock attribution-engine
vi.mock('../../server/services/attribution-engine', () => ({
  attributionEngine: {
    recordOutcome: vi.fn().mockResolvedValue({ id: 'outcome-1' }),
    getAttributions: vi.fn().mockReturnValue([]),
    getConfig: vi.fn().mockReturnValue({}),
    updateConfig: vi.fn(),
  },
}));

// Mock uncertainty-calculator
vi.mock('../../server/services/uncertainty-calculator', () => ({
  uncertaintyCalculator: {
    calculateUncertainty: vi.fn().mockReturnValue({ uncertainty: 0.1, confidence: 0.9 }),
    batchCalculate: vi.fn().mockReturnValue([]),
  },
}));

// Mock exploration-strategy
vi.mock('../../server/services/exploration-strategy', () => ({
  explorationStrategy: {
    shouldExplore: vi.fn().mockReturnValue(false),
    getExplorationDecision: vi.fn().mockReturnValue({ explore: false }),
    getConfig: vi.fn().mockReturnValue({}),
    updateConfig: vi.fn(),
  },
}));

// Mock campaign-coordinator
vi.mock('../../server/services/campaign-coordinator', () => ({
  campaignCoordinator: {
    createCampaign: vi.fn().mockResolvedValue({ id: 'campaign-1' }),
    getCampaign: vi.fn().mockReturnValue(null),
    getCampaigns: vi.fn().mockReturnValue([]),
    reserveHcp: vi.fn().mockReturnValue({ success: true }),
    checkAvailability: vi.fn().mockReturnValue({ available: true }),
    resolveConflict: vi.fn().mockReturnValue({ resolved: true }),
  },
}));

// Mock composable-simulation
vi.mock('../../server/services/composable-simulation', () => ({
  composableSimulation: {
    createBatch: vi.fn().mockResolvedValue({ id: 'batch-1' }),
    runBatch: vi.fn().mockResolvedValue({ results: [] }),
    getBatch: vi.fn().mockReturnValue(null),
    generateVariants: vi.fn().mockReturnValue([]),
    runIncremental: vi.fn().mockResolvedValue({}),
    compareScenarios: vi.fn().mockReturnValue({}),
  },
}));

// Mock portfolio-optimizer
vi.mock('../../server/services/portfolio-optimizer', () => ({
  portfolioOptimizer: {
    createProblem: vi.fn().mockResolvedValue({ id: 'problem-1' }),
    solve: vi.fn().mockResolvedValue({ solution: {} }),
    getProblem: vi.fn().mockReturnValue(null),
    runWhatIf: vi.fn().mockReturnValue({}),
  },
}));

// Mock execution-planner
vi.mock('../../server/services/execution-planner', () => ({
  executionPlanner: {
    createPlan: vi.fn().mockResolvedValue({ id: 'plan-1' }),
    getPlan: vi.fn().mockReturnValue(null),
    getPlans: vi.fn().mockReturnValue([]),
    rebalancePlan: vi.fn().mockResolvedValue({}),
  },
}));

// Mock utils - use actual env vars when available
vi.mock('../../server/utils/config', () => ({
  requireEnvVar: vi.fn().mockImplementation((name, defaultValue) => process.env[name] || defaultValue || 'test-value'),
}));

vi.mock('../../server/utils/validation', () => ({
  safeParseLimitOffset: vi.fn().mockReturnValue({ limit: 100, offset: 0 }),
  safeParseLimit: vi.fn().mockReturnValue(100),
}));

// Now import the routes after all mocks are set up
import { registerRoutes } from '../../server/routes';
import { storage } from '../../server/storage';

describe('Routes.ts Real Integration Tests', () => {
  let app: express.Express;
  let httpServer: Server;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
    }));
    app.use(passport.initialize());
    app.use(passport.session());

    passport.serializeUser((user: any, done) => done(null, user.id));
    passport.deserializeUser((id: string, done) => done(null, { id, username: 'testuser' }));

    httpServer = createServer(app);

    // Register the actual routes
    await registerRoutes(httpServer, app);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    httpServer.close();
  });

  describe('HCP Endpoints', () => {
    it('GET /api/hcps should return all HCPs', async () => {
      const response = await request(app).get('/api/hcps').expect(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(storage.getAllHcps).toHaveBeenCalled();
    });

    it('GET /api/hcps/:id should return HCP by ID', async () => {
      const response = await request(app).get('/api/hcps/test-hcp-1').expect(200);
      expect(response.body).toHaveProperty('id', 'test-hcp-1');
    });

    it('GET /api/hcps/:id should return 404 for non-existent HCP', async () => {
      const response = await request(app).get('/api/hcps/non-existent').expect(404);
      expect(response.body.error).toBe('HCP not found');
    });

    it('GET /api/hcps/npi/:npi should return HCP by NPI', async () => {
      const response = await request(app).get('/api/hcps/npi/1234567890').expect(200);
      expect(response.body).toHaveProperty('npi', '1234567890');
    });

    it('POST /api/hcps/filter should filter HCPs', async () => {
      const response = await request(app)
        .post('/api/hcps/filter')
        .send({ specialties: ['Oncology'] })
        .expect(200);
      expect(response.body).toBeInstanceOf(Array);
    });

    it('GET /api/hcps/:id/similar should return similar HCPs', async () => {
      const response = await request(app).get('/api/hcps/test-hcp-1/similar').expect(200);
      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('Simulation Endpoints', () => {
    it('POST /api/simulations/run should create simulation', async () => {
      const scenario = {
        name: 'Test Campaign',
        targetHcpIds: ['test-hcp-1', 'test-hcp-2'],
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
    });

    it('GET /api/simulations/history should return history', async () => {
      const response = await request(app).get('/api/simulations/history').expect(200);
      expect(response.body).toBeInstanceOf(Array);
    });

    it('GET /api/simulations/:id should return simulation by ID', async () => {
      const response = await request(app).get('/api/simulations/sim-result-1').expect(200);
      expect(response.body).toHaveProperty('id');
    });
  });

  describe('Dashboard Endpoints', () => {
    it('GET /api/dashboard/metrics should return metrics', async () => {
      const response = await request(app).get('/api/dashboard/metrics').expect(200);
      expect(response.body).toHaveProperty('totalHcps');
      expect(response.body).toHaveProperty('avgEngagementScore');
    });
  });

  describe('Audience Endpoints', () => {
    it('GET /api/audiences should list audiences', async () => {
      const response = await request(app).get('/api/audiences').expect(200);
      expect(response.body).toBeInstanceOf(Array);
    });

    it('POST /api/audiences should create audience', async () => {
      const response = await request(app)
        .post('/api/audiences')
        .send({
          name: 'Test Audience',
          hcpIds: ['test-hcp-1', 'test-hcp-2'],
          hcpCount: 2,
          filters: { specialties: ['Oncology'] },
          source: 'explorer',
        })
        .expect(200);
      expect(response.body).toHaveProperty('id');
    });

    it('GET /api/audiences/:id should return audience by ID', async () => {
      const response = await request(app).get('/api/audiences/audience-1').expect(200);
      expect(response.body).toHaveProperty('id', 'audience-1');
    });

    it('PATCH /api/audiences/:id should update audience', async () => {
      const response = await request(app)
        .patch('/api/audiences/audience-1')
        .send({ name: 'Updated Name' })
        .expect(200);
      expect(response.body).toHaveProperty('name', 'Updated Name');
    });

    it('DELETE /api/audiences/:id should delete audience', async () => {
      const response = await request(app).delete('/api/audiences/audience-1').expect(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('NL Query Endpoints', () => {
    it('POST /api/nl-query should process query', async () => {
      const response = await request(app)
        .post('/api/nl-query')
        .send({ query: 'show me oncologists' })
        .expect(200);
      expect(response.body).toHaveProperty('parsedIntent');
    });

    it('GET /api/nl-query/history should return history', async () => {
      const response = await request(app).get('/api/nl-query/history').expect(200);
      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('Model Health Endpoints', () => {
    it('GET /api/model-health should return health summary', async () => {
      const response = await request(app).get('/api/model-health').expect(200);
      expect(response.body).toHaveProperty('overallAccuracy');
    });
  });

  describe('Audit Log Endpoints', () => {
    it('GET /api/audit-logs should return logs', async () => {
      const response = await request(app).get('/api/audit-logs').expect(200);
      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('Admin Endpoints', () => {
    it('GET /api/admin/codes should require admin secret', async () => {
      const response = await request(app).get('/api/admin/codes').expect(403);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('GET /api/admin/codes with valid secret should return codes', async () => {
      const response = await request(app)
        .get('/api/admin/codes')
        .set('x-admin-secret', 'test-admin-secret')
        .expect(200);
      expect(response.body).toBeInstanceOf(Array);
    });

    it('POST /api/admin/codes should create invite code', async () => {
      const response = await request(app)
        .post('/api/admin/codes')
        .set('x-admin-secret', 'test-admin-secret')
        .send({
          code: 'NEWCODE',
          email: 'test@example.com',
          label: 'Test Code',
          maxUses: 5,
        })
        .expect(200);
      expect(response.body).toHaveProperty('id');
    });

    it('DELETE /api/admin/codes/:id should delete code', async () => {
      const response = await request(app)
        .delete('/api/admin/codes/invite-1')
        .set('x-admin-secret', 'test-admin-secret')
        .expect(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Channel Health Endpoints', () => {
    it('GET /api/hcps/:id/channel-health should return health', async () => {
      const response = await request(app).get('/api/hcps/test-hcp-1/channel-health').expect(200);
      expect(response.body).toHaveProperty('hcpId');
    });
  });

  describe('NBA Endpoints', () => {
    it('GET /api/hcps/:id/nba should return NBA', async () => {
      const response = await request(app).get('/api/hcps/test-hcp-1/nba').expect(200);
      expect(response.body).toHaveProperty('action');
    });
  });

  describe('Invite Code Endpoints', () => {
    it('POST /api/invite/validate should validate code', async () => {
      const response = await request(app)
        .post('/api/invite/validate')
        .send({ code: 'TEST123', email: 'test@example.com' })
        .expect(200);
      expect(response.body.success).toBe(true);
    });

    it('GET /api/invite/session should return session status', async () => {
      const response = await request(app).get('/api/invite/session').expect(200);
      expect(response.body).toHaveProperty('authenticated');
    });
  });

  describe('Stimuli Endpoints', () => {
    it('GET /api/stimuli should return stimuli events', async () => {
      const response = await request(app).get('/api/stimuli').expect(200);
      expect(response.body).toBeInstanceOf(Array);
    });

    it('POST /api/stimuli should create stimuli event', async () => {
      const response = await request(app)
        .post('/api/stimuli')
        .send({
          hcpId: 'test-hcp-1',
          stimulusType: 'email_send',
          channel: 'email',
          timestamp: new Date().toISOString(),
        })
        .expect(200);
      expect(response.body).toHaveProperty('id');
    });
  });

  describe('Counterfactual Endpoints', () => {
    it('GET /api/counterfactuals should return scenarios', async () => {
      const response = await request(app).get('/api/counterfactuals').expect(200);
      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('Integration Endpoints (Auth Required)', () => {
    it('GET /api/integrations should require authentication', async () => {
      const response = await request(app).get('/api/integrations').expect(401);
      expect(response.body).toHaveProperty('error');
    });

    it('GET /api/integrations/slack/status should require authentication', async () => {
      const response = await request(app).get('/api/integrations/slack/status').expect(401);
      expect(response.body).toHaveProperty('error');
    });

    it('GET /api/integrations/jira/status should require authentication', async () => {
      const response = await request(app).get('/api/integrations/jira/status').expect(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Agent Endpoints (Auth Required)', () => {
    it('GET /api/agents should require authentication', async () => {
      const response = await request(app).get('/api/agents').expect(401);
      expect(response.body).toHaveProperty('error');
    });

    it('GET /api/agent-actions should require authentication', async () => {
      const response = await request(app).get('/api/agent-actions').expect(401);
      expect(response.body).toHaveProperty('error');
    });

    it('GET /api/agent-actions/pending should require authentication', async () => {
      const response = await request(app).get('/api/agent-actions/pending').expect(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Action Export Endpoints (Auth Required)', () => {
    it('GET /api/action-exports should require authentication', async () => {
      const response = await request(app).get('/api/action-exports').expect(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Channel Health Cohort Endpoint', () => {
    it('POST /api/channel-health/cohort should return cohort health object', async () => {
      const response = await request(app)
        .post('/api/channel-health/cohort')
        .send({ hcpIds: ['test-hcp-1'] })
        .expect(200);
      expect(response.body).toHaveProperty('totalHcps');
      expect(response.body).toHaveProperty('channelHealth');
    });
  });

  describe('NBA Generation Endpoint', () => {
    it('POST /api/nba/generate should generate NBAs', async () => {
      const response = await request(app)
        .post('/api/nba/generate')
        .send({ hcpIds: ['test-hcp-1'] })
        .expect(200);
      expect(response.body).toHaveProperty('nbas');
    });
  });

  describe('Export Endpoints', () => {
    it('GET /api/export/hcps should export HCPs', async () => {
      const response = await request(app).get('/api/export/hcps').expect(200);
      // Response type can vary based on implementation
      expect(response.status).toBe(200);
    });
  });

  describe('Constraint Endpoints (Auth Required)', () => {
    it('GET /api/constraints/summary should require auth', async () => {
      const response = await request(app).get('/api/constraints/summary').expect(401);
      expect(response.body).toHaveProperty('error');
    });

    it('POST /api/constraints/check should require auth', async () => {
      const response = await request(app)
        .post('/api/constraints/check')
        .send({ hcpId: 'test-hcp-1', channel: 'email' })
        .expect(401);
      expect(response.body).toHaveProperty('error');
    });

    it('GET /api/constraints/capacity should require auth', async () => {
      const response = await request(app).get('/api/constraints/capacity').expect(401);
      expect(response.body).toHaveProperty('error');
    });

    it('GET /api/constraints/contact-limits should require auth', async () => {
      const response = await request(app).get('/api/constraints/contact-limits').expect(401);
      expect(response.body).toHaveProperty('error');
    });

    it('GET /api/constraints/compliance-windows should require auth', async () => {
      const response = await request(app).get('/api/constraints/compliance-windows').expect(401);
      expect(response.body).toHaveProperty('error');
    });

    it('GET /api/constraints/budget should require auth', async () => {
      const response = await request(app).get('/api/constraints/budget').expect(401);
      expect(response.body).toHaveProperty('error');
    });

    it('GET /api/constraints/territories should require auth', async () => {
      const response = await request(app).get('/api/constraints/territories').expect(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Orchestrator Endpoints (Auth Required)', () => {
    it('GET /api/orchestrator/status should require authentication', async () => {
      const response = await request(app).get('/api/orchestrator/status').expect(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Scheduler Endpoints (Auth Required)', () => {
    it('GET /api/scheduler/status should require authentication', async () => {
      const response = await request(app).get('/api/scheduler/status').expect(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Alert Endpoints (Auth Required)', () => {
    it('GET /api/alerts should require authentication', async () => {
      const response = await request(app).get('/api/alerts').expect(401);
      expect(response.body).toHaveProperty('error');
    });

    it('GET /api/alerts/count should require authentication', async () => {
      const response = await request(app).get('/api/alerts/count').expect(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Approval Rules Endpoints (Auth Required)', () => {
    it('GET /api/approval-rules should require authentication', async () => {
      const response = await request(app).get('/api/approval-rules').expect(401);
      expect(response.body).toHaveProperty('error');
    });

    it('GET /api/approval-rules/enabled should require authentication', async () => {
      const response = await request(app).get('/api/approval-rules/enabled').expect(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Model Evaluation Endpoints', () => {
    it('GET /api/model-evaluation should return evaluations', async () => {
      const response = await request(app).get('/api/model-evaluation').expect(200);
      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('Auth Endpoints', () => {
    it('GET /api/auth/user should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/auth/user').expect(401);
      expect(response.body).toHaveProperty('error');
    });

    it('POST /api/auth/register with invalid data should return 400', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: '' })
        .expect(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent audience', async () => {
      (storage.getAudience as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
      const response = await request(app).get('/api/audiences/non-existent').expect(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent counterfactual', async () => {
      const response = await request(app).get('/api/counterfactuals/non-existent').expect(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent simulation', async () => {
      (storage.getSimulationById as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);
      const response = await request(app).get('/api/simulations/non-existent').expect(404);
      expect(response.body).toHaveProperty('error');
    });
  });
});
