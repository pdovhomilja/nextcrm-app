"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

const MCP_CONFIG = `{
  "mcpServers": {
    "nextcrm": {
      "url": "https://YOUR_NEXTCRM_URL/api/mcp/sse",
      "headers": { "Authorization": "Bearer YOUR_API_TOKEN" }
    }
  }
}`;

export function SkillMdCopyButton() {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(MCP_CONFIG);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
    >
      {copied ? (
        <Check className="h-4 w-4" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      {copied ? "Copied!" : "Copy MCP Config"}
    </button>
  );
}
