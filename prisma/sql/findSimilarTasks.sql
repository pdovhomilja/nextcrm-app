-- Find similar tasks using pgvector cosine similarity (COMPANY FILTERED)
-- @param {String} $1:query_embedding - Vector embedding to search for
-- @param {String} $2:company_id - Company ID for data isolation  
-- @param {Int} $3:limit - Maximum number of results to return

SELECT 
  te.task_id,
  t.title,
  t.description,
  te.content,
  te.metadata,
  1 - (te.embedding <=> $1::vector) AS similarity
FROM task_embeddings te
JOIN "Task" t ON te.task_id = t.id
JOIN "User" u ON t.assigned_to_id = u.id
WHERE u.cid = $2
ORDER BY te.embedding <=> $1::vector
LIMIT $3;