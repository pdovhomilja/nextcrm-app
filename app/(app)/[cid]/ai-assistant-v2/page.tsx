"use client";

import React, { useEffect, useRef } from "react";
import { SidebarInset } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/site-header";
import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import { DefaultChatTransport } from "ai";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import {
  Send,
  Bot,
  Sparkles,
  Loader2,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCompanyAccess } from "@/lib/hooks/use-company-access";

interface AssistantToolResult {
  name: string;
  similarity: number;
  boardId: string;
  taskId: string;
}

interface UITextPart {
  type: "text";
  text: string;
}

interface UIGetInformationToolPart {
  type: "tool-getInformation";
  state: string;
  input: { question: string };
  output?: AssistantToolResult[];
}

interface UIGenericToolPart {
  type: `tool-${string}`;
  state: string;
  input?: unknown;
  output?: unknown;
}

type ToolPart = UIGetInformationToolPart | UIGenericToolPart;

function isToolPart(part: {
  type?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
}): part is ToolPart {
  return typeof part.type === "string" && part.type.startsWith("tool-");
}

function isGetInformationToolPart(
  part: ToolPart
): part is UIGetInformationToolPart {
  return part.type === "tool-getInformation";
}

function isTextPart(part: unknown): part is UITextPart {
  return (
    !!part &&
    typeof (part as { type?: unknown }).type === "string" &&
    (part as { type: string }).type === "text" &&
    typeof (part as { text?: unknown }).text === "string"
  );
}

function hasArrayOutput(
  part: ToolPart
): part is
  | UIGetInformationToolPart
  | (UIGenericToolPart & { output: unknown[] }) {
  return Array.isArray(part.output);
}

interface AIAssistantV2PageProps {
  params: Promise<{ cid: string }>;
}

const AIAssistantV2Page = ({ params }: AIAssistantV2PageProps) => {
  const [cid, setCid] = React.useState<string | null>(null);
  
  // Resolve params since they're async in Next.js 15
  React.useEffect(() => {
    params.then((resolvedParams) => {
      setCid(resolvedParams.cid);
    });
  }, [params]);
  const { data: session } = useSession();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Company access validation
  const { 
    isAuthorized, 
    isLoading: isValidatingAccess, 
    error: accessError 
  } = useCompanyAccess(cid || '', 'ai_query', undefined, 'search');

  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/ai/chat-v2",
      credentials: "include",
      headers: { "Custom-Header": "value" },
    }),
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check if AI is generating a response
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === "assistant") {
      // Check if message has any tool calls that are still in progress
      const hasActiveToolCalls = lastMessage.parts.some(
        (part) => isToolPart(part) && part.state !== "output-available"
      );
      // If message just appeared or has active tool calls, show loading
      if (hasActiveToolCalls) {
        setIsLoading(true);
      } else {
        setIsLoading(false);
      }
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      setIsLoading(true);
      try {
        await sendMessage({ text: input });
        setInput("");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const formatTime = (date?: Date) => {
    const d = date || new Date();
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const renderToolCall = (part: ToolPart) => {
    const isInProgress = part.state !== "output-available";
    const toolName = part.type.replace("tool-", "");

    // console.log("Part", part);
    // console.log("Session", session);

    return (
      <Card
        className={cn(
          "mt-2 p-3 border",
          isInProgress
            ? "border-blue-200 bg-blue-50/50 dark:bg-blue-950/20"
            : "border-green-200 bg-green-50/50 dark:bg-green-950/20"
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          {isInProgress ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          )}
          <Badge
            variant={isInProgress ? "secondary" : "outline"}
            className="text-xs"
          >
            {isInProgress ? "Processing" : "Completed"}
          </Badge>
          <span className="text-xs text-muted-foreground font-medium">
            {toolName}
          </span>
        </div>
        <pre className="text-xs bg-white/50 dark:bg-black/20 p-2 rounded-md overflow-x-auto">
          <code>{JSON.stringify(part.input, null, 2)}</code>
        </pre>
        {hasArrayOutput(part) && (
          <div className="mt-2 pt-2 border-t">
            <span className="text-xs text-muted-foreground">My advice:</span>
            {isGetInformationToolPart(part) ? (
              part.output?.map(
                (message: AssistantToolResult, index: number) => (
                  <div
                    className="text-xs bg-white/50 dark:bg-black/20 p-2 rounded-md mt-1 overflow-x-auto"
                    key={index}
                  >
                    <div className="text-xs text-muted-foreground">
                      {message.name}
                    </div>
                    <div className="flex flex-row gap-1 py-2">
                      <Button variant="default" className="text-xs">
                        <Link
                          href={`/${session?.user?.activeCompanyId}/tasks/${message.boardId}`}
                        >
                          Go to board detail
                        </Link>
                      </Button>
                      <Button variant="default" className="text-xs">
                        <Link
                          href={`/${session?.user?.activeCompanyId}/tasks-list/${message.taskId}`}
                        >
                          Go to task detail
                        </Link>
                      </Button>
                    </div>
                  </div>
                )
              )
            ) : (
              <pre className="text-xs bg-white/50 dark:bg-black/20 p-2 rounded-md mt-1 overflow-x-auto">
                <code>{JSON.stringify(part.output, null, 2)}</code>
              </pre>
            )}
          </div>
        )}
      </Card>
    );
  };

  // Handle params loading
  if (!cid) {
    return (
      <SidebarInset>
        <SiteHeader title="AI Assistant">
          <div />
        </SiteHeader>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </SidebarInset>
    );
  }

  // Handle access validation loading
  if (isValidatingAccess) {
    return (
      <SidebarInset>
        <SiteHeader title="AI Assistant">
          <div />
        </SiteHeader>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Validating access...</p>
          </div>
        </div>
      </SidebarInset>
    );
  }

  // Handle access denied
  if (!isAuthorized) {
    return (
      <SidebarInset>
        <SiteHeader title="AI Assistant">
          <div />
        </SiteHeader>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              {accessError || 'You do not have permission to access the AI assistant for this company.'}
            </p>
            <Button
              onClick={() => window.history.back()}
              className="mr-2"
            >
              Go Back
            </Button>
          </div>
        </div>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset>
      <SiteHeader title="AI Assistant">
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            className="text-xs"
            onClick={() => {
              window.location.reload();
            }}
          >
            Restart conversation
          </Button>
          <Badge variant="outline" className="gap-1.5">
            <Sparkles className="h-3 w-3" />
            Enhanced v2
          </Badge>
        </div>
      </SiteHeader>

      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Welcome Message */}
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
                  <Bot className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">AI Assistant v2</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  I&apos;m here to help you with your tasks and questions. Start
                  a conversation below!
                </p>
                <div className="text-xs font-bold flex flex-col gap-2 mt-4">
                  Chat templates:
                  <div className="flex flex-row gap-2">
                    <Button
                      variant="default"
                      className="text-xs max-w-3/6"
                      onClick={() => {
                        sendMessage({ text: "What can I do today?" });
                      }}
                    >
                      What can I do today?
                    </Button>
                    <Button
                      variant="default"
                      className="text-xs max-w-3/6"
                      onClick={() => {
                        sendMessage({ text: "What are most critical tasks?" });
                      }}
                    >
                      What are most critical tasks?
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {message.role === "assistant" && (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={cn(
                    "flex flex-col gap-1 max-w-[75%]",
                    message.role === "user" && "items-end"
                  )}
                >
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2.5 shadow-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {message.parts.map((part, partIndex) => (
                      <div key={partIndex}>
                        {isTextPart(part) && (
                          <p className="text-xs p-2 whitespace-pre-wrap leading-relaxed">
                            {part.text}
                          </p>
                        )}
                        {isToolPart(part) && renderToolCall(part)}
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground px-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime()}
                  </span>
                </div>

                {message.role === "user" && (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {session?.user?.image ? (
                        <AvatarImage
                          src={session?.user?.image || ""}
                          alt={session?.user?.name || ""}
                        />
                      ) : (
                        <AvatarFallback className="rounded-lg text-xs bg-primary text-primary-foreground">
                          {session?.user?.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      AI is thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder="Type your message... (Shift+Enter for new line)"
                  className="min-h-[52px] max-h-[200px] resize-none pr-12 rounded-xl"
                  disabled={isLoading}
                />
                <div className="absolute bottom-2 right-2 flex items-center gap-1">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!input.trim() || isLoading}
                    className="h-8 w-8 p-0 rounded-lg"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 px-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI-Powered
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                Press Enter to send, Shift+Enter for new line
              </span>
            </div>
          </form>
        </div>
      </div>
    </SidebarInset>
  );
};

export default AIAssistantV2Page;
