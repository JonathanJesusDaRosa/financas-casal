// Segundo "porteiro": usar SEMPRE depois do autenticar.
// Descobre o casal de quem está logado e guarda em req.casalId e req.papel.
// Toda consulta de dados do casal deve filtrar por req.casalId — é isso que
// garante que um casal nunca vê os dados de outro.
import { prisma } from '../lib/prisma.js';

export async function exigirCasal(req, res, next) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuarioId },
    select: { casalId: true, papel: true },
  });

  if (!usuario?.casalId) {
    return res.status(403).json({ erro: 'Você ainda não faz parte de um espaço do casal.' });
  }

  req.casalId = usuario.casalId;
  req.papel = usuario.papel;
  next();
}
