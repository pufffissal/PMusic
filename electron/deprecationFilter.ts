/** Transitive deps (ytmusic-api → tr46/whatwg-url) still import Node's built-in punycode (DEP0040). */
process.on('warning', (warning) => {
  if (warning.code === 'DEP0040') return
  console.warn(warning)
})
