import { prismadb } from "@/lib/prisma";
import { NextAuthOptions } from "next-auth";
import { loginRateLimit } from "@/lib/rate-limit";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { newUserNotify } from "./new-user-notify";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

function getGoogleCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_ID;
  const clientSecret = process.env.GOOGLE_SECRET;
  if (!clientId || clientId.length === 0) {
    throw new Error("Missing GOOGLE_ID");
  }

  if (!clientSecret || clientSecret.length === 0) {
    throw new Error("Missing GOOGLE_SECRET");
  }

  return { clientId, clientSecret };
}

export const authOptions: NextAuthOptions = {
  secret: process.env.JWT_SECRET,
  //adapter: PrismaAdapter(prismadb),
  session: {
    strategy: "jwt",
    maxAge: 30 * 60, // 30 minutes
  },

  providers: [
    GoogleProvider({
      clientId: getGoogleCredentials().clientId,
      clientSecret: getGoogleCredentials().clientSecret,
    }),

    GitHubProvider({
      name: "github",
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),

    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "email", type: "text" },
        password: { label: "password", type: "password" },
      },

      async authorize(credentials, req) {
        const ip = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || req.connection.remoteAddress;
        const { success } = await loginRateLimit.limit(ip);
        if (!success) {
            throw new Error("Too many login attempts.");
        }
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email or password is missing");
        }

        const user = await prismadb.users.findFirst({
          where: {
            email: credentials.email,
          },
        });

        if (user?.lockoutUntil && user.lockoutUntil > new Date()) {
          throw new Error("Account is locked. Please try again later.");
        }

        //clear white space from password
        const trimmedPassword = credentials.password.trim();

        if (!user || !user?.password) {
          throw new Error("User not found, please register first");
        }

        const isCorrectPassword = await bcrypt.compare(
          trimmedPassword,
          user.password
        );

        if (!isCorrectPassword) {
          const failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
          let lockoutUntil = null;

          if (failedLoginAttempts >= 5) {
            lockoutUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
          }

          await prismadb.users.update({
            where: { id: user.id },
            data: { failedLoginAttempts, lockoutUntil },
          });

          throw new Error("Password is incorrect");
        }

        await prismadb.users.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockoutUntil: null },
        });

        return user;
      },
    }),
  ],
  callbacks: {
    //TODO: fix this any
    async session({ token, session }: any) {
      const user = await prismadb.users.findFirst({
        where: {
          email: token.email,
        },
      });

      if (!user) {
        try {
          const newUser = await prismadb.users.create({
            data: {
              email: token.email,
              name: token.name,
              avatar: token.picture,
              is_admin: false,
              is_account_admin: false,
              lastLoginAt: new Date(),
              userStatus:
                process.env.NEXT_PUBLIC_APP_URL === "https://demo.nextcrm.io"
                  ? "ACTIVE"
                  : "PENDING",
            },
          });

          await newUserNotify(newUser);

          //Put new created user data in session
          session.user.id = newUser.id;
          session.user.name = newUser.name;
          session.user.email = newUser.email;
          session.user.avatar = newUser.avatar;
          session.user.image = newUser.avatar;
          session.user.isAdmin = false;
          session.user.userLanguage = newUser.userLanguage;
          session.user.userStatus = newUser.userStatus;
          session.user.lastLoginAt = newUser.lastLoginAt;
          session.user.organizationId = newUser.organizationId;
          return session;
        } catch (error) {
          console.error("[AUTH_SESSION]", error);
          return session;
        }
      } else {
        await prismadb.users.update({
          where: {
            id: user.id,
          },
          data: {
            lastLoginAt: new Date(),
          },
        });
        //User allready exist in localDB, put user data in session
        session.user.id = user.id;
        session.user.name = user.name;
        session.user.email = user.email;
        session.user.avatar = user.avatar;
        session.user.image = user.avatar;
        session.user.isAdmin = user.is_admin;
        session.user.userLanguage = user.userLanguage;
        session.user.userStatus = user.userStatus;
        session.user.lastLoginAt = user.lastLoginAt;
        session.user.organizationId = user.organizationId;
      }

      return session;
    },
  },
};

import { getServerSession } from "next-auth";

export async function getLoggedInUser() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;

    const user = await prismadb.users.findUnique({
        where: {
            email: session.user.email,
        },
    });

    return user;
}
