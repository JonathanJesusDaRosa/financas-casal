import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import Marca from '../components/Marca.jsx';

export default function Login() {
  const { entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento) {
    evento.preventDefault(); // impede o navegador de recarregar a página
    setErro('');
    setEnviando(true);
    try {
      await entrar(email, senha); // se der certo, o App leva para o início
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  return (
    <main className="tela-entrada">
      <Marca />

      <form className="formulario" onSubmit={aoEnviar}>
        <label className="campo">
          E-mail
          <input type="email" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <label className="campo">
          Senha
          <input type="password" autoComplete="current-password" required
            value={senha} onChange={(e) => setSenha(e.target.value)} />
        </label>

        {erro && <p className="erro" role="alert">{erro}</p>}

        <button type="submit" className="botao" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <p className="rodape-entrada">
        Ainda não tem conta? <Link to="/cadastro">Criar conta</Link>
      </p>
    </main>
  );
}
