# Suposições do frontend

Registro de lacunas encontradas ao montar as telas do renderer. Este documento sinaliza o que falta
para remover o modo de exemplo; o canal `stripe:criar-checkout` já foi formalizado no contrato
compartilhado e está documentado na seção Pagamentos abaixo.

## Clientes

- A aba Clientes agora tem fonte real: `GET /clientes` de um mock REST local, documentado em
  `docs/api-clientes.md`. Suba com `npm run mock-api` (ou `npm run dev:api` para o stack completo).
- `ServicoClientes.listarComFonte()` devolve `{ clientes, dadosDeExemplo }`; use o sinalizador
  para mostrar o aviso “dados de exemplo” quando a API estiver indisponível. `listar()` segue
  devendo só `Cliente[]` para compatibilidade.
- `Cliente` passou a ter campos opcionais de endereço (`cep`, `logradouro`, `numero`,
  `complemento`, `bairro`, `cidade`, `uf`) para atender ao wireframe 3.4. Eles são opcionais para
  não quebrar os conjuntos de exemplo já tipados do Dashboard.
- `clientes.buscarCep` e `clientes.salvar` continuam sem canal: precisam de Arquiteto + ED.
- A tela visual (`PaginaClientes`) já está ligada à rota `/clientes` e consome
  `ServicoClientes.listarComFonte()`. A busca é local (nome, cidade, telefone e e-mail, sem
  acento); `F5` recarrega da API. O botão **Buscar CEP**, o **Salvar** e o **F2** (editar) mostram
  aviso por toast — o formulário só preenche a partir da linha selecionada, não grava nada.
- Para virar CRUD: Arquiteto + ED precisam formalizar `clientes.buscarCep`, `clientes.salvar` e
  `clientes.excluir` (canais, schemas e handlers). O renderer já tem `Campo.definirValor` e
  `Select.definirValor` para ligar a edição quando os canais existirem.

## Equipamentos

### Estado atual

- `EquipamentoServico.listar()` chama `window.electronAPI.equipamentos.listar()` e
  `listarCategorias()` chama `window.electronAPI.categorias.listar()`.
- Os tipos já existem em `src/shared/contratos/api.ts` (`equipamentos.listar`,
  `categorias.listar`), mas os handlers de IPC **ainda não estão registrados no main**.
- Se a chamada falhar (canal ausente), o serviço devolve dados de exemplo tipados com
  `Equipamento` e `Categoria` de `src/shared/contratos/modelos`. A tela exibe o aviso discreto
  **“dados de exemplo”** no cabeçalho.

### O que falta no contrato

#### CRUD de equipamentos

Hoje há somente leitura (`equipamentos.listar`). Para a tela deixar de ser somente consulta,
faltam canais e schemas para:

| Operação  | Canal sugerido           | Entrada sugerida                                     | Retorno sugerido |
| --------- | ------------------------ | ---------------------------------------------------- | ---------------- |
| Criar     | `equipamentos.criar`     | `{ nome, categoriaId, precoDiaria, disponivel }`     | `Equipamento`    |
| Atualizar | `equipamentos.atualizar` | `{ id, nome, categoriaId, precoDiaria, disponivel }` | `Equipamento`    |
| Excluir   | `equipamentos.excluir`   | `{ id }`                                             | `void`           |

Cada canal precisa de: constante em `canais.ts`, schema Zod no main, handler fino que valide
e delegue, regra em serviço, SQL parametrizado em repositório e exposição no preload.

#### Estado de conservação

O modelo `Equipamento` não possui estado de conservação. A tela de Equipamentos do mapa
(`docs/telas.md`) e a rota antiga de placeholder citavam `estadoConservacao`. É preciso
decidir:

- Novo campo no modelo compartilhado (ex.: `estadoConservacao: 'novo' | 'bom' | 'regular' | 'mau'`),
  com migração SQLite e atualização dos schemas; **ou**
- Modelo separado de manutenção, se o estado for derivado de ordens de serviço.

Enquanto não há decisão, a tela mostra apenas disponibilidade (`disponivel: boolean`) com
badge “Disponível” / “Indisponível”. Não foi inventado campo novo no renderer.

### Fora do escopo desta tela

- Filtro por disponibilidade (além da badge) — pode virar um `Select` quando houver necessidade.
- Paginação e ordenação no servidor — a `Tabela` ordena localmente por enquanto.
- edição em modal — depende do CRUD acima.

## Dashboard

### Estado atual

- `DashboardServico.carregar()` tenta `window.electronAPI.reservas.listar()`,
  `window.electronAPI.clientes.listar()` e reutiliza `EquipamentoServico.listar()` (que já possui
  fallback próprio). Nenhuma string de canal aparece no renderer.
- Se qualquer fonte falhar, o painel inteiro usa o conjunto de exemplo tipado com `Reserva` e
  `Cliente` do contrato e com os equipamentos devolvidos pelo próprio `EquipamentoServico`. O
  resultado expõe `dadosDeExemplo: true`.
- A tela exibe uma faixa discreta com “dados de exemplo / offline” e continua renderizando os
  KPIs, a agenda, o clima e a frota. `EstadoErro` fica reservado a uma falha inesperada do
  próprio serviço agregador.
- A coluna “Tipo” da agenda é derivada de `Reserva.inicio`/`Reserva.fim` comparados com a data local:
  `fim === hoje` significa devolução; caso contrário, retirada. O horário é ilustrativo somente no
  conjunto de exemplo — em dados reais a célula mostra “—”.

### Tipos locais do renderer

Nenhum campo novo foi acrescentado a `src/shared/contratos`. Os tipos abaixo vivem em
`src/renderer/src/servicos/DashboardServico.ts`:

| Tipo local                             | Uso na tela                                     | Lacuna no contrato / endpoint                                                                                                                                        |
| -------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PagamentoItem`, `StatusPagamento`     | coluna “Pagamento / Multa” e KPI de faturamento | faltam `pagamentos.listar` e `multas.calcular` (com modelo de pagamento)                                                                                             |
| `PrevisaoTempo`, `CondicaoClima`       | card “Previsão do tempo”                        | falta `clima.previsao` — chamada HTTP deve ser feita no main, com allowlist; por isso `previsaoExemplo` é sempre `true` e o card está marcado como “exemplo”         |
| `StatusFrota.manutencao`               | contador “Manutenção”                           | `Equipamento` só tem `disponivel: boolean`; falta `estadoConservacao` ou `manutencao.listar`. Com dados reais o valor é `null` e a tela mostra “—”; no exemplo é `1` |
| `Faturamento.estimado`                 | KPI “Faturamento do dia”                        | sem canal de pagamentos, o valor real é estimado pela diária dos equipamentos das reservas de hoje e identificado com badge “estimativa”                             |
| `DevolucaoPendente.atrasada`, `.multa` | KPI “Devoluções pendentes” e destaque de atraso | faltam `devolucoes.listarPendentes`, `multas.calcular` e vínculo `Reserva` → devolução                                                                               |
| horário da agenda                      | coluna “Horário”                                | `Reserva` não possui campo de horário; necessário novo campo no modelo e no schema                                                                                   |

### Handoff

Os canais/models acima precisam ser decididos pelo Arquiteto e expostos pelo ED. Até lá, a tela
permanece 100% tipada no renderer, sem acesso a Node, SQL ou strings de canal.

## Pagamentos

### Estado atual

- A tabela e os cards (Recebido / Pendente / Multas) vêm de `PagamentoServico.listar()`, que
  devolve somente dados de exemplo tipados (`PagamentoListaItem`) marcados na tela com o badge
  **“dados de exemplo”**. Ainda não existe canal de consulta de pagamentos; nenhuma string de
  canal foi criada no renderer.
- O checkout real passa por `window.electronAPI.stripe.criarCheckout(payload)`, novo contrato
  adicionado pelo integrador em `src/shared/contratos` (`ApiZenite.stripe`). Somente quando a
  sessão volta com `status: 'open'` o serviço chama `window.electronAPI.abrirExterno(sessao.url)`.
- A URL `https://checkout.stripe.com/...` é validada e aberta no main, onde `abrirExterno` mantém
  allowlist explícita de domínios. O renderer não usa `fetch`, `window.open` nem guarda chave da
  API do Stripe; o formulário envia apenas o payload tipado.
- Valores em reais são convertidos para `valorCentavos` inteiro no renderer; a validação
  definitiva do payload e da URL acontece no main, conforme o contrato compartilhado.
- Erros da ponte são normalizados em mensagens curtas (“Não foi possível abrir o checkout…”),
  sem stack, URL ou segredo. A tela trata carregamento (`aria-live="polite"`), erro/toast e
  lista vazia com ação “Limpar filtros”.

### Handoff e risco residual

- Para trocar os dados ilustrativos por dados reais falta um canal de listagem de pagamentos,
  decidido pelo Arquiteto e exposto pelo ED. Baixa e estorno também não foram implementados: a
  ação “Ver” apenas avisa que comprovantes não existem no modo de exemplo.
- O valor e o tipo da cobrança ainda são informados pelo operador no formulário, como prevê o
  wireframe 3.9. Assim que existir `pagamentos.registrar`/vínculo com reserva e multa (Dev D), a
  regra de cálculo deve migrar para `src/main/servicos/`; o main valida limites, mas não recalcula
  o valor hoje.
- O header `Idempotency-Key` é derivado de `tipo + reservaId + valorCentavos`, então retries
  idênticos em até 24 h reaproveitam a sessão. Sem `reservaId`, a chave usa o payload completo.
- Aponte `$STRIPE_SUCCESS_URL` e `$STRIPE_CANCEL_URL` para páginas públicas: o app desktop não
  recebe callback automático e a baixa do pagamento ainda não é persistida em SQLite.
- Erros IPC são achatados para uma mensagem curta: códigos (`TIMEOUT`, `CONFIGURACAO`, etc.) e
  stacks ficam somente no main. Se a tela precisar diferenciar falhas, pedir ao Arquiteto um DTO
  `{ codigo, mensagem }` no contrato.
- A configuração da Stripe é lida **no primeiro pagamento**, não na abertura do app. O main carrega
  somente `.env` (`process.loadEnvFile()` fora do instalador); `.env.example` é apenas modelo e
  contém placeholders. Sem `.env`, o checkout falha com `ErroConfiguracaoStripe: STRIPE_SECRET_KEY
  não configurada` — foi o erro observado. Após preencher `.env`, reinicie o Electron; recarregar a
  janela não recarrega o ambiente.
- **Nunca** colocar a chave em `.env.example`: ele é versionável. Se uma chave real já foi
  commitada ou compartilhada, rotacione-a no dashboard da Stripe antes de usar em produção.
