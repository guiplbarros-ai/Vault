-- Seed de Categorias Padrão para Cortex Ledger
-- Execute este script no SQL Editor do Supabase após estar logado na aplicação
-- IMPORTANTE: Substitua 'SEU_USER_ID_AQUI' pelo seu ID de usuário

-- Para obter seu user_id, execute primeiro:
-- SELECT id, email FROM auth.users WHERE email = 'seu-email@exemplo.com';

-- Depois substitua abaixo e execute:

-- ============================================
-- CATEGORIAS DE DESPESAS
-- ============================================

-- 🏠 MORADIA
INSERT INTO categoria (user_id, grupo, nome, ativa, ordem) VALUES
('SEU_USER_ID_AQUI', 'Moradia', 'Aluguel', true, 1),
('SEU_USER_ID_AQUI', 'Moradia', 'Condomínio', true, 2),
('SEU_USER_ID_AQUI', 'Moradia', 'IPTU', true, 3),
('SEU_USER_ID_AQUI', 'Moradia', 'Energia Elétrica', true, 4),
('SEU_USER_ID_AQUI', 'Moradia', 'Água', true, 5),
('SEU_USER_ID_AQUI', 'Moradia', 'Gás', true, 6),
('SEU_USER_ID_AQUI', 'Moradia', 'Internet', true, 7),
('SEU_USER_ID_AQUI', 'Moradia', 'Telefone/Celular', true, 8),
('SEU_USER_ID_AQUI', 'Moradia', 'TV/Streaming', true, 9),
('SEU_USER_ID_AQUI', 'Moradia', 'Manutenção', true, 10),
('SEU_USER_ID_AQUI', 'Moradia', 'Móveis e Decoração', true, 11);

-- 🍔 ALIMENTAÇÃO
INSERT INTO categoria (user_id, grupo, nome, ativa, ordem) VALUES
('SEU_USER_ID_AQUI', 'Alimentação', 'Supermercado', true, 20),
('SEU_USER_ID_AQUI', 'Alimentação', 'Feira', true, 21),
('SEU_USER_ID_AQUI', 'Alimentação', 'Padaria', true, 22),
('SEU_USER_ID_AQUI', 'Alimentação', 'Restaurantes', true, 23),
('SEU_USER_ID_AQUI', 'Alimentação', 'Lanches/Fast Food', true, 24),
('SEU_USER_ID_AQUI', 'Alimentação', 'Delivery', true, 25),
('SEU_USER_ID_AQUI', 'Alimentação', 'Bebidas/Bar', true, 26),
('SEU_USER_ID_AQUI', 'Alimentação', 'Cafeteria', true, 27);

-- 🚗 TRANSPORTE
INSERT INTO categoria (user_id, grupo, nome, ativa, ordem) VALUES
('SEU_USER_ID_AQUI', 'Transporte', 'Combustível', true, 30),
('SEU_USER_ID_AQUI', 'Transporte', 'Transporte Público', true, 31),
('SEU_USER_ID_AQUI', 'Transporte', 'Uber/Taxi', true, 32),
('SEU_USER_ID_AQUI', 'Transporte', 'Estacionamento', true, 33),
('SEU_USER_ID_AQUI', 'Transporte', 'Pedágio', true, 34),
('SEU_USER_ID_AQUI', 'Transporte', 'Manutenção Veículo', true, 35),
('SEU_USER_ID_AQUI', 'Transporte', 'IPVA', true, 36),
('SEU_USER_ID_AQUI', 'Transporte', 'Seguro Veículo', true, 37),
('SEU_USER_ID_AQUI', 'Transporte', 'Financiamento Veículo', true, 38),
('SEU_USER_ID_AQUI', 'Transporte', 'Multas', true, 39);

-- 💊 SAÚDE
INSERT INTO categoria (user_id, grupo, nome, ativa, ordem) VALUES
('SEU_USER_ID_AQUI', 'Saúde', 'Plano de Saúde', true, 40),
('SEU_USER_ID_AQUI', 'Saúde', 'Médico', true, 41),
('SEU_USER_ID_AQUI', 'Saúde', 'Dentista', true, 42),
('SEU_USER_ID_AQUI', 'Saúde', 'Farmácia/Medicamentos', true, 43),
('SEU_USER_ID_AQUI', 'Saúde', 'Exames', true, 44),
('SEU_USER_ID_AQUI', 'Saúde', 'Psicólogo/Terapia', true, 45),
('SEU_USER_ID_AQUI', 'Saúde', 'Academia', true, 46),
('SEU_USER_ID_AQUI', 'Saúde', 'Suplementos', true, 47);

-- 📚 EDUCAÇÃO
INSERT INTO categoria (user_id, grupo, nome, ativa, ordem) VALUES
('SEU_USER_ID_AQUI', 'Educação', 'Mensalidade Escolar', true, 50),
('SEU_USER_ID_AQUI', 'Educação', 'Faculdade/Pós', true, 51),
('SEU_USER_ID_AQUI', 'Educação', 'Cursos', true, 52),
('SEU_USER_ID_AQUI', 'Educação', 'Material Escolar', true, 53),
('SEU_USER_ID_AQUI', 'Educação', 'Livros', true, 54),
('SEU_USER_ID_AQUI', 'Educação', 'Idiomas', true, 55);

-- 👕 VESTUÁRIO
INSERT INTO categoria (user_id, grupo, nome, ativa, ordem) VALUES
('SEU_USER_ID_AQUI', 'Vestuário', 'Roupas', true, 60),
('SEU_USER_ID_AQUI', 'Vestuário', 'Calçados', true, 61),
('SEU_USER_ID_AQUI', 'Vestuário', 'Acessórios', true, 62),
('SEU_USER_ID_AQUI', 'Vestuário', 'Lavanderia', true, 63);

-- 🎭 LAZER
INSERT INTO categoria (user_id, grupo, nome, ativa, ordem) VALUES
('SEU_USER_ID_AQUI', 'Lazer', 'Cinema', true, 70),
('SEU_USER_ID_AQUI', 'Lazer', 'Shows/Eventos', true, 71),
('SEU_USER_ID_AQUI', 'Lazer', 'Viagens', true, 72),
('SEU_USER_ID_AQUI', 'Lazer', 'Hotéis', true, 73),
('SEU_USER_ID_AQUI', 'Lazer', 'Passagens Aéreas', true, 74),
('SEU_USER_ID_AQUI', 'Lazer', 'Hobbies', true, 75),
('SEU_USER_ID_AQUI', 'Lazer', 'Games/Apps', true, 76),
('SEU_USER_ID_AQUI', 'Lazer', 'Assinaturas Digitais', true, 77),
('SEU_USER_ID_AQUI', 'Lazer', 'Esportes', true, 78);

-- 💄 CUIDADOS PESSOAIS
INSERT INTO categoria (user_id, grupo, nome, ativa, ordem) VALUES
('SEU_USER_ID_AQUI', 'Cuidados Pessoais', 'Cabelo/Barbeiro', true, 80),
('SEU_USER_ID_AQUI', 'Cuidados Pessoais', 'Estética', true, 81),
('SEU_USER_ID_AQUI', 'Cuidados Pessoais', 'Cosméticos', true, 82),
('SEU_USER_ID_AQUI', 'Cuidados Pessoais', 'Perfumes', true, 83);

-- 🐕 PETS
INSERT INTO categoria (user_id, grupo, nome, ativa, ordem) VALUES
('SEU_USER_ID_AQUI', 'Pets', 'Alimentação Pet', true, 90),
('SEU_USER_ID_AQUI', 'Pets', 'Veterinário', true, 91),
('SEU_USER_ID_AQUI', 'Pets', 'Pet Shop', true, 92),
('SEU_USER_ID_AQUI', 'Pets', 'Plano de Saúde Pet', true, 93);

-- 🏦 FINANÇAS
INSERT INTO categoria (user_id, grupo, nome, ativa, ordem) VALUES
('SEU_USER_ID_AQUI', 'Finanças', 'Empréstimos', true, 100),
('SEU_USER_ID_AQUI', 'Finanças', 'Financiamentos', true, 101),
('SEU_USER_ID_AQUI', 'Finanças', 'Cartão de Crédito', true, 102),
('SEU_USER_ID_AQUI', 'Finanças', 'Tarifas Bancárias', true, 103),
('SEU_USER_ID_AQUI', 'Finanças', 'Seguros', true, 104),
('SEU_USER_ID_AQUI', 'Finanças', 'Investimentos', true, 105),
('SEU_USER_ID_AQUI', 'Finanças', 'Previdência Privada', true, 106),
('SEU_USER_ID_AQUI', 'Finanças', 'IOF', true, 107),
('SEU_USER_ID_AQUI', 'Finanças', 'Multas/Juros', true, 108);

-- 💻 TECNOLOGIA
INSERT INTO categoria (user_id, grupo, nome, ativa, ordem) VALUES
('SEU_USER_ID_AQUI', 'Tecnologia', 'Eletrônicos', true, 110),
('SEU_USER_ID_AQUI', 'Tecnologia', 'Software/Apps', true, 111),
('SEU_USER_ID_AQUI', 'Tecnologia', 'Cloud/Servidores', true, 112),
('SEU_USER_ID_AQUI', 'Tecnologia', 'Manutenção Tech', true, 113);

-- 👨‍👩‍👧 FAMÍLIA
INSERT INTO categoria (user_id, grupo, nome, ativa, ordem) VALUES
('SEU_USER_ID_AQUI', 'Família', 'Pensão Alimentícia', true, 120),
('SEU_USER_ID_AQUI', 'Família', 'Presentes', true, 121),
('SEU_USER_ID_AQUI', 'Família', 'Festas', true, 122),
('SEU_USER_ID_AQUI', 'Família', 'Babá/Creche', true, 123),
('SEU_USER_ID_AQUI', 'Família', 'Fraldas/Bebê', true, 124);

-- 💼 TRABALHO
INSERT INTO categoria (user_id, grupo, nome, ativa, ordem) VALUES
('SEU_USER_ID_AQUI', 'Trabalho', 'Material de Escritório', true, 130),
('SEU_USER_ID_AQUI', 'Trabalho', 'Equipamentos', true, 131),
('SEU_USER_ID_AQUI', 'Trabalho', 'Vestuário Profissional', true, 132),
('SEU_USER_ID_AQUI', 'Trabalho', 'Almoço Trabalho', true, 133);

-- 💝 DOAÇÕES
INSERT INTO categoria (user_id, grupo, nome, ativa, ordem) VALUES
('SEU_USER_ID_AQUI', 'Doações', 'Caridade', true, 140),
('SEU_USER_ID_AQUI', 'Doações', 'Igreja/Religião', true, 141),
('SEU_USER_ID_AQUI', 'Doações', 'ONGs', true, 142);

-- 📋 IMPOSTOS
INSERT INTO categoria (user_id, grupo, nome, ativa, ordem) VALUES
('SEU_USER_ID_AQUI', 'Impostos', 'IRPF', true, 150),
('SEU_USER_ID_AQUI', 'Impostos', 'ISS', true, 151),
('SEU_USER_ID_AQUI', 'Impostos', 'Outros Impostos', true, 152);

-- ❓ OUTROS
INSERT INTO categoria (user_id, grupo, nome, ativa, ordem) VALUES
('SEU_USER_ID_AQUI', 'Outros', 'Diversos', true, 200),
('SEU_USER_ID_AQUI', 'Outros', 'Não Categorizado', true, 201);

-- ============================================
-- CATEGORIAS DE RECEITAS
-- ============================================

-- 💰 RECEITAS
INSERT INTO categoria (user_id, grupo, nome, ativa, ordem) VALUES
('SEU_USER_ID_AQUI', 'Receitas', 'Salário', true, 300),
('SEU_USER_ID_AQUI', 'Receitas', 'Freelance', true, 301),
('SEU_USER_ID_AQUI', 'Receitas', 'Bônus', true, 302),
('SEU_USER_ID_AQUI', 'Receitas', '13º Salário', true, 303),
('SEU_USER_ID_AQUI', 'Receitas', 'Férias', true, 304),
('SEU_USER_ID_AQUI', 'Receitas', 'PLR/Participação', true, 305),
('SEU_USER_ID_AQUI', 'Receitas', 'Rendimentos Investimentos', true, 306),
('SEU_USER_ID_AQUI', 'Receitas', 'Dividendos', true, 307),
('SEU_USER_ID_AQUI', 'Receitas', 'Aluguel Recebido', true, 308),
('SEU_USER_ID_AQUI', 'Receitas', 'Venda de Bens', true, 309),
('SEU_USER_ID_AQUI', 'Receitas', 'Reembolso', true, 310),
('SEU_USER_ID_AQUI', 'Receitas', 'Cashback', true, 311),
('SEU_USER_ID_AQUI', 'Receitas', 'Prêmios', true, 312),
('SEU_USER_ID_AQUI', 'Receitas', 'Pensão Recebida', true, 313),
('SEU_USER_ID_AQUI', 'Receitas', 'Outras Receitas', true, 314);

-- ============================================
-- TRANSFERÊNCIAS
-- ============================================

-- 🔄 TRANSFERÊNCIAS
INSERT INTO categoria (user_id, grupo, nome, ativa, ordem) VALUES
('SEU_USER_ID_AQUI', 'Transferências', 'Entre Contas', true, 400),
('SEU_USER_ID_AQUI', 'Transferências', 'Pagamento de Fatura', true, 401),
('SEU_USER_ID_AQUI', 'Transferências', 'Aplicação em Investimentos', true, 402),
('SEU_USER_ID_AQUI', 'Transferências', 'Resgate de Investimentos', true, 403);

-- ============================================
-- OBSERVAÇÕES
-- ============================================

-- TOTAL: ~110 categorias organizadas em 17 grupos principais
--
-- Para usar, substitua 'SEU_USER_ID_AQUI' pelo seu user_id real
-- Você pode obter seu user_id com:
-- SELECT id FROM auth.users WHERE email = 'seu-email@exemplo.com';
