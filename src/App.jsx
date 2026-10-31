import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { SensorDetailsPage } from './pages/SensorDetailsPage';
import { SensorsIndexPage } from './pages/SensorsIndexPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardLayout />} />
      <Route
        path="/map"
        element={<PlaceholderPage title="Network Map" />}
      />
      <Route path="/sensors" element={<SensorsIndexPage />} />
      <Route path="/sensors/:sensorId" element={<SensorDetailsPage />} />
      <Route
        path="/impact"
        element={<PlaceholderPage title="Impact / About" />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
