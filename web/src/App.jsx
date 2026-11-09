// Define as páginas do app e quem pode ver cada uma.
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Cadastro from './pages/Cadastro.jsx';
import Espaco from './pages/Espaco.jsx';
import Inicio from './pages/Inicio.jsx';
import Lancamentos from './pages/Lancamentos.jsx';
import FormLancamento from './pages/FormLancamento.jsx';
import Caixinhas from './pages/Caixinhas.jsx';
import CaixinhaDetalhe from './pages/CaixinhaDetalhe.jsx';
import FormCaixinha from './pages/FormCaixinha.jsx';
import Investimentos from './pages/Investimentos.jsx';
import Casa from './pages/Casa.jsx';
import Categorias from './pages/Categorias.jsx';
import Contas from './pages/Contas.jsx';
import Ajuda from './pages/Ajuda.jsx';
import FormasPagamento from './pages/FormasPagamento.jsx';
import Cartao from './pages/Cartao.jsx';
import FormContaFixa from './pages/FormContaFixa.jsx';

// Para quem está logado E já está numa casa.
// Sem login -> login. Logado sem casa -> tela "Criar casa".
function RotaDaCasa({ children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (!usuario.casalId) return <Navigate to="/bem-vindo" replace />;
  return children;
}

// Para quem está logado mas AINDA não está numa casa.
function RotaSemCasa({ children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.casalId) return <Navigate to="/" replace />;
  return children;
}

// Só para quem NÃO está logado (não faz sentido ver o login já logado).
function RotaPublica({ children }) {
  const { usuario } = useAuth();
  return usuario ? <Navigate to="/" replace /> : children;
}

export default function App() {
  const { carregando } = useAuth();

  if (carregando) {
    return <p className="carregando">Carregando…</p>;
  }

  return (
    <Routes>
      {/* Telas com a navegação inferior */}
      <Route element={<RotaDaCasa><Layout /></RotaDaCasa>}>
        <Route path="/" element={<Inicio />} />
        <Route path="/lancamentos" element={<Lancamentos />} />
        <Route path="/metas" element={<Caixinhas />} />
        <Route path="/metas/:id" element={<CaixinhaDetalhe />} />
        <Route path="/investimentos" element={<Investimentos />} />
        <Route path="/casa" element={<Casa />} />
        <Route path="/casa/categorias" element={<Categorias />} />
        <Route path="/contas" element={<Contas />} />
        <Route path="/casa/ajuda" element={<Ajuda />} />
        <Route path="/casa/formas" element={<FormasPagamento />} />
        <Route path="/cartoes/:id" element={<Cartao />} />
      </Route>

      {/* Formulários em tela cheia (sem a navegação, para sobrar espaço ao teclado) */}
      <Route path="/lancamentos/novo" element={<RotaDaCasa><FormLancamento /></RotaDaCasa>} />
      <Route path="/lancamentos/:id" element={<RotaDaCasa><FormLancamento /></RotaDaCasa>} />
      <Route path="/metas/nova" element={<RotaDaCasa><FormCaixinha /></RotaDaCasa>} />
      <Route path="/metas/:id/editar" element={<RotaDaCasa><FormCaixinha /></RotaDaCasa>} />
      <Route path="/contas/nova" element={<RotaDaCasa><FormContaFixa /></RotaDaCasa>} />
      <Route path="/contas/:id/editar" element={<RotaDaCasa><FormContaFixa /></RotaDaCasa>} />

      <Route path="/bem-vindo" element={<RotaSemCasa><Espaco /></RotaSemCasa>} />
      <Route path="/login" element={<RotaPublica><Login /></RotaPublica>} />
      <Route path="/cadastro" element={<RotaPublica><Cadastro /></RotaPublica>} />

      {/* Qualquer outro endereço (inclusive os antigos) volta para o início */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
