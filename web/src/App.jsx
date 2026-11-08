// Define as páginas do app e quem pode ver cada uma.
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Login from './pages/Login.jsx';
import Cadastro from './pages/Cadastro.jsx';
import Espaco from './pages/Espaco.jsx';
import Layout from './components/Layout.jsx';
import Lancamentos from './pages/Lancamentos.jsx';
import FormLancamento from './pages/FormLancamento.jsx';
import Categorias from './pages/Categorias.jsx';
import Casal from './pages/Casal.jsx';
import Caixinhas from './pages/Caixinhas.jsx';
import CaixinhaDetalhe from './pages/CaixinhaDetalhe.jsx';
import FormCaixinha from './pages/FormCaixinha.jsx';
import Investimentos from './pages/Investimentos.jsx';

// Para quem está logado E já tem casal.
// Sem login -> login. Logado sem casal -> tela "Seu espaço".
function RotaDoCasal({ children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (!usuario.casalId) return <Navigate to="/espaco" replace />;
  return children;
}

// Para quem está logado mas AINDA não tem casal.
function RotaSemCasal({ children }) {
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
      {/* Área do casal: todas estas páginas ficam dentro do Layout (barra embaixo) */}
      <Route element={<RotaDoCasal><Layout /></RotaDoCasal>}>
        <Route path="/" element={<Lancamentos />} />
        <Route path="/caixinhas" element={<Caixinhas />} />
        <Route path="/caixinhas/:id" element={<CaixinhaDetalhe />} />
        <Route path="/investimentos" element={<Investimentos />} />
        <Route path="/casal" element={<Casal />} />
        <Route path="/categorias" element={<Categorias />} />
      </Route>

      <Route path="/caixinhas/nova" element={<RotaDoCasal><FormCaixinha /></RotaDoCasal>} />
      <Route path="/caixinhas/:id/editar" element={<RotaDoCasal><FormCaixinha /></RotaDoCasal>} />

      {/* Formulário em tela cheia (sem a barra embaixo, para sobrar espaço ao teclado) */}
      <Route path="/lancamentos/novo" element={<RotaDoCasal><FormLancamento /></RotaDoCasal>} />
      <Route path="/lancamentos/:id" element={<RotaDoCasal><FormLancamento /></RotaDoCasal>} />
      <Route path="/espaco" element={<RotaSemCasal><Espaco /></RotaSemCasal>} />
      <Route path="/login" element={<RotaPublica><Login /></RotaPublica>} />
      <Route path="/cadastro" element={<RotaPublica><Cadastro /></RotaPublica>} />
      {/* Qualquer outro endereço volta para o início */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
