'use strict';
module.exports = function typedArrayLength(ta) {
  if (!ArrayBuffer.isView(ta) || ta instanceof DataView) throw new TypeError('not a typed array');
  return ta.length;
};
