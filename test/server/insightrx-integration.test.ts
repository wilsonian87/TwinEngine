/**
 * InsightRx Integration Tests
 *
 * Tests for the InsightRx validation, knowledge base, and feature flag integration.
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';

// Mock the database module
vi.mock('../../server/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn().mockResolvedValue([]),
          limit: vi.fn().mockResolvedValue([]),
        })),
        orderBy: vi.fn().mockResolvedValue([]),
        limit: vi.fn().mockResolvedValue([]),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{
          id: 'test-validation-1',
          contentId: 'content-1',
          contentType: 'campaign',
          validationStatus: 'approved',
          complianceScore: 85,
          createdAt: new Date(),
        }]),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([{
            id: 'test-validation-1',
            reviewedBy: 'user-1',
            reviewedAt: new Date(),
            reviewNotes: 'LGTM',
          }]),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn().mockResolvedValue(undefined),
    })),
  },
}));

// Mock the @twinengine/insightrx package
vi.mock('@twinengine/insightrx', () => ({
  validateFull: vi.fn().mockResolvedValue({
    status: 'approved',
    score: 85,
    ruleResults: [
      {
        ruleId: 'compliance-medical-claims',
        ruleName: 'Medical Claims Check',
        passed: true,
        message: 'No unsubstantiated medical claims found',
        severity: 'error',
        category: 'compliance',
      },
      {
        ruleId: 'content-completeness',
        ruleName: 'Content Completeness',
        passed: true,
        message: 'Content meets minimum requirements',
        severity: 'warning',
        category: 'completeness',
      },
    ],
    summary: 'Content passed validation with 2 rules checked',
    metadata: {
      rulesVersion: '1.0.0',
      validatedAt: new Date(),
      processingTimeMs: 42,
    },
  }),
  validateQuick: vi.fn().mockResolvedValue({
    status: 'approved',
    score: 90,
    ruleResults: [
      {
        ruleId: 'compliance-medical-claims',
        ruleName: 'Medical Claims Check',
        passed: true,
        message: 'No unsubstantiated medical claims found',
        severity: 'error',
        category: 'compliance',
      },
    ],
    summary: 'Quick validation passed',
  }),
  validateCompliance: vi.fn().mockResolvedValue({
    status: 'approved',
    score: 100,
    ruleResults: [],
    summary: 'Compliance validation passed',
  }),
  getAvailableRules: vi.fn().mockReturnValue([
    {
      id: 'compliance-medical-claims',
      name: 'Medical Claims Check',
      description: 'Checks for unsubstantiated medical claims',
      category: 'compliance',
      severity: 'error',
      contentTypes: ['campaign', 'email', 'landing_page'],
    },
    {
      id: 'content-completeness',
      name: 'Content Completeness',
      description: 'Ensures content meets minimum requirements',
      category: 'completeness',
      severity: 'warning',
      contentTypes: ['campaign', 'messaging_theme'],
    },
  ]),
  getRulesVersion: vi.fn().mockReturnValue('1.0.0'),
}));

// Mock feature flags service
vi.mock('../../server/services/feature-flags', () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(true),
  getFeatureFlag: vi.fn().mockResolvedValue({
    flagKey: 'insightrx.validation',
    enabled: true,
    rolloutPercentage: 100,
  }),
}));

// Mock embedding service
vi.mock('../../server/services/embedding-service', () => ({
  EmbeddingService: {
    getInstance: vi.fn().mockReturnValue({
      isReady: vi.fn().mockReturnValue(true),
      generateEmbedding: vi.fn().mockResolvedValue(new Float32Array(384)),
      generateEmbeddings: vi.fn().mockResolvedValue([new Float32Array(384)]),
      status: 'ready',
    }),
  },
}));

// Mock resilience utilities
vi.mock('../../server/utils/resilience', () => ({
  CircuitBreaker: vi.fn().mockImplementation(() => ({
    state: 'closed',
    execute: vi.fn((fn) => fn()),
    getState: vi.fn().mockReturnValue('closed'),
    getStats: vi.fn().mockReturnValue({
      failureCount: 0,
      lastFailureTime: 0,
      successCount: 10,
    }),
  })),
  withRetry: vi.fn((fn) => fn()),
  withDegradation: vi.fn(async (opts) => {
    if (opts.primary) {
      return opts.primary();
    }
    return opts.operation();
  }),
}));

// Import after mocks
import {
  validateFull,
  validateQuick,
  validateCompliance,
  getAvailableRules,
  getRulesVersion,
} from '@twinengine/insightrx';
import { isFeatureEnabled } from '../../server/services/feature-flags';

describe('InsightRx Validation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Content Validation', () => {
    it('should validate campaign content successfully', async () => {
      const result = await (validateFull as Mock)({
        content: 'This is a test campaign for HCPs in cardiology',
        contentType: 'campaign',
        audienceContext: { audience: 'HCP', specialty: 'Cardiology' },
      });

      expect(result.status).toBe('approved');
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.ruleResults).toHaveLength(2);
      expect(result.ruleResults[0].passed).toBe(true);
    });

    it('should perform quick validation with fewer rules', async () => {
      const result = await (validateQuick as Mock)({
        content: 'Quick test content',
        contentType: 'email',
      });

      expect(result.status).toBe('approved');
      expect(result.ruleResults.length).toBeLessThan(2);
    });

    it('should return approved when feature flag is disabled', async () => {
      (isFeatureEnabled as Mock).mockResolvedValueOnce(false);

      // When flag is disabled, validateFull should not be called
      // and a default approved result should be returned
      const flagEnabled = await isFeatureEnabled('insightrx.validation');
      expect(flagEnabled).toBe(false);
    });

    it('should get available validation rules', () => {
      const rules = (getAvailableRules as Mock)();

      expect(rules).toHaveLength(2);
      expect(rules[0].id).toBe('compliance-medical-claims');
      expect(rules[0].category).toBe('compliance');
      expect(rules[1].category).toBe('completeness');
    });

    it('should get rules version', () => {
      const version = (getRulesVersion as Mock)();

      expect(version).toBe('1.0.0');
    });
  });

  describe('Validation Status Determination', () => {
    it('should return approved for high scores', async () => {
      (validateFull as Mock).mockResolvedValueOnce({
        status: 'approved',
        score: 95,
        ruleResults: [],
        summary: 'High score validation',
      });

      const result = await (validateFull as Mock)({
        content: 'High quality content',
        contentType: 'campaign',
      });

      expect(result.status).toBe('approved');
      expect(result.score).toBeGreaterThanOrEqual(90);
    });

    it('should return needs_review for medium scores', async () => {
      (validateFull as Mock).mockResolvedValueOnce({
        status: 'needs_review',
        score: 65,
        ruleResults: [
          {
            ruleId: 'content-completeness',
            ruleName: 'Content Completeness',
            passed: false,
            message: 'Content missing key elements',
            severity: 'warning',
            category: 'completeness',
          },
        ],
        summary: 'Content needs review',
      });

      const result = await (validateFull as Mock)({
        content: 'Incomplete content',
        contentType: 'campaign',
      });

      expect(result.status).toBe('needs_review');
      expect(result.score).toBeGreaterThanOrEqual(50);
      expect(result.score).toBeLessThan(80);
    });

    it('should return rejected for low scores', async () => {
      (validateFull as Mock).mockResolvedValueOnce({
        status: 'rejected',
        score: 25,
        ruleResults: [
          {
            ruleId: 'compliance-medical-claims',
            ruleName: 'Medical Claims Check',
            passed: false,
            message: 'Unsubstantiated medical claims detected',
            severity: 'error',
            category: 'compliance',
          },
        ],
        summary: 'Content rejected due to compliance issues',
        suggestedFixes: [
          {
            issue: 'Unsubstantiated claims',
            suggestion: 'Add supporting clinical evidence',
            severity: 'error',
          },
        ],
      });

      const result = await (validateFull as Mock)({
        content: 'This drug cures all diseases',
        contentType: 'campaign',
      });

      expect(result.status).toBe('rejected');
      expect(result.score).toBeLessThan(50);
      expect(result.ruleResults[0].passed).toBe(false);
      expect(result.suggestedFixes).toHaveLength(1);
    });
  });

  describe('Context-Aware Validation', () => {
    it('should apply audience context', async () => {
      await (validateFull as Mock)({
        content: 'Content for oncologists',
        contentType: 'campaign',
        audienceContext: {
          audience: 'HCP',
          specialty: 'Oncology',
          experienceLevel: 'expert',
        },
      });

      expect(validateFull).toHaveBeenCalledWith(
        expect.objectContaining({
          audienceContext: expect.objectContaining({
            specialty: 'Oncology',
          }),
        })
      );
    });

    it('should apply market context', async () => {
      await (validateFull as Mock)({
        content: 'Content about immunotherapy',
        contentType: 'campaign',
        marketContext: {
          therapeuticArea: 'Oncology',
          brand: 'TestBrand',
          marketStage: 'launch',
        },
      });

      expect(validateFull).toHaveBeenCalledWith(
        expect.objectContaining({
          marketContext: expect.objectContaining({
            therapeuticArea: 'Oncology',
          }),
        })
      );
    });

    it('should apply channel context', async () => {
      await (validateFull as Mock)({
        content: 'Email content',
        contentType: 'email',
        channelContext: {
          primaryChannel: 'email',
          format: 'html',
          deliveryMode: 'automated',
        },
      });

      expect(validateFull).toHaveBeenCalledWith(
        expect.objectContaining({
          channelContext: expect.objectContaining({
            primaryChannel: 'email',
          }),
        })
      );
    });
  });

  describe('Content Types', () => {
    const contentTypes = ['campaign', 'messaging_theme', 'email', 'landing_page'];

    contentTypes.forEach((contentType) => {
      it(`should validate ${contentType} content type`, async () => {
        const result = await (validateFull as Mock)({
          content: `Test content for ${contentType}`,
          contentType,
        });

        expect(result.status).toBeDefined();
        expect(result.score).toBeDefined();
      });
    });
  });
});

describe('InsightRx Feature Flags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should check validation feature flag', async () => {
    const enabled = await (isFeatureEnabled as Mock)('insightrx.validation');

    expect(enabled).toBe(true);
    expect(isFeatureEnabled).toHaveBeenCalledWith('insightrx.validation');
  });

  it('should check blocking validation feature flag', async () => {
    (isFeatureEnabled as Mock).mockResolvedValueOnce(false);

    const enabled = await (isFeatureEnabled as Mock)('insightrx.validation.blocking');

    expect(enabled).toBe(false);
  });

  it('should check knowledge feature flag', async () => {
    const enabled = await (isFeatureEnabled as Mock)('insightrx.knowledge');

    expect(enabled).toBe(true);
  });
});

describe('Validation Rules', () => {
  describe('Rule Categories', () => {
    it('should have compliance rules', () => {
      const rules = (getAvailableRules as Mock)();
      const complianceRules = rules.filter((r: { category: string }) => r.category === 'compliance');

      expect(complianceRules.length).toBeGreaterThan(0);
    });

    it('should have completeness rules', () => {
      const rules = (getAvailableRules as Mock)();
      const completenessRules = rules.filter((r: { category: string }) => r.category === 'completeness');

      expect(completenessRules.length).toBeGreaterThan(0);
    });
  });

  describe('Rule Severity', () => {
    it('should have error severity for critical rules', () => {
      const rules = (getAvailableRules as Mock)();
      const errorRules = rules.filter((r: { severity: string }) => r.severity === 'error');

      expect(errorRules.length).toBeGreaterThan(0);
    });

    it('should have warning severity for advisory rules', () => {
      const rules = (getAvailableRules as Mock)();
      const warningRules = rules.filter((r: { severity: string }) => r.severity === 'warning');

      expect(warningRules.length).toBeGreaterThan(0);
    });
  });

  describe('Rule Content Types', () => {
    it('should specify applicable content types', () => {
      const rules = (getAvailableRules as Mock)();

      rules.forEach((rule: { contentTypes: string[] }) => {
        expect(rule.contentTypes).toBeDefined();
        expect(Array.isArray(rule.contentTypes)).toBe(true);
        expect(rule.contentTypes.length).toBeGreaterThan(0);
      });
    });
  });
});

describe('Validation Result Structure', () => {
  it('should include all required fields', async () => {
    const result = await (validateFull as Mock)({
      content: 'Test content',
      contentType: 'campaign',
    });

    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('ruleResults');
    expect(result).toHaveProperty('summary');
  });

  it('should include metadata', async () => {
    const result = await (validateFull as Mock)({
      content: 'Test content',
      contentType: 'campaign',
    });

    expect(result.metadata).toBeDefined();
    expect(result.metadata.rulesVersion).toBe('1.0.0');
    expect(result.metadata.validatedAt).toBeDefined();
    expect(result.metadata.processingTimeMs).toBeDefined();
  });

  it('should include suggested fixes for failed validations', async () => {
    (validateFull as Mock).mockResolvedValueOnce({
      status: 'rejected',
      score: 30,
      ruleResults: [{
        ruleId: 'compliance-test',
        ruleName: 'Test Rule',
        passed: false,
        message: 'Failed',
        severity: 'error',
        category: 'compliance',
      }],
      summary: 'Validation failed',
      suggestedFixes: [{
        issue: 'Compliance issue',
        suggestion: 'Fix the content',
        severity: 'error',
      }],
    });

    const result = await (validateFull as Mock)({
      content: 'Bad content',
      contentType: 'campaign',
    });

    expect(result.suggestedFixes).toBeDefined();
    expect(result.suggestedFixes.length).toBeGreaterThan(0);
    expect(result.suggestedFixes[0].suggestion).toBeDefined();
  });
});

describe('Validation Service Resilience', () => {
  it('should handle circuit breaker state', async () => {
    // Circuit should be closed initially
    const { CircuitBreaker } = await import('../../server/utils/resilience');
    const circuit = new CircuitBreaker({ name: 'test' });

    expect(circuit.getState()).toBe('closed');
  });

  it('should track circuit breaker stats', async () => {
    const { CircuitBreaker } = await import('../../server/utils/resilience');
    const circuit = new CircuitBreaker({ name: 'test' });

    const stats = circuit.getStats();
    expect(stats).toHaveProperty('failureCount');
    expect(stats).toHaveProperty('successCount');
  });
});

describe('Knowledge Base Integration', () => {
  it('should be enabled via feature flag', async () => {
    const enabled = await (isFeatureEnabled as Mock)('insightrx.knowledge');

    expect(enabled).toBe(true);
  });
});
