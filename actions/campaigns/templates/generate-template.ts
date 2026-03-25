"use server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApiKey } from "@/lib/api-keys";

export const generateTemplate = async (
  prompt: string
): Promise<{
  html: string;
  json: object;
  subject: string;
}> => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const apiKey = await getApiKey("OPENAI", session.user.id);
  if (!apiKey)
    throw new Error(
      "No OpenAI API key configured. Add one in Profile → LLMs."
    );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an email copywriter. Generate a professional HTML email body and subject line.
Return ONLY valid JSON in this exact format: {"subject":"...", "html":"..."}
The HTML should be clean, inline-styled, suitable for email clients.
Use merge tags {{first_name}}, {{last_name}}, {{email}}, {{company}}, {{position}} where appropriate.`,
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) throw new Error(`OpenAI error: ${response.statusText}`);

    const data = await response.json();
    const content = data.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as { subject: string; html: string };

    return {
      subject: parsed.subject ?? "",
      html: parsed.html ?? "",
      json: {}, // TipTap will parse the HTML on load via setContent
    };
  } finally {
    clearTimeout(timeout);
  }
};
