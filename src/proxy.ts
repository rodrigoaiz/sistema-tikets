import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// En Next.js 16, el archivo se llama `proxy.ts` y exporta `proxy`
// (antes era `middleware.ts` con export `middleware`).
const { auth } = NextAuth(authConfig);
export const proxy = auth;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
