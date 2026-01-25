/**
 * Utility functions that don't require external dependencies
 */
import { tokenize } from './text';

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

/**
 * Fallback: Generate deterministic hashed embedding
 * This creates a fixed-size vector from text tokens (no external deps)
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

