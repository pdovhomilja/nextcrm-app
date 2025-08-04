import { DefaultSession, DefaultUser } from "next-auth"
import { JWT, DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      cid?: string | null
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    cid?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    cid?: string | null
  }
}