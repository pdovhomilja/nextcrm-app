import * as $runtime from "../runtime/library"

/**
 * @param query_embedding - Vector embedding to search for
 * @param limit - Maximum number of results to return
 */
export const findSimilarBoards: (query_embedding: string, limit: number) => $runtime.TypedSql<findSimilarBoards.Parameters, findSimilarBoards.Result>

export namespace findSimilarBoards {
  export type Parameters = [query_embedding: string, limit: number]
  export type Result = {
    board_id: string
    name: string
    description: string | null
    content: string
    metadata: $runtime.JsonValue
    similarity: number | null
  }
}
