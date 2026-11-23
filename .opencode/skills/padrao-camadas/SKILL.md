---
name: Padrão de camadas
description: Onde cada tipo de código mora e como as camadas podem depender entre si
---

# Padrão de camadas

```
renderer → preload → IPC (canal + schema) → handler → serviço → repositório → SQLite
```

## Responsabilidades

| Camada | Mora em | Faz | Não faz |
| --- | --- | --- | --- |
| Renderer | `src/renderer` | UI e chamadas a `window.electronAPI` | Node, `ipcRenderer`, SQL, regra |
| Preload | `src/preload` | traduz API tipada para `invoke`/`on` | validar, decidir, importar Zod |
| Handler | `src/main/ipc/handlers` | valida pelo schema e delega | regra, SQL, acesso a disco |
| Serviço | `src/main/servicos` | regra de negócio, orquestração | `ipcMain`, `BrowserWindow`, SQL |
| Repositório | `src/main/repositorios` | SQL parametrizado e mapeamento | regra, IPC, UI |
| Banco | `src/main/banco` | conexão, pragmas, migrações | regra de negócio |

## Regras práticas

- Dependência só aponta para baixo. Serviço não importa handler; repositório não importa serviço.
- Serviço recebe repositório por construtor — é o que torna o teste possível sem Electron.
- SQL só em repositório, sempre com `?` e parâmetros. Concatenação é bloqueio de PR.
- Nomeie com o vocabulário do domínio: `Equipamento`, `Reserva`, `Cliente`, `Categoria`.
- Erros de domínio são classes ou códigos tipados; não vaze erro cru do driver.
- Um caso de uso novo = serviço novo ou método novo; não engorde o handler.

## Teste

- Serviço: teste unitário com repositório falso.
- Repositório: teste com banco em memória e migração aplicada.
- Handler/registro: teste com registrador falso; nunca suba o Electron no Vitest.
