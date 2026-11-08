import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import Marca from '../components/Marca.jsx';

export default function Cadastro() {
  const { cadastrar } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await cadastrar(nome, email, senha); // já entra logado
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  return (
    <main className="tela-entrada">
      <Marca tagline={false} />

      <form className="formulario" onSubmit={aoEnviar}>
        <h1>Criar conta</h1>

        <label className="campo">
          Nome
          <input type="text" autoComplete="given-name" required
            value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>

        <label className="campo">
          E-mail
          <input type="email" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <label className="campo">
          <span>Senha <small>Mínimo de 8 caracteres</small></span>
          <input type="password" autoComplete="new-password" required minLength={8} maxLength={72}
            value={senha} onChange={(e) => setSenha(e.target.value)} />
        </label>

        {erro && <p className="erro" role="alert">{erro}</p>}

        <button type="submit" className="botao" disabled={enviando}>
          {enviando ? 'Criando conta…' : 'Criar conta'}
        </button>
      </form>

      <p className="rodape-entrada">
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </main>
  );
}
