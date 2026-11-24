/**
 * Políticas CSP — fonte única usada pelo main e pelo plugin do Vite.
 * O dev server precisa de `unsafe-inline` (cliente Vite) e `ws:` (HMR);
 * a produção não pode ter nenhum dos dois.
 */
export const CSP_PRODUCAO =
  "default-src 'self'; script-src 'self'; style-src 'self'; " +
  "img-src 'self' data:; font-src 'self' data:; connect-src 'self'; " +
  "object-src 'none'; base-uri 'none'; form-action 'self'"

export const CSP_DEV =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data:; font-src 'self' data:; " +
  'connect-src \'self\' ws://localhost:5173 ws://127.0.0.1:5173; ' +
  "object-src 'none'; base-uri 'none'"
