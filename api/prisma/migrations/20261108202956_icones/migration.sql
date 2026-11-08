-- AlterTable
ALTER TABLE "Categoria" ADD COLUMN     "icone" TEXT;


-- Ícones das categorias padrão (pelo nome)
UPDATE "Categoria" SET "icone" = CASE "nome"
  WHEN 'Mercado' THEN 'carrinho'
  WHEN 'Transporte' THEN 'carro'
  WHEN 'Moradia' THEN 'casa'
  WHEN 'Lazer' THEN 'lazer'
  WHEN 'Saúde' THEN 'saude'
  WHEN 'Salário' THEN 'salario'
  ELSE 'etiqueta'
END;

-- Caixinhas: troca os emojis antigos por nomes de ícone
UPDATE "Caixinha" SET "icone" = CASE "icone"
  WHEN '🏖️' THEN 'praia'
  WHEN '✈️' THEN 'aviao'
  WHEN '🏠' THEN 'casa'
  WHEN '🚗' THEN 'carro'
  WHEN '💍' THEN 'anel'
  WHEN '🎓' THEN 'educacao'
  WHEN '👶' THEN 'bebe'
  WHEN '🐶' THEN 'pet'
  WHEN '🎁' THEN 'presente'
  WHEN '🛟' THEN 'reserva'
  WHEN '💻' THEN 'computador'
  WHEN '💰' THEN 'cofrinho'
  ELSE 'cofrinho'
END;
