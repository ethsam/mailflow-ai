const fs = require('fs');
const path = require('path');

const HISTORY_FILE = path.join(__dirname, '..', 'logs', 'history.json');
const MAX_ENTRIES = 50;

/**
 * Load history from disk
 */
function load() {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

/**
 * Save history to disk (keeps last MAX_ENTRIES)
 */
function save(entries) {
  const trimmed = entries.slice(-MAX_ENTRIES);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
}

/**
 * Record an action in history
 * @param {string} action - Action type (list, read, send, reply, forward, delete, archive, mark, move)
 * @param {Object} details - Action details
 */
function record(action, details = {}) {
  const entries = load();
  entries.push({
    id: entries.length > 0 ? (entries[entries.length - 1].id || 0) + 1 : 1,
    action,
    timestamp: new Date().toISOString(),
    ...details,
  });
  save(entries);
}

/**
 * Get history, optionally filtered
 * @param {Object} opts
 * @param {string} opts.action - Filter by action type
 * @param {number} opts.limit - Max entries (default all)
 * @param {string} opts.since - Since date ISO string
 */
function get(opts = {}) {
  let entries = load();

  if (opts.action) {
    entries = entries.filter((e) => e.action === opts.action);
  }
  if (opts.since) {
    const sinceDate = new Date(opts.since);
    entries = entries.filter((e) => new Date(e.timestamp) >= sinceDate);
  }
  if (opts.limit) {
    entries = entries.slice(-opts.limit);
  }

  return entries;
}

/**
 * Clear history
 */
function clear() {
  save([]);
}

module.exports = { record, get, clear };
