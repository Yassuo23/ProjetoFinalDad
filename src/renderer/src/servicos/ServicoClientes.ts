import type { Cliente, ListarClientesRequisicao } from '../../../shared/contratos/modelos'

/** Resultado com a origem explícita, para a tela avisar quando usa dados de exemplo. */
export interface ResultadoClientes {
  readonly clientes: Cliente[]
  readonly dadosDeExemplo: boolean
}

/** Fallback tipado: a aba continua utilizável se o mock/API estiver fora. */
const CLIENTES_EXEMPLO: readonly Cliente[] = [
  {
    id: 1,
    nome: 'Ana Souza',
    email: 'ana.souza@exemplo.test',
    telefone: '(11) 98888-0001',
    cidade: 'São Paulo',
    uf: 'SP',
  },
  {
    id: 2,
    nome: 'Carlos Lima',
    email: 'carlos.lima@exemplo.test',
    telefone: '(21) 97777-0002',
    cidade: 'Rio de Janeiro',
    uf: 'RJ',
  },
  {
    id: 3,
    nome: 'Joana Ribeiro',
    email: 'joana.ribeiro@exemplo.test',
    telefone: '(31) 96666-0003',
    cidade: 'Belo Horizonte',
    uf: 'MG',
  },
]

function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
}

function filtrarExemplo(params: ListarClientesRequisicao | undefined): Cliente[] {
  const termo = params?.busca === undefined ? '' : normalizar(params.busca.trim())
  const filtrados =
    termo === ''
      ? [...CLIENTES_EXEMPLO]
      : CLIENTES_EXEMPLO.filter((cliente) =>
          [cliente.nome, cliente.telefone, cliente.cidade].some(
            (campo) => campo !== null && campo !== undefined && normalizar(campo).includes(termo),
          ),
        )
  return params?.limite === undefined ? filtrados : filtrados.slice(0, params.limite)
}

export class ServicoClientes {
  /** Assinatura existente preservada para os consumidores atuais. */
  listar(params?: ListarClientesRequisicao): Promise<Cliente[]> {
    return this.listarComFonte(params).then((resultado) => resultado.clientes)
  }

  /** Versão com origem explícita: usar na tela para exibir o aviso "dados de exemplo". */
  async listarComFonte(params?: ListarClientesRequisicao): Promise<ResultadoClientes> {
    try {
      const clientes = await window.electronAPI.clientes.listar(params)
      return { clientes, dadosDeExemplo: false }
    } catch {
      // Erros da ponte já chegam sem stack/código; aqui só decidimos o fallback.
      return { clientes: filtrarExemplo(params), dadosDeExemplo: true }
    }
  }
}
