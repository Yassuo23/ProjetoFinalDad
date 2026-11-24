# ADR 0011 — Contrato do P7 (Pagamentos)

- **Status:** aceito
- **Data:** 2026-11-23
- **Decisores:** fundação (AS) com decisões de negócio do produto, implementação a cargo da Dev D

## Contexto

O P5 criou a reserva, o P6 apurou a devolução e a multa. Faltava a quitação para fechar a cadeia
`reserva → devolução → pagamento`, sem inventar um gateway (a locadora é desktop e local).

## Decisão

1. **Canais:** `pagamentos:listar` (filtros `reservaId`, `status`), `buscar-por-reserva`, `registrar`,
   `confirmar` e `estornar` — todos com schema no main.
2. **Cardinalidade:** `pagamentos.reserva_id` é `UNIQUE`: **um pagamento por reserva**. Segunda
   tentativa devolve `PAGAMENTO_JA_REGISTRADO`.
3. **Ciclo:** `registrar` cria como `pendente` com `pagoEm = null`; `confirmar` só de `pendente`
   (`pago`, `pagoEm = agora`); `estornar` só de `pago` (`estornado`). Transições inválidas devolvem
   `PAGAMENTO_JA_PAGO` ou `PAGAMENTO_JA_ESTORNADO`.
4. **Valor:** positivo e em reais; `valor <= 0` devolve `VALOR_PAGAMENTO_INVALIDO`. O renderer
   mostra `CalculoMulta.valorTotal` (P6) como sugestão, mas o operador confirma o valor no
   formulário — o app não calcula troco nem desconto automático.
5. **Formas:** `dinheiro`, `pix`, `cartao_credito`, `cartao_debito` (union fechada no contrato e
   `CHECK` na DDL). Sem cartão, bandeira, parcelas ou dados sensíveis: nenhum dado de pagamento
   é persistido além da forma.
6. **Regras ficam em `PagamentoServico`:** registrar exige reserva `confirmada` ou `concluida`;
   busca inexistente devolve `PAGAMENTO_NAO_ENCONTRADO`. Handler valida e delega.
7. **Migração:** `006-pagamentos`, sem tocar nas tabelas de reserva/devolução.

## Alternativas descartadas

- **Múltiplos pagamentos por reserva** (parcelas/entrada + restante) — exigiria soma agregada e
  regra de saldo; o produto pediu quitação única.
- **Gateway/PIX dinâmico no renderer** — quebraria R3 e exigiria `connect-src` externo na CSP de
  produção; o registro é de caixa, não de cobrança online.
- **Persistir número de cartão ou chave PIX** — dado sensível sem necessidade; a forma basta.
- **Confirmar pagamento no handler** — R5; a transição de status é regra de domínio.

## Consequências

- `ApiZenite` e o preload expõem `pagamentos.*`; `Migrador.test.ts` espera seis migrações.
- `PagamentoRepositorio` implementa SQL parametrizado; `PagamentoServico` concentra as transições.
- O valor sugerido depende de `multas.calcular`, que é consulta pura e não persiste nada.
- Risco residual: o valor informado não é confrontado automaticamente com `valorTotal`; conferir
  na validação final do fluxo.
