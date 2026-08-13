<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Shared Server Deployment Rules

This project runs on a server that also publishes independent Astro services
through Nginx. Read `docs/DEPLOYMENT.md` before changing deployment, proxy, TLS,
or port configuration.

- Do not replace, reorganize, or disable `/etc/nginx/sites-available/astro`.
- Do not change Nginx `location /` or move the Astro service from port `4321`.
- Do not use Nginx to publish this Help Desk. It uses Caddy in Docker on HTTPS
  port `4324`.
- Keep service ports isolated: Nginx-managed Astro services use `4321`-`4326`;
  Help Desk uses host port `4324` through Caddy.
- Never publish the Help Desk container port `3000` or PostgreSQL port `5432`.
- Use `docker compose config --quiet` and `nginx -t` before applying changes to
  the corresponding system.
- Test existing Astro URLs after any Nginx reload and test
  `https://132.248.218.76:4324/` after any Caddy change.
