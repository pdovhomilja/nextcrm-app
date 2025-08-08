"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
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
  ChevronDown,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

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

  const welcomeMessage = useMemo(
    () =>
      `Hello! I'm your AI project management assistant. I can help you with:

🔍 Project Analysis — Health checks, bottleneck identification
📋 Task Recommendations — Prioritization and assignment suggestions
📊 Progress Tracking — Milestone monitoring and forecasts
⚡ Resource Optimization — Workload balancing and efficiency

${boardId ? `I can see you're working on a specific board. ` : ""}${
        taskId ? `I notice you have a task selected. ` : ""
      }How can I help you today?`,
    [boardId, taskId]
  );

  // Temporary simplified state management until AI SDK is properly configured
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: welcomeMessage,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Use setTimeout to ensure the DOM has updated before scrolling
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  // Handle scroll detection for scroll-to-bottom button
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
            "I'm here to help with your project management needs.",
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("AI Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const stop = () => {
    setIsLoading(false);
  };

  const clearChat = useCallback(() => {
    // Reset to the initial welcome message
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: welcomeMessage,
      } as Message,
    ]);
    setInput("");
    stop();
  }, [welcomeMessage]);

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

      <CardContent className="flex-1 min-h-0 flex flex-col p-0">
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 p-4 overflow-y-auto overscroll-contain scroll-smooth relative"
        >
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

            {/* Invisible div for auto-scrolling */}
            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom button */}
          {showScrollButton && (
            <Button
              variant="secondary"
              size="sm"
              onClick={scrollToBottom}
              className="absolute bottom-4 right-4 rounded-full w-8 h-8 p-0 shadow-lg"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="border-t p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={handleInputChange}
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
