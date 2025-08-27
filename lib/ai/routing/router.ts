import { generateObject, ModelMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { IntentSchema } from "./schema";
import { aiConfig } from "../config";

const openai = createOpenAI();

export async function classifyAndRouteQuery(
  query: string,
  history: ModelMessage[]
) {
  const systemPrompt = `You are an expert query router. Your job is to analyze the user's query and classify it according to the provided schema. 
    Select the most appropriate toolkits required to answer the query.`;

  // Use a fast model for routing to minimize latency.
  const model = aiConfig.structuredOutputModel || openai("gpt-4o-mini");

  const { object: intent } = await generateObject({
    model: model,
    schema: IntentSchema,
    system: systemPrompt,
    messages: [
      ...history,
      {
        role: "user",
        content: query,
      },
    ],
  });

  return intent;
}
