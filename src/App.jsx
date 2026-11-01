import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import { useLanguage } from './context/LanguageContext';
import { NetworkMap } from './pages/NetworkMap';
import { SensorDetailsPage } from './pages/SensorDetailsPage';
import { SensorsIndexPage } from './pages/SensorsIndexPage';
import { AboutPage } from './pages/about/AboutPage';

function App() {
  const { t } = useLanguage();

  return (
    <Routes>
      <Route path="/" element={<DashboardLayout />} />
      <Route
        path="/map"
        element={<NetworkMap title={t('nav.map')} />}
      />
      <Route path="/sensors" element={<SensorsIndexPage />} />
      <Route path="/sensors/:sensorId" element={<SensorDetailsPage />} />
      <Route
        path="/impact"
        element={<AboutPage title={t('nav.impact')} />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
