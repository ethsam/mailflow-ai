#!/usr/bin/env node

/**
 * Example: Read unread emails
 *
 * Usage:
 *   node examples/read-unread.js
 */

require('dotenv').config();
const { listEmails, getEmail } = require('../src/imap');

async function main() {
  // List unread emails
  const emails = await listEmails({ unseen: true, limit: 10 });

  console.log(`Found ${emails.length} unread email(s):\n`);

  for (const email of emails) {
    const from = email.from?.[0]?.name || email.from?.[0]?.address || '?';
    console.log(`  UID:${email.uid} | ${from} | ${email.subject}`);
  }

  // Read the first one in detail
  if (emails.length > 0) {
    console.log('\n--- Reading first email ---\n');
    const detail = await getEmail(emails[0].uid);
    console.log(`From:    ${detail.from?.map((f) => f.address).join(', ')}`);
    console.log(`Subject: ${detail.subject}`);
    console.log(`Date:    ${detail.date}`);
    console.log(`\n${detail.text?.substring(0, 500) || '(no text content)'}`);
  }
}

main().catch(console.error);
