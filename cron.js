#!/usr/bin/env node

/**
 * Cron script - Check for new unread emails
 * Run every hour via crontab on Thalassa
 * 0 * * * * cd /path/to/client-mail && node cron.js
 */

require('dotenv').config();
const imap = require('./src/imap');
const fs = require('fs');
const path = require('path');

const LAST_CHECK_FILE = path.join(__dirname, 'logs', 'last-check.json');
const WEBHOOK_URL = process.env.WEBHOOK_URL; // OpenClaw notification URL

async function checkNewEmails() {
  const now = new Date();
  let lastCheck;

  try {
    const data = JSON.parse(fs.readFileSync(LAST_CHECK_FILE, 'utf-8'));
    lastCheck = data.lastCheck;
  } catch {
    // First run - check last 24h
    lastCheck = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  }

  console.log(`[${now.toISOString()}] Checking emails since ${lastCheck}...`);

  try {
    const emails = await imap.listEmails({
      unseen: true,
      limit: 50,
      since: lastCheck.split('T')[0],
    });

    if (emails.length > 0) {
      console.log(`${emails.length} unread email(s) found.`);

      // Notify via webhook if configured
      if (WEBHOOK_URL) {
        const summary = emails.map((e) => ({
          uid: e.uid,
          from: e.from?.[0]?.address,
          subject: e.subject,
          date: e.date,
        }));

        try {
          await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'new_emails',
              count: emails.length,
              emails: summary,
            }),
          });
          console.log('Notification sent to webhook.');
        } catch (err) {
          console.error('Webhook notification failed:', err.message);
        }
      }

      // Print summary
      emails.forEach((e) => {
        const from = e.from?.[0]?.name || e.from?.[0]?.address || '?';
        console.log(`  - [${e.uid}] ${from}: ${e.subject}`);
      });
    } else {
      console.log('No new unread emails.');
    }

    // Save last check time
    fs.writeFileSync(LAST_CHECK_FILE, JSON.stringify({ lastCheck: now.toISOString() }), 'utf-8');
  } catch (err) {
    console.error('Error checking emails:', err.message);
    process.exit(1);
  }
}

checkNewEmails();
