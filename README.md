# Help Desk SEP

Mesa de ayuda para administrar problemas **técnicos** del curso de inglés de Prepa en Línea SEP sobre Moodle. Los tickets se pueden crear manualmente o, cuando conectes un buzón, a partir de correos que primero pasan por una bandeja de triage.

> **Arquitectura compartida:** este servidor publica otros proyectos Astro mediante Nginx. El Help Desk es independiente y usa Caddy en `https://132.248.218.76:4324/`. No cambies la configuración de Nginx para desplegar o corregir este proyecto. Consulta [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) antes de modificar puertos, proxies o TLS.

Los datos persistentes están en volúmenes Docker y hay un script de respaldo en [`scripts/backup.sh`](scripts/backup.sh). La guía de instalación del respaldo diario y restauración está en [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Arranque rápido

Requisitos:

- Docker y Docker Compose
- Un puerto libre para HTTPS, por defecto `4324`

1. Revisa `.env`. El archivo ya contiene valores locales de desarrollo, pero debes cambiar al menos `AUTH_SECRET`, `POSTGRES_PASSWORD`, `ADMIN_PASSWORD` y `MAILBOX_ENCRYPTION_KEY` antes de exponer el sistema.
2. Inicia la aplicación:

```bash
docker compose up -d --build
```

3. Abre `https://localhost:4324` en desarrollo, o `https://PUBLIC_HOST:APP_PORT/` desde otra máquina.
4. Inicia sesión con `ADMIN_EMAIL` y `ADMIN_PASSWORD` de `.env`.

El acceso usa el correo (`ADMIN_EMAIL`), no `ADMIN_NAME`. Si cambias esas
variables después del primer arranque, revisa la guía de cuenta administradora
en [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

El certificado inicial es autofirmado y el navegador mostrará una advertencia. Es esperado mientras no haya dominio; además, los equipos remotos deben confiar en la CA interna de Caddy o aceptar la advertencia. El primer arranque ejecuta las migraciones y crea el usuario administrador y las categorías predeterminadas. El seed es idempotente y no borra tickets existentes.

## Cambiar el puerto

Edita `APP_PORT` en `.env` y reinicia:

```bash
docker compose up -d
```

El valor controla el único puerto público de Caddy. PostgreSQL permanece publicado solamente en `127.0.0.1:5432`.

Mientras no exista dominio, configura `PUBLIC_HOST` con el IP público en `.env`; Caddy también conserva `localhost` para desarrollo. La URL externa es `https://132.248.218.76:4324/`; `https://132.248.218.76/4324` solicita la ruta `/4324` al puerto 443 y no representa el puerto 4324. Cuando tengas un dominio, cambia `PUBLIC_HOST` y `AUTH_URL` en `.env`, apunta los registros DNS al servidor y elimina `tls internal` de `caddy/Caddyfile` para que Caddy emita un certificado Let's Encrypt.

## Desarrollo local

Para desarrollar fuera de Docker, deja PostgreSQL arriba y usa la URL de `.env`:

```bash
docker compose up -d db
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

La app local estará en `http://localhost:3000`. Para que Auth.js redirija correctamente durante desarrollo, usa temporalmente `AUTH_URL="http://localhost:3000"`; antes de volver a Docker restáuralo a `https://localhost:4324`.

Comandos útiles:

```bash
npm run lint
npm run build
npm run db:studio
```

## Correo

El sistema no convierte automáticamente todos los correos en tickets. El flujo es:

1. El script IMAP revisa el buzón y guarda mensajes nuevos en `IncomingEmail`.
2. En `/inbox` decides si convertir el mensaje en ticket, responderlo sin ticket, o descartarlo.
3. La respuesta se envía por SMTP y el correo se marca como respondido únicamente después de que el envío termina correctamente.
4. Las respuestas posteriores del alumno se reconocen por `In-Reply-To`/`References` y se agregan a la conversación del ticket existente.

Si se activa **Cierre automático** desde `/settings`, los tickets en progreso que
tengan una respuesta pública del agente enviada correctamente por correo se
revisan después de 48 horas sin respuesta del alumno. El sistema envía un aviso
por correo y solo después marca el ticket como cerrado. Si el alumno contesta a
ese mismo correo, el ticket se reabre automáticamente.

Configura IMAP/SMTP en `/settings`. Las contraseñas se guardan cifradas con AES-256-GCM usando `MAILBOX_ENCRYPTION_KEY`; no se almacenan en texto plano.

Para probar o ejecutar una revisión manual:

```bash
docker compose run --rm mail-worker npm run mail:poll
```

Para ejecutar manualmente una revisión de autocierre:

```bash
docker compose run --rm auto-close-worker npm run tickets:auto-close
```

En producción, Docker Compose mantiene el servicio `mail-worker` activo y revisa
el buzón cada 60 segundos. Puedes cambiar el intervalo con
`MAIL_POLL_INTERVAL_SECONDS` en `.env`. El worker no crea tickets por sí mismo.

## Telegram

Las nuevas respuestas de alumnos pueden enviarse de inmediato a Telegram. El sistema también
puede avisar cuando llega un correo independiente a la Bandeja de entrada.

1. Crea un bot con `@BotFather` y copia su token en `TELEGRAM_BOT_TOKEN` dentro de `.env`.
2. Reconstruye los servicios: `docker compose up -d --build`.
3. Abre `Mi cuenta` desde el dashboard y pulsa `Generar código`.
4. En Telegram, abre tu bot y envíale `/start CÓDIGO`.
5. Regresa al dashboard y pulsa `Ya lo vinculé`.

El worker `telegram-worker` procesa las vinculaciones y entrega los avisos con reintentos. No
publica ningún puerto adicional. El token solo se configura como secreto de entorno y nunca se
guarda en la base de datos.

## Usuarios y permisos

El administrador puede crear usuarios desde `Ajustes > Usuarios`.

- **Administrador**: acceso total, incluyendo correo, categorías, usuarios y cuenta.
- **Agente**: acceso al dashboard, tickets, Kanban, bandeja de entrada y adjuntos; no puede modificar correo, categorías ni usuarios.

Para crear un agente, captura nombre, correo y una contraseña inicial de al menos 8 caracteres. El agente puede cambiar su nombre y contraseña desde `Mi cuenta`. Las contraseñas se almacenan con hash bcrypt.

## Respaldos

Respaldo de PostgreSQL:

```bash
mkdir -p backups
docker compose exec -T db pg_dump \
  -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip > "backups/helpdesk-$(date +%Y%m%d-%H%M%S).sql.gz"
```

Restauración en una base vacía:

```bash
gunzip -c backups/archivo.sql.gz \
  | docker compose exec -T db psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

Los adjuntos viven en el volumen Docker `helpdesk-sep_uploads_data`. Inclúyelo en el plan de respaldo del servidor. No borres `db_data`, `uploads_data`, `caddy_data` ni `caddy_config` sin un respaldo.

## Funcionalidad incluida

- Login con usuario/contraseña y rutas protegidas
- Dashboard con KPIs, gráficas y tickets recientes
- Vista de tickets en tabla y Kanban
- Filtros por búsqueda, estado, prioridad y categoría
- Creación manual de tickets
- Prioridad Baja/Media/Alta y estados Abierto/En progreso/Cerrado
- Hilo de respuestas y notas internas
- Adjuntos de imágenes y PDF, servidos mediante rutas autenticadas
- Bandeja de triage de correos
- Configuración de buzón, categorías y cuenta
- Notificaciones del navegador mediante polling
- Notificaciones de Telegram para respuestas de alumnos y correos nuevos
- Cierre automático configurable de tickets en progreso después de 48 horas sin respuesta
- Mejora opcional de borradores con IA local del navegador cuando Gemini Nano está disponible
- La IA solo propone cambios sobre el borrador actual y nunca modifica mensajes guardados

## Seguridad antes de exponerlo

- Cambia todos los secretos de `.env`.
- No publiques el puerto `5432` fuera de localhost.
- Usa un dominio real y certificado Let's Encrypt para producción.
- Mantén el sistema detrás de HTTPS y usa una contraseña de administrador fuerte.
- Revisa periódicamente dependencias con `npm audit`; el stack de correo incluye nodemailer y su advisory actual debe revisarse antes de habilitar envío automatizado en producción.
