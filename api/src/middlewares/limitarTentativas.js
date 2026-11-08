// Limita quantas vezes o mesmo aparelho (IP) pode tentar uma ação sensível.
// Ex.: no máximo 10 tentativas de login a cada 15 minutos.
// Sem isso, alguém poderia testar milhares de senhas ou códigos de convite.
//
// Observação: na Vercel a API roda em "funções" que podem ter mais de uma cópia
// ao mesmo tempo, e cada cópia conta separado. Ainda assim, dificulta muito
// um ataque automático. (Para contar tudo junto seria preciso um Redis.)
import { rateLimit } from 'express-rate-limit';

export function limitarTentativas({ maximo, minutos, mensagem }) {
  return rateLimit({
    windowMs: minutos * 60 * 1000,
    limit: maximo,
    standardHeaders: 'draft-8', // informa ao app quantas tentativas restam
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ erro: mensagem }),
    // Só vale no app publicado (a Vercel define NODE_ENV=production).
    // No computador fica desligado para não atrapalhar testes.
    skip: () => process.env.NODE_ENV !== 'production',
  });
}

export const limiteLogin = limitarTentativas({
  maximo: 10,
  minutos: 15,
  mensagem: 'Muitas tentativas de login. Espere 15 minutos e tente de novo.',
});

export const limiteCadastro = limitarTentativas({
  maximo: 5,
  minutos: 60,
  mensagem: 'Muitos cadastros feitos daqui. Tente de novo em 1 hora.',
});

export const limiteConvite = limitarTentativas({
  maximo: 10,
  minutos: 15,
  mensagem: 'Muitas tentativas de código. Espere 15 minutos e tente de novo.',
});
