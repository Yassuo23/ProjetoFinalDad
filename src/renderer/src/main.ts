import './tailwind.css'

const root = document.querySelector<HTMLDivElement>('#app')

if (!root) {
  throw new Error('Root element #app was not found')
}

const escapeHtml = (value: string): string =>
  value.replace(/[&<>'"]/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    }
    return entities[char] ?? char
  })

root.innerHTML = `
  <main class="flex min-h-screen flex-col bg-pedra font-sans text-grafite">
    <header class="flex items-center justify-between bg-floresta px-8 py-5 text-pedra">
      <h1 class="m-0 text-xl tracking-wide">Zênite</h1>
      <span class="rounded-full bg-lima/20 px-2.5 py-1 text-xs text-lima">Aluguel Outdoor</span>
    </header>

    <section class="max-w-[900px] p-8">
      <p class="mt-0 opacity-80">Use <strong>Arquivo → Enviar ping</strong> no menu nativo para testar o IPC main → renderer.</p>

      <div class="mb-6 grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
        <article class="rounded-[10px] border border-granito/45 bg-white p-5">
          <h2 class="m-0 mb-3 text-[15px] uppercase tracking-wider text-floresta">Aplicação</h2>
          <dl id="app-info" class="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt class="opacity-60">Status</dt><dd class="m-0 font-mono">Carregando…</dd>
          </dl>
        </article>

        <article class="rounded-[10px] border border-granito/45 bg-white p-5">
          <h2 class="m-0 mb-3 text-[15px] uppercase tracking-wider text-floresta">Eventos IPC</h2>
          <p id="ping-status" class="opacity-70">Nenhum ping recebido ainda.</p>
        </article>
      </div>

      <button
        id="docs-button"
        class="cursor-pointer rounded-lg border-0 bg-lima px-4 py-2.5 font-semibold text-grafite transition-colors hover:bg-geleira"
        type="button"
      >
        Abrir documentação do Electron ↗
      </button>
    </section>
  </main>
`

const appInfo = document.querySelector<HTMLElement>('#app-info')
const pingStatus = document.querySelector<HTMLElement>('#ping-status')
const docsButton = document.querySelector<HTMLButtonElement>('#docs-button')

if (!appInfo || !pingStatus || !docsButton) {
  throw new Error('Failed to render the application shell')
}

window.electronAPI
  .appInfo()
  .then((info) => {
    appInfo.innerHTML = [
      ['Nome', info.name],
      ['Versão', info.version],
      ['Electron', info.electron],
      ['Node', info.node],
      ['Plataforma', `${info.platform} (${info.arch})`],
    ]
      .map(
        ([label, value]) =>
          `<dt class="opacity-60">${escapeHtml(label)}</dt><dd class="m-0 font-mono">${escapeHtml(value)}</dd>`,
      )
      .join('')
  })
  .catch((error: unknown) => {
    appInfo.textContent = error instanceof Error ? error.message : String(error)
  })

window.electronAPI.onPing((payload) => {
  pingStatus.textContent = `${payload.message} · ${new Date(payload.timestamp).toLocaleTimeString()}`
})

docsButton.addEventListener('click', () => {
  void window.electronAPI.abrirExterno('https://www.electronjs.org/docs')
})
