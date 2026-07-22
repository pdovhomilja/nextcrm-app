"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prismadb } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

const schema = z.object({
  id: z.string(),
  serviceKey: z.string(),
});

// Sets/updates the system-wide Resend API key used for all outbound mail.
//
// SECURITY: this is a Server Action, i.e. a POST endpoint addressed by its
// action id — it is NOT protected by the admin page's layout guard, which only
// runs during render. Without an explicit check here, any client that knows the
// action id could overwrite the outbound-mail credential. `requireRole` resolves
// the caller's role from the database and throws for non-admins.
export async function setResendKey(formData: FormData): Promise<void> {
  await requireRole(["admin"]);

  const parsed = schema.parse({
    id: formData.get("id"),
    serviceKey: formData.get("serviceKey"),
  });

  if (!parsed.id) {
    await prismadb.systemServices.create({
      data: { v: 0, name: "resend_smtp", serviceKey: parsed.serviceKey },
    });
  } else {
    await prismadb.systemServices.update({
      where: { id: parsed.id },
      data: { serviceKey: parsed.serviceKey },
    });
  }

  revalidatePath("/admin");
}
