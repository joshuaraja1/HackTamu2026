-- Create vector index for semantic search performance
-- This should be run after embeddings are generated

CREATE INDEX IF NOT EXISTS idx_cars_embedding ON cars 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

