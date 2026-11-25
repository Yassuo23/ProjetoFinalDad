import type { ClienteMigracao, Migracao } from '../Migrador'

/**
 * Schema operacional completo do aluguel.
 *
 * Além do dicionário de dados fornecido, toda tabela mutável recebe
 * `atualizado_em` (auditado automaticamente pelo MySQL) e `ativo` para
 * soft delete — a UI nunca remove registros com histórico.
 */
export const migracaoLocacao: Migracao = {
  id: 2,
  nome: '002-locacao',
  async aplicar(db: ClienteMigracao): Promise<void> {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS fornecedor (
        id_fornecedor INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(150) NOT NULL,
        cnpj VARCHAR(20) NOT NULL UNIQUE,
        telefone VARCHAR(20) NULL,
        email VARCHAR(100) NULL,
        tipo VARCHAR(50) NULL,
        ativo TINYINT(1) NOT NULL DEFAULT 1,
        atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_fornecedor_nome (nome),
        INDEX idx_fornecedor_tipo (tipo)
      ) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4
    `)

    await db.execute(`
      CREATE TABLE IF NOT EXISTS cliente (
        id_cliente INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(150) NOT NULL,
        cpf VARCHAR(14) NOT NULL UNIQUE,
        telefone VARCHAR(20) NULL,
        email VARCHAR(100) NULL,
        cep VARCHAR(10) NULL,
        logradouro VARCHAR(150) NULL,
        numero VARCHAR(20) NULL,
        complemento VARCHAR(50) NULL,
        bairro VARCHAR(100) NULL,
        cidade VARCHAR(100) NULL,
        uf CHAR(2) NULL,
        ativo TINYINT(1) NOT NULL DEFAULT 1,
        atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_cliente_nome (nome),
        INDEX idx_cliente_cidade (cidade)
      ) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4
    `)

    await db.execute(`
      CREATE TABLE IF NOT EXISTS equipamento (
        id_equipamento INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(150) NOT NULL,
        categoria VARCHAR(50) NOT NULL,
        estado_conservacao VARCHAR(50) NOT NULL,
        id_fornecedor INT NULL,
        ativo TINYINT(1) NOT NULL DEFAULT 1,
        atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_equipamento_nome (nome),
        INDEX idx_equipamento_categoria (categoria),
        INDEX idx_equipamento_estado (estado_conservacao),
        CONSTRAINT fk_equipamento_fornecedor
          FOREIGN KEY (id_fornecedor) REFERENCES fornecedor (id_fornecedor)
          ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4
    `)

    await db.execute(`
      CREATE TABLE IF NOT EXISTS reserva (
        id_reserva INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        id_cliente INT NOT NULL,
        data_reserva TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        data_inicio DATE NOT NULL,
        data_fim DATE NOT NULL,
        status_reserva VARCHAR(50) NOT NULL DEFAULT 'Pendente',
        previsao_tempo TEXT NULL,
        ativo TINYINT(1) NOT NULL DEFAULT 1,
        atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_reserva_cliente (id_cliente),
        INDEX idx_reserva_status (status_reserva),
        INDEX idx_reserva_periodo (data_inicio, data_fim),
        CONSTRAINT fk_reserva_cliente
          FOREIGN KEY (id_cliente) REFERENCES cliente (id_cliente)
          ON DELETE RESTRICT ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4
    `)

    await db.execute(`
      CREATE TABLE IF NOT EXISTS item_reserva (
        id_reserva INT NOT NULL,
        id_equipamento INT NOT NULL,
        valor_diaria DECIMAL(10,2) NOT NULL,
        PRIMARY KEY (id_reserva, id_equipamento),
        INDEX idx_item_reserva_equipamento (id_equipamento),
        CONSTRAINT fk_item_reserva_reserva
          FOREIGN KEY (id_reserva) REFERENCES reserva (id_reserva)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_item_reserva_equipamento
          FOREIGN KEY (id_equipamento) REFERENCES equipamento (id_equipamento)
          ON DELETE RESTRICT ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4
    `)

    await db.execute(`
      CREATE TABLE IF NOT EXISTS pagamento (
        id_pagamento INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        id_reserva INT NOT NULL,
        valor_base DECIMAL(10,2) NOT NULL,
        valor_multa DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        valor_total DECIMAL(10,2) NOT NULL,
        forma_pagamento VARCHAR(50) NULL,
        status_pagamento VARCHAR(50) NOT NULL DEFAULT 'Pendente',
        data_pagamento TIMESTAMP NULL DEFAULT NULL,
        ativo TINYINT(1) NOT NULL DEFAULT 1,
        atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_pagamento_reserva (id_reserva),
        INDEX idx_pagamento_status (status_pagamento),
        CONSTRAINT fk_pagamento_reserva
          FOREIGN KEY (id_reserva) REFERENCES reserva (id_reserva)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4
    `)

    await db.execute(`
      CREATE TABLE IF NOT EXISTS devolucao (
        id_devolucao INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        id_reserva INT NOT NULL UNIQUE,
        data_devolucao_efetiva TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        estado_pos_uso VARCHAR(50) NOT NULL,
        observacoes TEXT NULL,
        ativo TINYINT(1) NOT NULL DEFAULT 1,
        atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_devolucao_reserva
          FOREIGN KEY (id_reserva) REFERENCES reserva (id_reserva)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4
    `)
  },
}
