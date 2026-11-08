// Categorias da casa: adicionar, renomear, trocar o ícone, definir o limite do mês e apagar.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Plus } from 'lucide-react';
import { api } from '../api.js';
import { useValoresOcultos } from '../hooks/useValoresOcultos.js';
import Icone from '../components/Icone.jsx';
import { ICONES, ICONES_CATEGORIA } from '../utils/icones.js';
import { centavosParaTexto, formatarReais, textoParaCentavos } from '../utils/dinheiro.js';

export default function Categorias() {
  useValoresOcultos(); // redesenha a tela quando tocam no "olho" do topo
  const [categorias, setCategorias] = useState(null);
  const [erro, setErro] = useState('');
  // Qual categoria está aberta para edição: um id, 'nova', ou null
  const [aberta, setAberta] = useState(null);

  function carregar() {
    return api('/categorias')
      .then((dados) => setCategorias(dados.categorias))
      .catch((e) => setErro(e.message));
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvar(categoria, campos) {
    setErro('');
    try {
      if (categoria) {
        await api(`/categorias/${categoria.id}`, { metodo: 'PATCH', corpo: campos });
      } else {
        await api('/categorias', { metodo: 'POST', corpo: campos });
      }
      setAberta(null);
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function apagar(categoria) {
    const aviso = categoria.totalLancamentos
      ? `Apagar "${categoria.nome}"? Os ${categoria.totalLancamentos} lançamento(s) dela vão ficar sem categoria.`
      : `Apagar "${categoria.nome}"?`;
    if (!window.confirm(aviso)) return;
    setErro('');
    try {
      await api(`/categorias/${categoria.id}`, { metodo: 'DELETE' });
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
        <h1>Categorias</h1>
        {aberta !== 'nova' && (
          <button className="botao-secundario" onClick={() => { setErro(''); setAberta('nova'); }}>
            <Plus size={20} strokeWidth={1.75} aria-hidden="true" /> Nova
          </button>
        )}
      </header>

      {erro && <p className="erro" role="alert" style={{ marginBottom: 'var(--space-3)' }}>{erro}</p>}
      {!categorias && !erro && <p className="vazio">Carregando…</p>}

      {aberta === 'nova' && (
        <EditorCategoria aoSalvar={(campos) => salvar(null, campos)} aoCancelar={() => setAberta(null)} />
      )}

      {categorias && (
        <ul className="card lista" style={{ marginTop: aberta === 'nova' ? 'var(--space-3)' : 0 }}>
          {categorias.map((c) => (
            <li key={c.id}>
              {aberta === c.id ? (
                <div style={{ padding: 'var(--space-3) 0' }}>
                  <EditorCategoria
                    categoria={c}
                    aoSalvar={(campos) => salvar(c, campos)}
                    aoApagar={() => apagar(c)}
                    aoCancelar={() => setAberta(null)}
                  />
                </div>
              ) : (
                <button className="item bloco" style={{ justifyContent: 'flex-start', padding: 'var(--space-3) 0', borderRadius: 0, fontWeight: 400 }}
                  onClick={() => { setErro(''); setAberta(c.id); }}>
                  <span className="item-icone"><Icone nome={c.icone} /></span>
                  <span className="item-textos" style={{ textAlign: 'left' }}>
                    <span className="item-titulo">{c.nome}</span>
                    <span className="item-sub">
                      {c.totalLancamentos} lançamento(s)
                      {c.limiteMensalCentavos && ` · limite ${formatarReais(c.limiteMensalCentavos)}/mês`}
                    </span>
                  </span>
                  <span className="label" style={{ color: 'var(--indigo)' }}>Editar</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

// Formulário de uma categoria (nova ou existente): nome, ícone e limite por mês.
function EditorCategoria({ categoria, aoSalvar, aoApagar, aoCancelar }) {
  const [nome, setNome] = useState(categoria?.nome ?? '');
  const [icone, setIcone] = useState(categoria?.icone ?? 'etiqueta');
  const [limite, setLimite] = useState(
    categoria?.limiteMensalCentavos ? centavosParaTexto(categoria.limiteMensalCentavos) : '',
  );
  const [erroLimite, setErroLimite] = useState('');

  function aoEnviar(evento) {
    evento.preventDefault();
    // Campo vazio = sem limite (null)
    const limiteMensalCentavos = limite.trim() ? textoParaCentavos(limite) : null;
    if (limite.trim() && !limiteMensalCentavos) {
      setErroLimite('Limite inválido. Exemplo: 1.500');
      return;
    }
    setErroLimite('');
    aoSalvar({ nome, icone, limiteMensalCentavos });
  }

  return (
    <form className={categoria ? 'formulario' : 'card formulario'} onSubmit={aoEnviar}>
      <label className="campo">
        Nome
        <input type="text" required maxLength={40} autoFocus placeholder="Ex.: Pets"
          value={nome} onChange={(e) => setNome(e.target.value)} />
      </label>

      <label className="campo">
        <span>Limite por mês (R$) <small>Opcional. Deixe vazio para não ter limite</small></span>
        <input type="text" inputMode="decimal" placeholder="Ex.: 1.500"
          value={limite} onChange={(e) => setLimite(e.target.value)} />
      </label>
      {erroLimite && <p className="erro" role="alert">{erroLimite}</p>}

      <fieldset className="campo" style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend style={{ marginBottom: 'var(--space-2)' }}>Ícone</legend>
        <div className="grade-icones">
          {ICONES_CATEGORIA.map((chave) => (
            <button key={chave} type="button" aria-pressed={chave === icone} aria-label={ICONES[chave].nome}
              className={chave === icone ? 'ativo' : ''} onClick={() => setIcone(chave)}>
              <Icone nome={chave} />
            </button>
          ))}
        </div>
      </fieldset>

      <div className="botoes">
        <button type="button" className="botao-secundario" onClick={aoCancelar}>Cancelar</button>
        <button type="submit" className="botao">Salvar</button>
      </div>
      {aoApagar && (
        <button type="button" className="botao-perigo" onClick={aoApagar}>Apagar categoria</button>
      )}
    </form>
  );
}
