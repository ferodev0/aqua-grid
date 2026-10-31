import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import { useLanguage } from './context/LanguageContext';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { SensorDetailsPage } from './pages/SensorDetailsPage';
import { SensorsIndexPage } from './pages/SensorsIndexPage';

function App() {
  const { t } = useLanguage();

  return (
    <Routes>
      <Route path="/" element={<DashboardLayout />} />
      <Route
        path="/map"
        element={<PlaceholderPage title={t('nav.map')} />}
      />
      <Route path="/sensors" element={<SensorsIndexPage />} />
      <Route path="/sensors/:sensorId" element={<SensorDetailsPage />} />
      <Route
        path="/impact"
        element={<PlaceholderPage title={t('nav.impact')} />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
