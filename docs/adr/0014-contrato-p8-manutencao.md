# ADR 0014 — Contrato do P8 (Manutenção)

- **Status:** aceito
- **Data:** 2026-11-23
- **Decisores:** fundação (AS), implementação a cargo do agente Backend/Database (Dev C)

## Contexto

O P1 definiu os estados do equipamento (`disponivel | em_manutencao | baixado | reservado`) mas não
tinha quem os mutasse além da inativação lógica. O P4 passou a tratar qualquer estado diferente de
`disponivel` como `ITEM_INDISPONIVEL`. Faltava a origem controlada de `em_manutencao`.

## Decisão

1. **Canais:** `manutencoes:listar`, `buscar-por-id`, `abrir` e `concluir`.
2. **Estado:** `abrir` exige equipamento `disponivel` e `ativo`, grava `estado = 'em_manutencao'`;
   `concluir` grava `concluida_em` e devolve `estado = 'disponivel'`. A transição mora em
   `ManutencaoServico`, nunca no handler.
3. **Cardinalidade:** índice único parcial impede duas manutenções abertas para o mesmo
   equipamento. Segunda abertura devolve `MANUTENCAO_JA_ABERTA`.
4. **Erros:** `MANUTENCAO_NAO_ENCONTRADA`, `MANUTENCAO_JA_ABERTA`, `MANUTENCAO_JA_CONCLUIDA`.
   Equipamento em outro estado usa `ITEM_INDISPONIVEL` (já existente).
5. **Migração:** `007-manutencoes` com `status CHECK`, `custo >= 0` e índice único parcial.
6. **`baixado` e `reservado`** continuam sem transição automática: decisão de inventário, fora
   deste pacote. Conclusão de manutenção **não** mexe em reservas.

## Alternativas descartadas

- **Mudar `estado` direto pela tela de equipamentos** — perderia histórico e responsável pela
  manutenção; R5/R7 exigem serviço.
- **Permitir várias manutenções abertas** — estado do equipamento viraria ambíguo.

## Consequências

- `ApiZenite`/preload expõem `manutencoes.*`; `EquipamentoRepositorio` ganha método de mudança de
  estado (implementação do Dev C).
- Concorrência na abertura depende do índice único; tratar violação como `MANUTENCAO_JA_ABERTA`.
