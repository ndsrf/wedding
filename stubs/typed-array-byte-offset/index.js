'use strict';
module.exports = function typedArrayByteOffset(ta) {
  if (!ArrayBuffer.isView(ta) || ta instanceof DataView) throw new TypeError('not a typed array');
  return ta.byteOffset;
};
