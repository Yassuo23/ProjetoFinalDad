# UX — Fluxos de balcão, telas pendentes e regras visuais

- **Status:** proposto
- **Versão:** 1.0
- **Data:** 2026-11-25
- **Dono:** UI/UX Designer (UX)
- **Implementação:** `frontend-developer`, após decisão do Arquiteto sobre os handlers ausentes
- **Escopo:** **somente documentação**. Nenhum código, CSS, contrato, `.env`, teste, build, commit ou push foi alterado.

Este documento descreve (1) o que o usuário vê **hoje**, com base na leitura direta do renderer, e
(2) o desenho proposto para o caminho rápido de balcão. Onde uma tela ou um handler não existe, a
ausência é registrada — não é inventada. Wireframes são **texto**, sem imagem.

## 0. Base lida

- Documentos: `docs/design-system.md`, `docs/telas.md`, `docs/requisitos-cliente.md`,
  `docs/frontend-assumptions.md`, `docs/integracoes.md`, `docs/adr/0007-contratos-auxiliares.md`,
  `docs/adr/0008-integracoes-reais.md`.
- Renderer: `src/renderer/src/main.ts`, `src/renderer/src/nucleo/Atalhos.ts`, as 12 páginas em
  `src/renderer/src/paginas/` e os 13 serviços em `src/renderer/src/servicos/`.
- Paleta e logos locais: `docs/brand/paletaCores.jpeg`,
  `src/renderer/src/assets/brand/logo-escuro.png`, `logo-claro.png`. Nenhuma referência remota.

### 0.1 Ausências reais registradas

| Item | Situação hoje | Onde |
| --- | --- | --- |
| Login / sessão | Não existe tela. Handlers `auth:*` são propostos, **sem implementação**. | ADR 0007; `main.ts` não registra rota `/login` |
| Primeira execução | Não existe tela. `auth:bootstrap` proposto, sem handler. Não há senha padrão. | ADR 0007 |
| Usuários e perfis | Tela `/usuarios` implementada para administrador: listar, criar, editar, ativar/inativar e trocar senha via `usuarios:*`. | `PaginaUsuarios.ts`; ADR 0007 |
| Categorias (CRUD) | Só leitura: `ServicoCategorias.listar()` e `EquipamentoServico.listarCategorias()` com fallback de exemplo. `categorias:criar/atualizar/inativar` propostos, sem handler. | `ServicoCategorias.ts`; `EquipamentoServico.ts`; ADR 0007 |
| Manutenção (ordens) | Rota `/manutencao` renderiza `PaginaEmConstrucao('Manutenção', 'manutencao.listar · manutencao.abrir')`. `manutencao:*` sem handler. | `main.ts:30-33`; ADR 0007 |
| Cálculo de multa/prévia | `devolucoes:calcular-multa` e `devolucoes:listar-pendentes` propostos, sem handler. A tela exibe valores **já gravados** no pagamento e deriva pendentes no renderer. | `ServicoDevolucoes.ts`; `PaginaDevolucoes.ts:385-390,571-597`; ADR 0007 |
| Resumo do Dashboard | O renderer compõe o painel com `reservas.listar`, `clientes.listar`, `equipamentos.listar`, `itensReserva.listar` e `pagamentos.listar`; **não** chama `dashboard:resumo`. | `DashboardServico.ts:241-298` |
| Atalhos no Dashboard | `PaginaDashboard` não registra `registrarAtalhos`; os atalhos existem nas páginas com painel de formulário. | `PaginaDashboard.ts`; `Atalhos.ts` |

---

## 1. Regra de contagem e meta

- **Cliques** = ações de ponteiro (botão, opção de lista, seleção em `select`, abertura de calendário).
  Digitação e `Tab` não contam como clique.
- Cada passo abaixo mostra o clique **acumulado**.
- Meta para o atendente de balcão: **MENOS DE 1 MINUTO** por fluxo, com cliente ou reserva já
  existente. Cadastro de cliente/fornecedor é fluxo encadeado, com meta própria.
- As colunas “Hoje” descrevem o comportamento atual do código. As colunas “Proposto” são
  **especificação de UX**, não promessa de implementação.

---

## 2. Diagnóstico — o que está confuso HOJE

| Tela | Evidência no código | Confusão para o atendente |
| --- | --- | --- |
| Dashboard | Dois botões, “Nova reserva” e “Registrar devolução”, apenas trocam o `hash` para `/reservas` e `/devolucoes` (`PaginaDashboard.ts:205-217`). | O usuário clica “Nova reserva” e cai numa lista; precisa clicar de novo para abrir o formulário. |
| Reservas | Formulário exige “Ver disponibilidade” manual (`PaginaReservas.ts:474-480`); confirmação abre modal com outro botão “Confirmar reserva” (`:1062-1070`); criação faz `criar` e depois `atualizar` para `Confirmada` (`:1145-1155`). | Parece que a reserva foi salva antes de confirmada; se a confirmação falha, aparece “Reserva registrada, mas a confirmação não foi concluída”. |
| Reservas | Previsão do tempo é gravada pelo processo principal e lida de `Reserva.previsaoTempo`; se vazia, abre aviso com “Confirmar sem previsão” (`:1188-1234`). | O atendente só descobre a falha do clima **depois** de confirmar. |
| Reservas | Subtítulo muda por perfil: atendente vê “Disponibilidade, diárias e confirmação de locações.” (`:297-300`); edição exige `ehAdministrador()` (`:1074`). | Não fica claro por que o atendente não pode corrigir uma reserva. |
| Devoluções | Multa e total só são exibidos no painel de **leitura** do registro, via `pagamentoDe()` (`:571-597`); o aviso diz que o sistema calcula “no registro” (`:528-531`). | O atendente confirma a devolução sem saber o valor da multa. |
| Devoluções | Pendentes são derivados: reservas sem devolução e diferentes de `Cancelada` (`:385-390`). Não há canal `devolucoes:listar-pendentes`. | “Pendente” não é o mesmo conceito de uma fila oficial; mudanças de status podem surpreender. |
| Devoluções | Ajuste manual de multa é só para administrador e “não é uma isenção oficial”; o contrato atual não recalcula o total (`:1225-1276`). | O atendente não sabe se pode ou não ajustar, e o admin não sabe que o total fica desatualizado. |
| Clientes | O CEP dispara automaticamente ao completar 8 dígitos (`buscarCepQuandoComplete`, `:392-401,511-523`), sobrescrevendo logradouro/bairro/cidade/UF; o botão “Preencher manualmente” só aparece no erro. `docs/integracoes.md:33` descreve consulta ao **salvar**. | O preenchimento automático e a documentação discordam; campos digitados antes do CEP podem ser perdidos. |
| Clientes | Erros viram apenas dois textos: “CEP não encontrado…” ou “Não foi possível consultar o CEP…” (`:542-558`). | Não há distinção visual clara entre CEP inválido e serviço fora. |
| Fornecedores | A consulta de CNPJ preenche **somente a razão social** e sobrescreve o campo (`:668-698`), embora `docs/integracoes.md:55,60` preveja situação, atividade e endereço opcional. Erros de dígito, `404` e rede caem no mesmo toast “Consulta indisponível” (`:701-712`). | O atendente/admin não sabe se o CNPJ está errado, não encontrado ou se o serviço caiu. |
| Equipamentos | “Enviar para manutenção” não existe: a aproximação é editar “Estado de conservação” e “Disponibilidade” (`:663-688`) e salvar. | Não há ordem, responsável, prazo nem histórico; a frota muda de status sem rastro. |
| Categorias | Renderer só consome `categorias.listar`; não há botão de criar/editar/inativar. | Admin não consegue gestão de categorias, embora o card de equipamentos exija categoria. |

---

## 3. Fluxo A — Nova reserva (meta: **6 cliques**, < 1 minuto)

**Premissa do caminho rápido:** cliente já cadastrado. Cliente novo encadeia o Fluxo C.

### 3.1 Hoje — 10 cliques quando a previsão falha (9 quando dá certo)

| # | Clique | Resultado |
| --- | --- | --- |
| 1 | Dashboard → “Nova reserva” | Só troca para `/reservas`; **não** abre o formulário |
| 2 | Reservas → “Nova reserva” | Abre painel “Nova reserva” |
| 3 | `Select` “Cliente” | Escolha na lista (busca por nome/CPF com `Ctrl+K`) |
| 4 | Campo “Data de início” | Abre o seletor de data |
| 5 | Campo “Data de fim” | Abre o seletor de data |
| 6 | “Ver disponibilidade” | Consulta manual |
| 7 | Opção em “Equipamentos disponíveis” | Seleciona item e diária |
| 8 | “Confirmar reserva” no painel | Abre modal de revisão |
| 9 | “Confirmar reserva” no modal | `criar` + `atualizar` para `Confirmada` |
| 10 | “Confirmar sem previsão” (somente se o clima falhou) | Fecha aviso e conclui |

### 3.2 Proposto — 6 cliques

| # | Clique | Resultado esperado |
| --- | --- | --- |
| 1 | Dashboard → “Nova reserva” | Vai a `/reservas` **com o painel aberto e o foco no campo de cliente** |
| 2 | Cliente | Escolha na lista filtrável (nome ou CPF) |
| 3 | Data de início | Disponibilidade recalcula automaticamente; sem botão “Ver disponibilidade” |
| 4 | Data de fim | Total e diárias atualizados em `aria-live="polite"` |
| 5 | Equipamento | Seleção na lista; item ocupado aparece desabilitado, não some |
| 6 | “Confirmar reserva” | Único clique de confirmação; `Enter` confirma o modal de revisão |

**Atalhos:** `Ctrl+N` abre novo formulário; `Ctrl+K` foca a busca de cliente; `F5` recarrega;
`F2` foca o primeiro controle ou edita a linha selecionada (admin); `Enter` confirma;
`Tab`/`Shift+Tab` percorre cliente → datas → categoria → lista → resumo → ações; `Esc` cancela.
`Ctrl+Enter` é o atalho rápido de confirmação **quando o modal está aberto**.

### 3.3 Estados

| Estado | Onde | Mensagem pt-BR |
| --- | --- | --- |
| Vazio — sem reservas | Tabela | “Nenhuma reserva lançada. Cadastre uma nova reserva para começar o dia.” |
| Vazio — sem equipamentos | Lista selecionável | “Nenhum equipamento disponível para esta data. Escolha outro período ou verifique a conservação dos equipamentos.” + “Ver outra data” |
| Carregando | Painel / lista | “Carregando clientes e reservas…”; “Consultando disponibilidade…” |
| Erro de carregamento | Tabela | “Não foi possível carregar reservas e clientes. Tente novamente.” |
| Erro de disponibilidade | Lista | “Não foi possível consultar a disponibilidade. Tente novamente.” + “Tentar novamente” |
| Erro de confirmação | Toast | “Não foi possível confirmar. Verifique os dados e tente novamente em instantes.” |
| Parcial | Toast | “Reserva registrada, mas a confirmação não foi concluída. Tente confirmar novamente na tabela.” |
| Sucesso | Toast | “Reserva #123 confirmada. Previsão: ensolarado, 24 °C.” |
| Clima indisponível | Card no modal de confirmação | “Previsão indisponível para esta data.” + “Tentar novamente” + “Confirmar sem previsão” — **não bloqueia** |

### 3.4 APIs envolvidas e motivos reais

| API / canal | Motivo | Texto ao usuário |
| --- | --- | --- |
| `integracoes.previsaoTempo` (Open-Meteo, até 16 dias, cache 30 min) | `SEM_DADOS` (fora da janela, sem coordenada ou sem resultado) | “Previsão indisponível para esta data.” |
| idem | `PESQUISA_INVALIDA` (data malformada) | “Confira a data de início e tente novamente.” |
| idem | `SERVICO_FORA` (rede/timeout/`5xx`) | “Não conseguimos consultar a previsão agora. Tente novamente ou confirme sem previsão.” |
| idem | `CREDENCIAL_AUSENTE` (reservado para migração paga) | “Consulta de previsão temporariamente desativada. Você pode confirmar sem previsão.” |
| `integracoes.feriados` (BrasilAPI, `type: "national"`, cache 24 h) | `SEM_DADOS` / `SERVICO_FORA` / `PESQUISA_INVALIDA` | “Não conseguimos consultar os feriados. O aviso de alta demanda ficou indisponível; a reserva continua.” |
| `equipamentos.listarDisponiveis` | falha local | “Não foi possível consultar a disponibilidade. Tente novamente.” |

---

## 4. Fluxo B — Devolução com multa (meta: **6 cliques**, < 1 minuto)

**Regra de negócio (ADR 0008):** multa por dia de atraso, sem tolerância e sem teto na premissa
original; **domingos e feriados nacionais não entram nos dias cobráveis**; sábados contam. Valor
configurável em `MULTA_DIARIA_VALOR`.

### 4.1 Hoje — 7 cliques (8 se o admin ajusta a multa)

| # | Clique | Resultado |
| --- | --- | --- |
| 1 | Dashboard → “Registrar devolução” | Só troca para `/devolucoes` |
| 2 | “Nova devolução” | Abre painel |
| 3 | “Reserva pendente” | Escolha da reserva |
| 4 | “Data efetiva” | Em branco usa a data atual do sistema |
| 5 | “Conservação pós-uso” | Escolha do estado |
| 6 | “Registrar devolução” no painel | Abre modal de revisão |
| 7 | “Registrar devolução” no modal | Grava; multa e total aparecem **depois**, no painel de leitura |
| 8 | (admin) “Ajustar multa” + confirmar | Ajuste manual; o total **não** é recalculado |

### 4.2 Proposto — 6 cliques

| # | Clique | Resultado esperado |
| --- | --- | --- |
| 1 | Dashboard → “Registrar devolução” | Vai a `/devolucoes` com painel aberto e foco na reserva |
| 2 | Reserva pendente | Escolha na lista de pendentes |
| 3 | Data efetiva | Prévia de dias cobráveis e multa atualiza sozinha |
| 4 | Conservação pós-uso | Escolha do estado |
| 5 | “Registrar devolução” no painel | Abre revisão com multa, total e regra de dias visíveis |
| 6 | “Registrar devolução” no modal | Grava; baixa continua em Pagamentos |

**Prévia obrigatória antes do clique 6** (texto simples, sem jargão):

> “3 dias de atraso. Domingos e feriados nacionais não são cobrados: 2 dias cobráveis.
> Multa estimada: R$ 120,00. Total estimado: R$ 480,00.”

**Atalhos:** `Ctrl+N` nova devolução; `Ctrl+K` busca (“Reserva, cliente ou conservação”); `F5`
recarrega; `F2` edita a linha selecionada (admin); `Enter` confirma; `Ctrl+Enter` confirma no modal;
`Esc` cancela.

### 4.3 Estados

| Estado | Onde | Mensagem pt-BR |
| --- | --- | --- |
| Vazio — pendentes | Tabela | “Nenhuma devolução pendente. Todas as reservas já têm devolução registrada.” |
| Vazio — registradas | Tabela | “Nenhuma devolução registrada. Registre uma devolução na tabela de pendentes.” |
| Carregando | Tabelas / painel | “Carregando pendências…”; “Carregando devoluções…” |
| Erro de carregamento | Tabela | “Não foi possível carregar devoluções, reservas e pagamentos. Tente novamente.” |
| Erro ao registrar | Toast | “Não foi possível registrar. Verifique os dados e tente novamente em instantes.” |
| Erro de data | Campo | “Informe uma data válida.” |
| Sucesso | Toast | “Devolução registrada. Multa e total calculados pelo sistema e exibidos no pagamento da reserva.” |
| Sem pagamento encontrado | Painel de leitura | “Pagamento não encontrado para esta reserva. Valores calculados pelo sistema.” |
| Serviço de feriados indisponível | Aviso na prévia | “Não conseguimos consultar os feriados. Descontamos apenas os domingos; a devolução continua.” |

### 4.4 APIs envolvidas e motivos reais

| API / canal | Motivo | Texto ao usuário |
| --- | --- | --- |
| `integracoes.feriados` (anos de `dataFim` e da devolução, quando diferentes) | `SEM_DADOS` | “Não encontramos os feriados deste ano. Descontamos apenas os domingos.” |
| idem | `SERVICO_FORA` (rede/timeout/`5xx`) | “Serviço de feriados indisponível. Descontamos apenas os domingos; você pode registrar a devolução.” |
| idem | `PESQUISA_INVALIDA` (ano fora de 2020–2100) | “Confira o ano da devolução e tente novamente.” |
| `devolucoes.criar` | falha local | “Não foi possível registrar. Verifique os dados e tente novamente em instantes.” |
| `pagamentos.listar` | falha local | “Não foi possível carregar os valores do pagamento. Tente novamente.” |

> **Handoff obrigatório:** a prévia depende de `devolucoes:calcular-multa`, proposto no ADR 0007 e
> **sem handler**. Sem ele, o desenho máximo possível hoje é mostrar os valores já gravados no
> pagamento, como a tela faz.

---

## 5. Fluxo C — Cadastro rápido de cliente por CEP (meta: **4 cliques**)

### 5.1 Hoje — 5 cliques pelo botão (0 cliques na consulta automática)

| # | Clique | Resultado |
| --- | --- | --- |
| 1 | “Novo cliente” | Abre painel com 11 campos |
| — | Digitar 8 dígitos do CEP | Consulta dispara **sem pedir** e sobrescreve endereço |
| 2 | “Buscar CEP” (se a automação não disparou) | Preenche logradouro, bairro, cidade e UF |
| 3 | “Salvar” | Abre modal “Revise o formulário” |
| 4 | “Salvar” no modal | Grava |
| 5 | “Preencher manualmente” (somente no erro) | Foca logradouro |

### 5.2 Proposto — 4 cliques

| # | Clique | Resultado esperado |
| --- | --- | --- |
| 1 | “Novo cliente” ou `Ctrl+N` | Abre painel com foco no CEP |
| 2 | “Buscar CEP” (ou `Enter` no campo) | Consulta explícita; **nunca sobrescreve** campos já preenchidos sem aviso |
| 3 | “Salvar” | Abre revisão |
| 4 | “Salvar” na revisão | Grava e, se veio de uma reserva, o cliente volta selecionado |

**Atalhos:** `Ctrl+N` novo; `Ctrl+K` busca da lista; `F5` recarrega; `Enter` consulta CEP quando o
foco está no campo e confirma quando o foco está fora; `Esc` cancela; `Tab` segue nome → CPF → CEP →
botão → logradouro → número → complemento → bairro → cidade → UF → telefone → e-mail.

### 5.3 Estados

| Estado | Onde | Mensagem pt-BR |
| --- | --- | --- |
| Vazio — lista | Tabela | “Cadastre o primeiro cliente para começar uma locação.” |
| Carregando | Painel / tabela | “Carregando formulário…”; “Carregando clientes…” |
| Erro de carregamento | Tabela | “Não foi possível carregar os clientes. Tente novamente.” |
| Erro de validação | Campo | “Informe um CPF com 11 dígitos.”; “Informe um CEP com 8 dígitos.”; “Informe um e-mail válido.” |
| Sucesso do CEP | Toast | “CEP localizado. Endereço preenchido. Confira o número e o complemento.” |
| CEP não encontrado | Campo + toast | “CEP não encontrado. Preencha o endereço manualmente.” |
| Serviço fora | Campo + toast | “Não foi possível consultar o CEP. Verifique sua conexão e tente novamente.” |
| Sucesso do cadastro | Toast | “Cliente cadastrado. Nome e CPF conferidos.” |
| Erro ao salvar | Toast | “Não foi possível salvar. Verifique os dados e tente novamente em instantes.” |

### 5.4 APIs envolvidas e motivos reais

| API / canal | Motivo | Texto ao usuário |
| --- | --- | --- |
| `clientes.buscarCep` (ViaCEP; 8 dígitos; timeout 6 s; 1 retry; cache 24 h) | `disponivel` preenche logradouro/bairro/cidade/UF; `nao-encontrado` e `indisponivel` (com `motivo`) são RETORNO tipado, não exceção | “CEP não encontrado. Preencha o endereço manualmente.” (inexistente) / “Serviço de CEP indisponível (`motivo`): … Preencha o endereço manualmente.” (fora/rede/inválido); botão manual e campos digitados preservados |
| idem | `CREDENCIAL_AUSENTE` / `SERVICO_FORA` (quando vier do motivo genérico de integração) | “Consulta de endereço temporariamente indisponível. Você pode preencher manualmente.” |
| `clientes.criar` | falha local | “Não foi possível salvar. Verifique os dados e tente novamente em instantes.” |

---

## 6. Fluxo D — Cadastro de fornecedor por CNPJ (meta: **4 cliques**, perfil administrador)

### 6.1 Hoje — 4 cliques

| # | Clique | Resultado |
| --- | --- | --- |
| 1 | “Novo fornecedor” | Abre painel |
| 2 | “Buscar dados do CNPJ” | Preenche **apenas** a razão social, sobrescrevendo o campo |
| 3 | “Salvar” | Abre revisão |
| 4 | “Salvar” na revisão | Grava |

**Confusão atual:** dígitos verificadores inválidos, CNPJ não encontrado e queda de rede geram o
mesmo toast “Consulta indisponível”. Para o atendente, a página não carrega a lista e o painel fica
restrito — o fluxo é exclusivamente administrativo.

### 6.2 Proposto — 4 cliques (mesma contagem, mensagens distintas)

| # | Clique | Resultado esperado |
| --- | --- | --- |
| 1 | “Novo fornecedor” ou `Ctrl+N` | Abre painel com foco no CNPJ |
| 2 | “Buscar dados do CNPJ” | Prévia do que será preenchido; nada é sobrescrito sem confirmar |
| 3 | “Salvar” | Abre revisão |
| 4 | “Salvar” na revisão | Grava |

**Atalhos:** `Ctrl+N`, `Ctrl+K` (busca “Razão social ou CNPJ”), `F5`, `F2` (admin), `Enter`
(confirma), `Esc` (cancela).

### 6.3 Estados

| Estado | Onde | Mensagem pt-BR |
| --- | --- | --- |
| Vazio — lista | Tabela | “Nenhum fornecedor com esses filtros. Tente outros critérios.” |
| Carregando | Painel / tabela | “Carregando formulário…”; “Carregando fornecedores…” |
| Erro de carregamento | Tabela | “Não foi possível carregar os fornecedores. Tente novamente.” |
| Erro de validação | Campo | “Informe um CNPJ com 14 dígitos antes de consultar.”; “Informe a razão social.” |
| Consulta em andamento | Botão | Desabilitado com texto “Consultando…” |
| Sucesso da consulta | Toast | “Razão social preenchida: Aventura Ltda. Confira os demais dados.” |
| Sucesso do cadastro | Toast | “Fornecedor cadastrado. Tipo: Manutenção.” |
| Erro ao salvar | Toast | “Não foi possível salvar. Verifique os dados e tente novamente em instantes.” |

### 6.4 APIs envolvidas e motivos reais

| API / canal | Motivo | Texto ao usuário |
| --- | --- | --- |
| `integracoes.cnpj` (BrasilAPI; 14 dígitos; dois verificadores validados no principal; cache 24 h) | `PESQUISA_INVALIDA` — dígitos verificadores inválidos | “Confira os dígitos do CNPJ.” |
| idem | `SEM_DADOS` — `404` ou resposta inválida | “Não achamos este CNPJ. Preencha a razão social manualmente.” |
| idem | `SERVICO_FORA` — rede/timeout/`5xx` | “Serviço de CNPJ indisponível. Você pode cadastrar sem consultar.” |
| idem | `CREDENCIAL_AUSENTE` | “Consulta de CNPJ temporariamente desativada. Preencha manualmente.” |
| `fornecedores.criar` | falha local | “Não foi possível salvar. Verifique os dados e tente novamente em instantes.” |

---

## 7. Fluxo E — Envio de equipamento para manutenção (meta: **4 cliques**)

**Hoje:** clicar em “Manutenção” na sidebar (1 clique) leva a “Tela em construção” com o badge
`manutencao.listar · manutencao.abrir`. A única aproximação é editar o equipamento: “Equipamentos”
(1) → “Editar” (2) → “Estado de conservação” (3) → “Disponibilidade” (4) → “Salvar” (5) →
confirmar (6) = **6 cliques**, sem ordem, responsável, prazo ou histórico.

### 7.1 Proposto — 4 cliques (administrador)

| # | Clique | Resultado esperado |
| --- | --- | --- |
| 1 | “Enviar para manutenção” no painel do equipamento | Abre formulário de ordem |
| 2 | Destino: “Interna” ou “Fornecedor” | Define responsável padrão quando aplicável |
| 3 | “Previsão de retorno” | Data em `dd/mm/aaaa` |
| 4 | “Abrir ordem” | Status vira “Em manutenção” + “Indisponível”; equipamento sai da lista de reservas |

**Fechamento da ordem (admin):** “Concluir ordem” → “Voltou ao estoque” ou “Descartar” →
“Conservação final”. Uma confirmação, sem edição de status solto.

**Atalhos:** `Ctrl+N` nova ordem; `Ctrl+K` busca do equipamento; `F5` recarrega; `Enter` confirma;
`Esc` cancela.

### 7.2 Estados

| Estado | Onde | Mensagem pt-BR |
| --- | --- | --- |
| Vazio — sem ordens | Tabela | “Nenhuma ordem aberta. Envie um equipamento para manutenção para começar.” |
| Carregando | Tabela / painel | “Carregando ordens de manutenção…” |
| Erro de carregamento | Tabela | “Não foi possível carregar as ordens. Tente novamente.” |
| Erro ao abrir | Toast | “Não foi possível abrir a ordem. Verifique os dados e tente novamente em instantes.” |
| Sucesso | Toast | “Ordem #12 aberta. Equipamento indisponível para reservas até a conclusão.” |
| Conclusão | Toast | “Ordem #12 concluída. Equipamento voltou ao estoque.” |

> **Handoff obrigatório:** depende de `manutencao:criar`, `manutencao:listar` e
> `manutencao:concluir` (ADR 0007), **sem handlers**. Enquanto não existirem, manter o placeholder
> honesto da rota — não transformar a edição de conservação em “ordem”.

---

## 8. Wireframes textuais (telas faltantes)

Todos usam a paleta local e os logos em `src/renderer/src/assets/brand/`. Nenhuma imagem remota,
nenhum `<style>`, nenhum `style=`.

### 8.1 Login — depende de `auth:sessao-atual` e `auth:entrar` (ADR 0007, sem handler)

```
+---------------------------------------------------------------------+
| logo-escuro.png (lado esquerdo do card)    fundo bg-pedra          |
|                                                                     |
|   +-------------------------------------------------------------+   |
|   |  Zênite — Aluguel Outdoor                                   |   |
|   |  Entre para continuar                                       |   |
|   |                                                             |   |
|   |  Usuário ou CPF   [____________________________]            |   |
|   |  Senha            [____________________________] (olho)     |   |
|   |  [ x ] Mostrar senha                                        |   |
|   |                                                             |   |
|   |               [      Entrar      ]  <- bg-lima/text-grafite |   |
|   |  Esqueci minha senha -> fale com o administrador            |   |
|   +-------------------------------------------------------------+   |
+---------------------------------------------------------------------+
```

- Foco inicial: campo “Usuário ou CPF”. `Enter` envia. `Tab`: usuário → senha → mostrar → entrar.
- Carregando: botão “Entrando…” desabilitado; erro: “Usuário ou senha não conferem. Tente novamente.”
- Vazio: sem lista; sucesso: abre Dashboard com a saudação do perfil.
- Sem auto-cadastro e sem senha padrão (ADR 0007). Link de recuperação **não promete** fluxo
  self-service: só orienta a procurar o administrador.

### 8.2 Primeira execução / bootstrap — depende de `auth:bootstrap` (sem handler)

```
+---------------------------------------------------------------------+
| logo-claro.png sobre bg-floresta (faixa superior)                   |
|                                                                     |
|   +-------------------------------------------------------------+   |
|   |  Bem-vindo ao Zênite                                        |   |
|   |  Crie a primeira conta de administrador.                     |   |
|   |  Não existe senha padrão.                                    |   |
|   |                                                             |   |
|   |  Nome completo  [____________________________]              |   |
|   |  Usuário/CPF    [____________________________]              |   |
|   |  Senha          [____________________________]              |   |
|   |  Repetir senha  [____________________________]              |   |
|   |  Regra: no mínimo 8 caracteres, letra e número              |   |
|   |                                                             |   |
|   |              [ Criar administrador ]                        |   |
|   +-------------------------------------------------------------+   |
+---------------------------------------------------------------------+
```

- Estado vazio (zero usuários) = esta tela; se já houver usuário, mostra “Já existe um
  administrador. Entre normalmente.” e link para Login.
- Erros: “As senhas não conferem.”; “Use no mínimo 8 caracteres, com letra e número.”
- Sucesso: “Administrador criado. Você já pode usar o sistema.” → Dashboard.
- `UsuarioPublico = Omit<Usuario, 'senhaHash'>`: hash nunca aparece em tela nem em log.

### 8.3 Categorias (CRUD) — depende de `categorias:criar/atualizar/inativar` (sem handler)

```
+---------------------------------------------------------------------+
| Sidebar (admin)  |  Categorias                                      |
|                  |  Nome e ordem das categorias da frota.            |
|                  |  [Buscar categoria]  [ Nova categoria ]           |
|                  +-----------------------------------------------+   |
|                  | Nome       | Descrição | Equip. | Situação |...|  |
|                  | Bicicleta  | ...       |  12    | Ativa    |...|  |
|                  | Caiaque    | ...       |   4    | Ativa    |...|  |
|                  +-----------------------------------------------+   |
|                  | Painel lateral (abre ao selecionar)               |
|                  | Nome [____________] Descrição [_____________]     |
|                  | ( x ) Ativa   [ Salvar ]  [ Inativar ]            |
+---------------------------------------------------------------------+
```

- Vazio: ilustração de caixa de equipamento em traço + “Nenhuma categoria cadastrada. Crie a
  primeira categoria para organizar a frota.” + “Nova categoria”.
- Carregando: 3 linhas `animate-pulse`; erro: “Não foi possível carregar as categorias. Tente novamente.”
  + “Tentar novamente”; sucesso: “Categoria salva.”; inativar: confirmação “Os equipamentos desta
  categoria continuarão ativos. Confirma inativar?”
- Hoje o renderer só lista; criar/editar/inativar são desenho condicionado ao ADR 0007.

### 8.4 Manutenção (ordens) — depende de `manutencao:*` (sem handler)

```
+---------------------------------------------------------------------+
| Sidebar (admin)  |  Manutenção                                       |
|                  |  [ Abertas (3) ]  [ Concluídas ]                  |
|                  |  [Buscar ordem/equipamento]  [ Abrir ordem ]      |
|                  +-----------------------------------------------+   |
|                  | Ordem | Equipamento | Entrada | Previsão |...|    |
|                  | #12   | MTB Aro 29  | 25/11   | 02/12    |...|    |
|                  +-----------------------------------------------+   |
|                  | Painel da ordem #12                               |
|                  | Equipamento: MTB Aro 29                           |
|                  | Destino: ( ) Interna  ( • ) Fornecedor             |
|                  | Responsável: [__________] Previsão: [dd/mm/aaaa]  |
|                  | Observações [__________________________]          |
|                  | [ Concluir ordem ]                                |
+---------------------------------------------------------------------+
```

- Vazio: prancheta com chave de grifo em traço + “Nenhuma ordem aberta. Envie um equipamento para
  manutenção para começar.”; carregando: “Carregando ordens de manutenção…”; erro: “Não foi possível
  carregar as ordens. Tente novamente.”; sucesso: “Ordem #12 aberta.”
- Hoje: `/manutencao` mostra “Tela em construção” com o badge das dependências.

### 8.5 Usuários (perfis) — implementado (`usuarios:*`)

```
+---------------------------------------------------------------------+
| Sidebar (admin)  |  Usuários                                         |
|                  |  Quem pode entrar e o que cada um pode fazer.      |
|                  |  [Buscar usuário]  [ Novo usuário ]                |
|                  +-----------------------------------------------+   |
|                  | Nome | Usuário | Perfil | Situação | Último ... |  |
|                  | Ana  | ana     | Admin  | Ativo    | 25/11      |  |
|                  | João | joao    | Balcão | Ativo    | 24/11      |  |
|                  +-----------------------------------------------+   |
|                  | Painel: Nome [_______] Usuário/CPF [_______]      |
|                  | Perfil: ( • ) Administrador  ( ) Atendente       |
|                  |          de balcão                                |
|                  | Senha inicial [_______] (sem senha padrão)        |
|                  | [ Trocar senha no primeiro acesso ] ( x )         |
|                  | [ Salvar ]  [ Inativar ]                          |
+---------------------------------------------------------------------+
```

- Vazio: “Nenhum usuário além do administrador.”; carregando: “Carregando usuários…”; erro: “Não
  foi possível carregar os usuários. Tente novamente.”; sucesso: “Usuário criado. Perfil: atendente
  de balcão.”
- Nunca exibir `senhaHash` nem guardar senha no renderer. A senha inicial é definida pelo
  administrador; ao trocar a própria senha, a tela pede a senha atual. Não há troca obrigatória no
  primeiro acesso.

---

## 9. Regras para ficar bonito de verdade

### 9.1 Hierarquia visual

| Nível | Classes (literal) | Uso |
| --- | --- | --- |
| Título da tela | `font-display text-2xl font-semibold text-floresta` | Um por tela |
| Título de seção/card | `font-display text-lg text-floresta` | Agrupa tabela/painel |
| Corpo e células | `text-sm text-grafite` | Leitura principal |
| Rótulo | `text-xs font-semibold uppercase tracking-wider text-floresta` | `th`, etiquetas |
| Auxiliar | `text-xs text-floresta/70` | Ajuda, placeholder, rodapé |

Uma **ação primária por tela** (lima). Ações secundárias usam borda `granito/45`; destrutivas usam
`erro`. Nada de gradiente, textura ruidosa ou ícone decorativo.

### 9.2 Lima somente como destaque sobre fundo escuro

- Permitido: `bg-lima` com `text-grafite` (botão primário, **14,15:1**); `text-lima` sobre
  `bg-floresta` (item ativo, **10,74:1**) e sobre `bg-grafite` (toast, **14,15:1**).
- Proibido: `text-lima` sobre `bg-pedra` (**1,08:1**) ou `bg-superficie` (**1,31:1**); `text-branco`
  sobre `bg-lima` (**1,31:1**). Onde o fundo é claro, o realce é `floresta`.
- Hover do primário troca `bg-lima` por `bg-geleira`, mantendo `text-grafite` (**7,84:1**).

### 9.3 Densidade de tabelas

- Altura de linha: `h-row` (36 px). Cabeçalho `bg-floresta text-pedra`, `th h-row px-4 text-xs
  font-semibold uppercase tracking-wider`.
- Célula: `px-4 py-2 text-sm text-grafite`. Linha: `h-row border-t border-granito/30
  transition-colors hover:bg-pedra/60`.
- Números e moeda: `text-right tabular-nums`; datas: `text-left whitespace-nowrap`; status: badge à
  esquerda do texto. Cabeçalho de valor também alinhado à direita.
- Zebra sutil proposta: `odd:bg-pedra/40` — razão calculada **17,4:1** para `text-grafite` (pedra
  40% + branco). Se o FE preferir apenas o hover do design system, usar `hover:bg-pedra/60` sem zebra.
- Rolagem **somente no corpo da tabela**; nunca rolagem horizontal da janela. Em 800 px, a sidebar
  colapsa para `w-16`; em 1920 px, `w-sidebar`.

### 9.4 Ícones consistentes

- Um único conjunto de SVG inline: `stroke-current`, `size-4` em controles e `size-5` em destaques,
  `shrink-0`, `aria-hidden="true"`.
- Mesmo traço (1,5 px), mesma grade (24×24), mesma cor do texto do contexto: `text-floresta` em
  fundo claro, `text-lima` em fundo escuro. Nenhuma biblioteca nova sem o Arquiteto.
- **Nunca emoji.** Estado nunca é comunicado só por ícone: ícone + texto + badge.

### 9.5 Ilustrações SVG simples e originais (descritas em texto)

Usar `size-10 text-floresta/70`, traço 1,5 px, sem preenchimento, sem gradiente, sem imagem remota:

| Estado vazio | Descrição da ilustração |
| --- | --- |
| Sem reservas | Caixa de equipamento vista de frente, com alça superior e duas fivelas laterais. |
| Sem equipamentos disponíveis | Mapa dobrado em três dobras com um pino circular no centro. |
| Sem categorias | Caixa de equipamento com uma etiqueta vazia pendurada. |
| Sem ordens de manutenção | Prancheta com uma chave de grifo cruzada sobre a folha. |
| Sem cliente/fornecedor | Etiqueta de identificação com linha de texto e um círculo de fundo no canto. |

### 9.6 Animação discreta

- Transição padrão: `transition-colors duration-150` em botões e linhas.
- `animate-spin` apenas no spinner de carregamento; `animate-pulse` apenas em skeleton.
- Sempre acompanhar de `motion-reduce:animate-none motion-reduce:transition-none`.
- Nada de parallax, salto de layout ou movimento que desloque o foco.

### 9.7 Formatação pt-BR

| Dado | Formato | Exemplo |
| --- | --- | --- |
| Moeda | `R$` + ponto de milhar + vírgula decimal, duas casas | `R$ 1.234,56` |
| Diária | valor por dia, sem arredondamento escondido | `R$ 90,00 por dia` |
| Data | `dd/mm/aaaa` | `25/11/2026` |
| CPF | `000.000.000-00` | `123.456.789-09` |
| CNPJ | `00.000.000/0000-00` | `12.345.678/0001-90` |
| Telefone | `(11) 99999-9999` ou `(11) 3333-4444` | `(11) 98877-6655` |
| CEP | `00000-000` | `01310-100` |
| Dias de multa | número + regra em texto | `2 dias cobráveis (domingos e feriados nacionais não contam)` |

Máscaras são aplicadas enquanto o usuário digita; o valor enviado ao sistema é o mesmo, sem
formatação. Nenhum texto de interface usa `payload`, `IPC`, `schema` ou “estado discriminado”.

### 9.8 Foco, alvos e leitores de tela

- Foco em fundo claro: `focus-visible:outline-2 focus-visible:outline-offset-2
  focus-visible:outline-floresta` (**11,60:1** sobre pedra). Em fundo escuro:
  `focus-visible:outline-lima` (**10,74:1**). Nunca só troca de cor de borda.
- Alvos propostos: `min-h-11 min-w-11` para botões de ícone e `gap-3` entre ações; implementação
  pelo `frontend-developer` (o design system hoje define `px-4 py-2.5`, sem altura mínima explícita).
- Ordem de `Tab`: cabeçalho → busca → formulário → tabela → ações. Modal prende o foco, fecha com
  `Esc` e devolve o foco ao botão que o abriu.
- `aria-live="polite"` no resumo da reserva e nos valores da devolução; `aria-invalid` no campo com
  erro; ícone de estado escondido com `aria-hidden`, texto visível para todos.

### 9.9 Viewport e perfis

| Perfil | 800×600 | 1920×1080 | Telas |
| --- | --- | --- | --- |
| Atendente de balcão | Sidebar `w-16`; painel em `grid-cols-1`; tabela com rolagem no corpo | Sidebar `w-sidebar`; painel em `md:grid-cols-2`; campos limitados a `max-w-2xl` | Dashboard, Clientes, Reservas, Devoluções |
| Administrador | Mesmo comportamento; ações de edição permanecem visíveis por ícone + rótulo | Mesmo comportamento, com colunas extras de situação/ações | Tudo acima + Equipamentos, Fornecedores, Categorias, Manutenção, Pagamentos, Usuários |

Validação obrigatória nos dois extremos: nenhum campo de ação principal abaixo da dobra em
800×600; nenhum campo esticado além de `max-w-2xl` em 1920×1080.

---

## 10. Tokens e contrastes verificados

Todas as razões abaixo já estão calculadas e registradas em `docs/design-system.md` §3, exceto a
última linha, calculada neste documento pela mistura de `pedra` 40% sobre `superficie`.

| Combinação | Razão | Resultado | Uso neste documento |
| --- | --- | --- | --- |
| `text-grafite` / `bg-pedra` | 15,28:1 | ✅ AA | texto padrão da janela |
| `text-floresta` / `bg-pedra` | 11,60:1 | ✅ AA | títulos sobre fundo quente |
| `text-floresta` / `bg-superficie` | 14,07:1 | ✅ AA | títulos de card, painel, modal |
| `text-floresta` / `bg-lima/20` em superfície | 13,24:1 | ✅ AA | linha selecionada da lista/tabela |
| `text-grafite` / `bg-superficie` | 18,53:1 | ✅ AA | células, campos e modais |
| `text-pedra` / `bg-floresta` | 11,60:1 | ✅ AA | sidebar e cabeçalho escuro |
| `text-lima` / `bg-floresta` | 10,74:1 | ✅ AA | item ativo, marca |
| `text-granito` / `bg-floresta` | 4,88:1 | ✅ AA | legenda secundária escura |
| `text-geleira` / `bg-floresta` | 5,95:1 | ✅ AA | link sobre verde escuro |
| `text-grafite` / `bg-lima` | 14,15:1 | ✅ AA | botão primário |
| `text-grafite` / `bg-geleira` | 7,84:1 | ✅ AA | hover do primário |
| `text-lima` / `bg-grafite` | 14,15:1 | ✅ AA | toast sobre backdrop |
| `text-branco` / `bg-erro` | 5,94:1 | ✅ AA | ação destrutiva |
| `text-erro` / `bg-erro-suave` | 5,06:1 | ✅ AA | badge/toast de erro |
| `text-alerta` / `bg-alerta-suave` | 5,27:1 | ✅ AA | badge/toast de alerta |
| `text-sucesso` / `bg-sucesso-suave` | 5,96:1 | ✅ AA | badge/toast de sucesso |
| `text-floresta/70` / `bg-superficie` | 5,38:1 | ✅ AA | texto auxiliar |
| `text-grafite` / `odd:bg-pedra/40` sobre superfície | **17,4:1** (calculado aqui) | ✅ AA | zebra sutil da tabela |
| `text-lima` / `bg-pedra` | 1,08:1 | ❌ proibida | nunca usar |
| `text-lima` / `bg-superficie` | 1,31:1 | ❌ proibida | nunca usar |
| `text-branco` / `bg-lima` | 1,31:1 | ❌ proibida | primário sempre com `text-grafite` |
| `text-granito` / `bg-pedra` | 2,38:1 | ❌ proibida | granito é borda, não texto claro |

---

## 11. Especificação por estado (classes literais, sem CSS de autoria)

Classes copiadas de `docs/design-system.md` §8. Nenhuma interpolação; o FE as coloca em constantes
tipadas. Não há `@apply`, `<style>` nem `style=`.

### 11.1 Botão primário

- **Base:** `inline-flex items-center justify-center gap-2 rounded-control bg-lima px-4 py-2.5 text-sm font-semibold text-grafite transition-colors duration-150`
- **Padrão:** base. **Hover:** `hover:bg-geleira`.
- **Foco:** `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta`.
- **Desabilitado/carregando:** `disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-lima`.
- **Erro/destrutivo:** `bg-erro text-branco hover:bg-erro/90 focus-visible:outline-erro`.
- **Secundário:** `border border-granito/45 bg-superficie text-floresta hover:bg-pedra`.
- **Ghost:** `bg-transparent text-floresta hover:bg-floresta/10`.
- **Movimento reduzido:** acrescentar `motion-reduce:transition-none`.

### 11.2 Campo e select

- **Base campo:** `w-full rounded-control border border-granito/45 bg-superficie px-3 py-2 text-sm text-grafite placeholder:text-floresta/70 transition-colors`.
- **Base select:** base + `appearance-none pr-9`.
- **Hover:** `hover:border-floresta/60`. **Foco:** `focus-visible:border-floresta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta`.
- **Desabilitado:** `disabled:cursor-not-allowed disabled:bg-pedra disabled:text-floresta/60`.
- **Erro:** `aria-invalid:border-erro aria-invalid:focus-visible:outline-erro`.
- **Com ícone:** wrapper `relative`; campo `pl-9`; ícone `pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-floresta`.
- **Nota:** máscara pt-BR é valor do campo, nunca `placeholder` como dado.

### 11.3 Tabela densa

- **Container:** `w-full overflow-x-auto rounded-card border border-granito/45 bg-superficie shadow-card`.
- **Tabela:** `w-full border-collapse text-left text-sm`.
- **Cabeçalho:** `bg-floresta text-pedra`; `th`: `h-row px-4 text-xs font-semibold uppercase tracking-wider`.
- **Linha:** `h-row border-t border-granito/30 transition-colors hover:bg-pedra/60`.
- **Célula:** `px-4 py-2 text-grafite`. **Selecionada:** `bg-lima/20 text-floresta ring-1 ring-inset ring-floresta`.
- **Foco:** `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta`.
- **Desabilitada:** `opacity-60`. **Erro:** `bg-erro-suave text-erro`. **Vazia:** `h-32 text-center text-floresta/70`.
- **Zebra proposta:** `odd:bg-pedra/40` (17,4:1); alinhar números com `text-right tabular-nums`.

### 11.4 Badge de status

- **Base:** `inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold`.
- **Disponível/confirmado:** `bg-sucesso-suave text-sucesso`. **Pendente:** `bg-alerta-suave text-alerta`.
- **Atrasado/erro:** `bg-erro-suave text-erro`. **Manutenção/neutro:** `bg-pedra text-floresta`.
- **Sobre barra escura:** `bg-lima/20 text-lima`. **Desabilitado:** `opacity-50`.

### 11.5 Estado vazio

- **Container:** `flex min-h-64 flex-col items-center justify-center gap-3 rounded-card border border-dashed border-granito/60 bg-pedra/40 p-8 text-center`.
- **Ilustração:** `size-10 text-floresta/70`. **Título:** `font-display text-lg text-floresta`.
- **Texto:** `max-w-sm text-sm text-floresta/70`. **Ação:** classes do botão secundário (11.1).

### 11.6 Carregando e erro

- **Carregando:** `flex min-h-40 items-center justify-center gap-3 text-floresta`; spinner
  `size-5 animate-spin rounded-full border-2 border-granito/40 border-t-floresta`; skeleton
  `animate-pulse rounded-control bg-granito/30`.
- **Erro:** `flex min-h-40 flex-col items-center justify-center gap-3 rounded-card border border-erro/40 bg-erro-suave p-8 text-center`; título `font-display text-lg text-erro`; mensagem `max-w-md text-sm text-grafite`.
- **Movimento reduzido:** `motion-reduce:animate-none`.

### 11.7 Toast

- **Container:** `fixed bottom-6 right-6 z-50 flex w-[min(92vw,360px)] flex-col gap-2`.
- **Base:** `flex items-start gap-3 rounded-card border px-4 py-3 text-sm shadow-card`.
- **Sucesso:** `border-sucesso/30 bg-sucesso-suave text-sucesso`. **Erro:** `border-erro/30 bg-erro-suave text-erro`.
- **Alerta:** `border-alerta/30 bg-alerta-suave text-alerta`. **Informativo:** `border-geleira/40 bg-geleira/10 text-floresta`.

---

## 12. Risco residual e handoff

### 12.1 Ao Arquiteto — contrato antes de implementar

1. Confirmar e implementar `auth:sessao-atual`, `auth:entrar`, `auth:bootstrap`, `auth:sair`
   e `usuarios:*` (ADR 0007). Sem isso, Login, Primeira execução e Usuários continuam sendo só
   desenho de UX.
2. Confirmar `categorias:criar/atualizar/inativar` e `manutencao:criar/listar/concluir` (ADR 0007).
3. Confirmar `devolucoes:calcular-multa` e `devolucoes:listar-pendentes` para que a prévia de multa
   deixe de depender de valor já gravado.
4. Premissa adotada: senha inicial definida pelo admin, sem troca obrigatória no primeiro acesso;
   a troca da própria senha exige a atual. O bootstrap **não** usa senha padrão.

### 12.2 Ao `frontend-developer` — implementação de UX sem CSS próprio

1. “Nova reserva” e “Registrar devolução” no Dashboard devem abrir o painel já ativo, não só trocar
   de rota; foco inicial no primeiro campo.
2. Disponibilidade e prévia de multa atualizam ao mudar data/reserva, sem botão extra; manter botão
   “Tentar novamente” nos erros.
3. Máscaras pt-BR enquanto digita; consulta de CEP/CNPJ explícita e sem sobrescrever campos sem aviso.
4. Distinguir mensagens de `PESQUISA_INVALIDA`, `SEM_DADOS`, `SERVICO_FORA` e `CREDENCIAL_AUSENTE`
   com os textos das tabelas 3.4, 4.4, 5.4 e 6.4 — nunca mostrar motivo técnico cru.
5. Aplicar `min-h-11 min-w-11` nos alvos pequenos, `motion-reduce:*`, `text-right tabular-nums` e
   a zebra `odd:bg-pedra/40` (17,4:1 calculado aqui).
6. Registrar atalhos globais no shell (`Ctrl+N`, `Ctrl+K`, `F5`) para o Dashboard também; hoje
   `registrarAtalhos` só vive nas páginas com painel.
7. Validar os cinco fluxos em **800×600** e **1920×1080**, nos dois perfis.

### 12.3 Divergências documentadas (para revisão, não corrigidas aqui)

- `docs/integracoes.md:33` descreve CEP preenchido ao salvar; o código consulta ao completar
  8 dígitos (`PaginaClientes.ts:392-401`).
- `docs/integracoes.md:55,60` prevê mais campos do CNPJ; o código preenche só a razão social
  (`PaginaFornecedores.ts:681-697`).
- A tela de Devoluções avisa que multa é calculada “no registro”, mas o valor mostrado vem do
  pagamento já gravado; não há handler de cálculo.
- `PaginaDashboard` compõe os dados localmente e não chama `dashboard:resumo`.

### 12.4 Limites desta entrega

Documento proposto, sem implementação. Nenhum handler foi criado, nenhuma dependência instalada,
nenhum `git push` feito e nenhum build executado. Fontes continuam locais via `@fontsource/*`
(`@fontsource-variable/fraunces` e `@fontsource-variable/inter`), sem CDN ou `@import` de URL.
