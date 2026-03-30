#!/usr/bin/env node

/**
 * Example: Send a basic email
 *
 * Usage:
 *   node examples/basic-send.js
 *
 * Note: DRY_RUN=true by default, so this won't actually send.
 * Set DRY_RUN=false in .env to send for real.
 */

require('dotenv').config();
const { sendEmail } = require('../src/smtp');

async function main() {
  const result = await sendEmail({
    to: 'recipient@example.com',
    subject: 'Hello from Mailbot',
    text: 'This is a test email sent by Mailbot.',
  });

  if (result.dryRun) {
    console.log('Dry-run mode: email was NOT sent.');
    console.log('Set DRY_RUN=false in .env to send for real.');
  } else {
    console.log('Email sent:', result.messageId);
  }
}

main().catch(console.error);
