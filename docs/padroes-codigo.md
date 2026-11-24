# Padrões de código e POO — Zênite

## Camadas (dependência sempre para dentro)

```
renderer (TS puro) → preload → IPC (canal + schema) → handler → serviço → repositório → SQLite
```

| Camada        | Pasta                              | Pode depender de                          | Nunca depende de              |
| ------------- | ---------------------------------- | ----------------------------------------- | ----------------------------- |
| Contrato      | `src/shared/contratos/`            | nada (canais sem imports)                 | zod no preload, Electron      |
| Nucleo        | `src/main/nucleo/`                 | `shared/contratos/` (tipos)               | serviços, repositórios        |
| Repositório   | `src/main/repositorios/<modulo>/`  | `DatabaseSync`, `nucleo/erros`            | serviços, IPC, renderer       |
| Serviço       | `src/main/servicos/<modulo>/`      | repositórios (porta), `nucleo/erros`      | IPC, Electron, renderer       |
| Handler       | `src/main/ipc/handlers/<modulo>/`  | `RegistroIpc`, schemas, serviços          | SQL, regra de negócio         |
| Integração    | `src/main/integracoes/<api>/`      | `nucleo/erros`, schemas                   | repositórios, renderer        |
| Preload       | `src/preload/index.ts`             | `canais.ts` (valor) + tipos apagados      | zod, qualquer runtime local   |
| Renderer      | `src/renderer/src/`                | `window.electronAPI`, tipos apagados      | Node, ipcRenderer, banco      |

## Classes e interfaces

- Toda regra de negócio vive em classe (`class ServicoX`) com dependências **injetadas no
  construtor**; nunca `new` dentro do serviço.
- Acesso a dados vive em classe (`class RepositorioX`) com `DatabaseSync` injetado pelo
  `ContainerAplicacao`.
- Handlers são funções finas registradas via `RegistroIpc`: validam com schema Zod e delegam.
- Interfaces de porta (`Repositorio<T>`, `ClienteIntegracao<T>`) ficam em `src/main/nucleo/`.
- `readonly` por padrão em DTO e parâmetro de construtor; `private readonly` para dependências.
- Nomes: `Servico<Entidade>`, `Repositorio<Entidade>`, `Erro<Motivo>`, `Criar<Entidade>Payload`.
- Sem `any` (R7): valor externo é `unknown` até Zod ou type guard confirmar o tipo.

## Erros

- `ErroDominio` (em `src/main/nucleo/erros.ts`) é a base abstrata.
- `mensagemPublica` vai para o renderer via `paraApi(canal)`; `detalheInterno` fica no log do main.
- Nunca devolver `Error.stack`, SQL, CPF ou token ao renderer.
- Códigos permitidos: `VALIDACAO`, `NAO_ENCONTRADO`, `CONFLITO`, `REGRA_NEGOCIO`,
  `INTEGRACAO_INDISPONIVEL`, `SEM_PERMISSAO`, `INTERNO`.

## Estrutura de pastas alvo

```
src/
├── main/
│   ├── index.ts               # ED: composição de app/janela
│   ├── nucleo/                # AS: erros, ContainerAplicacao, portas
│   ├── banco/                 # fundação: conexão, migrador
│   │   └── migracoes/         # BD: uma migração por mudança
│   ├── repositorios/          # BD: <modulo>/Repositorio*.ts
│   ├── servicos/              # BE: <modulo>/Servico*.ts
│   ├── integracoes/           # IA: cep/, clima/, cnpj/, feriados/
│   ├── ipc/
│   │   ├── RegistroIpc.ts     # AS/ED: registro único
│   │   └── handlers/          # BE: <modulo>/*.ts
│   ├── janelas/ e seguranca/  # ED
├── preload/index.ts           # ED
├── renderer/src/              # FE: nucleo/, componentes/, layout/, paginas/, servicos/
└── shared/contratos/          # AS: canais, modelos, esquemas, api
```

## Regras de ouro

1. String de canal **somente** em `canais.ts`.
2. Zod **somente** no main (`esquemas.ts`); preload importa só `canais.ts` e tipos.
3. SQL **somente** em repositório, sempre parametrizado (`?`).
4. Regra de negócio **somente** em serviço.
5. Nenhum `new` de repositório/serviço fora do `ContainerAplicacao`.
6. Nenhum módulo de negócio alterado pela fundação.
