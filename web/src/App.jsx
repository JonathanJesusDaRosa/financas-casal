// Define as páginas do app e quem pode ver cada uma.
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Login from './pages/Login.jsx';
import Cadastro from './pages/Cadastro.jsx';
import Inicio from './pages/Inicio.jsx';

// Só para quem está logado; senão, manda para o login.
function RotaProtegida({ children }) {
  const { usuario } = useAuth();
  return usuario ? children : <Navigate to="/login" replace />;
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
      <Route path="/" element={<RotaProtegida><Inicio /></RotaProtegida>} />
      <Route path="/login" element={<RotaPublica><Login /></RotaPublica>} />
      <Route path="/cadastro" element={<RotaPublica><Cadastro /></RotaPublica>} />
      {/* Qualquer outro endereço volta para o início */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
