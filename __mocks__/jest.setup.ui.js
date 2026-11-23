// react-test-renderer needs this flag set so act(...) is recognized as the
// test act environment; without it React logs "not configured to support
// act(...)" warnings during render.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
