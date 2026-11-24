import type {
  DialogoAbrirEntrada,
  DialogoSalvarEntrada,
  ResultadoDialogo,
} from '../../shared/contratos/modelos'

/**
 * Porta de diálogos consumida pelo serviço. Quem a implementa é o main
 * (`ArquivosNativos`); a estrutura é compatível sem acoplar este módulo a
 * `main/seguranca` (ADR 0005).
 */
export interface PortaDialogos {
  abrir(entrada: DialogoAbrirEntrada): Promise<ResultadoDialogo>
  salvar(entrada: DialogoSalvarEntrada): Promise<ResultadoDialogo>
}

/** Porta usada pelo handler; implementação trocável nos testes. */
export interface ServicoArquivos {
  abrir(entrada: DialogoAbrirEntrada): Promise<ResultadoDialogo>
  salvar(entrada: DialogoSalvarEntrada): Promise<ResultadoDialogo>
}

/** Diálogos são apenas delegados: o caminho é sempre escolhido no main. */
export class ArquivosServico implements ServicoArquivos {
  constructor(private readonly arquivos: PortaDialogos) {}

  abrir(entrada: DialogoAbrirEntrada): Promise<ResultadoDialogo> {
    return this.arquivos.abrir(entrada)
  }

  salvar(entrada: DialogoSalvarEntrada): Promise<ResultadoDialogo> {
    return this.arquivos.salvar(entrada)
  }
}
