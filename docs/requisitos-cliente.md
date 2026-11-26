"Tenho uma loja que aluga equipamento esportivo – bicicleta, caiaque, prancha, equipamento de camping. Preciso cadastrar os equipamentos (com o estado de cada um), os clientes, as reservas e devoluções, e os fornecedores de quem eu compro e mando pra manutenção. Preciso saber quais itens estão disponíveis em cada data e controlar os pagamentos e eventuais multas por atraso na devolução. Como muita gente aluga pra atividade ao ar livre, seria excelente mostrar a previsão do tempo do dia da reserva na hora de confirmar. Também preciso buscar o CEP do cliente pra cadastro rápido de endereço."
PREMISSAS ADOTADAS

- Cobrança por dia, com diária definida por equipamento; sem desconto por período.
- Multa por atraso: valor fixo por dia, configurável (MULTA_DIARIA_VALOR), sem
  tolerância em horas e sem teto. Domingos e feriados nacionais não contam como dia de
  atraso.
- Cada unidade física é um registro de equipamento, com estado de conservação próprio.
- Fornecedores: cadastro e envio de itens para manutenção; compras não são registradas.
- Perfis: administrador (acesso total) e atendente (clientes, reservas, devoluções e
  pagamentos, sem excluir cadastros).
- Pagamentos em Pix, cartão e dinheiro, sem caução.
- Equipamento em manutenção fica indisponível para reserva.
- Cancelamento altera o status da reserva, sem reembolso automático.
- Cliente: nome, CPF, telefone e endereço (preenchido por CEP).
