// Define as páginas do app e quem pode ver cada uma.
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Login from './pages/Login.jsx';
import Cadastro from './pages/Cadastro.jsx';
import Espaco from './pages/Espaco.jsx';
import Inicio from './pages/Inicio.jsx';

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
      <Route path="/" element={<RotaDoCasal><Inicio /></RotaDoCasal>} />
      <Route path="/espaco" element={<RotaSemCasal><Espaco /></RotaSemCasal>} />
      <Route path="/login" element={<RotaPublica><Login /></RotaPublica>} />
      <Route path="/cadastro" element={<RotaPublica><Cadastro /></RotaPublica>} />
      {/* Qualquer outro endereço volta para o início */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
