#!/usr/bin/env node

/**
 * Example: Auto-reply to unread emails
 *
 * Usage:
 *   node examples/auto-reply.js
 *
 * This script:
 * 1. Fetches all unread emails
 * 2. Sends an auto-reply to each
 * 3. Marks them as read
 *
 * Note: DRY_RUN=true by default. Set to false in .env to send for real.
 */

require('dotenv').config();
const { listEmails, getEmail, markEmail } = require('../src/imap');
const { replyEmail } = require('../src/smtp');

const AUTO_REPLY_MESSAGE =
  'Thank you for your email. I will get back to you shortly.\n\n' +
  'This is an automated response.';

async function main() {
  const emails = await listEmails({ unseen: true, limit: 10 });

  if (emails.length === 0) {
    console.log('No unread emails to reply to.');
    return;
  }

  console.log(`Found ${emails.length} unread email(s). Processing...\n`);

  for (const email of emails) {
    const detail = await getEmail(email.uid);
    const from = detail.from?.[0]?.address || '?';

    console.log(`Replying to: ${from} — "${detail.subject}"`);

    const result = await replyEmail(detail, AUTO_REPLY_MESSAGE);

    if (result.dryRun) {
      console.log('  [DRY-RUN] Reply not sent');
    } else {
      console.log(`  Replied: ${result.messageId}`);
      // Mark as read after replying
      await markEmail(email.uid, true);
      console.log('  Marked as read');
    }
  }

  console.log('\nDone.');
}

main().catch(console.error);
