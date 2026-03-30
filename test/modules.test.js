const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('imap module', () => {
  it('should export all expected functions', () => {
    const imap = require('../src/imap');

    const expected = [
      'listEmails',
      'getEmail',
      'markEmail',
      'deleteEmail',
      'archiveEmail',
      'moveEmail',
      'listMailboxes',
    ];

    for (const fn of expected) {
      assert.strictEqual(typeof imap[fn], 'function', `imap.${fn} should be a function`);
    }
  });
});

describe('smtp module', () => {
  it('should export all expected functions', () => {
    const smtp = require('../src/smtp');

    const expected = ['sendEmail', 'replyEmail', 'forwardEmail', 'verifyConnection'];

    for (const fn of expected) {
      assert.strictEqual(typeof smtp[fn], 'function', `smtp.${fn} should be a function`);
    }
  });
});

describe('history module', () => {
  it('should export all expected functions', () => {
    const history = require('../src/history');

    const expected = ['record', 'get', 'clear'];

    for (const fn of expected) {
      assert.strictEqual(typeof history[fn], 'function', `history.${fn} should be a function`);
    }
  });
});

describe('signature module', () => {
  it('should export all expected functions', () => {
    const signature = require('../src/signature');

    const expected = ['getSignature', 'setSignature', 'appendSignature'];

    for (const fn of expected) {
      assert.strictEqual(typeof signature[fn], 'function', `signature.${fn} should be a function`);
    }
  });
});
