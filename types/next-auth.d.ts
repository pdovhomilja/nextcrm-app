import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      activeCompanyId?: string | null;
      memberships?: Array<{
        companyId: string;
        userId: string;
        role: "MEMBER" | "ADMIN" | "OWNER";
        createdAt: Date;
        company: {
          id: string;
          name: string;
          createdAt: Date;
          updatedAt: Date;
        };
      }>;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    // Multi-tenant user - company membership handled via CompanyMembership model
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    activeCompanyId?: string | null;
    memberships?: any[];
  }
}
