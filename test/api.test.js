const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');

const { app } = require('../src/api');

// Start a test server
let server;
let baseUrl;

function startTestServer() {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
}

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const req = http.request(url, { method: options.method || 'GET', ...options }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.setHeader('Content-Type', 'application/json');
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

describe('api endpoints', () => {
  it('setup server', async () => {
    await startTestServer();
    assert.ok(baseUrl);
  });

  it('GET /help should return endpoint documentation', async () => {
    const res = await request('/help');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.name, 'Mailflow AI');
    assert.ok(Array.isArray(res.body.endpoints), 'Should have endpoints array');
    assert.ok(res.body.endpoints.length >= 16, 'Should have at least 16 endpoints');
  });

  it('GET /health should return status ok', async () => {
    const res = await request('/health');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.strictEqual(typeof res.body.dryRun, 'boolean');
    assert.ok(res.body._help, 'Should contain _help field');
  });

  it('every response should contain _help field', async () => {
    const res = await request('/health');

    assert.ok(res.body._help, '_help should be present');
    assert.ok(res.body._help.includes('/help'), '_help should reference /help');
  });

  it('GET /signature should return signature HTML', async () => {
    const res = await request('/signature');

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.signature, 'Should have signature');
    assert.ok(res.body._help, 'Should have _help');
  });

  it('GET /history should return history entries', async () => {
    const res = await request('/history');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(typeof res.body.count, 'number');
    assert.ok(Array.isArray(res.body.history));
  });

  it('POST /emails/send should require to and subject', async () => {
    const res = await request('/emails/send', {
      method: 'POST',
      body: { text: 'hello' },
    });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('required'));
  });

  it('POST /emails/send should work in dry-run', async () => {
    const res = await request('/emails/send', {
      method: 'POST',
      body: { to: 'test@example.com', subject: 'Test', text: 'Hello', dryRun: true },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.dryRun, true);
  });

  it('POST /emails/:uid/reply should require body', async () => {
    const res = await request('/emails/999/reply', {
      method: 'POST',
      body: {},
    });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('body is required'));
  });

  it('POST /emails/:uid/forward should require to', async () => {
    const res = await request('/emails/999/forward', {
      method: 'POST',
      body: {},
    });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('to is required'));
  });

  it('PUT /signature should require html', async () => {
    const res = await request('/signature', {
      method: 'PUT',
      body: {},
    });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('html is required'));
  });

  it('cleanup', () => {
    if (server) server.close();
  });
});
