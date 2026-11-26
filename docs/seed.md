# Seed de demonstração

O seed popular um banco **local de desenvolvimento** com dados de demonstração.
Ele **nunca** roda em produção, nunca é empacotado no instalador e nunca imprime
credenciais, senhas, hashes ou CPFs.

## Execução

Pré-requisito: `.env` na raiz com `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`,
`DB_PASSWORD` e `DB_SSL` apontando para um MySQL/MariaDB descartável.

```powershell
npm run seed
```

O script:

1. força `NODE_ENV=development`;
2. compila apenas os tipos do `main` (necessário para reutilizar a conexão e o
   gerador de hash sem duplicar regra);
3. aplica as migrações pendentes;
4. insere os dados de demonstração em uma transação.

O seed é **idempotente**: executá-lo várias vezes não duplica fornecedores,
clientes, equipamentos, reservas, pagamentos, devoluções, ordens de manutenção
nem usuários. Ele atualiza apenas os registros reconhecidos como de demo
(chaves fixas de CPF/CNPJ/login ou nome + categoria do equipamento).

## O que é criado

| Entidade | Quantidade | Observações |
| --- | ---: | --- |
| Categorias | 4 | Já vêm da migração 001 (Bicicleta, Caiaque, Prancha, Camping). |
| Fornecedores | 4 | CNPJs fictícios e fixos. |
| Clientes | 6 | CPFs fictícios e fixos; um deles é vinculado ao usuário `demo.cliente`. |
| Equipamentos | 24 | 6 por categoria, com diárias e estados iniciais. |
| Reservas | 6 | 2 passadas, 1 vencida sem devolução, 2 futuras e 1 cancelada. |
| Pagamentos | 6 | Um por reserva; a reserva avariada registra multa. |
| Devoluções | 2 | Uma pontual e uma com avaria. |
| Ordens de manutenção | 1 | Equipamento avariado fica `Em Manutenção` / `Em manutenção`. |
| Usuários | 3 | Admin, atendente e cliente — **apenas no seed**. |

A reserva vencida sem devolução alimenta `devolucoes:listar-pendentes` e
`dashboard:resumo`. A ordem de manutenção alimenta `manutencao:listar` e a
contagem `equipamentosEmManutencao`.

## Usuários demo

| Login | Perfil | Uso |
| --- | --- | --- |
| `demo.admin` | Administrador | CRUD completo, manutenção e finanças do dashboard. |
| `demo.atendente` | Atendente | Consultas; `financeiro` do dashboard vem `null`. |
| `demo.cliente` | Cliente | Escopo ADR 0009: vê apenas a própria reserva. |

A senha padrão de todos os usuários demo é `Demo@2026`. Para usar outra senha
sem alterar o código:

```powershell
$env:SEED_DEMO_SENHA = 'OutraSenha@2026'
npm run seed
```

A senha é armazenada somente como hash `scrypt`, gerado pela mesma função do
processo principal. Se o login já existir, o seed **não** sobrescreve o hash.

> Em produção, o primeiro administrador continua sendo criado por
> `auth:bootstrap`, com senha escolhida pelo usuário. O seed nunca cria acesso
> no pacote distribuído.
