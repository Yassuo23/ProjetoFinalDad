import type { Cliente, ListarClientesRequisicao } from '../shared/contratos/modelos'

/** Cadastros fictícios para demonstração da aba Clientes (wireframe 3.4). */
export const CLIENTES_FICTICIOS: readonly Cliente[] = [
  {
    id: 1,
    nome: 'Ana Souza',
    email: 'ana.souza@exemplo.test',
    telefone: '(11) 98888-0001',
    cep: '01310-100',
    logradouro: 'Avenida Paulista',
    numero: '1200',
    complemento: 'Apto 42',
    bairro: 'Bela Vista',
    cidade: 'São Paulo',
    uf: 'SP',
  },
  {
    id: 2,
    nome: 'Carlos Lima',
    email: 'carlos.lima@exemplo.test',
    telefone: '(21) 97777-0002',
    cep: '20040-004',
    logradouro: 'Avenida Rio Branco',
    numero: '85',
    complemento: null,
    bairro: 'Centro',
    cidade: 'Rio de Janeiro',
    uf: 'RJ',
  },
  {
    id: 3,
    nome: 'Joana Ribeiro',
    email: 'joana.ribeiro@exemplo.test',
    telefone: '(31) 96666-0003',
    cep: '30130-010',
    logradouro: 'Rua dos Timbiras',
    numero: '450',
    complemento: 'Sala 7',
    bairro: 'Lourdes',
    cidade: 'Belo Horizonte',
    uf: 'MG',
  },
  {
    id: 4,
    nome: 'Marcos Alves',
    email: 'marcos.alves@exemplo.test',
    telefone: '(41) 95555-0004',
    cep: '80010-010',
    logradouro: 'Rua XV de Novembro',
    numero: '312',
    complemento: null,
    bairro: 'Centro',
    cidade: 'Curitiba',
    uf: 'PR',
  },
  {
    id: 5,
    nome: 'Paula Mendes',
    email: 'paula.mendes@exemplo.test',
    telefone: '(51) 94444-0005',
    cep: '90010-001',
    logradouro: 'Avenida Independência',
    numero: '71',
    complemento: null,
    bairro: 'Centro Histórico',
    cidade: 'Porto Alegre',
    uf: 'RS',
  },
  {
    id: 6,
    nome: 'Rafael Costa',
    email: 'rafael.costa@exemplo.test',
    telefone: '(48) 93333-0006',
    cep: '88010-001',
    logradouro: 'Rua Felipe Camarão',
    numero: '208',
    complemento: 'Bloco B',
    bairro: 'Centro',
    cidade: 'Florianópolis',
    uf: 'SC',
  },
  {
    id: 7,
    nome: 'Beatriz Nunes',
    email: 'beatriz.nunes@exemplo.test',
    telefone: '(19) 92222-0007',
    cep: '13010-051',
    logradouro: 'Avenida Francisco Glicério',
    numero: '990',
    complemento: null,
    bairro: 'Cambuí',
    cidade: 'Campinas',
    uf: 'SP',
  },
  {
    id: 8,
    nome: 'Diego Martins',
    email: 'diego.martins@exemplo.test',
    telefone: '(81) 91111-0008',
    cep: '50010-040',
    logradouro: 'Rua do Bom Jesus',
    numero: '33',
    complemento: null,
    bairro: 'Recife Antigo',
    cidade: 'Recife',
    uf: 'PE',
  },
  {
    id: 9,
    nome: 'Camila Ferreira',
    email: 'camila.ferreira@exemplo.test',
    telefone: '(71) 90000-0009',
    cep: '40010-060',
    logradouro: 'Rua Chile',
    numero: '12',
    complemento: 'Apto 3',
    bairro: 'Centro',
    cidade: 'Salvador',
    uf: 'BA',
  },
  {
    id: 10,
    nome: 'Lucas Pereira',
    email: 'lucas.pereira@exemplo.test',
    telefone: '(62) 98999-0010',
    cep: '74010-010',
    logradouro: 'Avenida Goiás',
    numero: '540',
    complemento: null,
    bairro: 'Centro',
    cidade: 'Goiânia',
    uf: 'GO',
  },
]

function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
}

/** Busca por nome, telefone, cidade ou e-mail, com limite opcional. */
export function filtrarClientes(
  clientes: readonly Cliente[],
  parametros: ListarClientesRequisicao = {},
): Cliente[] {
  const termo = parametros.busca === undefined ? '' : normalizar(parametros.busca.trim())
  const filtrados =
    termo === ''
      ? [...clientes]
      : clientes.filter((cliente) =>
          [cliente.nome, cliente.telefone, cliente.cidade, cliente.email].some(
            (campo) => campo !== null && campo !== undefined && normalizar(campo).includes(termo),
          ),
        )

  return parametros.limite === undefined ? filtrados : filtrados.slice(0, parametros.limite)
}
