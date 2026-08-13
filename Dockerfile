# syntax=docker/dockerfile:1

# ---- deps ---------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- builder --------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# La build no necesita una base de datos real: solo genera el cliente Prisma
# a partir del schema (no ejecuta consultas).
RUN npx prisma generate
RUN npm run build

# ---- runner ---------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts

RUN mkdir -p /data/uploads && chown -R nextjs:nodejs /data/uploads

USER nextjs

EXPOSE 3000

# Aplica migraciones pendientes y luego arranca el servidor de Next.js.
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node node_modules/.bin/next start -p 3000"]
