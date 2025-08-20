import { DefaultSession, DefaultUser } from "next-auth"
import { JWT, DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      cid?: string | null
      activeCompanyId?: string | null
      memberships?: Array<{
        companyId: string
        userId: string
        role: 'MEMBER' | 'ADMIN' | 'OWNER'
        createdAt: Date
        company: {
          id: string
          name: string
          createdAt: Date
          updatedAt: Date
        }
      }>
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    cid?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    cid?: string | null
    activeCompanyId?: string | null
    memberships?: any[]
  }
}