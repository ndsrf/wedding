'use strict';
// Object.groupBy is available in Node.js 21+; provide a polyfill for Node.js 20
module.exports = function objectGroupBy(iterable, keySelector) {
  var result = Object.create(null);
  var i = 0;
  for (var item of iterable) {
    var key = keySelector(item, i++);
    if (!Object.prototype.hasOwnProperty.call(result, key)) { result[key] = []; }
    result[key].push(item);
  }
  return result;
};
