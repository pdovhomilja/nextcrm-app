import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP, testUtils } from "better-auth/plugins";
import { admin as adminPlugin } from "better-auth/plugins";
import { prismadb } from "@/lib/prisma";
import { ac, admin, manager, user } from "@/lib/auth-permissions";
import { newUserNotify } from "@/lib/new-user-notify";
import { OTP_EXPIRES_SECONDS, sendOtpEmail } from "@/lib/auth-otp-mail";
import { getBetterAuthTrustedOrigins } from "@/lib/auth-base-url";
import { getBootstrapAdminEmail } from "@/lib/bootstrap-admin-config";

const googleClientId = process.env.GOOGLE_ID || process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET;
const isGoogleConfigured = Boolean(
  googleClientId &&
  googleClientSecret &&
  googleClientId !== "your-google-client-id" &&
  googleClientSecret !== "your-google-client-secret"
);
const isDemo = process.env.NEXT_PUBLIC_APP_URL === "https://demo.nextcrm.io";
const bootstrapAdminEmail = getBootstrapAdminEmail();

export const auth = betterAuth({
  database: prismaAdapter(prismadb, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET || "default-secret-key-change-me",
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  trustedOrigins: getBetterAuthTrustedOrigins(),
  advanced: {
    database: {
      generateId: "uuid",
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,       // 7 days
    updateAge: 60 * 60 * 24,            // refresh every 24 hours
  },

  user: {
    modelName: "Users",
    fields: {
      createdAt: "created_on",
      updatedAt: "updated_at",
      image: "image",
    },
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
        input: false,
      },
      userStatus: {
        type: "string",
        defaultValue: "ACTIVE",
        input: false,
      },
      userLanguage: {
        type: "string",
        defaultValue: "en",
        input: false,
      },
      avatar: {
        type: "string",
        required: false,
        input: false,
      },
      phone: {
        type: "string",
        required: false,
        input: false,
      },
      mustChangePassword: {
        type: "boolean",
        defaultValue: false,
        input: false,
      },
    },
  },

  socialProviders: {
    ...(isGoogleConfigured
      ? {
          google: {
            clientId: googleClientId!,
            clientSecret: googleClientSecret!,
          },
        }
      : {}),
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  plugins: [
    emailOTP({
      expiresIn: OTP_EXPIRES_SECONDS,
      allowedAttempts: 5,
      // Resend the same unexpired code. Rotating it made the code already
      // in the inbox fail when the new email never arrived.
      resendStrategy: "reuse",
      sendVerificationOTP: async ({ email, otp }) => {
        await sendOtpEmail(email, otp);
      },
    }),
    // testUtils captures OTPs for E2E testing — only enabled in non-production
    ...(process.env.NODE_ENV !== "production"
      ? [testUtils({ captureOTP: true })]
      : []),
    adminPlugin({
      ac,
      roles: { admin, manager, user },
      defaultRole: "user",
    }),
  ],

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },

  callbacks: {
    async onUserCreated(user: { id: string; email?: string | null }) {
      // The bootstrap account is always active and an admin, even when the
      // database already contains imported or seeded users.
      const count = await prismadb.users.count();
      const isBootstrapAdmin =
        user.email?.trim().toLowerCase() === bootstrapAdminEmail;

      if (count === 1 || isBootstrapAdmin) {
        await prismadb.users.update({
          where: { id: user.id },
          data: { role: "admin", userStatus: "ACTIVE" },
        });
      } else if (!isDemo) {
        // Notify admins about new pending user
        const dbUser = await prismadb.users.findUnique({ where: { id: user.id } });
        if (dbUser) {
          await newUserNotify(dbUser);
        }
      }
    },
  },
});

export type Session = typeof auth.$Infer.Session;
