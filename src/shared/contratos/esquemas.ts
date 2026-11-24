import { z } from 'zod'
import { ESTADOS_EQUIPAMENTO } from './estados'

/**
 * Schemas de validação do main.
 *
 * PROIBIDO importar este arquivo no preload: Zod tem dependência de runtime e
 * o preload roda sob `sandbox: true`. Validação mora no processo principal.
 */

/** Canais `invoke` que não recebem payload. */
export const esquemaSemEntrada = z.undefined()

/** URL crua; a allowlist de domínios é aplicada no main antes do openExternal. */
export const esquemaAbrirExterno = z.url()

const esquemaId = z.object({ id: z.number().int().positive() })
const esquemaEstado = z.enum(ESTADOS_EQUIPAMENTO)
const esquemaDescricao = z.string().trim().max(500).nullish()

export const esquemaEquipamentoListar = z
  .object({
    categoriaId: z.number().int().positive().optional(),
    estado: esquemaEstado.optional(),
  })
  .optional()

export const esquemaEquipamentoBuscarPorId = esquemaId
export const esquemaEquipamentoInativar = esquemaId

export const esquemaEquipamentoCriar = z.object({
  nome: z.string().trim().min(1).max(120),
  categoriaId: z.number().int().positive(),
  precoDiaria: z.number().nonnegative(),
  valorAquisicao: z.number().nonnegative(),
  descricao: esquemaDescricao,
})

export const esquemaEquipamentoAtualizar = esquemaId.extend({
  nome: z.string().trim().min(1).max(120).optional(),
  categoriaId: z.number().int().positive().optional(),
  precoDiaria: z.number().nonnegative().optional(),
  valorAquisicao: z.number().nonnegative().optional(),
  estado: esquemaEstado.optional(),
  descricao: esquemaDescricao,
})

export const esquemaEquipamentoListarDisponiveis = z
  .object({
    inicio: z.iso.datetime(),
    fim: z.iso.datetime(),
    categoriaId: z.number().int().positive().optional(),
  })
  .refine((periodo) => periodo.inicio < periodo.fim, { message: 'PERIODO_INVALIDO' })

/** P4 — mesmo rigor de período, agora com id do equipamento. */
export const esquemaVerificarDisponibilidade = z
  .object({
    equipamentoId: z.number().int().positive(),
    inicio: z.iso.datetime(),
    fim: z.iso.datetime(),
  })
  .refine((periodo) => periodo.inicio < periodo.fim, { message: 'PERIODO_INVALIDO' })

// P5 — Reservas e clima

export const esquemaReservaListar = z
  .object({
    clienteId: z.number().int().positive().optional(),
    equipamentoId: z.number().int().positive().optional(),
    status: z.enum(['pendente', 'confirmada', 'cancelada', 'concluida']).optional(),
  })
  .optional()

export const esquemaReservaId = esquemaId

export const esquemaReservaCriar = z
  .object({
    clienteId: z.number().int().positive(),
    equipamentoId: z.number().int().positive(),
    inicio: z.iso.datetime(),
    fim: z.iso.datetime(),
    localAtividade: z.string().trim().min(1).max(120),
  })
  .refine((reserva) => reserva.inicio < reserva.fim, { message: 'PERIODO_INVALIDO' })

export const esquemaReservaPrevisao = z
  .object({
    local: z.string().trim().min(1).max(120),
    inicio: z.iso.datetime(),
    fim: z.iso.datetime(),
  })
  .refine((periodo) => periodo.inicio < periodo.fim, { message: 'PERIODO_INVALIDO' })

// P6 — Devoluções e multa

export const esquemaDevolucaoRegistrar = z.object({
  reservaId: z.number().int().positive(),
  devolvidoEm: z.iso.datetime(),
  observacoes: z.string().trim().max(500).nullish(),
})

export const esquemaDevolucaoBuscarPorReserva = z.object({
  reservaId: z.number().int().positive(),
})

export const esquemaMultaCalcular = z.object({
  reservaId: z.number().int().positive(),
  devolvidoEm: z.iso.datetime(),
})

// P7 — Pagamentos

export const esquemaPagamentoListar = z
  .object({
    reservaId: z.number().int().positive().optional(),
    status: z.enum(['pendente', 'pago', 'estornado']).optional(),
  })
  .optional()

export const esquemaPagamentoBuscarPorReserva = z.object({
  reservaId: z.number().int().positive(),
})

export const esquemaPagamentoRegistrar = z.object({
  reservaId: z.number().int().positive(),
  valor: z.number().positive(),
  forma: z.enum(['dinheiro', 'pix', 'cartao_credito', 'cartao_debito']),
})

export const esquemaPagamentoId = z.object({ id: z.number().int().positive() })

// P2 — Clientes e CEP

/** Aceita 01001-000 e 01001000; a normalização para dígitos é do serviço no main. */
const esquemaCep = z.string().regex(/^\d{5}-?\d{3}$/, 'CEP_INVALIDO')
const esquemaTextoOpcional = z.string().trim().max(120).nullish()
const esquemaEmail = z.email().nullish()

export const esquemaClienteListar = z
  .object({
    nome: z.string().trim().max(120).optional(),
    ativo: z.boolean().optional(),
  })
  .optional()

export const esquemaClienteBuscarPorId = esquemaId
export const esquemaClienteInativar = esquemaId
export const esquemaConsultarCep = z.object({ cep: esquemaCep })

const camposCliente = {
  email: esquemaEmail,
  telefone: z.string().trim().max(20).nullish(),
  cep: esquemaCep.nullish(),
  logradouro: esquemaTextoOpcional,
  numero: z.string().trim().max(10).nullish(),
  complemento: esquemaTextoOpcional,
  bairro: esquemaTextoOpcional,
  cidade: esquemaTextoOpcional,
  uf: z.string().trim().length(2).nullish(),
}

export const esquemaClienteCriar = z.object({
  nome: z.string().trim().min(1).max(120),
  ...camposCliente,
})

export const esquemaClienteAtualizar = esquemaId.extend({
  nome: z.string().trim().min(1).max(120).optional(),
  ...camposCliente,
})

// P3 — Fornecedores e CNPJ

const esquemaCnpj = z.string().regex(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{2}-?\d{2}$/, 'CNPJ_INVALIDO')

export const esquemaFornecedorListar = z
  .object({
    razaoSocial: z.string().trim().max(120).optional(),
    ativo: z.boolean().optional(),
  })
  .optional()

export const esquemaFornecedorBuscarPorId = esquemaId
export const esquemaFornecedorInativar = esquemaId
export const esquemaConsultarCnpj = z.object({ cnpj: esquemaCnpj })

const camposFornecedor = {
  nomeFantasia: z.string().trim().max(120).nullish(),
  cnpj: esquemaCnpj,
  email: esquemaEmail.nullish(),
  telefone: z.string().trim().max(20).nullish(),
  cep: esquemaCep.nullish(),
  cidade: z.string().trim().max(120).nullish(),
  uf: z.string().trim().length(2).nullish(),
}

export const esquemaFornecedorCriar = z.object({
  razaoSocial: z.string().trim().min(1).max(120),
  ...camposFornecedor,
})

export const esquemaFornecedorAtualizar = esquemaId.extend({
  razaoSocial: z.string().trim().min(1).max(120).optional(),
  nomeFantasia: z.string().trim().max(120).nullish(),
  cnpj: esquemaCnpj.optional(),
  email: esquemaEmail.nullish(),
  telefone: z.string().trim().max(20).nullish(),
  cep: esquemaCep.nullish(),
  cidade: z.string().trim().max(120).nullish(),
  uf: z.string().trim().length(2).nullish(),
})

// P8 — Manutenção

export const esquemaManutencaoListar = z
  .object({
    equipamentoId: z.number().int().positive().optional(),
    status: z.enum(['aberta', 'concluida']).optional(),
  })
  .optional()

export const esquemaManutencaoBuscarPorId = esquemaId

export const esquemaManutencaoAbrir = z.object({
  equipamentoId: z.number().int().positive(),
  descricao: z.string().trim().min(1).max(500),
  custo: z.number().nonnegative().nullish(),
})

export const esquemaManutencaoConcluir = esquemaId.extend({
  custo: z.number().nonnegative().nullish(),
})

// P9 — Feriados

export const esquemaFeriadoListar = z
  .object({
    ano: z.number().int().min(2000).max(2100).optional(),
    uf: z.string().trim().length(2).optional(),
    tipo: z.enum(['nacional', 'estadual', 'municipal', 'personalizado']).optional(),
  })
  .optional()

export const esquemaFeriadoBuscarPorId = esquemaId

export const esquemaFeriadoCriar = z.object({
  data: z.iso.date(),
  nome: z.string().trim().min(1).max(120),
  tipo: z.enum(['nacional', 'estadual', 'municipal', 'personalizado']),
  uf: z.string().trim().length(2).optional(),
})

export const esquemaFeriadoAtualizar = esquemaId.extend({
  data: z.iso.date().optional(),
  nome: z.string().trim().min(1).max(120).optional(),
  tipo: z.enum(['nacional', 'estadual', 'municipal', 'personalizado']).optional(),
  uf: z.string().trim().length(2).optional(),
})

export const esquemaFeriadoRemover = esquemaId

export const esquemaFeriadoImportar = z.object({
  ano: z.number().int().min(2000).max(2100),
  uf: z.string().trim().length(2).optional(),
})

// P10 — Usuários e perfis

export const esquemaUsuarioListar = z
  .object({
    perfil: z.enum(['administrador', 'operador', 'visualizador']).optional(),
    ativo: z.boolean().optional(),
  })
  .optional()

export const esquemaUsuarioBuscarPorId = esquemaId

export const esquemaUsuarioCriar = z.object({
  nome: z.string().trim().min(1).max(120),
  login: z.string().trim().min(3).max(60),
  senha: z.string().min(8).max(128),
  perfil: z.enum(['administrador', 'operador', 'visualizador']),
})

export const esquemaUsuarioAtualizar = esquemaId.extend({
  nome: z.string().trim().min(1).max(120).optional(),
  login: z.string().trim().min(3).max(60).optional(),
  perfil: z.enum(['administrador', 'operador', 'visualizador']).optional(),
  ativo: z.boolean().optional(),
})

export const esquemaUsuarioInativar = esquemaId

export const esquemaUsuarioAutenticar = z.object({
  login: z.string().trim().min(3).max(60),
  senha: z.string().min(1).max(128),
})

// P11 — Painel

export const esquemaPainelFiltros = z
  .object({ ano: z.number().int().min(2000).max(2100).optional() })
  .optional()

// ADR 0019 — Arquivos, backup e exportação

const esquemaExtensaoArquivo = z.enum(['.db', '.csv'])
const esquemaTituloDialogo = z.string().trim().min(1).max(120)
const esquemaNomeSugerido = z
  .string()
  .trim()
  .min(1)
  .max(120)
  // Nunca aceita separadores, unidade ou caracteres proibidos em nome de arquivo.
  .regex(/^[^\\/:*?"<>|]+$/u, 'CAMINHO_NAO_PERMITIDO')
  .refine((valor) => [...valor].every((caractere) => caractere.charCodeAt(0) >= 32), {
    message: 'CAMINHO_NAO_PERMITIDO',
  })
const esquemaFiltroArquivo = z.object({
  nome: z.string().trim().min(1).max(80),
  extensoes: z.array(esquemaExtensaoArquivo).min(1).max(2),
})

export const esquemaDialogoAbrir = z.object({
  titulo: esquemaTituloDialogo.optional(),
  filtros: z.array(esquemaFiltroArquivo).min(1).max(4).optional(),
})

export const esquemaDialogoSalvar = esquemaDialogoAbrir.extend({
  nomeSugerido: esquemaNomeSugerido.optional(),
})

/** `backup:criar` não recebe caminho: o diálogo de salvar é aberto no main. */
export const esquemaBackupCriar = esquemaSemEntrada

/**
 * Só a forma do caminho é validada aqui. Allowlist, extensão `.db`, existência e
 * `realpath` são do serviço, para o erro ser de domínio e não `IPC_INVALIDO`.
 */
export const esquemaBackupRestaurar = z.object({
  caminho: z
    .string()
    .trim()
    .min(1)
    .max(1024)
    .refine((valor) => !valor.includes('\0')),
})

export const esquemaExportacaoCsv = z
  .object({
    titulo: esquemaTituloDialogo.optional(),
    nomeSugerido: esquemaNomeSugerido.optional(),
    cabecalhos: z.array(z.string().trim().min(1).max(200)).min(1).max(50),
    linhas: z
      .array(
        z
          .union([z.string().max(1000), z.number().finite(), z.boolean(), z.null()])
          .array()
          .max(50),
      )
      .max(5000),
  })
  .refine(
    (entrada) => entrada.linhas.every((linha) => linha.length === entrada.cabecalhos.length),
    {
      message: 'CSV_INVALIDO',
    },
  )
