import { withAuth } from "next-auth/middleware";
import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";

const intlMiddleware = createMiddleware({
  locales: ["en", "de", "cz", "uk"],
  defaultLocale: "en",
});

const authMiddleware = withAuth(
  function onSuccess(req) {
    return intlMiddleware(req);
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        if (pathname.startsWith("/customer-portal")) {
          return token?.email?.endsWith("@example.com") ?? false;
        }
        return !!token;
      },
    },
    pages: {
      signIn: "/customer-portal/sign-in",
    },
  }
);

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api")) {
    return;
  }
  if (pathname.startsWith("/customer-portal")) {
    return (authMiddleware as any)(req);
  }
  return intlMiddleware(req);
}
