# ADR 0009 — Contrato do P5 (Reservas + Clima)

- **Status:** aceito
- **Data:** 2026-11-23
- **Decisores:** fundação (AS) com decisões de produto, implementação a cargo da Dev D

## Contexto

O canal `reservas:listar` ficou fora do registro no P2 justamente porque não tinha schema nem
handler (R4). O P5 é o pacote que o traz de volta, agora com contrato completo, e acrescenta a
previsão do tempo. O produto decidiu que o clima relevante é o do **local da atividade**, não o da
loja.

## Decisão

1. **Canais:** `reservas:listar` (filtros `clienteId`, `equipamentoId`, `status`), `buscar-por-id`,
   `criar`, `confirmar`, `cancelar` e `previsao-tempo`. Todos com schema no main.
2. **Modelo:** `Reserva` passa a ter `localAtividade` e `criadoEm`. A tabela de `004-reservas` já
   contém `local_atividade` — **nenhuma migração nova** neste pacote.
3. **Regras ficam em `ReservaServico`:** criar exige cliente e equipamento existentes e ativos e
   chama `DisponibilidadeServico.verificar` do P4; sobreposição devolve `ITEM_INDISPONIVEL`. O
   handler apenas valida pelo schema e delega.
4. **Ciclo de status:** criação começa como `pendente`; `confirmar` só vale para `pendente`
   (senão `RESERVA_JA_CONFIRMADA`); `cancelar` vale para `pendente` ou `confirmada`, e `cancelada`
   é terminal (`RESERVA_JA_CANCELADA`). Estes são defaults de implementação, revisáveis sem mexer
   no contrato.
5. **Clima:** `ClimaServico` roda no main e usa **Open-Meteo** — geocoding para resolver `local`
   em latitude/longitude e forecast para o período. Ambos os domínios já estão na allowlist de
   `UrlsExternas` (`geocoding-api.open-meteo.com` e `api.open-meteo.com` são subdomínios de
   `open-meteo.com`). Limite de 14 dias, conforme a API gratuita.
6. **Erros novos:** `RESERVA_NAO_ENCONTRADA`, `RESERVA_JA_CONFIRMADA`, `LOCAL_NAO_ENCONTRADO` e
   `PREVISAO_INDISPONIVEL`. Reutiliza `RESERVA_JA_CANCELADA`, `ITEM_INDISPONIVEL`,
   `PERIODO_INVALIDO`, `CLIENTE_NAO_ENCONTRADO` e `EQUIPAMENTO_NAO_ENCONTRADO`.

## Alternativas descartadas

- **Previsão da cidade da loja** — o produto decidiu pelo local da atividade; o clima da loja não
  influencia a locação.
- **Geocoding/forecast no renderer** — quebraria R3 e exigiria `connect-src` externo na CSP de
  produção.
- **Devolver erro IPC quando o item está ocupado** — o P4 já definiu `ITEM_INDISPONIVEL` como
  motivo de disponibilidade; duplicar semântica confundiria o renderer.
- **Migração nova para `local_atividade`** — a coluna já existe desde `004-reservas`.

## Consequências

- Preload expõe `reservas.*`; o bloqueio R4 registrado na revisão do P1 fica totalmente resolvido.
- `ClimaServico` terá os mesmos riscos de `CepServico`: sem timeout explícito no `fetch` e com
  mapeamento de falha de rede para `PREVISAO_INDISPONIVEL`.
- `ReservaRepositorio`, criado no P4 só com `existeSobreposicao`, ganha CRUD parametrizado —
  sem alterar a tabela.
- A confirmação da semântica de statuses do P4 e os defaults deste ADR ficam como risco residual
  até a validação do produto.
