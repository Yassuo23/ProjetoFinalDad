import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)

/**
 * Seed de demonstração — desenvolvimento apenas.
 *
 * Este arquivo fica fora de `dist/` e fora do pacote electron-builder. Ele usa
 * o mesmo cliente de banco, migrações e hash de senha do processo principal,
 * mas nunca imprime credenciais, CPFs nem hashes.
 */

function exigir(relativo) {
  return require(path.join('..', 'dist', 'main', relativo))
}

function isoData(deslocamentoDias, hoje = new Date()) {
  const data = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()))
  data.setUTCDate(data.getUTCDate() + deslocamentoDias)
  return data.toISOString().slice(0, 10)
}

/**
 * MySQL/MariaDB em modo STRICT rejeita ISO 8601 com `T`/`Z`/milissegundos em
 * colunas TIMESTAMP quando o valor chega como string. Formato aceito:
 * `YYYY-MM-DD HH:mm:ss`.
 */
function dataHoraSql(data = new Date()) {
  return data.toISOString().slice(0, 19).replace('T', ' ')
}

function diasEntre(inicio, fim) {
  const a = Date.parse(`${inicio}T00:00:00Z`)
  const b = Date.parse(`${fim}T00:00:00Z`)
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1)
}

function primeiroId(linhas) {
  const linha = linhas[0]
  if (!linha) return null
  const bruto = linha.id ?? linha.ID
  const id = Number(bruto)
  return Number.isInteger(id) && id > 0 ? id : null
}

async function buscarId(db, sql, valores) {
  return primeiroId(await db.query(sql, valores))
}

async function garantirFornecedor(db, dados) {
  await db.execute(
    `INSERT IGNORE INTO fornecedor (nome, cnpj, telefone, email, tipo)
     VALUES (?, ?, ?, ?, ?)`,
    [dados.nome, dados.cnpj, dados.telefone, dados.email, dados.tipo],
  )
  return buscarId(db, 'SELECT id_fornecedor AS id FROM fornecedor WHERE cnpj = ?', [dados.cnpj])
}

async function garantirCliente(db, dados) {
  await db.execute(
    `INSERT IGNORE INTO cliente (nome, cpf, telefone, email, cidade, uf)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [dados.nome, dados.cpf, dados.telefone, dados.email, dados.cidade, dados.uf],
  )
  return buscarId(db, 'SELECT id_cliente AS id FROM cliente WHERE cpf = ?', [dados.cpf])
}

async function garantirEquipamento(db, dados) {
  const existente = await buscarId(
    db,
    'SELECT id_equipamento AS id FROM equipamento WHERE nome = ? AND categoria = ? LIMIT 1',
    [dados.nome, dados.categoria],
  )
  const valores = [
    dados.nome,
    dados.categoria,
    dados.estadoConservacao,
    dados.disponibilidade,
    dados.fornecedorId,
    dados.valorDiaria,
  ]
  if (existente !== null) {
    await db.execute(
      `UPDATE equipamento
          SET estado_conservacao = ?, disponibilidade = ?, id_fornecedor = ?, valor_diaria = ?
        WHERE id_equipamento = ?`,
      [dados.estadoConservacao, dados.disponibilidade, dados.fornecedorId, dados.valorDiaria, existente],
    )
    return existente
  }
  const resultado = await db.execute(
    `INSERT INTO equipamento
       (nome, categoria, estado_conservacao, disponibilidade, id_fornecedor, valor_diaria)
     VALUES (?, ?, ?, ?, ?, ?)`,
    valores,
  )
  return resultado.insertId
}

async function garantirUsuario(db, senhaHash, dados) {
  await db.execute(
    `INSERT IGNORE INTO usuario (nome, login, senha_hash, perfil) VALUES (?, ?, ?, ?)`,
    [dados.nome, dados.login, senhaHash, dados.perfil],
  )
  return buscarId(db, 'SELECT id_usuario AS id FROM usuario WHERE login = ?', [dados.login])
}

async function garantirReserva(db, dados) {
  const existente = await buscarId(
    db,
    `SELECT id_reserva AS id FROM reserva
      WHERE id_cliente = ? AND data_inicio = ? AND data_fim = ? LIMIT 1`,
    [dados.clienteId, dados.inicio, dados.fim],
  )
  let reservaId = existente
  if (reservaId === null) {
    const resultado = await db.execute(
      `INSERT INTO reserva (id_cliente, data_reserva, data_inicio, data_fim, status_reserva)
       VALUES (?, ?, ?, ?, ?)`,
      [dados.clienteId, dataHoraSql(), dados.inicio, dados.fim, dados.status],
    )
    reservaId = resultado.insertId
  } else {
    await db.execute(
      'UPDATE reserva SET status_reserva = ? WHERE id_reserva = ?',
      [dados.status, reservaId],
    )
  }

  let base = 0
  for (const item of dados.itens) {
    await db.execute(
      `INSERT IGNORE INTO item_reserva (id_reserva, id_equipamento, valor_diaria)
       VALUES (?, ?, ?)`,
      [reservaId, item.id, item.valorDiaria],
    )
    base += item.valorDiaria
  }
  base *= diasEntre(dados.inicio, dados.fim)

  const dataPagamento = dados.statusPagamento === 'Pago' ? dataHoraSql() : null
  const pagamentoExistente = await buscarId(
    db,
    'SELECT id_pagamento AS id FROM pagamento WHERE id_reserva = ? LIMIT 1',
    [reservaId],
  )
  if (pagamentoExistente === null) {
    await db.execute(
      `INSERT INTO pagamento
         (id_reserva, valor_base, valor_multa, valor_total, forma_pagamento, status_pagamento, data_pagamento)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [reservaId, base, dados.multa, base + dados.multa, dados.formaPagamento, dados.statusPagamento, dataPagamento],
    )
  } else {
    await db.execute(
      `UPDATE pagamento
          SET valor_base = ?, valor_multa = ?, valor_total = ?,
              forma_pagamento = ?, status_pagamento = ?, data_pagamento = ?
        WHERE id_pagamento = ?`,
      [base, dados.multa, base + dados.multa, dados.formaPagamento, dados.statusPagamento, dataPagamento, pagamentoExistente],
    )
  }
  return reservaId
}

async function garantirDevolucao(db, reservaId, dataFim, estado, observacoes) {
  await db.execute(
    `INSERT IGNORE INTO devolucao
       (id_reserva, data_devolucao_efetiva, estado_pos_uso, observacoes)
     VALUES (?, ?, ?, ?)`,
    [reservaId, `${dataFim} 12:00:00`, estado, observacoes],
  )
}

async function garantirManutencao(db, equipamentoId, fornecedorId, descricao, dataEnvio) {
  const existente = await buscarId(
    db,
    'SELECT id_ordem AS id FROM ordem_manutencao WHERE id_equipamento = ? AND descricao = ? LIMIT 1',
    [equipamentoId, descricao],
  )
  if (existente === null) {
    await db.execute(
      `INSERT INTO ordem_manutencao
         (id_equipamento, id_fornecedor, descricao, data_envio, data_retorno_prevista, custo, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [equipamentoId, fornecedorId, descricao, dataEnvio, isoData(4), 120, 'Em andamento'],
    )
  }
  await db.execute(
    `UPDATE equipamento
        SET estado_conservacao = 'Em Manutenção', disponibilidade = 'Em manutenção'
      WHERE id_equipamento = ?`,
    [equipamentoId],
  )
}

async function semear(db) {
  await db.beginTransaction()
  try {
    const fornecedores = []
    for (const dados of [
      { nome: 'Trail Norte', cnpj: '11222333000144', telefone: '51990000001', email: 'contato@trailnorte.example', tipo: 'Compra' },
      { nome: 'Aqua Sul', cnpj: '22333444000155', telefone: '51990000002', email: 'contato@aquasul.example', tipo: 'Manutenção' },
      { nome: 'Campo Livre', cnpj: '33444555000166', telefone: '51990000003', email: 'contato@campolivre.example', tipo: 'Compra' },
      { nome: 'Urban Ride', cnpj: '44555666000177', telefone: '51990000004', email: 'contato@urbanride.example', tipo: 'Manutenção' },
    ]) {
      const id = await garantirFornecedor(db, dados)
      if (id !== null) fornecedores.push(id)
    }

    const clientes = []
    for (const dados of [
      { nome: 'Ana Ribeiro', cpf: '11144477735', telefone: '51988000001', email: 'ana@example.com', cidade: 'Porto Alegre', uf: 'RS' },
      { nome: 'Bruno Martins', cpf: '22255588846', telefone: '51988000002', email: 'bruno@example.com', cidade: 'Canoas', uf: 'RS' },
      { nome: 'Carla Nunes', cpf: '33366699957', telefone: '51988000003', email: 'carla@example.com', cidade: 'Gravataí', uf: 'RS' },
      { nome: 'Diego Alves', cpf: '44477712368', telefone: '51988000004', email: 'diego@example.com', cidade: 'Novo Hamburgo', uf: 'RS' },
      { nome: 'Elisa Campos', cpf: '55588823479', telefone: '51988000005', email: 'elisa@example.com', cidade: 'São Leopoldo', uf: 'RS' },
      { nome: 'Felipe Souza', cpf: '66699934580', telefone: '51988000006', email: 'felipe@example.com', cidade: 'Cachoeirinha', uf: 'RS' },
    ]) {
      const id = await garantirCliente(db, dados)
      if (id !== null) clientes.push(id)
    }
    if (clientes.length === 0) throw new Error('Nenhum cliente de demonstração disponível.')

    const equipamentos = []
    const catalogo = [
      ['Bicicleta Mountain Bike Aro 29', 'Bicicleta', 0, 89.9],
      ['Bicicleta Gravel', 'Bicicleta', 0, 109.9],
      ['Bicicleta Urbana', 'Bicicleta', 1, 59.9],
      ['Capacete de Ciclismo', 'Bicicleta', 0, 19.9],
      ['Mochila de Hidratação', 'Bicicleta', 2, 24.9],
      ['Kit de Ferramentas Bike', 'Bicicleta', 2, 29.9],
      ['Caiaque Inflável Duplo', 'Caiaque', 1, 149.9],
      ['Caiaque Single', 'Caiaque', 1, 119.9],
      ['Remo de Caiaque', 'Caiaque', 1, 34.9],
      ['Colete Salva-vidas', 'Caiaque', 1, 27.9],
      ['Bomba Manual para Caiaque', 'Caiaque', 1, 22.9],
      ['Bolsa Estanque', 'Caiaque', 1, 18.9],
      ['Prancha Stand Up Paddle', 'Prancha', 2, 99.9],
      ['Prancha de Surf 7ft', 'Prancha', 2, 129.9],
      ['Remo Ajustável para SUP', 'Prancha', 2, 39.9],
      ['Leash para SUP', 'Prancha', 3, 14.9],
      ['Bomba para SUP', 'Prancha', 3, 29.9],
      ['Saco de Transporte para SUP', 'Prancha', 3, 34.9],
      ['Barraca 2 Pessoas', 'Camping', 3, 69.9],
      ['Barraca 4 Pessoas', 'Camping', 3, 99.9],
      ['Saco de Dormir', 'Camping', 3, 44.9],
      ['Colchonete', 'Camping', 3, 19.9],
      ['Fogão a Gás', 'Camping', 3, 39.9],
      ['Lanterna Recarregável', 'Camping', 3, 24.9],
    ]
    for (const [nome, categoria, indiceFornecedor, valorDiaria] of catalogo) {
      const id = await garantirEquipamento(db, {
        nome,
        categoria,
        estadoConservacao: 'Bom',
        disponibilidade: 'Disponível',
        fornecedorId: fornecedores[indiceFornecedor] ?? null,
        valorDiaria,
      })
      equipamentos.push({ id, nome, valorDiaria })
    }

    const porNome = (nome) => {
      const item = equipamentos.find((equipamento) => equipamento.nome === nome)
      if (!item || item.id === null) throw new Error(`Equipamento de seed ausente: ${nome}`)
      return item
    }

    const itens = (nomes) => nomes.map((nome) => porNome(nome))

    // Reserva passada e pontual: concluída, paga e com devolução registrada.
    const passada = await garantirReserva(db, {
      clienteId: clientes[0],
      inicio: isoData(-32),
      fim: isoData(-30),
      status: 'Concluída',
      itens: itens(['Barraca 2 Pessoas', 'Fogão a Gás']),
      statusPagamento: 'Pago',
      formaPagamento: 'Pix',
      multa: 0,
    })
    await garantirDevolucao(db, passada, isoData(-30), 'Perfeito', 'Devolvida no prazo.')

    // Reserva passada com avaria: devolução tardia, multa e ordem de manutenção.
    const avariada = await garantirReserva(db, {
      clienteId: clientes[1],
      inicio: isoData(-20),
      fim: isoData(-18),
      status: 'Concluída',
      itens: itens(['Bicicleta Gravel', 'Capacete de Ciclismo']),
      statusPagamento: 'Pago',
      formaPagamento: 'Cartão de Crédito',
      multa: 40,
    })
    await garantirDevolucao(db, avariada, isoData(-16), 'Danificado', 'Quadro arranhado na devolução.')
    await garantirManutencao(
      db,
      porNome('Bicicleta Gravel').id,
      fornecedores[0] ?? null,
      'Revisão do quadro após devolução com avaria',
      isoData(-16),
    )

    // Reserva vencida sem devolução: aparece em devoluções pendentes/atrasadas.
    await garantirReserva(db, {
      clienteId: clientes[2],
      inicio: isoData(-12),
      fim: isoData(-10),
      status: 'Confirmada',
      itens: itens(['Caiaque Inflável Duplo', 'Remo de Caiaque', 'Colete Salva-vidas']),
      statusPagamento: 'Pendente',
      formaPagamento: 'Pix',
      multa: 0,
    })

    // Reservas futuras: confirmada, pendente e cancelada.
    await garantirReserva(db, {
      clienteId: clientes[3],
      inicio: isoData(5),
      fim: isoData(8),
      status: 'Confirmada',
      itens: itens(['Prancha Stand Up Paddle', 'Remo Ajustável para SUP']),
      statusPagamento: 'Pendente',
      formaPagamento: 'Pix',
      multa: 0,
    })
    await garantirReserva(db, {
      clienteId: clientes[4],
      inicio: isoData(15),
      fim: isoData(17),
      status: 'Pendente',
      itens: itens(['Barraca 4 Pessoas', 'Saco de Dormir', 'Lanterna Recarregável']),
      statusPagamento: 'Pendente',
      formaPagamento: 'Dinheiro',
      multa: 0,
    })
    await garantirReserva(db, {
      clienteId: clientes[5],
      inicio: isoData(2),
      fim: isoData(3),
      status: 'Cancelada',
      itens: itens(['Bicicleta Urbana']),
      statusPagamento: 'Estornado',
      formaPagamento: 'Pix',
      multa: 0,
    })

    const senhaHash = await exigir('servicos/SenhaHash.js').gerarHash(
      process.env.SEED_DEMO_SENHA?.trim() || 'Demo@2026',
    )
    const adminId = await garantirUsuario(db, senhaHash, {
      nome: 'Administrador Demo',
      login: 'demo.admin',
      perfil: 'Administrador',
    })
    await garantirUsuario(db, senhaHash, {
      nome: 'Atendente Demo',
      login: 'demo.atendente',
      perfil: 'Atendente',
    })
    const clienteUserId = await garantirUsuario(db, senhaHash, {
      nome: 'Cliente Demo',
      login: 'demo.cliente',
      perfil: 'Cliente',
    })
    if (clienteUserId !== null) {
      await db.execute(
        `UPDATE cliente SET id_usuario = ?
          WHERE id_cliente = ? AND (id_usuario IS NULL OR id_usuario = ?)`,
        [clienteUserId, clientes[0], clienteUserId],
      )
    }

    await db.commit()
    return {
      fornecedores: fornecedores.length,
      clientes: clientes.length,
      equipamentos: equipamentos.length,
      usuarios: adminId === null ? 2 : 3,
    }
  } catch (erro) {
    await db.rollback()
    throw erro
  }
}

async function main() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('O seed só pode ser executado em desenvolvimento.')
  }

  const arquivoEnv = path.join(process.cwd(), '.env')
  if (existsSync(arquivoEnv)) process.loadEnvFile(arquivoEnv)

  const { ConexaoBanco } = exigir('banco/ConexaoBanco.js')
  const { lerConfiguracaoBanco } = exigir('banco/ConfiguracaoBanco.js')
  const { Migrador } = exigir('banco/Migrador.js')
  const { MIGRACOES } = exigir('banco/migracoes/index.js')

  const conexao = new ConexaoBanco(lerConfiguracaoBanco())
  const cliente = await conexao.obterCliente()
  try {
    await new Migrador(cliente.cliente, MIGRACOES).aplicarPendentes()
    const contadores = await semear(cliente.cliente)
    console.log(
      `Seed concluído: ${contadores.fornecedores} fornecedores, ` +
        `${contadores.clientes} clientes, ${contadores.equipamentos} equipamentos, ` +
        `${contadores.usuarios} usuários demo e 6 reservas.`,
    )
  } finally {
    cliente.liberar()
    await conexao.fechar()
  }
}

main().catch(() => {
  // Mensagem genérica de propósito: nunca ecoar env, CPF, senha ou hash.
  console.error('Falha no seed. Verifique .env, o banco local e os logs do MySQL.')
  process.exitCode = 1
})
