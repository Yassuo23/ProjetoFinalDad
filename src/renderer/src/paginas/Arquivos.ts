import type { EstadoEquipamento } from '../../../shared/contratos/estados'

const ROTULOS_ESTADO: Record<EstadoEquipamento, string> = {
  disponivel: 'Disponível',
  em_manutencao: 'Em manutenção',
  baixado: 'Baixado',
  reservado: 'Reservado',
}

const MENSAGENS_ERRO: Record<string, string> = {
  ARQUIVO_NAO_ENCONTRADO: 'Arquivo de backup não encontrado. Selecione um arquivo .db válido.',
  CAMINHO_NAO_PERMITIDO:
    'Escolha um arquivo .db em Documentos, Downloads ou no diretório do aplicativo.',
  BACKUP_FALHOU: 'Não foi possível concluir a operação de backup. Tente novamente.',
  EXPORTACAO_FALHOU: 'Não foi possível exportar o CSV. Tente novamente.',
  DIALOGO_FALHOU: 'Não foi possível abrir a janela de arquivos. Tente novamente.',
}

const NUMERO = new Intl.NumberFormat('pt-BR')

/** Tela de arquivos: só chama a API tipada; nunca Node, IPC cru, fetch ou SQL. */
export function montarArquivos(container: HTMLElement): void {
  container.innerHTML = `
    <p class="hint">Selecione um backup .db para restaurar. O aplicativo será reiniciado após a restauração.</p>

    <div class="acoes-arquivos">
      <button id="arquivos-selecionar" class="button" type="button">Selecionar backup</button>
      <button id="arquivos-restaurar" class="button" type="button" disabled>Restaurar backup</button>
      <button id="arquivos-criar" class="button" type="button">Criar backup</button>
      <button id="arquivos-exportar" class="button" type="button">Exportar CSV de equipamentos</button>
    </div>

    <p id="arquivos-selecao" class="dica muted caminho-arquivo">Nenhum backup selecionado.</p>
    <p id="arquivos-status" class="dica caminho-arquivo" role="status" hidden></p>
    <p id="arquivos-erro" class="erro" role="alert" hidden></p>
  `

  const botaoSelecionar = obrigar<HTMLButtonElement>(container, '#arquivos-selecionar')
  const botaoRestaurar = obrigar<HTMLButtonElement>(container, '#arquivos-restaurar')
  const botaoCriar = obrigar<HTMLButtonElement>(container, '#arquivos-criar')
  const botaoExportar = obrigar<HTMLButtonElement>(container, '#arquivos-exportar')
  const selecao = obrigar<HTMLElement>(container, '#arquivos-selecao')
  const status = obrigar<HTMLElement>(container, '#arquivos-status')
  const areaErro = obrigar<HTMLElement>(container, '#arquivos-erro')

  let caminhoSelecionado: string | null = null

  const limparMensagens = (): void => {
    status.textContent = ''
    status.hidden = true
    areaErro.textContent = ''
    areaErro.hidden = true
  }

  const mostrarSucesso = (texto: string): void => {
    areaErro.textContent = ''
    areaErro.hidden = true
    status.textContent = texto
    status.hidden = false
  }

  const mostrarErro = (erro: unknown): void => {
    status.textContent = ''
    status.hidden = true
    areaErro.textContent = mensagemAmigavel(erro)
    areaErro.hidden = false
  }

  const atualizarSelecao = (caminho: string | null): void => {
    caminhoSelecionado = caminho
    botaoRestaurar.disabled = caminho === null
    selecao.textContent =
      caminho === null ? 'Nenhum backup selecionado.' : `Backup selecionado: ${caminho}`
  }

  const selecionarBackup = async (): Promise<void> => {
    limparMensagens()
    try {
      const resultado = await window.electronAPI.arquivos.abrir({
        titulo: 'Selecione o backup',
        filtros: [{ nome: 'Banco de dados', extensoes: ['.db'] }],
      })
      atualizarSelecao(resultado.caminho)
      mostrarSucesso(resultado.caminho === null ? 'Seleção cancelada.' : 'Backup selecionado.')
    } catch (erro) {
      mostrarErro(erro)
    }
  }

  const criarBackup = async (): Promise<void> => {
    limparMensagens()
    try {
      const resultado = await window.electronAPI.backup.criar()
      if (resultado.caminho === null) {
        mostrarSucesso('Cancelado.')
        return
      }
      mostrarSucesso(
        `Backup criado: ${resultado.caminho} · ${NUMERO.format(resultado.bytes)} bytes`,
      )
    } catch (erro) {
      mostrarErro(erro)
    }
  }

  const restaurarBackup = async (): Promise<void> => {
    if (caminhoSelecionado === null) return
    const caminho = caminhoSelecionado
    limparMensagens()
    mostrarSucesso('Restaurando backup… O aplicativo será reiniciado ao concluir.')
    try {
      const resultado = await window.electronAPI.backup.restaurar({ caminho })
      if (resultado.caminho === null) {
        mostrarSucesso('Restauração cancelada. O aplicativo não foi reiniciado.')
        return
      }
      mostrarSucesso(
        `Backup restaurado: ${resultado.caminho} · ${NUMERO.format(resultado.bytes)} bytes. O aplicativo será reiniciado.`,
      )
    } catch (erro) {
      mostrarErro(erro)
    }
  }

  const exportarCsv = async (): Promise<void> => {
    limparMensagens()
    try {
      const equipamentos = await window.electronAPI.equipamentos.listar()
      if (equipamentos.length === 0) {
        mostrarSucesso('Nenhum equipamento para exportar.')
        return
      }

      const cabecalhos: string[] = [
        'ID',
        'Nome',
        'Categoria',
        'Preço diária',
        'Valor aquisição',
        'Estado',
        'Ativo',
      ]
      const linhas: (number | string | boolean)[][] = equipamentos.map((equipamento) => [
        equipamento.id,
        equipamento.nome,
        equipamento.categoriaId,
        equipamento.precoDiaria,
        equipamento.valorAquisicao,
        ROTULOS_ESTADO[equipamento.estado],
        equipamento.ativo,
      ])

      const resultado = await window.electronAPI.exportacao.csv({
        titulo: 'Exportar equipamentos',
        nomeSugerido: 'equipamentos.csv',
        cabecalhos,
        linhas,
      })
      mostrarSucesso(
        resultado.caminho === null ? 'Cancelado.' : `CSV exportado: ${resultado.caminho}`,
      )
    } catch (erro) {
      mostrarErro(erro)
    }
  }

  botaoSelecionar.addEventListener('click', () => void selecionarBackup())
  botaoRestaurar.addEventListener('click', () => void restaurarBackup())
  botaoCriar.addEventListener('click', () => void criarBackup())
  botaoExportar.addEventListener('click', () => void exportarCsv())
}

function obrigar<T extends Element>(container: ParentNode, seletor: string): T {
  const elemento = container.querySelector<T>(seletor)
  if (!elemento) throw new Error(`Falha ao montar a tela de arquivos: ${seletor}`)
  return elemento
}

function mensagemAmigavel(erro: unknown): string {
  if (erro instanceof Error) {
    if (
      erro.message.startsWith('IPC_INVALIDO:') ||
      erro.message.startsWith('IPC_ORIGEM_INVALIDA:')
    ) {
      return 'A solicitação foi recusada. Recarregue o aplicativo e tente novamente.'
    }
    const mensagem = MENSAGENS_ERRO[erro.message]
    if (mensagem) return mensagem
  }
  return 'Não foi possível concluir a operação.'
}
