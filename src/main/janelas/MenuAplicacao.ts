import { Menu, type MenuItemConstructorOptions } from 'electron'

/** Menu nativo. DevTools e recarga ficam disponíveis somente em desenvolvimento. */
export function criarMenuAplicacao(isDev: boolean, enviarPing: () => void): void {
  const menuView: MenuItemConstructorOptions[] = [
    { role: 'reload' },
    { role: 'forceReload' },
  ]

  if (isDev) {
    menuView.push({ type: 'separator' }, { role: 'toggleDevTools' })
  }

  const modelo: MenuItemConstructorOptions[] = [
    {
      label: 'Arquivo',
      submenu: [
        { label: 'Enviar ping', click: () => enviarPing() },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    { label: 'Exibir', submenu: menuView },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(modelo))
}
