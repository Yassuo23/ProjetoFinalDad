# Regras de domínio — Zênite · Aluguel Outdoor

- **Dono:** Arquiteto de Software (AS) — registra decisões e lacunas.
- **Fonte do que é cliente:** `docs/requisitos-cliente.md` (fala do lojista).
- **Fonte de contexto:** `docs/telas.md` e `docs/design-system.md` (decisões de UX, não do cliente).
- **Regra de ouro:** nenhuma regra de locação é decidida aqui. Onde o cliente não decidiu,
  há `PERGUNTA EM ABERTO`. A implementação dessas regras mora em `src/main/servicos/<modulo>/`
  (Backend), nunca em handler, repositório ou renderer.

## 1. O que o cliente pediu (textual)

> Cadastrar equipamentos **com o estado de cada um**, clientes, reservas e devoluções;
> fornecedores de quem compra e manda para manutenção; saber **quais itens estão disponíveis
> em cada data**; controlar **pagamentos e eventuais multas por atraso** na devolução;
> mostrar a **previsão do tempo do dia da reserva** na confirmação; buscar o **CEP** do cliente
> para cadastro rápido de endereço.

Equipamentos citados: bicicleta, caiaque, prancha e camping.

## 2. Disponibilidade por período (sobreposição)

**Decidido (estrutura, não regra):** disponibilidade é calculada para um intervalo `[inicio, fim]`
pelo canal `equipamentos:disponiveis` (payload `inicio`, `fim`, `categoriaId`), com validação
Zod no main. A consulta considera reservas ativas (`confirmada`) que se sobrepõem ao período.

**Definição de sobreposição adotada como contrato de consulta:** dois intervalos se sobrepõem
quando `inicioA <= fimB && inicioB <= fimA` (comparação de datas, limite inclusivo). Essa é uma
definição matemática de consulta, não uma política de negócio.

> **PERGUNTA EM ABERTO 1 — Fronteiras de dia:** ao alugar de 23/11 a 25/11, o dia 25 conta
> como ocupado? (define se a consulta usa `<=` ou `<` no limite). Confirmação do cliente
> pendente. Até lá, o serviço usa limite inclusivo e documenta o escolhido.

> **PERGUNTA EM ABERTO 2 — Horários:** `Reserva` hoje tem só `inicio`/`fim` (data). O
> wireframe do dashboard mostra horário ilustrativo. Reservas são por dia ou por hora? Se por
> hora, é preciso novo campo e novo schema.

> **PERGUNTA EM ABERTO 3 — Status que bloqueia:** apenas `confirmada` ocupa o item, ou
> `pendente` também? `cancelada` libera imediatamente? Decisão do cliente pendente.

## 3. Multa por atraso na devolução

**Decidido (estrutura):** o cálculo mora no serviço de Devoluções, exposto por
`devolucoes:calcular-multa` (payload `reservaId`, `devolvidaEm`; retorno `ValorMulta`
com `valor` e `diasAtraso`). A tela permite isenção pelo administrador (`docs/telas.md` §3.8).

> **PERGUNTA EM ABERTO 4 — Carência:** quantos dias de tolerância antes de incidir multa?
> O cliente não informou. Não foi assumido valor padrão.

> **PERGUNTA EM ABERTO 5 — Fórmula:** multa por dia (valor fixo?), percentual da diária,
> ou valor mínimo? O wireframe mostra “R$ 25” como exemplo ilustrativo, **não como regra**.

> **PERGUNTA EM ABERTO 6 — Isenção:** quem pode isentar (administrador confirmado pela UX)
> e qual documento/motivo deve ser registrado?

## 4. Perfis de usuário

**Decidido (vocabulário no contrato):** `administrador`, `atendente`, `visualizador`
(`PerfilUsuario` em `modelos.ts`). `docs/telas.md` define acesso: atendente usa balcão
(Dashboard, Equipamentos consulta, Clientes, Reservas, Devoluções); administrador vê tudo
incluindo Fornecedores, Manutenção e Pagamentos.

> **PERGUNTA EM ABERTO 7 — `visualizador`:** o tipo existe no contrato, mas `docs/telas.md`
> descreve só dois perfis. Confirmar se o terceiro é necessário ou removê-lo.

> **PERGUNTA EM ABERTO 8 — Autenticação:** senha em texto no payload `usuarios:autenticar`.
> Como será o armazenamento (hash + salt) e a política de senha? Decisão de segurança do
> cliente/ED pendente. Nunca gravar senha em claro no SQLite.

## 5. Local usado na previsão do tempo

**Decidido (estrutura):** o clima é consultado no main via `integracoes:clima-previsao`
(payload `data`, `local`), com chamada HTTP e allowlist de domínio; a falha **não bloqueia**
a reserva (`docs/telas.md` §3.7). A resposta é normalizada em `PrevisaoClima`.

> **PERGUNTA EM ABERTO 9 — Origem do `local`:** usar a cidade da loja, o CEP do cliente
> ou a cidade informada na reserva? O cliente pediu “previsão do dia da reserva” sem dizer
> onde. Depende também de sabermos se o CEP do cliente já é salvo no cadastro (pergunta 10).

> **PERGUNTA EM ABERTO 10 — Endereço do cliente:** `Cliente` hoje não tem campos de
> endereço (só nome/email/telefone). O CEP preenchido será salvo no cliente ou usado só
> na hora? Define migração nova no BD.

## 6. Divisão dos pacotes entre os integrantes

| Pacote / módulo                    | Pasta (regra)                          | Responsável              |
| ---------------------------------- | -------------------------------------- | ------------------------ |
| Categorias (molde de CRUD)         | `servicos/categorias`, `repositorios/categorias` | fundação (molde) |
| Clientes                           | `servicos/clientes`, `repositorios/clientes`     | Dev de Clientes  |
| Equipamentos                       | `servicos/equipamentos`, `repositorios/equipamentos` | Dev de Equipamentos |
| Fornecedores                       | `servicos/fornecedores`                | Dev de Fornecedores      |
| Reservas                           | `servicos/reservas`                    | Dev de Reservas          |
| Devoluções e multas                | `servicos/devolucoes`                  | Dev de Devoluções        |
| Pagamentos                         | `servicos/pagamentos`                  | Dev de Pagamentos        |
| Manutenções                        | `servicos/manutencoes`                 | Dev de Manutenção        |
| Usuários / login                   | `servicos/usuarios`                    | Backend + ED (sessão)    |
| CEP, clima, CNPJ, feriados         | `integracoes/<api>`                    | Integração de APIs       |
| Horizonte / CSP / empacotamento    | `main/index.ts`, `janelas/`, `seguranca/` | Especialista Desktop   |
| Contrato, camadas, ADRs            | `shared/contratos/`, `docs/adr/`       | Arquiteto                |

> **PERGUNTA EM ABERTO 11 — Quatro devs, nove módulos:** o enunciado cita 4 desenvolvedores
> de negócio, mas há 9 módulos. Qual dev fica com Fornecedores, Devoluções, Pagamentos,
> Manutenções e Usuários? Confirmar com o humano antes de atribuir no `CODEOWNERS`.

> **PERGUNTA EM ABERTO 12 — Feriados:** o contrato prevê `integracoes:feriados-listar`,
> mas o cliente não pediu feriados explicitamente. Qual propósito real (bloquear dias
> sem atendimento? ajustar agenda do dashboard?). Confirmar antes de implementar.

## 7. Regras que NÃO são decididas pelo AS

Prazo mínimo/máximo de locação, valor de diária por item, política de desconto, regra de
multa, carência, bloqueio por clima e horário de retirada/devolução são regras de negócio.
O AS define **onde** elas moram (serviço) e o **contrato** para chamá-las; a decisão de
valor/cálculo é do cliente e da implementação do Backend.
