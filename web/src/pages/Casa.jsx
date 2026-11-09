// Aba "Casa": a casa, os membros, o convite (se ainda houver vaga), categorias e sair.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CalendarClock, ChevronRight, CreditCard, Copy, LogOut, MessageCircle, RefreshCw, Tag, Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import Cabecalho from '../components/Cabecalho.jsx';

const NOMES_DOS_PAPEIS = { TITULAR: 'Titular', DEPENDENTE: 'Dependente' };

export default function Casa() {
  const { usuario, sair } = useAuth();
  const [casa, setCasa] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api('/casal')
      .then((dados) => setCasa(dados.casal))
      .catch((e) => setErro(e.message));
  }, []);

  return (
    <main className="tela">
      <Cabecalho titulo={casa ? casa.nome : 'Casa'} />

      {erro && <p className="erro" role="alert">{erro}</p>}
      {!casa && !erro && <p className="vazio">Carregando…</p>}

      {casa && (
        <>
          <section>
            <div className="secao-topo"><h2>Membros</h2></div>
            <ul className="card lista">
              {casa.membros.map((m) => (
                <li key={m.id} className="item">
                  <span className="avatar" aria-hidden="true">{m.nome.charAt(0).toUpperCase()}</span>
                  <span className="item-textos">
                    <span className="item-titulo">{m.nome}{m.id === usuario.id && ' (você)'}</span>
                  </span>
                  <span className="etiqueta">{NOMES_DOS_PAPEIS[m.papel]}</span>
                </li>
              ))}
            </ul>
          </section>

          {casa.podeConvidar && <Convite casa={casa} aoAtualizar={setCasa} />}

          <section className="secao">
            <div className="secao-topo"><h2>Ajustes</h2></div>
            <ul className="card lista">
              <li>
                <Link to="/casa/ajuda" className="item">
                  <span className="item-icone"><BookOpen size={20} strokeWidth={1.75} aria-hidden="true" /></span>
                  <span className="item-textos">
                    <span className="item-titulo">Como usar</span>
                    <span className="item-sub">Manual: tudo o que dá para fazer no app</span>
                  </span>
                  <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" className="muted" />
                </Link>
              </li>
              <li>
                <Link to="/contas" className="item">
                  <span className="item-icone"><CalendarClock size={20} strokeWidth={1.75} aria-hidden="true" /></span>
                  <span className="item-textos">
                    <span className="item-titulo">Contas fixas</span>
                    <span className="item-sub">Aluguel, internet, luz… com vencimento</span>
                  </span>
                  <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" className="muted" />
                </Link>
              </li>
              <li>
                <Link to="/casa/formas" className="item">
                  <span className="item-icone"><CreditCard size={20} strokeWidth={1.75} aria-hidden="true" /></span>
                  <span className="item-textos">
                    <span className="item-titulo">Formas de pagamento</span>
                    <span className="item-sub">Pix, cartões de crédito e débito…</span>
                  </span>
                  <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" className="muted" />
                </Link>
              </li>
              <li>
                <Link to="/casa/categorias" className="item">
                  <span className="item-icone"><Tag size={20} strokeWidth={1.75} aria-hidden="true" /></span>
                  <span className="item-textos">
                    <span className="item-titulo">Categorias</span>
                    <span className="item-sub">Criar, renomear, ícones e limite do mês</span>
                  </span>
                  <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" className="muted" />
                </Link>
              </li>
              <li>
                <button className="item bloco" style={{ justifyContent: 'flex-start', padding: 'var(--space-3) 0', borderRadius: 0, fontWeight: 400 }} onClick={sair}>
                  <span className="item-icone"><LogOut size={20} strokeWidth={1.75} aria-hidden="true" /></span>
                  <span className="item-textos" style={{ textAlign: 'left' }}>
                    <span className="item-titulo">Sair da conta</span>
                    <span className="item-sub">{usuario.email}</span>
                  </span>
                </button>
              </li>
            </ul>
          </section>

          <ApagarLancamentos nomeCasa={casa.nome} />
        </>
      )}
    </main>
  );
}

// "Apagar dados": apaga TODOS os lançamentos da casa (não tem volta).
// Para confirmar, a pessoa digita o nome da casa.
function ApagarLancamentos({ nomeCasa }) {
  const [aberto, setAberto] = useState(false);
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);
  const confere = confirmacao.trim().toLocaleLowerCase('pt-BR') === nomeCasa.trim().toLocaleLowerCase('pt-BR');

  async function apagar(evento) {
    evento.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const { apagados } = await api('/casal/lancamentos', { metodo: 'DELETE', corpo: { confirmacao } });
      setAviso(`Pronto: ${apagados} lançamento(s) apagado(s). A casa recomeça do zero.`);
      setAberto(false);
      setConfirmacao('');
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="secao">
      <div className="secao-topo"><h2>Apagar dados</h2></div>
      <div className="card formulario">
        <p>
          Apaga <strong>todos os lançamentos</strong> da casa: entradas, saídas, pagamentos de contas e de faturas
          e os movimentos das metas. <strong>Não tem volta.</strong>
        </p>
        <p className="caption muted">
          Continuam: membros, categorias, formas de pagamento, cartões, contas fixas, metas (ficam zeradas) e investimentos.
        </p>
        {aviso && <p className="aviso">{aviso}</p>}

        {!aberto ? (
          <button type="button" className="botao-perigo" onClick={() => { setAviso(''); setAberto(true); }}>
            <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" /> Apagar todos os lançamentos
          </button>
        ) : (
          <form className="formulario" onSubmit={apagar}>
            <label className="campo">
              <span>Para confirmar, digite o nome da casa: <strong>{nomeCasa}</strong></span>
              <input type="text" autoComplete="off" autoFocus value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)} />
            </label>
            {erro && <p className="erro" role="alert">{erro}</p>}
            <div className="botoes">
              <button type="button" className="botao-secundario" onClick={() => { setAberto(false); setConfirmacao(''); setErro(''); }}>
                Cancelar
              </button>
              <button type="submit" className="botao-perigo" disabled={!confere || enviando}>
                {enviando ? 'Apagando…' : 'Apagar para sempre'}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

// Código de convite com botões para copiar e enviar pelo WhatsApp.
function Convite({ casa, aoAtualizar }) {
  const [aviso, setAviso] = useState('');
  const [gerando, setGerando] = useState(false);
  const convite = casa.convite;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(convite.codigo);
      setAviso('Código copiado.');
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

  if (!convite) {
    return (
      <section className="secao">
        <div className="secao-topo"><h2>Convidar para a casa</h2></div>
        <div className="card formulario">
          <p className="muted">O código anterior venceu. Gere um novo para enviar.</p>
          <button className="botao" onClick={gerarNovo} disabled={gerando}>
            <RefreshCw size={20} strokeWidth={1.75} aria-hidden="true" />
            {gerando ? 'Gerando…' : 'Gerar novo código'}
          </button>
          {aviso && <p className="aviso">{aviso}</p>}
        </div>
      </section>
    );
  }

  const validade = new Date(convite.expiraEm).toLocaleDateString('pt-BR');
  // window.location.origin = o endereço do app (ex.: https://financas-casal-gold.vercel.app)
  const mensagem =
    `Vamos organizar as contas da casa juntos no Casa em Conta.\n\n` +
    `1. Abra: ${window.location.origin}\n` +
    `2. Crie sua conta\n` +
    `3. Toque em "Tenho um código" e digite: ${convite.codigo}`;

  return (
    <section className="secao">
      <div className="secao-topo"><h2>Convidar para a casa</h2></div>
      <div className="card">
        <p className="muted">Quem for entrar cria a conta e digita este código em "Tenho um código":</p>
        <p className="convite-codigo">{convite.codigo}</p>
        <p className="caption muted" style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>Vale até {validade}</p>
        <div className="botoes">
          <button className="botao-secundario" onClick={copiar}>
            <Copy size={20} strokeWidth={1.75} aria-hidden="true" /> Copiar código
          </button>
          <a className="botao" target="_blank" rel="noreferrer"
            href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`}>
            <MessageCircle size={20} strokeWidth={1.75} aria-hidden="true" /> Enviar pelo WhatsApp
          </a>
        </div>
        {aviso && <p className="aviso" style={{ marginTop: 'var(--space-3)' }}>{aviso}</p>}
      </div>
    </section>
  );
}
