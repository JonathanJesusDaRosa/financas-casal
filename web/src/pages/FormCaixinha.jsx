// Criar (/metas/nova) ou editar (/metas/42/editar) uma meta.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api } from '../api.js';
import Icone from '../components/Icone.jsx';
import { ICONES, ICONES_META } from '../utils/icones.js';
import { centavosParaTexto, textoParaCentavos } from '../utils/dinheiro.js';

export default function FormCaixinha() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navegar = useNavigate();

  const [investimentos, setInvestimentos] = useState([]);
  const [nome, setNome] = useState('');
  const [icone, setIcone] = useState('aviao');
  const [valorAlvo, setValorAlvo] = useState('');
  const [prazo, setPrazo] = useState('');
  const [investimentoId, setInvestimentoId] = useState('');

  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    Promise.all([api('/investimentos'), editando ? api(`/caixinhas/${id}`) : null])
      .then(([resInv, resMeta]) => {
        setInvestimentos(resInv.investimentos);
        if (resMeta) {
          const c = resMeta.caixinha;
          setNome(c.nome);
          setIcone(c.icone ?? 'cofrinho');
          setValorAlvo(centavosParaTexto(c.valorAlvoCentavos));
          setPrazo(c.prazo ?? '');
          setInvestimentoId(c.investimento ? String(c.investimento.id) : '');
        }
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [id, editando]);

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro('');
    const valorAlvoCentavos = textoParaCentavos(valorAlvo);
    if (!valorAlvoCentavos) {
      setErro('Valor da meta inválido. Exemplo: 5.000');
      return;
    }

    setEnviando(true);
    try {
      const { caixinha } = await api(editando ? `/caixinhas/${id}` : '/caixinhas', {
        metodo: editando ? 'PATCH' : 'POST',
        corpo: {
          nome,
          icone,
          valorAlvoCentavos,
          prazo: prazo || null,
          investimentoId: investimentoId ? Number(investimentoId) : null,
        },
      });
      navegar(`/metas/${caixinha.id}`, { replace: true });
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  if (carregando) return <main className="tela"><p className="vazio">Carregando…</p></main>;

  return (
    <main className="tela">
      <header className="cabecalho">
        <button type="button" className="botao-icone" aria-label="Voltar" onClick={() => navegar(-1)}>
          <ChevronLeft size={24} strokeWidth={1.75} />
        </button>
        <h1>{editando ? 'Editar meta' : 'Nova meta'}</h1>
      </header>

      <form className="formulario" onSubmit={aoEnviar}>
        <fieldset className="campo" style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ marginBottom: 'var(--space-2)' }}>Ícone</legend>
          <div className="grade-icones">
            {ICONES_META.map((chave) => (
              <button key={chave} type="button" aria-pressed={chave === icone} aria-label={ICONES[chave].nome}
                className={chave === icone ? 'ativo' : ''} onClick={() => setIcone(chave)}>
                <Icone nome={chave} />
              </button>
            ))}
          </div>
        </fieldset>

        <label className="campo">
          Nome do sonho
          <input type="text" required maxLength={40} placeholder="Ex.: Viagem para o Nordeste"
            value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>

        <label className="campo">
          Quanto querem juntar? (R$)
          <input type="text" inputMode="decimal" required placeholder="5.000"
            className="campo-valor" value={valorAlvo} onChange={(e) => setValorAlvo(e.target.value)} />
        </label>

        <label className="campo">
          <span>Até quando? <small>Opcional</small></span>
          <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </label>

        <label className="campo">
          <span>Onde o dinheiro fica aplicado? <small>Opcional</small></span>
          <select value={investimentoId} onChange={(e) => setInvestimentoId(e.target.value)}>
            <option value="">Ainda não sei</option>
            {investimentos.map((inv) => (
              <option key={inv.id} value={inv.id}>{inv.nome}</option>
            ))}
          </select>
        </label>
        {investimentos.length === 0 && (
          <p className="caption muted">Cadastre onde vocês investem na aba Investir.</p>
        )}

        {erro && <p className="erro" role="alert">{erro}</p>}

        <button type="submit" className="botao" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar'}</button>
      </form>
    </main>
  );
}
