require('dotenv').config();
const path = require('path');

module.exports = {
  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  imap: {
    host: process.env.IMAP_HOST || 'imap.gmail.com',
    port: parseInt(process.env.IMAP_PORT || '993'),
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
  },
  api: {
    port: parseInt(process.env.API_PORT || '3100'),
  },
  dryRun: process.env.DRY_RUN !== 'false',
  paths: {
    signature: path.join(__dirname, '..', 'templates', 'signature.html'),
    sentLog: path.join(__dirname, '..', 'logs', 'sent.json'),
  },
};
