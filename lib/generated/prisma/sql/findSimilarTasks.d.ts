import * as $runtime from "../runtime/library"

/**
 * @param query_embedding - Vector embedding to search for
 * @param limit - Maximum number of results to return
 */
export const findSimilarTasks: (query_embedding: string, limit: number) => $runtime.TypedSql<findSimilarTasks.Parameters, findSimilarTasks.Result>

export namespace findSimilarTasks {
  export type Parameters = [query_embedding: string, limit: number]
  export type Result = {
    task_id: string
    title: string
    description: string
    content: string
    metadata: $runtime.JsonValue
    similarity: number | null
  }
}
