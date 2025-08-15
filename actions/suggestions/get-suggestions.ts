"use server";

import { auth } from "@/auth";
import { getUserByEmail } from "../user";

export async function getSuggestions() {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error("User session or email not found");
  }

  const user = await getUserByEmail(session.user.email);
  if (!user?.id) {
    throw new Error("User not found");
  }

  const suggestions = await fetch("http://localhost:3000/api/ai/suggest", {
    method: "POST",
    body: JSON.stringify({
      suggestionType: "general",
    }),
  });

  return suggestions;
}
