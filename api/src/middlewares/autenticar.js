// "Porteiro": só deixa passar quem mandar um token válido no cabeçalho
//   Authorization: Bearer <token>
// Se o token for válido, guarda o id do usuário em req.usuarioId.
import jwt from 'jsonwebtoken';

export function autenticar(req, res, next) {
  const [tipo, token] = (req.headers.authorization || '').split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'Faça login para continuar.' });
  }

  try {
    const dados = jwt.verify(token, process.env.JWT_SECRET);
    req.usuarioId = Number(dados.sub);
    next();
  } catch {
    // token alterado, assinado com outra chave ou vencido
    return res.status(401).json({ erro: 'Sua sessão expirou. Faça login de novo.' });
  }
}
