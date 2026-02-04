# TwinEngine Integration Roadmap v2.0

> **Last Updated:** 2026-01-24
> **Status:** Active Planning
> **Priority:** InsightRx Integration (Immediate) → Omni-Voice Integration (Deferred)

---

## Executive Summary

Three complementary projects with clear integration potential:

| Project | Core Value | Integration Role | Priority |
|---------|-----------|------------------|----------|
| **TwinEngine** | HCP engagement platform | Host platform - receives integrations | Active |
| **InsightRx** | Content validation + knowledge base | Service layer - content intelligence | **Phase 1 (NOW)** |
| **Omni-Voice** | Field sales AI advisor | User interface layer - conversational AI | **Phase 2 (DEFERRED)** |

**Strategic Fit:** HIGH - All three serve pharma HCP engagement with distinct, non-overlapping capabilities.

**Phasing Rationale:**
- InsightRx provides immediate, low-risk value (validation, knowledge enrichment)
- Omni-Voice requires fine-tuning validation before integration
- De-coupling allows course correction without wasted integration effort

---

## Part 1: Architecture Overview

### 1.1 Current State

```
┌─────────────────────────────────────────────────────────────┐
│                    TwinEngine (Active)                       │
│  HCP Profiles, Campaigns, Simulations, NBA, Analytics        │
│  Tech: React/Vite, Express/Fastify, PostgreSQL, pgvector     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    InsightRx (Standalone)                    │
│  Content validation, Knowledge base, Domain maps             │
│  Tech: TypeScript, Express, MongoDB, PostgreSQL, Redis       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Omni-Voice (In Development)               │
│  Fine-tuned LLM advisor, RAG corpus, MLR compliance filter   │
│  Tech: Python, Mistral 7B (MLX), PostgreSQL/pgvector         │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Target State (Phase 1 Complete)

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE                            │
│  TwinEngine UI with validation feedback, knowledge panels    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                 INTELLIGENCE LAYER                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              InsightRx (Integrated)                  │    │
│  │  - @twinengine/insightrx (npm package)              │    │
│  │    ├── content-validator                            │    │
│  │    ├── domain-knowledge-maps                        │    │
│  │    └── relationship-scoring                         │    │
│  │  - Knowledge Module (embedded in TwinEngine)        │    │
│  │    ├── knowledge tables (PostgreSQL)                │    │
│  │    ├── vector search (pgvector)                     │    │
│  │    └── knowledge API (internal routes)              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Omni-Voice (DEFERRED)                   │    │
│  │  - Separate service (GPU requirements)              │    │
│  │  - WebSocket API for streaming                      │    │
│  │  - Chat widget in TwinEngine UI                     │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    CORE PLATFORM                             │
│  TwinEngine: HCP Profiles, Campaigns, Simulations, NBA       │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Target State (Phase 2 Complete)

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE                            │
│  TwinEngine UI + Omni-Voice Chat Widget                      │
│  "Plan my Q2 campaign for cardiologists in the Northeast"    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                 INTELLIGENCE LAYER                           │
│  ┌─────────────────────┐  ┌─────────────────────────────┐   │
│  │    InsightRx        │  │      Omni-Voice             │   │
│  │  - Validation       │  │  - Field strategy           │   │
│  │  - Knowledge        │  │  - Channel advice           │   │
│  │  - Scoring          │  │  - Compliance aware         │   │
│  └─────────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    CORE PLATFORM                             │
│  TwinEngine: HCP Profiles, Campaigns, Simulations, NBA       │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 2: Architectural Decisions

### 2.1 Resolved Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Deployment Model** | Layered Hybrid | InsightRx validation as package (stateless), InsightRx knowledge as embedded service sharing TwinEngine's PostgreSQL (avoids MongoDB), Omni-Voice as separate service (GPU scaling, separate lifecycle). |
| **Auth Strategy** | Tiered Auth | JWT for UI sessions, session tokens for WebSocket, service tokens for internal calls, API keys for automation. Prevents token expiry during streaming and separates user context from service identity. |
| **UI Integration** | Validation inline, Chat widget (Phase 2) | Validation feedback integrated into content editing flow. Chat widget floating, context-aware, always available (when Omni-Voice ships). |
| **Data Ownership** | TwinEngine primary | Content lives in TwinEngine, InsightRx validates and enriches, doesn't duplicate storage. |
| **Compliance Scope** | Layered | 1) InsightRx rule-based validation (content creation), 2) Omni-Voice output filter (advisory responses - Phase 2), 3) Content publish gate (human review for high-risk scores), 4) Audit trail for all compliance decisions. |
| **Knowledge Storage** | PostgreSQL (shared) | Eliminates MongoDB dependency, leverages existing pgvector, reduces latency, single backup/restore. |

### 2.2 Deferred Decisions (Omni-Voice Phase)

| Decision | Options | Notes |
|----------|---------|-------|
| **Omni-Voice hosting** | Mac Studio local vs. cloud GPU | Depends on usage patterns, latency requirements |
| **Chat persistence** | PostgreSQL vs. dedicated chat DB | Evaluate volume during Phase 1 |
| **RAG corpus updates** | Real-time vs. batch | Depends on corpus volatility |

---

## Part 3: Data Model Harmonization

### 3.1 Entity Mapping

| Concept | TwinEngine | InsightRx | Omni-Voice | Unified Model |
|---------|------------|-----------|------------|---------------|
| HCP Specialty | `specialty` | `audienceContext.specialty` | Embedded in corpus | Normalize to TwinEngine schema |
| Channel | `channel_id` | `channelContext.primaryChannel` | Advisory only | TwinEngine as master |
| Therapeutic Area | `therapeutic_area` | `marketContext.therapeuticArea` | Implicit in advice | Normalize via domainKnowledge.ts |
| Compliance Status | N/A (new) | `validation.validationStatus` | MLR filter output | New field in TwinEngine |
| Audience | `hcp_persona` | `content.metadata.audience` | N/A | Direct: HCP, Consumer, Payer |
| Region/Territory | `territory` | `content.metadata.region` | N/A | Direct |

### 3.2 InsightRx Data Model Details

**From InsightRx audienceContext:**
```typescript
// Specialties (align with TwinEngine HCP specialty enum)
type Specialty = 
  | 'Cardiology' | 'Oncology' | 'Neurology' | 'Endocrinology'
  | 'Rheumatology' | 'Pulmonology' | 'Gastroenterology'
  | 'Nephrology' | 'Dermatology' | 'Psychiatry';

// Channels (needs mapping layer)
type InsightRxChannel = 
  | 'Email' | 'Digital Display' | 'Social Media' | 'Print'
  | 'Video' | 'Podcast' | 'Webinar' | 'In-Person';

// TwinEngine channel mapping
const channelMapping: Record<InsightRxChannel, TwinEngineChannel> = {
  'Email': 'email',
  'Digital Display': 'digital_ad',
  'Social Media': 'digital_ad',
  'Webinar': 'webinar',
  'In-Person': 'rep_visit',
  // ...
};
```

### 3.3 Schema Changes Required (TwinEngine)

```typescript
// shared/schema.ts additions

// ============================================
// PHASE 1: InsightRx Integration Tables
// ============================================

// API Tokens for service auth
export const apiTokens = pgTable("api_tokens", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  name: varchar("name", { length: 100 }),
  tokenHash: varchar("token_hash", { length: 64 }), // SHA-256 of actual token
  scopes: jsonb("scopes").$type<string[]>(),
  tokenType: varchar("token_type", { length: 20 }), // 'user' | 'service' | 'api_key'
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audit log for compliance
export const auditLog = pgTable("audit_log", {
  id: varchar("id", { length: 36 }).primaryKey(),
  eventType: varchar("event_type", { length: 50 }),
  userId: varchar("user_id", { length: 36 }),
  resourceType: varchar("resource_type", { length: 50 }),
  resourceId: varchar("resource_id", { length: 36 }),
  metadata: jsonb("metadata"),
  traceId: varchar("trace_id", { length: 36 }),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Knowledge base content (migrated from InsightRx MongoDB)
export const knowledgeContent = pgTable("knowledge_content", {
  id: varchar("id", { length: 36 }).primaryKey(),
  title: varchar("title", { length: 500 }),
  content: text("content"),
  contentType: varchar("content_type", { length: 50 }), // 'research', 'guideline', 'campaign', etc.
  source: varchar("source", { length: 200 }),
  sourceUrl: varchar("source_url", { length: 500 }),
  audienceContext: jsonb("audience_context"), // specialty, experience level, etc.
  marketContext: jsonb("market_context"), // therapeutic area, brand, etc.
  channelContext: jsonb("channel_context"), // primary channel, format, etc.
  metadata: jsonb("metadata"),
  embedding: vector("embedding", { dimensions: 384 }), // all-MiniLM-L6-v2
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Content validation results
export const contentValidation = pgTable("content_validation", {
  id: varchar("id", { length: 36 }).primaryKey(),
  contentId: varchar("content_id", { length: 36 }), // FK to campaign content, messaging theme, etc.
  contentType: varchar("content_type", { length: 50 }), // 'campaign', 'messaging_theme', 'email', etc.
  contentHash: varchar("content_hash", { length: 64 }), // SHA-256 for cache invalidation
  validationStatus: varchar("validation_status", { length: 20 }), // 'approved' | 'needs_review' | 'rejected' | 'pending'
  complianceScore: integer("compliance_score"), // 0-100
  validationResults: jsonb("validation_results"), // Detailed rule-by-rule results
  rulesVersion: varchar("rules_version", { length: 20 }), // For cache invalidation
  reviewedBy: varchar("reviewed_by", { length: 36 }),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Feature flags
export const featureFlags = pgTable("feature_flags", {
  id: varchar("id", { length: 36 }).primaryKey(),
  flagKey: varchar("flag_key", { length: 100 }).unique(),
  enabled: boolean("enabled").default(false),
  rolloutPercentage: integer("rollout_percentage").default(0), // 0-100
  targetUsers: jsonb("target_users").$type<string[]>(), // Specific user IDs
  targetRoles: jsonb("target_roles").$type<string[]>(), // Role-based targeting
  metadata: jsonb("metadata"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// PHASE 2: Omni-Voice Integration Tables
// (Defined now, implemented later)
// ============================================

// Chat conversations
export const chatConversations = pgTable("chat_conversations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  title: varchar("title", { length: 200 }), // Auto-generated or user-provided
  context: jsonb("context"), // Frozen context at conversation start
  pageContext: varchar("page_context", { length: 100 }), // Where conversation started
  status: varchar("status", { length: 20 }), // 'active' | 'archived'
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chat messages
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id", { length: 36 }).primaryKey(),
  conversationId: varchar("conversation_id", { length: 36 }).references(() => chatConversations.id),
  role: varchar("role", { length: 20 }), // 'user' | 'assistant' | 'system'
  content: text("content"),
  ragSources: jsonb("rag_sources"), // Sources used for this response
  complianceStatus: varchar("compliance_status", { length: 20 }),
  complianceFlags: jsonb("compliance_flags"), // Any warnings triggered
  tokenCount: integer("token_count"),
  latencyMs: integer("latency_ms"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Indexes
// Phase 1
CREATE INDEX idx_audit_user_time ON audit_log(user_id, timestamp DESC);
CREATE INDEX idx_audit_event_time ON audit_log(event_type, timestamp DESC);
CREATE INDEX idx_audit_trace ON audit_log(trace_id);
CREATE INDEX idx_knowledge_embedding ON knowledge_content USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_knowledge_type ON knowledge_content(content_type);
CREATE INDEX idx_validation_content ON content_validation(content_id, content_type);
CREATE INDEX idx_validation_status ON content_validation(validation_status);
CREATE INDEX idx_feature_flags_key ON feature_flags(flag_key);

// Phase 2
CREATE INDEX idx_chat_user ON chat_conversations(user_id, last_message_at DESC);
CREATE INDEX idx_chat_messages_conv ON chat_messages(conversation_id, created_at);
```

---

## Part 4: Phase 1 - InsightRx Integration

### 4.1 Timeline Overview

**Total Effort:** ~100 hours (with Claude Code CLI acceleration)
**Calendar Time:** 2-3 weeks

| Milestone | Focus | Effort | Dependencies |
|-----------|-------|--------|--------------|
| M1 | Foundation & Auth | 20h | None |
| M2 | InsightRx Package Extraction | 24h | M1 |
| M3 | Knowledge Module Integration | 20h | M2 |
| M4 | Validation Pipeline | 16h | M2 |
| M5 | Testing & Polish | 12h | M3, M4 |
| M6 | Documentation & Rollout | 8h | M5 |

### 4.2 Milestone 1: Foundation & Auth (20h)

#### M1.1: Authentication Infrastructure (8h)

**Deliverables:**
- JWT issuer in TwinEngine
- Token payload with service scopes
- Token validation middleware
- Refresh endpoint
- Service-to-service token signing (HMAC-SHA256)
- API key management for automated integrations
- Token introspection endpoint

**Token Types:**

```typescript
// JWT Payload (user sessions)
interface TwinEngineJWT {
  sub: string;           // User ID
  roles: string[];       // ['admin', 'analyst']
  scopes: string[];      // ['content:write', 'insightrx:validate']
  aud: string[];         // ['twinengine', 'insightrx']
  typ: 'user';
  iat: number;
  exp: number;           // 15 minutes
}

// Refresh Token (stored in httpOnly cookie)
interface RefreshToken {
  sub: string;
  jti: string;           // Token ID for revocation
  exp: number;           // 7 days
}

// Service Token (internal calls)
interface ServiceToken {
  iss: 'twinengine';
  sub: string;           // Service name
  aud: string;           // Target service
  iat: number;
  exp: number;           // 1 hour
  sig: string;           // HMAC-SHA256 signature
}

// API Key (automation)
interface APIKeyPayload {
  kid: string;           // Key ID
  sub: string;           // User/service owner
  scopes: string[];
  // No expiry - managed via revocation
}
```

**Scopes:**
- `content:read` - Read content, campaigns
- `content:write` - Create/update content
- `insightrx:validate` - Trigger validation
- `insightrx:knowledge` - Query knowledge base
- `omnivoice:query` - Query Omni-Voice (Phase 2)
- `admin:*` - Full administrative access

#### M1.2: Observability Foundation (6h)

**Deliverables:**
- Structured logging with correlation IDs (pino)
- OpenTelemetry instrumentation
- Audit log table and service
- Prometheus metrics endpoints
- Health check aggregation

**Audit Events:**

| Event | Captured Data |
|-------|---------------|
| `content.validation.requested` | user, content_id, content_type |
| `content.validation.completed` | user, content_id, result, rules_applied, score |
| `content.validation.reviewed` | user, content_id, reviewer, decision |
| `knowledge.search` | user, query, results_count, latency_ms |
| `auth.token.issued` | user, token_type, scopes |
| `auth.token.revoked` | user, token_id, reason |

**Metrics:**
```
# Validation
validation_requests_total{content_type, status}
validation_duration_seconds{content_type}
validation_score_distribution{content_type}

# Knowledge
knowledge_search_requests_total
knowledge_search_duration_seconds
knowledge_cache_hits_total
knowledge_cache_misses_total

# Auth
auth_token_issued_total{token_type}
auth_token_validation_failures_total{reason}
```

#### M1.3: Feature Flag Infrastructure (4h)

**Deliverables:**
- Feature flag service
- Admin UI for flag management
- User/role targeting
- Percentage rollout support

**Initial Flags:**

| Flag Key | Purpose | Default |
|----------|---------|---------|
| `insightrx.validation` | Enable content validation | false |
| `insightrx.validation.blocking` | Block save on validation failure | false |
| `insightrx.knowledge` | Enable knowledge enrichment | false |
| `insightrx.knowledge.panels` | Show knowledge panels in UI | false |

#### M1.4: Resilience Infrastructure (2h)

**Deliverables:**
- Circuit breaker utility
- Retry with exponential backoff
- Graceful degradation patterns

```typescript
// @twinengine/resilience

interface CircuitBreakerConfig {
  failureThreshold: number;    // Failures before opening
  resetTimeout: number;        // ms before trying again
  monitorInterval: number;     // ms between health checks
}

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;           // ms
  maxDelay: number;            // ms
  exponentialBase: number;     // 2 for doubling
}

// Graceful degradation
const validationWithFallback = async (content: Content) => {
  try {
    return await circuitBreaker.execute(() => validateContent(content));
  } catch (error) {
    if (error instanceof CircuitOpenError) {
      // Allow save with pending status
      return { status: 'pending', reason: 'validation_unavailable' };
    }
    throw error;
  }
};
```

### 4.3 Milestone 2: InsightRx Package Extraction (24h)

#### M2.1: Package Structure (4h)

**Create `@twinengine/insightrx` npm package:**

```
packages/insightrx/
├── src/
│   ├── validation/
│   │   ├── index.ts
│   │   ├── validators/
│   │   │   ├── compliance.ts      # ISI, fair balance, etc.
│   │   │   ├── completeness.ts    # Required fields
│   │   │   ├── consistency.ts     # Internal consistency
│   │   │   └── quality.ts         # Best practices
│   │   ├── rules/
│   │   │   ├── rule-engine.ts
│   │   │   └── rule-definitions.ts
│   │   └── types.ts
│   ├── domain/
│   │   ├── index.ts
│   │   ├── audience.ts            # HCP, Consumer, Payer maps
│   │   ├── specialty.ts           # Medical specialty taxonomy
│   │   ├── therapeutic-area.ts    # TA classification
│   │   ├── channel.ts             # Channel definitions and mappings
│   │   └── types.ts
│   ├── scoring/
│   │   ├── index.ts
│   │   ├── relationship.ts        # Content similarity
│   │   ├── relevance.ts           # Query relevance
│   │   └── types.ts
│   └── index.ts                   # Public API
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

#### M2.2: Validation Logic Extraction (10h)

**Extract from InsightRx:**
- `services/knowledge-base/src/utils/validation.ts` (~535 LOC)
- Validation rules and scoring logic
- Compliance checking (ISI, fair balance, etc.)

**Public API:**

```typescript
// @twinengine/insightrx

export interface ValidationRequest {
  content: string;
  contentType: 'campaign' | 'messaging_theme' | 'email' | 'landing_page';
  audienceContext?: AudienceContext;
  channelContext?: ChannelContext;
  marketContext?: MarketContext;
}

export interface ValidationResult {
  status: 'approved' | 'needs_review' | 'rejected';
  score: number;                    // 0-100
  ruleResults: RuleResult[];
  summary: string;
  suggestedFixes?: string[];
}

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  category: 'compliance' | 'completeness' | 'consistency' | 'quality';
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
  message: string;
  location?: { start: number; end: number };
}

// Main validation function
export function validateContent(request: ValidationRequest): ValidationResult;

// Individual validators (for granular use)
export function validateCompliance(content: string, context: MarketContext): RuleResult[];
export function validateCompleteness(content: string, contentType: string): RuleResult[];
export function validateConsistency(content: string): RuleResult[];
export function validateQuality(content: string): RuleResult[];
```

#### M2.3: Domain Knowledge Extraction (6h)

**Extract from InsightRx:**
- `services/knowledge-base/src/config/domainKnowledge.ts` (~720 LOC)
- Audience, specialty, TA, channel taxonomies
- Mapping functions

**Public API:**

```typescript
// @twinengine/insightrx/domain

export const audienceTypes: AudienceType[] = ['HCP', 'Consumer', 'Payer', 'Caregiver'];

export const specialties: Specialty[] = [
  'Cardiology', 'Oncology', 'Neurology', /* ... */
];

export const therapeuticAreas: TherapeuticArea[] = [
  'Cardiovascular', 'Oncology', 'Immunology', /* ... */
];

export const channels: Channel[] = [
  'Email', 'Digital Display', 'Social Media', /* ... */
];

// Mapping functions
export function mapChannel(insightRxChannel: string): TwinEngineChannel;
export function mapSpecialty(specialty: string): NormalizedSpecialty;
export function getRelatedSpecialties(specialty: Specialty): Specialty[];
export function getChannelAffinityBySpecialty(specialty: Specialty): ChannelAffinity[];
```

#### M2.4: Relationship Scoring Extraction (4h)

**Extract from InsightRx:**
- `services/knowledge-base/src/utils/relationshipScoring.ts` (~174 LOC)
- Content similarity scoring
- Relevance ranking

**Public API:**

```typescript
// @twinengine/insightrx/scoring

export interface ScoringContext {
  audienceContext?: AudienceContext;
  marketContext?: MarketContext;
  channelContext?: ChannelContext;
}

export function scoreRelationship(
  content1: string,
  content2: string,
  context?: ScoringContext
): number; // 0-1

export function rankByRelevance(
  query: string,
  candidates: { id: string; content: string }[],
  context?: ScoringContext
): { id: string; score: number }[];
```

### 4.4 Milestone 3: Knowledge Module Integration (20h)

#### M3.1: Knowledge Tables & Migration (6h)

**Deliverables:**
- Create `knowledge_content` table
- Migrate InsightRx MongoDB data to PostgreSQL
- Set up pgvector index
- Create knowledge API routes

**Migration Script:**

```typescript
// scripts/migrate-insightrx-knowledge.ts

async function migrateKnowledge() {
  // 1. Connect to InsightRx MongoDB
  const mongoDb = await connectMongo(INSIGHTRX_MONGO_URI);
  
  // 2. Stream documents
  const cursor = mongoDb.collection('knowledge').find();
  
  // 3. Transform and insert
  for await (const doc of cursor) {
    const transformed = {
      id: generateId(),
      title: doc.title,
      content: doc.content,
      contentType: doc.type,
      source: doc.source,
      sourceUrl: doc.sourceUrl,
      audienceContext: doc.audienceContext,
      marketContext: doc.marketContext,
      channelContext: doc.channelContext,
      metadata: doc.metadata,
      // Embedding will be generated in batch
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
    
    await db.insert(knowledgeContent).values(transformed);
  }
  
  // 4. Generate embeddings in batch
  await generateEmbeddings();
}
```

#### M3.2: Embedding Generation (4h)

**Deliverables:**
- Batch embedding generation script
- Incremental embedding updates
- Embedding cache in Redis

```typescript
// server/services/knowledge/embeddings.ts

import { pipeline } from '@xenova/transformers';

const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

export async function generateEmbedding(text: string): Promise<number[]> {
  const cacheKey = `embed:${sha256(text)}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  const result = await embedder(text, { pooling: 'mean', normalize: true });
  const embedding = Array.from(result.data);
  
  await redis.setex(cacheKey, 86400, JSON.stringify(embedding)); // 24h cache
  return embedding;
}

export async function batchGenerateEmbeddings(batchSize = 100) {
  const pending = await db.select()
    .from(knowledgeContent)
    .where(isNull(knowledgeContent.embedding))
    .limit(batchSize);
  
  for (const item of pending) {
    const embedding = await generateEmbedding(item.content);
    await db.update(knowledgeContent)
      .set({ embedding })
      .where(eq(knowledgeContent.id, item.id));
  }
}
```

#### M3.3: Knowledge Search API (6h)

**Deliverables:**
- Semantic search endpoint
- Filtered search (by context)
- Related content endpoint

```typescript
// server/routes/knowledge.ts

// POST /api/v1/knowledge/search
export async function searchKnowledge(req: Request, res: Response) {
  const { query, filters, limit = 10 } = req.body;
  
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);
  
  // Build filter conditions
  const conditions = [];
  if (filters?.contentType) {
    conditions.push(eq(knowledgeContent.contentType, filters.contentType));
  }
  if (filters?.therapeuticArea) {
    conditions.push(
      sql`audience_context->>'therapeuticArea' = ${filters.therapeuticArea}`
    );
  }
  
  // Vector search with filters
  const results = await db.select({
    id: knowledgeContent.id,
    title: knowledgeContent.title,
    content: knowledgeContent.content,
    contentType: knowledgeContent.contentType,
    source: knowledgeContent.source,
    similarity: sql<number>`1 - (embedding <=> ${queryEmbedding}::vector)`,
  })
    .from(knowledgeContent)
    .where(and(...conditions))
    .orderBy(sql`embedding <=> ${queryEmbedding}::vector`)
    .limit(limit);
  
  // Audit log
  await auditLog.insert({
    eventType: 'knowledge.search',
    userId: req.user.id,
    metadata: { query, filters, resultsCount: results.length },
  });
  
  return res.json({ results });
}

// GET /api/v1/knowledge/:id/related
export async function getRelatedContent(req: Request, res: Response) {
  const { id } = req.params;
  const { limit = 5 } = req.query;
  
  const source = await db.select()
    .from(knowledgeContent)
    .where(eq(knowledgeContent.id, id))
    .limit(1);
  
  if (!source.length) {
    return res.status(404).json({ error: 'Content not found' });
  }
  
  const related = await db.select({
    id: knowledgeContent.id,
    title: knowledgeContent.title,
    contentType: knowledgeContent.contentType,
    similarity: sql<number>`1 - (embedding <=> ${source[0].embedding}::vector)`,
  })
    .from(knowledgeContent)
    .where(ne(knowledgeContent.id, id))
    .orderBy(sql`embedding <=> ${source[0].embedding}::vector`)
    .limit(limit);
  
  return res.json({ related });
}
```

#### M3.4: Knowledge UI Components (4h)

**Deliverables:**
- Knowledge panel component
- Related content sidebar
- Search modal

```typescript
// client/src/components/knowledge/KnowledgePanel.tsx

interface KnowledgePanelProps {
  context: {
    therapeuticArea?: string;
    specialty?: string;
    channel?: string;
  };
  query?: string;
}

export function KnowledgePanel({ context, query }: KnowledgePanelProps) {
  const { data, isLoading } = useKnowledgeSearch({
    query: query || buildContextQuery(context),
    filters: context,
    limit: 5,
  });
  
  if (!featureFlag('insightrx.knowledge.panels')) {
    return null;
  }
  
  return (
    <Card className="knowledge-panel">
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Related Knowledge
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton count={3} />
        ) : (
          <ul className="space-y-2">
            {data?.results.map((item) => (
              <li key={item.id}>
                <KnowledgeItem item={item} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
```

### 4.5 Milestone 4: Validation Pipeline (16h)

#### M4.1: Validation Service (6h)

**Deliverables:**
- Validation service wrapping @twinengine/insightrx
- Async validation with queue
- Result caching

```typescript
// server/services/validation/index.ts

import { validateContent } from '@twinengine/insightrx';

export class ValidationService {
  private cache: Redis;
  private circuitBreaker: CircuitBreaker;
  
  async validate(
    contentId: string,
    contentType: string,
    content: string,
    context: ValidationContext
  ): Promise<ValidationResult> {
    // Check cache
    const contentHash = sha256(content + JSON.stringify(context));
    const cached = await this.getCachedResult(contentId, contentHash);
    if (cached) return cached;
    
    // Run validation
    const result = await this.circuitBreaker.execute(() =>
      validateContent({
        content,
        contentType,
        ...context,
      })
    );
    
    // Store result
    await this.storeResult(contentId, contentType, contentHash, result);
    
    // Audit log
    await this.auditValidation(contentId, contentType, result);
    
    return result;
  }
  
  private async storeResult(
    contentId: string,
    contentType: string,
    contentHash: string,
    result: ValidationResult
  ) {
    await db.insert(contentValidation).values({
      id: generateId(),
      contentId,
      contentType,
      contentHash,
      validationStatus: result.status,
      complianceScore: result.score,
      validationResults: result,
      rulesVersion: RULES_VERSION,
    });
  }
}
```

#### M4.2: Integration with Content CRUD (6h)

**Deliverables:**
- Validation hooks on content save
- Blocking vs. non-blocking modes
- Status tracking

```typescript
// server/routes/campaigns.ts

export async function saveCampaign(req: Request, res: Response) {
  const { id, content, ...campaignData } = req.body;
  
  // Check if validation is enabled
  if (featureFlag('insightrx.validation')) {
    const validationResult = await validationService.validate(
      id,
      'campaign',
      content,
      {
        audienceContext: campaignData.audienceContext,
        marketContext: campaignData.marketContext,
        channelContext: campaignData.channelContext,
      }
    );
    
    // Blocking mode: reject if validation fails
    if (featureFlag('insightrx.validation.blocking')) {
      if (validationResult.status === 'rejected') {
        return res.status(422).json({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Content failed compliance validation',
            details: validationResult,
          },
        });
      }
    }
    
    // Store validation status with campaign
    campaignData.validationStatus = validationResult.status;
    campaignData.complianceScore = validationResult.score;
  }
  
  // Save campaign
  const saved = await db.insert(campaigns).values({
    id: id || generateId(),
    ...campaignData,
  });
  
  return res.json({ campaign: saved, validation: validationResult });
}
```

#### M4.3: Validation UI (4h)

**Deliverables:**
- Validation status indicators
- Inline validation feedback
- Review workflow UI

```typescript
// client/src/components/validation/ValidationFeedback.tsx

interface ValidationFeedbackProps {
  contentId: string;
  contentType: string;
}

export function ValidationFeedback({ contentId, contentType }: ValidationFeedbackProps) {
  const { data: validation } = useValidationStatus(contentId, contentType);
  
  if (!validation) return null;
  
  return (
    <div className="validation-feedback">
      <StatusBadge status={validation.status} score={validation.complianceScore} />
      
      {validation.status === 'needs_review' && (
        <Alert variant="warning">
          <AlertTitle>Review Required</AlertTitle>
          <AlertDescription>
            This content requires human review before publishing.
            <Button variant="link" onClick={() => openReviewModal(contentId)}>
              Start Review
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {validation.ruleResults?.filter(r => !r.passed).map((rule) => (
        <ValidationIssue key={rule.ruleId} rule={rule} />
      ))}
    </div>
  );
}

function StatusBadge({ status, score }: { status: string; score: number }) {
  const variants = {
    approved: { color: 'green', icon: CheckCircle },
    needs_review: { color: 'yellow', icon: AlertTriangle },
    rejected: { color: 'red', icon: XCircle },
    pending: { color: 'gray', icon: Clock },
  };
  
  const { color, icon: Icon } = variants[status] || variants.pending;
  
  return (
    <Badge variant={color}>
      <Icon className="w-4 h-4 mr-1" />
      {status} ({score}/100)
    </Badge>
  );
}
```

### 4.6 Milestone 5: Testing & Polish (12h)

#### M5.1: Integration Tests (6h)

| Test Scenario | Coverage |
|---------------|----------|
| JWT authentication flow | Auth |
| Token refresh | Auth |
| Service token validation | Auth |
| Content validation (pass) | InsightRx |
| Content validation (fail) | InsightRx |
| Validation caching | InsightRx |
| Knowledge search | InsightRx |
| Related content | InsightRx |
| Circuit breaker (service down) | Resilience |
| Graceful degradation | Resilience |
| Feature flag targeting | Infrastructure |
| Audit log capture | Observability |

#### M5.2: Performance Testing (3h)

**Targets:**

| Metric | Target | Acceptable |
|--------|--------|------------|
| Validation latency (cached) | <50ms | <100ms |
| Validation latency (uncached) | <200ms | <500ms |
| Knowledge search latency | <100ms | <300ms |
| Embedding generation | <50ms | <100ms |
| Cache hit rate | >60% | >40% |

#### M5.3: UI Polish (3h)

- Loading states for validation
- Error recovery flows
- Accessibility audit (WCAG 2.1 AA)
- Mobile responsiveness check

### 4.7 Milestone 6: Documentation & Rollout (8h)

#### M6.1: Documentation (4h)

- API reference (OpenAPI spec)
- Integration guide
- Validation rules reference
- Admin guide for feature flags

#### M6.2: Rollout (4h)

**Rollout Schedule:**

| Stage | Timeline | Audience | Success Criteria |
|-------|----------|----------|------------------|
| Internal | Day 1 | Team only | No crashes |
| Beta | Day 3 | 5% of users | <1% error rate |
| Limited | Day 7 | 25% of users | Stable metrics |
| GA | Day 14 | 100% of users | All prior maintained |

**Feature Flag Sequence:**
1. `insightrx.validation` → true (non-blocking)
2. Observe for 3 days
3. `insightrx.knowledge` → true
4. Observe for 3 days
5. `insightrx.knowledge.panels` → true
6. Observe for 3 days
7. `insightrx.validation.blocking` → true (optional, per customer preference)

---

## Part 5: Phase 2 - Omni-Voice Integration (DEFERRED)

> **Status:** Fully specified, awaiting Phase 1 completion and Omni-Voice MVP validation.
> **Prerequisites:**
> - Phase 1 complete and stable
> - Omni-Voice fine-tuning validated independently
> - RAG pipeline tested with real queries
> - MLR compliance filter tuned and tested

### 5.1 Omni-Voice Current State Assessment

**From PROJECT-EXTRACT (estimated):**

| Component | Status | Remaining Work |
|-----------|--------|----------------|
| Fine-tuned Mistral 7B | ~70% | Evaluation harness, quality tuning |
| RAG corpus (2,953 posts) | ~80% | Embedding generation, index tuning |
| MLR compliance filter | ~60% | Threshold tuning, edge case handling |
| API layer | ~30% | WebSocket streaming, production hardening |
| Conversation memory | ~20% | PostgreSQL integration, context management |

**Estimated effort to MVP:** 7-10 hours (independent of TwinEngine integration)

### 5.2 Timeline Overview (Phase 2)

**Total Effort:** ~60 hours
**Calendar Time:** 2-3 weeks (after Phase 1 + buffer)

| Milestone | Focus | Effort | Dependencies |
|-----------|-------|--------|--------------|
| M7 | Omni-Voice MVP Completion | 12h | Omni-Voice standalone |
| M8 | WebSocket Infrastructure | 10h | M1 (auth), M7 |
| M9 | Chat Widget | 20h | M8 |
| M10 | Context Bridge | 10h | M9 |
| M11 | Testing & Polish | 8h | M10 |

### 5.3 Milestone 7: Omni-Voice MVP Completion (12h)

#### M7.1: RAG Pipeline Completion (4h)

**Deliverables:**
- Generate embeddings for 2,953 forum posts
- Implement semantic search with pgvector
- Tune similarity thresholds

```python
# omni-voice/src/rag/embeddings.py

from sentence_transformers import SentenceTransformer
import psycopg2
from pgvector.psycopg2 import register_vector

class RAGPipeline:
    def __init__(self, db_url: str, model_name: str = 'all-MiniLM-L6-v2'):
        self.model = SentenceTransformer(model_name)
        self.conn = psycopg2.connect(db_url)
        register_vector(self.conn)
    
    def generate_embeddings(self, batch_size: int = 100):
        """Generate embeddings for all unprocessed posts."""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT id, content FROM forum_posts 
            WHERE embedding IS NULL
            LIMIT %s
        """, (batch_size,))
        
        for row in cursor.fetchall():
            post_id, content = row
            embedding = self.model.encode(content).tolist()
            cursor.execute("""
                UPDATE forum_posts 
                SET embedding = %s 
                WHERE id = %s
            """, (embedding, post_id))
        
        self.conn.commit()
    
    def search(self, query: str, top_k: int = 5, threshold: float = 0.7):
        """Semantic search over forum posts."""
        query_embedding = self.model.encode(query).tolist()
        
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT id, content, 1 - (embedding <=> %s::vector) as similarity
            FROM forum_posts
            WHERE 1 - (embedding <=> %s::vector) > %s
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """, (query_embedding, query_embedding, threshold, query_embedding, top_k))
        
        return [
            {'id': row[0], 'content': row[1], 'similarity': row[2]}
            for row in cursor.fetchall()
        ]
```

#### M7.2: Fine-Tuned Model Integration (4h)

**Deliverables:**
- Connect inference to fine-tuned Mistral 7B
- Implement conversation memory
- Add system prompt management

```python
# omni-voice/src/agent/omni_voice.py

from mlx_lm import load, generate

class OmniVoiceAgent:
    def __init__(self, model_path: str, rag_pipeline: RAGPipeline):
        self.model, self.tokenizer = load(model_path)
        self.rag = rag_pipeline
        self.system_prompt = self._load_system_prompt()
    
    def respond(
        self,
        query: str,
        context: dict = None,
        conversation_history: list = None
    ) -> dict:
        # 1. Retrieve relevant context
        rag_results = self.rag.search(query, top_k=3)
        rag_context = self._format_rag_context(rag_results)
        
        # 2. Build prompt
        messages = [
            {'role': 'system', 'content': self.system_prompt},
        ]
        
        if conversation_history:
            messages.extend(conversation_history[-10:])  # Last 10 turns
        
        if rag_context:
            messages.append({
                'role': 'system',
                'content': f'Relevant context from industry forums:\n{rag_context}'
            })
        
        if context:
            messages.append({
                'role': 'system',
                'content': f'Current TwinEngine context:\n{json.dumps(context)}'
            })
        
        messages.append({'role': 'user', 'content': query})
        
        # 3. Generate response
        prompt = self.tokenizer.apply_chat_template(messages, tokenize=False)
        response = generate(
            self.model,
            self.tokenizer,
            prompt=prompt,
            max_tokens=1024,
            temp=0.7,
        )
        
        return {
            'response': response,
            'sources': rag_results,
            'context_used': bool(context),
        }
    
    def _load_system_prompt(self) -> str:
        return """You are a veteran pharmaceutical field sales advisor with 20+ years 
of experience across multiple therapeutic areas. You provide strategic advice on:
- Channel mix optimization for different HCP segments
- Campaign planning and gap analysis
- Territory strategy and resource allocation
- Vendor and platform evaluations

You speak directly and practically, drawing on real industry experience. You avoid 
generic advice and always consider the specific context provided. You are compliance-aware 
but not overly cautious - you understand the practical realities of pharma marketing."""
```

#### M7.3: MLR Compliance Filter (4h)

**Deliverables:**
- Rule-based compliance filter for output
- Tunable threshold configuration
- Warning vs. blocking modes

```python
# omni-voice/src/compliance/mlr_filter.py

from dataclasses import dataclass
from typing import List, Optional

@dataclass
class ComplianceResult:
    passed: bool
    warnings: List[str]
    blocked_phrases: List[str]
    confidence: float

class MLRComplianceFilter:
    def __init__(self, config: dict):
        self.blocked_patterns = config.get('blocked_patterns', [])
        self.warning_patterns = config.get('warning_patterns', [])
        self.efficacy_claims = config.get('efficacy_claims', [])
        self.required_disclaimers = config.get('required_disclaimers', [])
        self.threshold = config.get('threshold', 0.8)
    
    def check(self, response: str, context: dict = None) -> ComplianceResult:
        warnings = []
        blocked = []
        
        # Check for promotional efficacy claims
        for pattern in self.efficacy_claims:
            if self._matches(response, pattern):
                blocked.append(f'Potential efficacy claim: {pattern}')
        
        # Check for warning patterns
        for pattern in self.warning_patterns:
            if self._matches(response, pattern):
                warnings.append(f'Review recommended: {pattern}')
        
        # Check for blocked patterns
        for pattern in self.blocked_patterns:
            if self._matches(response, pattern):
                blocked.append(f'Blocked content: {pattern}')
        
        passed = len(blocked) == 0
        confidence = 1.0 - (len(warnings) * 0.1) - (len(blocked) * 0.3)
        
        return ComplianceResult(
            passed=passed,
            warnings=warnings,
            blocked_phrases=blocked,
            confidence=max(0.0, confidence),
        )
    
    def filter_response(self, response: str, result: ComplianceResult) -> str:
        """Modify response to remove or flag compliance issues."""
        if result.passed:
            return response
        
        # Add disclaimer if warnings present
        if result.warnings and result.passed:
            return f"{response}\n\n[Note: This advice should be reviewed for compliance.]"
        
        # Block response if compliance failed
        return (
            "I apologize, but I cannot provide that specific advice as it may "
            "contain promotional claims that require MLR review. Let me rephrase "
            "in a more general way..."
        )
```

### 5.4 Milestone 8: WebSocket Infrastructure (10h)

#### M8.1: WebSocket Server (6h)

**Deliverables:**
- Socket.IO server for streaming
- JWT/session token validation
- Connection lifecycle management

```python
# omni-voice/src/api/websocket.py

import socketio
from functools import wraps

sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=['https://twinengine.app'],  # Configure for your domain
)

def require_auth(f):
    @wraps(f)
    async def decorated(sid, data, *args, **kwargs):
        session = await sio.get_session(sid)
        if not session.get('user_id'):
            await sio.emit('error', {'code': 'UNAUTHORIZED'}, room=sid)
            return
        return await f(sid, data, *args, **kwargs)
    return decorated

@sio.event
async def connect(sid, environ, auth):
    """Handle new connection with auth."""
    token = auth.get('token') if auth else None
    if not token:
        raise socketio.exceptions.ConnectionRefusedError('No token provided')
    
    try:
        payload = verify_jwt(token)
        await sio.save_session(sid, {
            'user_id': payload['sub'],
            'scopes': payload['scopes'],
        })
        
        # Issue session token for this connection
        session_token = issue_session_token(sid, payload['sub'])
        await sio.emit('connected', {'sessionToken': session_token}, room=sid)
        
    except InvalidTokenError as e:
        raise socketio.exceptions.ConnectionRefusedError(str(e))

@sio.event
async def disconnect(sid):
    """Handle disconnection."""
    session = await sio.get_session(sid)
    if session:
        # Save conversation if needed
        await save_conversation_state(session)

@sio.event
@require_auth
async def query(sid, data):
    """Handle user query with streaming response."""
    session = await sio.get_session(sid)
    
    query_text = data.get('query')
    context = data.get('context', {})
    conversation_id = data.get('conversationId')
    
    # Load conversation history
    history = await load_conversation_history(conversation_id) if conversation_id else []
    
    # Emit typing indicator
    await sio.emit('typing', {'status': True}, room=sid)
    
    try:
        # Stream response tokens
        async for token in agent.stream_response(query_text, context, history):
            await sio.emit('token', {'token': token}, room=sid)
        
        # Get final response and check compliance
        full_response = agent.get_last_response()
        compliance = compliance_filter.check(full_response, context)
        
        # Emit completion
        await sio.emit('complete', {
            'conversationId': conversation_id or create_conversation_id(),
            'compliance': {
                'passed': compliance.passed,
                'warnings': compliance.warnings,
            },
            'sources': agent.get_last_sources(),
        }, room=sid)
        
        # Audit log
        await audit_log('omnivoice.query', session['user_id'], {
            'query': query_text,
            'context_keys': list(context.keys()),
            'compliance_passed': compliance.passed,
        })
        
    except Exception as e:
        await sio.emit('error', {
            'code': 'QUERY_FAILED',
            'message': str(e),
        }, room=sid)
    
    finally:
        await sio.emit('typing', {'status': False}, room=sid)

@sio.event
@require_auth
async def stop_generation(sid, data):
    """Stop ongoing generation."""
    await agent.stop_generation(sid)
    await sio.emit('stopped', {}, room=sid)

@sio.event
@require_auth
async def context_update(sid, data):
    """Update context for ongoing conversation."""
    session = await sio.get_session(sid)
    session['context'] = data.get('context', {})
    await sio.save_session(sid, session)
```

#### M8.2: Client SDK (4h)

**Deliverables:**
- TypeScript WebSocket client
- Reconnection handling
- Message queuing during disconnection

```typescript
// client/src/lib/omnivoice-client.ts

import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';

interface OmniVoiceConfig {
  url: string;
  getToken: () => Promise<string>;
  onTokenExpired?: () => void;
}

interface QueryOptions {
  context?: Record<string, unknown>;
  conversationId?: string;
}

export class OmniVoiceClient extends EventEmitter {
  private socket: Socket | null = null;
  private config: OmniVoiceConfig;
  private messageQueue: Array<{ event: string; data: unknown }> = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  constructor(config: OmniVoiceConfig) {
    super();
    this.config = config;
  }
  
  async connect(): Promise<void> {
    const token = await this.config.getToken();
    
    this.socket = io(this.config.url, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    
    this.setupEventHandlers();
    
    return new Promise((resolve, reject) => {
      this.socket!.on('connected', () => {
        this.reconnectAttempts = 0;
        this.flushMessageQueue();
        resolve();
      });
      
      this.socket!.on('connect_error', (error) => {
        if (error.message === 'UNAUTHORIZED') {
          this.config.onTokenExpired?.();
        }
        reject(error);
      });
    });
  }
  
  private setupEventHandlers(): void {
    if (!this.socket) return;
    
    this.socket.on('token', (data) => {
      this.emit('token', data.token);
    });
    
    this.socket.on('complete', (data) => {
      this.emit('complete', data);
    });
    
    this.socket.on('error', (data) => {
      this.emit('error', data);
    });
    
    this.socket.on('typing', (data) => {
      this.emit('typing', data.status);
    });
    
    this.socket.on('disconnect', (reason) => {
      this.emit('disconnected', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected us, need to reconnect manually
        this.connect();
      }
    });
  }
  
  async query(text: string, options: QueryOptions = {}): Promise<void> {
    const data = {
      query: text,
      context: options.context,
      conversationId: options.conversationId,
    };
    
    if (!this.socket?.connected) {
      this.messageQueue.push({ event: 'query', data });
      await this.connect();
      return;
    }
    
    this.socket.emit('query', data);
  }
  
  stopGeneration(): void {
    this.socket?.emit('stop_generation', {});
  }
  
  updateContext(context: Record<string, unknown>): void {
    this.socket?.emit('context_update', { context });
  }
  
  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
  
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      this.socket?.emit(message.event, message.data);
    }
  }
}
```

### 5.5 Milestone 9: Chat Widget (20h)

#### M9.1: Chat Widget Component (12h)

**Deliverables:**
- Floating chat widget UI
- Message threading
- Streaming display
- Suggested prompts
- Quick actions

```typescript
// client/src/components/chat/ChatWidget.tsx

import { useState, useRef, useEffect } from 'react';
import { useOmniVoice } from '@/hooks/useOmniVoice';
import { usePageContext } from '@/hooks/usePageContext';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const pageContext = usePageContext();
  const omniVoice = useOmniVoice();
  const enabled = useFeatureFlag('omnivoice.chat_widget');
  
  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);
  
  // Subscribe to OmniVoice events
  useEffect(() => {
    if (!omniVoice) return;
    
    omniVoice.on('token', (token: string) => {
      setStreamingContent(prev => prev + token);
    });
    
    omniVoice.on('complete', (data: CompleteEvent) => {
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: streamingContent,
        sources: data.sources,
        compliance: data.compliance,
        timestamp: new Date(),
      }]);
      setStreamingContent('');
      setIsTyping(false);
    });
    
    omniVoice.on('typing', setIsTyping);
    omniVoice.on('error', handleError);
    
    return () => {
      omniVoice.removeAllListeners();
    };
  }, [omniVoice, streamingContent]);
  
  const handleSubmit = async () => {
    if (!input.trim()) return;
    
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    await omniVoice.query(input, {
      context: pageContext,
      conversationId: messages[0]?.conversationId,
    });
  };
  
  const suggestedPrompts = getSuggestedPrompts(pageContext);
  
  if (!enabled) return null;
  
  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-consumption-purple 
                   rounded-full shadow-lg flex items-center justify-center
                   hover:bg-process-violet transition-colors z-50"
        aria-label="Open advisor chat"
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </button>
      
      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-void-black 
                        border border-border-gray rounded-2xl shadow-2xl 
                        flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border-gray">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-consumption-purple 
                              flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-signal-white">
                  Field Sales Advisor
                </h3>
                <p className="text-xs text-data-gray">
                  Powered by Omni-Voice
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} aria-label="Close chat">
              <X className="w-5 h-5 text-data-gray hover:text-signal-white" />
            </button>
          </div>
          
          {/* Context chip */}
          {pageContext && (
            <div className="px-4 py-2 border-b border-border-gray">
              <ContextChip context={pageContext} />
            </div>
          )}
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-data-gray">
                  Ask me about channel strategy, campaign planning, or territory optimization.
                </p>
                <div className="space-y-2">
                  {suggestedPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(prompt)}
                      className="block w-full text-left text-sm p-2 rounded-lg
                                 bg-border-gray/50 hover:bg-border-gray
                                 text-signal-white transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {messages.map(message => (
              <ChatMessage key={message.id} message={message} />
            ))}
            
            {streamingContent && (
              <ChatMessage
                message={{
                  id: 'streaming',
                  role: 'assistant',
                  content: streamingContent,
                  timestamp: new Date(),
                }}
                isStreaming
              />
            )}
            
            {isTyping && !streamingContent && (
              <TypingIndicator />
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Quick actions */}
          <div className="px-4 py-2 border-t border-border-gray flex gap-2">
            <QuickAction
              icon={<CheckCircle className="w-4 h-4" />}
              label="Validate"
              onClick={() => setInput('Validate this campaign content')}
            />
            <QuickAction
              icon={<Search className="w-4 h-4" />}
              label="Find Similar"
              onClick={() => setInput('Find similar campaigns to this one')}
            />
            <QuickAction
              icon={<HelpCircle className="w-4 h-4" />}
              label="Explain"
              onClick={() => setInput('Explain these engagement metrics')}
            />
          </div>
          
          {/* Input */}
          <div className="p-4 border-t border-border-gray">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Ask the advisor..."
                className="flex-1 bg-border-gray/50 border border-border-gray
                           rounded-lg px-3 py-2 text-sm text-signal-white
                           placeholder:text-muted-gray resize-none
                           focus:outline-none focus:border-consumption-purple"
                rows={1}
              />
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || isTyping}
                className="px-4 py-2 bg-consumption-purple text-white rounded-lg
                           disabled:opacity-50 disabled:cursor-not-allowed
                           hover:bg-process-violet transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-gray mt-2 text-center">
              Press <kbd className="px-1 py-0.5 bg-border-gray rounded">⌘K</kbd> to open
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function getSuggestedPrompts(context: PageContext | null): string[] {
  if (!context) {
    return [
      'What channel mix works best for cardiologists?',
      'How should I approach a new product launch?',
      'What are best practices for digital engagement?',
    ];
  }
  
  switch (context.page) {
    case 'hcp-profile':
      return [
        `What channel mix would you recommend for this ${context.hcp?.specialty} HCP?`,
        'How can I improve engagement with this prescriber?',
        'What messaging themes resonate with this segment?',
      ];
    case 'campaign-editor':
      return [
        'Critique this campaign strategy',
        'What channels am I missing?',
        'How does this compare to industry benchmarks?',
      ];
    case 'simulation':
      return [
        'Explain these prediction results',
        'What would improve these outcomes?',
        'Are these assumptions realistic?',
      ];
    default:
      return [
        'What should I focus on today?',
        'Review my current campaign portfolio',
        'What trends should I be aware of?',
      ];
  }
}
```

#### M9.2: Message Components (4h)

```typescript
// client/src/components/chat/ChatMessage.tsx

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
        {!isUser && (
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-consumption-purple/20 
                            flex items-center justify-center">
              <Bot className="w-3 h-3 text-consumption-purple" />
            </div>
            <span className="text-xs text-data-gray">Advisor</span>
          </div>
        )}
        
        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-consumption-purple text-white'
            : 'bg-border-gray/50 text-signal-white'
        }`}>
          <div className="text-sm whitespace-pre-wrap">
            {message.content}
            {isStreaming && <span className="animate-pulse">▊</span>}
          </div>
        </div>
        
        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.sources.map((source, i) => (
              <SourceChip key={i} source={source} />
            ))}
          </div>
        )}
        
        {/* Compliance warning */}
        {message.compliance?.warnings?.length > 0 && (
          <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 
                          rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200">
              {message.compliance.warnings[0]}
            </div>
          </div>
        )}
        
        <div className="text-xs text-muted-gray mt-1">
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}
```

#### M9.3: Conversation Persistence (4h)

```typescript
// client/src/hooks/useConversationHistory.ts

export function useConversationHistory(conversationId: string | null) {
  return useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => fetchConversation(conversationId),
    enabled: !!conversationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useConversationList() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
    staleTime: 1000 * 60, // 1 minute
  });
}

// server/routes/conversations.ts

router.get('/conversations', async (req, res) => {
  const conversations = await db.select({
    id: chatConversations.id,
    title: chatConversations.title,
    lastMessageAt: chatConversations.lastMessageAt,
    pageContext: chatConversations.pageContext,
  })
    .from(chatConversations)
    .where(eq(chatConversations.userId, req.user.id))
    .orderBy(desc(chatConversations.lastMessageAt))
    .limit(20);
  
  return res.json({ conversations });
});

router.get('/conversations/:id', async (req, res) => {
  const [conversation] = await db.select()
    .from(chatConversations)
    .where(
      and(
        eq(chatConversations.id, req.params.id),
        eq(chatConversations.userId, req.user.id)
      )
    );
  
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  const messages = await db.select()
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, req.params.id))
    .orderBy(asc(chatMessages.createdAt));
  
  return res.json({ conversation, messages });
});
```

### 5.6 Milestone 10: Context Bridge (10h)

#### M10.1: Page Context Detection (4h)

```typescript
// client/src/hooks/usePageContext.ts

import { useLocation, useParams } from 'wouter';
import { useHcpProfile } from './useHcpProfile';
import { useCampaign } from './useCampaign';
import { useSimulation } from './useSimulation';

export interface PageContext {
  page: string;
  hcp?: {
    id: string;
    name: string;
    specialty: string;
    tier: string;
    segment: string;
    recentEngagement: object;
  };
  campaign?: {
    id: string;
    name: string;
    therapeuticArea: string;
    channelMix: Record<string, number>;
    messagingThemes: string[];
  };
  simulation?: {
    id: string;
    scenarioName: string;
    parameters: object;
    results: object;
  };
  audience?: {
    filters: object;
    size: number;
  };
}

export function usePageContext(): PageContext | null {
  const [location] = useLocation();
  const params = useParams();
  
  // Detect current page
  const pageType = detectPageType(location);
  
  // Load relevant data based on page
  const hcp = useHcpProfile(params.hcpId, { enabled: pageType === 'hcp-profile' });
  const campaign = useCampaign(params.campaignId, { enabled: pageType === 'campaign-editor' });
  const simulation = useSimulation(params.simulationId, { enabled: pageType === 'simulation' });
  
  if (pageType === 'hcp-profile' && hcp.data) {
    return {
      page: 'hcp-profile',
      hcp: {
        id: hcp.data.id,
        name: `${hcp.data.firstName} ${hcp.data.lastName}`,
        specialty: hcp.data.specialty,
        tier: hcp.data.tier,
        segment: hcp.data.segment,
        recentEngagement: hcp.data.channelEngagements?.slice(0, 3),
      },
    };
  }
  
  if (pageType === 'campaign-editor' && campaign.data) {
    return {
      page: 'campaign-editor',
      campaign: {
        id: campaign.data.id,
        name: campaign.data.name,
        therapeuticArea: campaign.data.therapeuticArea,
        channelMix: campaign.data.channelMix,
        messagingThemes: campaign.data.messagingThemes,
      },
    };
  }
  
  if (pageType === 'simulation' && simulation.data) {
    return {
      page: 'simulation',
      simulation: {
        id: simulation.data.id,
        scenarioName: simulation.data.name,
        parameters: simulation.data.parameters,
        results: simulation.data.results,
      },
    };
  }
  
  return { page: pageType };
}

function detectPageType(location: string): string {
  if (location.match(/\/hcp\/[\w-]+/)) return 'hcp-profile';
  if (location.match(/\/campaign\/[\w-]+/)) return 'campaign-editor';
  if (location.match(/\/simulation\/[\w-]+/)) return 'simulation';
  if (location.match(/\/audience/)) return 'audience-builder';
  if (location.match(/\/dashboard/)) return 'dashboard';
  return 'unknown';
}
```

#### M10.2: Context Serialization (3h)

```typescript
// client/src/lib/context-serializer.ts

const MAX_CONTEXT_SIZE = 4000; // tokens (approximate)

export function serializeContext(context: PageContext): string {
  const serialized = JSON.stringify(context, null, 2);
  
  // Truncate if too large
  if (estimateTokens(serialized) > MAX_CONTEXT_SIZE) {
    return truncateContext(context);
  }
  
  return serialized;
}

function truncateContext(context: PageContext): string {
  // Priority: page > entity summary > detailed data
  const minimal = {
    page: context.page,
  };
  
  if (context.hcp) {
    minimal.hcp = {
      specialty: context.hcp.specialty,
      tier: context.hcp.tier,
      segment: context.hcp.segment,
    };
  }
  
  if (context.campaign) {
    minimal.campaign = {
      therapeuticArea: context.campaign.therapeuticArea,
      channelMix: context.campaign.channelMix,
    };
  }
  
  return JSON.stringify(minimal, null, 2);
}

function estimateTokens(text: string): number {
  // Rough estimate: 4 chars per token
  return Math.ceil(text.length / 4);
}
```

#### M10.3: TwinEngine Data Feed to RAG (3h)

```python
# omni-voice/src/integrations/twinengine_feed.py

from typing import List, Dict
import httpx

class TwinEngineFeed:
    def __init__(self, api_url: str, service_token: str):
        self.api_url = api_url
        self.headers = {'Authorization': f'Bearer {service_token}'}
    
    async def fetch_campaign_content(self, limit: int = 100) -> List[Dict]:
        """Fetch campaign content for RAG indexing."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f'{self.api_url}/api/v1/internal/campaigns',
                headers=self.headers,
                params={'limit': limit, 'include_content': True},
            )
            response.raise_for_status()
            return response.json()['campaigns']
    
    async def sync_to_rag(self, rag_pipeline):
        """Sync TwinEngine content to RAG corpus."""
        campaigns = await self.fetch_campaign_content()
        
        for campaign in campaigns:
            # Format for RAG
            content = f"""
Campaign: {campaign['name']}
Therapeutic Area: {campaign['therapeuticArea']}
Channel Mix: {campaign['channelMix']}
Messaging Themes: {campaign['messagingThemes']}

Content:
{campaign['content']}
"""
            
            # Upsert to RAG corpus
            await rag_pipeline.upsert(
                id=f"twinengine_campaign_{campaign['id']}",
                content=content,
                metadata={
                    'source': 'twinengine',
                    'type': 'campaign',
                    'therapeutic_area': campaign['therapeuticArea'],
                },
            )
```

### 5.7 Milestone 11: Testing & Polish (8h)

#### M11.1: Integration Tests (4h)

| Test Scenario | Coverage |
|---------------|----------|
| WebSocket connection | Auth, Connection |
| Token refresh during session | Auth |
| Query with context | Integration |
| Streaming response | UI |
| Compliance filter trigger | Compliance |
| Circuit breaker (Omni-Voice down) | Resilience |
| Conversation persistence | Data |
| Context injection | Integration |

#### M11.2: Performance Verification (2h)

| Metric | Target | Acceptable |
|--------|--------|------------|
| Chat widget load | <100ms | <200ms |
| Query to first token | <500ms | <1000ms |
| Full response | <3s | <5s |
| WebSocket reconnection | <2s | <5s |

#### M11.3: UX Polish (2h)

- Loading states and animations
- Error recovery flows
- Offline handling
- Accessibility (keyboard navigation, screen reader)

---

## Part 6: Graceful Degradation Matrix

| Service Unavailable | Fallback Behavior | User Communication |
|---------------------|-------------------|-------------------|
| **InsightRx Validation** | Allow save with `pending` status. Background job retries. User notified when complete. | "Validation is temporarily delayed. Your content has been saved and will be validated shortly." |
| **InsightRx Knowledge** | Disable knowledge panels. Continue without enrichment. | "Knowledge suggestions temporarily unavailable." |
| **Omni-Voice (Phase 2)** | Show "Advisor temporarily unavailable" + queue message for retry. Offer canned responses for common queries. | "The advisor is temporarily unavailable. Your message has been queued and you'll be notified when it's ready." |
| **RAG Retrieval (Phase 2)** | Omni-Voice responds without context grounding. Disclose limitation. | "Responding without historical context. For more grounded advice, please try again later." |
| **PostgreSQL** | Full degradation. Show maintenance page. | "TwinEngine is undergoing maintenance. Please try again in a few minutes." |

---

## Part 7: Risk Register

| Risk | Phase | Likelihood | Impact | Mitigation |
|------|-------|------------|--------|------------|
| InsightRx validation too slow | 1 | Medium | Low | Async validation, caching |
| Knowledge migration data loss | 1 | Low | High | Backup MongoDB, validate row counts |
| Embedding model mismatch | 1 | Low | Medium | Version lock, migration scripts |
| Feature flag misconfiguration | 1 | Medium | Medium | Admin UI, audit logging |
| Omni-Voice fine-tuning quality | 2 | Medium | High | Validate independently before integration |
| WebSocket scalability | 2 | Medium | Medium | Load testing, horizontal scaling plan |
| MLR filter false positives | 2 | Medium | Low | Tunable thresholds, override capability |
| Token expiration during stream | 2 | High | Low | Session tokens for connections |
| RAG irrelevant results | 2 | Medium | Medium | Tune similarity threshold, user feedback |
| Context serialization too large | 2 | Medium | Low | Token counting, graceful truncation |

---

## Part 8: Success Criteria

### Phase 1 Success Criteria

| Criterion | Measurement | Target |
|-----------|-------------|--------|
| Validation coverage | % of content saves validated | >90% |
| Validation latency (cached) | p95 latency | <100ms |
| Validation latency (uncached) | p95 latency | <500ms |
| Knowledge search latency | p95 latency | <300ms |
| Cache hit rate | Knowledge queries | >60% |
| Error rate | All InsightRx operations | <1% |
| User satisfaction | In-app feedback | >4/5 |

### Phase 2 Success Criteria

| Criterion | Measurement | Target |
|-----------|-------------|--------|
| Query to first token | p95 latency | <1000ms |
| Full response | p95 latency | <5s |
| Compliance filter accuracy | Manual review sample | >95% |
| User adoption | DAU using chat | >30% |
| Query relevance | User thumbs up/down | >70% positive |
| Conversation depth | Avg turns per session | >3 |

---

## Part 9: File Index (Critical Files)

### Phase 1 - InsightRx

**Extract from InsightRx:**
- `services/knowledge-base/src/utils/validation.ts` → `packages/insightrx/src/validation/`
- `services/knowledge-base/src/config/domainKnowledge.ts` → `packages/insightrx/src/domain/`
- `services/knowledge-base/src/utils/relationshipScoring.ts` → `packages/insightrx/src/scoring/`

**Create in TwinEngine:**
- `packages/insightrx/` - npm package
- `server/services/validation/` - validation service
- `server/services/knowledge/` - knowledge module
- `server/routes/knowledge.ts` - knowledge API
- `server/routes/validation.ts` - validation API
- `client/src/components/knowledge/` - UI components
- `client/src/components/validation/` - UI components
- `shared/schema.ts` - add tables (see Part 3.3)

**Modify in TwinEngine:**
- `server/routes/campaigns.ts` - add validation hooks
- `server/routes/content.ts` - add validation hooks
- `server/middleware/auth.ts` - add token types
- `client/src/App.tsx` - add feature flag provider

### Phase 2 - Omni-Voice

**Complete in Omni-Voice:**
- `src/rag/embeddings.py` - embedding generation
- `src/rag/search.py` - semantic search
- `src/agent/omni_voice.py` - main agent
- `src/compliance/mlr_filter.py` - compliance filter
- `src/api/websocket.py` - WebSocket server

**Create in TwinEngine:**
- `client/src/components/chat/` - chat widget
- `client/src/lib/omnivoice-client.ts` - WebSocket client
- `client/src/hooks/useOmniVoice.ts` - React hook
- `client/src/hooks/usePageContext.ts` - context detection
- `server/routes/conversations.ts` - conversation API

---

## Part 10: Changelog

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2026-01-24 | Initial v2: Split phases, prioritize InsightRx, preserve Omni-Voice spec |
| | | Added tiered auth strategy |
| | | Added circuit breaker & graceful degradation |
| | | Split InsightRx into package + embedded knowledge |
| | | Added observability foundation |
| | | Enhanced chat widget specification |
| | | Added caching strategy |
| | | Strengthened compliance architecture |
| | | Added feature flag infrastructure |
| | | Revised effort estimates |
| | | Added technical specifications |

---

## Appendix A: Quick Reference Commands

```bash
# Phase 1 Development

# Create InsightRx package
cd packages && mkdir insightrx && cd insightrx
npm init -y
npm install typescript zod

# Run migrations
npm run db:migrate

# Generate embeddings
npm run knowledge:embeddings

# Test validation
npm run test:validation

# Phase 2 Development (when ready)

# Start Omni-Voice service
cd omni-voice && python -m src.api.main

# Test WebSocket
wscat -c ws://localhost:8001/socket.io/?transport=websocket

# Sync TwinEngine content to RAG
python -m src.integrations.twinengine_feed --sync
```

---

## Appendix B: Environment Variables

```bash
# Phase 1 - InsightRx Integration

# Auth
JWT_SECRET=<secret>
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
SERVICE_TOKEN_SECRET=<secret>

# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Feature Flags
FEATURE_FLAG_DEFAULT_ENABLED=false

# Observability
OTEL_EXPORTER_ENDPOINT=http://localhost:4317
LOG_LEVEL=info

# Phase 2 - Omni-Voice (add when ready)

# Omni-Voice Service
OMNIVOICE_URL=http://localhost:8001
OMNIVOICE_WS_URL=ws://localhost:8001

# Model
MODEL_PATH=/path/to/fine-tuned-mistral
EMBEDDING_MODEL=all-MiniLM-L6-v2

# Compliance
MLR_FILTER_THRESHOLD=0.8
MLR_FILTER_MODE=warn  # warn | block
```

---

*Document Version: 2.0*
*Created: 2026-01-24*
*Author: Claude (with Will's direction)*
*Next Review: After Phase 1 completion*
