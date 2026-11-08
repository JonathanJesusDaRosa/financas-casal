import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth.jsx';
import App from './App.jsx';
import './styles/tokens.css'; // cores, fonte e espaços do guia (DESIGN.md)
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* BrowserRouter: permite ter várias "páginas" (/login, /cadastro...) */}
    <BrowserRouter>
      {/* AuthProvider: deixa o usuário logado disponível para todas as telas */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
