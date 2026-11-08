// Guarda "quem está logado" num lugar que qualquer tela consegue ler
// (Context do React), e oferece entrar(), cadastrar() e sair().
import { createContext, useContext, useEffect, useState } from 'react';
import { api, token } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  // Enquanto confere o token salvo, não sabemos se a pessoa está logada.
  const [carregando, setCarregando] = useState(Boolean(token.ler()));

  // Ao abrir o app: se já existe token, pergunta à API quem é.
  useEffect(() => {
    if (!token.ler()) return;
    api('/auth/eu')
      .then((dados) => setUsuario(dados.usuario))
      .catch(() => token.apagar()) // token vencido ou inválido
      .finally(() => setCarregando(false));
  }, []);

  function guardarSessao(dados) {
    token.salvar(dados.token);
    setUsuario(dados.usuario);
  }

  async function entrar(email, senha) {
    guardarSessao(await api('/auth/login', { metodo: 'POST', corpo: { email, senha } }));
  }

  async function cadastrar(nome, email, senha) {
    guardarSessao(await api('/auth/cadastro', { metodo: 'POST', corpo: { nome, email, senha } }));
  }

  function sair() {
    token.apagar();
    setUsuario(null);
  }

  // Atualiza só alguns campos do usuário (ex.: depois de entrar num casal).
  function atualizarUsuario(campos) {
    setUsuario((atual) => ({ ...atual, ...campos }));
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, entrar, cadastrar, sair, atualizarUsuario }}>
      {children}
    </AuthContext.Provider>
  );
}

// Uso em qualquer tela: const { usuario, sair } = useAuth();
// eslint-disable-next-line react/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
