// Jest shim for isomorphic-dompurify.
// The real package pulls in jsdom → html-encoding-sniffer → @exodus/bytes (ESM-only),
// which Jest's CommonJS runner cannot process. Tests that need actual sanitization
// should run in an integration environment; unit tests just need the pass-through shape.
const DOMPurify = {
  sanitize: (html) => html,
  addHook: () => {},
  removeHook: () => {},
  removeHooks: () => {},
  removeAllHooks: () => {},
  isValidAttribute: () => true,
  clearConfig: () => {},
  setConfig: () => {},
};

module.exports = DOMPurify;
module.exports.default = DOMPurify;
