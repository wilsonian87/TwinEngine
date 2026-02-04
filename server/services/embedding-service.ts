/**
 * Embedding Service
 *
 * Generates text embeddings using Transformers.js for semantic search.
 * Uses the all-MiniLM-L6-v2 model (384 dimensions).
 */

import { pipeline, env } from "@xenova/transformers";

// Configure transformers.js
(env as { cacheDir: string }).cacheDir = "./.cache/transformers";
(env as { allowLocalModels: boolean }).allowLocalModels = false;

// Model configuration
const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";
const EMBEDDING_DIMENSION = 384;

// Singleton pipeline instance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embeddingPipeline: any = null;
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize the embedding pipeline
 */
async function initializePipeline(): Promise<void> {
  if (embeddingPipeline) {
    return;
  }

  if (isInitializing && initializationPromise) {
    await initializationPromise;
    return;
  }

  isInitializing = true;
  initializationPromise = (async () => {
    try {
      console.log("[Embedding] Initializing embedding model...");
      embeddingPipeline = await pipeline("feature-extraction", MODEL_NAME, {
        quantized: true, // Use quantized model for faster inference
      });
      console.log("[Embedding] Model initialized successfully");
    } catch (error) {
      console.error("[Embedding] Failed to initialize model:", error);
      throw error;
    } finally {
      isInitializing = false;
    }
  })();

  await initializationPromise;
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  await initializePipeline();

  if (!embeddingPipeline) {
    throw new Error("Embedding pipeline not initialized");
  }

  // Truncate long text to avoid issues
  const truncatedText = text.slice(0, 8000);

  const output = await embeddingPipeline(truncatedText, {
    pooling: "mean",
    normalize: true,
  });

  // Extract the embedding array - output.data is a Float32Array
  const embedding = Array.from(output.data as Float32Array);

  return embedding;
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings = await Promise.all(texts.map((text) => generateEmbedding(text)));
  return embeddings;
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Embeddings must have the same dimension");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Format embedding array for PostgreSQL vector storage
 * PostgreSQL expects format: [0.1, 0.2, 0.3, ...]
 */
export function formatEmbeddingForStorage(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

/**
 * Parse embedding from PostgreSQL storage format
 */
export function parseEmbeddingFromStorage(stored: string): number[] {
  // Remove brackets and parse
  const cleaned = stored.replace(/^\[|\]$/g, "");
  return cleaned.split(",").map((n) => parseFloat(n));
}

/**
 * Get the embedding dimension
 */
export function getEmbeddingDimension(): number {
  return EMBEDDING_DIMENSION;
}

/**
 * Warm up the embedding model (call on startup)
 */
export async function warmUpEmbeddingModel(): Promise<void> {
  try {
    console.log("[Embedding] Warming up embedding model...");
    await generateEmbedding("warm up text");
    console.log("[Embedding] Warm-up complete");
  } catch (error) {
    console.warn("[Embedding] Warm-up failed (model will initialize on first use):", error);
  }
}

/**
 * Check if the embedding service is ready
 */
export function isEmbeddingServiceReady(): boolean {
  return embeddingPipeline !== null;
}
