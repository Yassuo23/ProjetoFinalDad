# API de clientes fictícios — aba Clientes

- **Status:** implementado (mock local)
- **Dono:** Integrador de APIs
- **Base:** `docs/telas.md` §3.4, `docs/adr/0002-contrato-de-comunicacao.md`

## Visão geral

Serviço REST local de demonstração com 10 cadastros fictícios (nome, CEP, logradouro, número,
complemento, bairro, cidade, UF, e-mail e telefone). Ele alimenta a aba **Clientes** sem
introduzir dependências novas: usa `node:http` no servidor e `fetch` nativo no main, o mesmo
cliente já adotado pela integração com a Stripe.

Nenhuma linha de HTTP existe no renderer. O fluxo é:

```
renderer (ServicoClientes) → preload → IPC clientes:listar → main (ClientesApiServico)
                           → GET /clientes → mock REST → DTO validado (Zod) → Cliente[]
```

## Como executar

```bash
cp .env.example .env        # ajuste CLIENTES_API_BASE_URL se trocar a porta
npm run dev:api             # mock + Vite + Electron (substitui `npm run dev`)
```

Se já estiver com `npm run dev` aberto, basta subir o mock em outro terminal:

```bash
npm run mock-api
```

O servidor escuta somente em `127.0.0.1` e responde em `http://127.0.0.1:3199/clientes`.
`GET /health` devolve `{ "status": "ok" }`.

## Variáveis de ambiente

Preenchidas no `.env` (carregado apenas fora do instalador):

| Variável                  | Obrigatória | Padrão | Consumida por | Uso                                                           |
| ------------------------- | ----------- | ------ | ------------- | ------------------------------------------------------------- |
| `CLIENTES_API_BASE_URL`   | sim         | —      | main          | URL base da API; HTTPS ou `localhost`/`127.0.0.1`             |
| `CLIENTES_API_TIMEOUT_MS` | não         | `5000` | main          | Timeout explícito (1000–60000 ms)                             |
| `CLIENTES_API_TOKEN`      | não         | vazio  | main + mock   | Se definido, main envia `Bearer` e o mock exige o mesmo valor |
| `CLIENTES_API_PORT`       | não         | `3199` | mock          | Porta do servidor de exemplo (não é lida pelo Electron)       |

Sem `CLIENTES_API_BASE_URL`, o app abre normalmente: o handler IPC falha com mensagem curta e o
`ServicoClientes` devolve os dados de exemplo marcados com `dadosDeExemplo: true`.

## Contrato

- Canal IPC: `clientes:listar` (constante `CANAIS.clientesListar`, já existente no contrato).
- Request opcional: `{ busca?: string; limite?: number }` → query string `?q=&limite=`.
- Response IPC: `Cliente[]` validado em `src/main/integracoes/clientes/tipos.ts`.
- Response HTTP: `{ dados: Cliente[], total: number }`.
- Erros: `CONFIGURACAO`, `REDE`, `TIMEOUT`, `HTTP`, `RESPOSTA_INVALIDA` — mensagens em pt-BR,
  sem corps, headers, stacks ou códigos brutos. Códigos ficam somente no main.

## Uso no renderer

```ts
import { ServicoClientes } from '../servicos'
import type { ResultadoClientes } from '../servicos'

const servico = new ServicoClientes()
const { clientes, dadosDeExemplo }: ResultadoClientes = await servico.listarComFonte({
  busca: 'ana',
})
```

`servico.listar(params)` continua disponível e devolve só `Cliente[]` (assinatura antiga).
A tela deve usar `listarComFonte` para exibir o aviso **“dados de exemplo”** quando a API estiver
fora, comportamento alinhado com Equipamentos/Dashboard.

## Fora de escopo

- `clientes.buscarCep` (ViaCEP) e `clientes.salvar`: exigem novos canais, schemas e decisão do
  Arquiteto/ED. O mock não inventa esses contratos.
- CRUD real em SQLite: hoje os dados são somente leitura e voláteis (reiniciar o mock restaura a lista).
- Paginação: `limite` existe; `offset` não foi adicionado porque a tabela ordena/filtra localmente.
