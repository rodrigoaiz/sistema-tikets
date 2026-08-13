Cambia el valor de `APP_PORT` en `.env` para exponer el sistema en otro puerto. Después reinicia con:

```sh
docker compose up -d
```

No necesitas tocar ningún otro archivo: Caddy, Next.js y el proxy inverso se ajustan automáticamente al nuevo puerto.

La URL externa usa ese puerto como autoridad: `https://PUBLIC_HOST:APP_PORT/`. No uses el puerto como ruta (`/4324`). Para acceso por IP, define también `PUBLIC_HOST` con el IP público y actualiza `AUTH_URL` con la misma URL.
