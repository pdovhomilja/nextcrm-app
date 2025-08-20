-- Find similar boards using pgvector cosine similarity (COMPANY FILTERED)
-- @param {String} $1:query_embedding - Vector embedding to search for
-- @param {String} $2:company_id - Company ID for data isolation
-- @param {Int} $3:limit - Maximum number of results to return

SELECT 
  be.board_id,
  b.name,
  b.description,
  be.content,
  be.metadata,
  1 - (be.embedding <=> $1::vector) AS similarity
FROM board_embeddings be
JOIN "Board" b ON be.board_id = b.id
JOIN "User" u ON u.id = ANY(b.access)
WHERE u.cid = $2
ORDER BY be.embedding <=> $1::vector
LIMIT $3;