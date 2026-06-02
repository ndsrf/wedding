'use strict';

// CJS stub for @exodus/bytes/base64.js
// Used by jsdom's jsdom-dispatcher.js for base64-encoding HTTP auth credentials.

function toBase64(data) {
  const buf = typeof data === 'string' ? Buffer.from(data, 'binary') : Buffer.from(data);
  return buf.toString('base64');
}

function fromBase64(str) {
  return new Uint8Array(Buffer.from(str, 'base64'));
}

function toBase64url(data) {
  const buf = typeof data === 'string' ? Buffer.from(data, 'binary') : Buffer.from(data);
  return buf.toString('base64url');
}

function fromBase64url(str) {
  return new Uint8Array(Buffer.from(str, 'base64url'));
}

function fromBase64any(str) {
  const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '==='.slice(0, (4 - (normalized.length % 4)) % 4);
  return new Uint8Array(Buffer.from(padded, 'base64'));
}

module.exports = { toBase64, fromBase64, toBase64url, fromBase64url, fromBase64any };
