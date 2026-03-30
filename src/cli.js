#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs');
const imap = require('./imap');
const smtp = require('./smtp');
const { setSignature, getSignature } = require('./signature');
const { startServer } = require('./api');

const program = new Command();

program
  .name('mail-client')
  .description('Mailflow AI — Email client for autonomous AI agents')
  .version('1.0.0');

// List emails
program
  .command('list')
  .description('List recent emails')
  .option('-u, --unseen', 'Only unread emails')
  .option('-l, --limit <n>', 'Max emails', '20')
  .option('-f, --from <addr>', 'Filter by sender')
  .option('-s, --subject <text>', 'Filter by subject')
  .option('--since <date>', 'Since date (YYYY-MM-DD)')
  .option('-m, --mailbox <name>', 'Mailbox', 'INBOX')
  .action(async (opts) => {
    try {
      const emails = await imap.listEmails({
        unseen: opts.unseen,
        limit: parseInt(opts.limit),
        from: opts.from,
        subject: opts.subject,
        since: opts.since,
        mailbox: opts.mailbox,
      });

      if (emails.length === 0) {
        console.log('No emails found.');
        return;
      }

      console.log(`\n${emails.length} email(s) found:\n`);
      emails.forEach((e) => {
        const flag = e.seen ? ' ' : '*';
        const from = e.from?.[0]?.name || e.from?.[0]?.address || '?';
        const date = new Date(e.date).toLocaleString('fr-FR', { timeZone: 'Indian/Reunion' });
        console.log(`  [${flag}] UID:${e.uid}  ${date}  ${from}`);
        console.log(`      ${e.subject}`);
      });
      console.log();
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

// Read email
program
  .command('read <uid>')
  .description('Read an email by UID')
  .option('-m, --mailbox <name>', 'Mailbox', 'INBOX')
  .action(async (uid, opts) => {
    try {
      const email = await imap.getEmail(parseInt(uid), opts.mailbox);
      if (!email) {
        console.error('Email not found');
        process.exit(1);
      }

      console.log(`\nFrom:    ${email.from?.map((f) => `${f.name} <${f.address}>`).join(', ')}`);
      console.log(`To:      ${email.to?.map((t) => `${t.name} <${t.address}>`).join(', ')}`);
      if (email.cc) console.log(`CC:      ${email.cc.map((c) => `${c.name} <${c.address}>`).join(', ')}`);
      console.log(`Date:    ${new Date(email.date).toLocaleString('fr-FR', { timeZone: 'Indian/Reunion' })}`);
      console.log(`Subject: ${email.subject}`);
      console.log(`UID:     ${email.uid}`);
      console.log(`Read:    ${email.seen ? 'Yes' : 'No'}`);
      if (email.attachments.length > 0) {
        console.log(`Attachments: ${email.attachments.map((a) => `${a.filename} (${a.size}b)`).join(', ')}`);
      }
      console.log(`\n--- Body ---\n`);
      console.log(email.text || '(no text content)');
      console.log();
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

// Send email
program
  .command('send')
  .description('Send an email')
  .requiredOption('--to <addr>', 'Recipient')
  .requiredOption('--subject <text>', 'Subject')
  .option('--body <text>', 'Body text')
  .option('--html <html>', 'HTML body')
  .option('--cc <addr>', 'CC')
  .option('--bcc <addr>', 'BCC')
  .option('--no-dry-run', 'Actually send (override DRY_RUN)')
  .option('--dry-run', 'Force dry-run mode')
  .action(async (opts) => {
    try {
      let dryRun;
      if (opts.dryRun === false) dryRun = false; // --no-dry-run
      else if (opts.dryRun === true) dryRun = true;

      const result = await smtp.sendEmail({
        to: opts.to,
        cc: opts.cc,
        bcc: opts.bcc,
        subject: opts.subject,
        text: opts.body,
        html: opts.html,
        dryRun,
      });

      if (result.dryRun) {
        console.log('\n[DRY-RUN] Email not sent. Use --no-dry-run to send for real.\n');
      } else {
        console.log('\nEmail sent successfully!\n');
      }
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

// Reply
program
  .command('reply <uid>')
  .description('Reply to an email')
  .requiredOption('--body <text>', 'Reply body')
  .option('-m, --mailbox <name>', 'Mailbox', 'INBOX')
  .option('--no-dry-run', 'Actually send')
  .option('--dry-run', 'Force dry-run')
  .action(async (uid, opts) => {
    try {
      const original = await imap.getEmail(parseInt(uid), opts.mailbox);
      if (!original) {
        console.error('Email not found');
        process.exit(1);
      }

      let dryRun;
      if (opts.dryRun === false) dryRun = false;
      else if (opts.dryRun === true) dryRun = true;

      const result = await smtp.replyEmail(original, opts.body, { dryRun });

      if (result.dryRun) {
        console.log('\n[DRY-RUN] Reply not sent. Use --no-dry-run to send for real.\n');
      } else {
        console.log('\nReply sent successfully!\n');
      }
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

// Forward
program
  .command('forward <uid>')
  .description('Forward an email')
  .requiredOption('--to <addr>', 'Forward to')
  .option('--body <text>', 'Additional message', '')
  .option('-m, --mailbox <name>', 'Mailbox', 'INBOX')
  .option('--no-dry-run', 'Actually send')
  .option('--dry-run', 'Force dry-run')
  .action(async (uid, opts) => {
    try {
      const original = await imap.getEmail(parseInt(uid), opts.mailbox);
      if (!original) {
        console.error('Email not found');
        process.exit(1);
      }

      let dryRun;
      if (opts.dryRun === false) dryRun = false;
      else if (opts.dryRun === true) dryRun = true;

      const result = await smtp.forwardEmail(original, opts.to, opts.body, { dryRun });

      if (result.dryRun) {
        console.log('\n[DRY-RUN] Forward not sent. Use --no-dry-run to send for real.\n');
      } else {
        console.log('\nEmail forwarded successfully!\n');
      }
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

// Delete
program
  .command('delete <uid>')
  .description('Delete an email (move to trash)')
  .option('-m, --mailbox <name>', 'Mailbox', 'INBOX')
  .action(async (uid, opts) => {
    try {
      await imap.deleteEmail(parseInt(uid), opts.mailbox);
      console.log(`Email ${uid} moved to trash.`);
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

// Archive
program
  .command('archive <uid>')
  .description('Archive an email')
  .option('-m, --mailbox <name>', 'Mailbox', 'INBOX')
  .action(async (uid, opts) => {
    try {
      await imap.archiveEmail(parseInt(uid), opts.mailbox);
      console.log(`Email ${uid} archived.`);
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

// Mark read/unread
program
  .command('mark <uid>')
  .description('Mark email as read or unread')
  .option('--read', 'Mark as read')
  .option('--unread', 'Mark as unread')
  .option('-m, --mailbox <name>', 'Mailbox', 'INBOX')
  .action(async (uid, opts) => {
    try {
      const seen = opts.unread ? false : true;
      await imap.markEmail(parseInt(uid), seen, opts.mailbox);
      console.log(`Email ${uid} marked as ${seen ? 'read' : 'unread'}.`);
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

// Set signature
program
  .command('set-signature')
  .description('Set email signature from file')
  .option('--file <path>', 'HTML signature file')
  .option('--text <html>', 'Inline HTML signature')
  .action(async (opts) => {
    try {
      let html;
      if (opts.file) {
        html = fs.readFileSync(opts.file, 'utf-8');
      } else if (opts.text) {
        html = opts.text;
      } else {
        console.log('Current signature:');
        console.log(getSignature());
        return;
      }
      setSignature(html);
      console.log('Signature updated.');
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

// List mailboxes
program
  .command('mailboxes')
  .description('List available mailboxes/folders')
  .action(async () => {
    try {
      const boxes = await imap.listMailboxes();
      console.log('\nMailboxes:\n');
      boxes.forEach((b) => console.log(`  ${b.path}`));
      console.log();
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

// Start API server
program
  .command('serve')
  .description('Start the REST API server')
  .action(() => {
    startServer();
  });

program.parse();
