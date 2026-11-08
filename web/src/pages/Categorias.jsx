// Categorias do casal: adicionar, renomear, trocar a cor e apagar.
import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

export default function Categorias() {
  const [categorias, setCategorias] = useState(null);
  const [erro, setErro] = useState('');

  // Formulário de nova categoria
  const [novoNome, setNovoNome] = useState('');
  const [novaCor, setNovaCor] = useState('#607d8b');

  // Qual categoria está sendo renomeada (id) e o texto digitado
  const [editandoId, setEditandoId] = useState(null);
  const [nomeEditado, setNomeEditado] = useState('');

  function carregar() {
    return api('/categorias')
      .then((dados) => setCategorias(dados.categorias))
      .catch((e) => setErro(e.message));
  }

  useEffect(() => {
    carregar();
  }, []);

  // Executa uma ação na API e recarrega a lista; mostra o erro se falhar.
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
    const ok = await executar(() =>
      api('/categorias', { metodo: 'POST', corpo: { nome: novoNome, cor: novaCor } }),
    );
    if (ok) setNovoNome('');
  }

  async function salvarNome(evento) {
    evento.preventDefault();
    const ok = await executar(() =>
      api(`/categorias/${editandoId}`, { metodo: 'PATCH', corpo: { nome: nomeEditado } }),
    );
    if (ok) setEditandoId(null);
  }

  function trocarCor(categoria, cor) {
    executar(() => api(`/categorias/${categoria.id}`, { metodo: 'PATCH', corpo: { cor } }));
  }

  function apagar(categoria) {
    const aviso = categoria.totalLancamentos
      ? `Apagar "${categoria.nome}"? Os ${categoria.totalLancamentos} lançamento(s) dela vão ficar "Sem categoria".`
      : `Apagar "${categoria.nome}"?`;
    if (!window.confirm(aviso)) return;
    executar(() => api(`/categorias/${categoria.id}`, { metodo: 'DELETE' }));
  }

  return (
    <main className="pagina">
      <header className="topo">
        <h1>Categorias</h1>
      </header>

      <form className="cartao nova-categoria" onSubmit={adicionar}>
        <input type="color" aria-label="Cor da nova categoria" value={novaCor}
          onChange={(e) => setNovaCor(e.target.value)} />
        <input type="text" required maxLength={40} placeholder="Nova categoria (ex.: Pets)"
          value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
        <button type="submit">Adicionar</button>
      </form>

      {erro && <p className="erro" role="alert">{erro}</p>}
      {!categorias && !erro && <p className="dica">Carregando…</p>}

      {categorias && (
        <ul className="cartao lista-categorias">
          {categorias.map((c) => (
            <li key={c.id}>
              <SeletorCor categoria={c} aoEscolher={(cor) => trocarCor(c, cor)} />

              {editandoId === c.id ? (
                <form className="renomear" onSubmit={salvarNome}>
                  <input type="text" required maxLength={40} autoFocus aria-label="Novo nome"
                    value={nomeEditado} onChange={(e) => setNomeEditado(e.target.value)} />
                  <button type="submit">OK</button>
                  <button type="button" className="secundario" onClick={() => setEditandoId(null)}>✕</button>
                </form>
              ) : (
                <>
                  <span className="nome">
                    {c.nome}
                    <small>{c.totalLancamentos} lançamento(s)</small>
                  </span>
                  <button className="secundario" onClick={() => { setEditandoId(c.id); setNomeEditado(c.nome); }}>
                    Renomear
                  </button>
                  <button className="secundario perigo-texto" aria-label={`Apagar ${c.nome}`} onClick={() => apagar(c)}>
                    Apagar
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

// Bolinha de cor que abre a paleta ao tocar.
// O onChange do React dispara a CADA movimento na paleta; já o evento "change"
// nativo do navegador só dispara quando a paleta fecha. Usamos o nativo para
// salvar na API uma vez só, com a cor final.
function SeletorCor({ categoria, aoEscolher }) {
  const campo = useRef(null);
  const aoEscolherAtual = useRef(aoEscolher);

  // Mantém a função mais recente guardada (sem mexer no ref durante a renderização).
  useEffect(() => {
    aoEscolherAtual.current = aoEscolher;
  });

  useEffect(() => {
    const elemento = campo.current;
    const aoFechar = () => aoEscolherAtual.current(elemento.value);
    elemento.addEventListener('change', aoFechar);
    return () => elemento.removeEventListener('change', aoFechar);
  }, []);

  return (
    <input ref={campo} type="color" className="seletor-cor" aria-label={`Cor de ${categoria.nome}`}
      defaultValue={categoria.cor ?? '#607d8b'} />
  );
}
