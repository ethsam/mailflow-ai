const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('signature', () => {
  const sigPath = path.join(__dirname, '..', 'templates', 'signature.html');
  const examplePath = path.join(__dirname, '..', 'templates', 'signature.example.html');
  let originalSigExists;
  let originalSig;

  beforeEach(() => {
    // Save state
    originalSigExists = fs.existsSync(sigPath);
    if (originalSigExists) {
      originalSig = fs.readFileSync(sigPath, 'utf-8');
    }
    // Clear module cache to reset state
    delete require.cache[require.resolve('../src/signature')];
  });

  afterEach(() => {
    // Restore state
    if (originalSigExists) {
      fs.writeFileSync(sigPath, originalSig, 'utf-8');
    }
  });

  it('should auto-create signature.html from example if missing', () => {
    // Remove signature.html temporarily
    if (fs.existsSync(sigPath)) fs.unlinkSync(sigPath);
    delete require.cache[require.resolve('../src/signature')];

    const { getSignature } = require('../src/signature');
    const sig = getSignature();

    assert.ok(fs.existsSync(sigPath), 'signature.html should be created');
    const example = fs.readFileSync(examplePath, 'utf-8');
    assert.strictEqual(sig, example, 'Should match the example template');
  });

  it('should load signature from file', () => {
    const { getSignature } = require('../src/signature');
    const sig = getSignature();

    assert.ok(sig.length > 0, 'Signature should not be empty');
  });

  it('should set a new signature', () => {
    const { setSignature, getSignature } = require('../src/signature');
    const newSig = '<p>Test Signature</p>';

    setSignature(newSig);
    assert.strictEqual(getSignature(), newSig);
  });

  it('should append signature to HTML body', () => {
    const { appendSignature } = require('../src/signature');
    const body = '<p>Hello world</p>';
    const result = appendSignature(body);

    assert.ok(result.includes(body), 'Should contain original body');
    assert.ok(result.length > body.length, 'Should be longer than body alone');
  });

  it('should not append if signature is empty', () => {
    const { appendSignature } = require('../src/signature');
    // Force empty signature
    const sig = require('../src/signature');
    sig.setSignature('');
    delete require.cache[require.resolve('../src/signature')];

    const { appendSignature: append2 } = require('../src/signature');
    // Set empty again on fresh load
    require('../src/signature').setSignature('');

    const body = '<p>Hello</p>';
    const result = require('../src/signature').appendSignature(body);
    assert.strictEqual(result, body, 'Should return body unchanged when signature is empty');
  });
});
