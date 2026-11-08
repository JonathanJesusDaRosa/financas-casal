// Tela para quem ainda não tem casal: criar o espaço ou entrar com um código.
import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function Espaco() {
  const { usuario, atualizarUsuario, sair } = useAuth();
  const [modo, setModo] = useState('criar'); // 'criar' ou 'entrar'
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const { casal } =
        modo === 'criar'
          ? await api('/casal', { metodo: 'POST', corpo: { nome } })
          : await api('/casal/entrar', { metodo: 'POST', corpo: { codigo } });
      // Ao ganhar um casalId, o App leva automaticamente para o início.
      atualizarUsuario({ casalId: casal.id, papel: 'TITULAR' });
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  function trocarModo(novoModo) {
    setModo(novoModo);
    setErro('');
  }

  return (
    <main className="tela-auth">
      <h1>Finanças do Casal</h1>

      <div className="cartao">
        <h2>Olá, {usuario.nome}!</h2>
        <p className="dica">
          Para começar, crie o espaço de vocês ou entre com o código que seu par enviou.
        </p>

        {/* Abas: criar / entrar */}
        <div className="abas" role="tablist">
          <button type="button" role="tab" aria-selected={modo === 'criar'}
            className={modo === 'criar' ? 'ativa' : ''} onClick={() => trocarModo('criar')}>
            Criar espaço
          </button>
          <button type="button" role="tab" aria-selected={modo === 'entrar'}
            className={modo === 'entrar' ? 'ativa' : ''} onClick={() => trocarModo('entrar')}>
            Tenho um código
          </button>
        </div>

        <form className="formulario" onSubmit={aoEnviar}>
          {modo === 'criar' ? (
            <label>
              Nome do espaço
              <input type="text" required maxLength={60} placeholder={`${usuario.nome} & …`}
                value={nome} onChange={(e) => setNome(e.target.value)} />
            </label>
          ) : (
            <label>
              Código de convite
              <input type="text" required placeholder="K7M-4QX" autoCapitalize="characters"
                autoComplete="off" maxLength={9} className="campo-codigo"
                value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} />
            </label>
          )}

          {erro && <p className="erro" role="alert">{erro}</p>}

          <button type="submit" disabled={enviando}>
            {enviando ? 'Aguarde…' : modo === 'criar' ? 'Criar nosso espaço' : 'Entrar no espaço'}
          </button>
        </form>
      </div>

      <p className="rodape">
        <button type="button" className="link" onClick={sair}>Sair da conta</button>
      </p>
    </main>
  );
}
