// in app/(app)/[cid]/tasks/_components/refinement-chat-interface.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface WizardProps {
  messages: Message[];
  isPending: boolean;
  handleSendMessage: (message: string) => void;
}

export function RefinementChatInterface({ wizard }: { wizard: WizardProps }) {
  const [currentMessage, setCurrentMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [wizard.messages]);

  const handleSend = () => {
    if (currentMessage.trim() && !wizard.isPending) {
      wizard.handleSendMessage(currentMessage);
      setCurrentMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[65vh] min-h-[450px]">
      <ScrollArea className="flex-1 p-4 border rounded-md mb-4 min-h-[350px] max-h-[55vh]">
        <div className="space-y-4">
          {wizard.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-lg shadow-sm ${
                  msg.role === "user"
                    ? "bg-blue-500 text-white ml-2"
                    : "bg-gray-100 text-gray-900 mr-2"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </p>
              </div>
            </div>
          ))}
          {wizard.isPending && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-600 p-3 rounded-lg mr-2 shadow-sm">
                <div className="flex items-center text-sm">
                  <Sparkles className="animate-pulse mr-2 h-4 w-4" />
                  AI is thinking...
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      <div className="flex-shrink-0 pt-2">
        <div className="flex gap-2">
          <Input
            placeholder="Type your reply..."
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={wizard.isPending}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={wizard.isPending || !currentMessage.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
