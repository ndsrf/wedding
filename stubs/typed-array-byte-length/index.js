'use strict';
module.exports = function typedArrayByteLength(ta) {
  if (!ArrayBuffer.isView(ta) || ta instanceof DataView) throw new TypeError('not a typed array');
  return ta.byteLength;
};
