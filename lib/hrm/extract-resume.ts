import { completeChat } from "@/lib/llm/chat-completion";
import { parseResumeJson, profileFromPlainText, type ResumeProfile } from "@/lib/hrm/resume-profile";

export async function readPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return (result?.text ?? "").replace(/\u0000/g, "").trim();
  } finally {
    await parser.destroy?.();
  }
}

export async function extractResumeProfile(buffer: Buffer, userId?: string): Promise<{
  text: string;
  profile: ResumeProfile;
  method: "pdf-text+llm" | "pdf-text";
}> {
  const text = await readPdfText(buffer);
  if (text.length < 40) {
    throw new Error(
      "This PDF has almost no selectable text. Export it from Word or a digital resume so the text can be read. A photo-only scan cannot be extracted yet."
    );
  }

  try {
    const result = await completeChat({
      task: "quick-copy",
      userId,
      temperature: 0,
      timeoutMs: 45_000,
      messages: [
        {
          role: "system",
          content:
            "Extract a resume into JSON only. Use null for unknown strings and [] for unknown lists. Do not invent employers, degrees, or dates. Keys: fullName, email, phone, location, headline, summary, skills (string[]), experience ({company,title,dates}[]), education ({school,degree,dates}[]).",
        },
        { role: "user", content: text.slice(0, 14000) },
      ],
    });
    const profile = parseResumeJson(result.content);
    if (profile) return { text, profile, method: "pdf-text+llm" };
  } catch (error) {
    console.warn("[hrm] resume LLM extract failed", error);
  }

  return { text, profile: profileFromPlainText(text), method: "pdf-text" };
}
