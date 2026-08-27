# Arquitectura Y Despliegue

## Regla principal

Este servidor aloja varios servicios independientes. No se debe reemplazar ni
reorganizar la configuración existente de Nginx para desplegar una aplicación
nueva. Cada servicio conserva su puerto y su mecanismo de publicación.

Antes de modificar cualquier proxy:

1. Lee `/etc/nginx/sites-available/astro`.
2. Comprueba qué proceso escucha en el puerto del servicio.
3. Ejecuta `nginx -t` antes de recargar Nginx.
4. Prueba la ruta existente y las rutas de los demás servicios.
5. No cambies `location /` ni los puertos de otros servicios para resolver un
   problema de una aplicación nueva.

## Servicios Y Puertos

| Servicio | Publicación | Backend | Protocolo | URL esperada |
| --- | --- | --- | --- | --- |
| Astro principal | Nginx, `location /` | `127.0.0.1:4321` | HTTP | `http://132.248.218.76/` |
| Servicio 2 | Nginx, `location /servicio2/` | `127.0.0.1:4322` | HTTP | `http://132.248.218.76/servicio2/` |
| Servicio 3 | Nginx, redirección existente | `:4323` | HTTP | Revisar configuración antes de usar |
| Help Desk SEP | Caddy en Docker | contenedor `app:3000` | HTTPS | `https://132.248.218.76:4324/` |
| Servicio 5 | Nginx, `location /servicio5/` | `127.0.0.1:4325` | HTTP | `http://132.248.218.76/servicio5/` |
| Servicio 6 | Nginx, `location /servicio6/` | `127.0.0.1:4326` | HTTP | `http://132.248.218.76/servicio6/` |

La configuración activa de Nginx está en:

```text
/etc/nginx/sites-available/astro
/etc/nginx/sites-enabled/astro -> ../sites-available/astro
```

El archivo del proyecto [`docs/NGINX-AGENT-NOTICE.conf`](NGINX-AGENT-NOTICE.conf)
contiene el bloque de advertencia que debe quedar al inicio del archivo de
Nginx. Instálalo manualmente con privilegios administrativos, sin reemplazar
el resto del archivo:

```bash
sudo cp /etc/nginx/sites-available/astro \
  /etc/nginx/sites-available/astro.bak.$(date +%Y%m%d-%H%M%S)
sudo sh -c 'cat /home/rodrigo-aizpuru/Documentos/Dev/tickets-sep/docs/NGINX-AGENT-NOTICE.conf \
  /etc/nginx/sites-available/astro > /tmp/astro.nginx && \
  install -o root -g root -m 0644 /tmp/astro.nginx /etc/nginx/sites-available/astro'
sudo nginx -t
sudo systemctl reload nginx
```

La advertencia es solo documentación en comentarios; no cambia el enrutamiento.
No se debe copiar el archivo de notice reemplazando la configuración completa.

El Help Desk no usa Nginx. Su flujo es:

```text
cliente HTTPS :4324
  -> Docker publicado :4324
  -> Caddy :443
  -> reverse_proxy app:3000
```

No se debe añadir el Help Desk a `location /` ni mover Astro de `4321` para
publicarlo.

`/servicio4/` es una redirección legado de Nginx hacia `http://$host:4324`.
No es la URL del Help Desk y no debe modificarse como parte de su despliegue.
El Help Desk usa HTTPS directamente en `:4324`.

## Help Desk SEP

Variables relevantes en `.env`:

```env
APP_PORT=4324
PUBLIC_HOST=132.248.218.76
AUTH_URL=https://132.248.218.76:4324
```

`docker-compose.yml` publica únicamente Caddy hacia el host:

```yaml
ports:
  - "${APP_PORT}:443"
```

La aplicación Next.js escucha en `3000` únicamente dentro de Docker. PostgreSQL
se publica solo en `127.0.0.1:5432` y no debe exponerse a Internet.
Los servicios `telegram-worker` y `auto-close-worker` tampoco publican puertos;
solo usan PostgreSQL y sus servicios salientes. Define `TELEGRAM_BOT_TOKEN` en
`.env` para activar las notificaciones. El autocierre se activa desde
`Ajustes > Correo` y utiliza el buzón SMTP configurado.

## URLs Y Puertos

El puerto va en la autoridad de la URL, no en la ruta:

```text
Correcto:   https://132.248.218.76:4324/
Incorrecto: https://132.248.218.76/4324
```

La segunda URL solicita la ruta `/4324` al servicio HTTPS estándar en el puerto
`443`; no solicita el puerto `4324`.

## TLS Y Acceso Remoto

Mientras no exista un dominio público, Caddy utiliza `tls internal`. El
certificado es emitido por la CA privada de Caddy, por lo que los clientes
remotos pueden mostrar una advertencia o rechazar la conexión hasta confiar en
la CA:

```bash
docker cp helpdesk-sep-caddy-1:/data/caddy/pki/authorities/local/root.crt .
```

Para producción, la opción recomendada es usar un dominio DNS y quitar
`tls internal` para que Caddy obtenga un certificado público de Let's Encrypt.

### Hallazgo `ERR_SSL_PROTOCOL_ERROR`

El acceso desde macOS llegó correctamente a TCP `4324`, pero LibreSSL recibió:

```text
tlsv1 alert internal error
```

La causa no era el firewall ni Docker. Algunos clientes que acceden mediante la
IP no envían un SNI utilizable. Caddy tenía el certificado para la IP, pero no
tenía un certificado TLS predeterminado para conexiones sin SNI y abortaba el
handshake.

La corrección permanente está en `caddy/Caddyfile`:

```caddyfile
default_sni {$PUBLIC_HOST}
```

Después de cambiar el Caddyfile hay que recargar Caddy:

```bash
docker compose restart caddy
```

No se debe eliminar `default_sni` mientras el acceso principal sea mediante IP.

## Diagnóstico

### Estado De Servicios

```bash
docker compose ps
ss -ltnp
```

Debe existir un listener en `0.0.0.0:4324` para Caddy y otro en
`127.0.0.1:4321` cuando Astro esté iniciado.

### Probar Astro

```bash
curl -I http://127.0.0.1:4321/
curl -I http://132.248.218.76/
```

Un `502 Bad Gateway` en la raíz significa que Nginx está activo pero Astro no
está escuchando en `4321`. Inicia el proyecto Astro correspondiente sin cambiar
Nginx:

```bash
cd /home/rodrigo-aizpuru/Documentos/Dev/oas-quimica-3
npm run dev -- --host 127.0.0.1
```

### Probar Help Desk

```bash
curl -k -I https://132.248.218.76:4324/
```

Un `307` hacia `/login` confirma que Caddy y Next.js responden. Un `401` en
`/api/notifications/poll` sin cookies de sesión es esperado.

Para diagnosticar únicamente TLS:

```bash
openssl s_client -connect 132.248.218.76:4324 \
  -noservername -brief </dev/null
curl -vk https://132.248.218.76:4324/
```

Si TCP conecta pero TLS devuelve `alert internal error`, comprobar primero
`default_sni`, el certificado y los logs de Caddy:

```bash
docker compose logs --tail=100 caddy
docker exec helpdesk-sep-caddy-1 caddy validate \
  --config /etc/caddy/Caddyfile --adapter caddyfile
```

## Cambios De Puertos

Cambiar `APP_PORT` es una decisión de despliegue, no una corrección rutinaria.
Si se cambia, actualizar conjuntamente:

- `.env: APP_PORT`
- `.env: AUTH_URL`
- La URL comunicada a los usuarios
- Las reglas del firewall
- La documentación de esta tabla

No cambiar Nginx para cambiar el puerto del Help Desk. Caddy y Docker controlan
ese puerto.

La intención de reservar puertos por servicio es permitir despliegues
independientes: un cambio o caída en Astro `4321` no debe detener el Help Desk
`4324`, y un cambio en Caddy no debe alterar la raíz de Nginx. Para agregar un
nuevo servicio, asigna un puerto libre, documenta su backend y publica solo ese
puerto o ruta, sin reutilizar la raíz existente.

## Historial De Hallazgos

- Caddy estaba configurado solo para `localhost`; los accesos con la IP pública
  no coincidían con el sitio TLS.
- `AUTH_URL` apuntaba a `localhost`, por lo que las redirecciones de Auth.js no
  eran válidas para otros equipos.
- `https://132.248.218.76/4324` siempre fue una URL incorrecta: `/4324` es una
  ruta, no el puerto.
- Mover el Help Desk al puerto `443` interfería conceptualmente con la
  arquitectura existente; se restauró a `4324`.
- La raíz Astro devolvía `502` cuando el proceso de desarrollo no escuchaba en
  `4321`; Nginx estaba funcionando y no necesitaba ser reemplazado.
- El firewall ya permitía TCP `4321:4326`; un puerto TCP alcanzable no implica
  que el certificado TLS sea confiable.
- `tls internal` requiere instalar la CA privada de Caddy en los clientes
  remotos, o aceptar una advertencia local.
- macOS/LibreSSL alcanzaba TCP `4324` pero recibía `tlsv1 alert internal error`
  porque la conexión por IP no enviaba SNI y Caddy no tenía `default_sni`.
- `default_sni {$PUBLIC_HOST}` resolvió el handshake sin SNI. Debe conservarse
  mientras el acceso principal use la IP pública.
- HTTP/3 fue desactivado en Caddy (`protocols h1 h2`) porque el Help Desk se
  publica como TCP `4324`; no se debe anunciar QUIC en un puerto UDP que no se
  publica para este servicio.

## Checklist Para Agentes

- [ ] Identificar el servicio y su puerto antes de editar.
- [ ] No tocar `/etc/nginx/sites-available/astro` para cambios exclusivos del Help Desk.
- [ ] No cambiar `location /` de Astro.
- [ ] No mover Astro de `4321`.
- [ ] No reutilizar puertos ocupados por otro servicio.
- [ ] No publicar `3000` ni `5432` a Internet.
- [ ] Validar `docker compose config --quiet` después de cambios Docker.
- [ ] Validar `nginx -t` si se modificó Nginx.
- [ ] Probar cada URL existente después de recargar un proxy.
- [ ] No eliminar `default_sni` del Caddyfile para el acceso por IP.

## Persistencia Y Respaldo

Los datos de la aplicación no viven en la capa efímera de los contenedores. Se
guardan en volúmenes Docker nombrados:

| Volumen | Contenido |
| --- | --- |
| `helpdesk-sep_db_data` | PostgreSQL, tickets, usuarios y configuración |
| `helpdesk-sep_uploads_data` | Adjuntos de los tickets |
| `helpdesk-sep_caddy_data` | Certificados y CA interna de Caddy |
| `helpdesk-sep_caddy_config` | Estado de configuración de Caddy |

Docker está habilitado al arranque y los servicios usan `restart: unless-stopped`.
Después de reiniciar la computadora, Docker debe volver a iniciar los
contenedores y los volúmenes deben conservarse.

No ejecutar estos comandos sin un respaldo verificado:

```bash
docker compose down -v
docker volume rm helpdesk-sep_db_data
docker system prune --volumes
```

`docker compose down` sin `-v` conserva los volúmenes, pero elimina los
contenedores. `docker compose up -d` los vuelve a crear y reutiliza los datos.

### Respaldo Incluido

El script [`scripts/backup.sh`](../scripts/backup.sh) crea un respaldo en
`/var/backups/helpdesk-sep` con:

- Dump comprimido de PostgreSQL.
- Adjuntos de `uploads_data`.
- Estado de `caddy_data` y `caddy_config`.
- `.env` con permisos restringidos.
- `docker-compose.yml`, Caddyfile, schema y migraciones.
- Checksums SHA-256.

El respaldo elimina directorios con más de 30 días. El directorio de respaldo
debe estar en otro disco o copiarse periódicamente a otro servidor; un respaldo
en el mismo disco no protege contra la pérdida de ese disco.

### Instalar Respaldo Diario

Los archivos de systemd están en `deploy/`. Instálalos una sola vez:

```bash
sudo install -m 0644 deploy/helpdesk-sep-backup.service \
  /etc/systemd/system/helpdesk-sep-backup.service
sudo install -m 0644 deploy/helpdesk-sep-backup.timer \
  /etc/systemd/system/helpdesk-sep-backup.timer
sudo systemctl daemon-reload
sudo systemctl enable --now helpdesk-sep-backup.timer
```

Si no se dispone de `sudo`, se puede instalar un timer de usuario. Este usa
`$HOME/backups/helpdesk-sep`, requiere que el usuario tenga acceso al grupo
Docker y depende de que la sesión de usuario tenga `systemd --user` activo:

```bash
mkdir -p ~/.config/systemd/user
cp deploy/helpdesk-sep-backup-user.service ~/.config/systemd/user/
cp deploy/helpdesk-sep-backup-user.timer ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now helpdesk-sep-backup-user.timer
```

El timer de usuario se ejecuta mientras la sesión esté disponible. Para que
también opere sin iniciar sesión, se necesita habilitar el linger del usuario
con privilegios administrativos:

```bash
sudo loginctl enable-linger "$USER"
```

La opción del timer global en `/etc/systemd/system` es preferible para un
servidor dedicado.

El timer ejecuta un respaldo diario alrededor de las 03:15 UTC, con hasta 15
minutos de variación. `Persistent=true` ejecuta el respaldo cuando el equipo
vuelve a encenderse si se perdió la hora programada.

### Ejecutar Y Verificar Un Respaldo

```bash
sudo systemctl start helpdesk-sep-backup.service
sudo systemctl status helpdesk-sep-backup.service --no-pager
sudo systemctl list-timers helpdesk-sep-backup.timer
sudo ls -la /var/backups/helpdesk-sep/latest
sudo sh -c 'cd /var/backups/helpdesk-sep/latest && sha256sum -c SHA256SUMS'
```

Para probar el script sin escribir en `/var/backups`, se puede usar otro
directorio temporal:

```bash
sudo BACKUP_DIR=/tmp/helpdesk-sep-backup \
  /home/rodrigo-aizpuru/Documentos/Dev/tickets-sep/scripts/backup.sh
```

### Restauración

La restauración debe hacerse con el servicio detenido y un respaldo adicional
del estado actual. Para restaurar la base de datos en el contenedor existente:

```bash
gunzip -c /var/backups/helpdesk-sep/latest/database.sql.gz \
  | docker compose exec -T db sh -c \
    'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
```

Los adjuntos y los datos de Caddy se restauran sobre sus volúmenes mediante un
contenedor temporal. No se deben borrar los volúmenes actuales hasta verificar
que el dump y los archivos de respaldo son legibles.

### Objetivo Operativo

- Base de datos: respaldo diario y retención local de 30 días.
- Adjuntos: incluidos en el mismo respaldo diario.
- Caddy: incluido para conservar certificados y la CA interna.
- Copia externa: pendiente de configurarse en otro disco, servidor o servicio
  de almacenamiento.

Sin una copia externa, un fallo del disco puede destruir tanto los datos activos
como los respaldos locales.

## Cambio De Cuenta Administradora

`ADMIN_EMAIL`, `ADMIN_NAME` y `ADMIN_PASSWORD` son valores de inicialización,
pero la cuenta real vive en PostgreSQL. No basta con cambiar `.env` y esperar
que una sesión o una cuenta persistente cambien por sí solas.

El seed actualiza la cuenta administradora existente cuando cambia el correo,
conservando las relaciones con tickets y respuestas. Para aplicar un cambio:

```bash
docker compose up -d --build
```

Después verifica la cuenta persistente sin mostrar el hash de contraseña:

```bash
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c 'SELECT email, name, role FROM users ORDER BY "createdAt";'
```

Si el navegador conserva una sesión anterior, cierra sesión o prueba una
ventana privada. La validación real de credenciales se hace contra la base de
datos del contenedor, no contra el texto actual de `.env`.

El formulario de acceso autentica por **correo electrónico**, no por el nombre
visible del administrador. `ADMIN_NAME` solo es el nombre mostrado después de
iniciar sesión; no debe escribirse en el campo `Correo`. Si el navegador tiene
un autocompletado antiguo, borrar las cookies y credenciales guardadas del host
`132.248.218.76` o usar una ventana privada evita enviar la cuenta anterior.
