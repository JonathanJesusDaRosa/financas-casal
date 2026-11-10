// Aba "Investir": onde o dinheiro das metas está aplicado (registro manual).
// O saldo de cada investimento é a soma das metas ligadas a ele.
// "Novo" fica no topo (como em Metas); renomear/apagar ficam atrás de um "Editar" discreto.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, TrendingUp } from 'lucide-react';
import { api } from '../api.js';
import { useValoresOcultos } from '../hooks/useValoresOcultos.js';
import Cabecalho from '../components/Cabecalho.jsx';
import Icone from '../components/Icone.jsx';
import { formatarReais } from '../utils/dinheiro.js';

export default function Investimentos() {
  useValoresOcultos(); // redesenha a tela quando tocam no "olho" do topo
  const [dados, setDados] = useState(null); // { totalCentavos, investimentos, caixinhasSemInvestimento }
  const [erro, setErro] = useState('');
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState(null); // id do investimento em edição

  function carregar() {
    return api('/investimentos').then(setDados).catch((e) => setErro(e.message));
  }

  useEffect(() => {
    carregar();
  }, []);

  // Roda a ação, recarrega a lista e devolve true se deu certo.
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

  const vazio = dados && dados.investimentos.length === 0 && dados.caixinhasSemInvestimento.length === 0;

  return (
    <main className="tela larga">
      <Cabecalho titulo="Investimentos">
        {!criando && (
          // Só o "+" (o título "Investimentos" é longo e não caberia com o texto "Novo" em 360px)
          <button type="button" className="botao-secundario botao-quadrado" aria-label="Novo investimento"
            title="Novo investimento" onClick={() => { setErro(''); setCriando(true); }}>
            <Plus size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
      </Cabecalho>

      {erro && <p className="erro" role="alert" style={{ marginBottom: 'var(--space-3)' }}>{erro}</p>}
      {!dados && !erro && <p className="vazio">Carregando…</p>}

      {criando && (
        <FormNome
          titulo="Novo investimento"
          botao="Adicionar"
          aoSalvar={async (nome) => {
            if (await executar(() => api('/investimentos', { metodo: 'POST', corpo: { nome } }))) setCriando(false);
          }}
          aoCancelar={() => setCriando(false)}
        />
      )}

      {dados && !vazio && (
        <section className="total-investido">
          <p className="label muted">Total guardado</p>
          <p className="valor-grande">{formatarReais(dados.totalCentavos)}</p>
          <p className="caption muted">Soma das metas ativas. Para incluir os juros, use "Atualizar saldo" em cada meta.</p>
        </section>
      )}

      {vazio && !criando && (
        <section className="card vazio-convite">
          <span className="item-icone"><TrendingUp size={20} strokeWidth={1.75} aria-hidden="true" /></span>
          <h2>Onde o dinheiro das metas está?</h2>
          <p className="muted">
            Cadastre onde vocês investem (ex.: CDB Nubank, Tesouro Selic) e ligue cada meta a um deles.
            Assim vocês sabem quanto tem em cada lugar.
          </p>
          <button type="button" className="botao" onClick={() => setCriando(true)}>Cadastrar investimento</button>
        </section>
      )}

      {dados && !vazio && (
        <div className="secao grade-cards">
          {dados.investimentos.map((inv) => (
            <section key={inv.id} className="card">
              <div className="cabecalho-investimento">
                <span className="item-icone"><TrendingUp size={20} strokeWidth={1.75} aria-hidden="true" /></span>
                <h2 className="item-titulo">{inv.nome}</h2>
                <strong className="valor-lista">{formatarReais(inv.saldoCentavos)}</strong>
                {editando !== inv.id && (
                  <button type="button" className="botao-icone" aria-label={`Editar ${inv.nome}`}
                    onClick={() => { setErro(''); setEditando(inv.id); }}>
                    <Pencil size={18} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                )}
              </div>

              {editando === inv.id && (
                <FormNome
                  inicial={inv.nome}
                  botao="Salvar"
                  aoSalvar={async (nome) => {
                    if (nome === inv.nome) return setEditando(null);
                    if (await executar(() => api(`/investimentos/${inv.id}`, { metodo: 'PATCH', corpo: { nome } }))) setEditando(null);
                  }}
                  aoCancelar={() => setEditando(null)}
                  aoApagar={async () => {
                    const aviso = inv.caixinhas.length
                      ? `Apagar "${inv.nome}"? As metas ligadas a ele ficam sem investimento definido (o dinheiro delas não muda).`
                      : `Apagar "${inv.nome}"?`;
                    if (!window.confirm(aviso)) return;
                    if (await executar(() => api(`/investimentos/${inv.id}`, { metodo: 'DELETE' }))) setEditando(null);
                  }}
                />
              )}

              <ListaMetas metas={inv.caixinhas} vazio="Nenhuma meta aplicada aqui ainda. Abra uma meta e toque em Editar para ligar." />
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
        </div>
      )}
    </main>
  );
}

// Campo de nome com salvar/cancelar (e apagar, quando é edição).
function FormNome({ titulo, inicial = '', botao, aoSalvar, aoCancelar, aoApagar }) {
  const [nome, setNome] = useState(inicial);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento) {
    evento.preventDefault();
    setEnviando(true);
    await aoSalvar(nome.trim());
    setEnviando(false);
  }

  return (
    <form className={`formulario ${titulo ? 'card form-novo' : 'form-nome'}`} onSubmit={aoEnviar}>
      {titulo && <h2>{titulo}</h2>}
      <label className="campo">
        Nome
        <input type="text" required maxLength={60} autoFocus placeholder="Ex.: CDB Nubank"
          value={nome} onChange={(e) => setNome(e.target.value)} />
      </label>
      <div className="botoes">
        <button type="button" className="botao-secundario" onClick={aoCancelar}>Cancelar</button>
        <button type="submit" className="botao" disabled={enviando}>{enviando ? 'Salvando…' : botao}</button>
      </div>
      {aoApagar && (
        <button type="button" className="botao-perigo" onClick={aoApagar} disabled={enviando}>
          Apagar investimento
        </button>
      )}
    </form>
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
