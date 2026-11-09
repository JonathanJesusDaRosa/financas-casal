// Chips para escolher a forma de pagamento (opcional: tocar de novo desmarca).
// Usado ao lançar, ao pagar uma conta fixa e no cadastro da conta fixa.
import { TIPOS_FORMA } from '../utils/formas.js';

export default function EscolherForma({ formas, valor, aoMudar, rotulo = 'Forma de pagamento' }) {
  if (formas.length === 0) return null;
  return (
    <fieldset className="campo" style={{ border: 'none', padding: 0, margin: 0 }}>
      <legend style={{ marginBottom: 'var(--space-2)' }}>
        <span>{rotulo} <small>Opcional</small></span>
      </legend>
      <div className="chips">
        {formas.map((f) => {
          const { Icone } = TIPOS_FORMA[f.tipo] ?? TIPOS_FORMA.OUTRO;
          const ativo = valor === f.id;
          return (
            <button key={f.id} type="button" aria-pressed={ativo} className={ativo ? 'ativo' : ''}
              onClick={() => aoMudar(ativo ? null : f.id)}>
              <Icone size={18} strokeWidth={1.75} aria-hidden="true" /> {f.nome}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
