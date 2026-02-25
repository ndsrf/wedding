'use strict';
module.exports = function findLast(arr, fn, thisArg) {
  return Array.prototype.findLast.call(arr, fn, thisArg);
};
