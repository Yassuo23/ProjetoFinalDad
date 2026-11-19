import './style.css'

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
      <h1>Locadora</h1>
      <span class="badge">Electron + TypeScript</span>
    </header>

    <section class="content">
      <p class="hint">Use <strong>File → Send Ping</strong> in the native menu to test main → renderer IPC.</p>

      <div class="grid">
        <article class="card">
          <h2>Application</h2>
          <dl id="app-info">
            <dt>Status</dt><dd>Loading…</dd>
          </dl>
        </article>

        <article class="card">
          <h2>IPC events</h2>
          <p id="ping-status" class="muted">No ping received yet.</p>
        </article>
      </div>

      <button id="docs-button" class="button" type="button">Open Electron docs ↗</button>
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
  .getAppInfo()
  .then((info) => {
    appInfo.innerHTML = [
      ['Name', info.name],
      ['Version', info.version],
      ['Electron', info.electron],
      ['Node', info.node],
      ['Platform', `${info.platform} (${info.arch})`],
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
  void window.electronAPI.openExternal('https://www.electronjs.org/docs')
})
