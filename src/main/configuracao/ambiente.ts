/**
 * Carrega `.env` somente fora do instalador. No app empacotado as variáveis
 * devem vir do ambiente/cofre do sistema operacional — `app.isPackaged` é a
 * fonte da verdade, não `NODE_ENV`.
 */
export function carregarAmbienteLocal(pacoteInstalado: boolean): void {
  if (pacoteInstalado) return
  if (typeof process.loadEnvFile !== 'function') return

  try {
    process.loadEnvFile()
  } catch (erro) {
    if (erro instanceof Error && (erro as NodeJS.ErrnoException).code === 'ENOENT') return
    // Não interrompe a abertura do app: a falha aparece ao tentar pagar.
    console.error('[zenite] Não foi possível carregar o .env local.', erro)
  }
}
