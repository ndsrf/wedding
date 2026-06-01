'use strict';

// CJS stub for @exodus/bytes/whatwg.js
// Used by whatwg-url@16 for percent-encode-after-encoding (WHATWG URL spec).

const { labelToName } = require('./encoding-lite.js');

const UNSUPPORTED = new Set(['replacement', 'UTF-16LE', 'UTF-16BE']);

/**
 * https://url.spec.whatwg.org/#concept-url-serializer (percent-encode-after-encoding)
 * @param {string} encoding  - WHATWG encoding label
 * @param {string} input     - scalar-value string to encode
 * @param {string} percentEncodeSet - ASCII chars to additionally percent-encode
 * @param {boolean} [spaceAsPlus]
 */
function percentEncodeAfterEncoding(encoding, input, percentEncodeSet, spaceAsPlus = false) {
  const name = labelToName(encoding);
  if (!name) throw new RangeError(`Unknown encoding: ${encoding}`);
  if (UNSUPPORTED.has(name)) throw new RangeError(`Encoding ${name} is not supported`);

  const utf8Encoder = new TextEncoder();
  let output = '';

  for (const char of input) {
    if (spaceAsPlus && char === ' ') {
      output += '+';
      continue;
    }

    // Encode the character — use UTF-8 for UTF-8, fall back for others
    const bytes = utf8Encoder.encode(char);

    for (const byte of bytes) {
      const isC0OrHigh = byte < 0x21 || byte > 0x7E;
      const inSet = !isC0OrHigh && percentEncodeSet.includes(String.fromCharCode(byte));
      if (isC0OrHigh || inSet) {
        output += '%' + byte.toString(16).toUpperCase().padStart(2, '0');
      } else {
        output += String.fromCharCode(byte);
      }
    }
  }

  return output;
}

module.exports = { percentEncodeAfterEncoding };
