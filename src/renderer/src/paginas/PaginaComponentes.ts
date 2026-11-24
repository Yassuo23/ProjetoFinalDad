import {
  AreaToast,
  Badge,
  Botao,
  Campo,
  Carregando,
  EstadoErro,
  EstadoVazio,
  Modal,
  Select,
  Tabela,
} from '../componentes'
import { Componente, criarElemento } from '../nucleo'

const CLASSES = {
  pagina: 'flex flex-col gap-6',
  titulo: 'font-display text-2xl font-semibold text-floresta',
  subtitulo: 'text-sm text-floresta/70',
  secao: 'flex flex-col gap-4 rounded-card border border-granito/45 bg-superficie p-5 shadow-card',
  secaoTitulo: 'font-display text-base text-floresta',
  exemplos: 'flex flex-wrap items-start gap-4',
  campoLargo: 'w-64',
  tabelaLarga: 'w-full',
  aviso: 'rounded-control bg-alerta-suave px-3 py-2 text-xs text-alerta',
} as const

const ICONE_CEP = 'M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11zM12 10h.01'

interface Registro {
  readonly nome: string
  readonly categoria: string
  readonly diaria: number
  readonly status: string
}

const REGISTROS: readonly Registro[] = [
  { nome: 'Bicicleta MTB', categoria: 'Ciclismo', diaria: 90, status: 'disponível' },
  { nome: 'Caiaque 2p', categoria: 'Náutica', diaria: 140, status: 'reservado' },
  { nome: 'Barraca 4p', categoria: 'Camping', diaria: 75, status: 'manutenção' },
]

function secao(titulo: string, ...exemplos: Array<Componente | HTMLElement>): HTMLElement {
  const areas = exemplos.map((exemplo) => {
    const area = criarElemento('div', { className: CLASSES.exemplos })
    if (exemplo instanceof Componente) {
      exemplo.montar(area)
    } else {
      area.append(exemplo)
    }
    return area
  })
  return criarElemento('section', {
    className: CLASSES.secao,
    filhos: [criarElemento('h3', { className: CLASSES.secaoTitulo, texto: titulo }), ...areas],
  })
}

function emLargura(componente: Componente, classe: string): HTMLElement {
  const area = criarElemento('div', { className: classe })
  componente.montar(area)
  return area
}

/** Página-only dev: vitrine de todos os estados do Design System. */
export class PaginaComponentes extends Componente {
  constructor() {
    super(criarElemento('section', { className: CLASSES.pagina }))
    const areaToast = new AreaToast()
    this.elemento.append(
      criarElemento('div', {
        filhos: [
          criarElemento('h2', { className: CLASSES.titulo, texto: 'Componentes' }),
          criarElemento('p', {
            className: CLASSES.subtitulo,
            texto: 'Conferência visual dos estados definidos em docs/design-system.md.',
          }),
          criarElemento('p', {
            className: CLASSES.aviso,
            texto: 'Disponível somente em desenvolvimento (import.meta.env.DEV).',
          }),
        ],
      }),
      secao(
        'Botão',
        new Botao({ texto: 'Primário' }),
        new Botao({ texto: 'Secundário', variante: 'secundario' }),
        new Botao({ texto: 'Ghost', variante: 'ghost' }),
        new Botao({ texto: 'Destrutivo', variante: 'destrutivo' }),
        new Botao({ texto: 'Desabilitado', desabilitado: true }),
        new Botao({ texto: '', icone: ICONE_CEP, rotuloAcessivel: 'Buscar CEP' }),
      ),
      secao(
        'Campo',
        emLargura(
          new Campo({
            id: 'demo-campo',
            rotulo: 'Nome',
            placeholder: 'Nome completo',
            obrigatorio: true,
            ajuda: 'Como consta no documento.',
          }),
          CLASSES.campoLargo,
        ),
        emLargura(
          new Campo({
            id: 'demo-campo-erro',
            rotulo: 'CEP',
            placeholder: '12345-678',
            valorInicial: '123',
            erro: 'CEP não encontrado. Preencha o endereço manualmente.',
            icone: ICONE_CEP,
          }),
          CLASSES.campoLargo,
        ),
        emLargura(
          new Campo({
            id: 'demo-campo-desabilitado',
            rotulo: 'Cidade',
            valorInicial: 'São Paulo',
            desabilitado: true,
          }),
          CLASSES.campoLargo,
        ),
      ),
      secao(
        'Select',
        emLargura(
          new Select({
            id: 'demo-select',
            rotulo: 'Categoria',
            placeholder: 'Selecione…',
            opcoes: [
              { valor: 'camping', rotulo: 'Camping' },
              { valor: 'ciclismo', rotulo: 'Ciclismo' },
              { valor: 'nautica', rotulo: 'Náutica' },
            ],
          }),
          CLASSES.campoLargo,
        ),
        emLargura(
          new Select({
            id: 'demo-select-erro',
            rotulo: 'Conservação',
            erro: 'Selecione o estado de conservação.',
            opcoes: [{ valor: 'bom', rotulo: 'Bom' }],
          }),
          CLASSES.campoLargo,
        ),
        emLargura(
          new Select({
            id: 'demo-select-desabilitado',
            rotulo: 'Fornecedor',
            desabilitado: true,
            opcoes: [{ valor: 'nenhum', rotulo: 'Nenhum' }],
          }),
          CLASSES.campoLargo,
        ),
      ),
      secao(
        'Badge de status',
        new Badge({ texto: 'Disponível', tom: 'sucesso' }),
        new Badge({ texto: 'Pendente', tom: 'alerta' }),
        new Badge({ texto: 'Atrasado', tom: 'erro' }),
        new Badge({ texto: 'Manutenção', tom: 'neutro' }),
        new Badge({ texto: 'Na barra escura', tom: 'escuro' }),
        new Badge({ texto: 'Desabilitado', tom: 'sucesso', desabilitado: true }),
      ),
      secao(
        'Tabela',
        emLargura(
          new Tabela<Registro>({
            colunas: [
              { chave: 'nome', rotulo: 'Equipamento', ordenavel: true },
              { chave: 'categoria', rotulo: 'Categoria', ordenavel: true },
              { chave: 'diaria', rotulo: 'Diária', ordenavel: true, alinhamento: 'direita' },
              { chave: 'status', rotulo: 'Status' },
            ],
            linhas: REGISTROS,
            aoSelecionar: (linha) => {
              areaToast.exibir({
                titulo: 'Linha selecionada',
                mensagem: linha.nome,
                tom: 'informacao',
              })
            },
          }),
          CLASSES.tabelaLarga,
        ),
        emLargura(
          new Tabela<Registro>({
            colunas: [{ chave: 'nome', rotulo: 'Equipamento' }],
            linhas: [],
            mensagemVazia: 'Nenhum equipamento disponível para esta data.',
          }),
          CLASSES.tabelaLarga,
        ),
        emLargura(
          new Tabela<Registro>({
            colunas: [{ chave: 'nome', rotulo: 'Equipamento' }],
            linhas: [],
            carregando: true,
          }),
          CLASSES.tabelaLarga,
        ),
      ),
      secao(
        'Modal',
        new Botao({
          texto: 'Abrir modal',
          aoClicar: () => {
            new Modal({
              id: 'demo-modal',
              titulo: 'Confirmar reserva',
              conteudo:
                'A previsão do tempo é exibida aqui. Use Tab para navegar e Esc para fechar.',
              rodape: [
                new Botao({ texto: 'Cancelar', variante: 'secundario' }).raiz,
                new Botao({ texto: 'Confirmar' }).raiz,
              ],
            }).abrir()
          },
        }),
        new Botao({
          texto: 'Abrir modal com erro',
          variante: 'secundario',
          aoClicar: () => {
            new Modal({
              id: 'demo-modal-erro',
              titulo: 'Previsão indisponível',
              conteudo: 'Não foi possível consultar o clima para esta data.',
              erro: true,
              rodape: [new Botao({ texto: 'Fechar', variante: 'secundario' }).raiz],
            }).abrir()
          },
        }),
      ),
      secao(
        'Toast',
        new Botao({
          texto: 'Sucesso',
          aoClicar: () => {
            areaToast.exibir({
              titulo: 'Reserva confirmada',
              mensagem: 'Dados salvos.',
              tom: 'sucesso',
            })
          },
        }),
        new Botao({
          texto: 'Erro',
          aoClicar: () => {
            areaToast.exibir({ mensagem: 'Não foi possível carregar a lista.', tom: 'erro' })
          },
        }),
        new Botao({
          texto: 'Alerta',
          aoClicar: () => {
            areaToast.exibir({ mensagem: 'Pagamento pendente.', tom: 'alerta' })
          },
        }),
        new Botao({
          texto: 'Informação',
          aoClicar: () => {
            areaToast.exibir({ mensagem: 'Exibindo dados locais.', tom: 'informacao' })
          },
        }),
      ),
      secao(
        'Estados de vazio, erro e carregando',
        new EstadoVazio({
          titulo: 'Nenhuma devolução pendente',
          mensagem: 'Volte ao Dashboard ou registre uma nova devolução.',
          acao: { texto: 'Voltar ao Dashboard', aoClicar: () => undefined },
        }),
        new EstadoErro({
          mensagem: 'Não foi possível consultar a disponibilidade.',
          detalhes: 'Verifique sua conexão e tente novamente.',
          aoTentar: () => {
            areaToast.exibir({ mensagem: 'Tentando novamente…', tom: 'informacao' })
          },
        }),
        new Carregando({ mensagem: 'Carregando painel…' }),
        new Carregando({ variante: 'skeleton', linhas: 3 }),
        new Carregando({ mensagem: 'Carregando…', desabilitado: true }),
      ),
      emLargura(areaToast, 'w-full'),
    )
  }
}
