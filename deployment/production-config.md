# Production Deployment Configuration

## Environment Setup

### Required Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/taskhq_prod"
DIRECT_URL="postgresql://user:pass@host:5432/taskhq_prod"

# Authentication
AUTH_SECRET="production-secret-key"
NEXTAUTH_URL="https://taskhq.xmation.ai"

# AI Configuration
OPENAI_API_KEY="sk-prod-..."
AI_MODEL="gpt-4-turbo"
EMBEDDING_MODEL="text-embedding-ada-002"
EMBEDDING_DIMENSIONS="1536"

# MCP Configuration
REDIS_URL="redis://user:pass@host:6379"
MCP_SSE_ENABLED="true"
MCP_VERBOSE_LOGS="false"
MCP_MAX_DURATION="800"

# Vector Database
PGVECTOR_ENABLED="true"
SIMILARITY_THRESHOLD="0.7"

# Feature Flags
AI_FEATURES_ENABLED="true"
AI_SUGGESTIONS_ENABLED="true"
AI_ANALYTICS_ENABLED="true"
AI_STREAMING_ENABLED="true"
MCP_TOOLS_ENABLED="true"

# Rate Limiting
AI_RATE_LIMIT_REQUESTS="100"
AI_RATE_LIMIT_WINDOW="3600"

# Monitoring
NEXT_PUBLIC_APP_URL="https://taskhq.xmation.ai"
SENTRY_DSN="https://..."
VERCEL_ANALYTICS_ID="..."

# Security
CORS_ORIGINS="https://taskhq.xmation.ai"
ALLOWED_HOSTS="taskhq.xmation.ai"
```

### Vercel Configuration

```json
{
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "framework": "nextjs",
  "functions": {
    "app/api/ai/**/*.ts": {
      "maxDuration": 30
    },
    "app/api/mcp/**/*.ts": {
      "maxDuration": 60
    }
  },
  "env": {
    "ENABLE_EXPERIMENTAL_FEATURES": "true"
  },
  "rewrites": [
    {
      "source": "/api/health",
      "destination": "/api/health/index"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "https://taskhq.xmation.ai"
        }
      ]
    }
  ]
}
```

### Performance Optimization

```typescript
// next.config.js optimizations
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
    serverComponentsExternalPackages: ["@ai-sdk/openai"],
  },

  // AI-specific optimizations
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Optimize server-side AI libraries
      config.externals = config.externals || [];
      config.externals.push({
        openai: "commonjs openai",
        "@ai-sdk/openai": "commonjs @ai-sdk/openai",
      });
    }
    return config;
  },

  // Image optimization for document processing
  images: {
    domains: ["localhost"],
    formats: ["image/webp", "image/avif"],
  },

  // Headers for AI APIs
  async headers() {
    return [
      {
        source: "/api/ai/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

## Troubleshooting Production Issues

### Common Production Issues:

- **High response times**: Check MCP server health, database performance
- **Rate limit violations**: Review usage patterns, adjust limits if needed
- **Memory leaks**: Monitor conversation history cleanup
- **Cost overruns**: Review usage metrics, implement additional controls
- **Security incidents**: Check audit logs, review access patterns

### Monitoring Commands:

```bash
# Check system health
curl -s https://taskhq.xmation.ai/api/health/ai | jq .

# Monitor MCP servers
curl -s https://taskhq.xmation.ai/api/health/mcp | jq .

# View AI metrics
curl -s https://taskhq.xmation.ai/api/ai/metrics | jq .

# Check security events
curl -s https://taskhq.xmation.ai/api/ai/privacy | jq .
```

This completes the comprehensive RAG implementation plan for TaskHQ. The system now includes advanced AI capabilities, production-ready infrastructure, security controls, and monitoring systems necessary for enterprise deployment.
