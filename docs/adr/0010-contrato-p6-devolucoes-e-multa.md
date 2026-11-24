# ADR 0010 — Contrato do P6 (Devoluções e Multa)

- **Status:** aceito
- **Data:** 2026-11-23
- **Decisores:** fundação (AS) com decisões de negócio do produto, implementação a cargo da Dev D

## Contexto

O P1 persistiu `valorAquisicao` no equipamento exatamente para servir de base à multa; o P5 criou o
ciclo de reservas. Faltava fechar devolução e cálculo — inclusive os parâmetros que o especialista
não poderia inventar (carência, base, teto e proporcionalidade).

## Decisão

1. **Canais:** `devolucoes:registrar`, `devolucoes:buscar-por-reserva` e `multas:calcular`. O cálculo
   é consulta pura: não persiste nada; só `registrar` grava.
2. **Migração:** `005-devolucoes` cria a tabela com `reserva_id UNIQUE` (uma devolução por reserva)
   e guarda `dias_atraso`, `valor_diaria` e `valor_multa` para auditoria. Nenhuma atualização de
   reserva é feita diretamente pelo renderer.
3. **Base da multa:** `equipamentos.valorAquisicao`, lido no P1. Se for `0`, rejeite com
   `MULTA_BASE_INDISPONIVEL` — nunca calcule sobre a diária.
4. **Carência:** **90 dias** corridos após o fim da reserva, configurável por constante no serviço.
   `diasAtraso = max(0, dias(devolvidoEm - fim) - carencia)`.
5. **Fórmula (default de produto, revisável):** `taxaDiaria = 0,005` (0,5% ao dia sobre
   `valorAquisicao`), `multaBruta = diasAtraso * taxaDiaria * valorAquisicao`, e
   `teto = 0,20 * valorLocacao`. O valor cobrado é `min(multaBruta, teto)`; `tetoAplicado` sinaliza
   quando o limite incidiu. `valorTotal = valorLocacao + valorMulta`.
6. **Diária:** `precoDiaria` cadastrado no P1 já embute depreciação, manutenção e margem (ADR 0006).
   `MultaServico` **lê** essa diária, não a recalcula — evita duas fórmulas convivendo.
7. **Regras de devolução:** só reserva `confirmada`; data de devolução não pode ser anterior ao
   início da reserva (`DEVOLUCAO_DATA_INVALIDA`); devolução repetida → `DEVOLUCAO_JA_REGISTRADA`.
   Ao registrar, a reserva passa a `concluida` (método no repositório de reservas, não no handler).
8. **Erros novos:** `DEVOLUCAO_JA_REGISTRADA`, `DEVOLUCAO_DATA_INVALIDA`,
   `RESERVA_NAO_CONFIRMADA`, `MULTA_BASE_INDISPONIVEL`.

## Alternativas descartadas

- **Multa em percentual fixo da diária** — não reflete o valor do bem e pode ser abusiva; o produto
  escolheu a base no valor do equipamento.
- **Sem carência ou com carência curta** — 90 dias evita cobrança por atraso insignificante.
- **Percentual sem teto** — cláusula abusiva pode ser reduzida judicialmente; o teto de 20% do valor
  devido (faixa 10–20% admitida) protege o locador e o cliente.
- **Recalcular a diária no P6** — duplicaria a regra de depreciação/manutenção/margem já fechada no P1.

## Consequências

- `api.ts` e o preload expõem `devolucoes.*` e `multas.calcular`; `Migrador.test.ts` espera 5 migrações.
- Toda a fórmula mora em `MultaServico` (`main/servicos/`), testável sem banco; handler só valida e
  delega. Parâmetros (`CARENCIA_DIAS`, `TAXA_DIARIA`, `TETO_PERCENTUAL`) são constantes nomeadas.
- Devolução antecipada não gera desconto automático — decisão em aberto, registrada como risco.
- Revisitar os parâmetros com o produto antes de cobrar de verdade; mudá-los não exige novo contrato,
  apenas novo commit no serviço e nos testes.
