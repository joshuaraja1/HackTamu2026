import { pipeline } from '@xenova/transformers';
import type { Car } from './types';
import { generateCarSearchText, tokenize } from './text';

let embeddingModel: any = null;
let embeddingModelPromise: Promise<any> | null = null;

/**
 * Initialize embedding model (lazy loading)
 */
async function getEmbeddingModel() {
  if (embeddingModel) return embeddingModel;
  
  if (!embeddingModelPromise) {
    embeddingModelPromise = pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2', // 384 dimensions, lightweight
      { quantized: true }
    );
  }
  
  embeddingModel = await embeddingModelPromise;
  return embeddingModel;
}

/**
 * Generate embedding using transformer model
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = await getEmbeddingModel();
    const output = await model(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (error) {
    console.warn('Transformer embedding failed, using fallback:', error);
    return generateHashedEmbedding(text);
  }
}

/**
 * Fallback: Generate deterministic hashed embedding
 * This creates a fixed-size vector from text tokens
 */
export function generateHashedEmbedding(text: string, dimensions: number = 384): number[] {
  const tokens = tokenize(text);
  const vector = new Array(dimensions).fill(0);
  
  // Hash each token into vector dimensions
  for (const token of tokens) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = ((hash << 5) - hash) + token.charCodeAt(i);
      hash = hash & hash;
    }
    
    const index = Math.abs(hash) % dimensions;
    const value = (Math.abs(hash) % 1000) / 1000; // Normalize to 0-1
    vector[index] += value;
  }
  
  // Normalize vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    return vector.map(val => val / magnitude);
  }
  
  return vector;
}

/**
 * Generate embedding for a car
 */
export async function generateCarEmbedding(car: Car): Promise<number[]> {
  const searchText = generateCarSearchText(car);
  return generateEmbedding(searchText);
}

/**
 * Compute cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

