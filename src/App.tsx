import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppLayout, ProtectedRoute } from '@/components/AppLayout';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { OverviewPage } from '@/pages/OverviewPage';
import { IncidentsPage } from '@/pages/IncidentsPage';
import { DisasterMapPage } from '@/pages/DisasterMapPage';
import { ResourcesPage } from '@/pages/ResourcesPage';
import { VehiclesPage } from '@/pages/VehiclesPage';
import { RouteOptimizerPage } from '@/pages/RouteOptimizerPage';
import { SimulationPage } from '@/pages/SimulationPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="overview" element={<ErrorBoundary><OverviewPage /></ErrorBoundary>} />
                <Route path="incidents" element={<ErrorBoundary><IncidentsPage /></ErrorBoundary>} />
                <Route path="map" element={<ErrorBoundary><DisasterMapPage /></ErrorBoundary>} />
                <Route path="resources" element={<ErrorBoundary><ResourcesPage /></ErrorBoundary>} />
                <Route path="vehicles" element={<ErrorBoundary><VehiclesPage /></ErrorBoundary>} />
                <Route path="routes" element={<ErrorBoundary><RouteOptimizerPage /></ErrorBoundary>} />
                <Route path="simulation" element={<ErrorBoundary><SimulationPage /></ErrorBoundary>} />
                <Route path="analytics" element={<ErrorBoundary><AnalyticsPage /></ErrorBoundary>} />
                <Route path="settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}
