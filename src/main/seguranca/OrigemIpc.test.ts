import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { criarVerificadorOrigem, urlAplicacao } from './OrigemIpc'

const arquivo = pathToFileURL('C:/app/dist/renderer/index.html').href

function evento(urlFrame: string, urlSender: string, isMainFrame = true): unknown {
  return {
    senderFrame: { url: urlFrame, isMainFrame },
    sender: { getURL: () => urlSender },
  }
}

describe('criarVerificadorOrigem', () => {
  const verificar = criarVerificadorOrigem(arquivo)

  it('aceita frame principal e webContents apontando para o arquivo do app', () => {
    expect(verificar.permitida(evento(arquivo, arquivo))).toBe(true)
  })

  it('rejeita frame ou webContents de outra origem', () => {
    expect(verificar.permitida(evento('file:///C:/windows/calc.html', arquivo))).toBe(false)
    expect(verificar.permitida(evento(arquivo, 'file:///C:/windows/calc.html'))).toBe(false)
  })

  it('rejeita subframe e eventos sem estrutura', () => {
    expect(verificar.permitida(evento(arquivo, arquivo, false))).toBe(false)
    expect(verificar.permitida(undefined)).toBe(false)
    expect(verificar.permitida({ senderFrame: { url: arquivo } })).toBe(false)
  })

  it('em dev compara a origem do servidor, não o caminho', () => {
    const dev = criarVerificadorOrigem('http://localhost:5173/')
    expect(dev.permitida(evento('http://localhost:5173/index.html', 'http://localhost:5173/'))).toBe(
      true,
    )
    expect(dev.permitida(evento('http://evil.test/', 'http://localhost:5173/'))).toBe(false)
  })

  it('urlAplicacao usa a URL do Vite em dev e o arquivo em produção', () => {
    expect(urlAplicacao(true, 'C:/app/dist/main')).toBe('http://localhost:5173')
    expect(urlAplicacao(false, 'C:/app/dist/main')).toContain('renderer/index.html')
  })
})
