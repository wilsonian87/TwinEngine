# Omni-Voice AI Roadmap

This document outlines the phased implementation plan for evolving Omni-Voice from an enhanced mock to a fully intelligent AI-powered field sales advisor.

## Current State (Phase 1 - Implemented)

### Enhanced Mock Implementation

The current implementation provides:

- **Keyword-based response matching** - Detects topics (territory, engagement, access, competitive) and specialties (pulmonology, cardiology, oncology, neurology)
- **HCP data integration** - Looks up HCPs by name mentioned in queries and provides personalized engagement strategies
- **Dynamic response generation** - Constructs responses using actual HCP profile data (tier, specialty, engagement score, channel preference)
- **Streaming SSE delivery** - Word-by-word streaming for realistic chat experience
- **Mock RAG sources** - Returns contextually relevant source citations

### Supported Queries (Phase 1)

| Query Type | Example | Response |
|------------|---------|----------|
| HCP-specific | "How should I engage Dr. Patricia Robinson?" | Personalized strategy using actual HCP data |
| Specialty strategy | "Best approach for pulmonologists?" | Specialty-specific engagement playbook |
| Territory planning | "How do I prioritize my territory?" | 3-tier prioritization framework |
| Engagement tactics | "How to drive more engagement?" | Multi-channel engagement best practices |
| Access challenges | "Tips for hard-to-see physicians?" | Access solution strategies |
| Competitive positioning | "How to position against competitors?" | Competitive intelligence framework |

---

## Phase 2: LLM Integration (Future)

### Overview

Replace keyword matching with actual LLM (Claude) for intelligent, contextual responses.

### Requirements

Environment variable needed: `ANTHROPIC_API_KEY`

### Implementation Approach

```typescript
// server/services/omnivoice-agent.ts

import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are Omni-Voice, an expert pharmaceutical field sales advisor with 20+ years of experience. You help field representatives optimize their HCP engagement strategies.

Your expertise includes:
- Territory prioritization and account planning
- Specialty-specific engagement strategies
- Multi-channel communication optimization
- Competitive intelligence and positioning
- Access solutions for hard-to-see physicians
- Compliance-aware messaging guidance

Guidelines:
- Provide actionable, specific recommendations
- Reference relevant data when available (HCP profiles, engagement scores)
- Be concise but comprehensive
- Maintain MLR/compliance awareness
- Ask clarifying questions when needed

Current context will be provided with each query.`;
```

### Key Features

1. **Contextual HCP responses** - Inject HCP profile data into system prompt
2. **Conversation memory** - Maintain conversation history for context
3. **Streaming responses** - Use Claude's streaming API for real-time delivery
4. **Fallback handling** - Fall back to Phase 1 mock if API unavailable

### Estimated Effort

- API integration: 1-2 days
- Testing and refinement: 1-2 days
- Error handling and fallback: 1 day

---

## Phase 3: RAG Implementation (Future)

### Overview

Add Retrieval Augmented Generation for domain-anchored, knowledge-grounded responses.

### Architecture

```
User Query
    │
    ▼
Embedding Model ──► Vector Database (Knowledge Base)
    │                      │
    │            Retrieved Documents
    ▼                      ▼
┌─────────────────────────────────────┐
│           Claude LLM                 │
│  System Prompt + Context + Docs      │
└─────────────────────────────────────┘
                 │
                 ▼
         Grounded Response
```

### Knowledge Base Content

| Category | Content Type | Source |
|----------|-------------|--------|
| Field Sales Training | Best practices, playbooks | Internal documentation |
| Specialty Insights | Engagement strategies by specialty | Training materials |
| Compliance Guidelines | MLR rules, approved claims | Legal/Compliance |
| Product Information | Approved messaging, clinical data | Medical Affairs |
| Competitive Intel | Positioning guides | Marketing/Strategy |

### Vector Database Options

| Option | Pros | Cons |
|--------|------|------|
| **pgvector** | Uses existing PostgreSQL, simple setup | Less optimized for large scale |
| **Pinecone** | Managed, scalable, fast | Additional cost, external dependency |
| **ChromaDB** | Open source, easy to use | Self-hosted, less mature |

### Recommended: pgvector

```sql
-- Add pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge base table
CREATE TABLE omnivoice_knowledge (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Similarity search index
CREATE INDEX ON omnivoice_knowledge
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### Estimated Effort

- Vector database setup: 1-2 days
- Embedding pipeline: 1-2 days
- Knowledge base ingestion: 2-3 days (depends on content volume)
- Integration with LLM: 1-2 days
- Testing and tuning: 2-3 days

---

## Phase 4: MLR Compliance Filter (Future)

### Overview

Implement actual compliance checking for generated responses.

### Architecture

```
User Query → LLM Response → MLR Filter → Filtered Response
                               │
                               ▼
                    Compliance Database
                    - Approved claims
                    - Restricted terms
                    - Required disclosures
```

### Implementation Approach

```typescript
interface MLRCheckResult {
  passed: boolean;
  issues: MLRIssue[];
  modifiedContent?: string;
}

interface MLRIssue {
  type: "unapproved_claim" | "restricted_term" | "missing_disclosure";
  location: { start: number; end: number };
  original: string;
  suggestion?: string;
  severity: "warning" | "error";
}
```

### Estimated Effort

- Compliance rules database: 2-3 days
- Filter implementation: 2-3 days
- Admin UI for rules management: 2-3 days
- Testing with compliance team: 3-5 days

---

## Phase 5: Advanced Features (Future)

### Conversation Memory

Store and retrieve conversation history for context continuity across sessions.

### HCP Deep Integration

- Pull real-time engagement data
- Access prescribing patterns
- Reference competitive signals (CPI)
- Check message saturation (MSI)

### Proactive Recommendations

Trigger Omni-Voice suggestions based on user actions:
- When user views an HCP with declining engagement
- When competitive alerts fire
- When message saturation is high

### Voice Input/Output

- Speech-to-text for hands-free input
- Text-to-speech for audio responses
- Mobile-optimized experience

---

## Implementation Priority

| Phase | Feature | Priority | Dependencies |
|-------|---------|----------|--------------|
| 1 | Enhanced Mock (Current) | Done | None |
| 2 | LLM Integration | High | ANTHROPIC_API_KEY |
| 3 | RAG Pipeline | High | Phase 2, pgvector/embedding model |
| 4 | MLR Compliance | Medium | Phase 2, Compliance rules database |
| 5 | Advanced Features | Low | Phases 2-4 |

---

## Environment Variables (Full Implementation)

```bash
# Phase 2: LLM
ANTHROPIC_API_KEY=sk-ant-...

# Phase 3: RAG (if using OpenAI embeddings)
OPENAI_API_KEY=sk-...

# Phase 4: MLR
MLR_RULES_REFRESH_INTERVAL=3600  # seconds
```

---

## Success Metrics

| Metric | Phase 1 | Phase 2+ Target |
|--------|---------|-----------------|
| Query coverage | ~40% (keyword match) | 95%+ (LLM handles all) |
| Response relevance | Template-based | Context-aware, personalized |
| HCP data utilization | Basic profile | Full engagement + competitive |
| Compliance accuracy | N/A (mock) | 99%+ (MLR filter) |
| User satisfaction | Demo-ready | Production-ready |

---

## References

- Anthropic Claude API Documentation: https://docs.anthropic.com/
- pgvector Extension: https://github.com/pgvector/pgvector
- RAG Best Practices: https://www.anthropic.com/research
