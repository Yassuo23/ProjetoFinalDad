# ADR 0016 — Contrato do P10 (Usuários e perfis)

- **Status:** aceito
- **Data:** 2026-11-23
- **Decisores:** fundação (AS) com decisão de produto, implementação a cargo dos agentes Backend/Database/Frontend

## Contexto

O app é desktop e local, mas a equipe pediu papéis (`administrador`, `operador`, `visualizador`)
para organizar o uso. É preciso decidir onde a senha mora e se perfil é limite de segurança ou
apenas apresentação — sem isso, cada dev inventaria um login.

## Decisão

1. **Canais:** `usuarios:listar`, `buscar-por-id`, `criar`, `atualizar`, `inativar` e `autenticar`.
2. **Senha:** hash com `node:crypto.scrypt` no `UsuarioServico` (main), salt por usuário. A senha
   em texto plano trafega somente no payload local `renderer → preload → main` e **nunca** é
   devolvida, logada ou persistida. `Usuario` expõe `id, nome, login, perfil, ativo, criadoEm`.
3. **Perfis:** `administrador` (tudo), `operador` (cadastros, reservas, devoluções, pagamentos),
   `visualizador` (somente leitura e painel). O renderer esconde ações não permitidas; o main
   **não** mantém sessão nem revalida perfil por canal — o limite é de usabilidade, não de
   segurança, porque o banco é local e o operador tem acesso ao arquivo.
4. **Regras:** login único (`LOGIN_DUPLICADO`), no máximo um `administrador` ativo? **Não:** não
   há restrição de quantidade; inativação é lógica (`ativo`). Login de usuário inativo devolve
   `USUARIO_INATIVO`; senha errada devolve `SENHA_INVALIDA`.
5. **Migração:** `009-usuarios` (já registrada).
6. **Erros:** `USUARIO_NAO_ENCONTRADO`, `LOGIN_DUPLICADO`, `SENHA_INVALIDA`, `USUARIO_INATIVO`.

## Alternativas descartadas

- **Guardar senha em texto plano ou MD5** — inaceitável mesmo em app local.
- **Sessão com JWT no renderer** — acrescenta chave e estado sem servidor para validar; a CSP
  proibiria armazenamento útil e não aumentaria a segurança real.
- **Autorização por canal no main com `usuarioId` em todo payload** — criaria a ilusão de
  segurança: qualquer processo local poderia forjar o id.

## Consequências

- `ApiZenite`/preload expõem `usuarios.*`; nenhum canal existente muda.
- O Frontend aplica `perfil` ao montar cada tela; o molde `montarX(container, perfil)` entra no
  handbook.
- Risco residual aceito: perfis não são fronteira de segurança. Se o app passar a rodar em rede,
  reabrir esta ADR antes de qualquer acesso remoto.
