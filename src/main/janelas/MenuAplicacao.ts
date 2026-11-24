import { Menu } from 'electron'

export interface AcoesMenu {
  ping(): void
}

/** Menu em português; DevTools e recarga forçada existem somente em desenvolvimento. */
export function instalarMenu(isDev: boolean, acoes: AcoesMenu): void {
  const itens: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Arquivo',
      submenu: [
        { label: 'Enviar ping', accelerator: 'CmdOrCtrl+P', click: () => acoes.ping() },
        { type: 'separator' },
        { role: 'quit', label: 'Sair' },
      ],
    },
    {
      label: 'Exibir',
      submenu: [
        { role: 'reload', label: 'Recarregar', visible: isDev },
        { role: 'forceReload', label: 'Recarregar forçado', visible: isDev },
        { type: 'separator', visible: isDev },
        { role: 'toggleDevTools', label: 'DevTools', visible: isDev },
      ],
    },
    {
      label: 'Ajuda',
      submenu: [{ role: 'about', label: 'Sobre o Zênite' }],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(itens))
}
