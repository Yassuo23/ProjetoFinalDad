# ADR 0008 — Integrações reais no main: ViaCEP endurecido, previsão por data, CNPJ e feriados

- **Status:** proposto
- **Data:** 2026-11-25
- **Decisores:** integrador de APIs; fundação (contrato R1–R7, ADR 0002/0007)

## Contexto

O ADR 0007 definiu os canais e os tipos das integrações, mas os handlers e os serviços reais não
foram implementados. Hoje `ClimaServico` consulta `api.openweathermap.org/data/2.5/weather`, que
devolve **tempo corrente**, não a previsão do dia da reserva exigida por
`docs/requisitos-cliente.md` e por `docs/telas.md` §4.4. `CepServico` faz `fetch` direto, sem Zod,
sem retry e sem cache. Não há consulta de CNPJ nem de feriados. A única premissa de multa é
`MULTA_DIARIA_VALOR` por dia corrido (`docs/requisitos-cliente.md`), o que cobra domingos e
feriados.

Documentação consultada em **2026-11-25**:

| Fonte | Endereço | Fato usado na decisão |
| --- | --- | --- |
| Open‑Meteo Forecast API | `https://open-meteo.com/en/docs` | Previsão diária de até **16 dias**; parâmetros `daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max`, `timezone`, `start_date`/`end_date`. |
| Exemplo real da API | `https://api.open-meteo.com/v1/forecast?...` | Resposta com `daily.time[]`, `daily.weather_code[]` (código WMO), mín./máx. em °C e vento em km/h;campos ausentes podem vir `null`. |
| Open‑Meteo Geocoding API | `https://open-meteo.com/en/docs/geocoding-api` | `GET /v1/search?name=...` devolve `results[].latitude/longitude`; permite manter cidade no `.env` e não no renderer. |
| Open‑Meteo Pricing | `https://open-meteo.com/en/pricing` | Tier gratuito para avaliação/prototipagem; **uso comercial exige licença/plano** com `customer-api.open-meteo.com` e chave. |
| OpenWeather One Call 4 / preços | `https://openweathermap.org/api/one-call-4`, `https://openweathermap.org/price.md` | One Call é timeline por latitude/longitude, exige `appid`; 1.000 chamadas/dia grátis e `£0.0012` por chamada adicional. O endpoint hoje usado (`/data/2.5/weather`) é tempo atual. |
| BrasilAPI CNPJ | `https://brasilapi.com.br/api/cnpj/v1/{cnpj}` | Resposta real com `razao_social`, `nome_fantasia`, `situacao_cadastral`, `cnae_fiscal_descricao`, `logradouro`, `numero`, `bairro`, `municipio`, `uf`, `cep`. |
| BrasilAPI Feriados | `https://brasilapi.com.br/api/feriados/v1/{ano}` | Array com `date`, `name`, `type: "national"`, `weekday`. |
| BrasilAPI — guia do projeto | `https://raw.githubusercontent.com/brasilapi/brasilapi/main/docs/ENDPOINT_GUIDE.md` | Projeto open-source sem financiamento; prioriza fontes públicas e gratuitas. |

`websearch` falhou nas consultas; a verificação foi feita com `webfetch` direto nas URLs oficiais e
em um chamado real de exemplo. Nenhuma chave oriunda da documentação foi copiada para o código.

## Decisão

**Manter toda comunicação HTTP no processo principal, atrás de um único cliente com hosts fixos,
timeout explícito, no máximo uma nova tentativa, cache em memória com TTL e validação Zod antes de
usar qualquer resposta. Indisponibilidade é valor tipado (`estado: 'indisponivel'`), nunca erro
bruto, stack, URL ou status enviado ao renderer.**

### Provedor de previsão

Adotar **Open‑Meteo Forecast API** com coordenadas configuradas (`CLIMA_LATITUDE` /
`CLIMA_LONGITUDE`) ou cidade resolvida por `Open‑Meteo Geocoding API` (`CLIMA_CIDADE`). O pedido é
feito com `start_date = end_date = dataInicio` da reserva, `timezone=America/Sao_Paulo` e os
campos diários listados acima. O cliente traduz o código WMO para `CondicaoTempo` e texto em
português.

Motivos para descartar o OpenWeather nesta entrega: o serviço atual consulta `/weather` (tempo
corrente, não previsão por data); One Call 4 exige `appid` e cobra além de 1.000 chamadas/dia,
enquanto o app desktop é instalado em balcão, sem backend que proteja a chave. O tier gratuito do
Open‑Meteo não exige segredo no bundle; se o uso comercial exigir licença, basta trocar o host por
`customer-api.open-meteo.com` e ler a chave do `.env` — nenhum contrato IPC muda.

**Janela:** hoje até hoje+16 dias (limite documentado do provedor). Fora dessa janela o serviço
devolve `indisponivel / SEM_DADOS` sem gastar chamada. Datas passadas também são `SEM_DADOS`.

### Integrações e limites

| Integração | Host fixo (constante no main) | Endpoint | Timeout | Tentativas | TTL do cache |
| --- | --- | --- | --- | --- | --- |
| CEP (ViaCEP) | `https://viacep.com.br` | `/ws/{8 dígitos}/json/` | 6 s | 1 original + 1 nova | 24 h |
| Previsão (Open‑Meteo) | `https://api.open-meteo.com` | `/v1/forecast?...` | 6 s | 1 original + 1 nova | 30 min por data/coordenada |
| Geocodificação (Open‑Meteo) | `https://geocoding-api.open-meteo.com` | `/v1/search?name=...` | 6 s | 1 original + 1 nova | 24 h por cidade |
| CNPJ (BrasilAPI) | `https://brasilapi.com.br` | `/api/cnpj/v1/{14 dígitos}` | 6 s | 1 original + 1 nova | 24 h |
| Feriados (BrasilAPI) | `https://brasilapi.com.br` | `/api/feriados/v1/{ano}` | 6 s | 1 original + 1 nova | 24 h por ano |

O cache é `Map` em memória, por chave determinística (URL completa, que inclui data, coordenada,
CEP, CNPJ ou ano). Ele não sobrevive ao reinício do app e não grava em disco. A nova tentativa
ocorre apenas em timeout, erro de rede, `429` e `5xx`; `4xx` (exceto `429`) e resposta inválida
não são repetidos. URL é montada com `new URL()` sobre a constante do host e cada parâmetro passa
por `encodeURIComponent`. Nenhuma URL, cidade, CEP, CNPJ, chave ou stack entra em log.

### Erros e retorno

`ErroIntegracao` é o tipo interno: `motivo` é um `MotivoIndisponibilidade` do ADR 0007
(`SERVICO_FORA`, `CREDENCIAL_AUSENTE`, `SEM_DADOS`, `PESQUISA_INVALIDA`) e `mensagem` é sempre
amigável. Regras de mapeamento:

- rede/timeout/`429`/`5xx` (após a nova tentativa) → `SERVICO_FORA`;
- `4xx` que não seja `429`, JSON inválido ou schema Zod quebrado → `SEM_DADOS`;
- parâmetro inválido antes da chamada (CNPJ com dígitos verificadores errados, data fora da
  janela) → `PESQUISA_INVALIDA`;
- credencial ausente → `CREDENCIAL_AUSENTE` (reservado para eventual migração ao host pago;
  nenhuma credencial é necessária hoje).

`integracoes:previsao-tempo`, `integracoes:cnpj` e `integracoes:feriados` devolvem as uniões
discriminadas do ADR 0007. `clientes:buscar-cep` continua com `EnderecoCep` ou
`ErroDeDominio('CEP_INVALIDO', mensagem)` para não quebrar o cadastro; a mensagem agora é a do
`ErroIntegracao`, sem detalhe de transporte.

O schema do CNPJ valida os **dois dígitos verificadores** no main antes da chamada. A resposta da
BrasilAPI é validada com Zod e convertida em `DadosCnpj`. Como o cadastro de fornecedor tem
endereço manual, `DadosCnpj` ganha campos **opcionais e aditivos** (`logradouro`, `numero`,
`complemento`, `bairro`, `cidade`, `uf`, `cep`) para preenchimento futuro; chamadas atuais continuam
válidas.

### Efeito real na confirmação

`Reserva` ganha o campo opcional `altaDemandaPrevista?: boolean | null`:

- `true` quando a previsão do dia indica tempo favorável (Ensolarado/Nublado, sem chuva,
  18–32 °C e vento < 35 km/h) **ou** quando a data de início é feriado nacional;
- `false` quando a previsão indica tempo desfavorável (Chuvoso/Outro, < 15 °C, > 35 °C ou vento
  ≥ 35 km/h);
- `null` quando a integração respondeu `indisponivel`;
- campo ausente quando o colaborador legado não implementa a consulta rica.

Além do campo no retorno, `ReservaServico` acrescenta `Alta demanda prevista para esta data.` ao
texto gravado em `previsaoTempo`. Assim o efeito aparece hoje no card de confirmação sem exigir
mudança no renderer. Clima indisponível continua **não bloqueando** a confirmação: o texto
`Previsão indisponível para {data}.` é gravado e a reserva é confirmada.

### Efeito real na multa

`DevolucaoServico` passa a contar **dias cobráveis**: começa no dia seguinte ao `dataFim`, termina
na data efetiva da devolução e ignora domingos (`getUTCDay() === 0`) e feriados nacionais obtidos
por `integracoes:feriados` (anos de início e fim, quando diferentes). Sábados continuam cobrando.
Essa regra **revisa a premissa "sem tolerância"** de `docs/requisitos-cliente.md` apenas para
domingos e feriados nacionais; valor diário, ausência de teto e isenção via
`pagamentos:atualizar` permanecem. A consulta de feriados é feita no main, com o mesmo cliente
endurecido; se estiver indisponível, a devolução é registrada normalmente, descontando apenas
domingos, e o risco residual é documentado em `docs/integracoes.md`.

O construtor de `DevolucaoServico` aceita um terceiro argumento **opcional** (`ServicoFeriados`);
as chamadas atuais com dois argumentos continuam compilando.

## Alternativas descartadas

- **Continuar com OpenWeather `/weather`** — é tempo corrente; fingir previsão pela data violaria
  a regra explícita do ADR 0007 ("devolve `indisponivel / SEM_DADOS` em vez de fingir").
- **Enviar cidade/chave do renderer** — quebra R3/R4 e expõe configuração; cidade e coordenadas
  ficam no `.env` lido só pelo main.
- **Fixar feriados no código** — listearia apenas o ano atual e exigiria release todo ano.
- **Cache em arquivo/SQLite** — acrescentaria persistência e dados do cliente em disco; TTL curto
  em memória resolve o volume de balcão.
- **Repetir qualquer falha** — triplicaria chamadas em `404`/payload inválido sem benefício.
- **Lançar `ErroDeDominio` com status HTTP ou URL** — vazaria detalhe de transporte ao renderer.
- **Tornar `DadosCnpj.endereço` e `Reserva.altaDemandaPrevista` obrigatórios** — quebraria
  fixtures e repositórios existentes; a aditividade preserva o build.

## Consequências

- Novos arquivos ficam em `src/main/servicos/integracoes/` (cliente, erro tipado e schemas das
  respostas externas); serviços de domínio continuam em `src/main/servicos/`; handlers finos em
  `src/main/ipc/handlers/integracoes.ts`. Nenhuma linha de `renderer/` ou `preload/` é alterada.
- `.env.example` documenta `CLIMA_LATITUDE`, `CLIMA_LONGITUDE` e `CLIMA_CIDADE`. Nenhuma chave é
  necessária no modo gratuito; `OPENWEATHER_API_KEY` deixa de ser requerido.
- `docs/integracoes.md` registra endpoints, limites, TTL, fallback e onde cada dado aparece.
- Testes com `fetch` falso cobrem sucesso, HTTP `4xx`/`5xx`, timeout, resposta inválida, cache e
  a nova regra de multa (domingo, feriado, combinação e ano diferente).
- **Risco residual:** o ADR 0007 prevê guarda de perfil (`cnpj` só admin). O módulo de autenticação
  ainda não tem handler registrado nesta entrega, então essa guarda depende do handoff da
  fundação; nenhuma decisão de autorização foi inventada aqui.
- **Risco residual:** o tier gratuito do Open‑Meteo é para avaliação/prototipagem. Uso comercial
  contínuo deve migrar para o plano pago com chave no `.env`, sem alterar contratos.
