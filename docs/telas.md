# Mapa de telas e wireframes — Zênite · Aluguel Outdoor

- **Status:** aceito
- **Versão:** 1.0
- **Data:** 2026-11-23
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

> **Sem conexão** neste documento significa falha de rede dos serviços externos (CEP e clima).
> O banco SQLite é local: a consulta aos dados da loja continua funcionando offline.

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
│   ◆ Equipamentos ....................... catálogo + conservação     │
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
| **Atendente de balcão** | Dashboard, Equipamentos (consulta), Clientes, Reservas, Devoluções | resolver a locação em 1–2 interações |
| **Administrador** | todas as telas + Fornecedores, Manutenção, Pagamentos, cadastros | gerir frota, terceiros e finanças |

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

Situação real em `src/shared/contratos/canais.ts` e `api.ts`: existem `appInfo`, `abrirExterno`,
`ping`, `categorias:listar`, `clientes:listar`, `equipamentos:listar`, `reservas:listar` e
`stripe:criar-checkout` (checkout hospedado da Stripe). Legenda: ✅ pronto · ⚠️ parcial · ❌ ausente.

| Tela | Situação hoje | Depende de novo canal / modelo | Responsável |
| --- | --- | --- | --- |
| Login | ❌ nenhum | `auth.login`, `auth.logout`, `auth.sessao` | Arquiteto → ED |
| Dashboard | ⚠️ usa `reservas.listar` + `clientes.listar` + `equipamentos.listar` | `reservas.listarPorPeriodo`, `devolucoes.listarPendentes` | Arquiteto → ED |
| Equipamentos | ⚠️ `equipamentos.listar` existe, mas `Equipamento` não tem `estadoConservacao` | ampliar modelo + `equipamentos.salvar`, `equipamentos.listarPorCategoria` | Arquiteto → ED |
| Clientes | ⚠️ `clientes.listar` existe | `clientes.buscarCep`, `clientes.salvar` (CEP via main com allowlist) | Arquiteto → ED |
| Fornecedores | ❌ nenhum | `fornecedores.listar`, `fornecedores.salvar` | Arquiteto → ED |
| Manutenção | ❌ nenhum | `manutencao.listar`, `manutencao.abrir`, `manutencao.concluir` | Arquiteto → ED |
| Reservas | ⚠️ `reservas.listar` existe | `reservas.disponibilidadePorData`, `reservas.criar`, `clima.previsao` (HTTP no main com allowlist) | Arquiteto → ED |
| Devoluções | ❌ nenhum | `devolucoes.listarPendentes`, `devolucoes.registrar`, `multas.calcular` | Arquiteto → ED |
| Pagamentos | ⚠️ `stripe.criarCheckout` pronto; consulta/baixa ausentes | `pagamentos.listar`, `pagamentos.registrar` | Integrador API + UI/UX → Arquiteto → ED |

`categorias.listar` já existe e alimenta o filtro de categorias em Equipamentos e Reservas.

> Nenhuma string literal de canal deve aparecer no renderer. Os nomes acima são **pedidos de
> contrato**; quem define o nome final e o schema é o Arquiteto, quem expõe no preload é o ED.
> CEP e clima são chamadas HTTP feitas **no main**, com allowlist de domínios — nunca no
> renderer (CSP bloqueia `connect-src` externo).

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

**Perfis:** ambos consultam; administrador cadastra, edita e envia para manutenção.

**Campos:** busca textual · categoria (select via `categorias.listar`) · disponibilidade (select) · conservação (select: novo / bom / desgastado / manutenção). Colunas da tabela: nome, categoria, diária, conservação (badge), disponível (badge), ações.

**Ações:** `( Novo equipamento )` · `F2` editar · `( Enviar para manutenção )` · abrir detalhes.

**Atalhos:** `Ctrl+N` novo · `Ctrl+K` foco na busca · `F2` editar selecionado · `Enter` detalhes · `Esc` limpar filtros.

**Estados de erro**

| Cenário | Onde | Mensagem / comportamento | Componente |
| --- | --- | --- | --- |
| CEP não encontrado | — | Não se aplica; endereço não é campo deste cadastro. | — |
| Clima indisponível | — | Não se aplica nesta tela. | — |
| Sem conexão | toast + tabela | "Não foi possível carregar os equipamentos. Tente novamente." | `toast erro` + botão Tentar novamente |
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

> ⚠️ Contrato: `Equipamento` hoje expõe apenas `disponivel: boolean`. O campo
> `estadoConservacao` precisa entrar no modelo e no schema antes deste wireframe virar tela.

---

### 3.4 Clientes

**Objetivo:** cadastrar cliente com endereço rápido por CEP, mantendo a busca utilizável em balcão.

**Perfis:** ambos cadastram e consultam; administrador pode editar/excluir.

**Campos:** nome · CEP · logradouro · número · complemento · bairro · cidade · UF · email · telefone. Tabela: nome, telefone, cidade, ações.

**Ações:** `( Novo cliente )` · `( Buscar CEP )` ao digitar 8 dígitos · `( Salvar )` · `F2` editar · `Esc` cancelar.

**Atalhos:** `Ctrl+N` novo · `Ctrl+Enter` buscar CEP · `Enter` salvar · `Esc` cancelar · `F2` editar · `Ctrl+K` busca na tabela.

**Estados de erro**

| Cenário | Onde | Mensagem / comportamento | Componente |
| --- | --- | --- | --- |
| CEP não encontrado | abaixo do CEP | "CEP não encontrado. Preencha o endereço manualmente." + `( Preencher manualmente )` | `campo erro` + `toast alerta` |
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

> **Checkout:** o botão de pagar chama `stripe.criarCheckout` no main e abre a URL devolvida com
> `abrirExterno` (allowlist de `checkout.stripe.com`). A tabela/cards seguem ilustrativos até
> existir `pagamentos.listar`; a baixa no SQLite depende de `pagamentos.registrar`/webhook.

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

## 4. Padrões de erro e carregamento

| Situação | Regra de ouro | Componente do Design System |
| --- | --- | --- |
| CEP não encontrado | nunca apagar o que o usuário já digitou; oferecer preenchimento manual | `campo` com `aria-invalid` + `toast alerta` |
| Clima indisponível | **não bloqueia** a reserva; oferece tentar de novo e confirmar sem previsão | `card` com `border-erro` + dois botões |
| Sem conexão | dados locais continuam; dizer que a informação externa pode estar desatualizada | `toast erro` + badge `alerta` |
| Lista vazia | dizer o motivo e oferecer a próxima ação (criar, limpar filtro, voltar) | `estado vazio` com ação |
| Carregando | sempre com `aria-live="polite"`; nunca tela em branco | `carregando` (spinner) ou `skeleton` |

Mensagens nunca expõem stack, SQL, CEP bruto inválido ou segredo. Elas dizem **o que
aconteceu** e **o que fazer**.

---

## 5. Riscos e handoff

- **Contrato:** 6 das 9 telas dependem de canais que não existem. O `frontend-developer` deve
  registrar suposições em `docs/frontend-assumptions.md` e pedir ao Arquiteto — nunca criar
  strings de canal no renderer.
- **Modelo:** `Equipamento` precisa de `estadoConservacao`; `Reserva` precisa de vínculo com
  devolução/multa/pagamento para que os wireframes façam sentido.
- **CEP e clima:** chamadas HTTP no **main**, com allowlist de domínios e erro tipado; o
  renderer recebe só dados já validados. CSP de produção sem `ws:`/`'unsafe-inline'`.
- **Fora de escopo desta versão:** exportação de relatórios, impressão de comprovante e
  gestão de usuários (além do Login) — dependem de decisão do Arquiteto.
