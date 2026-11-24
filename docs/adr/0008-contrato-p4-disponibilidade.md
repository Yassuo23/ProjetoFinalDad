# ADR 0008 — Contrato do P4 (Disponibilidade)

- **Status:** aceito
- **Data:** 2026-11-23
- **Decisores:** fundação (AS), implementação a cargo da Dev C

## Contexto

No P1, `equipamentos:listar-disponiveis` filtrava apenas `estado = 'disponivel'` e `ativo = 1`.
Isso responde "o equipamento está operacional?", mas não "ele está livre neste período?". O P5
(previsão de reservas) precisa de uma verificação pontual por equipamento, e o P4 precisa da tabela
de reservas para existir.

## Decisão

1. **Canal novo (único):** `equipamentos:verificar-disponibilidade`, payload
   `{ equipamentoId, inicio, fim }`, retorno `DisponibilidadeResultado { disponivel, motivo? }`.
   `listarDisponiveis` mantém a assinatura do P1, mas passa a considerar reservas.
2. **Onde a regra mora:** `DisponibilidadeServico` em `main/servicos/`. `EquipamentoServico` delega
   a ele; handler continua fino e o renderer só recebe `disponivel` + código de motivo. Nenhuma
   decisão de disponibilidade em SQL, handler ou renderer.
3. **Acesso a dados:** `ReservaRepositorio` expõe `existeSobreposicao(equipamentoId, inicio, fim)`
   com SQL parametrizado. O serviço interpreta o resultado.
4. **Tabela:** `004-reservas` cria `reservas` no P4 — a disponibilidade depende dela. O P5 usa a
   mesma tabela para CRUD, local da atividade e clima; se precisar de colunas novas, acrescenta
   migração própria em vez de alterar esta.
5. **Erros:** reutiliza `ITEM_INDISPONIVEL`, `PERIODO_INVALIDO` e
   `EQUIPAMENTO_NAO_ENCONTRADO`. Nenhum código novo entra no union.
6. **Semântica padrão do serviço:** reservas `pendente` e `confirmada` bloqueiam; `cancelada` e
   `concluida` não bloqueiam. Sobreposição é `inicio < fimProposto AND fim > inicioProposto`.
   Este é um default de implementação, sujeito a confirmação do produto; mudá-lo mexe só no
   serviço, nunca no contrato.

## Alternativas descartadas

- **Calcular disponibilidade no renderer** — exigiria expor a tabela de reservas na ponte e quebraria R3.
- **Interseção em SQL no handler** — mistura regra com transporte e impossibilita teste unitário.
- **Criar a tabela no P5** — o P4 ficaria sem dados para consultar e a ordem de dependências quebraria.
- **Novo código `RESERVA_SOBREPOSTA`** — `ITEM_INDISPONIVEL` já expressa o motivo; multiplicar
  códigos obrigaria o renderer a traduzir mais um caso sem ganho.

## Consequências

- Preload expõe `equipamentos.verificarDisponibilidade(...)`; nenhum handler novo até a Dev C.
- `Migrador.test.ts` passa a esperar quatro migrações.
- `EquipamentoServico.listarDisponiveis` passa a depender de `DisponibilidadeServico` por injeção;
  os testes atuais do P1 precisam de um dublê que responda "sem sobreposição" para continuarem verdes.
- A confirmação da semântica de statuses fica registrada como risco residual até o P5.
