import db from "@/lib/db";
import { generateObject } from "ai";
import { aiConfig } from "./config";
import { z } from "zod";

export interface ConversationContext {
  userId: string;
  companyId: string;
  boardId?: string;
  taskId?: string;
  sessionId?: string;
}

export interface UserPreferences {
  communicationStyle: "formal" | "casual" | "concise" | "detailed";
  focusAreas: string[];
  notificationPreferences: {
    suggestions: boolean;
    insights: boolean;
    reminders: boolean;
  };
  workingHours: {
    start: string;
    end: string;
    timezone: string;
  };
  expertiseLevel: "beginner" | "intermediate" | "advanced" | "expert";
}

export interface ConversationSummary {
  id: string;
  userId: string;
  summary: string;
  keyTopics: string[];
  actionItems: string[];
  preferences: Partial<UserPreferences>;
  sentiment: "positive" | "neutral" | "negative";
  confidence: number;
  createdAt: Date;
}

export class ConversationMemoryService {
  /**
   * Store conversation message with context
   */
  async storeMessage(
    message: {
      role: "user" | "assistant" | "system";
      content: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata?: Record<string, any>;
    },
    context: ConversationContext
  ): Promise<string> {
    try {
      const conversation = await this.getOrCreateConversation(context);

      const storedMessage = await db.aIMessage.create({
        data: {
          conversationId: conversation.id,
          role: message.role,
          content: message.content,
          metadata: message.metadata || {},
        },
      });

      // Update conversation summary periodically
      const messageCount = await db.aIMessage.count({
        where: { conversationId: conversation.id },
      });

      if (messageCount % 10 === 0) {
        await this.updateConversationSummary(conversation.id);
      }

      return storedMessage.id;
    } catch (error) {
      console.error("Error storing conversation message:", error);
      throw error;
    }
  }

  /**
   * Get or create conversation
   */
  private async getOrCreateConversation(context: ConversationContext) {
    const sessionId = context.sessionId || `session-${Date.now()}`;

    let conversation = await db.aIConversation.findFirst({
      where: {
        userId: context.userId,
        title: sessionId,
      },
    });

    if (!conversation) {
      conversation = await db.aIConversation.create({
        data: {
          userId: context.userId,
          companyId: context.companyId,
          title: sessionId,
          context: {
            boardId: context.boardId,
            taskId: context.taskId,
            sessionId,
          },
        },
      });
    }

    return conversation;
  }

  /**
   * Update conversation summary with AI analysis
   */
  private async updateConversationSummary(
    conversationId: string
  ): Promise<void> {
    try {
      const messages = await db.aIMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: "desc" },
        take: 20, // Last 20 messages
      });

      if (messages.length === 0) return;

      const conversationText = messages
        .reverse()
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");

      const summary = await generateObject({
        model: aiConfig.structuredOutputModel,
        system: `Analyze this conversation and extract:
1. Key topics discussed
2. Action items or decisions made
3. User preferences and communication style
4. Overall sentiment
5. A brief summary`,
        prompt: `Analyze this conversation:

${conversationText}

Focus on project management context and user behavior patterns.`,
        schema: z.object({
          summary: z.string(),
          keyTopics: z.array(z.string()).max(5),
          actionItems: z.array(z.string()).max(3),
          communicationStyle: z.enum([
            "formal",
            "casual",
            "concise",
            "detailed",
          ]),
          sentiment: z.enum(["positive", "neutral", "negative"]),
          confidence: z.number().min(0).max(1),
          focusAreas: z.array(z.string()).max(3),
        }),
        temperature: 0.4,
      });

      // Store summary
      await db.conversationSummary.upsert({
        where: { conversationId },
        create: {
          conversationId,
          summary: summary.object.summary,
          keyTopics: summary.object.keyTopics,
          actionItems: summary.object.actionItems,
          preferences: {
            communicationStyle: summary.object.communicationStyle,
            focusAreas: summary.object.focusAreas,
          },
          sentiment: summary.object.sentiment,
          confidence: summary.object.confidence,
        },
        update: {
          summary: summary.object.summary,
          keyTopics: summary.object.keyTopics,
          actionItems: summary.object.actionItems,
          preferences: {
            communicationStyle: summary.object.communicationStyle,
            focusAreas: summary.object.focusAreas,
          },
          sentiment: summary.object.sentiment,
          confidence: summary.object.confidence,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error updating conversation summary:", error);
    }
  }

  /**
   * Get user preferences from conversation history
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const summaries = await db.conversationSummary.findMany({
        where: {
          conversation: {
            userId,
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      if (summaries.length === 0) {
        return this.getDefaultPreferences();
      }

      // Aggregate preferences from recent conversations
      const communicationStyles = summaries
        .map((s) => {
          const prefs = s.preferences as { communicationStyle?: string } | null;
          return prefs?.communicationStyle;
        })
        .filter(Boolean) as string[];

      const focusAreas = summaries
        .flatMap((s) => {
          const prefs = s.preferences as { focusAreas?: string[] } | null;
          return prefs?.focusAreas || [];
        })
        .filter(Boolean);

      const mostCommonStyle =
        this.getMostFrequent(communicationStyles) || "casual";
      const topFocusAreas = this.getTopItems(focusAreas, 3);

      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        communicationStyle: mostCommonStyle as any,
        focusAreas: topFocusAreas,
        notificationPreferences: {
          suggestions: true,
          insights: true,
          reminders: true,
        },
        workingHours: {
          start: "09:00",
          end: "17:00",
          timezone: "UTC",
        },
        expertiseLevel: "intermediate",
      };
    } catch (error) {
      console.error("Error getting user preferences:", error);
      return this.getDefaultPreferences();
    }
  }

  /**
   * Get conversation context for better responses
   */
  async getConversationContext(
    userId: string,
    sessionId?: string
  ): Promise<{
    recentTopics: string[];
    actionItems: string[];
    preferences: UserPreferences;
    conversationHistory: Array<{
      role: string;
      content: string;
      timestamp: Date;
    }>;
  }> {
    try {
      // Get recent conversation
      const conversation = await db.aIConversation.findFirst({
        where: {
          userId,
          title: sessionId || { contains: "session-" },
        },
        orderBy: { createdAt: "desc" },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      });

      const summary = conversation
        ? await db.conversationSummary.findUnique({
            where: { conversationId: conversation.id },
          })
        : null;

      const preferences = await this.getUserPreferences(userId);

      return {
        recentTopics: summary?.keyTopics || [],
        actionItems: summary?.actionItems || [],
        preferences,
        conversationHistory:
          conversation?.messages.reverse().map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: m.createdAt,
          })) || [],
      };
    } catch (error) {
      console.error("Error getting conversation context:", error);
      return {
        recentTopics: [],
        actionItems: [],
        preferences: this.getDefaultPreferences(),
        conversationHistory: [],
      };
    }
  }

  /**
   * Personalize response based on user preferences
   */
  personalizeResponse(response: string, preferences: UserPreferences): string {
    switch (preferences.communicationStyle) {
      case "formal":
        return response
          .replace(/hey/gi, "Hello")
          .replace(/\bthat's\b/gi, "that is")
          .replace(/\bcan't\b/gi, "cannot");

      case "concise":
        return (
          response.split(". ").slice(0, 3).join(". ") +
          (response.includes(". ") ? "." : "")
        );

      case "detailed":
        return (
          response +
          "\n\nWould you like me to elaborate on any of these points?"
        );

      default:
        return response;
    }
  }

  /**
   * Helper methods
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      communicationStyle: "casual",
      focusAreas: ["task_management", "productivity"],
      notificationPreferences: {
        suggestions: true,
        insights: true,
        reminders: true,
      },
      workingHours: {
        start: "09:00",
        end: "17:00",
        timezone: "UTC",
      },
      expertiseLevel: "intermediate",
    };
  }

  private getMostFrequent<T>(items: T[]): T | null {
    if (items.length === 0) return null;

    const counts = items.reduce(
      (acc, item) => {
        acc[item as string] = (acc[item as string] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(counts).reduce((a, b) =>
      counts[a[0]] > counts[b[0]] ? a : b
    )[0] as T;
  }

  private getTopItems(items: string[], count: number): string[] {
    const counts = items.reduce(
      (acc, item) => {
        acc[item] = (acc[item] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, count)
      .map(([item]) => item);
  }
}

export const conversationMemory = new ConversationMemoryService();
