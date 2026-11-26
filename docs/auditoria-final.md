# Auditoria final — Zênite · Aluguel Outdoor

- **Data:** 26/11/2026
- **HEAD auditado:** `b969882` (`feat: integra dados reais e finaliza fluxos de reserva, devolucao e pagamentos`)
- **Árvore no início:** `git status --short` → saída vazia
- **Escopo:** somente leitura. Nenhum código/arquivo existente foi alterado; nenhum `git add`, `commit` ou `push`. O único arquivo criado é este.
- **Regra de evidência:** `arquivo:linha` ou `comando → saída resumida`. Onde não foi possível executar/observar, o item está marcado **NÃO VERIFICADO**.

---

## 0. Saúde do projeto (Parte 1)

### 0.1 Comandos executados nesta auditoria

| Comando | Resultado | Evidência (saída resumida) |
| --- | --- | --- |
| `npm run typecheck` | ✅ OK | `tsc7 -p tsconfig.renderer.json --noEmit`, exit 0 |
| `npm run lint` | ✅ OK | `eslint .`, exit 0, sem saída |
| `npm test` | ✅ OK | `vitest run` — **42 arquivos, 242 testes passaram**, 4,14 s |
| `npm run build` | ✅ OK | `tsc7 -p tsconfig.main.json` + `esbuild src/preload/index.ts` (10,6 kb) + `vite build` (80 módulos). Artefatos: `dist/renderer/assets/index-CaOoRfP1.css` (30.265 bytes, com `@font-face` Inter/Fraunces e classes utilitárias em `:2`) e `index-D1FCXRMI.js` |
| Conexão MySQL | ✅ OK | `SELECT COUNT(*) FROM information_schema.tables WHERE TABLE_SCHEMA=DATABASE()` → `DB_OK tabelas=11` |
| Estado do Git | ✅ limpo | `git status --short` → vazio; `git log -4 --oneline` → `b969882`, `ae6662f`, `05a2fc4`, `770cedd` |

**Causa de falha:** nenhuma. Não há falha de código nem de ambiente nas quatro validações.

### 0.2 Testes existentes e cobertura

`Get-ChildItem -Recurse -File -Filter *.test.ts src` → **42 arquivos**; `it(` → **242 casos**.

| Camada | Arquivos | Casos | Cobre |
| --- | --- | --- | --- |
| Banco + migrações | 8 | 30 | `Migrador`, configuração e migrações 003–008 |
| IPC | 4 | 24 | `RegistroIpc` (13 casos), handlers (11) |
| Repositórios | 4 | 25 | Categoria, Devolução, Equipamento, mapeamento |
| Segurança | 3 | 7 | CSP, escopo por cliente, URLs externas |
| Serviços (main) | 16 | 112 | Autenticação (23), Devolução (11), Equipamento (11), Clima (9), Reserva (8), etc. |
| Renderer | 7 | 44 | Utilitários, `FormatadorPtBr` (17), `ControleAcesso`, `VigilanciaSessao`, erros |

**O que NÃO tem teste (ausência de arquivo):**
- Serviços: `ClienteServico`, `FornecedorServico`, `ItemReservaServico`.
- Repositórios: `ClienteRepositorio`, `FornecedorRepositorio`, `ReservaRepositorio`, `ItemReservaRepositorio`, `PagamentoRepositorio`, `UsuarioRepositorio`, `ManutencaoRepositorio`, `CadastroClienteRepositorio`.
- Migrações 001 e 002 isoladamente.
- Nenhum teste de página/fachada do renderer (somente utilitários e núcleo).
- Integrações são testadas com HTTP **mockado** (`CepServico.test.ts:34`, `ClimaServico.test.ts:49`, `CnpjServico.test.ts:52`, `FeriadosServico.test.ts:33`) — não contra os hosts reais.

### 0.3 Varreduras de higiene

| Busca | Resultado |
| --- | --- |
| `.js`/`.mjs`/`.cjs` em `src/` | **Nenhum** (`Get-ChildItem -Recurse src \| ? Extension -in ...` → vazio). `scripts/seed.mjs` está fora de `src/` |
| `any`, `as any`, `@ts-ignore`, `@ts-expect-error`, `eslint-disable`, `TODO`, `FIXME` em `src/**/*.ts` | 7 ocorrências, **todas benignas**: 4 comentários (`ItemReservaRepositorio.ts:43`, `ErrosRenderer.ts:5`, `ErrosAutenticacao.ts:8`, `VigilanciaSessao.ts:5`) e 3 `expect.any(...)` em testes (`DevolucaoServico.test.ts:178`, `PagamentoServico.test.ts:88`, `ManutencaoServico.test.ts:139`). Nenhuma anotação de tipo `any` |
| Funções soltas de regra de negócio fora de classes | Existem **helpers privados de módulo dentro dos arquivos de serviço**: `DevolucaoServico.ts:24,30,37` (`dia`, `diasEntre`, `valorDaDiaria`), `PagamentoServico.ts:20,27,31,37` (`formaPagamentoValida`, `vazio`, `validarValor`, `diasReserva`), `EquipamentoServico.ts:18` (`validarValorDiaria`), `CnpjServico.ts:25` (`cnpjValido`). Não há regra de negócio em handlers (`handlers/categorias.ts:11-39` é o molde: valida e delega) nem nas telas |

### 0.4 Evidência runtime do banco (MySQL acessível)

| Consulta | Saída resumida |
| --- | --- |
| `information_schema.tables` | `categorias, cliente, devolucao, equipamento, fornecedor, item_reserva, migracoes, ordem_manutencao, pagamento, reserva, usuario` (11) |
| `information_schema.KEY_COLUMN_USAGE` | 9 FKs reais (ver §2.1) |
| `COUNT(*)` por tabela | `categorias=4 cliente=8 equipamento=24 fornecedor=4 item_reserva=13 ordem_manutencao=1 pagamento=9 reserva=6 usuario=5 devolucao=2` |
| `SELECT id, aplicada_em FROM migracoes ORDER BY id` | IDs 1–8 aplicados; 1–4 em 25/11 19:05, 5 às 20:00, 6 às 20:28, 7 às 21:19, 8 às 22:48 |
| `SHOW CREATE TABLE categorias` | `PRIMARY KEY (id)`, `UNIQUE KEY nome (nome)`, `atualizado_em timestamp ... ON UPDATE CURRENT_TIMESTAMP` |
| `SHOW COLUMNS FROM equipamento` | `id_equipamento,nome,categoria,estado_conservacao,id_fornecedor,ativo,atualizado_em,disponibilidade,valor_diaria` |

---

## 1. Resumo executivo

**Nota de prontidão: 8/10.**

Justificativa: as quatro validações automáticas passam, o banco relacional está realmente conectado e povoado (11 tabelas, 9 FKs, migrações 1–8 aplicadas), a autorização é feita no main em 67/67 canais de entrada, não há dado falso no renderer e as quatro integrações estão ligadas em telas reais. Não há `.js` de lógica em `src/`, nem credencial real no histórico do Git. Os descontos vêm de lacunas de **documentação e acabamento**, não de arquitetura: ADRs marcados como "propostos" apesar de implementados, README/`ux-fluxos.md`/`seguranca.md` desatualizados, ausência de ADR de MCP/RAG, duas superfícies de CRUD de UI incompletas e uma divergência na regra de multa que precisa de decisão do cliente. A interface não foi vista em execução — itens de UX/layout ficam como **NÃO VERIFICADO VISUALMENTE**.

### 5 maiores riscos

1. **Regra de multa divergente do pedido escrito** — `docs/requisitos-cliente.md:5-6` diz "sem tolerância"; `DevolucaoServico.ts:187-204` isenta domingos e feriados. Precisa de decisão formal antes da apresentação (ALTO).
2. **Migração 001 foi editada após a criação** (`ca05aa1`, `0bc781a`) — bancos que aplicaram a versão antiga não recebem a correção automaticamente (`Migrador.ts:39-41`). Neste banco o risco está mitigado (aplicada às 19:05, última edição às 15:22), mas outras máquinas não foram verificadas (ALTO).
3. **CRUD de UI incompleto em duas entidades** — itens de reserva só são listados na tela; `ServicoUsuarios` não expõe `buscarPorId`/`inativar`. Os canais existem e funcionam no main, mas o professor pode entender "CRUD completo de todas as entidades" como exigência de tela (ALTO).
4. **Documentação contradiz o código** — ADRs 0007/0008/0009 ainda "propostos", `docs/ux-fluxos.md:24-35` afirma que handlers não existem, `docs/seguranca.md:173-181` dá Login/Primeira execução como pendentes, `README.md:31,57` cita `style.css` e CSP no HTML (MÉDIO).
5. **ADR de MCP/RAG inexistente e seed com credencial/dados inválidos** — `git grep -i -E '\bMCP\b|\bRAG\b'` → nenhuma ocorrência; `scripts/seed.mjs:351-352` embute `Demo@2026`; CNPJs/CPFs do seed falham nos dígitos verificadores (MÉDIO).

---

## 2. Tabela dos 6 requisitos técnicos

| # | Requisito | Status | Evidência | O que falta |
| --- | --- | --- | --- | --- |
| 1 | Banco relacional ≥ 6 tabelas relacionadas | **ATENDE** | Runtime: 11 tabelas, 9 FKs (`information_schema`); `001`–`008` em `src/main/banco/migracoes/index.ts:11-20`; `Migrador.ts:19-23,39-49` ordena e aplica só pendentes; detalhes em §2.1 | Confirmar em cada máquina que a migração 001 aplicada corresponde à versão final; ver problema P2 |
| 2 | CRUD completo de todas as entidades | **PARCIAL** | 68 canais declarados, 67 registrados (o 68º é push-only `app:ping`); 67/67 com schema Zod e perfil; tabela completa em §3 | UI não expõe criar/editar/excluir de itens de reserva nem `inativar`/`buscarPorId` de usuários; ver P1 |
| 3 | Consumo de API em ≥ 4 situações distintas com propósito real | **ATENDE** (com ressalvas) | CEP, CNPJ, clima e feriados — detalhes em §4; runtime: ViaCEP 200, Open-Meteo 200, BrasilAPI feriados 200, BrasilAPI CNPJ **403** neste ambiente | Confirmar o 403 do CNPJ em outra rede; decidir a divergência de multa; ver P6/P11 |
| 4 | Segurança com justificativa escrita | **ATENDE** (com ressalvas) | scrypt+salt, 67/67 canais com perfil no main, SQL parametrizado, sandbox/CSP/allowlist; checklist completo em §5 | Schemas ficam em `shared/` (desvio literal da regra), senha demo literal no seed, documentação desatualizada; ver P3/P4/P5/P9 |
| 5 | Código modularizado em classes (POO) | **ATENDE** (com ressalva) | 19 classes de serviço no main (`CategoriaServico.ts:26`, `DevolucaoServico.ts:42`, ...), 11 repositórios (`CategoriaRepositorio.ts:30`, ...), 54 classes no renderer (`PaginaReservas.ts:290`, `Modal.ts:31`, ...), handlers finos (`handlers/categorias.ts:11-39`) | Helpers privados com regra dentro de arquivos de serviço (`DevolucaoServico.ts:30-37`, `PagamentoServico.ts:37`); ver P7 |
| 6 | Electron + TypeScript, sem `.js` de lógica | **ATENDE** | `src/{main,preload,renderer,shared}`; `tsconfig.base.json:5` (`strict`), `tsconfig.main.json:3-9` (CJS→`dist/`), `tsconfig.renderer.json:3-15` (`noEmit`); `package.json:15-18` gera tudo de `.ts`; nenhum `.js` em `src/` | Assimetria documental: `tsconfig.main.json:9` não inclui `src/preload/**` (esbuild compila à parte; tipado pelo renderer) — não é quebra |

### 2.1 Banco — tabelas, PKs e FKs

**PKs (código):**

| Tabela | PK | Evidência |
| --- | --- | --- |
| `categorias` | `id` | `src/main/banco/migracoes/001-categorias.ts:15-17` |
| `fornecedor` | `id_fornecedor` | `002-locacao.ts:15-16` |
| `cliente` | `id_cliente` | `002-locacao.ts:30-31` |
| `equipamento` | `id_equipamento` | `002-locacao.ts:51-52` |
| `reserva` | `id_reserva` | `002-locacao.ts:69-70` |
| `item_reserva` | `(id_reserva, id_equipamento)` | `002-locacao.ts:89-93` |
| `pagamento` | `id_pagamento` | `002-locacao.ts:105-106` |
| `devolucao` | `id_devolucao` | `002-locacao.ts:125-126` |
| `usuario` | `id_usuario` | `006-autenticacao-e-auditoria-categorias.ts:41-42` |
| `ordem_manutencao` | `id_ordem` | `008-ordem-manutencao.ts:60-61` |
| `migracoes` | `id` | `src/main/banco/Migrador.ts:28-29` |

**FKs reais (confirmadas em `information_schema` neste banco):**

| `tabela.coluna → tabela.coluna` | ON DELETE / ON UPDATE | Evidência |
| --- | --- | --- |
| `equipamento.id_fornecedor → fornecedor.id_fornecedor` | `SET NULL` / `CASCADE` | `002-locacao.ts:63-64` |
| `reserva.id_cliente → cliente.id_cliente` | `RESTRICT` / `CASCADE` | `002-locacao.ts:83-84` |
| `item_reserva.id_reserva → reserva.id_reserva` | `CASCADE` / `CASCADE` | `002-locacao.ts:96-97` |
| `item_reserva.id_equipamento → equipamento.id_equipamento` | `RESTRICT` / `CASCADE` | `002-locacao.ts:99-100` |
| `pagamento.id_reserva → reserva.id_reserva` | `CASCADE` / `CASCADE` | `002-locacao.ts:119-120` |
| `devolucao.id_reserva → reserva.id_reserva` | `CASCADE` / `CASCADE` | `002-locacao.ts:134-135` |
| `cliente.id_usuario → usuario.id_usuario` | `SET NULL` / `CASCADE` | `007-vinculo-usuario-cliente.ts:48-51,69-72` |
| `ordem_manutencao.id_equipamento → equipamento.id_equipamento` | `RESTRICT` / `CASCADE` | `008-ordem-manutencao.ts:77-78` |
| `ordem_manutencao.id_fornecedor → fornecedor.id_fornecedor` | `SET NULL` / `CASCADE` | `008-ordem-manutencao.ts:80-81` |

**Tabelas sem FK própria:** `fornecedor` e `usuario` são tabelas-pai; `categorias` e `migracoes` não participam de nenhuma FK (são tabelas de domínio/controle, não "solta" no sentido de órfã — `categorias` é referenciada pelo campo textual `equipamento.categoria`, evidência em `002-locacao.ts:56-57`; **NÃO VERIFICADO** se o professor aceitará esse modelo sem FK).

**Idempotência:** `001` usa `CREATE TABLE IF NOT EXISTS` + `INSERT IGNORE` com `UNIQUE(nome)` (`001:15-24`); `002` usa `CREATE TABLE IF NOT EXISTS` em todas (`002:15,30,51,69,89,105,125`); `003`–`008` consultam `information_schema` antes de `ALTER`/`ADD CONSTRAINT` (`003:46-70`, `004:26-42`, `005:25-41`, `006:55-75`, `007:33-72`, `008:47-106`). Ordem explícita 1→8 em `index.ts:11-20`. **Risco:** `001` foi modificada em `ca05aa1` e `0bc781a` depois de criada em `994984a`; neste banco a última edição foi às 15:22 e a aplicação às 19:05 do mesmo dia, então o schema aplicado é o final (P2).

### 2.2 Controles comuns às quatro integrações

| Controle | Evidência | Resultado |
| --- | --- | --- |
| Hosts fixos + allowlist HTTPS | `src/main/servicos/integracoes/ClienteHttp.ts:5-18,84-87` | OK |
| Timeout 6 s por tentativa | `ClienteHttp.ts:12,53` | OK |
| 1 original + no máximo 1 retry (só rede/timeout/`429`/`5xx`; `SEM_DADOS` não repete) | `ClienteHttp.ts:14,55-58,75-81` | OK |
| Validação Zod da resposta antes do uso | `ClienteHttp.ts:63-71`; `esquemasExternos.ts:13-74` | OK |
| Cache em memória por URL com TTL | `ClienteHttp.ts:33,40-47,73`; `docs/integracoes.md:17` | OK |
| Nenhuma chave no renderer | `renderer/servicos/ServicoIntegracoes.ts:10-24`; `docs/integracoes.md:83` | OK |
| Nenhum dado do cliente em log | `grep console./logger./log( em src/main` → 4 ocorrências: `main/index.ts:70,156,170`, `RegistroIpc.ts:92-96` (só caminhos de campo) | OK |
| URL montada com segurança | constantes de host + `encodeURIComponent` em `CepServico.ts:27`, `CnpjServico.ts:50`, `ClimaServico.ts:136-142,218-220`, `FeriadosServico.ts:16-20`; allowlist antes do `fetch` em `ClienteHttp.ts:41,84-87` | OK |
| Retorno tipado “indisponível” | `modelos.ts:531-537` (clima), `:555-561` (CNPJ), `:573-579` (feriados) | **FALTA no CEP**: falha vira `ErroDeDominio('CEP_INVALIDO')` (`CepServico.ts:38-40`), sem estado `indisponivel` — ver P15 |

**Reachability medida nesta auditoria (fetch direto, 26/11/2026):** ViaCEP `status=200 len=284` (CEP `01001-000`); Open-Meteo forecast com `start_date`/`end_date` `status=200 len=305`; BrasilAPI feriados 2026 `status=200 len=1247`; BrasilAPI CNPJ `status=403 Forbidden` (P11). Isso prova que os hosts e formatos de URL respondem, **não** que a interface do app os consumiu (P11/§9).

---

## 3. Tabela de CRUD por entidade

Legenda: **OK** = implementação localizada com evidência; **FALTA** = lacuna verificável; `—` = não se aplica. "Tela com 4 fluxos" considera criar/ler/editar/excluir.

| Entidade | Listar / Buscar | Criar / Atualizar / Excluir | Schema Zod | Serviço (main) | Repositório | Handler registrado | Preload | Serviço renderer | Tela (4 fluxos) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Categorias | OK `canais.ts:13,83-84` / `handlers/categorias.ts:13-24` | OK `:25-39` | OK `esquemas.ts` (4 schemas) | OK `CategoriaServico.ts:26` | OK `CategoriaRepositorio.ts:30` | OK `categorias.ts:12-40` | OK `preload/index.ts:36-42` | OK `ServicoCategorias.ts:10` | OK `PaginaCategorias.ts:68,133,406,413,449` |
| Fornecedores | OK `canais.ts:16-17` / `handlers/fornecedores.ts:16-24` | OK `:25-42` | OK | OK `FornecedorServico.ts:14` | OK `FornecedorRepositorio.ts:43` | OK | OK `preload/index.ts:44-50` | OK `ServicoFornecedores.ts:9` | OK `PaginaFornecedores.ts:124,202,775,778,809` |
| Clientes | OK `canais.ts:23-25` / `handlers/clientes.ts:19-30,43-48` | OK `:31-42,49-51` | OK | OK `ClienteServico.ts:22` | OK `ClienteRepositorio.ts:39` | OK | OK `preload/index.ts:52-59` | OK `ServicoClientes.ts:10` | OK `PaginaClientes.ts:141,208,813,816,851` |
| Equipamentos | OK `canais.ts:31-34` / `handlers/equipamentos.ts:17-34` | OK `:35-49` | OK | OK `EquipamentoServico.ts:37`, `DisponibilidadeServico.ts:10` | OK `EquipamentoRepositorio.ts:49` | OK | OK `preload/index.ts:61-69` | OK `renderer/EquipamentoServico.ts:15` | OK `PaginaEquipamentos.ts:268,374,1060,1063,1112` |
| Reservas | OK `canais.ts:39-40` / `handlers/reservas.ts:18-30` | OK `:31-50` | OK | OK `ReservaServico.ts:47` | OK `ReservaRepositorio.ts:39` | OK | OK `preload/index.ts:71-77` | OK `ServicoReservas.ts:9` | OK `PaginaReservas.ts:290,487,2016,2050,2184,2198,2253` |
| Itens de reserva | OK `canais.ts:46-47` / `handlers/itensReserva.ts:18-23` | OK `:24-44` | OK | OK `ItemReservaServico.ts:20` | OK `ItemReservaRepositorio.ts:30` | OK | OK `preload/index.ts:79-85` | OK `ServicoItensReserva.ts:10` | **FALTA**: a tela só chama `listar()` (`PaginaReservas.ts:1557`); criar/atualizar/remover ocorrem dentro da transação da reserva (`ReservaRepositorio.ts:101-107,173-181`) |
| Pagamentos | OK `canais.ts:53-54` / `handlers/pagamentos.ts:16-24` | OK `:25-42` | OK | OK `PagamentoServico.ts:44` | OK `PagamentoRepositorio.ts:50` | OK | OK `preload/index.ts:87-93` | OK `ServicoPagamentos.ts:9` | OK `PaginaPagamentos.ts:182,256,1001,1032,1073,1106,1141` |
| Devoluções | OK `canais.ts:60-61,103-104` / `handlers/devolucoes.ts:15-32` | OK `:33-53` | OK | OK `DevolucaoServico.ts:42` | OK `DevolucaoRepositorio.ts:85` | OK | OK `preload/index.ts:95-107` | OK `ServicoDevolucoes.ts:12` | OK `PaginaDevolucoes.ts:221,302-306,969,1018,1105,1227,1260` |
| Manutenção | OK `canais.ts:89-90` / `handlers/manutencao.ts:14-25` | OK `:26-46` | OK | OK `ManutencaoServico.ts:41` | OK `ManutencaoRepositorio.ts:53` | OK | OK `preload/index.ts:109-116` | OK `ServicoManutencao.ts:11` | OK `PaginaManutencao.ts:103,175,564,574,610,642` |
| Usuários | OK `canais.ts:75-76` / `handlers/usuarios.ts:14-24` | OK `:25-51` | OK | OK `UsuarioServico.ts:44` | OK `UsuarioRepositorio.ts:40` | OK | OK `preload/index.ts:27-34` | **FALTA parcial**: `ServicoUsuarios.ts:14-29` não expõe `buscarPorId`/`inativar`; a tela inativa via `atualizar({ id, ativo })` (`PaginaUsuarios.ts:752-780`) | OK `PaginaUsuarios.ts:153` (4 fluxos via `atualizar`) |
| Autenticação / cadastro | OK `canais.ts:67-72` / `handlers/auth.ts:16-39` | — | OK | OK `AutenticacaoServico.ts:71` | OK `CadastroClienteRepositorio.ts:72`, `UsuarioRepositorio.ts:40` | OK | OK `preload/index.ts:19-25` | OK `ServicoAutenticacao.ts:13` | OK Login/Primeira execução/Cadastro cliente (`renderer/main.ts:112-131`) |
| Integrações | OK `canais.ts:28,97-99` / `handlers/integracoes.ts:18-35` | — | OK | OK `CepServico.ts:17`, `ClimaServico.ts:113`, `CnpjServico.ts:41`, `FeriadosServico.ts:12` | — | OK | OK `preload/index.ts:118-122` | OK `ServicoIntegracoes.ts:14` | OK (consumo real em 4 telas — §4) |
| Dashboard | OK `canais.ts:102` / `handlers/dashboard.ts:12-17` | — | OK `esquemaData` | OK `main/DashboardServico.ts:32` | agrega repositórios existentes | OK | OK `preload/index.ts:124-126` | OK `renderer/DashboardServico.ts:62` | OK `PaginaDashboard.ts:216,246-250` |

**Canais declarados sem handler:** apenas `app:ping` (`canais.ts:10`), que é evento **push** main→renderer (`src/main/index.ts:113-118`, `preload/index.ts:11-17`) — não é superfície de invoke.
**Handlers sem schema:** nenhum (67/67). **Sem perfil explícito:** nenhum. **Fora do contrato:** nenhum.
**Telas sem fluxo de exclusão:** nenhuma entidade listada; a única lacuna é a ausência de botões de item de reserva (P1).
**Entidades sem tela:** nenhuma. `PaginaEmConstrucao.ts:16` existe, mas nenhuma rota a usa (`renderer/main.ts:74-134`).

## 4. Tabela das 4 integrações + interface e usabilidade (Parte 4)

### 4.1 As quatro situações distintas

| Integração | Finalidade real | Host / endpoint (main) | Onde é chamada no main | Onde aparece na tela e consumo real | Status |
| --- | --- | --- | --- | --- | --- |
| **CEP (ViaCEP)** | Preencher logradouro, bairro, cidade e UF no cadastro de cliente (`docs/integracoes.md:28`) | `https://viacep.com.br/ws/{dígitos}/json/` — `ClienteHttp.ts:6`, `CepServico.ts:26-27` | `clientes:buscar-cep` (`handlers/clientes.ts:32-34`) → `ClienteServico.ts:49-55` → `CepServico.ts:20-30` | Dispara aos 8 dígitos (`PaginaClientes.ts:388-392`) e pelo botão “Buscar CEP” (`:468-473`); **preenche 4 campos** em `:503-533` | **ATENDE**, com P15 (sem estado `indisponivel`) |
| **CNPJ (BrasilAPI)** | Validar e auxiliar cadastro de fornecedor (`docs/integracoes.md:55`) | `https://brasilapi.com.br/api/cnpj/v1/{14 dígitos}` — `ClienteHttp.ts:9`, `CnpjServico.ts:50` | `integracoes:cnpj` (`handlers/integracoes.ts:24-29`) → `CnpjServico.ts:44-75` | Botão “Buscar dados do CNPJ” (`PaginaFornecedores.ts:419-427`); consulta em `:669-717`. **Consumo parcial**: só `razaoSocial` é gravada (`:682-689`), descartando situação/atividade/endereço já tipados (`CnpjServico.ts:53-71`) | **PARCIAL** (P10/P11/P16) |
| **Previsão do tempo (Open-Meteo)** | Mostrar previsão **da data da reserva**, gravar resumo em `Reserva.previsaoTempo`, sinalizar alta demanda (`docs/integracoes.md:39-49`) | `https://api.open-meteo.com/v1/forecast` (`ClienteHttp.ts:7`, `ClimaServico.ts:137-144`) e geocoding `.../v1/search` (`ClienteHttp.ts:8`, `ClimaServico.ts:218-221`) | `integracoes:previsaoTempo` (`integracoes.ts:18-23`) → `ClimaServico.consultar` (`:128-163`); persistência em `ReservaServico.ts:134-148,281-286` | Card no modal de confirmação (`PaginaReservas.ts:817-826`), coluna “Previsão” (`:1809-1817`), toast final (`:2221-2245`) e Dashboard (`PaginaDashboard.ts:404,564-612`) | **ATENDE** |
| **Feriados nacionais (BrasilAPI)** | Aviso de alta demanda e isenção de dias cobráveis na multa (`docs/integracoes.md:66,71`) | `https://brasilapi.com.br/api/feriados/v1/{ano}` — `ClienteHttp.ts:9`, `FeriadosServico.ts:20` | `integracoes:feriados` (`integracoes.ts:30-35`) → `FeriadosServico.ts:15-31`; usado no main em `ReservaServico.ts:267-279` e `DevolucaoServico.ts:185-221` | Aviso no wizard (`PaginaReservas.ts:794-801,837-857`), feriado de hoje no Dashboard (`PaginaDashboard.ts:282,329-333`), prévia de multa (`PaginaDevolucoes.ts:1119-1139`) | **ATENDE** (com P6) |

**São genuinamente diferentes?** Sim: quatro hosts/propósitos distintos, todos com uso observável na interface. **Alguma é só para cumprir requisito?** Nenhuma é decorativa; a mais rasa é CNPJ (consulta real e validação de dígitos, mas a tela aproveita só um campo).

### 4.2 A previsão é da data da reserva — sim

`ClimaServico.ts:137-144` envia a mesma `data` em `start_date` e `end_date`; `:147-159` escolhe o índice por `daily.time.indexOf(data)`; `:165-185` monta o resumo com `dataInicio`; `:200-207` limita a janela a hoje..hoje+16 dias. O Dashboard pede `hoje` apenas porque mostra a agenda do dia (`renderer/DashboardServico.ts:32-39,64-76`).

### 4.3 Estados por página (análise estática — **NÃO VERIFICADO VISUALMENTE**)

Legenda: C = carregando; E = erro com “Tentar de novo”; V = vazio; S = sucesso. O rótulo vem de `EstadoErro.ts:39-44`; nenhuma página sobrescreve `rotuloAcao`.

| Página | C | E | V | S / observação |
| --- | --- | --- | --- | --- |
| `PaginaDashboard.ts` | `:313` | `:319-325` / retry `:322` | `:456` | `:329-333` + banner de integração |
| `PaginaClientes.ts` | `:561` | `:570-576` / `:572` | `:583-599` | `:580` |
| `PaginaFornecedores.ts` | `:462` | `:471-477` / `:473` | `:484` | após `:484` |
| `PaginaCategorias.ts` | `:225` | `:231-237` / `:233` | `:158,243` | após `:243` |
| `PaginaEquipamentos.ts` | `:720` | `:731-737` / `:733` | `:749` | após `:749` |
| `PaginaManutencao.ts` | `:286` | `:292-298` / `:294` | `:204,304` | após `:304` |
| `PaginaUsuarios.ts` | `:320` | `:324-330` / `:327` | `:246` | após `:330` |
| `PaginaPagamentos.ts` | `:644` | `:655-661` / `:657` | `:668` | após `:668` |
| `PaginaReservas.ts` | `:695,1052,1677` | `:702-708,1057,1688` / `:704,1059,1130,1690` | `:1068,1095,1706,1888` | wizard; foco ao trocar etapa em `:741-745` |
| `PaginaDevolucoes.ts` | `:678,744` | `:688,754` / `:690,756` | `:701,767` | formulário em `:421-424` |
| `PaginaDisponibilidadeCliente.ts` | `:381` | `:392-399` / `:395` | `:405,420` | calendário após `:420` |
| `PaginaSobre.ts` | `:69` | `:125-147` / `:131-133` | N/A | diagnóstico |
| Login / Primeira execução / Cadastro cliente | `:103-105` / `:121-123` / `:240` | erro **inline**, sem botão de retry | N/A | `:196-219` / `:233-243` / `:347-400` |
| Escolha conta / Acesso restrito / Não encontrada / Em construção | N/A | N/A | N/A | estáticas; `PaginaEmConstrucao` **sem rota** (`renderer/main.ts:74-134`) |
| `PaginaComponentes.ts` | `:282-284` | `:275` / `:278` | `:270` | **dev-only** (`renderer/main.ts:171-174`) |

- **Fallbacks sem quebrar formulário:** CEP (`PaginaClientes.ts:534-547`), CNPJ (`PaginaFornecedores.ts:702-713`), clima (`PaginaReservas.ts:789-802`; `renderer/DashboardServico.ts:45-59`), feriados (`PaginaReservas.ts:794-801`; `DevolucaoServico.ts:206-221`). Nenhum inventa valor.
- **Validação em português simples:** `ValidacaoCadastroCliente.ts:45-80`, `ValidacaoAutenticacao.ts:22-29`, `ErrosRenderer.ts:42-72`, `TextosMulta.ts:9-18`. Login usa mensagem única para não vazar política (`PaginaLogin.ts:45,205-209`).
- **Confirmação antes de inativar/cancelar/estornar:** Clientes `PaginaClientes.ts:845-847`; Fornecedores `:803-805`; Equipamentos `:1098-1100`; Categorias `:443-445`; Manutenção `:636-638`; Reservas `:2001-2004,2038`; Devoluções `:1003-1006`; Pagamentos `:1062-1064,1136`; Usuários `:754-763`. Não há exclusão física disparada pela UI.
- **Acessibilidade no código:** `lang="pt-BR"` (`renderer/index.html:2`); foco visível e `motion-reduce` em `Botao.ts:21-27`, `Campo.ts:22-27`; `label`/`for`, `aria-describedby`, `aria-invalid`, `role=alert` em `Campo.ts:11-27`, `comum.ts:29-63`; `Modal.ts:73-82,107-166` com `role=dialog`, `aria-modal`, Esc, foco inicial e *focus trap*; setas em `ListaSelecionavel.ts:119-152`; `aria-sort`/`aria-label` em `Tabela.ts:67-70,92`. **Leitor de tela e contraste calculado: NÃO VERIFICADO.**
- **Design System / fontes:** tokens em `renderer/tailwind.css:7-46`; fontes locais Inter e Fraunces importadas em `:1-4` e presentes no bundle `dist/renderer/assets/index-CaOoRfP1.css:2` (30.265 bytes, `@font-face` 400/600). Sidebar `w-16 lg:w-sidebar` (`Sidebar.ts:12`), `overflow-x-auto` em tabelas (`Tabela.ts:30`), grades responsivas (`PaginaClientes.ts:35-40`, `PaginaReservas.ts:65-76`, `PaginaDashboard.ts:30,38`). DS recomenda fontes variáveis (`design-system.md:142-143,174-177`), mas a exceção está autorizada em `frontend-assumptions.md:98-105`. `style=`, `innerHTML`, `<style>` e `@apply`: nenhum uso real no renderer.
- **Formatação pt-BR:** centralizada em `FormatadorPtBr.ts:14-176`; `Intl`/`toLocale` no renderer só no centralizador (`:15`) e em ordenação (`Tabela.ts:67`, `PaginaEquipamentos.ts:156`, `FiltrosListas.ts:87`), sem duplicação de máscara/moeda.
- **Layout 800×600 / 1920×1080:** padrões responsivos existem (itens acima), mas **NÃO VERIFICADO VISUALMENTE**; larguras fixas potencialmente problemáticas não foram medidas em execução.
- **Cliques (estimativa estática, cronômetro NÃO VERIFICADO):** nova reserva — atalho do Dashboard (`PaginaDashboard.ts:258-261`) + wizard que abre no formulário (`PaginaReservas.ts:539-545`), **5 cliques + `Ctrl+Enter` ou 6** (`:2126-2134,2287`). Devolução com multa — atalho (`PaginaDashboard.ts:264-267`), formulário já aberto (`PaginaDevolucoes.ts:247,421-424`), prévia antes de salvar (`:1119-1149`), **6 cliques ou 5 com atalho** (`:1145,1435`). `docs/ux-fluxos.md:74-87,138-149` ainda conta 10 e 7 cliques — documento defasado (P5).
- **Sidebar/rotas/guardas:** `ControleAcesso.ts:25-51,73-107`, guard em `renderer/main.ts:204-235`, redirect pós-login em `:216-223`, sidebar oculta itens e ajusta `tabIndex` em `Sidebar.ts:188-220`; o main continua a autoridade (`ControleAcesso.ts:21-24`, `RegistroIpc.ts:80-87`).
- **Botões sem ação:** nenhum em produção. `submit` sem `aoClicar` têm handler no `form` (`PaginaLogin.ts:107-111,184`, `PaginaCadastroCliente.ts:243-248,325`, `PaginaPrimeiraExecucao.ts:125-129,192`, `PaginaDisponibilidadeCliente.ts:109-114,174`). Inertes apenas na vitrine dev (`PaginaComponentes.ts:85-90,217-218`). Fallbacks/dados falsos em serviços do renderer: só comentários (`ServicoCategorias.ts:9`, `EquipamentoServico.ts:13`, `DashboardServico.ts:19`).

---

## 5. Checklist de segurança (item a item)

| Item | Status | Evidência | Risco residual / NÃO VERIFICADO |
| --- | --- | --- | --- |
| Senha em hash com salt | ✅ | `SenhaHash.ts:1,9-13` — `scrypt` (`randomBytes` 16 bytes `:25`, `N=16384,r=8,p=1,maxmem=64MiB`); formato `scrypt$salt$hash`; `timingSafeEqual` em `:31-38` | — |
| Política de senha aplicada | ✅ | `SenhaHash.ts:41-53`, `esquemas.ts:74-78`; aplicada em `AutenticacaoServico.ts:158,189`, `UsuarioServico.ts:75,148` | — |
| Senha em texto puro em log / IPC / `.env.example` | ✅ código / ⚠️ seed | `UsuarioServico.ts:17-27` omite `senhaHash`; `RegistroIpc.ts:92-96` loga só caminhos do Zod; `grep console.` em `src/` → 4 linhas, nenhuma com senha; `.env.example:6` é placeholder | `scripts/seed.mjs:351-352` + `docs/seed.md:55-60` contêm `Demo@2026` (P3) |
| Login real | ✅ | `PaginaLogin.ts:196-223` → `ServicoAutenticacao.ts:18-20` → `handlers/auth.ts:16-21` → `AutenticacaoServico.ts:116-145` (conferência `:131`, `ativo` `:135`, sessão `:142-145`) | — |
| Perfil vem da sessão do main | ✅ | `renderer/main.ts:354-356` busca `auth:sessao-atual`; `nucleo/Sessao.ts:13-29` só em memória; `nucleo/Perfil.ts:20-28` deriva de `sessaoAtiva()?.perfil` | — |
| Perfil demo no renderer | ✅ ausente | `nucleo/Perfil.ts:6` afirma explicitamente; `:31-51` usa apenas a sessão. `grep demo` no renderer só acha IDs de vitrine em `PaginaComponentes.ts:96-229` | — |
| Autorização no main (67 canais) | ✅ | `RegistroIpc.ts:20-27` (5 conjuntos),guarda obrigatória em `:67-73`, checagem **antes** do Zod em `:80-88`; nenhum handler usa `ipcMain.handle` direto. Lista canal a canal abaixo | `app:abrir-externo` é público, mas passa por allowlist (`handlers/index.ts:74-84`) |
| Escopo por proprietário no main | ✅ | `EscopoCliente.ts:16-24`; `handlers/reservas.ts:21,27,34-45` sobrescreve `clienteId` com a sessão; `ItemReservaRepositorio.ts:44-47` filtra por subconsulta do dono; `handlers/dashboard.ts:6-16` oculta `financeiro` do atendente | Isolamento entre dois clientes **NÃO VERIFICADO** em banco real |
| Validação Zod em todo canal | ✅ (com ressalva) | 67/67 registros com `esquema*`; `canais.ts:68`, `registrar():67`, único fora = `app:ping` (push); `SEM ESQUEMA: []`, `SEM PERFIL: []` | Schemas moram em `src/shared/contratos/esquemas.ts:1`, não no main — desvio literal da regra (P4) |
| SQL 100% parametrizado | ✅ | `grep '${'` em `src/main/repositorios` → 60 ocorrências, todas de fragmentos fixos/colunas/`?`/parâmetros vinculados (ex.: `ClienteRepositorio.ts:51-76,141-145`, `ReservaRepositorio.ts:73-80,161`, `DevolucaoRepositorio.ts:104-110,156`). Nenhum valor do usuário interpolado | — |
| `sandbox`, `contextIsolation`, `nodeIntegration` | ✅ | `src/main/index.ts:83-88` — `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, preload explícito | Comportamento na GUI **NÃO VERIFICADO** |
| Preload sem Zod / só canal + tipos | ✅ | `src/preload/index.ts:1-4` importa só `electron` + `CANAIS` + `import type`; `dist/preload/index.js:2` — único `require("electron")` | — |
| CSP produção sem `unsafe-inline`/`unsafe-eval`/`ws:` | ✅ | `seguranca/Csp.ts:3-11,17-27` (produção em `:25`: `script-src 'self'`, `style-src 'self'`, `connect-src 'self'`), aplicada como header em `src/main/index.ts:36-45`; `renderer/index.html:6` não tem `<meta CSP>` | Header efetivo na janela **NÃO VERIFICADO** |
| `will-navigate` / `setWindowOpenHandler` | ✅ | `src/main/index.ts:48-72` bloqueia navegação; `:64` nega `window.open` | Teste real de navegação **NÃO VERIFICADO** |
| `shell.openExternal` com allowlist | ✅ | `seguranca/UrlsExternas.ts:2-17` exige `https:` e hostname exato (4 hosts); `handlers/index.ts:74-84` valida antes, erro `URL_NAO_PERMITIDA` | Teste manual com `file:///` **NÃO VERIFICADO** |
| Renderer: `innerHTML`/`outerHTML`/`style=`/`<style>`/`<script>` inline | ✅ | `grep` em `src/renderer` → nenhuma ocorrência em código; só comentários em `nucleo/dom.ts:1` e `LogoZenite.ts:48`, e `<script type="module" src="/src/main.ts">` externo em `renderer/index.html:11` | — |
| Segredos: `.env` fora do Git | ✅ | `git check-ignore -v .env` → `.gitignore:6:.env`; `git ls-files .env` → vazio; `git log --all -- .env` → vazio; `git status --short --ignored .env` → `!! .env` | — |
| `.env.example` sem credencial real | ✅ | `.env.example:1-23` — `DB_USER=seu_usuario`, `DB_PASSWORD=troque-por-sua-senha`, sem chaves reais | — |
| Histórico sem senha/chave real | ✅ | `git log -p -S` → `DB_PASSWORD`: 3 commits (placeholder + fixture `senha-local`); `password` → 6 commits (tipo de input, fixture, demo); `senha` → 19 commits (código, literal demo); `apikey` → 0; `secret` → 1 commit com `sk_test_123`/`STRIPE_SECRET_KEY` em código antigo que não existe mais no HEAD | Nenhuma credencial real identificada; apenas demo/teste |
| CPF em log ou mensagem de erro | ✅ | `AutenticacaoServico.ts:121,196` usa CPF só como chave de bloqueio em memória; mensagens genéricas em `:192,218,30-31` e `ClienteServico.ts:60,105`; `grep console.` em `src/` → nenhuma com CPF. `PaginaReservas.ts:1149` exibe CPF formatado na UI (staff), não em log | — |
| `docs/seguranca.md` justifica para este domínio | ✅ | `:43-45` (CPF/endereço/histórico/valores), `:97-100` (identidade ínica), `:110-116` (CPF, mensagens genéricas), `:153-165` (soft delete e histórico), `:171-188` (riscos residuais) | Trechos desatualizados em `:173-181` (P5) |

### 5.1 Autorização canal por canal

Conjuntos definidos em `src/main/ipc/RegistroIpc.ts:20-27`:

- **`publico`** (`:21`): `app:info` (`handlers/index.ts:68-73`), `app:abrir-externo` (`handlers/index.ts:74-84`), `auth:entrar` (`auth.ts:16-21`), `auth:sessao-atual` (`auth.ts:22-27`).
- **`anonimo`** (`:22`): `auth:bootstrap` (`auth.ts:28-30`), `auth:cadastrar-cliente` (`auth.ts:33-38`).
- **`autenticados`** (`:23`): `auth:sair` (`auth.ts:39-41`); `clientes:listar/buscar-por-id/atualizar` (`clientes.ts:19-30,43-48`); `equipamentos:listar/listar-disponiveis` (`equipamentos.ts:17-22,29-34`); `reservas:listar/buscar-por-id/criar/atualizar` (`reservas.ts:18-47`); `itens-reserva:listar` (`itensReserva.ts:18-23`); `integracoes:previsao-tempo/feriados` (`integracoes.ts:18-23,30-35`).
- **`ambos`** (`:24`, staff): `categorias:listar/buscar-por-id` (`categorias.ts:13-24`); `clientes:buscar-cep/criar` (`clientes.ts:31-42`); `equipamentos:buscar-por-id` (`equipamentos.ts:23-28`); `itens-reserva:buscar-por-id/criar/atualizar` (`itensReserva.ts:24-41`); `dashboard:resumo` (`dashboard.ts:12-17`); `devolucoes:listar/buscar-por-id/listar-pendentes/calcular-multa/criar/atualizar` (`devolucoes.ts:15-50`); `manutencao:listar/buscar-por-id` (`manutencao.ts:14-25`); `pagamentos:listar/buscar-por-id/criar/atualizar` (`pagamentos.ts:16-39`).
- **`admin`** (`:26`): `usuarios:*` 6 canais (`usuarios.ts:14-51`); `categorias:criar/atualizar/inativar` (`categorias.ts:25-39`); `fornecedores:*` 5 canais (`fornecedores.ts:16-42`); `clientes:inativar` (`clientes.ts:49-51`); `equipamentos:criar/atualizar/inativar` (`equipamentos.ts:35-49`); `reservas:inativar` (`reservas.ts:48-50`); `itens-reserva:remover` (`itensReserva.ts:42-44`); `pagamentos:inativar` (`pagamentos.ts:40-42`); `devolucoes:inativar` (`devolucoes.ts:51-53`); `manutencao:criar/atualizar/concluir/inativar` (`manutencao.ts:26-46`); `integracoes:cnpj` (`integracoes.ts:24-29`).

**Canais sem restrição que deveriam ter:** nenhum. Total: 67 canais de entrada, 100% com perfil explícito.

---

## 6. Problemas encontrados

| ID | Severidade | Req. afetado | Arquivo e linha | Descrição | Correção sugerida |
| --- | --- | --- | --- | --- | --- |
| P1 | **ALTO** | 2 | `renderer/src/paginas/PaginaReservas.ts:1557`; `renderer/src/servicos/ServicoUsuarios.ts:14-29`; `PaginaUsuarios.ts:752-780` | CRUD de itens de reserva e de usuários incompleto na UI (canais existem no main) | Expor criar/editar/remover itens na tela de reserva e `buscarPorId`/`inativar` na fachada de usuários |
| P2 | **ALTO** | 1 | `src/main/banco/Migrador.ts:39-41`; `git log -- src/main/banco/migracoes/001-categorias.ts` (`ca05aa1`, `0bc781a`) | Migração 001 editada após criação; bancos já migrados não recebem a alteração | Criar migração 009 corretiva (idempotente) ou documentar que todos os bancos devem ser recriados |
| P3 | **MÉDIO** | 4 | `scripts/seed.mjs:351-352`; `docs/seed.md:55-60` | Senha demo `Demo@2026` embutida (dev-only, hasheada antes de gravar) | Exigir `SEED_DEMO_SENHA` e falhar se ausente; documentar no README |
| P4 | **MÉDIO** | 4 | `src/shared/contratos/esquemas.ts:1`; `AGENTS.md` regra 5; `RegistroIpc.ts:67-73` | Schemas Zod ficam em `shared/`, embora a validação ocorra no main — desvio literal da regra | Arquiteto decide: emendar AGENTS para "validados no main" ou mover schemas para `src/main/` |
| P5 | **MÉDIO** | 4, docs | `docs/seguranca.md:173-181`; `docs/ux-fluxos.md:24-35`; `docs/adr/0007:3`, `0008:3`, `0009:3`; `README.md:31,57` | Documentação desatualizada contradiz o código implementado | Revisar e marcar como implementado/histórico; corrigir README |
| P6 | **MÉDIO** | 3, cliente | `docs/requisitos-cliente.md:5-6` vs `DevolucaoServico.ts:89-110,187-204`; `docs/adr/0008:116-120` | Regra de multa isenta domingos/feriados, mas o pedido diz "sem tolerância"; ADR segue "proposto" | Decidir com o cliente; aceitar a regra atual formalmente ou alterar o cálculo + testes |
| P7 | **BAIXO** | 5 | `DevolucaoServico.ts:30-37`; `PagamentoServico.ts:20-37`; `EquipamentoServico.ts:18` | Helpers privados com regra de negócio fora de classes (dentro do arquivo de serviço) | Se POO estrita for exigida, converter em métodos privados da classe de serviço |
| P8 | **BAIXO** | docs | `git grep -i -E '\bMCP\b|\bRAG\b'` → vazio; `docs/adr/` (sem 0006) | ADR de MCP/RAG inexistente; numeração 0006 ausente | Arquiteto escreve ADR avaliando MCP/RAG (mesmo que decida "não usar") e esclarece 0006 |
| P9 | **BAIXO** | 4, docs | `docs/adr/0007-contratos-auxiliares.md`; `docs/seguranca.md:143` vs `canais.ts:9` | Nome de canal divergente: docs dizem `abrir:externo`, código usa `app:abrir-externo` | Alinhar a documentação ao contrato implementado |
| P10 | **BAIXO** | apresentação | `scripts/seed.mjs:52-68,228-264` | CNPJs/CPFs do seed falham nos dígitos verificadores (comando de validação local: todos os 4 CNPJs `false`; 3 de 6 CPFs `false`) | Substituir por valores fictícios válidos |
| P11 | **MÉDIO** | 3 | Runtime `fetch https://brasilapi.com.br/api/cnpj/v1/11444777000161` → `403 Forbidden`; `CnpjServico.ts:41` | Consulta de CNPJ indisponível neste ambiente (pode ser bloqueio de rede/host) | Testar em outra rede; se persistir, trocar provedor ou documentar indisponibilidade esperada |
| P12 | **MÉDIO** | 5 (processo) | `git shortlog -sne --all` → 4 autores; `git log --format=...` (HEAD) → 44 commits, 3 autores, `willcotil` com 0 no HEAD | Participação de `willcotil` não verificável no repositório; 3 mensagens não convencionais; 13 commits com >10 arquivos | Verificar `Settings > Collaborators` no GitHub; padronizar mensagens futuras |
| P13 | **BAIXO** | apresentação | `PaginaPagamentos.ts` (comprovante via `window.print`); `PagamentoServico.ts` (isenção via `atualizar`) | Comprovante não gera arquivo; isenção de multa é feita ajustando valor, sem canal `devolucoes:isentar` | Decidir se é suficiente para a apresentação; se não, criar canal de isenção |
| P14 | **BAIXO** | 1 | `002-locacao.ts:56-57` | `equipamento.categoria` é texto, sem FK para `categorias.id` | Avaliar FK real para categoria antes da apresentação |
| P15 | **MÉDIO** | 3 | `CepServico.ts:38-40`; `modelos.ts:675` | CEP é a única integração sem retorno tipado `indisponivel`: falha vira `ErroDeDominio('CEP_INVALIDO')`, divergindo do padrão das outras três | Responsável `integrador-api`: alinhar ao padrão sem quebrar o preenchimento manual |
| P16 | **BAIXO** | 3 | `PaginaFornecedores.ts:682-689` vs `CnpjServico.ts:53-71` | CNPJ é consumido de forma rasa: só `razaoSocial` é usada; situação, atividade e endereço já tipados são descartados | Responsável `frontend-developer`: usar os campos úteis ou documentar a escolha |
| P17 | **BAIXO** | docs/UX | `docs/ux-fluxos.md:74-87,138-149` | Contagem de cliques desatualizada (10 para reserva, 7 para devolução) vs código atual (5–6) | Atualizar documentação; incluído no A6 |

## 7. Plano de correção (ordenado por severidade)

> Nenhuma destas ações foi executada. Aguardando aprovação. Nenhum prompt autoriza `git add`, `commit` ou `push`.

### ALTO

**A1 — P1 · CRUD de UI incompleto · responsável: `frontend-developer`**
```
Auditoria docs/auditoria-final.md, problema P1. Somente leitura do código, sem git add/commit/push.
Exponha na tela os fluxos de criar/editar/remover item de reserva e, na fachada
src/renderer/src/servicos/ServicoUsuarios.ts, buscarPorId e inativar (hoje a tela usa atualizar).
Entregue diff + evidência arquivo:linha; não altere docs nem contratos.
```

**A2 — P2 · migração 001 editada · responsável: `arquiteto-crud`**
```
Auditoria docs/auditoria-final.md, problema P2. Sem git add/commit/push.
Crie a migração 009 corretiva e idempotente para garantir o schema final de categorias
em bancos que aplicaram a versão antiga da 001. Não edite migrações antigas. Inclua teste
e evidência do comando de validação. Não toque no renderer.
```

### MÉDIO

**A3 — P6 · regra de multa divergente · responsável: `arquiteto` (decisão) + `arquiteto-crud` (se mudar)**
```
Auditoria docs/auditoria-final.md, problema P6. Sem git add/commit/push.
Decida formalmente: manter isenção de domingos/feriados ou cumprir "sem tolerância" de
docs/requisitos-cliente.md:5-6. Escreva a decisão em ADR (se mudar, ajuste DevolucaoServico
e os testes). Entregue o ADR e a evidência; não altere telas.
```

**A4 — P3 · senha demo literal · responsável: `arquiteto-crud`**
```
Auditoria docs/auditoria-final.md, problema P3. Sem git add/commit/push.
Em scripts/seed.mjs, exija SEED_DEMO_SENHA (falhe se ausente) em vez do literal Demo@2026;
atualize docs/seed.md. Não mude dados nem lógica de negócio do seed.
```

**A5 — P4 · localização dos schemas · responsável: `arquiteto`**
```
Auditoria docs/auditoria-final.md, problema P4. Sem git add/commit/push.
Decida entre mover os schemas Zod para src/main/ ou emendar AGENTS.md regra 5 para
"validados no main, contratos tipados em shared". Entregue a decisão e o mínimo diff
necessário; não altere validação em si.
```

**A6 — P5 · documentação desatualizada · responsável: `arquiteto` + `frontend-developer`**
```
Auditoria docs/auditoria-final.md, problema P5. Sem git add/commit/push.
Atualize status dos ADRs 0007/0008/0009 para implementado, marque docs/ux-fluxos.md:24-35,74-87,138-149
como proposta histórica/desatualizada, corrija docs/seguranca.md:173-181 e README.md:31,57
(style.css não existe; CSP é header gerado no main). Entregue a lista de arquivos e linhas.
```

**A7 — P11 + P15 · CNPJ 403 e CEP sem estado `indisponivel` · responsável: `integrador-api`**
```
Auditoria docs/auditoria-final.md, problemas P11 e P15. Sem git add/commit/push.
Investigue o 403 da BrasilAPI observado em 26/11/2026. Se for bloqueio de host/rede,
documente; se for mudança de API, ajuste CnpjServico mantendo timeout, retry limitado,
validação Zod e retorno "indisponível". Alinhe também CepServico ao padrão de retorno
tipado "indisponivel" sem quebrar o preenchimento manual. Inclua testes com HTTP mockado.
```

**A8 — P12 · processo/autoria · responsável: usuário (com apoio do `arquiteto`)**
```
Auditoria docs/auditoria-final.md, problema P12. NÃO é tarefa de código.
Confirme no GitHub: Settings > Collaborators > willcotil. Relate o resultado;
não faça commit nem push para "provar" participação.
```

### BAIXO

**A9 — P7 · helpers fora de classes · responsável: `arquiteto-crud`**
```
Auditoria docs/auditoria-final.md, problema P7. Sem git add/commit/push.
Se a regra de POO estrita for exigida, transforme os helpers privados de
DevolucaoServico.ts:30-37, PagamentoServico.ts:20-37 e EquipamentoServico.ts:18 em
métodos privados das respectivas classes. Se não for, registre a decisão de manter.
```

**A10 — P8 · ADR de MCP/RAG e 0006 · responsável: `arquiteto`**
```
Auditoria docs/auditoria-final.md, problema P8. Sem git add/commit/push.
Escreva ADR avaliando MCP e RAG com justificativa para este projeto (mesmo que a decisão
seja "não adotar") e esclareça a numeração 0006 ausente. Use docs/adr/template.md.
```

**A11 — P9 · nome de canal divergente · responsável: `arquiteto`**
```
Auditoria docs/auditoria-final.md, problema P9. Sem git add/commit/push.
Alinhe docs/adr/0007 e docs/seguranca.md:143 ao contrato real app:abrir-externo
(src/shared/contratos/canais.ts:9), sem mudar comportamento.
```

**A12 — P10 + P13 + P14 · seed/comprovante/categoria · responsável: `arquiteto-crud`**
```
Auditoria docs/auditoria-final.md, problemas P10, P13, P14. Sem git add/commit/push.
Substitua CNPJs/CPFs inválidos do seed por valores válidos; decida se o comprovante de
impressão e a isenção via pagamentos:atualizar bastam; avalie FK real de equipamento.categoria
para categorias.id. Entregue decisão escrita antes de qualquer mudança de contrato.
```

**A13 — P5/Parte 4 · revisão visual · responsável: `ui-ux-designer`**
```
Auditoria docs/auditoria-final.md. Somente documentação, sem alterar telas e sem git.
Com o roteiro da §8 executado pelo usuário, registre os resultados visuais em 800x600 e
1920x1080, contraste, foco e consistência com docs/design-system.md. Marque NÃO VERIFICADO
o que não foi observado; não altere código.
```

**A14 — P16 · CNPJ consumido de forma rasa · responsável: `frontend-developer`**
```
Auditoria docs/auditoria-final.md, problema P16. Sem git add/commit/push.
Em PaginaFornecedores.ts:682-689, use os campos de endereço/situação já devolvidos pelo
main (CnpjServico.ts:53-71) ou registre por escrito por que só razãoSocial é relevante.
Não mude validação nem contrato.
```

---

## 8. Roteiro de teste manual

Marque **OK** ou **FALHA** em cada passo. Use um banco descartável. Senhas demo do seed: `Demo@2026`.

| # | Passo | Resultado esperado |
| --- | --- | --- |
| 1 | Subir MySQL, copiar `.env.example` → `.env`, ajustar `DB_*`; `npm run build` e `npm start` | App abre sem erro de banco; migrações 1–8 aplicadas |
| 2 | Com banco vazio, abrir o app | `#/escolha-conta` → “Administrador” → `#/primeira-execucao`; **sem senha padrão** |
| 3 | Criar administrador; depois **Sair** | Volta para escolha de conta; login com a senha criada funciona |
| 4 | Em outro terminal, `npm run seed` | “Seed concluído: 4 fornecedores, 6 clientes, 24 equipamentos, 3 usuários demo e 6 reservas.” |
| 5 | Entrar como `demo.admin` / `Demo@2026`; **Sair** | Dashboard com faturamento real; logout volta à escolha de conta |
| 6 | Entrar como `demo.atendente`; abrir `#/usuarios` | Sidebar sem Usuários/Fornecedores; tela “Acesso restrito”, sem dados carregados |
| 7 | Entrar como `demo.cliente`; abrir reservas | Vê **somente** as próprias reservas; não acessa cadastros de staff |
| 8 | Como admin: Categorias → criar, editar e **excluir** uma categoria | Confirmação aparece; exclusão bloqueia se houver equipamento vinculado, com mensagem amigável |
| 9 | Fornecedores: criar/editar/excluir; testar CNPJ válido, inválido e sem internet | Três mensagens distintas; formulário continua utilizável; nada é inventado |
| 10 | Clientes: criar/editar/inativar; testar CEP `01001-000`, CEP inexistente e internet cortada | CEP válido preenche endereço; demais casos avisam e preservam campos manuais |
| 11 | Equipamentos: criar com conservação + diária, editar, inativar; tentar inativar com vínculo | Campos obrigatórios em português; vínculo bloqueia com mensagem clara |
| 12 | Manutenção: criar ordem, concluir, excluir | Equipamento sai da disponibilidade enquanto a ordem está aberta |
| 13 | Nova reserva: percorrer o wizard até confirmar; observar clima **da data escolhida** e feriado | Clima/feriado aparecem como aviso; confirmação cria reserva + pagamento pendente. Anote quantos cliques |
| 14 | Tentar reservar equipamento já reservado e outro em manutenção | Ambos são recusados; nada é criado |
| 15 | Devolução com atraso: calcular multa e concluir com pagamento | Multa explicada (“2 dias de atraso × R$ 20,00”); `valorTotal = base + multa`; pagamento criado |
| 16 | Pagamentos: registrar forma de pagamento e imprimir comprovante; depois conferir 800×600 e 1920×1080 e o DevTools | Totais corretos; sem scroll horizontal; foco visível; `Esc` fecha modal; CSP sem `unsafe-inline`/`unsafe-eval`/`ws:` |

---

## 9. O que ficou NÃO VERIFICADO

| Item | Por que não foi verificado | O que você precisa fazer |
| --- | --- | --- |
| Aparência/UX real das telas em 800×600 e 1920×1080 | Auditoria estática; nenhuma janela Electron foi aberta | Rodar `npm run dev` e seguir o roteiro da §8 nos dois tamanhos |
| Respostas reais da interface (cliques, foco, Esc, modal, `Tab`) | Só código foi lido | Mesmo procedimento acima |
| Header CSP efetivo na janela | Não foi possível inspecionar DevTools | DevTools → Network/Headers → conferir `Content-Security-Policy` |
| `will-navigate` e `setWindowOpenHandler` em execução | Teste exige GUI | Tentar navegar para outro site e abrir `window.open` no console |
| `shell.openExternal` com URL proibida | Teste exige GUI | `window.electronAPI.abrirExterno('file:///C:/Windows/System32/calc.exe')` → esperado `URL_NAO_PERMITIDA` |
| Isolamento entre dois clientes autenticados | Exige duas sessões e banco real | Entrar como `demo.cliente` e tentar acessar reserva de outro cliente |
| Chamadas HTTP reais das 4 integrações pelo app | O projeto usa HTTP mockado nos testes; apenas reachability direta dos hosts foi medida aqui | Executar os passos 9, 10 e 13 do roteiro com internet ligada e desligada |
| Contraste calculado e leitor de tela | Só as classes/atributos no código foram lidos | Rodar o roteiro da §8 com `Tab`, leitor de tela e verificação de contraste |
| Cronômetro de cliques (reserva/devolução) | Estimativa estática de 5–6 cliques; nenhum cronômetro foi medido | Cronometrar os passos 13 e 15 |
| Consulta de CNPJ | Host respondeu `403 Forbidden` neste ambiente | Repetir em outra rede; se falhar, registrar como integração indisponível |
| Execução de `npm run seed` | Comando não foi executado (auditoria somente leitura) | Rodar em banco descartável e conferir a contagem final |
| Estado de migrações em outras máquinas | Só o banco local foi consultado | Em cada máquina: `SELECT id FROM migracoes ORDER BY id` e comparar com o §2.1 |
| `willcotil` como colaborador no GitHub | **NÃO VERIFICÁVEL AQUI** — depende da configuração do repositório remoto | Conferir em `Settings > Collaborators` |
| Serialização IPC de `Error.stack` em runtime | Renderer lê só `message` (`ErrosRenderer.ts:30-35`), mas o objeto recebido não foi inspecionado | Logar a exceção recebida no DevTools em um canal que falhe |
| ADR de MCP/RAG / intenção de produto | Ausência documental confirmada, mas intenção não pode ser inferida | Decidir com o professor se é obrigatório e, se sim, escrever ADR |

---

**Fim da auditoria. Nenhuma correção foi aplicada; aguardando aprovação para executar o plano da §7.**
