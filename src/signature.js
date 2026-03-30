const fs = require('fs');
const path = require('path');
const config = require('./config');

const SIGNATURE_FILE = config.paths.signature;
const SIGNATURE_EXAMPLE = path.join(path.dirname(SIGNATURE_FILE), 'signature.example.html');

let currentSignature = null;

/**
 * Ensure signature.html exists by copying from example if needed
 */
function ensureSignatureFile() {
  if (!fs.existsSync(SIGNATURE_FILE) && fs.existsSync(SIGNATURE_EXAMPLE)) {
    fs.copyFileSync(SIGNATURE_EXAMPLE, SIGNATURE_FILE);
  }
}

/**
 * Load signature from file or return cached version
 */
function getSignature() {
  if (currentSignature) return currentSignature;
  ensureSignatureFile();
  try {
    currentSignature = fs.readFileSync(SIGNATURE_FILE, 'utf-8');
  } catch {
    currentSignature = '';
  }
  return currentSignature;
}

/**
 * Set a new signature (HTML string)
 */
function setSignature(html) {
  currentSignature = html;
  fs.writeFileSync(SIGNATURE_FILE, html, 'utf-8');
}

/**
 * Append signature to HTML body
 */
function appendSignature(htmlBody) {
  const sig = getSignature();
  if (!sig) return htmlBody;
  return `${htmlBody}<br>\n${sig}`;
}

module.exports = { getSignature, setSignature, appendSignature };
