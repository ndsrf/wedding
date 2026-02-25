'use strict';
module.exports = function trimStart(str) {
  return String.prototype.trimStart.call(str);
};
