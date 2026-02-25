'use strict';
module.exports = function findLastIndex(arr, fn, thisArg) {
  return Array.prototype.findLastIndex.call(arr, fn, thisArg);
};
