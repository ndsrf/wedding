'use strict';
module.exports = function matchAll(str, regexp) {
  return String.prototype.matchAll.call(str, regexp);
};
