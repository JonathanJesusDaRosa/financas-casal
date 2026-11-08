// Aba "Casal": mostra o espaço, os membros e o convite (se ainda houver vaga).
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

const NOMES_DOS_PAPEIS = { TITULAR: 'Titular', DEPENDENTE: 'Dependente' };

export default function Casal() {
  const { usuario, sair } = useAuth();
  const [casal, setCasal] = useState(null);
  const [erro, setErro] = useState('');

  // Busca os dados do casal ao abrir a tela.
  useEffect(() => {
    api('/casal')
      .then((dados) => setCasal(dados.casal))
      .catch((e) => setErro(e.message));
  }, []);

  return (
    <main className="pagina">
      <header className="topo">
        <h1>{casal ? casal.nome : 'Finanças do Casal'}</h1>
        <button className="secundario" onClick={sair}>Sair</button>
      </header>

      {erro && <p className="erro" role="alert">{erro}</p>}
      {!casal && !erro && <p className="dica">Carregando…</p>}

      {casal && (
        <>
          {casal.podeConvidar && <Convite casal={casal} aoAtualizar={setCasal} />}

          <section className="cartao">
            <h2>Olá, {usuario.nome}!</h2>
            <h3>Quem participa</h3>
            <ul className="membros">
              {casal.membros.map((membro) => (
                <li key={membro.id}>
                  {membro.nome} {membro.id === usuario.id && <small>(você)</small>}
                  <span className="etiqueta">{NOMES_DOS_PAPEIS[membro.papel]}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}

// Caixa com o código de convite, botões para copiar/enviar e gerar um novo.
function Convite({ casal, aoAtualizar }) {
  const [aviso, setAviso] = useState('');
  const [gerando, setGerando] = useState(false);
  const convite = casal.convite;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(convite.codigo);
      setAviso('Código copiado!');
    } catch {
      setAviso('Não deu para copiar. Selecione o código e copie manualmente.');
    }
  }

  async function gerarNovo() {
    setGerando(true);
    setAviso('');
    try {
      const dados = await api('/casal/convite', { metodo: 'POST' });
      aoAtualizar(dados.casal);
    } catch (e) {
      setAviso(e.message);
    } finally {
      setGerando(false);
    }
  }

  // Sem código válido (venceu): oferece gerar outro.
  if (!convite) {
    return (
      <section className="cartao convite">
        <h2>Convide seu par</h2>
        <p className="dica">O código anterior venceu. Gere um novo para enviar.</p>
        <button onClick={gerarNovo} disabled={gerando}>
          {gerando ? 'Gerando…' : 'Gerar novo código'}
        </button>
        {aviso && <p className="aviso">{aviso}</p>}
      </section>
    );
  }

  const validade = new Date(convite.expiraEm).toLocaleDateString('pt-BR');
  const mensagem =
    `Vamos organizar nosso dinheiro juntos no Finanças do Casal! ` +
    `Crie sua conta e, na tela "Seu espaço", use o código: ${convite.codigo}`;

  return (
    <section className="cartao convite">
      <h2>Convide seu par</h2>
      <p className="dica">Ele(a) cria a conta e digita este código em "Tenho um código":</p>
      <p className="codigo">{convite.codigo}</p>
      <p className="dica">Vale até {validade}.</p>
      <div className="botoes">
        <button onClick={copiar}>Copiar código</button>
        <a className="botao secundario" target="_blank" rel="noreferrer"
          href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`}>
          Enviar pelo WhatsApp
        </a>
      </div>
      {aviso && <p className="aviso">{aviso}</p>}
    </section>
  );
}
