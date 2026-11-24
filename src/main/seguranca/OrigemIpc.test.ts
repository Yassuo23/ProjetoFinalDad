import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { criarVerificadorOrigem, urlAplicacao } from './OrigemIpc'

const diretorioMain = path.join(process.cwd(), 'dist', 'main')
const arquivo = pathToFileURL(path.resolve(diretorioMain, '../renderer/index.html')).href

interface FrameFalso {
  url: string
  readonly isMainFrame: boolean
}

function quadro(url: string, isMainFrame = true): FrameFalso {
  return { url, isMainFrame }
}

function evento(frame: FrameFalso, urlSender: string = frame.url): unknown {
  return { senderFrame: frame, sender: { getURL: () => urlSender } }
}

const envInicial: Record<string, string | undefined> = {
  ELECTRON_RENDERER_URL: process.env.ELECTRON_RENDERER_URL,
  VITE_DEV_SERVER_URL: process.env.VITE_DEV_SERVER_URL,
}

function restaurarEnv(): void {
  for (const [chave, valor] of Object.entries(envInicial)) {
    if (valor === undefined) delete process.env[chave]
    else process.env[chave] = valor
  }
}

describe('criarVerificadorOrigem', () => {
  afterEach(restaurarEnv)

  it('aceita o arquivo da janela com hash de rota e query', () => {
    const frame = quadro(arquivo)
    const verificar = criarVerificadorOrigem(arquivo, () => frame)

    expect(verificar.permitida(evento(frame))).toBe(true)
    expect(verificar.permitida(evento(frame, `${arquivo}#/categorias`))).toBe(true)
    expect(verificar.permitida(evento(frame, `${arquivo}?v=1#/reservas`))).toBe(true)
  })

  it('aceita a URL de desenvolvimento com hash e query', () => {
    const frame = quadro('http://localhost:5173/#/equipamentos')
    const verificar = criarVerificadorOrigem('http://localhost:5173/', () => frame)

    expect(verificar.permitida(evento(frame))).toBe(true)
    expect(
      verificar.permitida(evento(frame, 'http://localhost:5173/index.html?x=1#/clientes')),
    ).toBe(true)
  })

  it('rejeita outra origem mesmo com o mesmo frame', () => {
    const frame = quadro(arquivo)
    const verificar = criarVerificadorOrigem(arquivo, () => frame)
    frame.url = 'file:///C:/windows/calc.html'
    expect(verificar.permitida(evento(frame))).toBe(false)

    const dev = quadro('http://localhost:5173/')
    const verificarDev = criarVerificadorOrigem('http://localhost:5173/', () => dev)
    dev.url = 'http://evil.test/'
    expect(verificarDev.permitida(evento(dev))).toBe(false)
  })

  it('rejeita subframe e frame de outra janela', () => {
    const principal = quadro(arquivo)
    const filho = quadro(arquivo, false)
    const antigo = quadro(arquivo)
    const verificar = criarVerificadorOrigem(arquivo, () => principal)

    expect(verificar.permitida(evento(principal))).toBe(true)
    expect(verificar.permitida(evento(filho))).toBe(false)
    expect(verificar.permitida(evento(antigo))).toBe(false)
  })

  it('rejeita eventos sem estrutura', () => {
    const verificar = criarVerificadorOrigem(arquivo)

    expect(verificar.permitida(undefined)).toBe(false)
    expect(verificar.permitida({ senderFrame: { url: arquivo } })).toBe(false)
    expect(verificar.permitida({ senderFrame: quadro(arquivo), sender: { getURL: 42 } })).toBe(false)
  })
})

describe('urlAplicacao', () => {
  afterEach(restaurarEnv)

  it('usa ELECTRON_RENDERER_URL em dev', () => {
    delete process.env.VITE_DEV_SERVER_URL
    process.env.ELECTRON_RENDERER_URL = 'http://127.0.0.1:5173/'

    expect(urlAplicacao(true, diretorioMain)).toBe('http://127.0.0.1:5173/')
  })

  it('usa o arquivo normalizado em producao', () => {
    expect(urlAplicacao(false, diretorioMain)).toBe(arquivo)
  })
})
