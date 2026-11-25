# ADR 0007 — Contratos de autenticação, manutenção, integrações e apoio ao dashboard

- **Status:** proposto
- **Data:** 2026-11-25
- **Decisores:** fundação (AS + ED); Dev C (diária de equipamento); Dev D (devoluções/pagamentos)

## Contexto

`docs/telas.md` (matriz da §2 e fichas da §4) e `docs/frontend-assumptions.md` apontam lacunas
reais entre o renderer e `src/shared/contratos/`: não há `auth:*`, Manutenção segue como
`PaginaEmConstrucao`, `categorias` só tem `listar`, o clima é gravado pelo main sem consulta
explícita por data, não há consulta de CNPJ/feriados, e o Dashboard monta localmente
`PagamentoItem`, `DevolucaoPendente`, `PrevisaoTempo` e `Faturamento`. O cliente pediu previsão
**pela data da reserva**, não por cidade (`docs/requisitos-cliente.md`).

A fundação decide contratos; handlers, serviços e repositórios ficam para os agentes seguintes.
O preload só pode importar `canais.ts` (ADR 0002, R3), e Zod só pode ser usado no main (R2).

## Decisão

**Adicionar canais e tipos de forma estritamente aditiva — nenhum canal existente é renomeado e
nenhum campo obrigatório é acrescentado a um modelo já consumido — com autorização conferida no
main e indisponibilidade de integração representada como retorno discriminado, nunca como erro
bruto.** Alternativa descartada: implantar as telas primeiro com tipos locais, porque isso
perpetua os mocks do Dashboard e deixa Login/Manutenção sem contrato verificável.

Erro comum a todos os canais: `IPC_INVALIDO:<canal>` quando o payload falha no schema do main.
Nenhuma mensagem de driver, SQL, URL ou chave de API atravessa o IPC. Perfil é conferido no
serviço do main, nunca escondido no renderer.

### Autenticação e sessão

| Canal | Payload | Retorno | Erros | Perfil | Dono |
| --- | --- | --- | --- | --- | --- |
| `auth:sessao-atual` | — | `EstadoSessao` = `autenticada` / `anonima` / `bootstrap` | — | anônimo | fundação (ED) |
| `auth:bootstrap` | `BootstrapEntrada { nome, login, senha }` | `Sessao` com perfil `Administrador` | `BOOTSTRAP_JA_REALIZADO`, `LOGIN_DUPLICADO`, `SENHA_FRACA` | anônimo, **somente** com zero usuários | fundação (ED) |
| `auth:entrar` | `AutenticarEntrada { login, senha }` | `Sessao` | `CREDENCIAIS_INVALIDAS`, `USUARIO_INATIVO` | anônimo | fundação (ED) |
| `auth:sair` | — | `void` (idempotente) | — | autenticado | fundação (ED) |

**Fluxo de primeira execução:** `auth:sessao-atual` devolve `bootstrap`; o renderer exibe o
formulário de senha escolhida; `auth:bootstrap` cria o administrador e abre a sessão. Depois do
primeiro usuário, o bootstrap falha sempre. Não existe senha padrão, literal de credencial nem
hash no código — o hash (com sal por usuário) é gerado no main, e `Usuario.senhaHash` **nunca**
sai do processo principal: a API expõe `UsuarioPublico = Omit<Usuario, 'senhaHash'>`.

| Canal | Payload | Retorno | Erros | Perfil | Dono |
| --- | --- | --- | --- | --- | --- |
| `usuarios:listar` | `UsuarioListarFiltros?` | `UsuarioPublico[]` | `SEM_PERMISSAO`, `NAO_AUTENTICADO` | admin | fundação (ED) |
| `usuarios:criar` | `UsuarioCriarEntrada { nome, login, senha, perfil }` | `UsuarioPublico` | `SEM_PERMISSAO`, `LOGIN_DUPLICADO`, `SENHA_FRACA` | admin | fundação (ED) |
| `usuarios:atualizar` | `UsuarioAtualizarEntrada { id, nome?, login?, perfil?, ativo? }` | `UsuarioPublico` | `SEM_PERMISSAO`, `NAO_ENCONTRADO`, `LOGIN_DUPLICADO` | admin | fundação (ED) |
| `usuarios:alterar-senha` | `UsuarioAlterarSenhaEntrada { id, senhaNova, senhaAtual? }` | `void` | `SEM_PERMISSAO`, `NAO_ENCONTRADO`, `CREDENCIAIS_INVALIDAS`, `SENHA_FRACA` | admin | fundação (ED) |

`senhaAtual` é exigida pelo serviço quando o administrador altera a própria senha; ao alterar a
de outro usuário, não. O perfil é `Administrador | Atendente`; `ativo` continua sendo soft delete.

### Categorias — CRUD completo

`Categoria` mantém seus três campos atuais. `CategoriaDetalhe = Categoria & Auditado & Inativavel`
é usado apenas pelos canais novos, para não obrigar os fixtures do renderer a mudar.

| Canal | Payload | Retorno | Erros | Perfil | Dono |
| --- | --- | --- | --- | --- | --- |
| `categorias:listar` (existente) | `CategoriaListarFiltros?` | `Categoria[]` (inalterado) | `DADOS_INVALIDOS` | ambos | fundação (ED) |
| `categorias:buscar-por-id` | `{ id }` | `CategoriaDetalhe` | `NAO_ENCONTRADO` | ambos | fundação (ED) |
| `categorias:criar` | `CategoriaCriarEntrada { nome, descricao? }` | `CategoriaDetalhe` | `REGISTRO_DUPLICADO`, `DADOS_INVALIDOS` | admin | fundação (ED) |
| `categorias:atualizar` | `CategoriaAtualizarEntrada { id, nome?, descricao? }` | `CategoriaDetalhe` | `NAO_ENCONTRADO`, `REGISTRO_DUPLICADO` | admin | fundação (ED) |
| `categorias:inativar` | `{ id }` | `void` | `NAO_ENCONTRADO` | admin | fundação (ED) |

### Manutenção como entidade própria

`OrdemManutencao` guarda equipamento, fornecedor, descrição, `dataEnvio`, `dataRetornoPrevista`,
`dataRetorno`, `custo` e `status` (`Aberta | Em andamento | Concluída`). `concluir` é a ação
explícita que preenche `dataRetorno` e `status`; "enviar para manutenção" continua sendo uma
edição de `Equipamento.estadoConservacao`, sem canal novo.

| Canal | Payload | Retorno | Erros | Perfil | Dono |
| --- | --- | --- | --- | --- | --- |
| `manutencao:listar` | `OrdemManutencaoListarFiltros?` | `OrdemManutencao[]` | `DADOS_INVALIDOS` | ambos (balcão consulta) | fundação (ED) |
| `manutencao:buscar-por-id` | `{ id }` | `OrdemManutencao` | `NAO_ENCONTRADO` | ambos | fundação (ED) |
| `manutencao:criar` | `OrdemManutencaoCriarEntrada` | `OrdemManutencao` | `RELACAO_INVALIDA`, `PERIODO_INVALIDO` | admin | fundação (ED) |
| `manutencao:atualizar` | `OrdemManutencaoAtualizarEntrada` | `OrdemManutencao` | `NAO_ENCONTRADO`, `RELACAO_INVALIDA`, `PERIODO_INVALIDO` | admin | fundação (ED) |
| `manutencao:concluir` | `OrdemManutencaoConcluirEntrada { id, dataRetorno?, custo? }` | `OrdemManutencao` | `NAO_ENCONTRADO`, `PERIODO_INVALIDO` | admin | fundação (ED) |
| `manutencao:inativar` | `{ id }` | `void` | `NAO_ENCONTRADO` | admin | fundação (ED) |

### Integrações — um canal por serviço

Todos retornam união discriminada por `estado`. `SERVICO_FORA`, `CREDENCIAL_AUSENTE`,
`SEM_DADOS` e `PESQUISA_INVALIDA` são **valores**, não exceções: o renderer pode seguir sem
previsão, exatamente como `docs/telas.md` §5 exige. O renderer nunca envia URL, cidade ou chave.

| Canal | Payload | Retorno | Erros | Perfil | Dono |
| --- | --- | --- | --- | --- | --- |
| `integracoes:previsao-tempo` | `PrevisaoTempoEntrada { data }` — ISO `YYYY-MM-DD` | `RespostaPrevisaoTempo`: `disponivel` com condição, descrição, mín./máx. e vento **ou** `indisponivel` com `motivo` | payload inválido → `IPC_INVALIDO`; upstream nunca lança | ambos | fundação (ED) |
| `integracoes:cnpj` | `{ cnpj }` | `RespostaCnpj`: `disponivel` com `DadosCnpj` **ou** `indisponivel` com `motivo` | payload inválido → `IPC_INVALIDO` | admin | fundação (ED) |
| `integracoes:feriados` | `FeriadosEntrada { ano }` | `RespostaFeriados`: `disponivel` com `FeriadoNacional[]` **ou** `indisponivel` com `motivo` e lista vazia | payload inválido → `IPC_INVALIDO` | ambos | fundação (ED) |

O CEP **não é recriado**: `clientes:buscar-cep` continua sendo o único canal de endereço. O
provedor de previsão é escolhido no main e precisa aceitar data; se só oferecer tempo atual, o
serviço devolve `indisponivel / SEM_DADOS` em vez de fingir previsão para a data pedida. Domínios
e chaves ficam em configuração/allowlist do main, nunca no bundle do renderer.

### Apoio ao Dashboard, devoluções e pagamentos

| Canal | Payload | Retorno | Erros | Perfil | Dono |
| --- | --- | --- | --- | --- | --- |
| `devolucoes:listar-pendentes` | `{ data? }` (padrão = hoje no main) | `DevolucaoPendente[]` (cliente, equipamento, prevista, atrasada, dias, multa estimada) | `DADOS_INVALIDOS` | ambos | Dev D |
| `devolucoes:calcular-multa` | `CalculoMultaEntrada { reservaId, dataDevolucao }` | `CalculoMulta { diasAtraso, valorDiarioMulta, valorMulta, ... }` | `NAO_ENCONTRADO`, `PERIODO_INVALIDO` | ambos | Dev D |
| `dashboard:resumo` | `ResumoDashboardEntrada? { data? }` | `ResumoDashboard` (contadores, faturamento, pendentes, `financeiro`, integrações indisponíveis) | — (indisponibilidades já vêm no retorno) | ambos; `financeiro = null` para atendente | fundação (ED) |
| `pagamentos:listar` (existente) | filtros ampliados: `dataInicio`, `dataFim`, `tipo` (`Reserva`/`Multa`) | inalterado | inalterados | ambos (escrita só admin) | Dev D |
| `equipamentos:listar` / `:criar` / `:atualizar` (existentes) | `valorDiaria?` opcional | `Equipamento.valorDiaria?` | `DADOS_INVALIDOS` se negativo | admin escreve; ambos leem | Dev C |

A regra da multa (valor fixo por dia, sem tolerância/teto, `MULTA_DIARIA_VALOR`) permanece no
serviço do main: o contrato só transporta o resultado. Isenção continua sendo feita por
`pagamentos:atualizar` (`valorMulta`/`valorTotal`), sem canal `devolucoes:isentar` nesta entrega.
`ResumoDashboard.financeiro` é `null` para atendente — o main não envia valores financeiros a
quem não pode vê-los. `faturamento.estimado` existe por compatibilidade com o tipo local do
renderer, mas é sempre `false` com dados reais.

**Quem quebra:** ninguém. São 24 canais novos e três mudanças opcionais em canais existentes
(`categorias:listar` aceita filtros; `equipamentos:criar/atualizar` aceitam `valorDiaria`;
`pagamentos:listar` aceita filtros de período/tipo). Chamadas atuais continuam válidas. Nenhuma
pasta nova foi criada e nenhum módulo de negócio foi alterado.

## Alternativas descartadas

- **Senha padrão `admin`/`admin` no código** — credencial conhecida distribuída com o app; o
  bootstrap com senha escolhida resolve o primeiro acesso sem segredo embutido.
- **Reutilizar `usuarios:criar` sem sessão para o bootstrap** — criaria um bypass de autorização
  no mesmo canal usado pelo administrador, confundindo R5.
- **Clima por cidade enviada pelo renderer** — expõe configuração e ignora o pedido explícito de
  previsão pela data da reserva; cidade/coordenadas ficam no main.
- **Lançar erro bruto das integrações** — quebraria a regra de ouro de clima indisponível não
  bloquear a confirmação (`docs/telas.md` §5).
- **Tornar `valorDiaria` e `Categoria.ativo` obrigatórios já** — quebraria fixtures e
  repositórios existentes; a aditividade preserva `npm run build` nesta entrega.
- **Criar `devolucoes:isentar` agora** — duplicaria a edição de `valorMulta` já existente em
  `pagamentos:atualizar` e aumentaria a superfície de autorização.

## Consequências

- O renderer pode abandonar os tipos locais de `DashboardServico` e a tela `PaginaEmConstrucao`
  de Manutenção sem inventar strings de canal.
- O preload ganha apenas funções finas de `invoke`; nenhum import novo além de `CANAIS` e tipos
  apagados. Zod continua restrito ao main (R2/R3), sem `.js` de lógica (R1) e sem `any` (R7).
- **Handoff ao ED:** registrar os 24 canais com os schemas correspondentes, criar
  serviços/repositórios/migrações de `usuario`, `ordem_manutencao` e `categorias`, coluna
  `valor_diaria`, guarda de perfil no main, hash com sal, allowlist das integrações e
  configuração de provedor/clima por data. Os handlers **não** foram implementados aqui.
- **Handoff ao Dev C:** persistir e devolver `valorDiaria` em `equipamentos:*`. **Ao Dev D:**
  pendentes, cálculo de multa e filtros de pagamento. **Ao FE:** consumir `window.electronAPI`
  e remover os mocks quando os handlers existirem.
- Revisitar quando a migração de `valor_diaria` existir (tornar o campo obrigatório), quando o
  provedor de clima aceitar previsão por data e ao definir a política formal de senhas.
