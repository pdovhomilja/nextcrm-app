import { getApiKey } from "@/lib/api-keys";
import { envSecret } from "@/lib/env-secret";
import { providerChainForTask } from "@/lib/llm/chains";
import { modelForTask } from "@/lib/llm/models";
import { geminiModelsToTry } from "@/lib/llm/gemini-models";
import { groqModelsToTry } from "@/lib/llm/groq-models";
import { openRouterModelsToTry } from "@/lib/llm/openrouter-free-models";
import type { LlmProviderId, LlmTask } from "@/lib/llm/tasks";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenAiStyleResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
};

async function readAssistantText(response: Response): Promise<string> {
  const data = (await response.json()) as OpenAiStyleResponse & {
    message?: string;
  };
  if (!response.ok) {
    const detail =
      data.error?.message ??
      (typeof data.message === "string" ? data.message : undefined) ??
      `${response.status} ${response.statusText}`;
    throw new Error(detail);
  }
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty model response");
  return text;
}

async function callOpenAiCompatible(params: {
  url: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature: number;
  signal: AbortSignal;
  extraHeaders?: Record<string, string>;
}): Promise<string> {
  const response = await fetch(params.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
      ...params.extraHeaders,
    },
    signal: params.signal,
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
    }),
  });
  return readAssistantText(response);
}

function openRouterHeaders(): Record<string, string> {
  const referer =
    envSecret("OPENROUTER_SITE_URL") ??
    process.env.NEXT_PUBLIC_APP_URL?.trim() ??
    "https://crm.vensailabs.in";
  const title = envSecret("OPENROUTER_APP_NAME") ?? "VenSai CRM";
  return { "HTTP-Referer": referer, "X-Title": title };
}

async function resolveProviderKey(
  provider: LlmProviderId,
  userId?: string
): Promise<string | null> {
  switch (provider) {
    case "openrouter":
      return envSecret("OPENROUTER_API_KEY") ?? envSecret("OPENROUTER_KEY") ?? null;
    case "gemini":
      return envSecret("GEMINI_API_KEY") ?? envSecret("GOOGLE_GENERATIVE_AI_API_KEY") ?? null;
    case "groq":
      return (await getApiKey("GROQ", userId)) ?? null;
    case "openai":
      return (await getApiKey("OPENAI", userId)) ?? null;
    default:
      return null;
  }
}

function isRetryableModelError(message: string): boolean {
  return /429|402|404|400|rate|quota|capacity|unavailable|not found|no endpoints|does not exist|do not have access|invalid model/i.test(
    message
  );
}

async function tryModelsInOrder(params: {
  models: string[];
  call: (model: string) => Promise<string>;
}): Promise<{ text: string; model: string }> {
  let lastError: Error | null = null;
  for (const m of params.models) {
    try {
      const text = await params.call(m);
      return { text, model: m };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (!isRetryableModelError(lastError.message) || params.models.length === 1) {
        throw lastError;
      }
    }
  }
  throw lastError ?? new Error("All models failed");
}

async function invokeProvider(
  provider: LlmProviderId,
  task: LlmTask,
  apiKey: string,
  messages: ChatMessage[],
  temperature: number,
  signal: AbortSignal,
  modelOverride?: string
): Promise<{ content: string; modelUsed: string }> {
  const model = modelOverride ?? modelForTask(provider, task);
  switch (provider) {
    case "openrouter": {
      const models = modelOverride ? [modelOverride] : openRouterModelsToTry();
      const { text, model: modelUsed } = await tryModelsInOrder({
        models,
        call: (m) =>
          callOpenAiCompatible({
            url: "https://openrouter.ai/api/v1/chat/completions",
            apiKey,
            model: m,
            messages,
            temperature,
            signal,
            extraHeaders: openRouterHeaders(),
          }),
      });
      return { content: text, modelUsed };
    }
    case "groq": {
      const models = modelOverride ? [modelOverride] : groqModelsToTry();
      const { text, model: modelUsed } = await tryModelsInOrder({
        models,
        call: (m) =>
          callOpenAiCompatible({
            url: "https://api.groq.com/openai/v1/chat/completions",
            apiKey,
            model: m,
            messages,
            temperature,
            signal,
          }),
      });
      return { content: text, modelUsed };
    }
    case "openai": {
      const text = await callOpenAiCompatible({
        url: "https://api.openai.com/v1/chat/completions",
        apiKey,
        model,
        messages,
        temperature,
        signal,
      });
      return { content: text, modelUsed: model };
    }
    case "gemini": {
      const models = modelOverride ? [modelOverride] : geminiModelsToTry();
      const { text, model: modelUsed } = await tryModelsInOrder({
        models,
        call: (m) =>
          callOpenAiCompatible({
            url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
            apiKey,
            model: m,
            messages,
            temperature,
            signal,
          }),
      });
      return { content: text, modelUsed };
    }
    default: {
      const _exhaustive: never = provider;
      throw new Error(`Unknown provider: ${_exhaustive}`);
    }
  }
}

export type CompleteChatResult = {
  content: string;
  provider: LlmProviderId;
  model: string;
};

/**
 * Runs the task provider chain until one succeeds (fast free tiers first).
 */
export async function completeChat(options: {
  task: LlmTask;
  userId?: string;
  messages: ChatMessage[];
  temperature?: number;
  timeoutMs?: number;
  /** Force a single provider (e.g. Gemini polish step). */
  providersOverride?: LlmProviderId[];
}): Promise<CompleteChatResult> {
  const { task, userId, messages, temperature = 0.7, timeoutMs = 30_000, providersOverride } =
    options;
  const chain = providersOverride ?? providerChainForTask(task);
  const errors: string[] = [];

  for (const provider of chain) {
    const apiKey = await resolveProviderKey(provider, userId);
    if (!apiKey) continue;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const { content, modelUsed } = await invokeProvider(
        provider,
        task,
        apiKey,
        messages,
        temperature,
        controller.signal
      );
      return { content, provider, model: modelUsed };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${provider}: ${msg}`);
      console.warn(`[llm] ${provider} failed for task ${task}:`, msg);
    } finally {
      clearTimeout(timeout);
    }
  }

  const attempts = errors.length ? errors.join(" | ") : "";
  throw new Error(
    attempts
      ? `No LLM available for ${task}. Attempts: ${attempts}`
      : `No LLM available for ${task}. Set OPENROUTER_API_KEY, GROQ_API_KEY, GEMINI_API_KEY, or OPENAI (env or Profile → LLMs), then redeploy.`
  );
}

/** Optional second pass: polish JSON email output with OpenAI when a free model drafted it. */
export async function refineCampaignEmailJson(options: {
  userId?: string;
  draftJson: string;
  userPrompt: string;
  force?: boolean;
}): Promise<string | null> {
  if (!options.force && process.env.LLM_CAMPAIGN_EMAIL_REFINE !== "1") return null;
  const openaiKey = await resolveProviderKey("openai", options.userId);
  if (!openaiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const { content } = await invokeProvider(
      "openai",
      "campaign-email",
      openaiKey,
      [
        {
          role: "system",
          content:
            "Polish this marketing email JSON. Keep merge tags {{first_name}}, {{last_name}}, {{email}}, {{company}}, {{position}}. Return ONLY valid JSON: {\"subject\":\"...\",\"html\":\"...\"}",
        },
        {
          role: "user",
          content: `Brief: ${options.userPrompt}\n\nDraft:\n${options.draftJson}`,
        },
      ],
      0.4,
      controller.signal
    );
    return content;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
