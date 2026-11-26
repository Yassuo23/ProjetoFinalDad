import type { Cliente, PerfilUsuario, Usuario } from '../../shared/contratos/modelos'
import type { ClienteBanco, RegistroBanco } from '../banco/ClienteBanco'
import type { ConexaoBanco } from '../banco/ConexaoBanco'
import { ErroDeDominio, paraErroDominio } from '../banco/ErrosBanco'
import {
  booleano,
  dataHora,
  numero,
  texto,
  textoEnumerado,
  textoOpcional,
} from './mapeamento'
import type {
  DadosCadastroCliente,
  RepositorioCadastroCliente,
  UsuarioEClienteCriados,
} from './portas'
import { RepositorioBase } from './RepositorioBase'

const PERFIS: readonly PerfilUsuario[] = ['Administrador', 'Atendente', 'Cliente']
const PERFIL_CLIENTE: PerfilUsuario = 'Cliente'
const PERFIL_ADMIN: PerfilUsuario = 'Administrador'

const CONSULTAR_USUARIO = `
  SELECT id_usuario AS id, nome, login, senha_hash AS senhaHash, perfil, ativo,
         atualizado_em AS atualizadoEm
  FROM usuario
`

const CONSULTAR_CLIENTE = `
  SELECT id_cliente AS id, nome, cpf, telefone, email, cep, logradouro, numero,
         complemento, bairro, cidade, uf, ativo, atualizado_em AS atualizadoEm
  FROM cliente
`

function mapearUsuario(linha: RegistroBanco): Usuario {
  return {
    id: numero(linha, 'id', 'USUARIO'),
    nome: texto(linha, 'nome', 'USUARIO'),
    login: texto(linha, 'login', 'USUARIO'),
    senhaHash: texto(linha, 'senhaHash', 'USUARIO'),
    perfil: textoEnumerado(linha, 'perfil', 'USUARIO', PERFIS),
    ativo: booleano(linha, 'ativo', 'USUARIO'),
    atualizadoEm: dataHora(linha, 'atualizadoEm', 'USUARIO'),
  }
}

function mapearCliente(linha: RegistroBanco): Cliente {
  return {
    id: numero(linha, 'id', 'CLIENTE'),
    nome: texto(linha, 'nome', 'CLIENTE'),
    cpf: texto(linha, 'cpf', 'CLIENTE'),
    telefone: textoOpcional(linha, 'telefone', 'CLIENTE'),
    email: textoOpcional(linha, 'email', 'CLIENTE'),
    cep: textoOpcional(linha, 'cep', 'CLIENTE'),
    logradouro: textoOpcional(linha, 'logradouro', 'CLIENTE'),
    numero: textoOpcional(linha, 'numero', 'CLIENTE'),
    complemento: textoOpcional(linha, 'complemento', 'CLIENTE'),
    bairro: textoOpcional(linha, 'bairro', 'CLIENTE'),
    cidade: textoOpcional(linha, 'cidade', 'CLIENTE'),
    uf: textoOpcional(linha, 'uf', 'CLIENTE'),
    ativo: booleano(linha, 'ativo', 'CLIENTE'),
    atualizadoEm: dataHora(linha, 'atualizadoEm', 'CLIENTE'),
  }
}

/**
 * Identidade única da ADR 0009. A coluna `cliente.id_usuario` é gravada no
 * mesmo `INSERT` do cliente, dentro da transação que cria o usuário: não existe
 * janela em que um login `Cliente` fique sem vínculo.
 */
export class CadastroClienteRepositorio
  extends RepositorioBase
  implements RepositorioCadastroCliente
{
  constructor(conexao: ConexaoBanco) {
    super(conexao)
  }

  contarAdministradoresAtivos(): Promise<number> {
    return this.comCliente(async (cliente) => {
      const linhas = await cliente.query(
        'SELECT COUNT(*) AS total FROM usuario WHERE perfil = ? AND ativo = 1',
        [PERFIL_ADMIN],
      )
      return numero(linhas[0] ?? {}, 'total', 'USUARIO')
    })
  }

  cpfEmUso(cpf: string): Promise<boolean> {
    return this.comCliente(async (cliente) => {
      const linhas = await cliente.query(
        'SELECT COUNT(*) AS total FROM cliente WHERE cpf = ?',
        [cpf],
      )
      return numero(linhas[0] ?? {}, 'total', 'CLIENTE') > 0
    })
  }

  clienteIdPorUsuario(usuarioId: number): Promise<number | null> {
    return this.comCliente(async (cliente) => {
      const linhas = await cliente.query(
        `SELECT id_cliente AS id FROM cliente WHERE id_usuario = ? LIMIT 1`,
        [usuarioId],
      )
      const linha = linhas[0]
      return linha ? numero(linha, 'id', 'CLIENTE') : null
    })
  }

  criar(dados: DadosCadastroCliente): Promise<UsuarioEClienteCriados> {
    return this.transacao(async (cliente) => {
      let idUsuario: number
      let idCliente: number
      try {
        const usuario = await cliente.execute(
          `INSERT INTO usuario (nome, login, senha_hash, perfil)
           VALUES (?, ?, ?, ?)`,
          [dados.nome, dados.login, dados.senhaHash, PERFIL_CLIENTE],
        )
        idUsuario = usuario.insertId

        const resultado = await cliente.execute(
          `INSERT INTO cliente
             (nome, cpf, id_usuario, telefone, email, cep, logradouro, numero,
              complemento, bairro, cidade, uf)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            dados.nome,
            dados.cpf,
            idUsuario,
            dados.telefone ?? null,
            dados.email ?? null,
            dados.cep ?? null,
            dados.logradouro ?? null,
            dados.numero ?? null,
            dados.complemento ?? null,
            dados.bairro ?? null,
            dados.cidade ?? null,
            dados.uf ?? null,
          ],
        )
        idCliente = resultado.insertId
      } catch (erro) {
        throw paraErroDominio(erro, 'cadastro de cliente')
      }

      const usuario = await this.lerUsuario(cliente, idUsuario)
      const clienteCriado = await this.lerCliente(cliente, idCliente)
      if (!usuario || !clienteCriado) {
        throw new ErroDeDominio('NAO_ENCONTRADO', 'Cadastro não encontrado após a criação.')
      }
      return { usuario, cliente: clienteCriado }
    })
  }

  private async lerUsuario(cliente: ClienteBanco, id: number): Promise<Usuario | null> {
    const linhas = await cliente.query(`${CONSULTAR_USUARIO} WHERE id_usuario = ? LIMIT 1`, [id])
    const linha = linhas[0]
    return linha ? mapearUsuario(linha) : null
  }

  private async lerCliente(cliente: ClienteBanco, id: number): Promise<Cliente | null> {
    const linhas = await cliente.query(`${CONSULTAR_CLIENTE} WHERE id_cliente = ? LIMIT 1`, [id])
    const linha = linhas[0]
    return linha ? mapearCliente(linha) : null
  }
}
