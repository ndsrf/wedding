'use strict';
// Full encoding module — same exports as encoding-lite.js for CJS compatibility.
// The real @exodus/bytes/encoding.js supports multi-byte encodings; this stub
// delegates to Node's built-in TextDecoder which supports them natively.
module.exports = require('./encoding-lite.js');
