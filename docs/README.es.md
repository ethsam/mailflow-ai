# Mailflow AI

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org/)

> **Idiomas:** [English](../README.md) | [Francais](./README.fr.md) | [Espanol](./README.es.md)

---

## Que es?

Mailflow AI es una herramienta Node.js que permite **leer, enviar, responder, reenviar, eliminar y organizar emails** desde la terminal o via API REST.

Fue construido para que un agente de IA pueda gestionar una bandeja de entrada de forma autonoma — pero funciona igual de bien para scripts, tareas cron, o cualquier automatizacion que necesite interactuar con una cuenta de email.

Se conecta a cualquier servidor IMAP/SMTP (Gmail, Outlook, o el tuyo).

## Que hace y que no hace

**Ten en cuenta antes de usar esta herramienta:**

| Pregunta | Respuesta |
|----------|-----------|
| Descarga archivos adjuntos en mi disco? | **No.** Lee los metadatos (nombre, tamano, tipo) pero nunca guarda archivos. |
| "Eliminar" borra permanentemente los emails? | **No.** Los mueve a la Papelera. Tu proveedor los guarda ~30 dias. |
| "Archivar" borra algo? | **No.** Mueve los emails de la Bandeja de entrada a "Todos los mensajes". Nada se pierde. |
| Almacena emails en mi maquina? | **No.** Todos los emails permanecen en el servidor IMAP. Busca bajo demanda, nada se cachea. |
| Marcar como leido afecta al servidor? | **Si.** Modifica el flag `\Seen` en el servidor IMAP. Otros clientes veran el cambio. |
| El script cron modifica algo? | **No.** Solo verifica emails no leidos y opcionalmente envia una notificacion webhook. Solo lectura. |
| Hay rate limiting? | **No.** La herramienta no limita las solicitudes. Los limites de tu proveedor aplican (Gmail: ~500 envios/dia). |

### Que se escribe en disco

Solo 4 pequenos archivos JSON/HTML, todos en la carpeta del proyecto:

| Archivo | Contenido | Cuando |
|---------|-----------|--------|
| `logs/sent.json` | Log de cada email enviado (o simulado en dry-run) | Despues de cada envio/respuesta/reenvio |
| `logs/history.json` | Ultimas 50 acciones API (tipo, timestamp, detalles) | Despues de cada llamada API |
| `logs/last-check.json` | Timestamp del ultimo check cron | Despues de cada ejecucion del cron |
| `templates/signature.html` | Tu firma de email (gitignored, sobrevive actualizaciones) | Cuando defines una firma |

Sin base de datos. Sin archivos ocultos. Sin telemetria.

### Sobre el modo dry-run

**El dry-run esta ACTIVO por defecto.** Cuando esta activo:

- `send`, `reply`, `forward` → **el email NO se envia**, solo se registra
- Ves `[DRY-RUN]` en la salida
- Debes pasar explicitamente `--no-dry-run` (CLI) o `"dryRun": false` (API) para enviar

**Sin embargo, estas acciones se ejecutan siempre inmediatamente, incluso en dry-run:**
- **Eliminar** (mueve a Papelera)
- **Archivar** (mueve a Todos los mensajes)
- **Marcar como leido/no leido** (cambia flag en el servidor)
- **Mover** (mueve a carpeta)

Es intencional — estas operaciones son reversibles y no envian nada al exterior.

## Inicio rapido

```bash
git clone git@github.com:ethsam/mailflow-ai.git
cd mailflow-ai
npm install
cp .env.example .env   # Editar con tus credenciales de email
```

Probar que funciona:

```bash
node src/cli.js list --limit 5
```

## Configuracion

Editar `.env` (copiar desde `.env.example`):

```env
EMAIL_USER=tu@example.com          # Tu direccion de email
EMAIL_PASS=xxxx xxxx xxxx xxxx     # Contrasena de aplicacion (NO tu contrasena regular)
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
API_PORT=3100
DRY_RUN=true                       # true = los emails NO se envian (defecto seguro)
WEBHOOK_URL=                       # Opcional: URL para notificar nuevos emails
```

> **Necesitas una Contrasena de aplicacion**, no tu contrasena regular.
> Gmail: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)

## CLI

```bash
node src/cli.js <comando> [opciones]
```

### Leer emails

```bash
node src/cli.js list                              # Ultimos 20 emails
node src/cli.js list --unseen                     # Solo no leidos
node src/cli.js list --from "jefe@empresa.com"    # Filtrar por remitente
node src/cli.js list --subject "factura"           # Filtrar por asunto
node src/cli.js list --since 2026-03-01           # Desde una fecha
node src/cli.js read 245                          # Contenido completo por UID
```

### Enviar emails

```bash
# Dry-run (defecto) — el email NO se envia
node src/cli.js send --to "user@example.com" --subject "Hola" --body "Saludos"

# Enviar de verdad
node src/cli.js send --to "user@example.com" --subject "Hola" --body "Saludos" --no-dry-run
```

### Responder y reenviar

```bash
node src/cli.js reply 245 --body "Gracias!" --no-dry-run
node src/cli.js forward 245 --to "colega@example.com" --no-dry-run
```

### Gestionar emails

```bash
node src/cli.js delete 245           # Mover a papelera (no permanente)
node src/cli.js archive 245          # Mover a Todos los mensajes
node src/cli.js mark 245 --read      # Marcar como leido
node src/cli.js mark 245 --unread    # Marcar como no leido
node src/cli.js mailboxes            # Listar carpetas
```

### Firma

```bash
node src/cli.js set-signature                          # Ver firma actual
node src/cli.js set-signature --file mi-firma.html     # Establecer desde archivo

# En el primer inicio, templates/signature.html se crea automaticamente desde signature.example.html
# Edita templates/signature.html — esta en gitignore, tu firma sobrevive a las actualizaciones
```

## API REST

```bash
node src/cli.js serve
# => Mail API running on port 3100
```

### Documentacion interactiva

```bash
curl http://localhost:3100/help
```

### Todos los endpoints

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| `GET` | `/help` | Documentacion completa con parametros y ejemplos |
| `GET` | `/health` | Health check + estado dry-run |
| `GET` | `/emails` | Listar emails |
| `GET` | `/emails/:uid` | Contenido completo |
| `POST` | `/emails/send` | Enviar email (respeta dry-run) |
| `POST` | `/emails/:uid/reply` | Responder preservando hilo |
| `POST` | `/emails/:uid/forward` | Reenviar |
| `DELETE` | `/emails/:uid` | Mover a papelera |
| `POST` | `/emails/:uid/archive` | Archivar |
| `PUT` | `/emails/:uid/read` | Marcar leido/no leido |
| `POST` | `/emails/:uid/move` | Mover a carpeta |
| `GET` | `/mailboxes` | Listar carpetas |
| `GET` | `/signature` | Ver firma |
| `PUT` | `/signature` | Modificar firma |
| `GET` | `/history` | Historial de acciones |
| `DELETE` | `/history` | Vaciar historial |

## Cron

`cron.js` verifica emails no leidos periodicamente. **Solo lee, nunca modifica nada en el servidor.**

```bash
node cron.js

# Crontab — cada hora
0 * * * * cd /ruta/a/mailflow-ai && node cron.js >> logs/cron.log 2>&1
```

## Conexiones de red

La herramienta hace estas conexiones y nada mas:

| Conexion | Cuando | Puerto | Protocolo |
|----------|--------|--------|-----------|
| Servidor IMAP | Cada lectura/lista/eliminacion/archivado/marcado | 993 | TLS |
| Servidor SMTP | Cada envio/respuesta/reenvio (no en dry-run) | 587 | STARTTLS |
| URL Webhook | Solo cron, si configurado y nuevos emails encontrados | varia | HTTPS |

Sin analytics. Sin tracking. Sin servicios de terceros.

## Tests

```bash
npm test
```

34 tests cubriendo todos los modulos con el test runner nativo de Node.js.

## Licencia

[MIT](../LICENSE) — Gratuito y de codigo abierto.

> **Aviso de mantenimiento**
> Este proyecto es mantenido en solitario por Samuel ETHEVE en su tiempo libre.
> Es gratuito. No hay soporte de pago, no hay SLA, no hay garantias.
> Los reportes de bugs son bienvenidos. Las correcciones llegan cuando llegan.

## Autor

**Samuel ETHEVE** — Desarrollador & Emprendedor

- [setheve@viceversa.re](mailto:setheve@viceversa.re) | +262 692 38 00 28 | [@ethsam974](https://t.me/ethsam974)

| Necesidad | Sitio |
|-----------|-------|
| Comunicacion, marketing & eventos | [viceversa.re](https://www.viceversa.re) |
| Diseno de software empresarial & gestion de proyectos (AMOA) | [scaleinsight.fr](https://www.scaleinsight.fr) |
| Desarrollador freelance senior | [ethsam.fr](https://www.ethsam.fr) |
| Automatizacion & IA | [agence.re](https://www.agence.re) |
