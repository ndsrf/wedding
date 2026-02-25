'use strict';
module.exports = function arrayIncludes(list, value, fromIndex) {
  return Array.prototype.includes.call(list, value, fromIndex);
};
