import './style.css'
import { montarCategorias } from './paginas/Categorias'

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
  <main class="window">
    <header class="titlebar">
      <h1>Zênite</h1>
      <span class="badge">Aluguel Outdoor</span>
    </header>

    <section class="content">
      <p class="hint">Use <strong>Arquivo → Enviar ping</strong> no menu nativo para testar o IPC main → renderer.</p>

      <div class="grid">
        <article class="card">
          <h2>Aplicação</h2>
          <dl id="app-info">
            <dt>Status</dt><dd>Carregando…</dd>
          </dl>
        </article>

        <article class="card">
          <h2>Eventos IPC</h2>
          <p id="ping-status" class="muted">Nenhum ping recebido ainda.</p>
        </article>

        <article class="card">
          <h2>Categorias</h2>
          <div id="categorias" class="categorias"></div>
        </article>
      </div>

      <button id="docs-button" class="button" type="button">Abrir documentação do Electron ↗</button>
    </section>
  </main>
`

const appInfo = document.querySelector<HTMLElement>('#app-info')
const pingStatus = document.querySelector<HTMLElement>('#ping-status')
const docsButton = document.querySelector<HTMLButtonElement>('#docs-button')
const categorias = document.querySelector<HTMLElement>('#categorias')

if (!appInfo || !pingStatus || !docsButton || !categorias) {
  throw new Error('Failed to render the application shell')
}

montarCategorias(categorias)

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
      .map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`)
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
