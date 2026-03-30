const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('config', () => {
  it('should load environment variables', () => {
    const config = require('../src/config');

    assert.ok(config.email.user, 'EMAIL_USER should be set');
    assert.ok(config.email.pass, 'EMAIL_PASS should be set');
  });

  it('should have IMAP defaults', () => {
    const config = require('../src/config');

    assert.strictEqual(config.imap.host, 'imap.gmail.com');
    assert.strictEqual(config.imap.port, 993);
  });

  it('should have SMTP defaults', () => {
    const config = require('../src/config');

    assert.strictEqual(config.smtp.host, 'smtp.gmail.com');
    assert.strictEqual(config.smtp.port, 587);
  });

  it('should have API port', () => {
    const config = require('../src/config');

    assert.strictEqual(typeof config.api.port, 'number');
    assert.ok(config.api.port > 0, 'API port should be positive');
  });

  it('should have dry-run enabled by default', () => {
    const config = require('../src/config');

    assert.strictEqual(config.dryRun, true);
  });

  it('should have file paths defined', () => {
    const config = require('../src/config');

    assert.ok(config.paths.signature.endsWith('signature.html'));
    assert.ok(config.paths.sentLog.endsWith('sent.json'));
  });
});
