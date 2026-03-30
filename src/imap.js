const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const config = require('./config');

function createClient() {
  return new ImapFlow({
    host: config.imap.host,
    port: config.imap.port,
    secure: true,
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
    logger: false,
  });
}

/**
 * List emails from a mailbox
 * @param {Object} opts
 * @param {string} opts.mailbox - Mailbox name (default: INBOX)
 * @param {boolean} opts.unseen - Only unseen messages
 * @param {number} opts.limit - Max messages to return (default: 20)
 * @param {string} opts.from - Filter by sender
 * @param {string} opts.subject - Filter by subject
 * @param {string} opts.since - Filter by date (YYYY-MM-DD)
 */
async function listEmails(opts = {}) {
  const {
    mailbox = 'INBOX',
    unseen = false,
    limit = 20,
    from,
    subject,
    since,
  } = opts;

  const client = createClient();
  const emails = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock(mailbox);

    try {
      // Build search query
      const query = {};
      if (unseen) query.seen = false;
      if (from) query.from = from;
      if (subject) query.subject = subject;
      if (since) query.since = new Date(since);

      const messages = [];
      for await (const msg of client.fetch(
        { ...query },
        {
          uid: true,
          flags: true,
          envelope: true,
          bodyStructure: true,
        },
        { uid: true }
      )) {
        messages.push({
          uid: msg.uid,
          flags: [...msg.flags],
          date: msg.envelope.date,
          from: msg.envelope.from,
          to: msg.envelope.to,
          subject: msg.envelope.subject,
          seen: msg.flags.has('\\Seen'),
        });
      }

      // Sort by date desc, apply limit
      messages.sort((a, b) => new Date(b.date) - new Date(a.date));
      emails.push(...messages.slice(0, limit));
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return emails;
}

/**
 * Get full email content by UID
 */
async function getEmail(uid, mailbox = 'INBOX') {
  const client = createClient();

  try {
    await client.connect();
    const lock = await client.getMailboxLock(mailbox);

    try {
      const message = await client.fetchOne(
        uid,
        { source: true, uid: true, flags: true, envelope: true },
        { uid: true }
      );

      if (!message) return null;

      const parsed = await simpleParser(message.source);

      return {
        uid,
        messageId: parsed.messageId,
        inReplyTo: parsed.inReplyTo,
        references: parsed.references,
        from: parsed.from?.value,
        to: parsed.to?.value,
        cc: parsed.cc?.value,
        subject: parsed.subject,
        date: parsed.date,
        text: parsed.text,
        html: parsed.html || parsed.textAsHtml,
        attachments: (parsed.attachments || []).map((a) => ({
          filename: a.filename,
          contentType: a.contentType,
          size: a.size,
        })),
        flags: [...message.flags],
        seen: message.flags.has('\\Seen'),
      };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

/**
 * Mark email as seen/unseen
 */
async function markEmail(uid, seen = true, mailbox = 'INBOX') {
  const client = createClient();

  try {
    await client.connect();
    const lock = await client.getMailboxLock(mailbox);

    try {
      if (seen) {
        await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
      } else {
        await client.messageFlagsRemove(uid, ['\\Seen'], { uid: true });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

/**
 * Delete email (move to Trash)
 */
async function deleteEmail(uid, mailbox = 'INBOX') {
  const client = createClient();

  try {
    await client.connect();
    const lock = await client.getMailboxLock(mailbox);

    try {
      await client.messageMove(uid, '[Gmail]/Corbeille', { uid: true });
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

/**
 * Archive email (remove from Inbox, keep in All Mail)
 */
async function archiveEmail(uid, mailbox = 'INBOX') {
  const client = createClient();

  try {
    await client.connect();
    const lock = await client.getMailboxLock(mailbox);

    try {
      await client.messageMove(uid, '[Gmail]/Tous les messages', { uid: true });
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

/**
 * Move email to a specific folder/label
 */
async function moveEmail(uid, destination, mailbox = 'INBOX') {
  const client = createClient();

  try {
    await client.connect();
    const lock = await client.getMailboxLock(mailbox);

    try {
      await client.messageMove(uid, destination, { uid: true });
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

/**
 * List available mailboxes
 */
async function listMailboxes() {
  const client = createClient();

  try {
    await client.connect();
    const mailboxes = await client.list();
    return mailboxes.map((m) => ({
      path: m.path,
      name: m.name,
      flags: [...m.flags],
    }));
  } finally {
    await client.logout();
  }
}

module.exports = {
  listEmails,
  getEmail,
  markEmail,
  deleteEmail,
  archiveEmail,
  moveEmail,
  listMailboxes,
};
