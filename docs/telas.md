# Mapa de telas e wireframes — Zênite · Aluguel Outdoor

- **Status:** aceito
- **Versão:** 1.6
- **Data:** 2026-11-25
- **Atualização:** padronização de `Editar` e `Inativar` em todas as telas de cadastro; registros inativos preservados e sinalizados com badge neutro para o administrador.
- **Dono:** UI/UX Designer (UX)
- **Base:** `docs/requisitos-cliente.md`, `docs/design-system.md`, `src/shared/contratos/`
- **Implementação:** `frontend-developer` (componentes e estados), Arquiteto/ED (novos canais)

Wireframes em texto. Eles descrevem **estrutura, conteúdo e comportamento**, não pixels. As
classes vêm do `docs/design-system.md`; aqui os componentes são referenciados pelo nome
(`tabela`, `campo`, `badge`, `modal`, `toast`, `estado vazio`, `carregando`, `erro`).

Legenda:

```
┌───┐  moldura de card / tabela / modal        [ ... ]  campo ou select
│   │  conteúdo                                 ( ... )  botão ou ação
◆       dado dinâmico                            ⚠        mensagem de erro inline
∅       estado vazio                             ⟳        carregando
```

> **Sem conexão** neste documento significa falha de MySQL/MariaDB (configurado no `.env`, ADR
> 0005) ou dos serviços externos (CEP e clima). O renderer nunca acessa banco nem HTTP externo:
> tudo passa por `window.electronAPI`.

---

## 1. Mapa de navegação

```
                         ┌──────────┐
                         │  Login   │  (sem sessão → nenhum dado)
                         └────┬─────┘
                              │ autenticar
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Sidebar (floresta)                                                   │
│   Zênite                                                             │
│   ◆ Dashboard .......................... reservas do dia            │
│   ◆ Equipamentos* ...................... cadastro + conservação      │
│   ◆ Clientes ........................... cadastro rápido por CEP    │
│   ◆ Fornecedores* ...................... compra e manutenção        │
│   ◆ Manutenção* ........................ ordens de serviço          │
│   ◆ Reservas ........................... disponibilidade + clima    │
│   ◆ Devoluções ......................... multas por atraso          │
│   ◆ Pagamentos* ........................ reservas e multas          │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    conteúdo `bg-pedra` + cards
```

`*` = visível somente para **administrador**.

| Perfil | Acesso | Intenção |
| --- | --- | --- |
| **Atendente de balcão** | Dashboard, Clientes, Reservas, Devoluções | resolver a locação em 1–2 interações |
| **Administrador** | todas as telas, inclusive Equipamentos, Fornecedores, Manutenção e Pagamentos | gerir frota, terceiros e finanças |

**Regra de escrita:** toda tela de cadastro expõe `Editar` e `Inativar` (soft delete). Nenhuma
tela faz exclusão física. Registros inativos são preservados, aparecem com badge neutro para o
administrador quando a listagem usa `incluirInativos: true` e ficam ocultos do balcão.

### 1.1 Caminho crítico de balcão

1. `Dashboard` mostra reservas de hoje e devoluções pendentes.
2. `Ctrl+N` abre `Reservas` em modo novo.
3. Busca do cliente; se não existe, `Clientes` com preenchimento por CEP.
4. Escolhe a **data** → painel de disponibilidade por data.
5. Seleciona equipamento(s) → resumo com diárias.
6. `Ctrl+Enter` abre confirmação com **previsão do tempo do dia**.
7. Confirma → regresso ao Dashboard + toast de sucesso.
8. Na devolução: `Devoluções` calcula atraso e multa → `Pagamentos` registra a baixa.

### 1.2 Atalhos globais

| Tecla | Ação |
| --- | --- |
| `Ctrl+K` | busca global (cliente, equipamento, reserva) |
| `Ctrl+N` | novo registro da tela atual |
| `F5` | recarregar dados da tela |
| `F2` | editar item selecionado |
| `Enter` | confirmar / abrir selecionado |
| `Esc` | fechar modal, limpar busca ou cancelar edição |
| `Alt+←` | voltar à tela anterior |
| `Tab` / `Shift+Tab` | navegação; foco sempre visível (`outline-floresta` / `outline-lima`) |

---

## 2. Matriz de contrato IPC

Situação real em `src/shared/contratos/canais.ts`, `esquemas.ts` e `api.ts`. Legenda: ✅ pronto
para CRUD · ⚠️ implementado, mas depende de ajuste de UI · ❌ ausente.

| Tela | Canais disponíveis | Situação | Perfis | Responsável |
| --- | --- | --- | --- | --- |
| Login | nenhum | ❌ fora desta entrega (sem `auth:*`) | ambos | Arquiteto → ED |
| Dashboard | `reservas:listar`, `devolucoes:listar`, `pagamentos:listar`, `equipamentos:listar` | ⚠️ implementado; falta consumir `devolucoes:listar` e `pagamentos:listar` | ambos | FE |
| Equipamentos | `equipamentos:*`, `categorias:listar`, `fornecedores:listar` | ✅ pronto para CRUD | somente admin consulta/cadastra/edita/inativa | FE |
| Clientes | `clientes:*`, `clientes:buscar-cep` | ✅ pronto para CRUD | ambos cadastram; admin inativa | FE |
| Fornecedores | `fornecedores:*` | ✅ pronto para CRUD | somente admin | FE |
| Manutenção | nenhum | ❌ bloqueado: precisa de `manutencao:*` e modelo `OrdemManutencao` | admin abre/conclui; balcão consulta | Arquiteto → ED → FE |
| Reservas | `reservas:*`, `itens-reserva:*`, `equipamentos:listar-disponiveis` | ✅ pronto; clima é gravado no main na confirmação | ambos criam; admin edita/cancela/inativa | FE |
| Devoluções | `devolucoes:*`, `pagamentos:*`, `reservas:buscar-por-id` | ✅ pronto para CRUD | ambos registram; admin edita/inativa e ajusta multa | FE |
| Pagamentos | `pagamentos:*` | ✅ pronto para CRUD | admin edita/inativa; balcão consulta | FE |

`categorias:listar` alimenta os filtros de Equipamentos e Reservas. Os sufixos `:criar`,
`:atualizar`, `:inativar` e `:buscar-por-id` existem para todas as entidades de cadastro; itens
de reserva usam `:remover` (chave composta).

> Nenhuma string literal de canal deve aparecer no renderer. O renderer consome somente
> `window.electronAPI`; nomes aqui são o contrato já exposto. CEP e clima são chamadas HTTP feitas
> **no main**, com allowlist de domínios — nunca no renderer (CSP bloqueia `connect-src` externo).

---

## 3. Wireframes por tela

### 3.1 Login

**Objetivo:** autenticar o usuário e liberar o shell; sem sessão válida, nenhuma tela carrega dados.

**Perfis:** administrador e atendente (o administrador pode criar atendentes em versão futura).

**Campos:** usuário (texto), senha (senha), `Lembrar-me` (checkbox opcional).

**Ações:** `( Entrar )` primário; `Esqueci minha senha` (abre instrução de contato com o administrador).

**Atalhos:** `Enter` = Entrar · `Esc` = limpar campos · `Tab` = alternar campos.

**Estados de erro**

| Cenário | Onde | Mensagem / comportamento | Componente |
| --- | --- | --- | --- |
| CEP não encontrado | — | Não se aplica; Login não usa endereço. | — |
| Clima indisponível | — | Não se aplica; clima só aparece na confirmação de reserva. | — |
| Sem conexão | toast | "Não foi possível validar suas credenciais. Verifique sua conexão e tente novamente." | `toast erro` + botão Tentar novamente |
| Lista vazia | — | Não se aplica; não há lista nesta tela. | — |

**Wireframe**

```
        ┌──────────────────────────────────────────┐
        │              ◆ logo-claro                │
        │        Zênite · Aluguel Outdoor          │
        │                                          │
        │   Usuário                                │
        │   [ .................................. ] │
        │                                          │
        │   Senha                                  │
        │   [ .................................. ] │
        │                                          │
        │   ☐ Lembrar-me                           │
        │   ⚠ credenciais inválidas (inline)       │
        │                                          │
        │            ( Entrar )                    │
        │   Esqueci minha senha                    │
        └──────────────────────────────────────────┘
              Zênite v0.1.0 · uso interno
```

---

### 3.2 Dashboard

**Objetivo:** responder "o que acontece hoje?" em menos de 5 segundos: reservas do dia,
devoluções pendentes e atrasos.

**Perfis:** ambos. Administrador vê também cards de pagamentos em aberto e ordens de manutenção.

**Campos:** filtro de data (date, padrão = hoje).

**Ações:** `( Nova reserva )` primário · `( Registrar devolução )` secundário · abrir reserva · abrir cliente · `F5` atualizar.

**Atalhos:** `Ctrl+N` nova reserva · `D` foco no filtro de data · `Enter` abrir selecionado · `F5` recarregar · `Ctrl+K` busca global.

**Estados de erro**

| Cenário | Onde | Mensagem / comportamento | Componente |
| --- | --- | --- | --- |
| CEP não encontrado | — | Não se aplica nesta tela. | — |
| Clima indisponível | — | Não se aplica; o clima é exibido só na confirmação da reserva. | — |
| Sem conexão | toast + badge | "Não foi possível atualizar os dados externos. Exibindo dados locais." | `toast alerta` + badge `alerta` |
| Lista vazia | tabelas | "Nenhuma reserva para esta data." / "Nenhuma devolução pendente." | `estado vazio` + `( Nova reserva )` |

**Wireframe**

```
┌────────────────────────────────────────────────────────────────────┐
│  Bom dia, ◆nome   ·   Quinta, 23/11   [ Data: 2026-11-23 ] ( Nova reserva ) │
├────────────────────────────────────────────────────────────────────┤
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐        │
│ │ Reservas   │ │ Devoluções │ │ Atrasadas  │ │ A pagar*   │        │
│ │ hoje       │ │ pendentes  │ │ ⚠ 2        │ │ ◆ R$ 480   │        │
│ │ ◆ 12       │ │ ◆ 5        │ │            │ │            │        │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘        │
├───────────────────────────────────────┬────────────────────────────┤
│ Reservas do dia                       │ Devoluções pendentes       │
│ ┌───────────────────────────────────┐ │ ┌────────────────────────┐ │
│ │ HORA  CLIENTE   EQUIP.   STATUS   │ │ │ CLIENTE  PREV.  STATUS │ │
│ │ 09:00 ◆Ana      Bicicleta ◆confirmada│ │ │ ◆João   22/11  ◆atrasado│ │
│ │ 11:30 ◆Carlos   Caiaque  ◆pendente│ │ │ ◆Maria  23/11  ◆hoje   │ │
│ │ ∅ vazia → ( Nova reserva )        │ │ │ ∅ vazia → ( Voltar )  │ │
│ └───────────────────────────────────┘ │ └────────────────────────┘ │
└───────────────────────────────────────┴────────────────────────────┘
```

`*` card exclusivo do administrador.

---

### 3.3 Equipamentos

**Objetivo:** cadastrar e acompanhar cada item, com **estado de conservação** explícito e
disponibilidade clara para o balcão.

**Perfis:** somente administrador. O item **Equipamentos*** fica oculto na sidebar do atendente; se a rota `#/equipamentos` for aberta diretamente, a tela mostra “Acesso restrito a administradores.” sem carregar dados.

**Campos do formulário:** nome · categoria (select via `categorias.listar`) · estado de conservação (novo / bom / desgastado / em manutenção) · disponibilidade (`Disponível` / `Indisponível` / `Em manutenção`) · fornecedor (select opcional via `fornecedores.listar`). Colunas da tabela: nome, categoria, conservação (badge), disponibilidade (badge), fornecedor, ações. A diária não é exibida porque o contrato `Equipamento` ainda não expõe valor de tabela.

**Disponibilidade × ativo:** `ativo` continua sendo exclusivamente exclusão lógica. Para reservas, `equipamentos:listar-disponiveis` considera somente itens com `disponibilidade = 'Disponível'` que não estejam reservados no período; os demais são ocultados do balcão, mas continuam visíveis para o administrador.

**Ações:** `( Novo equipamento )` · `F2` editar · `( Inativar )` · `Esc` limpar filtros. “Enviar para manutenção” é feito editando a conservação para `Em Manutenção`; não há canal separado.

**Atalhos:** `Ctrl+N` novo · `Ctrl+K` foco na busca · `F2` editar selecionado · `Ctrl+Enter` salvar · `Esc` limpar filtros/cancelar.

**Fallback:** se o banco falhar, os dados de exemplo continuam apenas em leitura, com aviso “dados de exemplo”; `( Novo equipamento )`, edição e inativação ficam desabilitadas.

**Estados de erro**

| Cenário | Onde | Mensagem / comportamento | Componente |
| --- | --- | --- | --- |
| Sem acesso | tela | "Acesso restrito a administradores." | `estado erro` sem botão de tentar |
| CEP não encontrado | — | Não se aplica; endereço não é campo deste cadastro. | — |
| Clima indisponível | — | Não se aplica nesta tela. | — |
| Sem conexão | toast + tabela | "Não foi possível carregar os equipamentos. Tente novamente." | `toast erro` + botão Tentar novamente |
| Dados de exemplo | aviso no cabeçalho | "dados de exemplo" + ações de escrita desabilitadas | `badge` + `botão disabled` |
| Lista vazia | tabela | "Nenhum equipamento com esses filtros." + `( Limpar filtros )` | `estado vazio` |

**Wireframe**

```
┌────────────────────────────────────────────────────────────────────┐
│ Equipamentos                                      ( Novo equipamento ) │
│ [ Buscar nome... ] [ Categoria ▾ ] [ Disponibilidade ▾ ] [ Conservação ▾ ] │
├────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ NOME            CATEGORIA   DIÁRIA  CONSERVAÇÃO   DISPONÍVEL   │ │
│ │ Bicicleta MTB   Ciclista    R$ 90   ◆bom          ◆disponível  │ │
│ │ Caiaque 2p      Náutica     R$ 140  ◆desgastado   ◆reservado   │ │
│ │ Barraca 4p      Camping     R$ 75   ◆manutenção   ◆indisponível│ │
│ │ ∅ Nenhum equipamento com esses filtros → ( Limpar filtros )   │ │
│ └────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

> ✅ Contrato pronto: `Equipamento` expõe `estadoConservacao`, `ativo` e `atualizadoEm`.
> As ações usam `equipamentos:criar`, `equipamentos:atualizar` e `equipamentos:inativar`.

---

### 3.4 Clientes

**Objetivo:** cadastrar cliente com endereço rápido por CEP, mantendo a busca utilizável em balcão.

**Perfis:** ambos cadastram e consultam; administrador pode editar/excluir.

**Campos:** nome · CEP · logradouro · número · complemento · bairro · cidade · UF (2 letras, normalizada para maiúsculas) · email · telefone. Tabela: nome, telefone, cidade, ações.

**Ações:** `( Novo cliente )` · `( Buscar CEP )` ao digitar 8 dígitos · `( Salvar )` · `F2` editar · `Esc` cancelar.

**Atalhos:** `Ctrl+N` novo · `Ctrl+Enter` buscar CEP · `Enter` salvar · `Esc` cancelar · `F2` editar · `Ctrl+K` busca na tabela.

**Após salvar:** limpar o campo de busca, recarregar a lista e selecionar o cliente gravado, que aparece em destaque com o selo “Selecionado”.

**Estados de erro**

| Cenário | Onde | Mensagem / comportamento | Componente |
| --- | --- | --- | --- |
| CEP não encontrado | abaixo do CEP | "CEP não encontrado. Preencha o endereço manualmente." + `( Preencher manualmente )` | `campo erro` + `toast alerta` |
| UF inválida | abaixo da UF | "Informe a UF com 2 letras (ex.: SP)." | `campo erro` |
| Clima indisponível | — | Não se aplica nesta tela. | — |
| Sem conexão | toast | "Não foi possível consultar o CEP. Verifique sua conexão e tente novamente." | `toast erro` + botão Tentar novamente |
| Lista vazia | tabela | "Nenhum cliente cadastrado." + `( Novo cliente )` | `estado vazio` |

**Wireframe**

```
┌───────────────────────────────────────────┬──────────────────────────┐
│ Novo cliente                              │ Clientes       ( Novo )  │
│ Nome [ ................................ ] │ [ Buscar cliente... ]    │
│ CEP  [ 12345-678 ] ( Buscar CEP )          │ ┌──────────────────────┐ │
│ ⚠ CEP não encontrado → ( Preencher manualmente ) │ │ NOME    FONE   CIDADE │ │
│ Logradouro [ ........................... ] │ │ ◆Ana    (11)…  São Paulo│ │
│ Nº [ ... ] Compl. [ .................... ] │ │ ◆Carlos (21)…  Rio     │ │
│ Bairro [ .......... ] Cidade [ ......... ] │ │ ∅ Nenhum cliente     │ │
│ UF [ SP ▾ ]  Email [ .................. ] │ │ → ( Novo cliente )   │ │
│ Telefone [ ............................. ] │ └──────────────────────┘ │
│            ( Cancelar )  ( Salvar )        │                          │
└───────────────────────────────────────────┴──────────────────────────┘
```

---

### 3.5 Fornecedores

**Objetivo:** registrar de quem a loja compra equipamentos e para quem envia manutenção.

**Perfis:** somente administrador (item oculto na sidebar do atendente).

**Campos:** razão social · CNPJ · tipo (compra / manutenção / ambos) · contato · telefone · email · observações. Tabela: razão social, tipo, contato, telefone, ações.

**Ações:** `( Novo fornecedor )` · `F2` editar · `( Ver equipamentos )` (abre Equipamentos filtrado).

**Atalhos:** `Ctrl+N` novo · `Ctrl+K` busca · `F2` editar · `Enter` ver equipamentos · `Esc` cancelar.

**Estados de erro**

| Cenário | Onde | Mensagem / comportamento | Componente |
| --- | --- | --- | --- |
| CEP não encontrado | — | Não se aplica; endereço é opcional e preenchido manualmente. | — |
| Clima indisponível | — | Não se aplica nesta tela. | — |
| Sem conexão | toast | "Não foi possível carregar os fornecedores. Tente novamente." | `toast erro` |
| Lista vazia | tabela | "Nenhum fornecedor cadastrado." + `( Novo fornecedor )` | `estado vazio` |

**Wireframe**

```
┌────────────────────────────────────────────────────────────────────┐
│ Fornecedores                                   ( Novo fornecedor )  │
│ [ Buscar razão social... ] [ Tipo ▾ ]                              │
├────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ RAZÃO SOCIAL        TIPO        CONTATO        FONE     AÇÕES  │ │
│ │ ◆Aventura Ltda      compra      ◆Ana           (11)…    ver    │ │
│ │ ◆Oficina Serra      manutenção  ◆João          (12)…    ver    │ │
│ │ ∅ Nenhum fornecedor cadastrado → ( Novo fornecedor )          │ │
│ └────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

---

### 3.6 Manutenção

**Objetivo:** saber o que está fora de operação, por quanto tempo e com qual fornecedor.

**Perfis:** administrador abre/conclui; atendente consulta status (badges) e bloqueia a reserva do item.

**Campos:** equipamento (select) · fornecedor (select) · problema (textarea) · data de entrada · previsão de retorno · status (aberta / em andamento / concluída) · observações. Tabela: equipamento, fornecedor, entrada, previsão, status, ações.

**Ações:** `( Nova ordem )` · `( Concluir )` · `( Ver equipamento )`.

**Atalhos:** `Ctrl+N` nova ordem · `Ctrl+K` buscar equipamento · `F2` editar · `Enter` detalhes · `Esc` fechar.

**Estados de erro**

| Cenário | Onde | Mensagem / comportamento | Componente |
| --- | --- | --- | --- |
| CEP não encontrado | — | Não se aplica; manutenção não usa endereço. | — |
| Clima indisponível | — | Não se aplica nesta tela. | — |
| Sem conexão | toast | "Não foi possível carregar as ordens. Tente novamente." | `toast erro` |
| Lista vazia | tabela | "Nenhuma ordem de manutenção aberta." + `( Nova ordem )` | `estado vazio` |

**Wireframe**

```
┌────────────────────────────────────────────────────────────────────┐
│ Manutenção                                       ( Nova ordem )    │
│ [ Buscar equipamento... ] [ Status ▾ ]                            │
├────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ EQUIPAMENTO    FORNECEDOR   ENTRADA  PREVISÃO  STATUS          │ │
│ │ Barraca 4p     Oficina Serra 20/11   27/11    ◆em andamento   │ │
│ │ Bicicleta MTB  —             23/11   25/11    ◆aberta         │ │
│ │ ∅ Nenhuma ordem aberta → ( Nova ordem )                       │ │
│ └────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

---

### 3.7 Reservas

**Objetivo:** consultar disponibilidade por data, montar a reserva e confirmar **com a previsão
do tempo do dia** — o pedido explícito do cliente.

**Perfis:** ambos criam e consultam; administrador pode cancelar/editar qualquer reserva.

**Campos:** cliente (busca) · categoria (select) · início (date) · fim (date) · equipamentos disponíveis (lista selecionável) · status (badge). Na confirmação: card de clima (condição, temperatura mín./máx., ícone, data), diárias, total e observações.

**Ações:** `( Nova reserva )` · `( Ver disponibilidade )` · selecionar equipamento · `Ctrl+Enter` confirmar · `( Cancelar reserva )`.

**Atalhos:** `Ctrl+N` nova · `Ctrl+K` buscar cliente · `↑`/`↓` navegar lista · `Enter` selecionar · `Ctrl+Enter` confirmar · `Esc` fechar modal · `F5` recarregar disponibilidade.

**Estados de erro**

| Cenário | Onde | Mensagem / comportamento | Componente |
| --- | --- | --- | --- |
| CEP não encontrado | busca de cliente | "Cliente não encontrado. Cadastre um novo cliente." + atalho para `Clientes` | `toast alerta` + link |
| Clima indisponível | card no modal | "Previsão indisponível para esta data." + `( Tentar novamente )` e `( Confirmar sem previsão )` — **não bloqueia** a reserva | `card erro` + botões |
| Sem conexão | painel + toast | "Não foi possível consultar a disponibilidade. Tente novamente." | `erro` no painel + `toast erro` |
| Lista vazia | painel | "Nenhum equipamento disponível para 23/11." + "( Ver outra data )" | `estado vazio` |

**Wireframe — consulta**

```
┌──────────────────────────────────────────┬───────────────────────────┐
│ Nova reserva                             │ Resumo da reserva         │
│ Cliente [ ◆Ana Souza ................ ]  │ Cliente   ◆Ana Souza      │
│ Início  [ 2026-11-23 ] Fim [ 2026-11-25 ]│ Período   23→25/11 (2 d) │
│ Categoria [ Todas ▾ ]  ( Ver disponibilidade ) │                   │
├──────────────────────────────────────────┤ Itens                     │
│ Disponíveis em 23/11                     │  • Bicicleta MTB  R$ 180  │
│ ┌──────────────────────────────────────┐ │  • Barraca 4p    R$ 150  │
│ │ ☐ Bicicleta MTB   ◆bom    R$ 90/dia  │ │                           │
│ │ ☐ Barraca 4p      ◆novo   R$ 75/dia  │ │ Total     ◆ R$ 330      │
│ │ ☐ Caiaque 2p      ◆reservado  —      │ │                           │
│ │ ∅ Nenhum disponível → ( Ver outra data ) │ ( Confirmar ⌘↵ )      │
│ └──────────────────────────────────────┘ │                           │
└──────────────────────────────────────────┴───────────────────────────┘
```

**Wireframe — modal de confirmação**

```
        ┌──────────────────────────────────────────────┐
        │ Confirmar reserva                      (✕)   │
        ├──────────────────────────────────────────────┤
        │ Cliente: ◆Ana Souza                          │
        │ Período: 23/11 → 25/11                       │
        │                                              │
        │ ┌──────────────────────────────────────────┐ │
        │ │ Previsão do tempo · 23/11                │ │
        │ │ ◆ ☀  Parcialmente nublado               │ │
        │ │   Mín 14°C · Máx 26°C · vento 12 km/h   │ │
        │ │ ⚠ Previsão indisponível → ( Tentar novamente ) │
        │ └──────────────────────────────────────────┘ │
        │                                              │
        │ Diárias: ◆ R$ 330   Status: ◆pendente        │
        ├──────────────────────────────────────────────┤
        │        ( Cancelar )  ( Confirmar reserva )  │
        └──────────────────────────────────────────────┘
```

---

### 3.8 Devoluções

**Objetivo:** registrar a devolução e calcular automaticamente a **multa por atraso**, com
possibilidade de isenção pelo administrador.

**Perfis:** ambos registram; administrador pode isentar a multa.

**Campos:** reserva (busca) · data prevista (somente leitura) · data da devolução (date) · conservação na devolução (select) · dias de atraso (calculado) · valor da multa (calculado) · motivo de isenção (textarea, admin) · forma de cobrança (select).

**Ações:** `( Registrar devolução )` · `( Calcular multa )` · `( Isentar multa )` (admin) · `( Ver reserva )`.

**Atalhos:** `Ctrl+N` nova devolução · `Ctrl+K` buscar reserva · `Ctrl+Enter` calcular multa · `Enter` confirmar · `Esc` cancelar.

**Estados de erro**

| Cenário | Onde | Mensagem / comportamento | Componente |
| --- | --- | --- | --- |
| CEP não encontrado | — | Não se aplica; devolução usa a reserva já cadastrada. | — |
| Clima indisponível | — | Não se aplica nesta tela. | — |
| Sem conexão | toast | "Não foi possível calcular a multa. Verifique sua conexão e tente novamente." | `toast erro` + botão Tentar novamente |
| Lista vazia | tabela | "Nenhuma devolução pendente." + `( Voltar ao Dashboard )` | `estado vazio` |

**Wireframe**

```
┌───────────────────────────────────────┬──────────────────────────────┐
│ Devoluções pendentes                  │ Registrar devolução          │
│ ┌───────────────────────────────────┐ │ Reserva  ◆#1042 · Ana Souza  │
│ │ RESERVA  PREVISTA  EQUIP.   AÇÃO  │ │ Prevista  22/11              │
│ │ #1042   22/11     Bicicleta  abrir│ │ Devolvida [ 2026-11-23 ]     │
│ │ #1051   23/11     Barraca    abrir│ │ Conservação [ bom ▾ ]        │
│ │ ∅ Nenhuma devolução pendente      │ │                              │
│ │   → ( Voltar ao Dashboard )       │ │ Dias de atraso   ◆ 1          │
│ └───────────────────────────────────┘ │ Multa           ◆ R$ 25  ⚠   │
│                                       │ [ Motivo isenção (admin) ]   │
│                                       │ ( Calcular ) ( Isentar )     │
│                                       │      ( Registrar devolução ) │
└───────────────────────────────────────┴──────────────────────────────┘
```

---

### 3.9 Pagamentos

**Objetivo:** controlar o que foi recebido de reservas e multas, e o que ainda está pendente.

**Perfis:** administrador registra, baixa e estorna; atendente consulta status (somente leitura).

**Campos:** reserva · cliente · tipo (reserva / multa) · valor · forma (dinheiro / pix / cartão) · status (pendente / pago / estornado) · data do pagamento · comprovante (opcional). Filtros: status e período.

**Ações:** `( Registrar pagamento )` · `( Baixar )` · `( Estornar )` (admin) · `( Ver comprovante )`.

**Atalhos:** `Ctrl+N` novo · `Ctrl+K` buscar · `F5` atualizar · `Enter` abrir · `Esc` fechar.

**Estados de erro**

| Cenário | Onde | Mensagem / comportamento | Componente |
| --- | --- | --- | --- |
| CEP não encontrado | — | Não se aplica; pagamento não consulta endereço. | — |
| Clima indisponível | — | Não se aplica nesta tela. | — |
| Sem conexão | toast | "Não foi possível carregar os pagamentos. Tente novamente." | `toast erro` |
| Lista vazia | tabela | "Nenhum pagamento no período." + "( Limpar filtros )" | `estado vazio` |

**Wireframe**

```
┌────────────────────────────────────────────────────────────────────┐
│ Pagamentos                                ( Registrar pagamento )  │
│ [ Período: 01/11 → 30/11 ] [ Status ▾ ]                            │
├────────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                 │
│ │ Recebido     │ │ Pendente     │ │ Multas       │                 │
│ │ ◆ R$ 2.340   │ │ ◆ R$ 480  ⚠  │ │ ◆ R$ 75      │                 │
│ └──────────────┘ └──────────────┘ └──────────────┘                 │
├────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ RESERVA  CLIENTE   TIPO    VALOR   FORMA  STATUS    AÇÕES      │ │
│ │ #1042    ◆Ana      reserva R$ 330  Pix    ◆pago     ver        │ │
│ │ #1051    ◆Carlos   multa   R$ 25  —      ◆pendente ( Baixar )  │ │
│ │ ∅ Nenhum pagamento no período → ( Limpar filtros )            │ │
│ └────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

---

## 4. Fichas de implementação — telas que estavam sem conteúdo

Estas fichas substituem os `PaginaEmConstrucao` de `src/renderer/src/main.ts`. Os wireframes da
seção 3 continuam válidos; aqui está o que o `frontend-developer` precisa implementar. Todas as
classes vêm de `docs/design-system.md` §8 — nunca CSS novo, `<style>` ou `style=`.

### 4.1 Clientes

- **Perfis:** ambos cadastram e consultam; **administrador** também inativa.
- **Canais:** `clientes:listar`, `buscar-por-id`, `criar`, `atualizar`, `inativar`, `buscar-cep`.
- **Componentes:** `painel de formulário` + `tabela` + `campo` + `botão` + `badge` + `toast` +
  `estado vazio`/`erro`/`carregando`.
- **Ações:** `( Novo cliente )` · `( Buscar CEP )` ao completar 8 dígitos · `( Salvar )` ·
  `F2` editar · `Esc` cancelar · `Ctrl+K` foco na busca.
- **Estados:**
  - padrão: tabela com nome/telefone/cidade; linha selecionada com `bg-lima/20 text-floresta`.
  - vazio: “Nenhum cliente cadastrado.” + `( Novo cliente )`.
  - carregando: spinner no painel + 3 linhas `skeleton`; `aria-live="polite"`.
  - erro de CEP: campo com `aria-invalid` + `toast alerta` + `( Preencher manualmente )`;
    **não apagar** o que o atendente digitou.
  - UF: preenchimento manual ou por CEP é normalizado para maiúsculas; se inválida, campo com
    `aria-invalid` e mensagem "Informe a UF com 2 letras (ex.: SP).".
  - após salvar: filtro de busca limpo e registro gravado selecionado/destacado na tabela.
  - erro de banco: `toast erro` + `( Tentar novamente )`.
  - desabilitado: atendente não recebe o botão Inativar (oculto por perfil, não `disabled`).

### 4.2 Fornecedores

- **Perfil:** somente administrador; item oculto na sidebar do atendente.
- **Canais:** `fornecedores:listar`, `buscar-por-id`, `criar`, `atualizar`, `inativar`.
- **Componentes:** `painel de formulário` + `tabela` + `select` de tipo + `botão` + `badge` +
  `estado vazio`/`erro`/`carregando`.
- **Ações:** `( Novo fornecedor )` · `F2` editar · `( Ver equipamentos )` — abre Equipamentos
  filtrado por `fornecedorId` usando `equipamentos:listar`.
- **Estados:** vazio com `( Novo fornecedor )`; erro com `toast erro`; carregando com skeleton;
  selecionado com `bg-lima/20 text-floresta`; inativado com badge neutro `bg-pedra text-floresta`.

### 4.3 Equipamentos

- **Perfil:** somente administrador; item oculto na sidebar do atendente e rota direta mostra
  "Acesso restrito a administradores."
- **Canais:** `equipamentos:listar`, `buscar-por-id`, `criar`, `atualizar`, `inativar`,
  `categorias:listar`, `fornecedores:listar`.
- **Componentes:** `painel de formulário` + `tabela` + `select` de categoria/conservação/
  disponibilidade/fornecedor + `botão` + `badge` + `toast` + `estado vazio`/`erro`/`carregando`.
- **Ações:** `( Novo equipamento )` · `F2` editar · `( Inativar )` · `Ctrl+Enter` salvar ·
  `Esc` limpar filtros/cancelar.
- **Estados:** vazio com `( Novo equipamento )`; erro com `toast erro`; carregando com skeleton;
  selecionado com `bg-lima/20 text-floresta`; inativado com badge neutro `bg-pedra text-floresta`;
  disponibilidade com badge `sucesso`/`erro`/`alerta`; após salvar, filtros limpos e registro destacado.
- **Reservas:** itens com disponibilidade diferente de `Disponível` ficam fora de
  `equipamentos:listar-disponiveis`, mas permanecem visíveis para o administrador.
- **Fallback:** se o banco falhar, manter aviso `dados de exemplo` e desabilitar escrita.

### 4.4 Reservas — caminho crítico de balcão

- **Perfis:** ambos criam e consultam; **administrador** também cancela/edita.
- **Canais:** `reservas:*`, `itens-reserva:*`, `equipamentos:listar-disponiveis`,
  `categorias:listar`, `clientes:listar`. **Não existe** canal `clima.previsao`: o main consulta o
  clima e grava `previsaoTempo` quando a reserva é confirmada.
- **Componentes:** `painel de formulário` + `lista selecionável` + `modal` de confirmação +
  `card` de clima + `badge` + `toast` + `estado vazio`/`erro`/`carregando`.
- **Ações:** `( Nova reserva )` · `( Ver disponibilidade )` · selecionar equipamento ·
  `Ctrl+Enter` confirmar · `( Editar )` e `( Inativar )` (admin) · `( Cancelar reserva )` (admin).
- **Edição administrativa:** permite alterar cliente, período e itens; a consulta de disponibilidade
  usa `reservaId` para desconsiderar a própria reserva. Status continua sendo alterado pelas ações
  de confirmação/cancelamento.
- **Estados:**
  - disponibilidade vazia: “Nenhum equipamento disponível para esta data.” + `( Ver outra data )`.
  - disponibilidade em erro: `erro` dentro do painel + `toast erro`.
  - clima indisponível: **não bloqueia**; mostrar o texto de `previsaoTempo` devolvido pelo main
    com `( Tentar novamente )` e `( Confirmar sem previsão )`.
  - selecionado: opção da lista com `ring-1 ring-inset ring-floresta` e `text-floresta`.
  - reservado ou em manutenção: opção desabilitada com `opacity-60 cursor-not-allowed`.
  - carregando: lista com skeleton; nunca deixar o painel em branco.

### 4.5 Devoluções

- **Perfis:** ambos registram; **administrador** edita, inativa e ajusta a multa.
- **Canais:** `devolucoes:listar`, `buscar-por-id`, `criar`, `atualizar`, `inativar`,
  `reservas:buscar-por-id`, `pagamentos:criar`, `pagamentos:listar`.
- **Componentes:** `tabela` de pendentes + `painel de formulário` + `campo` de data + `select` de
  conservação + `badge` + `toast` + `estado vazio`/`erro`/`carregando`.
- **Ações:** `( Registrar devolução )` · `( Editar )` e `( Inativar )` (admin) ·
  `( Calcular multa )` · `( Ver reserva )`.
- **Edição administrativa:** altera data efetiva, estado pós-uso e observações. A criação continua
  sendo a única operação que recalcula multa e envia equipamentos para manutenção.
- **Estados:** o main devolve `valorMulta` e `valorTotal` calculados; o renderer apenas exibe.
  Atraso usa badge `bg-erro-suave text-erro`; no prazo usa `bg-sucesso-suave text-sucesso`.
  Vazio: “Nenhuma devolução pendente.” + `( Voltar ao Dashboard )`. Erro: `toast erro` com
  `( Tentar novamente )`.
- **Risco de contrato:** isenção de multa não existe como operação própria. Até o Arquiteto criar
  `devolucoes:isentar`, o administrador pode ajustar `valorMulta`/`valorTotal` do pagamento via
  `pagamentos:atualizar` **após** registrar a devolução.

### 4.6 Pagamentos

- **Perfis:** administrador registra/edita/baixa/estorna/inativa; atendente consulta status (somente leitura).
- **Canais:** `pagamentos:listar`, `buscar-por-id`, `criar`, `atualizar`, `inativar`.
- **Componentes:** `card` de KPI + `tabela` + `painel de formulário` + `select` de forma/status +
  `badge` + `toast` + `estado vazio`/`erro`/`carregando`.
- **Ações:** `( Registrar pagamento )` · `( Editar )` · `( Baixar )` · `( Estornar )` ·
  `( Inativar )` (admin) · `( Ver comprovante )`.
- **Estados:** pendente `bg-alerta-suave text-alerta`; pago `bg-sucesso-suave text-sucesso`;
  estornado `bg-erro-suave text-erro`. Vazio: “Nenhum pagamento no período.” + `( Limpar filtros )`.
  Erro ou carregamento seguem o padrão da seção 5.

### 4.7 Manutenção — bloqueada

- **Perfis:** administrador abre/conclui; atendente consulta status e vê o equipamento como
  indisponível na lista de Reservas.
- **Contrato necessário:** `manutencao:listar`, `buscar-por-id`, `criar`, `atualizar`, `concluir`
  e modelo `OrdemManutencao` (equipamento, fornecedor, problema, entrada, previsão, status).
- **Enquanto não existe:** manter `PaginaEmConstrucao('Manutenção', ...)`; **não** criar canal no
  renderer nem simular dados. O wireframe da §3.6 já está pronto para virar tela após o handoff.

---

## 5. Padrões de erro e carregamento

| Situação | Regra de ouro | Componente do Design System |
| --- | --- | --- |
| CEP não encontrado | nunca apagar o que o usuário já digitou; oferecer preenchimento manual | `campo` com `aria-invalid` + `toast alerta` |
| Clima indisponível | **não bloqueia** a reserva; oferece tentar de novo e confirmar sem previsão | `card` com `border-erro` + dois botões |
| Sem conexão | manter a última listagem visível e dizer que os dados podem estar desatualizados | `toast erro` + badge `alerta` |
| Lista vazia | dizer o motivo e oferecer a próxima ação (criar, limpar filtro, voltar) | `estado vazio` com ação |
| Carregando | sempre com `aria-live="polite"`; nunca tela em branco | `carregando` (spinner) ou `skeleton` |

Mensagens nunca expõem stack, SQL, CEP bruto inválido ou segredo. Elas dizem **o que
aconteceu** e **o que fazer**.

---

## 6. Riscos e handoff

- **Contrato:** 5 dos 6 placeholders já têm CRUD pronto (Clientes, Fornecedores, Reservas,
  Devoluções, Pagamentos). Manutenção permanece bloqueada; Login também segue sem `auth:*` e está
  fora desta entrega.
- **Modelo:** `Equipamento.estadoConservacao`, `Reserva.previsaoTempo`, `Pagamento.valorTotal`,
  `Devolucao.estadoPosUso` e os filtros de listagem já existem em `src/shared/contratos/modelos.ts`.
- **CEP e clima:** chamadas HTTP no **main**, com allowlist de domínios e erro tipado; o renderer
  recebe só dados já validados. CSP de produção sem `ws:`/`'unsafe-inline'`.
- **Handoff ao `frontend-developer`:** criar `PaginaClientes`, `PaginaFornecedores`,
  `PaginaReservas`, `PaginaDevolucoes` e `PaginaPagamentos` em `src/renderer/src/paginas/`;
  exportar em `index.ts`; trocar as entradas de `ROTAS` em `src/renderer/src/main.ts`; reutilizar
  os componentes de `src/renderer/src/componentes/` e as classes de `docs/design-system.md` §8.
- **Handoff ao Arquiteto/ED:** contrato de Manutenção e, se desejado, `devolucoes:isentar`.
  Instalação de `@fontsource-variable/*` também passa por eles (nenhuma fonte externa/CDN).
- **Validação de layout:** conferir em 800×600 (sidebar `w-16`, tabela com rolagem só no corpo) e
  1920×1080, nos dois perfis, com prioridade para o caminho de balcão.
- **Fora de escopo desta versão:** exportação de relatórios, impressão de comprovante e
  gestão de usuários (além do Login).
