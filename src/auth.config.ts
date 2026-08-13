import type { NextAuthConfig } from "next-auth";

/**
 * Configuración "edge-safe": no toca Prisma ni bcrypt. Se usa desde `proxy.ts`
 * (el proxy/middleware corre en un runtime más limitado) y se combina con la
 * configuración completa en `auth.ts`.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 12, // 12 horas
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = request.nextUrl.pathname.startsWith("/login");

      if (isOnLogin) {
        // Si ya inició sesión y visita /login, lo mandamos al dashboard.
        return isLoggedIn
          ? Response.redirect(new URL("/", request.nextUrl))
          : true;
      }

      return isLoggedIn;
    },
  },
  providers: [], // Los providers reales (Credentials) se agregan en auth.ts
} satisfies NextAuthConfig;
