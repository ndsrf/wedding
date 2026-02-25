'use strict';
module.exports = function flat(arr, depth) {
  return Array.prototype.flat.call(arr, depth);
};
