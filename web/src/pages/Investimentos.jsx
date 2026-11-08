// Aba "Investimentos": onde o dinheiro das caixinhas está aplicado.
// O saldo de cada investimento é a soma das caixinhas ligadas a ele.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { formatarReais } from '../utils/dinheiro.js';

export default function Investimentos() {
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
      ? `Apagar "${inv.nome}"? As caixinhas dele vão ficar sem investimento definido (o dinheiro delas não muda).`
      : `Apagar "${inv.nome}"?`;
    if (!window.confirm(aviso)) return;
    executar(() => api(`/investimentos/${inv.id}`, { metodo: 'DELETE' }));
  }

  return (
    <main className="pagina">
      <header className="topo">
        <h1>Investimentos</h1>
      </header>

      {dados && (
        <section className="cartao total-investido">
          <span>Total guardado</span>
          <strong>{formatarReais(dados.totalCentavos)}</strong>
          <small>Soma das caixinhas ativas. Para atualizar com os juros, use "Atualizar saldo" em cada caixinha.</small>
        </section>
      )}

      <form className="cartao nova-categoria" onSubmit={adicionar}>
        <input type="text" required maxLength={60} placeholder="Novo investimento (ex.: CDB Nubank)"
          value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
        <button type="submit">Adicionar</button>
      </form>

      {erro && <p className="erro" role="alert">{erro}</p>}
      {!dados && !erro && <p className="dica">Carregando…</p>}

      {dados?.investimentos.map((inv) => (
        <section key={inv.id} className="cartao investimento">
          <div className="linha">
            <h2>{inv.nome}</h2>
            <strong>{formatarReais(inv.saldoCentavos)}</strong>
          </div>
          <ListaCaixinhas caixinhas={inv.caixinhas} vazio="Nenhuma caixinha aplicada aqui ainda." />
          <div className="botoes-pequenos">
            <button className="secundario" onClick={() => renomear(inv)}>Renomear</button>
            <button className="secundario perigo-texto" onClick={() => apagar(inv)}>Apagar</button>
          </div>
        </section>
      ))}

      {dados?.caixinhasSemInvestimento.length > 0 && (
        <section className="cartao investimento sem-investimento">
          <div className="linha">
            <h2>Sem investimento definido</h2>
          </div>
          <ListaCaixinhas caixinhas={dados.caixinhasSemInvestimento} />
          <p className="dica pequena">Abra a caixinha e toque em <strong>Editar</strong> para escolher onde ela está aplicada.</p>
        </section>
      )}

      {dados && dados.investimentos.length === 0 && dados.caixinhasSemInvestimento.length === 0 && (
        <p className="vazio">Cadastre onde vocês investem (ex.: "CDB Nubank", "Tesouro Selic")<br />e ligue as caixinhas a eles.</p>
      )}
    </main>
  );
}

function ListaCaixinhas({ caixinhas, vazio }) {
  if (caixinhas.length === 0) return <p className="dica pequena">{vazio}</p>;
  return (
    <ul className="caixinhas-do-investimento">
      {caixinhas.map((c) => (
        <li key={c.id}>
          <Link to={`/caixinhas/${c.id}`}>
            <span>{c.icone} {c.nome}</span>
            <span>{formatarReais(c.saldoCentavos)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
