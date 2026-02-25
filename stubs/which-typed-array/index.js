'use strict';
var types = ['Int8Array','Uint8Array','Uint8ClampedArray','Int16Array','Uint16Array','Int32Array','Uint32Array','Float32Array','Float64Array','BigInt64Array','BigUint64Array'];
module.exports = function whichTypedArray(value) {
  if (!value || typeof value !== 'object') return false;
  for (var i = 0; i < types.length; i++) {
    if (value instanceof global[types[i]]) return types[i];
  }
  return false;
};
