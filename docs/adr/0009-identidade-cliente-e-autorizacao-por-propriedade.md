# ADR 0009 — Identidade Cliente, auto-cadastro público e autorização por propriedade

- **Status:** proposto
- **Data:** 2026-11-25
- **Decisores:** fundação (AS + ED), arquiteto-crud, frontend-developer

## Contexto

Hoje `PerfilUsuario` é `'Administrador' | 'Atendente'` (`src/shared/contratos/modelos.ts:355`) e
`Sessao` não carrega vínculo com cliente (`modelos.ts:369-374`). `auth:bootstrap` só cria o
primeiro administrador, com zero usuários (`docs/seguranca.md:89-93`), e `RegistroIpc` só conhece
os perfis `administrador`, `atendente` e `anonimo` (`src/main/ipc/RegistroIpc.ts:12,36-38`).
O usuário pediu que, **antes do cadastro**, exista a escolha entre Administrador e Cliente: o
administrador segue o fluxo atual **sem mudança de comportamento**; o cliente faz auto-cadastro
e entra numa área própria para reservar, consultar as suas reservas, ver disponibilidade e
previsão do tempo. O cliente aluga; o administrador cadastra equipamentos e administra tudo.

Risco identificado: se um cliente pudesse se cadastrar antes do bootstrap, o app ficaria para
sempre sem administrador, porque `auth:bootstrap` exige zero usuários.

## Decisão

**Manter uma única tabela `usuario` e um único fluxo de senha; acrescentar o perfil `Cliente`
como terceiro valor, ligar `usuario` a `cliente` e derivar `clienteId` da sessão no main. O
auto-cadastro é um canal público aditivo que só aceita o perfil `Cliente`, e toda leitura ou
escrita de dados do cliente é filtrada por propriedade no serviço e no repositório — nunca no
renderer.**

### 1. Identidade

- `PerfilUsuario = 'Administrador' | 'Atendente' | 'Cliente'` (`modelos.ts:355`).
- `Sessao` ganha `readonly clienteId: number | null` (`modelos.ts:369-374`): `null` para
  Administrador/Atendente; id da linha em `cliente` para Cliente. `EstadoSessao`,
  `UsuarioPublico` e a política de hash (`src/main/servicos/SenhaHash.ts:24`) não mudam.
- Migração **007 aditiva e idempotente**: `cliente.id_usuario INT NULL UNIQUE` +
  `FOREIGN KEY REFERENCES usuario(id_usuario)`. Nenhuma coluna em `usuario`, nenhuma tabela
  paralela de credenciais.

### 2. Auto-cadastro público

- Novo canal `authCadastrarCliente: 'auth:cadastrar-cliente'`, `PERFIS.anonimo`
  (`src/shared/contratos/canais.ts:66-70`, `RegistroIpc.ts:18-24`). Payload =
  `nome, cpf, login, senha` + campos opcionais de endereço de `ClienteCriarEntrada`
  (`modelos.ts:191-203`), com **nenhum campo `perfil`**: schema `z.object({...}).strict()`
  (`src/shared/contratos/esquemas.ts:321-324`). Retorno = `Sessao` já autenticada.
- O serviço fixa `perfil: 'Cliente'` por literal e valida novamente
  (`PERFIL_INVALIDO` se vier `perfil` de qualquer outra camada). O schema de admin
  `esquemaUsuarioCriar` (`esquemas.ts:337`) passa a usar `z.enum(['Administrador','Atendente'])`:
  admin não cria Cliente; público não cria admin. Dupla validação, schema **e** serviço (R4/R5).
- **Pré-condição obrigatória:** existe ao menos 1 administrador ativo. Sem isso,
  `BOOTSTRAP_PENDENTE`. `auth:bootstrap` continua exigindo zero usuários
  (`docs/seguranca.md:89-93`) — comportamento administrativo inalterado. Na tela de escolha,
  "Cliente" aparece desabilitada com essa explicação até o bootstrap terminar.

### 3. Autorização

- `PerfilAcesso` ganha `'cliente'` (`RegistroIpc.ts:12`); `perfilDeAcesso` passa a mapear os
  três valores (`RegistroIpc.ts:36-38`). `PERFIS.publico` inclui `cliente`; `ambos` continua
  **somente staff**; novo conjunto `PERFIS.cliente`. Nenhum canal existente muda de conjunto
  por acidente.
- V1 do cliente: `auth:*`, `equipamentos:listar`, `equipamentos:listar-disponiveis`,
  `integracoes:previsao-tempo`, `clientes:buscar-por-id`/`atualizar` (próprio),
  `reservas:listar`/`buscar-por-id`/`criar`/`atualizar` (próprias),
  `itens-reserva:listar` (das próprias reservas).
- O main injeta `sessao` no handler; handler valida e delega `contexto = { clienteId, perfil }`.
  Para perfil Cliente o serviço **sobrescreve** qualquer `clienteId` recebido do renderer;
  `ReservaRepositorio` (`src/main/repositorios/ReservaRepositorio.ts:17-23`) e
  `ClienteRepositorio` (`src/main/repositorios/ClienteRepositorio.ts:14-18`) acrescentam
  `WHERE ... id_cliente = ?` parametrizado (R6). Fora de escopo devolve `NAO_ENCONTRADO`
  uniforme — nunca `SEM_PERMISSAO`, que confirmaria a existência do registro.

### 4. Erros e enumeração

- Novos códigos em `CodigoErroDominio` (`modelos.ts:641-657`): `PERFIL_INVALIDO`,
  `CPF_DUPLICADO`, `BOOTSTRAP_PENDENTE`. `CPF_DUPLICADO` responde apenas "CPF já cadastrado"
  — sem nome, login, id ou data do titular.
- `auth:entrar` mantém `CREDENCIAIS_INVALIDAS` fixo (`src/main/servicos/AutenticacaoServico.ts:18`).
  `auth:cadastrar-cliente` tem limite de tentativas por CPF normalizado, espelhando
  `LIMIAR_TENTATIVAS`/`DURACAO_BLOQUEIO_MS` (`AutenticacaoServico.ts:12-13`), para não virar
  oráculo de CPF. Colisão de login no canal público usa o mesmo texto genérico de cadastro
  indisponível; `LOGIN_DUPLICADO` permanece apenas no canal administrativo.

### 5. Renderer (navegação)

- Novas rotas públicas `#/escolha-conta` e `#/cadastro-cliente` em `ROTAS_PUBLICAS`
  (`src/renderer/src/nucleo/ControleAcesso.ts:10-19`); `#/_area-cliente` como raiz do cliente.
  `Perfil` (`src/renderer/src/nucleo/Perfil.ts:9-24`) passa a derivar `cliente` da sessão;
  `Sidebar.ts` mostra só Disponibilidade / Minhas reservas / Nova reserva. O guard do renderer
  é apenas navegação — a autorização real continua no main (`ControleAcesso.ts:3-8`).

## Alternativas descartadas

- **Tabela `conta_cliente` com login/senha próprios** — duplicaria política de senha, bloqueio
  e sessão; dois lugares para corrigir segurança.
- **Liberar cadastro de cliente antes do bootstrap relaxando "zero usuários"** — mudaria o
  comportamento atual do administrador e deixaria o app sem admin permanentemente.
- **Filtrar por `clienteId` no renderer** — R3/R6: o renderer não é fronteira de confiança.
- **Perfil `Cliente` aceito em `usuarios:criar`** — abriria auto-elevação via canal admin e
  confundiria as duas origens de conta.

## Consequências

- **Obrigatório na primeira versão segura:** itens 1–4 acima, handoff ao ED para
  `RegistroIpc`/preload/CSP e testes de canal público, de escalate de perfil e de isolamento
  entre dois clientes.
- **Pode ficar para depois:** `clientes:atualizar` pelo cliente, pagamentos/devoluções do
  cliente, reenvio de senha, exclusão de conta, auditoria de acesso.
- **`src/shared/ipc.ts` não existe mais** (já migrado para `canais.ts`); o HTML raiz também
  não existe — a fonte é `src/renderer/index.html:1-13`. Nenhum `const enum` a migrar.
- Revisitar quando houver login esquecido ou múltiplos clientes por pessoa física.
