import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import Personas from './pages/Personas';
import Diezmadores from './pages/Diezmadores';

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
        {/* Ministerios vive como pestaña de Miembros (su gestión completa
            ya existe ahí): la ruta lleva directo a esa pestaña. */}
        <Route path="/ministerios" element={<Navigate to="/miembros?tab=ministerios" replace />} />
        <Route path="/diezmadores" element={<Diezmadores />} />
        <Route path="/personas" element={<Personas />} />
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
