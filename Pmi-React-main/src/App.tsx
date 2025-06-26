import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RecuperarSenhaPage from './pages/RecuperarSenhaPage';
import DashboardPage from './pages/DashboardPage';
import NovaChavePage from './pages/NovaChavePage';
import HistoricoChavePage from './pages/HistoricoChavePage';
import RelatorioPage from './pages/RelatorioPage';
import ConfigurarChavePage from './pages/ConfigurarChavePage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/recuperar-senha" element={<RecuperarSenhaPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/nova-chave" element={<NovaChavePage />} />
        <Route path="/historico-chave" element={<HistoricoChavePage />} />
        <Route path="/relatorio" element={<RelatorioPage />} />
        <Route path="/configurar-chave" element={<ConfigurarChavePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;