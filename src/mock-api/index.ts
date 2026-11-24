import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { RespostaApiClientes } from '../shared/contratos/modelos'
import { CLIENTES_FICTICIOS, filtrarClientes } from './dados'

const PORTA_PADRAO = 3199

function carregarEnvLocal(): void {
  if (typeof process.loadEnvFile !== 'function') return
  try {
    process.loadEnvFile()
  } catch (erro) {
    if (erro instanceof Error && (erro as NodeJS.ErrnoException).code === 'ENOENT') return
    console.error('[zenite] Não foi possível carregar o .env do mock de clientes.', erro)
  }
}

function lerPorta(): number {
  const bruta = process.env.CLIENTES_API_PORT ?? String(PORTA_PADRAO)
  const porta = Number(bruta)
  if (!Number.isInteger(porta) || porta < 1024 || porta > 65_535) {
    throw new Error('CLIENTES_API_PORT deve ser um inteiro entre 1024 e 65535.')
  }
  return porta
}

function responder(resposta: ServerResponse, status: number, corpo: unknown): void {
  const texto = JSON.stringify(corpo)
  resposta.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(texto),
  })
  resposta.end(texto)
}

function autorizado(requisicao: IncomingMessage): boolean {
  const token = process.env.CLIENTES_API_TOKEN?.trim()
  if (token === undefined || token === '') return true
  return requisicao.headers.authorization === `Bearer ${token}`
}

function tratarRequisicao(requisicao: IncomingMessage, resposta: ServerResponse): void {
  const url = new URL(requisicao.url ?? '/', `http://${requisicao.headers.host ?? 'localhost'}`)

  if (requisicao.method === 'GET' && url.pathname === '/health') {
    responder(resposta, 200, { status: 'ok' })
    return
  }

  if (requisicao.method !== 'GET' || url.pathname !== '/clientes') {
    responder(resposta, 404, { erro: 'Recurso não encontrado.' })
    return
  }

  if (!autorizado(requisicao)) {
    responder(resposta, 401, { erro: 'Não autorizado.' })
    return
  }

  const busca = url.searchParams.get('q') ?? undefined
  const limiteBruto = url.searchParams.get('limite')
  const limite = limiteBruto === null ? undefined : Number(limiteBruto)
  if (limite !== undefined && (!Number.isInteger(limite) || limite < 1 || limite > 100)) {
    responder(resposta, 400, { erro: 'O parâmetro limite deve estar entre 1 e 100.' })
    return
  }

  const filtrados = filtrarClientes(CLIENTES_FICTICIOS, { busca })
  const dados = limite === undefined ? filtrados : filtrados.slice(0, limite)
  const corpo: RespostaApiClientes = { dados, total: filtrados.length }
  responder(resposta, 200, corpo)
}

carregarEnvLocal()

const porta = lerPorta()
const servidor = createServer((requisicao, resposta) => {
  try {
    tratarRequisicao(requisicao, resposta)
  } catch {
    responder(resposta, 500, { erro: 'Falha interna do servidor de exemplo.' })
  }
})

servidor.listen(porta, '127.0.0.1', () => {
  console.log(`[zenite] API de clientes fictícios: http://127.0.0.1:${porta}/clientes`)
})
