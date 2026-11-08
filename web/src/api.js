// Ajudante para conversar com a API.
// Envia o token automaticamente e transforma respostas de erro em exceções.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';
const CHAVE_TOKEN = 'financas-casal:token';

export const token = {
  ler: () => localStorage.getItem(CHAVE_TOKEN),
  salvar: (valor) => localStorage.setItem(CHAVE_TOKEN, valor),
  apagar: () => localStorage.removeItem(CHAVE_TOKEN),
};

// Exemplo: await api('/auth/login', { metodo: 'POST', corpo: { email, senha } })
export async function api(caminho, { metodo = 'GET', corpo } = {}) {
  const cabecalhos = { 'Content-Type': 'application/json' };
  const tokenAtual = token.ler();
  if (tokenAtual) cabecalhos.Authorization = `Bearer ${tokenAtual}`;

  let resposta;
  try {
    resposta = await fetch(API_URL + caminho, {
      method: metodo,
      headers: cabecalhos,
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new Error('Não foi possível falar com o servidor. Verifique sua internet.');
  }

  const dados = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    const erro = new Error(dados.erro || 'Algo deu errado. Tente de novo.');
    erro.status = resposta.status;
    throw erro;
  }
  return dados;
}
