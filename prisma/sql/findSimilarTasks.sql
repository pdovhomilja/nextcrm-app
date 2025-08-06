-- Find similar tasks using pgvector cosine similarity
-- @param {String} $1:query_embedding - Vector embedding to search for
-- @param {Int} $2:limit - Maximum number of results to return

SELECT 
  te.task_id,
  t.title,
  t.description,
  te.content,
  te.metadata,
  1 - (te.embedding <=> $1::vector) AS similarity
FROM task_embeddings te
JOIN "Task" t ON te.task_id = t.id
ORDER BY te.embedding <=> $1::vector
LIMIT $2;