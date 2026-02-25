'use strict';
module.exports = function repeat(str, count) {
  return String.prototype.repeat.call(str, count);
};
