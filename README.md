# TaskHQ.xmation.ai

**AI-Powered Task & Project Management Platform**

A sophisticated, multi-tenant SaaS platform that combines traditional project management with cutting-edge artificial intelligence to enhance productivity and streamline workflows.

## 🚀 Features

### 🤖 AI-Powered Intelligence

- **Smart Task Generation**: Create boards and tasks from natural language descriptions
- **Semantic Search**: Find tasks and documents using AI-powered vector similarity search
- **Intelligent Suggestions**: Get AI-driven recommendations for task prioritization and project optimization
- **Document Processing**: OCR, PDF parsing, and DOCX processing with AI insights
- **Conversation Memory**: AI assistant with context awareness and memory retention

### 📋 Advanced Task Management

- **Kanban Boards**: Drag-and-drop task management with customizable sections
- **Multi-level Organization**: Companies → Boards → Sections → Tasks hierarchy
- **Priority & Status Tracking**: Comprehensive task lifecycle management
- **Team Collaboration**: Role-based access control and assignment management
- **Real-time Updates**: Live synchronization across all team members

### 📧 Integrated Email Management

- **Multi-Account Support**: Connect multiple IMAP/SMTP email accounts
- **Unified Inbox**: Manage all your emails from one interface
- **Smart Parsing**: AI-powered email content analysis
- **Secure Credentials**: Encrypted storage of email account information

### 📊 Analytics & Insights

- **Interactive Dashboards**: Real-time project metrics and visualizations
- **Performance Tracking**: Team productivity and project health monitoring
- **AI-Driven Analytics**: Intelligent insights into project patterns and bottlenecks
- **Custom Reports**: Generate detailed project and team performance reports

### 🏢 Enterprise-Ready

- **Multi-Tenant Architecture**: Complete company-level data isolation
- **Role-Based Access Control**: Owner, Admin, and Member permissions
- **Security Audit Logs**: Comprehensive tracking and monitoring
- **Scalable Infrastructure**: Built to handle growing teams and workloads

## 🛠️ Technology Stack

### Frontend

- **Next.js 15.4.4** with App Router
- **React 19.1.0** with Server Components
- **TypeScript 5** for type safety
- **Tailwind CSS 4.1.12** for styling
- **Radix UI** for accessible components
- **React Hook Form + Zod** for form validation

### Backend

- **Next.js API Routes** and **Server Actions**
- **PostgreSQL** with **pgvector** extension
- **Prisma ORM 6.15.0** for database management
- **Redis 5.8.0** for caching and sessions
- **NextAuth 5.0.0-beta.29** for authentication

### AI & Machine Learning

- **OpenAI GPT-4o-mini** for chat completions
- **OpenAI text-embedding-3-small** for vector embeddings
- **Model Context Protocol (MCP)** for AI agent orchestration
- **RAG (Retrieval-Augmented Generation)** for intelligent responses
- **Tesseract.js** for OCR capabilities

### Email Integration

- **node-imap** for IMAP connections
- **nodemailer** for SMTP sending
- **mailparser** for email parsing
- **Resend** for transactional emails

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+**
- **PostgreSQL** with pgvector extension
- **Redis** server
- **OpenAI API key**
- **Resend API key** (for emails)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/taskhq.xmation.ai.git
   cd taskhq.xmation.ai
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Configure the following variables:

   ```env
   DATABASE_URL="postgresql://..."
   REDIS_URL="redis://..."
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   OPENAI_API_KEY="your-openai-key"
   RESEND_API_KEY="your-resend-key"
   ```

4. **Set up the database**

   ```bash
   # Enable pgvector extension in PostgreSQL
   # Run this in your PostgreSQL console:
   # CREATE EXTENSION IF NOT EXISTS vector;

   # Run migrations
   pnpm prisma migrate dev

   # Generate Prisma client
   pnpm prisma generate
   ```

5. **Start the development server**

   ```bash
   pnpm dev
   ```

   The application will be available at `http://localhost:3000`

## 📖 Project Structure

```
├── actions/              # Server-side business logic
│   ├── dashboard/        # Dashboard data actions
│   ├── mail/            # Email integration actions
│   ├── tasks/           # Task management actions
│   └── users/           # User management actions
├── app/                 # Next.js App Router
│   ├── (app)/[cid]/    # Multi-tenant app routes
│   ├── api/            # API endpoints
│   └── auth/           # Authentication pages
├── components/          # Reusable UI components
│   ├── ai/             # AI-related components
│   ├── dashboard/      # Dashboard components
│   ├── mail/           # Email components
│   └── ui/             # Base UI components
├── lib/                # Shared utilities
│   ├── ai/             # AI services and utilities
│   ├── monitoring/     # Performance monitoring
│   └── security/       # Security utilities
├── prisma/             # Database schema and migrations
├── tests/              # Test suites
└── roadmap/            # Implementation documentation
```

## 🔧 Development

### Available Scripts

```bash
# Development with Turbopack
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint

# Database operations
pnpm prisma migrate dev    # Run migrations
pnpm prisma generate       # Generate client
pnpm prisma studio         # Open database browser
```

### Build Requirements

⚠️ **Important**: The build process requires significant memory:

```bash
NODE_OPTIONS='--max-old-space-size=8192' pnpm build
```

This allocates 8GB of heap memory for the build process due to the complex AI and vector processing capabilities.

## 🧪 Testing

The project includes comprehensive integration tests:

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test tests/integration/ai-system.test.ts
pnpm test tests/integration/board-wizard.test.ts
```

## 🔌 MCP Integration

TaskHQ exposes a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) API that lets external AI agents, Claude Code, and automation tools manage tasks and boards programmatically. Any MCP-compatible client can connect to create tasks, run semantic search, analyze project health, and more — without touching the UI.

### Authentication

Generate an API token in **Settings > Account** inside TaskHQ, then include it in every request:

```
Authorization: Bearer thq_<your-token>
```

`X-API-Key: thq_<your-token>` is also accepted as an alternative header.

### Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/mcp/mcp` | System tools + all tools (single entry point) |
| `/api/mcp/tasks/mcp` | Task CRUD, search, move |
| `/api/mcp/boards/mcp` | Board CRUD, sections, analytics |
| `/api/mcp/search/mcp` | Semantic & hybrid vector search |
| `/api/mcp/analytics/mcp` | Project health & team analytics |

All endpoints accept `POST` with a JSON body following the MCP `tools/call` spec:

```json
{
  "method": "tools/call",
  "params": {
    "name": "<tool_name>",
    "arguments": { }
  }
}
```

### Available Tools (27 total)

**System** — `health_check`, `server_info`

**Tasks** — `create_task`, `get_task`, `update_task`, `delete_task`, `search_tasks`, `mark_task_done`, `move_task`

**Boards** — `list_boards`, `create_board`, `edit_board`, `delete_board`, `get_board_info`, `list_board_sections`, `create_board_section`, `delete_board_section`, `compare_boards`, `suggest_board_optimizations`

**Search** — `semantic_search_tasks`, `hybrid_search`, `find_similar_tasks`, `search_boards`, `get_embedding_status`, `vector_search_health`

**Analytics** — `analyze_project_health`, `analyze_team_performance`

### Quick Start

```bash
export BASE="https://taskhq.xmation.ai"
export TOKEN="thq_your-token-here"

# Health check
curl -X POST "$BASE/api/mcp/mcp" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"health_check","arguments":{}}}'

# List boards
curl -X POST "$BASE/api/mcp/boards/mcp" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"list_boards","arguments":{}}}'

# Create a task
curl -X POST "$BASE/api/mcp/tasks/mcp" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"create_task","arguments":{"title":"Fix login bug","boardSectionId":"<section-id>","priority":"HIGH"}}}'

# Semantic search
curl -X POST "$BASE/api/mcp/search/mcp" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"semantic_search_tasks","arguments":{"query":"authentication and login issues","threshold":0.6,"limit":5}}}'
```

### Using with Claude Code

Add TaskHQ as an MCP server in your Claude Code configuration (`~/.claude/claude_code_config.json` or via `claude mcp add`):

```json
{
  "mcpServers": {
    "taskhq": {
      "type": "http",
      "url": "https://taskhq.xmation.ai/api/mcp/mcp",
      "headers": {
        "Authorization": "Bearer thq_your-token-here"
      }
    }
  }
}
```

Once connected, Claude Code can list boards, create and update tasks, run semantic search, and analyze project health directly from your editor.

### Full Documentation

See [`public/SKILL.md`](./public/SKILL.md) for complete parameter documentation, response schemas, and additional workflow examples.

---

## 🚀 Deployment

### Environment Setup

Ensure the following services are configured:

1. **PostgreSQL** with pgvector extension
2. **Redis** for caching
3. **OpenAI API** access
4. **Resend** for email services
5. **IMAP/SMTP** credentials for email integration

### Vercel Deployment (Recommended)

1. Connect your repository to Vercel
2. Configure environment variables
3. Set build command: `NODE_OPTIONS='--max-old-space-size=8192' pnpm prisma generate && next build`
4. Deploy

## 🔐 Security Features

- **Multi-tenant data isolation** at the database level
- **Encrypted credential storage** for email accounts
- **Security audit logging** for all actions
- **Rate limiting** on AI endpoints
- **Input validation** with Zod schemas
- **CSRF protection** via NextAuth

## 📈 Performance

- **Vector similarity search** with pgvector indexing
- **Redis caching** for frequently accessed data
- **Streaming AI responses** for better UX
- **Optimized database queries** with Prisma
- **Turbopack** for fast development builds

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- 📧 Email: support@xmation.ai
- 📖 Documentation: [Coming Soon]
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/taskhq.xmation.ai/issues)

## 🎯 Roadmap

See our [roadmap directory](./roadmap/) for detailed implementation plans and upcoming features:

- Enhanced AI capabilities with specialized agents
- Advanced document processing workflows
- Real-time collaboration features
- Mobile application development
- Third-party integrations (Slack, Teams, etc.)

---

**Built with ❤️ by the Xmation.ai team**
