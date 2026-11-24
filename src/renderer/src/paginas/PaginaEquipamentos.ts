import type { Categoria, Equipamento } from '../../../shared/contratos/modelos'
import { Badge, Campo, Carregando, EstadoErro, EstadoVazio, Select, Tabela } from '../componentes'
import type { ColunaTabela } from '../componentes'
import { Componente, criarElemento, substituirConteudo } from '../nucleo'
import { EquipamentoServico } from '../servicos'

const CLASSES = {
  pagina: 'flex flex-col gap-6',
  cabecalho: 'flex flex-wrap items-start justify-between gap-4',
  titulo: 'font-display text-2xl font-semibold text-floresta',
  subtitulo: 'mt-1 text-sm text-floresta/70',
  filtros: 'grid grid-cols-1 gap-4 md:grid-cols-[1fr_14rem]',
  avisoExemplo:
    'inline-flex items-center gap-2 rounded-pill bg-pedra px-2.5 py-1 text-xs font-semibold text-floresta',
  lista: 'flex flex-col gap-3',
  contador: 'text-xs text-floresta/70',
  campoBusca: 'w-full',
} as const

const ICONE_BUSCA = 'M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z'

interface LinhaEquipamento {
  readonly nome: string
  readonly categoria: string
  readonly precoDiaria: number
  readonly disponivel: boolean
}

const COLUNAS: readonly ColunaTabela<LinhaEquipamento>[] = [
  { chave: 'nome', rotulo: 'Equipamento', ordenavel: true },
  { chave: 'categoria', rotulo: 'Categoria', ordenavel: true },
  {
    chave: 'precoDiaria',
    rotulo: 'Diária',
    ordenavel: true,
    alinhamento: 'direita',
    celula: (linha) =>
      linha.precoDiaria.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }),
  },
  {
    chave: 'disponivel',
    rotulo: 'Disponibilidade',
    celula: (linha) =>
      new Badge({
        texto: linha.disponivel ? 'Disponível' : 'Indisponível',
        tom: linha.disponivel ? 'sucesso' : 'neutro',
      }).raiz,
  },
]

export class PaginaEquipamentos extends Componente {
  private readonly servico = new EquipamentoServico()
  private equipamentos: readonly Equipamento[] = []
  private categorias: readonly Categoria[] = []
  private dadosDeExemplo = false
  private busca = ''
  private categoriaId = ''
  private aviso: HTMLElement | null = null
  private areaLista: HTMLElement | null = null

  constructor() {
    super(criarElemento('section', { className: CLASSES.pagina }))
  }

  protected aoMontar(): void {
    void this.carregar()
  }

  private async carregar(): Promise<void> {
    this.mostrarCarregando()
    try {
      const [resultadoEquipamentos, resultadoCategorias] = await Promise.all([
        this.servico.listar(),
        this.servico.listarCategorias(),
      ])
      this.equipamentos = resultadoEquipamentos.itens
      this.categorias = resultadoCategorias.itens
      this.dadosDeExemplo =
        resultadoEquipamentos.dadosDeExemplo || resultadoCategorias.dadosDeExemplo
    } catch {
      this.mostrarErro()
      return
    }
    this.montarEstrutura()
    this.atualizarLista()
  }

  private criarCabecalho(): HTMLElement {
    this.aviso = criarElemento('span', {
      className: this.dadosDeExemplo ? CLASSES.avisoExemplo : 'hidden',
      texto: 'dados de exemplo',
    })

    return criarElemento('div', {
      className: CLASSES.cabecalho,
      filhos: [
        criarElemento('div', {
          filhos: [
            criarElemento('h2', { className: CLASSES.titulo, texto: 'Equipamentos' }),
            criarElemento('p', {
              className: CLASSES.subtitulo,
              texto: 'Acervo disponível para locação.',
            }),
          ],
        }),
        this.aviso,
      ],
    })
  }

  private mostrarCarregando(): void {
    const area = criarElemento('div')
    new Carregando({ mensagem: 'Carregando equipamentos…' }).montar(area)
    substituirConteudo(this.elemento, this.criarCabecalho(), area)
  }

  private montarEstrutura(): void {
    const filtros = criarElemento('div', {
      className: CLASSES.filtros,
      filhos: [
        criarElemento('div', {
          className: CLASSES.campoBusca,
          filhos: [
            new Campo({
              id: 'equipamentos-busca',
              rotulo: 'Buscar',
              placeholder: 'Nome do equipamento',
              icone: ICONE_BUSCA,
              aoAlterar: (valor) => {
                this.busca = valor
                this.atualizarLista()
              },
            }).raiz,
          ],
        }),
        new Select({
          id: 'equipamentos-categoria',
          rotulo: 'Categoria',
          placeholder: 'Todas',
          opcoes: this.categorias.map((categoria) => ({
            valor: String(categoria.id),
            rotulo: categoria.nome,
          })),
          aoAlterar: (valor) => {
            this.categoriaId = valor
            this.atualizarLista()
          },
        }).raiz,
      ],
    })

    this.areaLista = criarElemento('div', { className: CLASSES.lista })
    substituirConteudo(this.elemento, this.criarCabecalho(), filtros, this.areaLista)
  }

  private atualizarLista(): void {
    if (this.areaLista === null) {
      return
    }

    const filtrados = this.filtrar()
    this.areaLista.replaceChildren(
      criarElemento('p', {
        className: CLASSES.contador,
        texto: `${filtrados.length} equipamento${filtrados.length === 1 ? '' : 's'}`,
      }),
    )

    if (filtrados.length === 0) {
      const area = criarElemento('div')
      new EstadoVazio({
        titulo: 'Nenhum equipamento encontrado',
        mensagem: 'Tente outro nome ou selecione uma categoria diferente.',
      }).montar(area)
      this.areaLista.append(area)
      return
    }

    const nomesCategorias = new Map(this.categorias.map((item) => [item.id, item.nome]))
    const linhas: LinhaEquipamento[] = filtrados.map((equipamento) => ({
      nome: equipamento.nome,
      categoria: nomesCategorias.get(equipamento.categoriaId) ?? 'Sem categoria',
      precoDiaria: equipamento.precoDiaria,
      disponivel: equipamento.ativo && equipamento.estado === 'disponivel',
    }))
    this.areaLista.append(
      new Tabela<LinhaEquipamento>({
        colunas: COLUNAS,
        linhas,
        mensagemVazia: 'Nenhum equipamento cadastrado.',
      }).raiz,
    )
  }

  private filtrar(): readonly Equipamento[] {
    const termo = this.busca.trim().toLocaleLowerCase('pt-BR')
    return this.equipamentos.filter((equipamento) => {
      const combinaBusca =
        termo === '' || equipamento.nome.toLocaleLowerCase('pt-BR').includes(termo)
      const combinaCategoria =
        this.categoriaId === '' || String(equipamento.categoriaId) === this.categoriaId
      return combinaBusca && combinaCategoria
    })
  }

  private mostrarErro(): void {
    const area = criarElemento('div')
    new EstadoErro({
      mensagem: 'Não foi possível carregar os equipamentos.',
      aoTentar: () => {
        void this.carregar()
      },
    }).montar(area)
    substituirConteudo(this.elemento, area)
  }
}
