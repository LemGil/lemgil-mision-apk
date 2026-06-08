import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
