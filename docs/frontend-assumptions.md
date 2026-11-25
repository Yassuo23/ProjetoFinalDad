# Suposições do frontend

Registro histórico de lacunas encontradas ao montar as telas do renderer. As decisões já
implementadas estão consolidadas aqui; a fonte atual de comportamento é `docs/telas.md`.

## Equipamentos

### Estado atual

- CRUD completo disponível via `window.electronAPI.equipamentos.*` e `categorias:listar`/
  `fornecedores:listar`.
- A tela é administrativa: item oculto para atendente e rota direta bloqueada.
- `Equipamento` expõe `estadoConservacao` e `disponibilidade`.
- Se uma chamada falhar, o serviço ainda pode devolver dados de exemplo tipados; nesse caso a
  tela exibe **“dados de exemplo”** e desabilita escrita.

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

- `DashboardServico.carregar()` consulta diretamente `reservas.listar`, `clientes.listar`,
  `equipamentos.listar`, `itensReserva.listar` e `pagamentos.listar` pela API tipada. Não há mais
  conjunto de exemplo no agregador: fonte que falha vira lista vazia e é nomeada em
  `fontesIndisponiveis`, exibida numa faixa “dados parciais”. As demais colunas continuam reais.
- O card “Previsão do tempo” usa `integracoes.previsaoTempo({ data: hojeISO() })` — a data das
  reservas da agenda, nunca uma cidade ou chave. `estado: 'indisponivel'` vira badge
  “indisponível” e texto “A locação não fica bloqueada.”; nenhum valor fictício é exibido.
- `integracoes.feriados({ ano })` é consultado para sinalizar feriado nacional na data atual. Se
  indisponível, o subtitle volta ao texto padrão e o motivo entra em `integracoesIndisponiveis`.
- `PaginaReservas` consome `Reserva.previsaoTempo` e `Reserva.altaDemandaPrevista` gravados pelo
  main ao confirmar. O renderer não reexecuta a regra de alta demanda, clima ou feriados.
- A fungibilidade de pagamento usa `valorMulta > 0` → “Multa”, `Estornado` → “Estornado”,
  `Pago` → “Pago” e o restante → “Pendente”. Faturamento com pagamentos disponíveis é
  “confirmado”; sem eles, é “estimativa” pelas diárias dos itens.
- A coluna “Tipo” da agenda deriva de `dataInicio`/`dataFim` comparados com a data local:
  `fim === hoje` significa devolução; caso contrário, retirada. `Reserva` não tem horário, então a
  célula mostra “—”.

### Tipos locais do renderer

Nenhum campo novo foi acrescentado a `src/shared/contratos`. Os tipos abaixo vivem em
`src/renderer/src/servicos/DashboardServico.ts`:

| Tipo local                             | Uso na tela                                     | Origem / observação                                                                                   |
| -------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `PagamentoItem`, `StatusPagamento`     | coluna “Pagamento / Multa” e KPI de faturamento | `pagamentos.listar`; `estornado` é apresentação do `StatusPagamento` do contrato                      |
| `PrevisaoTempo`, `CondicaoClima`       | card “Previsão do tempo”                        | tradução de `RespostaPrevisaoTempo`; `condicao: null` e temperaturas `null` são renderizados como “—” |
| `StatusFrota.manutencao`               | contador “Manutenção”                           | derivado de `estadoConservacao`/`disponibilidade`, ambos já presentes em `Equipamento`                |
| `Faturamento.estimado`                 | KPI “Faturamento do dia”                        | `false` quando `pagamentos.listar` responde; `true` apenas na ausência total de pagamentos            |
| `DevolucaoPendente.atrasada`, `.multa` | KPI “Devoluções pendentes” e destaque de atraso | agregação local de reservas/clientes/itens/pagamentos; valor de multa vem de `Pagamento.valorMulta`   |
| `fontesIndisponiveis`                  | faixa “dados parciais”                          | cada fonte IPC que lançou exceção é listada; nenhuma linha é inventada                                |

### Handoff — canais sem handler

Estes canais existem no contrato e no preload, mas **não têm handler registrado** em
`src/main/ipc/handlers/index.ts`; o renderer não os chama:

- `dashboard:resumo` — quando registrado, substitui a agregação local por `ResumoDashboard`,
  inclusive `financeiro` (nulo para atendente).
- `devolucoes:listar-pendentes` — quando registrado, substitui a agregação local de pendências e
  traz `valorMultaEstimado` já calculado no main.
- `devolucoes:calcular-multa` — quando registrado, permite prévia da multa sem registrar a
  devolução. Hoje a multa definitiva é calculada no main por `devolucoes:criar` e exibida via
  `Pagamento.valorMulta`; o renderer não reimplementa a regra (domingos/feriados).

`auth:*` e `usuarios:*` permanecem fora de escopo por determinação do usuário; o fluxo atual de
perfil continua o de sempre. Nenhuma string de canal, Node, SQL ou chave aparece no renderer.

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
- Não há login por trás da checagem de administrador além do perfil já existente no renderer; a
  regra continua a mesma das outras telas. Nenhuma dependência nova foi instalada.
