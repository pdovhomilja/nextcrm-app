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

## Tasks Tools (`/api/mcp/tasks/mcp`)

### create_task
Create a new task in a board section.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| title | string | yes | Task title |
| description | string | no | Task description |
| boardSectionId | string | yes | Section to place the task in |
| priority | LOW / MEDIUM / HIGH / CRITICAL | no | Default: MEDIUM |
| assigneeIds | string[] | no | User IDs to assign |
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
Get full task details by ID.

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
| targetPosition | number | no | Position in section |

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
Delete a board and all its sections/tasks.

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
Delete an empty section.

| Parameter | Type | Required |
|-----------|------|----------|
| sectionId | string | yes |
| boardId | string | yes |

### get_board_info
Comprehensive board info with stats, sections, and tasks.

| Parameter | Type | Required |
|-----------|------|----------|
| boardId | string | yes |
| includeTaskDetails | boolean | no |
| includeTeamInfo | boolean | no |

### compare_boards
Compare metrics across multiple boards.

| Parameter | Type | Required |
|-----------|------|----------|
| boardIds | string[] | yes (2-5) |
| timeRange | week / month / quarter | no |
| metrics | string[] | no |

### suggest_board_optimizations
AI-generated optimization suggestions.

| Parameter | Type | Required |
|-----------|------|----------|
| boardId | string | yes |
| focus | performance / team_balance / workflow / priorities | no |

## Search Tools (`/api/mcp/search/mcp`)

### semantic_search_tasks
Vector-based semantic search using embeddings.

### hybrid_search
Combined vector + keyword search.

### find_similar_tasks
Find tasks similar to a given task.

### search_boards
Search boards by name/description.

## Analytics Tools (`/api/mcp/analytics/mcp`)

### analyze_project_health
Project health metrics for a board.

### analyze_team_performance
Team workload and completion metrics.

## Example Workflow

```bash
# 1. List all boards
curl -X POST "$BASE/api/mcp/tasks/mcp" \
  -H "Authorization: Bearer thq_..." \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/list","params":{}}'

# 2. List boards
curl -X POST "$BASE/api/mcp/boards/mcp" \
  -H "Authorization: Bearer thq_..." \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"list_boards","arguments":{}}}'

# 3. Create a board
curl -X POST "$BASE/api/mcp/boards/mcp" \
  -H "Authorization: Bearer thq_..." \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"create_board","arguments":{"name":"Sprint 42"}}}'

# 4. Create a task
curl -X POST "$BASE/api/mcp/tasks/mcp" \
  -H "Authorization: Bearer thq_..." \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"create_task","arguments":{"title":"Fix login bug","boardSectionId":"<section-id>","priority":"HIGH"}}}'

# 5. Mark task done
curl -X POST "$BASE/api/mcp/tasks/mcp" \
  -H "Authorization: Bearer thq_..." \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"mark_task_done","arguments":{"taskId":"<task-id>"}}}'
```

## Token Generation

1. Go to **Settings > Account** in TaskHQ
2. Click **New Token**
3. Name it and choose an expiration
4. Copy the token immediately — it is shown only once
5. Download this SKILL.md for reference
