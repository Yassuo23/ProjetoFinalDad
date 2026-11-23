# Divisão dos pacotes P1–P11

Critério: afinidade de domínio e ordem de dependência. Ninguém edita módulo de outro sem combinar
(regra do `AGENTS.md`).

| Responsável | Pacotes | Por quê |
| --- | --- | --- |
| Dev C — Equipamentos | **P1** CRUD → **P4** Disponibilidade → **P8** Manutenção | Ciclo de vida do equipamento; P4 e P8 leem o mesmo estado do P1. |
| Dev B — Clientes | **P2** Clientes+CEP → **P3** Fornecedores+CNPJ | Cadastros e integrações de API externa com a mesma estrutura de serviço. |
| Dev D — Reservas | **P5** Reservas+Clima → **P6** Devoluções+multas → **P7** Pagamentos | Uma única cadeia: reserva → devolução → quitação. P6 depende do `valorAquisicao` do P1. |
| willcotil / Fundação | **P9** Feriados → **P10** Usuários+perfis → **P11** Painel | P9 repete o padrão de API dos serviços de CEP/CNPJ; P10 e P11 são transversais e fecham a entrega. |

## Ordem de execução recomendada

`P1 → P2 → P4 → P5 → P3 → P6 → P7 → P8 → P9 → P10 → P11`

A ordem dos pacotes dentro de cada responsável é fixa; a interleaving entre responsáveis pode
mudar conforme a disponibilidade de cada um, desde que as dependências sejam respeitadas.

## Pré-condição para cada pacote

O contrato do pacote precisa estar em `shared/contratos/` antes do especialista começar. O
contrato do P1 foi fechado no ADR 0006; os demais seguem a mesma sequência: canais → tipos →
schemas → erros → enum → migração → implementação.
