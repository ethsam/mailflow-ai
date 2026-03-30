const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { appendSignature } = require('./signature');

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: false,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

/**
 * Log sent email to logs/sent.json
 */
function logSent(entry) {
  let logs = [];
  try {
    const raw = fs.readFileSync(config.paths.sentLog, 'utf-8');
    logs = JSON.parse(raw);
  } catch {
    // File doesn't exist yet
  }
  logs.push({ ...entry, timestamp: new Date().toISOString() });
  fs.writeFileSync(config.paths.sentLog, JSON.stringify(logs, null, 2), 'utf-8');
}

/**
 * Send an email
 * @param {Object} opts
 * @param {string} opts.to - Recipient(s)
 * @param {string} opts.cc - CC recipient(s)
 * @param {string} opts.bcc - BCC recipient(s)
 * @param {string} opts.subject - Subject
 * @param {string} opts.text - Plain text body
 * @param {string} opts.html - HTML body
 * @param {Array} opts.attachments - Nodemailer attachments
 * @param {boolean} opts.noSignature - Skip signature
 * @param {boolean} opts.dryRun - Override global dry-run
 * @param {string} opts.inReplyTo - Message-ID for threading
 * @param {string|string[]} opts.references - References for threading
 */
async function sendEmail(opts) {
  const {
    to,
    cc,
    bcc,
    subject,
    text,
    html,
    attachments,
    noSignature = false,
    dryRun,
    inReplyTo,
    references,
  } = opts;

  const isDryRun = dryRun !== undefined ? dryRun : config.dryRun;

  let finalHtml = html || `<div>${(text || '').replace(/\n/g, '<br>')}</div>`;
  if (!noSignature) {
    finalHtml = appendSignature(finalHtml);
  }

  const mailOptions = {
    from: config.email.user,
    to,
    cc,
    bcc,
    subject,
    text: text || undefined,
    html: finalHtml,
    attachments,
    inReplyTo,
    references,
  };

  if (isDryRun) {
    const entry = { type: 'dry-run', ...mailOptions };
    logSent(entry);
    console.log('[DRY-RUN] Email NOT sent:', { to, subject });
    return { dryRun: true, mailOptions };
  }

  const info = await transporter.sendMail(mailOptions);
  const entry = { type: 'sent', messageId: info.messageId, to, subject };
  logSent(entry);
  console.log('[SENT]', info.messageId, '→', to);
  return { messageId: info.messageId, info };
}

/**
 * Reply to an email
 */
async function replyEmail(originalEmail, body, opts = {}) {
  const subject = originalEmail.subject?.startsWith('Re:')
    ? originalEmail.subject
    : `Re: ${originalEmail.subject}`;

  const replyTo = originalEmail.from?.[0]?.address || originalEmail.from;

  // Build references chain
  const refs = [];
  if (originalEmail.references) {
    if (Array.isArray(originalEmail.references)) {
      refs.push(...originalEmail.references);
    } else {
      refs.push(originalEmail.references);
    }
  }
  if (originalEmail.messageId) {
    refs.push(originalEmail.messageId);
  }

  // Quote original
  const quotedHtml = `
    <div>${body.replace(/\n/g, '<br>')}</div>
    <br>
    <div style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 5px; color: #666;">
      <p>Le ${new Date(originalEmail.date).toLocaleString('fr-FR', { timeZone: 'Indian/Reunion' })}, ${originalEmail.from?.[0]?.name || replyTo} a écrit :</p>
      ${originalEmail.html || originalEmail.text || ''}
    </div>
  `;

  return sendEmail({
    to: replyTo,
    subject,
    html: quotedHtml,
    inReplyTo: originalEmail.messageId,
    references: refs,
    ...opts,
  });
}

/**
 * Forward an email
 */
async function forwardEmail(originalEmail, to, body = '', opts = {}) {
  const subject = originalEmail.subject?.startsWith('Fwd:')
    ? originalEmail.subject
    : `Fwd: ${originalEmail.subject}`;

  const forwardHtml = `
    <div>${body.replace(/\n/g, '<br>')}</div>
    <br>
    <div style="border: 1px solid #ccc; padding: 10px; margin: 10px 0;">
      <p><strong>---------- Message transféré ----------</strong></p>
      <p><strong>De :</strong> ${originalEmail.from?.[0]?.name || ''} &lt;${originalEmail.from?.[0]?.address || ''}&gt;</p>
      <p><strong>Date :</strong> ${new Date(originalEmail.date).toLocaleString('fr-FR', { timeZone: 'Indian/Reunion' })}</p>
      <p><strong>Objet :</strong> ${originalEmail.subject}</p>
      <p><strong>À :</strong> ${originalEmail.to?.map((t) => t.address).join(', ') || ''}</p>
      <hr>
      ${originalEmail.html || originalEmail.text || ''}
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html: forwardHtml,
    ...opts,
  });
}

/**
 * Verify SMTP connection
 */
async function verifyConnection() {
  return transporter.verify();
}

module.exports = { sendEmail, replyEmail, forwardEmail, verifyConnection };
