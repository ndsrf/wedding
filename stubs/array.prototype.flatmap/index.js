'use strict';
module.exports = function flatMap(arr, fn, thisArg) {
  return Array.prototype.flatMap.call(arr, fn, thisArg);
};
