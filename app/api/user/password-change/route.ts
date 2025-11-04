import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prismadb } from "@/lib/prisma";
import { getLoggedInUser } from "@/lib/auth";

const passwordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(12, "Password must be at least 12 characters long")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();
    const validation = passwordSchema.safeParse({ currentPassword, newPassword });

    if (!validation.success) {
      return new NextResponse(JSON.stringify({ error: validation.error.errors[0].message }), { status: 400 });
    }

    const isCorrectPassword = await bcrypt.compare(currentPassword, user.password!);
    if (!isCorrectPassword) {
      return new NextResponse(JSON.stringify({ error: "Incorrect current password" }), { status: 400 });
    }

    const isSameAsCurrentPassword = await bcrypt.compare(newPassword, user.password!);
    if (isSameAsCurrentPassword) {
        return new NextResponse(JSON.stringify({ error: "New password cannot be the same as the current password" }), { status: 400 });
    }

    for (const oldPassword of user.passwordHistory) {
      const isSamePassword = await bcrypt.compare(newPassword, oldPassword);
      if (isSamePassword) {
        return new NextResponse(JSON.stringify({ error: "Cannot reuse an old password" }), { status: 400 });
      }
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    const updatedPasswordHistory = [user.password!, ...user.passwordHistory].slice(0, 5);

    await prismadb.users.update({
      where: { id: user.id },
      data: {
        password: newPasswordHash,
        passwordHistory: updatedPasswordHistory,
      },
    });

    return new NextResponse(JSON.stringify({ message: "Password updated successfully" }), { status: 200 });
  } catch (error) {
    console.error("[PASSWORD_CHANGE]", error);
    return new NextResponse(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}
