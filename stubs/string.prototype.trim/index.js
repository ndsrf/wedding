'use strict';
module.exports = function trim(str) {
  return String.prototype.trim.call(str);
};
