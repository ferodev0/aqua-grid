import { Navigate, Route, Routes } from 'react-router-dom';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { SensorDetailsPage } from './pages/SensorDetailsPage';
import { SensorsIndexPage } from './pages/SensorsIndexPage';
import { AboutPage } from './pages/about/AboutPage';

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <PlaceholderPage
            title="Network Overview"
            note="[ Dashboard — see origin/dashboard ]"
          />
        }
      />
      <Route
        path="/map"
        element={<PlaceholderPage title="Network Map" />}
      />
      <Route path="/sensors" element={<SensorsIndexPage />} />
      <Route path="/sensors/:sensorId" element={<SensorDetailsPage />} />
      <Route
        path="/impact"
        element={<AboutPage title="Impact / About" />}
      />
      <Route path="*" element={<Navigate to="/sensors" replace />} />
    </Routes>
  );
}

export default App;
