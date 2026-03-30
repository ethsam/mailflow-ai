# Mailflow AI

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org/)

> **Languages:** [English](./README.md) | [Francais](./docs/README.fr.md) | [Espanol](./docs/README.es.md)

---

## What is this?

Mailflow AI is a Node.js tool that lets you **read, send, reply, forward, delete and organize emails** from the terminal or via a REST API.

It was built so an AI agent can manage an email inbox autonomously — but it works just as well for scripts, cron jobs, or any automation that needs to interact with an email account.

It connects to any IMAP/SMTP email server (Gmail, Outlook, or your own).

![List unread emails](./docs/assets/hero.gif)

## What it does and doesn't do

**Be aware before using this tool:**

| Question | Answer |
|----------|--------|
| Does it download attachments to my disk? | **No.** It reads attachment metadata (name, size, type) but never saves files to disk. |
| Does "delete" permanently remove emails? | **No.** It moves them to Trash. Your email provider keeps them ~30 days. |
| Does "archive" delete anything? | **No.** It moves emails from Inbox to "All Mail". Nothing is lost. |
| Does it store emails on my machine? | **No.** All emails stay on the IMAP server. It fetches on demand, nothing is cached locally. |
| Does marking as read affect the server? | **Yes.** It sets the `\Seen` flag on the IMAP server. Other email clients will see the change. |
| Does the cron script modify anything? | **No.** It only checks for unread emails and optionally sends a webhook notification. Read-only. |
| Is there rate limiting? | **No.** The tool doesn't throttle requests. Your email provider's limits apply (Gmail: ~500 sends/day). |

### What gets written to disk

Only 4 small JSON/HTML files, all in the project folder:

| File | What | When |
|------|------|------|
| `logs/sent.json` | Log of every email sent (or dry-run simulated) | After each send/reply/forward |
| `logs/history.json` | Last 50 API actions (type, timestamp, details) | After each API call |
| `logs/last-check.json` | Timestamp of last cron check | After each cron run |
| `templates/signature.html` | Your email signature (gitignored, survives updates) | When you set a signature |

No database. No hidden files. No telemetry.

### About dry-run mode

**Dry-run is ON by default.** When dry-run is active:

- `send`, `reply`, `forward` → **email is NOT sent**, only logged
- You see `[DRY-RUN]` in the output
- You must explicitly pass `--no-dry-run` (CLI) or `"dryRun": false` (API) to send for real

**However, these actions always execute immediately, even in dry-run:**
- **Delete** (moves to Trash)
- **Archive** (moves to All Mail)
- **Mark as read/unread** (changes flag on server)
- **Move** (moves to folder)

This is by design — these operations are reversible and don't send anything outward.

## Quick Start

```bash
git clone git@github.com:ethsam/mailflow-ai.git
cd mailflow-ai
npm install
cp .env.example .env   # Edit with your email credentials
```

Test that it works:

```bash
node src/cli.js list --limit 5
```

You should see your latest emails listed in the terminal.

## Configuration

Edit `.env` (copy from `.env.example`):

```env
EMAIL_USER=you@example.com       # Your email address
EMAIL_PASS=xxxx xxxx xxxx xxxx   # App Password (NOT your regular password)
IMAP_HOST=imap.gmail.com         # Your IMAP server
IMAP_PORT=993
SMTP_HOST=smtp.gmail.com         # Your SMTP server
SMTP_PORT=587
API_PORT=3100                    # REST API port
DRY_RUN=true                     # true = emails are NOT sent (safe default)
WEBHOOK_URL=                     # Optional: URL to notify when new emails arrive
```

> **You need an App Password**, not your regular password.
> Gmail: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
> Also enable IMAP in your Gmail settings.

## CLI

```bash
node src/cli.js <command> [options]
```

### Read emails

```bash
node src/cli.js list                              # Last 20 emails
node src/cli.js list --unseen                     # Unread only
node src/cli.js list --from "boss@company.com"    # Filter by sender
node src/cli.js list --subject "invoice"           # Filter by subject
node src/cli.js list --since 2026-03-01           # Since a date
node src/cli.js list --limit 5                    # Limit results
node src/cli.js read 245                          # Full email content by UID
```

### Send emails

![Send email dry-run](./docs/assets/send.gif)

```bash
# Dry-run (default) — email is NOT sent, just logged
node src/cli.js send --to "user@example.com" --subject "Hello" --body "Hi there"

# Actually send
node src/cli.js send --to "user@example.com" --subject "Hello" --body "Hi there" --no-dry-run
```

### Reply and forward

```bash
node src/cli.js reply 245 --body "Thanks!" --no-dry-run
node src/cli.js forward 245 --to "colleague@example.com" --no-dry-run
```

### Manage emails

```bash
node src/cli.js delete 245           # Move to trash (not permanent)
node src/cli.js archive 245          # Move to All Mail
node src/cli.js mark 245 --read      # Mark as read
node src/cli.js mark 245 --unread    # Mark as unread
node src/cli.js mailboxes            # List all folders
```

### Signature

```bash
node src/cli.js set-signature                          # View current
node src/cli.js set-signature --file my-signature.html # Set from file

# On first run, templates/signature.html is auto-created from signature.example.html
# Edit templates/signature.html — it's gitignored, so your signature survives updates
```

## REST API

```bash
node src/cli.js serve
# => Mail API running on port 3100
```

### Self-documenting

![API request](./docs/assets/api.gif)

```bash
curl http://localhost:3100/help
```

Every response includes a `_help` field pointing to `GET /help`.

### All endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/help` | Full API documentation with params and examples |
| `GET` | `/health` | Health check + dry-run status |
| `GET` | `/emails` | List emails (`?unseen=true&limit=5&from=x&subject=x&since=2026-03-01`) |
| `GET` | `/emails/:uid` | Full email content (text, HTML, attachment metadata) |
| `POST` | `/emails/send` | Send email (respects dry-run) |
| `POST` | `/emails/:uid/reply` | Reply preserving thread |
| `POST` | `/emails/:uid/forward` | Forward to someone |
| `DELETE` | `/emails/:uid` | Move to trash |
| `POST` | `/emails/:uid/archive` | Archive |
| `PUT` | `/emails/:uid/read` | Mark read/unread (`{"seen": true}` or `false`) |
| `POST` | `/emails/:uid/move` | Move to folder (`{"destination": "[Gmail]/Important"}`) |
| `GET` | `/mailboxes` | List available folders |
| `GET` | `/signature` | View signature |
| `PUT` | `/signature` | Update signature (`{"html": "..."}`) |
| `GET` | `/history` | Action history (`?action=send&limit=10&since=2026-03-01`) |
| `DELETE` | `/history` | Clear history |

### Examples

```bash
# List unread
curl http://localhost:3100/emails?unseen=true

# Send (dry-run by default)
curl -X POST http://localhost:3100/emails/send \
  -H "Content-Type: application/json" \
  -d '{"to":"user@example.com","subject":"Test","text":"Hello"}'

# Send for real
curl -X POST http://localhost:3100/emails/send \
  -H "Content-Type: application/json" \
  -d '{"to":"user@example.com","subject":"Test","text":"Hello","dryRun":false}'

# Reply
curl -X POST http://localhost:3100/emails/245/reply \
  -H "Content-Type: application/json" \
  -d '{"body":"Thanks!"}'

# Check action history
curl "http://localhost:3100/history?action=send&limit=10"
```

## Cron (Scheduled Check)

`cron.js` checks for new unread emails periodically. **It only reads, it never modifies anything on the server.**

```bash
# Manual test
node cron.js

# Crontab — every hour
0 * * * * cd /path/to/mailflow-ai && node cron.js >> logs/cron.log 2>&1
```

If `WEBHOOK_URL` is set in `.env`, it sends a POST with:
```json
{
  "type": "new_emails",
  "count": 3,
  "emails": [
    {"uid": 245, "from": "contact@example.com", "subject": "Hello", "date": "..."}
  ]
}
```

## Network Connections

The tool makes these connections and nothing else:

| Connection | When | Port | Protocol |
|------------|------|------|----------|
| IMAP server | Every read/list/delete/archive/mark/move | 993 | TLS |
| SMTP server | Every send/reply/forward (not in dry-run) | 587 | STARTTLS |
| Webhook URL | Cron only, if configured and new emails found | varies | HTTPS |

No analytics. No tracking. No third-party services.

## Cron + Webhook

The included `cron.js` script checks for new unread emails and optionally sends a webhook notification.

### How it works

1. Checks for unread emails since last run
2. If new emails are found:
   - Logs summary to console
   - Sends webhook notification (if `WEBHOOK_URL` is configured)
3. Saves last check timestamp to `logs/last-check.json`

**It never modifies emails** — read-only operation.

### Setup

Add to your crontab to run every hour:

```bash
0 * * * * cd /path/to/mailflow-ai && node cron.js >> logs/cron.log 2>&1
```

Or manually:

```bash
node cron.js
```

### Webhook payload

When new emails are detected and `WEBHOOK_URL` is configured, the cron sends:

```json
{
  "type": "new_emails",
  "count": 2,
  "timestamp": "2026-03-30T14:30:00.000Z",
  "account": "you@example.com",
  "emails": [
    {
      "uid": 245,
      "from": "sender@example.com",
      "fromName": "John Doe",
      "subject": "Important update",
      "date": "2026-03-30T10:15:00.000Z"
    }
  ]
}
```

Use this to trigger:
- AI agent processing (OpenClaw, n8n, Zapier)
- Slack/Discord notifications
- Custom automation workflows

**Example webhook endpoint:** `http://100.69.74.34:3200/handle-emails`

Leave `WEBHOOK_URL` empty in `.env` to disable webhook notifications.

## Tests

```bash
npm test
```

34 tests covering all modules using Node.js built-in test runner (`node --test`):

| Suite | Tests | What it covers |
|-------|-------|----------------|
| `config` | 6 | Environment variables, defaults, paths |
| `signature` | 5 | Load, set, append, auto-create from example |
| `history` | 7 | Record, filter, limit (50 max), clear |
| `api` | 12 | All endpoints, validation, dry-run behavior |
| `modules` | 4 | IMAP/SMTP/history/signature exports |

No external test dependencies.

## Architecture

```
src/
  config.js       Environment config (.env)
  imap.js         IMAP client — read, list, mark, delete, archive, move
  smtp.js         SMTP client — send, reply, forward + sent logging
  signature.js    HTML signature — load, set, auto-create from example
  history.js      Action history — 50 max, auto-rotation
  api.js          REST API — 16 endpoints, self-documenting
  cli.js          CLI — all commands via Commander
cron.js           Scheduled unread check + webhook notification
templates/
  signature.example.html   Default signature template (versioned)
  signature.html           Your signature (gitignored, auto-created)
examples/
  basic-send.js            Send a simple email
  read-unread.js           Read unread emails
  auto-reply.js            Auto-reply to unread emails
test/                      34 tests (Node.js built-in runner)
logs/                      sent.json, history.json, last-check.json
```

## License

[MIT](./LICENSE) — Free and open source.

> **Maintenance Notice**
> This project is maintained solo by Samuel ETHEVE on his spare time.
> It's free. There's no paid support, no SLA, no guarantees.
> Bug reports are welcome. Fixes come when they come.

## Author

**Samuel ETHEVE** — Developer & Entrepreneur

- [setheve@viceversa.re](mailto:setheve@viceversa.re) | +262 692 38 00 28 | [@ethsam974](https://t.me/ethsam974)

| Need | Website |
|------|---------|
| Communication, marketing & events | [viceversa.re](https://www.viceversa.re) |
| Business software design & project management (AMOA) | [scaleinsight.fr](https://www.scaleinsight.fr) |
| Senior freelance developer | [ethsam.fr](https://www.ethsam.fr) |
| AI & automation solutions | [agence.re](https://www.agence.re) |
