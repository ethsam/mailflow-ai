const express = require('express');
const config = require('./config');
const imap = require('./imap');
const smtp = require('./smtp');
const { getSignature, setSignature } = require('./signature');
const history = require('./history');

const app = express();
app.use(express.json());

// Endpoint reference used by /help and injected into every response
const ENDPOINTS = [
  {
    method: 'GET',
    path: '/help',
    description: 'Documentation de tous les endpoints',
    params: {},
    example: 'curl http://localhost:3100/help',
  },
  {
    method: 'GET',
    path: '/health',
    description: 'Health check + statut dry-run',
    params: {},
    example: 'curl http://localhost:3100/health',
  },
  {
    method: 'GET',
    path: '/emails',
    description: 'Lister les emails',
    params: {
      query: {
        unseen: '(bool) Emails non lus uniquement',
        limit: '(number) Nombre max, defaut 20',
        from: '(string) Filtrer par expediteur',
        subject: '(string) Filtrer par sujet',
        since: '(string) Depuis une date YYYY-MM-DD',
        mailbox: '(string) Dossier, defaut INBOX',
      },
    },
    example: 'curl "http://localhost:3100/emails?unseen=true&limit=5"',
  },
  {
    method: 'GET',
    path: '/emails/:uid',
    description: 'Detail complet d\'un email (texte, HTML, pieces jointes)',
    params: {
      url: { uid: '(number) UID de l\'email' },
      query: { mailbox: '(string) Dossier, defaut INBOX' },
    },
    example: 'curl http://localhost:3100/emails/245',
  },
  {
    method: 'POST',
    path: '/emails/send',
    description: 'Envoyer un email (dry-run par defaut)',
    params: {
      body: {
        to: '(string) Destinataire — REQUIS',
        subject: '(string) Objet — REQUIS',
        text: '(string) Corps texte brut',
        html: '(string) Corps HTML',
        cc: '(string) Copie',
        bcc: '(string) Copie cachee',
        dryRun: '(bool) Forcer dry-run true/false',
      },
    },
    example: 'curl -X POST http://localhost:3100/emails/send -H "Content-Type: application/json" -d \'{"to":"x@example.com","subject":"Test","text":"Hello"}\'',
  },
  {
    method: 'POST',
    path: '/emails/:uid/reply',
    description: 'Repondre a un email (preserve le thread)',
    params: {
      url: { uid: '(number) UID de l\'email original' },
      body: {
        body: '(string) Texte de la reponse — REQUIS',
        dryRun: '(bool) Forcer dry-run true/false',
        mailbox: '(string) Dossier, defaut INBOX',
      },
    },
    example: 'curl -X POST http://localhost:3100/emails/245/reply -H "Content-Type: application/json" -d \'{"body":"Merci !"}\'',
  },
  {
    method: 'POST',
    path: '/emails/:uid/forward',
    description: 'Transferer un email',
    params: {
      url: { uid: '(number) UID de l\'email' },
      body: {
        to: '(string) Destinataire — REQUIS',
        body: '(string) Message additionnel',
        dryRun: '(bool) Forcer dry-run true/false',
        mailbox: '(string) Dossier, defaut INBOX',
      },
    },
    example: 'curl -X POST http://localhost:3100/emails/245/forward -H "Content-Type: application/json" -d \'{"to":"x@example.com"}\'',
  },
  {
    method: 'DELETE',
    path: '/emails/:uid',
    description: 'Supprimer un email (deplace vers la corbeille)',
    params: {
      url: { uid: '(number) UID de l\'email' },
      query: { mailbox: '(string) Dossier, defaut INBOX' },
    },
    example: 'curl -X DELETE http://localhost:3100/emails/245',
  },
  {
    method: 'POST',
    path: '/emails/:uid/archive',
    description: 'Archiver un email',
    params: {
      url: { uid: '(number) UID de l\'email' },
      query: { mailbox: '(string) Dossier, defaut INBOX' },
    },
    example: 'curl -X POST http://localhost:3100/emails/245/archive',
  },
  {
    method: 'PUT',
    path: '/emails/:uid/read',
    description: 'Marquer un email comme lu ou non lu',
    params: {
      url: { uid: '(number) UID de l\'email' },
      body: {
        seen: '(bool) true = lu, false = non lu',
        mailbox: '(string) Dossier, defaut INBOX',
      },
    },
    example: 'curl -X PUT http://localhost:3100/emails/245/read -H "Content-Type: application/json" -d \'{"seen":false}\'',
  },
  {
    method: 'POST',
    path: '/emails/:uid/move',
    description: 'Deplacer un email dans un dossier',
    params: {
      url: { uid: '(number) UID de l\'email' },
      body: {
        destination: '(string) Dossier cible — REQUIS',
        mailbox: '(string) Dossier source, defaut INBOX',
      },
    },
    example: 'curl -X POST http://localhost:3100/emails/245/move -H "Content-Type: application/json" -d \'{"destination":"[Gmail]/Important"}\'',
  },
  {
    method: 'GET',
    path: '/mailboxes',
    description: 'Lister les dossiers/labels disponibles',
    params: {},
    example: 'curl http://localhost:3100/mailboxes',
  },
  {
    method: 'GET',
    path: '/signature',
    description: 'Voir la signature actuelle',
    params: {},
    example: 'curl http://localhost:3100/signature',
  },
  {
    method: 'PUT',
    path: '/signature',
    description: 'Modifier la signature email',
    params: {
      body: { html: '(string) Contenu HTML de la signature — REQUIS' },
    },
    example: 'curl -X PUT http://localhost:3100/signature -H "Content-Type: application/json" -d \'{"html":"<p>Nouvelle signature</p>"}\'',
  },
  {
    method: 'GET',
    path: '/history',
    description: 'Historique des 50 dernieres actions (list, read, send, reply, forward, delete, archive, mark, move)',
    params: {
      query: {
        action: '(string) Filtrer par type: list, read, send, reply, forward, delete, archive, mark, move',
        limit: '(number) Nombre max d\'entrees',
        since: '(string) Depuis une date ISO (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss)',
      },
    },
    example: 'curl "http://localhost:3100/history?action=send&limit=10"',
  },
  {
    method: 'DELETE',
    path: '/history',
    description: 'Vider l\'historique',
    params: {},
    example: 'curl -X DELETE http://localhost:3100/history',
  },
];

// Helper: inject _help into every response
function withHelp(data) {
  return { ...data, _help: 'GET /help — Documentation de tous les endpoints' };
}

// Help endpoint
app.get('/help', (req, res) => {
  res.json({
    name: 'Mailflow AI',
    version: '1.0.0',
    account: config.email.user,
    dryRun: config.dryRun,
    endpoints: ENDPOINTS,
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json(withHelp({ status: 'ok', dryRun: config.dryRun }));
});

// List emails
app.get('/emails', async (req, res) => {
  try {
    const { unseen, limit, from, subject, since, mailbox } = req.query;
    const emails = await imap.listEmails({
      unseen: unseen === 'true',
      limit: limit ? parseInt(limit) : 20,
      from,
      subject,
      since,
      mailbox,
    });
    history.record('list', { filters: { unseen, limit, from, subject, since, mailbox }, count: emails.length });
    res.json(withHelp({ count: emails.length, emails }));
  } catch (err) {
    res.status(500).json(withHelp({ error: err.message }));
  }
});

// Get email detail
app.get('/emails/:uid', async (req, res) => {
  try {
    const uid = parseInt(req.params.uid);
    const { mailbox } = req.query;
    const email = await imap.getEmail(uid, mailbox);
    if (!email) return res.status(404).json(withHelp({ error: 'Email not found' }));
    history.record('read', { uid, from: email.from?.[0]?.address, subject: email.subject });
    res.json(withHelp(email));
  } catch (err) {
    res.status(500).json(withHelp({ error: err.message }));
  }
});

// Send email
app.post('/emails/send', async (req, res) => {
  try {
    const { to, cc, bcc, subject, text, html, dryRun } = req.body;
    if (!to || !subject) {
      return res.status(400).json(withHelp({ error: 'to and subject are required' }));
    }
    const result = await smtp.sendEmail({
      to,
      cc,
      bcc,
      subject,
      text,
      html,
      dryRun: dryRun !== undefined ? dryRun : undefined,
    });
    history.record('send', { to, subject, dryRun: !!result.dryRun });
    res.json(withHelp(result));
  } catch (err) {
    res.status(500).json(withHelp({ error: err.message }));
  }
});

// Reply to email
app.post('/emails/:uid/reply', async (req, res) => {
  try {
    const uid = parseInt(req.params.uid);
    const { body, dryRun, mailbox } = req.body;
    if (!body) return res.status(400).json(withHelp({ error: 'body is required' }));

    const original = await imap.getEmail(uid, mailbox);
    if (!original) return res.status(404).json(withHelp({ error: 'Email not found' }));

    const result = await smtp.replyEmail(original, body, {
      dryRun: dryRun !== undefined ? dryRun : undefined,
    });
    history.record('reply', { uid, to: original.from?.[0]?.address, subject: original.subject, dryRun: !!result.dryRun });
    res.json(withHelp(result));
  } catch (err) {
    res.status(500).json(withHelp({ error: err.message }));
  }
});

// Forward email
app.post('/emails/:uid/forward', async (req, res) => {
  try {
    const uid = parseInt(req.params.uid);
    const { to, body, dryRun, mailbox } = req.body;
    if (!to) return res.status(400).json(withHelp({ error: 'to is required' }));

    const original = await imap.getEmail(uid, mailbox);
    if (!original) return res.status(404).json(withHelp({ error: 'Email not found' }));

    const result = await smtp.forwardEmail(original, to, body || '', {
      dryRun: dryRun !== undefined ? dryRun : undefined,
    });
    history.record('forward', { uid, to, subject: original.subject, dryRun: !!result.dryRun });
    res.json(withHelp(result));
  } catch (err) {
    res.status(500).json(withHelp({ error: err.message }));
  }
});

// Delete email
app.delete('/emails/:uid', async (req, res) => {
  try {
    const uid = parseInt(req.params.uid);
    const { mailbox } = req.query;
    await imap.deleteEmail(uid, mailbox);
    history.record('delete', { uid });
    res.json(withHelp({ success: true, message: `Email ${uid} moved to trash` }));
  } catch (err) {
    res.status(500).json(withHelp({ error: err.message }));
  }
});

// Archive email
app.post('/emails/:uid/archive', async (req, res) => {
  try {
    const uid = parseInt(req.params.uid);
    const { mailbox } = req.query;
    await imap.archiveEmail(uid, mailbox);
    history.record('archive', { uid });
    res.json(withHelp({ success: true, message: `Email ${uid} archived` }));
  } catch (err) {
    res.status(500).json(withHelp({ error: err.message }));
  }
});

// Mark as read/unread
app.put('/emails/:uid/read', async (req, res) => {
  try {
    const uid = parseInt(req.params.uid);
    const { seen, mailbox } = req.body;
    await imap.markEmail(uid, seen !== false, mailbox);
    history.record('mark', { uid, seen: seen !== false });
    res.json(withHelp({ success: true, seen: seen !== false }));
  } catch (err) {
    res.status(500).json(withHelp({ error: err.message }));
  }
});

// Move email
app.post('/emails/:uid/move', async (req, res) => {
  try {
    const uid = parseInt(req.params.uid);
    const { destination, mailbox } = req.body;
    if (!destination) return res.status(400).json(withHelp({ error: 'destination is required' }));
    await imap.moveEmail(uid, destination, mailbox);
    history.record('move', { uid, destination });
    res.json(withHelp({ success: true, message: `Email ${uid} moved to ${destination}` }));
  } catch (err) {
    res.status(500).json(withHelp({ error: err.message }));
  }
});

// List mailboxes
app.get('/mailboxes', async (req, res) => {
  try {
    const mailboxes = await imap.listMailboxes();
    res.json(withHelp({ mailboxes }));
  } catch (err) {
    res.status(500).json(withHelp({ error: err.message }));
  }
});

// Get signature
app.get('/signature', (req, res) => {
  res.json(withHelp({ signature: getSignature() }));
});

// Update signature
app.put('/signature', (req, res) => {
  try {
    const { html } = req.body;
    if (!html) return res.status(400).json(withHelp({ error: 'html is required' }));
    setSignature(html);
    res.json(withHelp({ success: true }));
  } catch (err) {
    res.status(500).json(withHelp({ error: err.message }));
  }
});

// Get history
app.get('/history', (req, res) => {
  const { action, limit, since } = req.query;
  const entries = history.get({
    action,
    limit: limit ? parseInt(limit) : undefined,
    since,
  });
  res.json(withHelp({ count: entries.length, history: entries }));
});

// Clear history
app.delete('/history', (req, res) => {
  history.clear();
  res.json(withHelp({ success: true, message: 'History cleared' }));
});

function startServer() {
  app.listen(config.api.port, () => {
    console.log(`Mail API running on port ${config.api.port}`);
    console.log(`Dry-run mode: ${config.dryRun ? 'ON' : 'OFF'}`);
  });
}

module.exports = { app, startServer };
