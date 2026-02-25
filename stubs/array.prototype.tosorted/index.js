'use strict';
module.exports = function toSorted(arr, cmp) {
  return Array.prototype.toSorted.call(arr, cmp);
};
