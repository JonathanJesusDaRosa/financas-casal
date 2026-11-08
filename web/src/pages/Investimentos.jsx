// Aba "Investir": onde o dinheiro das metas está aplicado (registro manual).
// O saldo de cada investimento é a soma das metas ligadas a ele.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2, TrendingUp } from 'lucide-react';
import { api } from '../api.js';
import { useValoresOcultos } from '../hooks/useValoresOcultos.js';
import Cabecalho from '../components/Cabecalho.jsx';
import Icone from '../components/Icone.jsx';
import { formatarReais } from '../utils/dinheiro.js';

export default function Investimentos() {
  useValoresOcultos(); // redesenha a tela quando tocam no "olho" do topo
  const [dados, setDados] = useState(null); // { totalCentavos, investimentos, caixinhasSemInvestimento }
  const [erro, setErro] = useState('');
  const [novoNome, setNovoNome] = useState('');

  function carregar() {
    return api('/investimentos').then(setDados).catch((e) => setErro(e.message));
  }

  useEffect(() => {
    carregar();
  }, []);

  async function executar(acao) {
    setErro('');
    try {
      await acao();
      await carregar();
      return true;
    } catch (e) {
      setErro(e.message);
      return false;
    }
  }

  async function adicionar(evento) {
    evento.preventDefault();
    if (await executar(() => api('/investimentos', { metodo: 'POST', corpo: { nome: novoNome } }))) {
      setNovoNome('');
    }
  }

  function renomear(inv) {
    const nome = window.prompt('Novo nome do investimento:', inv.nome);
    if (!nome || nome === inv.nome) return;
    executar(() => api(`/investimentos/${inv.id}`, { metodo: 'PATCH', corpo: { nome } }));
  }

  function apagar(inv) {
    const aviso = inv.caixinhas.length
      ? `Apagar "${inv.nome}"? As metas ligadas a ele ficam sem investimento definido (o dinheiro delas não muda).`
      : `Apagar "${inv.nome}"?`;
    if (!window.confirm(aviso)) return;
    executar(() => api(`/investimentos/${inv.id}`, { metodo: 'DELETE' }));
  }

  return (
    <main className="tela">
      <Cabecalho titulo="Investimentos" />

      {dados && (
        <section className="total-investido">
          <p className="label muted">Total guardado</p>
          <p className="valor-grande">{formatarReais(dados.totalCentavos)}</p>
          <p className="caption muted">Soma das metas ativas. Para incluir os juros, use "Atualizar saldo" em cada meta.</p>
        </section>
      )}

      <form className="linha-form secao" onSubmit={adicionar}>
        <input type="text" required maxLength={60} placeholder="Novo investimento (ex.: CDB Nubank)"
          aria-label="Nome do novo investimento" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
        <button type="submit" className="botao">Adicionar</button>
      </form>

      {erro && <p className="erro" role="alert" style={{ marginTop: 'var(--space-3)' }}>{erro}</p>}
      {!dados && !erro && <p className="vazio">Carregando…</p>}

      {dados && (
        <div className="secao">
          {dados.investimentos.map((inv) => (
            <section key={inv.id} className="card">
              <div className="cabecalho-investimento">
                <span className="item-icone"><TrendingUp size={20} strokeWidth={1.75} aria-hidden="true" /></span>
                <h2 className="item-titulo">{inv.nome}</h2>
                <strong className="valor-lista">{formatarReais(inv.saldoCentavos)}</strong>
              </div>
              <ListaMetas metas={inv.caixinhas} vazio="Nenhuma meta aplicada aqui ainda." />
              <div className="botoes" style={{ marginTop: 'var(--space-3)' }}>
                <button className="botao-secundario" onClick={() => renomear(inv)}>
                  <Pencil size={18} strokeWidth={1.75} aria-hidden="true" /> Renomear
                </button>
                <button className="botao-perigo" onClick={() => apagar(inv)}>
                  <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" /> Apagar
                </button>
              </div>
            </section>
          ))}

          {dados.caixinhasSemInvestimento.length > 0 && (
            <section className="card">
              <h2>Sem investimento definido</h2>
              <ListaMetas metas={dados.caixinhasSemInvestimento} />
              <p className="caption muted" style={{ marginTop: 'var(--space-2)' }}>
                Abra a meta e toque em Editar para escolher onde ela está aplicada.
              </p>
            </section>
          )}

          {dados.investimentos.length === 0 && dados.caixinhasSemInvestimento.length === 0 && (
            <p className="vazio">Cadastre onde vocês investem (ex.: CDB Nubank, Tesouro Selic) e ligue as metas a eles.</p>
          )}
        </div>
      )}
    </main>
  );
}

function ListaMetas({ metas, vazio }) {
  if (metas.length === 0) return <p className="caption muted" style={{ marginTop: 'var(--space-3)' }}>{vazio}</p>;
  return (
    <ul className="lista" style={{ marginTop: 'var(--space-2)' }}>
      {metas.map((c) => (
        <li key={c.id}>
          <Link to={`/metas/${c.id}`} className="item" style={{ minHeight: 52 }}>
            <span className="item-icone meta"><Icone nome={c.icone} /></span>
            <span className="item-textos"><span className="item-titulo">{c.nome}</span></span>
            <span className="valor-lista">{formatarReais(c.saldoCentavos)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
