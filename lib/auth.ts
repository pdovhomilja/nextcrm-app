import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP, testUtils } from "better-auth/plugins";
import { admin as adminPlugin } from "better-auth/plugins";
import { prismadb } from "@/lib/prisma";
import { ac, admin, manager, user } from "@/lib/auth-permissions";
import { newUserNotify } from "@/lib/new-user-notify";
import resendHelper from "@/lib/resend";
import { getBetterAuthTrustedOrigins } from "@/lib/auth-base-url";

const googleClientId = process.env.GOOGLE_ID || process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET;
const isGoogleConfigured = Boolean(
  googleClientId &&
  googleClientSecret &&
  googleClientId !== "your-google-client-id" &&
  googleClientSecret !== "your-google-client-secret"
);
const isDemo = process.env.NEXT_PUBLIC_APP_URL === "https://demo.nextcrm.io";
const bootstrapAdminEmail = (
  process.env.BOOTSTRAP_ADMIN_EMAIL || "jayandraa5@gmail.com"
).trim().toLowerCase();

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
    enabled: false,
  },

  plugins: [
    emailOTP({
      sendVerificationOTP: async ({ email, otp, type }) => {
        if (process.env.NODE_ENV !== "production") {
          console.log(`\n========================================\n[Auth DEV Mode] Verification OTP for ${email}: ${otp}\n========================================\n`);
        }
        try {
          const resend = await resendHelper();
          await resend.emails.send({
            from: `${process.env.NEXT_PUBLIC_APP_NAME || "NextCRM"} <${process.env.EMAIL_FROM || "noreply@domain.com"}>`,
            to: email,
            subject: `Your verification code: ${otp}`,
            text: `Your one-time verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you did not request this, please ignore this email.`,
          });
        } catch (e) {
          // In dev/test, email sending may fail — OTP is captured by testUtils plugin
          if (process.env.NODE_ENV !== "production") {
            console.log(`[Auth] Email sending failed in dev mode for ${email}, but captured OTP: ${otp}`);
          } else {
            throw e;
          }
        }
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
