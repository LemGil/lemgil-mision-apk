import { HashRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginScreen } from './components/LoginScreen';
import { useAuth } from './lib/auth';
import Dashboard from './pages/Dashboard';
import MisionBiblica from './pages/MisionBiblica';
import Academia from './pages/Academia';
import ManosAbiertas from './pages/ManosAbiertas';
import Negocios from './pages/Negocios';
import Comunicacion from './pages/Comunicacion';
import Dadores from './pages/Dadores';
import BienComun from './pages/BienComun';
import Reportes from './pages/Reportes';
import Miembros from './pages/Miembros';

function AppRoutes() {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (!session) return <LoginScreen />;

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/mision" element={<MisionBiblica />} />
        <Route path="/academia" element={<Academia />} />
        <Route path="/manos-abiertas" element={<ManosAbiertas />} />
        <Route path="/negocios" element={<Negocios />} />
        <Route path="/comunicacion" element={<Comunicacion />} />
        <Route path="/dadores" element={<Dadores />} />
        <Route path="/bien-comun" element={<BienComun />} />
        <Route path="/miembros" element={<Miembros />} />
        <Route path="/reportes" element={<Reportes />} />
      </Routes>
    </HashRouter>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppRoutes />
    </ErrorBoundary>
  );
}
