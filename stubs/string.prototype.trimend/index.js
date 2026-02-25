'use strict';
module.exports = function trimEnd(str) {
  return String.prototype.trimEnd.call(str);
};
