import type {
  Cliente,
  ClienteAtualizarEntrada,
  ClienteCriarEntrada,
  ClienteListarFiltros,
  EnderecoCep,
} from '../../shared/contratos/modelos'
import type { RepositorioClientes } from '../repositorios/portas'
import { ErroDeDominio, paraErroDominio } from './ErroDeDominio'
import type { ServicoCep, ServicoClientes } from './portas'

const CAMPOS_ENDERECO = ['logradouro', 'bairro', 'cidade', 'uf'] as const
type CampoEndereco = (typeof CAMPOS_ENDERECO)[number]

const NAO_ENCONTRADO = (): ErroDeDominio =>
  new ErroDeDominio('NAO_ENCONTRADO', 'Cliente não encontrado.')

function vazio(valor: string | null | undefined): boolean {
  return valor === undefined || valor === null || valor.trim() === ''
}

export class ClienteServico implements ServicoClientes {
  constructor(
    private readonly repositorio: RepositorioClientes,
    private readonly servicoCep: ServicoCep,
  ) {}

  listar(filtros?: ClienteListarFiltros): Promise<readonly Cliente[]> {
    return filtros === undefined ? this.repositorio.listar() : this.repositorio.listar(filtros)
  }

  async buscarPorId(id: number): Promise<Cliente> {
    const cliente = await this.repositorio.buscarPorId(id)
    if (!cliente) throw NAO_ENCONTRADO()
    return cliente
  }

  async buscarCep(cep: string): Promise<EnderecoCep> {
    try {
      return await this.servicoCep.buscar(cep)
    } catch (erro) {
      throw paraErroDominio(erro, 'CEP')
    }
  }

  async criar(dados: ClienteCriarEntrada): Promise<Cliente> {
    // O repositório compara o CPF exatamente como gravado.
    if (await this.cpfEmUso(dados.cpf)) {
      throw new ErroDeDominio('REGISTRO_DUPLICADO', 'CPF já cadastrado.')
    }

    let logradouro = dados.logradouro
    let bairro = dados.bairro
    let cidade = dados.cidade
    let uf = dados.uf

    const cep = dados.cep
    if (!vazio(cep) && CAMPOS_ENDERECO.some((campo) => vazio(dados[campo]))) {
      const endereco = await this.buscarCep(cep as string)
      if (vazio(logradouro)) logradouro = endereco.logradouro
      if (vazio(bairro)) bairro = endereco.bairro
      if (vazio(cidade)) cidade = endereco.cidade
      if (vazio(uf)) uf = endereco.uf
    }

    const envio: ClienteCriarEntrada = {
      nome: dados.nome,
      cpf: dados.cpf,
      ...(dados.telefone !== undefined ? { telefone: dados.telefone } : {}),
      ...(dados.email !== undefined ? { email: dados.email } : {}),
      ...(dados.cep !== undefined ? { cep: dados.cep } : {}),
      ...(logradouro !== undefined ? { logradouro } : {}),
      ...(dados.numero !== undefined ? { numero: dados.numero } : {}),
      ...(dados.complemento !== undefined ? { complemento: dados.complemento } : {}),
      ...(bairro !== undefined ? { bairro } : {}),
      ...(cidade !== undefined ? { cidade } : {}),
      ...(uf !== undefined ? { uf } : {}),
    }

    try {
      return await this.repositorio.criar(envio)
    } catch (erro) {
      throw paraErroDominio(erro, 'cliente')
    }
  }

  async atualizar(dados: ClienteAtualizarEntrada): Promise<Cliente> {
    const atual = await this.buscarPorId(dados.id)

    if (dados.cpf !== undefined && (await this.cpfEmUso(dados.cpf, dados.id))) {
      throw new ErroDeDominio('REGISTRO_DUPLICADO', 'CPF já cadastrado.')
    }

    const cep = dados.cep !== undefined ? dados.cep : atual.cep
    const cepMudou = dados.cep !== undefined && dados.cep !== atual.cep
    const enderecoVazio = CAMPOS_ENDERECO.some((campo) =>
      vazio(dados[campo] !== undefined ? dados[campo] : atual[campo]),
    )

    let logradouro = dados.logradouro
    let bairro = dados.bairro
    let cidade = dados.cidade
    let uf = dados.uf
    const preenchidos = new Set<CampoEndereco>()

    if (!vazio(cep) && (cepMudou || enderecoVazio)) {
      const endereco = await this.buscarCep(cep as string)
      for (const campo of CAMPOS_ENDERECO) {
        const valorEfetivo = dados[campo] !== undefined ? dados[campo] : atual[campo]
        if (!vazio(valorEfetivo)) continue

        preenchidos.add(campo)
        if (campo === 'logradouro') logradouro = endereco.logradouro
        if (campo === 'bairro') bairro = endereco.bairro
        if (campo === 'cidade') cidade = endereco.cidade
        if (campo === 'uf') uf = endereco.uf
      }
    }

    const envio: ClienteAtualizarEntrada = {
      id: dados.id,
      ...(dados.nome !== undefined ? { nome: dados.nome } : {}),
      ...(dados.cpf !== undefined ? { cpf: dados.cpf } : {}),
      ...(dados.telefone !== undefined ? { telefone: dados.telefone } : {}),
      ...(dados.email !== undefined ? { email: dados.email } : {}),
      ...(dados.cep !== undefined ? { cep: dados.cep } : {}),
      ...(dados.logradouro !== undefined || preenchidos.has('logradouro')
        ? { logradouro: logradouro ?? null }
        : {}),
      ...(dados.numero !== undefined ? { numero: dados.numero } : {}),
      ...(dados.complemento !== undefined ? { complemento: dados.complemento } : {}),
      ...(dados.bairro !== undefined || preenchidos.has('bairro') ? { bairro: bairro ?? null } : {}),
      ...(dados.cidade !== undefined || preenchidos.has('cidade') ? { cidade: cidade ?? null } : {}),
      ...(dados.uf !== undefined || preenchidos.has('uf') ? { uf: uf ?? null } : {}),
    }

    try {
      const atualizado = await this.repositorio.atualizar(envio)
      if (!atualizado) throw NAO_ENCONTRADO()
      return atualizado
    } catch (erro) {
      throw paraErroDominio(erro, 'cliente')
    }
  }

  async inativar(id: number): Promise<void> {
    await this.buscarPorId(id)

    let inativado: boolean
    try {
      inativado = await this.repositorio.inativar(id)
    } catch (erro) {
      throw paraErroDominio(erro, 'cliente')
    }
    if (!inativado) throw NAO_ENCONTRADO()
  }

  private async cpfEmUso(cpf: string, idExcluido?: number): Promise<boolean> {
    try {
      return idExcluido === undefined
        ? await this.repositorio.cpfEmUso(cpf)
        : await this.repositorio.cpfEmUso(cpf, idExcluido)
    } catch (erro) {
      throw paraErroDominio(erro, 'cliente')
    }
  }
}
