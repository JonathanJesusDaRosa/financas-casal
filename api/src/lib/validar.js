// Ajudantes de validação reaproveitados pelas rotas.
import { z } from 'zod';

// Valida "dados" com o schema do zod. Se falhar, já responde 400 com a
// primeira mensagem de erro e devolve null. Se der certo, devolve os dados limpos.
export function validar(schema, dados, res) {
  const resultado = schema.safeParse(dados ?? {});
  if (!resultado.success) {
    res.status(400).json({ erro: resultado.error.issues[0].message });
    return null;
  }
  return resultado.data;
}

// Id numérico vindo da URL (ex.: /lancamentos/42).
export const idSchema = z.coerce
  .number({ error: 'Id inválido.' })
  .int({ error: 'Id inválido.' })
  .positive({ error: 'Id inválido.' });

// Data no formato "AAAA-MM-DD" que exista de verdade (recusa 2026-02-30).
export const dataSchema = z
  .string({ error: 'Informe a data.' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Data inválida.' })
  .refine((texto) => paraData(texto).toISOString().slice(0, 10) === texto, {
    error: 'Data inválida.',
  });

// Nome de ícone (ex.: "carrinho"). A lista de ícones existentes fica no front;
// aqui só garantimos um texto curto e simples.
export const iconeSchema = z
  .string()
  .regex(/^[a-z0-9-]{1,30}$/, { error: 'Ícone inválido.' })
  .nullish()
  .transform((t) => t || null);

// Mês no formato "AAAA-MM".
export const mesSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: 'Mês inválido. Use o formato AAAA-MM.' });

// "2026-11-08" -> Date à meia-noite UTC. Usar UTC evita o bug do fuso horário
// (no Brasil, meia-noite UTC ainda é o dia anterior às 21h).
export function paraData(texto) {
  return new Date(`${texto}T00:00:00Z`);
}

// Date -> "2026-11-08"
export function paraTexto(data) {
  return data.toISOString().slice(0, 10);
}
