'use strict';
module.exports = function stringIncludes(str, search, position) {
  return String.prototype.includes.call(str, search, position);
};
