/**
 * Knowledge Storage
 *
 * Database operations for the knowledge content module.
 * Supports semantic search via embeddings and filtering by context.
 */

import { db } from "../db";
import {
  knowledgeContent,
  type InsertKnowledgeContent,
  type KnowledgeContentDB,
  type KnowledgeSearchRequest,
  type KnowledgeSearchResult,
  type KnowledgeAudienceContext,
  type KnowledgeMarketContext,
  type KnowledgeChannelContext,
} from "@shared/schema";
import { eq, and, ilike, sql, desc } from "drizzle-orm";
import {
  generateEmbedding,
  formatEmbeddingForStorage,
  parseEmbeddingFromStorage,
  cosineSimilarity,
} from "../services/embedding-service";

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Create a new knowledge content item
 */
export async function createKnowledgeContent(
  input: InsertKnowledgeContent
): Promise<KnowledgeContentDB> {
  // Generate embedding for the content
  const textForEmbedding = `${input.title} ${input.content}`;
  const embedding = await generateEmbedding(textForEmbedding);
  const embeddingStr = formatEmbeddingForStorage(embedding);

  const [created] = await db
    .insert(knowledgeContent)
    .values({
      ...input,
      embedding: embeddingStr,
    })
    .returning();

  return created;
}

/**
 * Get knowledge content by ID
 */
export async function getKnowledgeContentById(
  id: string
): Promise<KnowledgeContentDB | null> {
  const [result] = await db
    .select()
    .from(knowledgeContent)
    .where(eq(knowledgeContent.id, id))
    .limit(1);

  return result || null;
}

/**
 * Update knowledge content
 */
export async function updateKnowledgeContent(
  id: string,
  updates: Partial<InsertKnowledgeContent>
): Promise<KnowledgeContentDB | null> {
  // If content or title changed, regenerate embedding
  let embeddingUpdate: { embedding: string } | undefined;

  if (updates.title || updates.content) {
    const existing = await getKnowledgeContentById(id);
    if (existing) {
      const title = updates.title ?? existing.title;
      const content = updates.content ?? existing.content;
      const textForEmbedding = `${title} ${content}`;
      const embedding = await generateEmbedding(textForEmbedding);
      embeddingUpdate = { embedding: formatEmbeddingForStorage(embedding) };
    }
  }

  const [updated] = await db
    .update(knowledgeContent)
    .set({
      ...updates,
      ...embeddingUpdate,
      updatedAt: new Date(),
    })
    .where(eq(knowledgeContent.id, id))
    .returning();

  return updated || null;
}

/**
 * Delete knowledge content
 */
export async function deleteKnowledgeContent(id: string): Promise<boolean> {
  const result = await db
    .delete(knowledgeContent)
    .where(eq(knowledgeContent.id, id));

  return (result.rowCount ?? 0) > 0;
}

/**
 * List all knowledge content (paginated)
 */
export async function listKnowledgeContent(options?: {
  limit?: number;
  offset?: number;
  contentType?: string;
}): Promise<KnowledgeContentDB[]> {
  const { limit = 50, offset = 0, contentType } = options ?? {};

  let query = db.select().from(knowledgeContent);

  if (contentType) {
    query = query.where(eq(knowledgeContent.contentType, contentType)) as typeof query;
  }

  return query
    .orderBy(desc(knowledgeContent.createdAt))
    .limit(limit)
    .offset(offset);
}

// ============================================================================
// SEMANTIC SEARCH
// ============================================================================

/**
 * Search knowledge content semantically
 */
export async function searchKnowledgeContent(
  request: KnowledgeSearchRequest
): Promise<KnowledgeSearchResult[]> {
  const { query, filters, limit = 10 } = request;

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  // Build filter conditions
  const conditions: ReturnType<typeof eq>[] = [];

  if (filters?.contentType) {
    conditions.push(eq(knowledgeContent.contentType, filters.contentType));
  }

  // Fetch all content (with optional filters)
  // Note: For production, you'd want to use pgvector's <=> operator
  // This is a fallback that does similarity calculation in JS
  let dbQuery = db.select().from(knowledgeContent);

  if (conditions.length > 0) {
    dbQuery = dbQuery.where(and(...conditions)) as typeof dbQuery;
  }

  const allContent = await dbQuery.limit(500); // Limit to prevent memory issues

  // Calculate similarity scores
  const scored: Array<{
    content: KnowledgeContentDB;
    similarity: number;
  }> = [];

  for (const item of allContent) {
    if (!item.embedding) {
      continue;
    }

    try {
      const itemEmbedding = parseEmbeddingFromStorage(item.embedding);
      const similarity = cosineSimilarity(queryEmbedding, itemEmbedding);

      // Apply context filters
      if (filters?.therapeuticArea && item.marketContext) {
        const marketContext = item.marketContext as KnowledgeMarketContext;
        if (marketContext.therapeuticArea !== filters.therapeuticArea) {
          continue;
        }
      }

      if (filters?.audience && item.audienceContext) {
        const audienceContext = item.audienceContext as KnowledgeAudienceContext;
        if (audienceContext.audience !== filters.audience) {
          continue;
        }
      }

      if (filters?.specialty && item.audienceContext) {
        const audienceContext = item.audienceContext as KnowledgeAudienceContext;
        if (audienceContext.specialty !== filters.specialty) {
          continue;
        }
      }

      scored.push({ content: item, similarity });
    } catch (error) {
      // Skip items with invalid embeddings
      console.warn(`[Knowledge] Invalid embedding for content ${item.id}`);
    }
  }

  // Sort by similarity and take top results
  scored.sort((a, b) => b.similarity - a.similarity);
  const topResults = scored.slice(0, limit);

  // Map to search result format
  return topResults.map(({ content, similarity }) => ({
    id: content.id,
    title: content.title,
    content: content.content,
    contentType: content.contentType,
    source: content.source,
    similarity: Math.round(similarity * 100) / 100,
  }));
}

/**
 * Find similar content to a given item
 */
export async function findSimilarContent(
  contentId: string,
  limit: number = 5
): Promise<KnowledgeSearchResult[]> {
  const source = await getKnowledgeContentById(contentId);

  if (!source || !source.embedding) {
    return [];
  }

  const sourceEmbedding = parseEmbeddingFromStorage(source.embedding);

  // Get all other content
  const allContent = await db
    .select()
    .from(knowledgeContent)
    .where(sql`${knowledgeContent.id} != ${contentId}`)
    .limit(500);

  // Calculate similarities
  const scored: Array<{
    content: KnowledgeContentDB;
    similarity: number;
  }> = [];

  for (const item of allContent) {
    if (!item.embedding) {
      continue;
    }

    try {
      const itemEmbedding = parseEmbeddingFromStorage(item.embedding);
      const similarity = cosineSimilarity(sourceEmbedding, itemEmbedding);
      scored.push({ content: item, similarity });
    } catch {
      // Skip invalid embeddings
    }
  }

  // Sort and return top results
  scored.sort((a, b) => b.similarity - a.similarity);
  const topResults = scored.slice(0, limit);

  return topResults.map(({ content, similarity }) => ({
    id: content.id,
    title: content.title,
    content: content.content,
    contentType: content.contentType,
    source: content.source,
    similarity: Math.round(similarity * 100) / 100,
  }));
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk import knowledge content (for migrations)
 */
export async function bulkImportKnowledgeContent(
  items: InsertKnowledgeContent[]
): Promise<{ imported: number; failed: number }> {
  let imported = 0;
  let failed = 0;

  for (const item of items) {
    try {
      await createKnowledgeContent(item);
      imported++;
    } catch (error) {
      console.error(`[Knowledge] Failed to import: ${item.title}`, error);
      failed++;
    }
  }

  return { imported, failed };
}

/**
 * Regenerate embeddings for all content (maintenance operation)
 */
export async function regenerateAllEmbeddings(): Promise<{
  updated: number;
  failed: number;
}> {
  const allContent = await db.select().from(knowledgeContent);

  let updated = 0;
  let failed = 0;

  for (const item of allContent) {
    try {
      const textForEmbedding = `${item.title} ${item.content}`;
      const embedding = await generateEmbedding(textForEmbedding);
      const embeddingStr = formatEmbeddingForStorage(embedding);

      await db
        .update(knowledgeContent)
        .set({ embedding: embeddingStr })
        .where(eq(knowledgeContent.id, item.id));

      updated++;
    } catch (error) {
      console.error(`[Knowledge] Failed to regenerate embedding for ${item.id}`);
      failed++;
    }
  }

  return { updated, failed };
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get knowledge base statistics
 */
export async function getKnowledgeStats(): Promise<{
  totalItems: number;
  byContentType: Record<string, number>;
  byTherapeuticArea: Record<string, number>;
  withEmbeddings: number;
}> {
  const allContent = await db.select().from(knowledgeContent);

  const byContentType: Record<string, number> = {};
  const byTherapeuticArea: Record<string, number> = {};
  let withEmbeddings = 0;

  for (const item of allContent) {
    // Count by content type
    byContentType[item.contentType] = (byContentType[item.contentType] || 0) + 1;

    // Count by therapeutic area
    const ta = (item.marketContext as KnowledgeMarketContext | null)?.therapeuticArea;
    if (ta) {
      byTherapeuticArea[ta] = (byTherapeuticArea[ta] || 0) + 1;
    }

    // Count items with embeddings
    if (item.embedding) {
      withEmbeddings++;
    }
  }

  return {
    totalItems: allContent.length,
    byContentType,
    byTherapeuticArea,
    withEmbeddings,
  };
}

// ============================================================================
// SEED DATA
// ============================================================================

/**
 * Seed initial knowledge content (for development)
 */
export async function seedKnowledgeContent(): Promise<void> {
  const existingCount = await db.select().from(knowledgeContent).limit(1);

  if (existingCount.length > 0) {
    console.log("[Knowledge] Knowledge base already seeded, skipping");
    return;
  }

  console.log("[Knowledge] Seeding knowledge base...");

  const sampleContent: InsertKnowledgeContent[] = [
    {
      title: "HCP Engagement Best Practices for Cardiology",
      content:
        "Cardiologists are time-constrained specialists who prefer concise, data-driven communications. Key engagement strategies include: 1) Lead with clinical outcomes data, 2) Use peer-reviewed journal citations, 3) Respect their time with brief interactions, 4) Provide digital resources for deeper dives. Multi-channel approaches combining rep visits with digital touchpoints show 40% higher engagement than single-channel strategies.",
      contentType: "research",
      source: "Internal Research",
      audienceContext: {
        audience: "HCP",
        specialty: "Cardiology",
        experienceLevel: "advanced",
      },
      marketContext: {
        therapeuticArea: "Cardiovascular",
      },
      channelContext: {
        primaryChannel: "rep_visit",
        deliveryMode: "hybrid",
      },
      tags: ["cardiology", "hcp-engagement", "best-practices"],
    },
    {
      title: "Oncology Market Landscape 2024",
      content:
        "The oncology market continues to grow at 12% CAGR, driven by immunotherapy and targeted therapies. Key trends: 1) Increasing use of biomarker testing for treatment selection, 2) Growth of oral therapies shifting treatment to outpatient settings, 3) Rising importance of real-world evidence in HCP decision-making. Top competitors include Bristol Myers Squibb, Merck, and Roche in the immuno-oncology space.",
      contentType: "market_research",
      source: "Market Analysis Team",
      audienceContext: {
        audience: "HCP",
        specialty: "Oncology",
      },
      marketContext: {
        therapeuticArea: "Oncology",
        marketStage: "post-launch",
        competitors: ["Bristol Myers Squibb", "Merck", "Roche"],
      },
      tags: ["oncology", "market-research", "immuno-oncology"],
    },
    {
      title: "DTC Advertising Compliance Guidelines",
      content:
        "Direct-to-consumer advertising must comply with FDA OPDP regulations. Key requirements: 1) Fair balance between benefit and risk information, 2) Major statement of most serious risks, 3) Adequate provision for full prescribing information, 4) No false or misleading claims. DTC ads should encourage patients to discuss with their healthcare provider rather than demand specific treatments.",
      contentType: "regulatory",
      source: "Regulatory Affairs",
      audienceContext: {
        audience: "Consumer",
      },
      channelContext: {
        primaryChannel: "dtc",
      },
      tags: ["compliance", "dtc", "fda", "opdp"],
    },
    {
      title: "Primary Care Engagement Patterns",
      content:
        "Primary care physicians see high patient volumes and have limited time per interaction. Effective engagement strategies: 1) Brief, focused messages (under 3 minutes for rep visits), 2) Emphasis on patient outcomes and practice efficiency, 3) Digital tools that save time (e-sampling, prior authorization support), 4) Peer influence through local KOLs. Email open rates average 18% with best performance on Tuesday mornings.",
      contentType: "benchmark",
      source: "Field Intelligence",
      audienceContext: {
        audience: "HCP",
        specialty: "Primary_Care",
      },
      marketContext: {
        therapeuticArea: "Metabolic",
      },
      channelContext: {
        primaryChannel: "email",
      },
      tags: ["primary-care", "engagement", "digital"],
    },
    {
      title: "Rheumatology Therapeutic Landscape",
      content:
        "The rheumatology market is characterized by increasing use of biologics and JAK inhibitors. Rheumatoid arthritis remains the largest indication, followed by psoriatic arthritis and ankylosing spondylitis. Key decision factors for rheumatologists: 1) Clinical efficacy data, 2) Safety profile especially infection risk, 3) Patient convenience (route of administration, dosing frequency), 4) Payer coverage. MSLs are highly valued for scientific exchange.",
      contentType: "research",
      source: "Medical Affairs",
      audienceContext: {
        audience: "HCP",
        specialty: "Rheumatology",
      },
      marketContext: {
        therapeuticArea: "Immunology",
      },
      tags: ["rheumatology", "biologics", "autoimmune"],
    },
  ];

  for (const item of sampleContent) {
    try {
      await createKnowledgeContent(item);
      console.log(`[Knowledge] Seeded: ${item.title}`);
    } catch (error) {
      console.error(`[Knowledge] Failed to seed: ${item.title}`, error);
    }
  }

  console.log("[Knowledge] Seeding complete");
}
