'use strict';
var gt = typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : this;
function getGlobalThis() { return gt; }
getGlobalThis.shim = function() { return gt; };
module.exports = getGlobalThis;
