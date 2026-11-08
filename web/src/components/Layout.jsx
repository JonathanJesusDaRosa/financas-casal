// Moldura da área logada: o conteúdo da página + a barra de navegação embaixo.
import { NavLink, Outlet } from 'react-router-dom';

const ABAS = [
  { para: '/', texto: 'Lançamentos', icone: '📒' },
  { para: '/categorias', texto: 'Categorias', icone: '🏷️' },
  { para: '/casal', texto: 'Casal', icone: '💑' },
];

export default function Layout() {
  return (
    <div className="area-logada">
      {/* Outlet = onde o React Router desenha a página atual */}
      <Outlet />

      <nav className="barra-navegacao" aria-label="Navegação principal">
        {ABAS.map((aba) => (
          // NavLink sabe se está na página atual e adiciona a classe "active"
          <NavLink key={aba.para} to={aba.para} end={aba.para === '/'}>
            <span className="icone" aria-hidden="true">{aba.icone}</span>
            {aba.texto}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
