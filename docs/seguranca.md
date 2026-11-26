# Segurança — evidências do hardening

Checklist aplicado após a implementação dos CRUDs e das integrações externas.

## Janela

- `contextIsolation: true`, `nodeIntegration: false` e `sandbox: true` em `src/main/index.ts`.
- Preload único: `dist/preload/index.js`, referenciado por `src/main/index.ts`.
- Bundle verificado: `dist/preload/index.js` contém somente `require("electron")`; não contém runtime do Zod nem imports de `shared/esquemas` ou `shared/modelos`.

## Navegação e janelas

- `will-navigate` em `src/main/index.ts` bloqueia qualquer destino diferente da página atual; apenas a navegação inicial (`about:blank`) é permitida.
- `setWindowOpenHandler(() => ({ action: 'deny' }))` em `src/main/index.ts`.

## Links externos

- `shell.openExternal` é chamado apenas depois de `urlExternaPermitida(url)`.
- A allowlist em `src/main/seguranca/UrlsExternas.ts` exige `https:` e compara `hostname`, não prefixo de string.
- Hosts permitidos: `electronjs.org`, `www.electronjs.org`, `github.com`, `www.github.com`.
- Evidência automatizada: `src/main/seguranca/UrlsExternas.test.ts` rejeita `file:`, `http:`, subdomínio fraudulento e texto que não é URL.
- Evidência manual pendente em ambiente com GUI: no DevTools, executar
  `window.electronAPI.abrirExterno('file:///C:/Windows/System32/calc.exe')`.
  Resultado esperado: rejeição com `URL_NAO_PERMITIDA` e nenhuma abertura do calculadora.

## CSP

- `src/renderer/index.html` não declara mais `<meta http-equiv="Content-Security-Policy">`.
- `src/main/seguranca/Csp.ts` gera a política por ambiente; `src/main/index.ts` aplica via header `Content-Security-Policy` antes de carregar a janela.
- Produção: sem `unsafe-inline`, `ws:` ou `unsafe-eval`; inclui `object-src 'none'`, `base-uri 'none'` e `frame-ancestors 'none'`.
- Desenvolvimento: mantém `ws:` e `unsafe-inline` somente para o HMR do Vite.
- Evidência automatizada: `src/main/seguranca/Csp.test.ts`.

## Dados e erros

- Todo handler passa pelo `RegistroIpc`, que valida o payload com Zod antes de delegar.
- Payloads inválidos devolvem `IPC_INVALIDO:<canal>`; detalhes do Zod são registrados apenas no console do main.
- Erros de domínio usam códigos estáveis de `CodigoErroDominio` (`REGISTRO_DUPLICADO`, `RELACAO_INVALIDA`, `NAO_ENCONTRADO`, `DADOS_INVALIDOS`, `URL_NAO_PERMITIDA`, entre outros).
- SQL dos repositórios é parametrizado; desde texto, datas e decimais são normalizados em `src/main/repositorios/mapeamento.ts`.

## Autenticação, senhas e sessão (ADR 0007)

Uma locadora guarda CPF, endereço e histórico de locações dos clientes, além de valores
pagos. Um vazamento de credencial permite alterar reservas e pagamentos — por isso a
autenticação é tratada como superfície crítica, não como detalhe de tela.

### Armazenamento de senha

- `src/main/servicos/SenhaHash.ts` usa `scrypt` (`node:crypto`) com `N = 16384`, `r = 8`,
  `p = 1` e `maxmem = 64 MiB`. O custo é alto o suficiente para tornar força bruta
  offline cara, sem travar a interface: a derivação roda no callback assíncrono do
  Node, fora da thread de renderização.
- Cada registro recebe 16 bytes de salt aleatório (`randomBytes`). O formato
  `scrypt$<saltHex>$<hashHex>` guarda o salt junto do hash, permitindo verificação sem
  reutilizar salt entre usuários — dois usuários com a mesma senha produzem hashes
  diferentes.
- A comparação usa `timingSafeEqual`; hashes com formato inesperado retornam `false`
  antes de qualquer comparação, sem revelar qual parte falhou.
- Política mínima: 8 a 128 caracteres, com pelo menos uma letra e um dígito. A mesma
  política vale para bootstrap, criação de usuário e troca de senha.
- Senha e hash **nunca** aparecem em log, erro, mensagem de IPC ou objeto devolvido ao
  renderer. `UsuarioPublico = Omit<Usuario, 'senhaHash'>` é aplicado por projeção
  explícita em `UsuarioServico`. O console do main registra somente os *caminhos* dos
  campos inválidos pelo Zod — nunca `issue.input`, que pode conter a senha.

### Sessão

- A sessão vive em memória, em uma única instância de `AutenticacaoServico` criada em
  `src/main/index.ts` e compartilhada entre a guarda do `RegistroIpc` e os handlers.
  Não há token no renderer, `localStorage`, cookie nem gravitação em disco: fechar o
  processo encerra a sessão.
- O renderer recebe apenas `Sessao` (id, nome, login, perfil) e `EstadoSessao`
  (`bootstrap`, `anonima`, `autenticada`). Nenhum segredo atravessa a ponte.
- Expiração padrão de 8 horas; o relógio é injetável nos testes. `sair()` é
  idempotente e a guarda consulta a sessão a cada chamada IPC, então revogar a sessão
  bloqueia o próximo invoke imediatamente.
- Se o perfil ou a situação `ativo` do usuário da sessão mudam, `UsuarioServico`
  atualiza ou descarta a sessão na hora; não é necessário reiniciar o app.

### Tentativas e bootstrap

- Cinco falhas de login (por login normalizado: minúsculas e sem espaços) bloqueiam
  por 1 minuto. O texto de erro é sempre o mesmo — `CREDENCIAIS_INVALIDAS` =
  "usuário ou senha inválidos" — para não informar se o login existe, se a senha
  estava errada ou se há bloqueio ativo.
- Como o Electron é local, não há IP confiável vindo do balcão; a chave de bloqueio
  é o login. Isso impede força bruta online contra uma conta específica sem punir
  outros atendentes.
- `auth:bootstrap` só funciona com **zero usuários** e exige nome, login e senha
  escolhidos na chamada. Não existe senha padrão, hardcoded nem semeada pela migração.
  Depois do primeiro administrador, qualquer nova chamada falha com
  `BOOTSTRAP_JA_REALIZADO`. O bootstrap é serializado no serviço para duas chamadas
  concorrentes não criarem dois administradores.

## Identidade Cliente e auto-cadastro (ADR 0009)

- Existe **uma única tabela `usuario`** com três perfis: `Administrador`, `Atendente` e
  `Cliente`. A coluna `cliente.id_usuario` liga a conta ao cadastro; a migração 007 é
  aditiva, usa `UNIQUE` e FK `ON DELETE SET NULL`, e pode ser reaplicada sem erro.
  Nenhuma credencial é duplicada em tabela paralela e nenhuma migração 001–006 mudou.
- `Sessao` carrega `clienteId` (`null` para staff; id do cliente para `Cliente`). O valor
  é sempre preenchido pelo main — nunca vem do renderer. A ausência do campo em fixture
  antiga é tratada como "sem vínculo" e a conta não entra (fail-closed).
- `auth:cadastrar-cliente` é público, mas só funciona quando já existe **administrador
  ativo**; sem ele, `BOOTSTRAP_PENDENTE`. Assim o app nunca fica órfão de administrador.
- O payload não tem `perfil`: o schema é `strict()` e o serviço rejeita a chave com
  `PERFIL_INVALIDO` antes de gerar hash. O perfil `Cliente` é fixado por literal no
  repositório, na mesma transação que cria `usuario` e `cliente`. `usuarios:criar` e
  `usuarios:atualizar` aceitam somente `Administrador|Atendente` (schema **e** serviço).
- O CPF é validado pelos dois dígitos verificadores e normalizado antes da gravação (
  `529.982.247-25` e `52998224725` são o mesmo registro). CPF repetido devolve somente
  "CPF já cadastrado" (`CPF_DUPLICADO`); colisão de login e erro de gravação usam a mesma
  mensagem genérica `Cadastro indisponível no momento.` — sem id, nome ou data do titular.
- Cinco falhas de cadastro por **CPF normalizado** bloqueiam por 1 minuto, reaproveitando
  o mesmo limite de `auth:entrar` (que continua chaveado por login). Senha nunca aparece
  em log, erro ou IPC.

## Autorização no processo principal

- `RegistroIpc` recebe o `ProvedorSessaoIpc` e exige que **todo canal** declare um
  conjunto de perfis: `publico`, `anonimo`, `autenticados`, `cliente`, `ambos` ou
  `admin`. O parâmetro é obrigatório em compile time: nenhum canal nasce público por
  esquecimento. `ambos` continua significando **somente staff**; `autenticados` inclui
  Cliente. A checagem acontece no main antes da validação do Zod e antes de chamar o
  handler, inclusive para impedir que um chamador não autorizado provoque log de payload.
- Códigos estáveis: `NAO_AUTENTICADO` (sem sessão) e `SEM_PERMISSAO` (sessão com
  perfil insuficiente). `IPC_INVALIDO:<canal>` continua reservado para schema. Recurso
  fora do escopo do cliente devolve `NAO_ENCONTRADO`, nunca `SEM_PERMISSAO`, para não
  confirmar que ele existe.
- Matriz aplicada:
  - **Administrador**: todos os canais, incluindo cadastros (categorias,
    equipamentos, fornecedores, usuários), inativações e integração de CNPJ.
  - **Atendente**: clientes, reservas, itens, devoluções, pagamentos, categorias e
    integrações de clima/feriados. Não inativa nem exclui cadastros; não administra
    usuários, fornecedores nem vê CNPJ.
  - **Cliente**: `auth:entrar`/`sair`/`sessao-atual`, `auth:cadastrar-cliente` (somente
    anônimo), `equipamentos:listar` e `listar-disponiveis`, `integracoes:previsao-tempo`
    e `integracoes:feriados`, `clientes:listar`/`buscar-por-id`/`atualizar`,
    `reservas:listar`/`buscar-por-id`/`criar`/`atualizar` e
    `itens-reserva:listar` — **somente para o próprio `clienteId`**. Não acessa
    `usuarios:*`, `integracoes:cnpj`, categorias, fornecedores, manutenção, pagamentos,
    devoluções, dashboard nem inativações.
  - **Anônimo**: `app:info`, `abrir:externo`, `auth:entrar`, `auth:sessao-atual`,
    `auth:bootstrap` (somente na primeira execução) e `auth:cadastrar-cliente`.
- O id do cliente nunca é aceito do renderer: `EscopoCliente.idClienteDaSessao` deriva
  o valor da sessão em memória e o handler o passa ao serviço, que repassa ao
  repositório como `WHERE id_cliente = ?` parametrizado. Em reservas, qualquer
  `clienteId` enviado é sobrescrito; em itens, a listagem usa subconsulta pelas reservas
  do dono. Cliente sem vínculo não recebe sessão.
- Perfil e sessão não são confiáveis se vindos do renderer: o main sempre deriva o
  perfil da sessão em memória. O renderer pode pedir, mas não pode decidir.

## Integridade dos dados

- `categorias` passou a ter `ativo` e `atualizado_em` na migração 006. A inativação
  é lógica (`soft delete`); nunca há `DELETE` físico em cadastros.
- `CategoriaServico.inativar` consulta `equipamento.categoria` antes de inativar e
  devolve `RELACAO_INVALIDA` com a mensagem exata
  "Não é possível inativar esta categoria: há equipamentos cadastrados nela.",
  preservando o histórico de locações.
- `CodigoErroDominio` ainda não declara `CATEGORIA_EM_USO` (contrato compartilhado,
  fora do escopo desta entrega). Até que o contrato seja estendido, usa-se o código
  estável `RELACAO_INVALIDA` com a mensagem acima; nenhuma string ad-hoc chega ao IPC.
- A migração 006 usa `CREATE TABLE IF NOT EXISTS` e verificação em
  `information_schema` antes de `ALTER TABLE`, então pode ser reaplicada sem erro.
  Nenhuma migração já aplicada (001–005) foi alterada.
- A migração 007 segue o mesmo padrão idempotente: consulta coluna e constraint em
  `information_schema` e só então executa o `ALTER TABLE` necessário. `usuario` e
  `cliente` são criados em uma única transação; rollback devolve a conexão ao pool.

## Riscos residuais e pendências

- **Dependência do FE:** os canais e funções finas de Login e Primeira execução já
  existem em `canais.ts`/`preload`, mas as telas correspondentes ainda precisam ser
  implementadas no renderer. Sem elas o usuário não consegue autenticar, e o main
  permanece com todos os canais protegidos. Esta entrega não altera o renderer.
- ADR 0009: o renderer ainda não tem as rotas `#/escolha-conta`, `#/cadastro-cliente` e
  `#/_area-cliente`. O tipo oficial `auth.cadastrarCliente` já está em `api.ts`; o tipo
  local temporário do preload deve ser removido pelo ED na próxima entrega do renderer
  (o contrato agora é idêntico). `clienteId` é opcional em `Sessao` apenas para manter
  as fixtures antigas do renderer compilando sem editar aquele módulo.
- A sessão em memória não sobrevive a um reinício do app; o usuário precisa entrar
  novamente. Isso é intencional em desktop de balcão.
- O bloqueio por login é em memória e reinicia com o processo. Para uma rede com
  múltiplos terminais compartilhando o mesmo banco, seria necessário persistir as
  tentativas — fora do escopo atual.
- Auditoria de *quem* alterou cada registro (coluna de usuário) ainda não existe;
  `atualizado_em` registra apenas o momento.
- Evidência automatizada: `SenhaHash.test.ts`, `AutenticacaoServico.test.ts`,
  `CategoriaServico.test.ts`, `CategoriaRepositorio.test.ts`,
  `RegistroIpc.test.ts` e a migração 006. Evidência manual pendente em GUI: fluxo
  completo Login → Primeira execução → inativar categoria em uso.
