"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Send,
  Loader2,
  Bot,
  User,
  Settings,
  Minimize2,
} from "lucide-react";

interface AIAssistantProps {
  boardId?: string;
  taskId?: string;
  initialMode?: "chat" | "suggestions" | "analysis";
  className?: string;
}

export function AIAssistant({ boardId, taskId, className }: AIAssistantProps) {
  const [mode, setMode] = useState<"single" | "multi">("single");
  const [agentType, setAgentType] = useState<
    "analyzer" | "recommender" | "tracker" | "optimizer"
  >("recommender");
  const [useRAG, setUseRAG] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
  };

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hello! I'm your AI project management assistant. I can help you with:

🔍 **Project Analysis** - Health checks, bottleneck identification
📋 **Task Recommendations** - Prioritization and assignment suggestions  
📊 **Progress Tracking** - Milestone monitoring and forecasts
⚡ **Resource Optimization** - Workload balancing and efficiency

${boardId ? `I can see you're working on a specific board. ` : ""}${taskId ? `I notice you have a task selected. ` : ""}How can I help you today?`,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          boardId,
          taskId,
          agentType: mode === "single" ? agentType : undefined,
          useRAG,
          multiAgent: mode === "multi",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content:
            data.response ||
            "I apologize, but I could not generate a response.",
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  if (isMinimized) {
    return (
      <Card
        className={`fixed bottom-4 right-4 w-16 h-16 cursor-pointer ${className}`}
      >
        <CardContent className="flex items-center justify-center h-full p-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(false)}
            className="h-full w-full"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`fixed bottom-4 right-4 w-96 h-[600px] flex flex-col shadow-2xl ${className}`}
    >
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="h-5 w-5 text-blue-500" />
            AI Assistant
            {mode === "multi" && <Badge variant="secondary">Multi-Agent</Badge>}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showSettings && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as "single" | "multi")}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="single">Single Agent</option>
                <option value="multi">Multi-Agent</option>
              </select>
            </div>

            {mode === "single" && (
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Agent</label>
                <select
                  value={agentType}
                  onChange={(e) =>
                    setAgentType(e.target.value as typeof agentType)
                  }
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="analyzer">Analyzer</option>
                  <option value="recommender">Recommender</option>
                  <option value="tracker">Tracker</option>
                  <option value="optimizer">Optimizer</option>
                </select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Use Context</label>
              <input
                type="checkbox"
                checked={useRAG}
                onChange={(e) => setUseRAG(e.target.checked)}
                className="rounded"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearChat}
                className="flex-1"
              >
                Clear Chat
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`flex gap-2 max-w-[80%] ${
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {message.role === "user" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={`p-3 rounded-lg ${
                      message.role === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">AI is thinking...</span>
              </div>
            )}
          </div>
        </div>

        <div className="border-t p-4">
          <form onSubmit={onSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your project..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
