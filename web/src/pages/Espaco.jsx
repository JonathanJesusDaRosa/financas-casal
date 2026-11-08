// Para quem ainda não está numa casa: criar a casa ou entrar com um código de convite.
import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import Marca from '../components/Marca.jsx';

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
    <main className="tela-entrada">
      <Marca tagline={false} />

      <h1>Olá, {usuario.nome}</h1>
      <p className="muted" style={{ margin: 'var(--space-2) 0 var(--space-6)' }}>
        Crie a sua casa ou entre com o código que um membro enviou.
      </p>

      <div className="segmentado" role="tablist">
        <button type="button" role="tab" aria-selected={modo === 'criar'}
          className={modo === 'criar' ? 'ativo' : ''} onClick={() => trocarModo('criar')}>
          Criar casa
        </button>
        <button type="button" role="tab" aria-selected={modo === 'entrar'}
          className={modo === 'entrar' ? 'ativo' : ''} onClick={() => trocarModo('entrar')}>
          Tenho um código
        </button>
      </div>

      <form className="formulario" style={{ marginTop: 'var(--space-6)' }} onSubmit={aoEnviar}>
        {modo === 'criar' ? (
          <label className="campo">
            Nome da casa
            <input type="text" required maxLength={60} placeholder="Ex.: Casa da Rua das Flores"
              value={nome} onChange={(e) => setNome(e.target.value)} />
          </label>
        ) : (
          <label className="campo">
            Código de convite
            <input type="text" required placeholder="K7M-4QX" autoCapitalize="characters"
              autoComplete="off" maxLength={9} className="campo-valor" style={{ textAlign: 'center', letterSpacing: '4px' }}
              value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} />
          </label>
        )}

        {erro && <p className="erro" role="alert">{erro}</p>}

        <button type="submit" className="botao" disabled={enviando}>
          {enviando ? 'Aguarde…' : modo === 'criar' ? 'Criar casa' : 'Entrar na casa'}
        </button>
      </form>

      <p className="rodape-entrada">
        <button type="button" className="botao-quieto" onClick={sair}>Sair da conta</button>
      </p>
    </main>
  );
}
