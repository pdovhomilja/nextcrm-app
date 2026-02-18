# TaskHQ MCP Server — Agent Skill

TaskHQ exposes Model Context Protocol (MCP) endpoints that let external AI agents manage boards and tasks.

## Authentication

All requests require a Bearer token in the `Authorization` header:

```
Authorization: Bearer thq_<token>
```

Generate a token in **Settings > Account** inside TaskHQ.

## Base URL

Replace `<BASE>` with your TaskHQ deployment URL (e.g. `https://taskhq.xmation.ai`).

## MCP Endpoints

| Endpoint | Purpose |
|----------|---------|
| `<BASE>/api/mcp/mcp` | System tools, all task/board/search/analytics tools |
| `<BASE>/api/mcp/tasks/mcp` | Task CRUD, search, move |
| `<BASE>/api/mcp/boards/mcp` | Board CRUD, sections, analytics |
| `<BASE>/api/mcp/search/mcp` | Vector / hybrid / similarity search |
| `<BASE>/api/mcp/analytics/mcp` | Project health & team analytics |

All endpoints accept `POST` with JSON body following the MCP `tools/call` spec:

```json
{
  "method": "tools/call",
  "params": {
    "name": "<tool_name>",
    "arguments": { ... }
  }
}
```

---

## System Tools (`/api/mcp/mcp`)

### health_check
Check server health and feature flags. No parameters required.

Returns: `status`, `timestamp`, `server`, and `features` (aiEnabled, mcpEnabled, pgvectorEnabled).

### server_info
Get server configuration, capabilities list, and authentication status. No parameters required.

Returns: server version, authenticated user/company IDs, full list of available tool names, and environment info.

---

## Tasks Tools (`/api/mcp/tasks/mcp`)

### create_task
Create a new task in a board section.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| title | string | yes | Task title |
| description | string | no | Task description |
| boardSectionId | string | yes | Section to place the task in |
| priority | LOW / MEDIUM / HIGH / CRITICAL | no | Default: MEDIUM |
| assigneeIds | string[] | no | User IDs to assign (first ID is used) |
| dueDate | string (ISO) | no | Default: 7 days from now |

### search_tasks
Search and filter tasks.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| searchTerm | string | no | Text search in title/description |
| boardId | string | no | Filter by board |
| status | string[] | no | NEW, IN_PROGRESS, COMPLETED, CANCELLED, ON_HOLD |
| priority | string[] | no | LOW, MEDIUM, HIGH, CRITICAL |
| assigneeIds | string[] | no | Filter by assignees |
| limit | number | no | Default: 10, max: 50 |

### update_task
Update an existing task.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| taskId | string | yes | Task ID |
| title | string | no | New title |
| description | string | no | New description |
| priority | string | no | New priority |
| status | string | no | New status |
| assignedToId | string | no | New assignee |
| dueDate | string (ISO) | no | New due date |

### get_task
Get full task details by ID, including last 10 history entries.

| Parameter | Type | Required |
|-----------|------|----------|
| taskId | string | yes |

### delete_task
Delete a task.

| Parameter | Type | Required |
|-----------|------|----------|
| taskId | string | yes |

### mark_task_done
Set task status to COMPLETED.

| Parameter | Type | Required |
|-----------|------|----------|
| taskId | string | yes |

### move_task
Move a task to a different board section.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| taskId | string | yes | Task ID |
| targetSectionId | string | yes | Destination section |
| targetPosition | number | no | Position in section (default: 0) |

---

## Boards Tools (`/api/mcp/boards/mcp`)

### list_boards
List boards you have access to.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | no | Search by name/description |
| limit | number | no | Default: 20, max: 50 |

### create_board
Create a new board (with optional default sections: To Do, In Progress, Done).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | yes | Board name |
| description | string | no | Board description |
| withTemplate | boolean | no | Default: true — creates 3 default sections |

### edit_board
Update board name/description.

| Parameter | Type | Required |
|-----------|------|----------|
| boardId | string | yes |
| name | string | no |
| description | string | no |

### delete_board
Delete a board and all its sections/tasks. Requires creator or company admin role.

| Parameter | Type | Required |
|-----------|------|----------|
| boardId | string | yes |

### list_board_sections
List sections of a board with task counts.

| Parameter | Type | Required |
|-----------|------|----------|
| boardId | string | yes |

### create_board_section
Add a new section (column) to a board.

| Parameter | Type | Required |
|-----------|------|----------|
| boardId | string | yes |
| name | string | yes |

### delete_board_section
Delete an empty section. Fails if the section still contains tasks.

| Parameter | Type | Required |
|-----------|------|----------|
| sectionId | string | yes |
| boardId | string | yes |

### get_board_info
Comprehensive board info with stats, sections, and tasks.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| boardId | string | yes | Board ID |
| includeTaskDetails | boolean | no | Default: true — include task list per section |
| includeTeamInfo | boolean | no | Default: true — include assignee info |

### compare_boards
Compare metrics across multiple boards.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| boardIds | string[] | yes | 2–5 board IDs to compare |
| timeRange | week / month / quarter | no | Default: month |
| metrics | string[] | no | completion_rate, task_count, team_size, avg_task_duration. Default: completion_rate, task_count |

### suggest_board_optimizations
AI-generated optimization suggestions based on current board performance.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| boardId | string | yes | Board ID |
| focus | performance / team_balance / workflow / priorities | no | Default: performance |

---

## Search Tools (`/api/mcp/search/mcp`)

### semantic_search_tasks
Vector-based semantic search using OpenAI embeddings (1536 dimensions). Returns tasks ranked by cosine similarity.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | yes | Natural-language search query |
| threshold | number | no | Minimum similarity score 0–1. Default: 0.7 |
| limit | number | no | Max results 1–50. Default: 10 |
| filters | object | no | Optional filter object (see below) |
| filters.boardIds | string[] | no | Restrict to specific boards |
| filters.priority | string[] | no | LOW, MEDIUM, HIGH, CRITICAL |
| filters.status | string[] | no | NEW, IN_PROGRESS, COMPLETED, CANCELLED, ON_HOLD |
| filters.assigneeIds | string[] | no | Restrict to specific assignees |
| filters.dateRange | object | no | `{ start: ISO string, end: ISO string }` |

### hybrid_search
Combined vector + keyword search. Blend semantic and exact-match relevance using configurable weights.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | yes | Search query |
| vectorWeight | number | no | Weight for semantic results 0–1. Default: 0.7 |
| keywordWeight | number | no | Weight for keyword results 0–1. Default: 0.3 |
| limit | number | no | Max results 1–20. Default: 10 |
| filters | object | no | Optional filter object (see below) |
| filters.boardId | string | no | Restrict to a single board |
| filters.priority | string[] | no | LOW, MEDIUM, HIGH, CRITICAL |
| filters.status | string[] | no | NEW, IN_PROGRESS, COMPLETED, CANCELLED, ON_HOLD |

### find_similar_tasks
Find tasks similar to a given task using vector similarity. Requires embeddings to be generated.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| taskId | string | yes | Source task ID |
| limit | number | no | Max results 1–20. Default: 5 |
| threshold | number | no | Minimum similarity score 0–1. Default: 0.5 |

### search_boards
Search boards by name/description using keyword matching.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | no | Search term for board name/description |
| limit | number | no | Max results 1–50. Default: 10 |

Returns board list with section counts and total task counts per board.

### get_embedding_status
Check how many task and board embeddings exist and whether vector search is ready.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| boardId | string | no | If provided, also counts embeddings for that specific board's tasks |

Returns: totalTaskEmbeddings, totalBoardEmbeddings, embeddingCoverage %, vectorSearchCapability, status, and recommendations.

### vector_search_health
Check vector search system health. No parameters required.

Returns: `healthy` boolean, pgvector connectivity status, and remediation recommendations if unhealthy.

---

## Analytics Tools (`/api/mcp/analytics/mcp`)

### analyze_project_health
Project health metrics and bottleneck detection for a board over a time window.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| boardId | string | yes | Board to analyze |
| timeRange | week / month / quarter | no | Look-back window. Default: month |
| includeTeamMetrics | boolean | no | Include per-member workload breakdown. Default: true |

Returns: healthScore (0–100), completion rate, average task duration, in-progress count, bottleneck list, and team workload map (if enabled).

### analyze_team_performance
Team workload distribution and completion metrics across one or all boards.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| boardId | string | no | Scope to a single board (omit for all boards) |
| timeRange | week / month / quarter | no | Look-back window. Default: month |
| includeIndividualMetrics | boolean | no | Include per-member detail. Default: true |

Returns: team overview (total members, tasks, average completion rate), per-member breakdown (tasksByPriority, tasksByStatus, completionRate), and AI-generated insights.

---

## Example Workflow

```bash
# 1. Check server health
curl -X POST "$BASE/api/mcp/mcp" \
  -H "Authorization: Bearer thq_..." \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"health_check","arguments":{}}}'

# 2. List all tools available on this server
curl -X POST "$BASE/api/mcp/mcp" \
  -H "Authorization: Bearer thq_..." \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/list","params":{}}'

# 3. List boards
curl -X POST "$BASE/api/mcp/boards/mcp" \
  -H "Authorization: Bearer thq_..." \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"list_boards","arguments":{}}}'

# 4. Create a board
curl -X POST "$BASE/api/mcp/boards/mcp" \
  -H "Authorization: Bearer thq_..." \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"create_board","arguments":{"name":"Sprint 42"}}}'

# 5. Create a task
curl -X POST "$BASE/api/mcp/tasks/mcp" \
  -H "Authorization: Bearer thq_..." \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"create_task","arguments":{"title":"Fix login bug","boardSectionId":"<section-id>","priority":"HIGH"}}}'

# 6. Semantic search for tasks about authentication
curl -X POST "$BASE/api/mcp/search/mcp" \
  -H "Authorization: Bearer thq_..." \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"semantic_search_tasks","arguments":{"query":"authentication and login issues","threshold":0.6,"limit":5}}}'

# 7. Check embedding status before using vector search
curl -X POST "$BASE/api/mcp/search/mcp" \
  -H "Authorization: Bearer thq_..." \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"get_embedding_status","arguments":{}}}'

# 8. Analyze project health for a board
curl -X POST "$BASE/api/mcp/analytics/mcp" \
  -H "Authorization: Bearer thq_..." \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"analyze_project_health","arguments":{"boardId":"<board-id>","timeRange":"month","includeTeamMetrics":true}}}'

# 9. Mark task done
curl -X POST "$BASE/api/mcp/tasks/mcp" \
  -H "Authorization: Bearer thq_..." \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"mark_task_done","arguments":{"taskId":"<task-id>"}}}'
```

---

## Token Generation

1. Go to **Settings > Account** in TaskHQ
2. Click **New Token**
3. Name it and choose an expiration
4. Copy the token immediately — it is shown only once
5. Download this SKILL.md for reference
