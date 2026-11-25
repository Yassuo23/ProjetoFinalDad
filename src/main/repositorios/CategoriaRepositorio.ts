import type { Categoria } from '../../shared/contratos/modelos'
import type { RegistroBanco } from '../banco/ClienteBanco'
import type { ConexaoBanco } from '../banco/ConexaoBanco'
import { numero, texto, textoOpcional } from './mapeamento'
import type { RepositorioCategorias } from './portas'
import { RepositorioBase } from './RepositorioBase'

const CONSULTAR = 'SELECT id, nome, descricao FROM categorias'

function mapearCategoria(linha: RegistroBanco): Categoria {
  return {
    id: numero(linha, 'id', 'CATEGORIA'),
    nome: texto(linha, 'nome', 'CATEGORIA'),
    descricao: textoOpcional(linha, 'descricao', 'CATEGORIA'),
  }
}

export class CategoriaRepositorio extends RepositorioBase implements RepositorioCategorias {
  constructor(conexao: ConexaoBanco) {
    super(conexao)
  }

  listar(): Promise<readonly Categoria[]> {
    return this.comCliente(async (cliente) => {
      const linhas = await cliente.query(`${CONSULTAR} ORDER BY nome, id`)
      return linhas.map(mapearCategoria)
    })
  }
}
