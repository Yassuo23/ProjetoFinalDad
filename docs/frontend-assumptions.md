# Suposições do frontend

Registro histórico de lacunas encontradas ao montar as telas do renderer. As decisões já
implementadas estão consolidadas aqui; a fonte atual de comportamento é `docs/telas.md`.

> **Estado atual (2026-11-25):** os dois blocos de integração real foram concluídos. Não há mais
> dado de exemplo nem fallback de leitura em nenhuma tela: toda falha de canal de dado vira
> `EstadoErro` com “Tentar de novo”. Integrações externas (CEP, CNPJ, clima, feriados) são a única
> exceção — falha vira estado explícito `indisponivel`/“não encontrado” em aviso discreto, sem
> bloquear o formulário e sem inventar valores. As seções abaixo foram revisadas para refletir esse
> estado; onde o texto ainda descreve o passado, ele está marcado como “histórico”.

## Equipamentos

### Estado atual

- CRUD completo disponível via `window.electronAPI.equipamentos.*` e `categorias:listar`/
  `fornecedores:listar`.
- A tela é administrativa: item oculto para atendente e rota direta bloqueada.
- `Equipamento` expõe `estadoConservacao` e `disponibilidade`.
- **Sem fallback:** `EquipamentoServico` é uma fachada fina sobre `window.electronAPI.equipamentos.*`
  e `categorias:listar`. Se uma chamada falhar, a exceção é propagada e a tela exibe `EstadoErro`
  com “Tentar de novo”; nenhum dado de exemplo é devolvido nem escrita é habilitada sobre dados
  inventados. (Histórico: o antigo “dados de exemplo” foi removido nesta entrega.)

### Decisões aplicadas

- **Conservação:** `Novo` · `Bom` · `Desgastado` · `Em Manutenção`. “Enviar para manutenção” é
  uma edição da conservação, não um canal separado.
- **Disponibilidade:** `Disponível` · `Indisponível` · `Em manutenção`. `equipamentos:listar-disponiveis`
  exige `disponibilidade = 'Disponível'` e ausência de reserva no período.
- **Ativo:** continua sendo exclusão lógica; não é usado como disponibilidade.
- **Diária:** `Equipamento.valorDiaria` é exibido e gravado no formulário e usado como sugestão
  ao selecionar o item em Reservas; a diária acordada continua em `ItemReserva.valorDiaria`.

### Ainda fora do escopo

- Paginação e ordenação no servidor — a `Tabela` ordena localmente por enquanto.
- Edição em modal — o padrão adotado foi painel de formulário.
- Filtro pré-aplicado por `fornecedorId` a partir de Fornecedores — o roteador hash ainda não
  aceita parâmetros de rota.

## Dashboard

### Estado atual

- `DashboardServico.carregar()` consulta `window.electronAPI.dashboard.resumo({ data: hojeISO() })`,
  que já devolve `ResumoDashboard` calculado no main (retiradas/devoluções, pendentes e atrasadas
  com multa, faturamento do dia, status da frota com manutenção e o financeiro para administrador).
  As listas de reservas, clientes, itens, pagamentos e equipamentos vêm das APIs tipadas. Nenhuma
  agregação de negócio é reimplementada no renderer (ADR 0008).
- **Sem fallback:** qualquer falha de canal de dado é propagada para `PaginaDashboard`, que exibe
  `EstadoErro` com “Tentar de novo”. Não há mais “faixa de dados parciais” nem lista vazia inventada.
- O card “Previsão do tempo” usa `integracoes.previsaoTempo({ data: hojeISO() })` — a data das
  reservas da agenda, nunca uma cidade ou chave. `estado: 'indisponivel'` vira badge
  “indisponível” e texto “A locação não fica bloqueada.”; nenhum valor fictício é exibido.
- `integracoes.feriados({ ano })` é consultado para sinalizar feriado nacional na data atual; a data
  entra na agenda e no aviso da confirmação de reserva. Se indisponível, o aviso é discreto e a
  location não fica bloqueada.
- Exceções lançadas pelo canal de integração são convertidas somente para o estado explícito
  `indisponivel` (`SERVICO_FORA`) — nunca para dado fictício. Falha de dado continua sendo erro.
- `PaginaReservas` consome `Reserva.previsaoTempo` e `Reserva.altaDemandaPrevista` gravados pelo
  main ao confirmar. O renderer não reexecuta a regra de alta demanda, clima ou feriados.
- A fungibilidade de pagamento usa `valorMulta > 0` → “Multa”, `Estornado` → “Estornado”,
  `Pago` → “Pago” e o restante → “Pendente”. Faturamento com pagamentos disponíveis é
  “confirmado”; sem eles, é “estimativa” pelas diárias dos itens.
- A coluna “Tipo” da agenda deriva de `dataInicio`/`dataFim` comparados com a data local:
  `fim === hoje` significa devolução; caso contrário, retirada. `Reserva` não tem horário, então a
  célula mostra “—”.

### Tipos do contrato (sem tipos provisórios locais)

Nenhum campo novo foi acrescentado a `src/shared/contratos`. `DadosDashboard` em
`src/renderer/src/servicos/DashboardServico.ts` apenas reúne tipos já existentes no contrato —
`ResumoDashboard`, `Reserva`, `Cliente`, `ItemReserva`, `Pagamento`, `Equipamento`,
`RespostaPrevisaoTempo` e `RespostaFeriados`. A agregação (retiradas/devoluções, pendentes,
atrasos, multa, faturamento, frota e financeiro) vive no main e chega pronta em `resumo`. Os tipos
provisórios antigos (`PagamentoItem`, `PrevisaoTempo`, `StatusFrota`, `Faturamento`,
`DevolucaoPendente`, `fontesIndisponiveis`) foram removidos.

### Canais consumidos (todos com handler registrado)

- `dashboard:resumo` — registrado em `src/main/ipc/handlers/dashboard.ts`; devolve
  `ResumoDashboard`, inclusive `financeiro` (nulo para atendente).
- `devolucoes:listar-pendentes` — registrado em `src/main/ipc/handlers/devolucoes.ts`; usado pela
  prévia de pendências.
- `devolucoes:calcular-multa` — registrado no mesmo handler; usado na prévia didática da multa no
  modal de devolução, sem registrar. A multa definitiva continua sendo calculada no main por
  `devolucoes:criar`; o renderer não reimplementa a regra (domingos/feriados).

`auth:*` e `usuarios:*` já estão implementados no renderer (ver § Autenticação e sessão).
Nenhuma string de canal, Node, SQL ou chave aparece no renderer.

## Fundação visual

### Decisões aplicadas

- **Tipografia:** o pedido explícito prevaleceu sobre `docs/design-system.md` §5.4. Foram
  instalados `@fontsource/fraunces` e `@fontsource/inter` **estáticos** (não as variáveis
  recomendadas no DS), apenas nos pesos efetivamente usados pelo renderer — 400 e 600 — e no
  subset `latin`, que cobre os acentos pt-BR (`Ê`, `ç`, `ã`, `é`). A instalação foi autorizada
  pelo usuário/Arquiteto. Os imports ficam no topo de `src/renderer/src/tailwind.css`, antes de
  `@import 'tailwindcss'`, sem CDN, URL remota ou arquivo `.css` escrito à mão. A CSP de produção
  em `src/main/seguranca/Csp.ts` já contém `font-src 'self' data:`; nenhum ajuste de CSP foi
  necessário e o main não foi alterado.
- **Logo:** são usados os **PNGs oficiais** em `src/renderer/src/assets/brand/`, importados pelo
  Vite em `src/renderer/src/layout/LogoZenite.ts`. Mapeamento: `fundo='escuro'` →
  `logo-escuro.png` (746×315, fundo `rgb(13,21,18)`) e `fundo='claro'` → `logo-claro.png`
  (920×387, fundo `rgb(236,233,225)`). A variante completa renderiza o PNG inteiro em `<img>` com
  `alt` em pt-BR; a variante compacta mostra **apenas o símbolo oficial recortado do PNG**, sem
  redesenho vetorial: wrapper `relative size-8 shrink-0 overflow-hidden` com `bg-grafite` ou
  `bg-pedra` conforme o fundo do arquivo, e `<img>` absoluto com `w-[...] h-[...]` e `left/top`
  negativos arbitrários. Os limites medidos do símbolo são x 32–219 / y 61–249 no PNG escuro e
  x 55–286 / y 78–308 no PNG claro; o recorte usa esses valores escalados para 32 px. A sidebar
  em `w-16` usa a compacta e em `lg:w-sidebar` usa a completa. Não há SVG autoral para a marca,
  nem imagem remota, `style=`, `innerHTML` dinâmico ou `any`.
- **Formatação pt-BR:** uma única classe pura, `FormatadorPtBr` (`src/renderer/src/util/`), substituiu
  os formatadores locais duplicados de Dashboard, Equipamentos, Devoluções, Pagamentos e Reservas e
  a formatação de `Date` em `Tabela.ts`. CPF, CNPJ, telefone e CEP passaram a ter máscara progressiva
  nos formulários de Clientes/Fornecedores, e o CPF também aparece mascarado no seletor de clientes
  de Reservas. A data aceita ISO `aaaa-mm-dd` (com ou sem hora) e é convertida por componentes
  locais — sem `toLocaleDateString` em cada tela, sem deslocamento de fuso. Entrada inválida devolve
  `—`. Testes Vitest cobrem válidos, inválidos e máscaras parciais.
- **Estados e movimento:** `EstadoVazio` ganhou ilustrações SVG originais em traço 1,5 px, uma por
  contexto (reservas, equipamentos, categorias, manutenção, pessoas), desenhadas em `criarIlustracao`
  com `createElementNS` e `path` tipados. `Tabela` usa skeleton (`Carregando` com `variante:
'skeleton'`) no lugar do spinner. Animações e transições receberam `motion-reduce:animate-none` /
  `motion-reduce:transition-none` em todos os componentes e páginas, conforme DS §9.6. O traço de
  `criarIcone` passou de 1,75 para 1,5 px, conforme DS §9.4.

### Handoff / risco residual

- Nenhuma mudança de contrato IPC foi necessária: formatação pt-BR e assets são puramente de
  apresentação. Os valores enviados ao main (CPF/CNPJ/CEP/telefone) continuam sem máscara, como
  exige o contrato; `telefone` agora é normalizado para dígitos antes de sair do renderer.
- As máscaras progressivas são aplicadas com `Campo.definirValor` dentro de `aoAlterar`; isso não
  dispara novo evento `input`, mas reposiciona o cursor no fim do campo. É uma limitação conhecida
  de UX, sem impacto em validação ou contrato.
- As ilustrações são autorais e não substituem nenhum asset oficial; foram adotadas porque o DS as
  descreve em texto e não há SVG original no repositório.

## Reservas — consulta e formulário focado

### Decisões aplicadas

- `#/reservas` é a consulta: filtros locais de cliente/status/período, tabela, detalhes e ações
  “Ver”, “Editar”, “Cancelar” e “Inativar”. `#/reservas/nova` é o formulário: cliente, período,
  equipamentos e resumo, sem tabela de consulta junto. A edição abre nesta segunda rota.
- A sidebar mantém “Reservas” ativa nos dois caminhos; o Dashboard leva “Nova reserva (Ctrl+N)”
  e a ação do estado vazio a `#/reservas/nova`, com atalho `Ctrl+N` registrado somente enquanto o
  Dashboard está montado.
- Clientes, reservas e categorias são carregados em tarefas separadas. Falha em `clientes.listar`
  não zera as reservas, e lista vazia legítima vira estado “Cadastrar cliente”. O botão leva a
  `#/clientes` e guarda o rascunho (datas, categoria e itens) na memória do módulo do renderer;
  ao voltar, o formulário é restaurado.
- A disponibilidade é recalculada automaticamente após mudança de datas, com debounce de 250 ms,
  token de requisição e descarte de respostas desatualizadas. Antes da primeira consulta válida,
  o estado é neutro (“Informe as datas para ver equipamentos”). Erro mantém “Tentar novamente”.
- O botão de confirmação fica desabilitado enquanto faltar cliente, período válido ou itens, com
  os motivos visíveis ao lado e em `title`/`aria-describedby`. A criação usa `reservas:criar`
  seguido de `reservas:atualizar` para `Confirmada`; se a segunda chamada falhar, a tela navega
  para a consulta com aviso de confirmação não concluída, sem afirmar que confirmou.
- Clima e feriados continuam sendo responsabilidade do main (`previsaoTempo` /
  `altaDemandaPrevista`). Previsão vazia não bloqueia nem abre modal: a consulta mostra
  “Indisponível (a reserva não fica bloqueada).” e o toast de sucesso registra a indisponibilidade.
- A diária sugerida vem de `Equipamento.valorDiaria ?? 0`, exibida com `FormatadorPtBr.moeda`;
  a diária acordada segue em `ItemReserva.valorDiaria`. Nenhum dado fictício é inventado.

### Handoff / risco residual

- Nenhum canal, schema, handler ou função fina do preload faltou: `clientes.listar`,
  `equipamentos.listarDisponiveis`, `reservas.criar`, `reservas.atualizar` e `itensReserva.*`
  já estão em `src/preload/index.ts` e tipados em `src/shared/contratos/api.ts`.
- Rascunho, edição pendente e destaque pós-confirmação vivem apenas na memória do módulo do
  renderer. Um recarregamento completo da aplicação entre ida a Clientes e volta descarta o
  rascunho; isso foi aceito como solução simples, sem novo contrato nem persistência local.
- A checagem de administrador passou a derivar de `Sessao.perfil` (vinda do main); o alternador de
  perfil de demonstração foi removido do cabeçalho. Nenhuma dependência nova foi instalada.

## Autenticação e sessão

### Estado atual

- Rotas registradas: `#/escolha-conta`, `#/cadastro-cliente`, `#/cliente/disponibilidade`,
  `#/cliente/nova-reserva`, `#/cliente/minhas-reservas`, além do fluxo atual `#/login` e
  `#/primeira-execucao` (nomes escolhidos para casar com os canais `auth:*` e com os wireframes
  8.1/8.2 de `docs/ux-fluxos.md`). Nenhuma alteração de contrato foi necessária: `ApiZenite.auth`
  e as funções finas do preload já existem, inclusive `auth.cadastrarCliente`.
- Guard síncrono em `src/renderer/src/nucleo/Roteador.ts` + `ControleAcesso.ts`. A sessão é lida
  uma vez por `auth:sessao-atual` antes de iniciar o roteador:
  - `autenticada` → destino por perfil: Cliente só nas rotas `#/cliente/*`; Administrador/Atendente
    na rota solicitada, com rotas públicas e de cliente redirecionadas para `#/dashboard`;
  - `anonima` → rota pública permanece acessível; qualquer rota protegida é guardada em memória e
    o usuário vai a `#/escolha-conta` (de onde escolhe `#/login`);
  - `bootstrap` → qualquer rota vai a `#/primeira-execucao`;
  - falha ao consultar → tela de erro com “Tentar novamente”, sem entrar no app.
- A rota tentada antes da entrada é preservada e consumida após `auth:entrar`, `auth:bootstrap` ou
  `auth.cadastrarCliente`. Cliente autenticado sempre começa em `#/cliente/disponibilidade`, mesmo
  que exista rota pendente. O guard devolve a rota permitida antes de instanciar a página, e o
  redirecionamento troca o hash numa única etapa — não há montagem de tela protegida sem sessão
  nem loop de redirecionamento.
- `src/renderer/src/nucleo/Sessao.ts` guarda somente `Sessao` em memória. Não há token,
  `localStorage`, cookie, gravação em disco nem hash de senha no renderer. `Perfil.ts` deriva
  `Perfil` de `Sessao.perfil`: `Administrador`, `Atendente` ou `Cliente`; sem sessão adota
  `cliente` (fail-closed), nunca transforma Cliente em atendente nem atendente em administrador.
  `clienteId` ausente, nulo ou inválido significa “sem vínculo” e desabilita ações de reserva.
  Sidebar e cabeçalho mostram apenas as opções do perfil, e “Sair” chama `auth:sair`, limpa o
  estado local e volta a `#/escolha-conta`.
- `ServicoAutenticacao` é a única ponte com `auth:*`: nenhuma string de canal, Zod, Node ou SQL no
  renderer. `ErrosAutenticacao` traduz o `codigo` devolvido pelo main; mensagens de entrada são
  genéricas (`Usuário ou senha inválidos.`) para não revelar existência de login nem bloqueio.
- Telas de Login e Primeira execução tratam carregando, erro e sucesso. Em Primeira execução não
  há senha padrão nem pré-preenchimento; a política do main é repetida em texto simples e a senha
  é limpa dos campos após cada tentativa.

### Handoff / risco residual

- `CREDENCIAIS_INVALIDAS` é o único código que o main usa hoje para senha errada **e** bloqueio
  temporário (`docs/seguranca.md`). O renderer exibe a mensagem genérica para ambos; se o main
  passar a sinalizar bloqueio com código próprio, `motivoErroAutenticacao` já reconhece texto
  contendo “bloqueio/tentativa” e mostra “Muitas tentativas incorretas. Aguarde um minuto…”.
  Handoff ao Arquiteto/ED: formalizar um código de bloqueio no contrato, sem alterar o renderer.
- A validação local de login/senha espelha o schema do main apenas para feedback imediato; a
  decisão final continua no processo principal. Nenhuma regra de negócio foi movida para o renderer.
- `auth:sair` é chamado antes de limpar o estado local. Se o IPC falhar, o renderer ainda descarta
  a sessão em memória e volta à Escolha de conta; o main pode manter a sessão até expirar. Handoff:
  conferir se `auth:sair` deve ser idempotente para sessão já encerrada.
- O token/estado do main expira após 8 h (`DURACAO_SESSAO_PADRAO_MS`). O renderer não renova a
  sessão: uma chamada IPC devolvendo `NAO_AUTENTICADO` (ou a verificação periódica de
  `auth:sessaoAtual`) volta ao Login com aviso; ausência de sessão/Sair continua indo à Escolha de
  conta.
- A tela de Primeira execução não oferece link para Login: no estado `bootstrap` o guard levaria a
  rota de volta, gerando loop. Quando já existe administrador, a Escolha de conta leva ao Login.
- `usuarios:*` (gestão de usuários/perfis) é usado somente por `PaginaUsuarios`, visível apenas
  para administrador; senha nunca é exibida nem guardada no renderer.

## Identidade do cliente e área do cliente

### Rotas e permissões aplicadas

| Rota                          | Quem acessa                         | Finalidade                                              |
| ----------------------------- | ----------------------------------- | ------------------------------------------------------- |
| `#/escolha-conta`             | pública                             | “Sou dono/atendente da loja” ou “Quero alugar”          |
| `#/cadastro-cliente`          | pública                             | auto-cadastro via `auth.cadastrarCliente`               |
| `#/cliente/disponibilidade`   | Cliente                             | consulta de equipamentos livres por período             |
| `#/cliente/nova-reserva`      | Cliente                             | formulário de reserva em nome da própria conta          |
| `#/cliente/minhas-reservas`   | Cliente                             | cartões das reservas, detalhes e previsão do tempo      |

A opção “Sou dono/atendente da loja” leva ao fluxo ATUAL (`#/login` ou `#/primeira-execucao`) sem
alterar comportamento. A opção “Quero alugar equipamentos” leva ao cadastro; após o retorno do main
com a sessão já autenticada, o renderer entra automaticamente na área do cliente.

`PaginaReservas` é reaproveitada com `modoCliente`: não consulta `clientes.listar`, não mostra o
seletor de cliente nem a tabela administrativa (são cartões), não exibe “Editar”, “Cancelar” nem
“Inativar”, e não chama `categorias:*` (usa o domínio fechado `CategoriaEquipamento` do contrato).
O cabeçalho e a sidebar do cliente mostram só Disponibilidade, Minhas reservas, Nova reserva e
Sair — sem Dashboard, Clientes, Equipamentos, Fornecedores, Manutenção, Pagamentos ou Devoluções.

### Validação e mensagens

- Máscaras de CPF, telefone e CEP vêm de `FormatadorPtBr`; os valores enviados ao main são dígitos.
  O payload não contém `perfil`: o main fixa `'Cliente'` no literal e rejeita auto-elevação.
- `ValidacaoCadastroCliente` só dá feedback imediato; a decisão final é do schema/main.
- `CPF_DUPLICADO` → “CPF já cadastrado.”
- `BOOTSTRAP_PENDENTE` → “Ainda não é possível criar contas de cliente. Fale com a loja.”
- Cliente sem `clienteId` válido na sessão vê “Sua conta ainda não está vinculada a um cliente.
  Fale com a loja.” e o botão de confirmação permanece desabilitado (fail-closed).

### Handoff / risco residual

- `ReservaCriarEntrada.clienteId` ainda é **obrigatório** em `src/shared/contratos/modelos.ts` e
  no schema do main. Como o renderer não pode editar contratos, envia somente o `clienteId`
  devolvido pelo main em `Sessao` — o handler de `reservas:criar` já sobrescreve esse valor com
  `idClienteDaSessao(sessao)`. Handoff ao Arquiteto: tornar o campo opcional/derivado no contrato
  para que o renderer não precise enviá-lo. Nenhuma outra mudança de contrato foi necessária.
- A autoridade de autorização continua no main: guard, menu e desabilitação de botões no renderer
  são apenas navegação e UX. Nenhuma rota do cliente chama `usuarios:*`, `integracoes:cnpj` ou
  escrita de equipamentos/categorias.
- A consulta de disponibilidade usa `equipamentos.listarDisponiveis` diretamente: diferente de
  `EquipamentoServico.listar`, não há fallback com dados de exemplo. Erro de rede vira
  “Não foi possível consultar a disponibilidade. Tente novamente.” com “Tentar novamente”.
- `PaginaDisponibilidadeCliente` e `PaginaCadastroCliente` tratam carregando, erro, vazio e
  sucesso; foco inicial, `aria-live`, `role="alert"` e `motion-reduce:*` seguem o DS. Classes
  Tailwind são literais, sem `style=`, `<style>`, CSS novo, `any` ou `innerHTML` dinâmico.

## Categorias e Manutenção (Bloco 1)

### Estado aplicado

- `PaginaCategorias` e `PaginaManutencao` substituíram os `PaginaEmConstrucao` das rotas
  `#/categorias` e `#/manutencao`, registradas em `src/renderer/src/main.ts`, exportadas em
  `paginas/index.ts` e liberadas no `nucleo/ControleAcesso.ts` e no `layout/Sidebar.ts`.
- `ServicoCategorias` usa o CRUD completo (`categorias:listar`, `buscar-por-id`, `criar`,
  `atualizar`, `inativar`); `ServicoManutencao` usa `manutencao:listar`, `buscar-por-id`, `criar`,
  `atualizar`, `concluir` e `inativar`. Todos os canais e schemas existem no contrato (ADR 0007).
- As duas telas seguem o padrão de painel de formulário + tabela, com confirmação modal explícita
  em toda inativação/exclusão. Erro de relacionamento (`RELACAO_INVALIDA`, o único código real de
  FK do contrato/main) é traduzido por `mensagemErroOperacao` para texto amigável (“não é possível
  inativar porque ainda há registros associados”), sem nomear tabela ou SQL.
- O mesmo tradutor foi aplicado à inativação em Clientes, Fornecedores, Equipamentos, Reservas,
  Pagamentos e Devoluções. Não existe código `EM_USO`/`FK_BLOKEIA_EXCLUSAO` no main atual; se
  aparecer, basta acrescentar o mapeamento em `util/ErrosRenderer.ts`.

### Handoff / risco residual

- Nenhum novo canal foi necessário; não houve mudança de contrato. A conclusão de ordem usa
  `manutencao:concluir` (já registrado), não uma edição de status simulada.
- A listagem de Categorias/Manutenção respeita `incluirInativos` somente para administrador.

## Integrações e fluxos guiados (Bloco 2)

### Estado aplicado

- **CEP (Clientes) e CNPJ (Fornecedores):** falha é distinguida por `codigoErro`. `SEM_DADOS`
  (ou equivalente de “não encontrado”) exibe “CEP/CNPJ não encontrado. Preencha manualmente.”;
  qualquer outra falha exibe “Consulta indisponível no momento.”. Ambos os avisos são discretos,
  não apagam o que foi digitado e não bloqueiam o salvamento manual.
- **Wizard de reservas:** `#/reservas/nova` e `#/cliente/nova-reserva` usam indicador de 4 etapas
  (Cliente → Período e equipamentos → Conferência → Pagamento), com `Voltar` preservando todo o
  estado do formulário. Cada avanço valida somente a etapa atual. A conferência mostra o resumo com
  **diárias calculadas a partir das datas**, previsão do tempo e aviso de feriado no período;
  indisponibilidade das integrações gera aviso discreto, nunca bloqueio. A etapa de pagamento
  escolhe Pix/Cartão/Dinheiro e cria o registro como `Pendente` após a reserva ser confirmada;
  falha no pagamento é sinalizada no toast, sem afirmar sucesso.
- **Calendário de disponibilidade:** `PaginaDisponibilidadeCliente` consulta
  `equipamentos.listarDisponiveis` dia a dia para o mês exibido. Dias com equipamento livre são
  selecionáveis; dias sem disponibilidade (reservado **ou** em manutenção — o main já filtra os
  dois) aparecem riscados e desabilitados; falha de consulta aparece em cor de alerta e também é
  desabilitada. Legenda explica os três estados. Navegação de mês recarrega o calendário.
- **Devolução:** `ServicoDevolucoes` usa `devolucoes:listar-pendentes` e
  `devolucoes:calcular-multa`. O modal de registro mostra a prévia didática (`textoMulta`, ex.:
  “2 dias de atraso × R$ 20,00 = R$ 40,00”); se a prévia falhar, aparece aviso discreto de feriados
  indisponíveis e o registro segue. Após registrar, o próprio fluxo abre a baixa do pagamento
  (cria ou atualiza para `Pago`, com a multa informada), sem exigir ida a outra tela.
- **Pagamentos:** KPIs de recebido/pendente/multas, filtros por texto/status/período e
  `( Imprimir comprovante )`. O comprovante é uma seção temporária no `document.body` com classes
  `print:block`/`print:bg-white`, removida no evento `afterprint`; usa `window.print()` e somente
  `createElement`/`textContent` com os dados do pagamento.
- **Atalhos:** `?` e `F1` abrem um modal global (fora de campos de texto) com a lista de atalhos;
  `Ctrl+N`, `Ctrl+K`, `F5`, `F2`, `Enter`, `Ctrl+Enter` e `Esc` permanecem registrados por tela.

### Handoff / risco residual

- Regras de multa (domingos/feriados), disponibilidade e faturamento continuam **no main**. O
  renderer apenas exibe `CalculoMulta`/`ResumoDashboard` e traduz erros; não há reimplementação.
- `window.print()` depende do diálogo de impressão do Electron; o comprovante não é salvo em disco
  nem enviado a serviço externo. Se o main passar a oferecer impressão via IPC, o handoff é trocar
  essa chamada, sem alterar layout.
- Nenhuma dependência nova foi instalada e nenhum `git add`, `git commit` ou `git push` foi executado.
  Os arquivos alterados estão listados no resumo final da entrega.

## Edição de itens de reserva e situação de usuários (Tarefa 1)

### Estado aplicado

- Na edição administrativa de reservas, o bloco “Itens da reserva” usa somente `ServicoItensReserva`:
  `criar` para adicionar, `atualizar` para a diária acordada e `remover` após confirmação no `Modal`
  do projeto. A adição revalida `equipamentos.listarDisponiveis` com `reservaId` e toma a diária do
  equipamento devolvido pelo main; nada é inventado no renderer.
- Falha de canal não é engolida: vira toast de erro e `EstadoErro` com “Tentar de novo” no bloco de
  itens. Após cada escrita, os itens são recarregados e o total é recalculado. Durante a edição, uma
  consulta de disponibilidade não remove da tela itens já persistidos.
- `ServicoUsuarios` passou a expor `buscarPorId` e `inativar`. A inativação consulta o registro
  antes de agir e usa o id devolvido; a reativação continua em `usuarios:atualizar({ ativo: true })`
  porque o contrato não oferece canal de ativação.

### Handoff / risco residual

- Nenhum canal, schema, handler, tipo compartilhado, `.env` ou ADR foi alterado; não há handoff novo
  ao Arquiteto/ED. O clique real na GUI permanece para verificação manual (800×600 e 1920×1080).
