# TaskHQ n8n Agent Workflow Setup Guide

## Overview
This guide helps you set up an n8n workflow with an AI agent that connects to your TaskHQ MCP server for intelligent task and project management automation.

## Prerequisites

### 1. n8n Installation
```bash
# Option 1: npm (global installation)
npm install n8n -g

# Option 2: Docker
docker run -it --rm --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n

# Option 3: Docker Compose (recommended for production)
# See: https://docs.n8n.io/hosting/installation/docker/
```

### 2. Required n8n Community Packages
Install these community packages in n8n:
- `n8n-nodes-mcp-client` (by Nerding.io) - for MCP server connection
- `@n8n/n8n-nodes-langchain` (official) - for AI agent functionality

To install:
1. Go to n8n Settings → Community Nodes
2. Search for and install the packages above
3. Set environment variable: `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true`

### 3. TaskHQ Server Configuration
Ensure your TaskHQ server is running with MCP endpoints enabled:

#### Environment Variables (.env.local)
```bash
# MCP Configuration
MCP_TOOLS_ENABLED="true"
MCP_VERBOSE_LOGS="true"
MCP_MAX_DURATION="800"

# AI Configuration
OPENAI_API_KEY="sk-your-openai-key"
AI_MODEL="gpt-4-turbo"
EMBEDDING_MODEL="text-embedding-ada-002"

# Feature Flags
AI_FEATURES_ENABLED="true"
PGVECTOR_ENABLED="true"

# Your app URL
NEXT_PUBLIC_APP_URL="https://your-taskhq-domain.com"
```

## Setup Instructions

### Step 1: Import the Workflow
1. Open n8n in your browser (default: http://localhost:5678)
2. Click "Import from file" or use the + button
3. Import the `n8n-workflow-taskhq-agent.json` file

### Step 2: Configure Environment Variables in n8n
Add these environment variables in n8n Settings → Environment Variables:

```bash
# OpenAI API Key for the AI Agent
OPENAI_API_KEY=sk-your-openai-key-here

# TaskHQ MCP Server Base URL
TASKHQ_MCP_BASE_URL=https://your-taskhq-domain.com/api/mcp
```

### Step 3: Configure TaskHQ MCP Client Node
1. Open the "TaskHQ MCP Client" node in the workflow
2. Set the URL to: `{{ $vars.TASKHQ_MCP_BASE_URL }}/sse`
3. Configure authentication:
   - Choose "HTTP Header Auth" 
   - Header Name: `Authorization`
   - Header Value: `Bearer YOUR_TASKHQ_API_TOKEN`

### Step 4: Test the Setup
1. Activate the workflow
2. Get the webhook URL from the "Webhook Trigger" node
3. Send a test request:

```bash
curl -X POST "https://your-n8n-instance.com/webhook/taskhq-agent" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Check TaskHQ server health and show me my available boards"
  }'
```

## Available MCP Tools & Capabilities

### 🔧 Server Management
- **health_check**: Check server connectivity and status
- **server_info**: Get configuration and user context
- **vector_search_health**: Verify AI search functionality

### 📋 Board Management
- **search_boards**: Find and filter accessible boards
- **get_board_info**: Comprehensive board analytics with task statistics
- **compare_boards**: Compare performance metrics across multiple boards
- **suggest_board_optimizations**: AI-powered optimization recommendations

### 🔍 Task Search & Discovery
- **semantic_search_tasks**: AI-powered vector search for tasks
- **hybrid_search**: Combined semantic and keyword search
- **find_similar_tasks**: Find related tasks using AI similarity

### 📊 Analytics & Insights
- **get_embedding_status**: Check AI embedding coverage
- Board completion rates, team performance, priority distribution
- Task duration analytics and workload balance insights

## Example Interactions

### 1. Health Check & Setup Verification
```json
{
  "message": "Check if TaskHQ is healthy and show server info"
}
```

### 2. Board Analysis
```json
{
  "message": "Analyze board performance for board ID 'clx1y2z3a4b5c6d7e8f9' and suggest optimizations"
}
```

### 3. Semantic Task Search
```json
{
  "message": "Find all tasks related to 'user authentication' and 'login issues' with high priority"
}
```

### 4. Board Comparison
```json
{
  "message": "Compare completion rates between boards 'board1-id' and 'board2-id' for the last month"
}
```

## Advanced Configuration

### Custom Authentication
For production use, implement proper authentication:

```javascript
// In the MCP Client node, use custom headers:
{
  "Authorization": "Bearer {{ $vars.TASKHQ_API_TOKEN }}",
  "X-Company-ID": "{{ $vars.TASKHQ_COMPANY_ID }}",
  "Content-Type": "application/json"
}
```

### Rate Limiting & Error Handling
The workflow includes:
- Built-in error handling with user-friendly error responses
- Timeout configuration (30 seconds default)
- Automatic retry logic for failed MCP calls

### Webhook Security
Add webhook authentication:
1. Go to Webhook Trigger node settings
2. Enable "Authentication"
3. Choose "Header Auth" and set a secret token

## Monitoring & Logging

### Enable Verbose Logging
Set in TaskHQ `.env.local`:
```bash
MCP_VERBOSE_LOGS="true"
```

### n8n Execution Monitoring
- Check n8n execution history for detailed logs
- Monitor MCP server responses in TaskHQ logs
- Use TaskHQ's `/api/health/mcp` endpoint for health monitoring

## Troubleshooting

### Common Issues

1. **MCP Connection Failed**
   - Check TaskHQ server is running and accessible
   - Verify MCP endpoints are enabled (`MCP_TOOLS_ENABLED="true"`)
   - Test direct MCP endpoint: `GET /api/mcp/health`

2. **Authentication Errors**
   - Verify API tokens and company ID
   - Check user has proper board access permissions
   - Test authentication with `/api/auth/session`

3. **Vector Search Not Working**
   - Check `PGVECTOR_ENABLED="true"`
   - Verify embeddings are generated: use `get_embedding_status` tool
   - Test direct vector search: `/api/mcp/search`

4. **Agent Not Responding**
   - Check OpenAI API key is valid
   - Verify n8n community packages are installed
   - Check n8n execution logs for detailed error messages

### Debug Commands

Test MCP endpoints directly:
```bash
# Health check
curl "https://your-taskhq-domain.com/api/mcp/health"

# Test board access
curl "https://your-taskhq-domain.com/api/mcp/boards/sse" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test vector search
curl "https://your-taskhq-domain.com/api/mcp/search/sse" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Production Deployment

### Docker Compose Example
```yaml
version: '3.8'
services:
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - TASKHQ_MCP_BASE_URL=${TASKHQ_MCP_BASE_URL}
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  n8n_data:
```

### Security Considerations
- Use HTTPS for all MCP connections
- Implement proper API key management
- Set up webhook authentication
- Monitor API usage and rate limits
- Regular security updates for n8n and packages

---

## Support & Resources

- **TaskHQ Documentation**: Check your project's documentation
- **n8n Community**: https://community.n8n.io/
- **MCP Specification**: https://github.com/anthropics/mcp
- **n8n-nodes-mcp**: https://github.com/nerding-io/n8n-nodes-mcp

For TaskHQ-specific issues, check the server logs and MCP endpoint health status.