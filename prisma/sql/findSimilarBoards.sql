-- Find similar boards using pgvector cosine similarity
-- @param {String} $1:query_embedding - Vector embedding to search for
-- @param {Int} $2:limit - Maximum number of results to return

SELECT 
  be.board_id,
  b.name,
  b.description,
  be.content,
  be.metadata,
  1 - (be.embedding <=> $1::vector) AS similarity
FROM board_embeddings be
JOIN "Board" b ON be.board_id = b.id
ORDER BY be.embedding <=> $1::vector
LIMIT $2;