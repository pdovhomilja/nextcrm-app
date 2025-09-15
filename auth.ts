import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";

import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import bcrypt from "bcryptjs";
import db from "./lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
  },
  providers: [
    Resend({
      from: process.env.RESEND_FROM,
      normalizeIdentifier(identifier: string): string {
        // Get the first two elements only,
        // separated by `@` from user input.
        const [local, ...domainParts] = identifier
          .toLowerCase()
          .trim()
          .split("@");
        // The part before "@" can contain a ","
        // but we remove it on the domain part
        const domain = domainParts.join("@").split(",")[0];
        return `${local}@${domain}`;

        // You can also throw an error, which will redirect the user
        // to the sign-in page with error=EmailSignin in the URL
        // if (identifier.split("@").length > 2) {
        //   throw new Error("Only one email allowed")
        // }
      },
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: {
            email: credentials.email as string,
          },
        });

        if (!user || !user.password) {
          return null;
        }

        // Check if email is verified
        if (!user.emailVerified) {
          throw new Error("Please verify your email before signing in");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      async profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      async profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
        };
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Always fetch fresh memberships to ensure up-to-date data
      if (token.sub) {
        const memberships = await db.companyMembership.findMany({
          where: { userId: token.sub },
          include: { company: true },
          orderBy: { createdAt: "asc" },
        });

        token.memberships = memberships;

        // If user has no company memberships, create a default company
        if (memberships.length === 0) {
          const user = await db.user.findUnique({
            where: { id: token.sub },
            select: { name: true, email: true },
          });

          if (user) {
            const companyName = user.name
              ? `${user.name}'s Company`
              : `${user.email.split("@")[0]}'s Company`;
            const company = await db.company.create({
              data: {
                name: companyName,
                memberships: {
                  create: {
                    userId: token.sub,
                    role: "OWNER",
                  },
                },
              },
              include: {
                memberships: {
                  include: { company: true },
                },
              },
            });

            // Update token with new company membership
            token.memberships = [company.memberships[0]];
            token.activeCompanyId = company.id;
          }
        } else {
          // Set default company if not set or if user lost access to current company
          if (
            !token.activeCompanyId ||
            !memberships.find((m) => m.companyId === token.activeCompanyId)
          ) {
            token.activeCompanyId = memberships[0]?.companyId || null;
          }
        }
      }

      // Handle company switching via session update
      if (trigger === "update" && session?.activeCompanyId) {
        // Verify user has access to the requested company
        const hasAccess = token.memberships?.find(
          (m: any) => m.companyId === session.activeCompanyId
        );
        if (hasAccess) {
          token.activeCompanyId = session.activeCompanyId;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.memberships = token.memberships as any[];
        session.user.activeCompanyId = token.activeCompanyId as string | null;
      }
      return session;
    },
  },
});
