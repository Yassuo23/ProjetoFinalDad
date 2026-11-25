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

| Tipo local                             | Uso na tela                                     | Origem / observação                                                                                         |
| -------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `PagamentoItem`, `StatusPagamento`     | coluna “Pagamento / Multa” e KPI de faturamento | `pagamentos.listar`; `estornado` é apresentação do `StatusPagamento` do contrato                             |
| `PrevisaoTempo`, `CondicaoClima`       | card “Previsão do tempo”                        | tradução de `RespostaPrevisaoTempo`; `condicao: null` e temperaturas `null` são renderizados como “—”        |
| `StatusFrota.manutencao`               | contador “Manutenção”                           | derivado de `estadoConservacao`/`disponibilidade`, ambos já presentes em `Equipamento`                       |
| `Faturamento.estimado`                 | KPI “Faturamento do dia”                        | `false` quando `pagamentos.listar` responde; `true` apenas na ausência total de pagamentos                   |
| `DevolucaoPendente.atrasada`, `.multa` | KPI “Devoluções pendentes” e destaque de atraso | agregação local de reservas/clientes/itens/pagamentos; valor de multa vem de `Pagamento.valorMulta`          |
| `fontesIndisponiveis`                  | faixa “dados parciais”                          | cada fonte IPC que lançou exceção é listada; nenhuma linha é inventada                                      |

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
