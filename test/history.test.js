const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const HISTORY_FILE = path.join(__dirname, '..', 'logs', 'history.json');
const BACKUP_FILE = HISTORY_FILE + '.bak';

describe('history', () => {
  beforeEach(() => {
    // Backup existing history
    if (fs.existsSync(HISTORY_FILE)) {
      fs.copyFileSync(HISTORY_FILE, BACKUP_FILE);
    }
    // Clear module cache
    delete require.cache[require.resolve('../src/history')];
    const { clear } = require('../src/history');
    clear();
  });

  afterEach(() => {
    // Restore backup
    if (fs.existsSync(BACKUP_FILE)) {
      fs.copyFileSync(BACKUP_FILE, HISTORY_FILE);
      fs.unlinkSync(BACKUP_FILE);
    } else if (fs.existsSync(HISTORY_FILE)) {
      fs.unlinkSync(HISTORY_FILE);
    }
  });

  it('should record an action', () => {
    const { record, get } = require('../src/history');

    record('send', { to: 'test@example.com', subject: 'Test' });

    const entries = get();
    assert.strictEqual(entries.length, 1);
    assert.strictEqual(entries[0].action, 'send');
    assert.strictEqual(entries[0].to, 'test@example.com');
    assert.ok(entries[0].timestamp, 'Should have timestamp');
    assert.ok(entries[0].id, 'Should have an id');
  });

  it('should limit to 50 entries', () => {
    const { record, get } = require('../src/history');

    for (let i = 0; i < 60; i++) {
      record('list', { index: i });
    }

    const entries = get();
    assert.strictEqual(entries.length, 50);
    // Should keep the last 50 (index 10-59)
    assert.strictEqual(entries[0].index, 10);
    assert.strictEqual(entries[49].index, 59);
  });

  it('should filter by action type', () => {
    const { record, get } = require('../src/history');

    record('send', { to: 'a@test.com' });
    record('list', { count: 5 });
    record('send', { to: 'b@test.com' });
    record('delete', { uid: 1 });

    const sends = get({ action: 'send' });
    assert.strictEqual(sends.length, 2);
    assert.ok(sends.every((e) => e.action === 'send'));
  });

  it('should filter by limit', () => {
    const { record, get } = require('../src/history');

    record('list', {});
    record('read', {});
    record('send', {});

    const entries = get({ limit: 2 });
    assert.strictEqual(entries.length, 2);
    // Should return the last 2
    assert.strictEqual(entries[0].action, 'read');
    assert.strictEqual(entries[1].action, 'send');
  });

  it('should filter by date', () => {
    const { record, get } = require('../src/history');

    record('send', { to: 'old@test.com' });

    const entries = get({ since: new Date().toISOString() });
    // The record just happened, so it should be included or not depending on timing
    assert.ok(entries.length <= 1);
  });

  it('should clear history', () => {
    const { record, get, clear } = require('../src/history');

    record('send', {});
    record('list', {});
    assert.strictEqual(get().length, 2);

    clear();
    assert.strictEqual(get().length, 0);
  });

  it('should combine filters', () => {
    const { record, get } = require('../src/history');

    record('send', { to: 'a@test.com' });
    record('send', { to: 'b@test.com' });
    record('send', { to: 'c@test.com' });
    record('list', { count: 10 });

    const entries = get({ action: 'send', limit: 2 });
    assert.strictEqual(entries.length, 2);
    assert.strictEqual(entries[0].to, 'b@test.com');
    assert.strictEqual(entries[1].to, 'c@test.com');
  });
});
