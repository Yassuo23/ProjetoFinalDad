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
- **Diária:** fora do contrato até que exista valor de tabela em `Equipamento`.

### Ainda fora do escopo

- Paginação e ordenação no servidor — a `Tabela` ordena localmente por enquanto.
- Edição em modal — o padrão adotado foi painel de formulário.
- Filtro pré-aplicado por `fornecedorId` a partir de Fornecedores — o roteador hash ainda não
  aceita parâmetros de rota.

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
