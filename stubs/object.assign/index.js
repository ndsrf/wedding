'use strict';
module.exports = function objectAssign(target) {
  return Object.assign.apply(Object, arguments);
};
