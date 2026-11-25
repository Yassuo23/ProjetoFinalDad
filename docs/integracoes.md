# Integrações externas

Toda chamada HTTP acontece **no processo principal**. O renderer nunca recebe URL, chave, token,
status HTTP, stack ou dado bruto de API; ele consome os canais `clientes:buscar-cep`,
`integracoes:previsao-tempo`, `integracoes:cnpj` e `integracoes:feriados` através de
`window.electronAPI`. A implementação está em `src/main/servicos/` e no cliente comum em
`src/main/servicos/integracoes/`. Decisões em `docs/adr/0008-integracoes-reais.md`.

## Cliente comum

| Item | Valor |
| --- | --- |
| Hosts | Constantes `https://viacep.com.br`, `https://api.open-meteo.com`, `https://geocoding-api.open-meteo.com`, `https://brasilapi.com.br`. Qualquer outra origem é recusada antes do `fetch`. |
| URL | `new URL()` sobre a constante + `encodeURIComponent` em cada parâmetro. |
| Timeout | 6 s por tentativa (`AbortSignal.timeout`). |
| Tentativas | 1 original + no máximo 1 nova, somente em timeout, erro de rede, `429` ou `5xx`. |
| Cache | `Map` em memória, chave = URL completa. Não persiste após reiniciar o app. |
| Validação | Zod no main antes de qualquer uso da resposta; nunca `any`. |
| Log | Nenhuma URL, CEP, CNPJ, cidade, chave ou stack. Somente o motivo genérico quando necessário. |

Motivos de indisponibilidade (contrato ADR 0007): `SERVICO_FORA`, `CREDENCIAL_AUSENTE`,
`SEM_DADOS`, `PESQUISA_INVALIDA`.

## ViaCEP — endereço do cliente

| Item | Valor |
| --- | --- |
| Finalidade | Preencher logradouro, bairro, cidade e UF no cadastro de clientes. |
| Endpoint | `GET https://viacep.com.br/ws/{8 dígitos}/json/` |
| Limites | 8 dígitos; o main remove pontuação antes de montar a URL. |
| Janela / TTL | Sem janela temporal; cache de **24 h** por CEP. |
| Erros / fallback | CEP inexistente, `4xx`, resposta inválida ou falha de rede viram `ErroDeDominio('CEP_INVALIDO', mensagem amigável)`. O usuário pode preencher o endereço manualmente. |
| Onde aparece | Clientes → `( Buscar CEP )` e preenchimento automático ao salvar com endereço incompleto. |

## Open‑Meteo — previsão pela data da reserva

| Item | Valor |
| --- | --- |
| Finalidade | Mostrar a previsão **do dia da reserva** no modal de confirmação e gravá-la em `Reserva.previsaoTempo`. |
| Endpoint | `GET https://api.open-meteo.com/v1/forecast?latitude=…&longitude=…&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max&timezone=America%2FSao_Paulo&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` |
| Geocodificação | `GET https://geocoding-api.open-meteo.com/v1/search?name={CLIMA_CIDADE}&count=1&language=pt&format=json`, usada apenas se `CLIMA_LATITUDE`/`CLIMA_LONGITUDE` não estiverem configurados. |
| Limites | Até **16 dias** à frente; datas passadas ou além da janela não são consultadas. Tier gratuito para avaliação/prototipagem; uso comercial exige licença do provedor. |
| Janela / TTL | `start_date = end_date = dataInicio`. Cache da previsão: **30 min** por data/coordenada; geocodificação: **24 h** por cidade. |
| Erros / fallback | `indisponivel` com `SEM_DADOS` (fora da janela, sem latitude ou sem resultado para a data), `PESQUISA_INVALIDA` (data malformada), `SERVICO_FORA` (rede/timeout/`5xx`). Clima indisponível **não bloqueia** a confirmação: o main grava `Previsão indisponível para {data}.` |
| Onde aparece | Reservas → card de clima no modal de confirmação, `previsaoTempo` da reserva e, quando favorável, aviso de alta demanda. |

**Alta demanda:** `Reserva.altaDemandaPrevista?` é `true` com tempo favorável (Ensolarado/Nublado,
sem chuva, 18–32 °C, vento < 35 km/h) ou data de início em feriado nacional; `false` com tempo
desfavorável; `null` se a integração estiver indisponível. O campo é aditivo e opcional.

## BrasilAPI — CNPJ do fornecedor

| Item | Valor |
| --- | --- |
| Finalidade | Validar e preencher dados do fornecedor (razão social, nome fantasia, situação, atividade e endereço opcional). |
| Endpoint | `GET https://brasilapi.com.br/api/cnpj/v1/{14 dígitos}` |
| Limites | Schema do IPC aceita pontuação; o main valida os **dois dígitos verificadores** antes da chamada. |
| Janela / TTL | Sem janela temporal; cache de **24 h** por CNPJ. |
| Erros / fallback | Dígitos inválidos → `indisponivel / PESQUISA_INVALIDA`; `404` ou resposta inválida → `SEM_DADOS`; rede/timeout/`5xx` → `SERVICO_FORA`. Nenhum erro bruto atravessa o IPC. |
| Onde aparece | Fornecedores → consulta de CNPJ no cadastro; `DadosCnpj` inclui campos de endereço opcionais para preenchimento. |

## BrasilAPI — feriados nacionais

| Item | Valor |
| --- | --- |
| Finalidade | (1) sinalizar alta demanda quando a reserva começa em feriado; (2) isentar domingos/feriados do cálculo da multa por atraso. |
| Endpoint | `GET https://brasilapi.com.br/api/feriados/v1/{ano}` |
| Limites | Ano entre 2020 e 2100 (schema do IPC). Apenas itens com `type: "national"` são usados. |
| Janela / TTL | Ano inteiro; cache de **24 h** por ano. Na multa são consultados os anos de `dataFim` e da devolução quando diferentes. |
| Erros / fallback | `indisponivel` com `feriados: []` e motivo (`SEM_DADOS`, `SERVICO_FORA`, `PESQUISA_INVALIDA`). Na confirmação, feriado indisponível apenas remove o sinal de alta demanda. Na multa, descontam-se apenas domingos; a devolução **não é bloqueada**. |
| Onde aparece | Reservas (aviso de alta demanda) e Devoluções (dias de atraso e valor da multa). |

## Variáveis de ambiente

Somente o processo principal lê o `.env`. Preencha no `.env` real **sem versionar**:

| Variável | Obrigatória? | Uso |
| --- | --- | --- |
| `CLIMA_LATITUDE` | não | Latitude da loja. Deve ser usada junto com `CLIMA_LONGITUDE`; quando presente, a geocodificação é ignorada. |
| `CLIMA_LONGITUDE` | não | Longitude da loja. Mesma regra acima. |
| `CLIMA_CIDADE` | não | Cidade usada na geocodificação quando as coordenadas não existem. Padrão: `Sao Paulo`. |

Nenhuma chave de API é necessária hoje. Se migrar para o host pago da Open‑Meteo, adicione a
chave ao `.env` e ao `.env.example` como variável (nunca como literal no código).
