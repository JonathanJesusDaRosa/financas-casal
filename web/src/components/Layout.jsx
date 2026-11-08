// Moldura da área logada: o conteúdo da página + a navegação inferior,
// com o botão central (pêssego) para lançar rápido. Na Fase 3 ele vira o microfone.
import { NavLink, Outlet } from 'react-router-dom';
import { House, List, Plus, Target, TrendingUp, Users } from 'lucide-react';

// Rótulos curtos para caberem 5 abas + o botão central num celular de 360px.
const ANTES = [
  { para: '/', texto: 'Início', Icone: House },
  { para: '/lancamentos', texto: 'Extrato', Icone: List },
];
const DEPOIS = [
  { para: '/metas', texto: 'Metas', Icone: Target },
  { para: '/investimentos', texto: 'Investir', Icone: TrendingUp },
  { para: '/casa', texto: 'Casa', Icone: Users },
];

function Aba({ para, texto, Icone }) {
  return (
    <li>
      {/* NavLink adiciona a classe "active" quando a página atual é a dele */}
      <NavLink to={para} end={para === '/'}>
        <Icone size={24} strokeWidth={1.75} aria-hidden="true" />
        {texto}
      </NavLink>
    </li>
  );
}

export default function Layout() {
  return (
    <div className="area-logada">
      {/* Outlet = onde o React Router desenha a página atual */}
      <Outlet />

      <nav className="navegacao" aria-label="Navegação principal">
        <ul>
          {ANTES.map((aba) => <Aba key={aba.para} {...aba} />)}
          <li className="central">
            <NavLink to="/lancamentos/novo" className="botao-central" aria-label="Lançar">
              <Plus size={28} strokeWidth={2} aria-hidden="true" />
            </NavLink>
          </li>
          {DEPOIS.map((aba) => <Aba key={aba.para} {...aba} />)}
        </ul>
      </nav>
    </div>
  );
}
