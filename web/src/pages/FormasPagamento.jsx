// Formas de pagamento da casa: criar ("Nubank Crédito"), renomear, trocar o tipo e apagar.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Plus } from 'lucide-react';
import { api } from '../api.js';
import { ORDEM_TIPOS, TIPOS_FORMA } from '../utils/formas.js';

export default function FormasPagamento() {
  const [formas, setFormas] = useState(null);
  const [erro, setErro] = useState('');
  const [aberta, setAberta] = useState(null); // id, 'nova' ou null

  function carregar() {
    return api('/formas-pagamento').then((d) => setFormas(d.formas)).catch((e) => setErro(e.message));
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvar(forma, campos) {
    setErro('');
    try {
      if (forma) await api(`/formas-pagamento/${forma.id}`, { metodo: 'PATCH', corpo: campos });
      else await api('/formas-pagamento', { metodo: 'POST', corpo: campos });
      setAberta(null);
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function apagar(forma) {
    const aviso = forma.totalLancamentos
      ? `Apagar "${forma.nome}"? Os ${forma.totalLancamentos} lançamento(s) dela continuam, mas ficam sem forma de pagamento.`
      : `Apagar "${forma.nome}"?`;
    if (!window.confirm(aviso)) return;
    setErro('');
    try {
      await api(`/formas-pagamento/${forma.id}`, { metodo: 'DELETE' });
      setAberta(null);
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <main className="tela">
      <header className="cabecalho">
        <Link to="/casa" className="botao-icone" aria-label="Voltar para Casa">
          <ChevronLeft size={24} strokeWidth={1.75} />
        </Link>
        <h1>Formas de pagamento</h1>
        {aberta !== 'nova' && (
          <button className="botao-secundario" onClick={() => { setErro(''); setAberta('nova'); }}>
            <Plus size={20} strokeWidth={1.75} aria-hidden="true" /> Nova
          </button>
        )}
      </header>

      <p className="muted" style={{ marginBottom: 'var(--space-4)' }}>
        Cadastre cada cartão com o nome do banco (ex.: "Nubank Crédito") para ver no Início quanto foi gasto em cada um.
      </p>

      {erro && <p className="erro" role="alert" style={{ marginBottom: 'var(--space-3)' }}>{erro}</p>}
      {!formas && !erro && <p className="vazio">Carregando…</p>}

      {aberta === 'nova' && (
        <EditorForma aoSalvar={(campos) => salvar(null, campos)} aoCancelar={() => setAberta(null)} />
      )}

      {formas && (
        <ul className="card lista" style={{ marginTop: aberta === 'nova' ? 'var(--space-3)' : 0 }}>
          {formas.map((f) => {
            const { Icone, nome: nomeTipo } = TIPOS_FORMA[f.tipo] ?? TIPOS_FORMA.OUTRO;
            return (
              <li key={f.id}>
                {aberta === f.id ? (
                  <div style={{ padding: 'var(--space-3) 0' }}>
                    <EditorForma forma={f} aoSalvar={(campos) => salvar(f, campos)}
                      aoApagar={() => apagar(f)} aoCancelar={() => setAberta(null)} />
                  </div>
                ) : (
                  <button className="item bloco" style={{ justifyContent: 'flex-start', padding: 'var(--space-3) 0', borderRadius: 0, fontWeight: 400 }}
                    onClick={() => { setErro(''); setAberta(f.id); }}>
                    <span className="item-icone"><Icone size={20} strokeWidth={1.75} aria-hidden="true" /></span>
                    <span className="item-textos" style={{ textAlign: 'left' }}>
                      <span className="item-titulo">{f.nome}</span>
                      <span className="item-sub">{nomeTipo} · {f.totalLancamentos} lançamento(s)</span>
                    </span>
                    <span className="label" style={{ color: 'var(--indigo)' }}>Editar</span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

// Formulário de uma forma (nova ou existente): nome + tipo.
function EditorForma({ forma, aoSalvar, aoApagar, aoCancelar }) {
  const [nome, setNome] = useState(forma?.nome ?? '');
  const [tipo, setTipo] = useState(forma?.tipo ?? 'CREDITO');

  function aoEnviar(evento) {
    evento.preventDefault();
    aoSalvar({ nome, tipo });
  }

  return (
    <form className={forma ? 'formulario' : 'card formulario'} onSubmit={aoEnviar}>
      <label className="campo">
        Nome
        <input type="text" required maxLength={40} autoFocus placeholder="Ex.: Nubank Crédito"
          value={nome} onChange={(e) => setNome(e.target.value)} />
      </label>

      <fieldset className="campo" style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend style={{ marginBottom: 'var(--space-2)' }}>Tipo</legend>
        <div className="chips">
          {ORDEM_TIPOS.map((t) => {
            const { Icone, nome: nomeTipo } = TIPOS_FORMA[t];
            return (
              <button key={t} type="button" aria-pressed={tipo === t} className={tipo === t ? 'ativo' : ''}
                onClick={() => setTipo(t)}>
                <Icone size={18} strokeWidth={1.75} aria-hidden="true" /> {nomeTipo}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="botoes">
        <button type="button" className="botao-secundario" onClick={aoCancelar}>Cancelar</button>
        <button type="submit" className="botao">Salvar</button>
      </div>
      {aoApagar && <button type="button" className="botao-perigo" onClick={aoApagar}>Apagar forma de pagamento</button>}
    </form>
  );
}
