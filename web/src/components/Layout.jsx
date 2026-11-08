// Moldura da área logada: o conteúdo da página + a navegação.
// No celular: barra embaixo com o botão central (pêssego) para lançar rápido
// (na Fase 3 ele vira o microfone). No computador (1024px ou mais), o MESMO menu
// vira uma barra lateral à esquerda, só mudando o CSS (ver index.css).
import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { CalendarClock, House, List, Plus, Target, TrendingUp, Users } from 'lucide-react';

// Rótulos curtos para caberem 5 abas + o botão central num celular de 360px.
const ANTES = [
  { para: '/', texto: 'Início', Icone: House },
  { para: '/lancamentos', texto: 'Extrato', Icone: List },
];
const DEPOIS = [
  { para: '/metas', texto: 'Metas', Icone: Target },
  { para: '/investimentos', texto: 'Investir', Icone: TrendingUp },
  // "Contas" só aparece no computador (no celular não cabe; lá fica no Início e em Casa)
  { para: '/contas', texto: 'Contas', Icone: CalendarClock, soComputador: true },
  { para: '/casa', texto: 'Casa', Icone: Users },
];

function Aba({ para, texto, Icone, soComputador }) {
  return (
    <li className={soComputador ? 'so-computador' : undefined}>
      {/* NavLink adiciona a classe "active" quando a página atual é a dele */}
      <NavLink to={para} end={para === '/'}>
        <Icone size={24} strokeWidth={1.75} aria-hidden="true" />
        {texto}
      </NavLink>
    </li>
  );
}

// A tela é dividida em dois blocos que, juntos, ocupam exatamente a altura da tela:
//   1. o conteúdo, que rola sozinho;
//   2. a navegação, sempre no rodapé.
// Assim a barra não depende de "position: fixed", que o Safari do iPhone às vezes
// mostra fora da tela em apps instalados (PWA).
export default function Layout() {
  const conteudo = useRef(null);
  const { pathname } = useLocation();

  // Ao trocar de aba, volta o conteúdo para o topo (antes quem fazia isso era o navegador)
  // e garante que a página em si não ficou "deslocada" (ex.: depois de um formulário).
  useEffect(() => {
    conteudo.current?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, [pathname]);

  // No iPhone, ao fechar o teclado ou voltar de outro app, o Safari às vezes deixa a
  // página deslocada para cima. Quando a área visível muda de tamanho, ou o app volta
  // a aparecer, recolocamos a página na posição certa (só a área de conteúdo deve rolar).
  useEffect(() => {
    const recolocar = () => {
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') recolocar();
    };
    window.visualViewport?.addEventListener('resize', recolocar);
    window.addEventListener('focusout', recolocar);
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      window.visualViewport?.removeEventListener('resize', recolocar);
      window.removeEventListener('focusout', recolocar);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, []);

  return (
    <div className="area-logada">
      <div className="conteudo-rolavel" ref={conteudo}>
        {/* Outlet = onde o React Router desenha a página atual */}
        <Outlet />
      </div>

      <nav className="navegacao" aria-label="Navegação principal">
        {/* Logo: só aparece na barra lateral do computador */}
        <div className="marca-lateral" aria-hidden="true">
          <img src="/brand/casa-em-conta-mark.svg" alt="" />
          <span>Casa <em>em</em> Conta</span>
        </div>
        <ul>
          {ANTES.map((aba) => <Aba key={aba.para} {...aba} />)}
          <li className="central">
            <NavLink to="/lancamentos/novo" className="botao-central" aria-label="Lançar">
              <Plus size={28} strokeWidth={2} aria-hidden="true" />
              <span className="rotulo-central" aria-hidden="true">Lançar</span>
            </NavLink>
          </li>
          {DEPOIS.map((aba) => <Aba key={aba.para} {...aba} />)}
        </ul>
      </nav>
    </div>
  );
}
