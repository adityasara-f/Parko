import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { SearchMapPage } from './pages/SearchMapPage';
import { LoginPage } from './pages/LoginPage';
import { BookingFlowPage } from './pages/BookingFlowPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { OwnerDashboardPage } from './pages/OwnerDashboardPage';
import { CreateListingWizard } from './pages/CreateListingWizard';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ProfilePage } from './pages/ProfilePage';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// Admin Route Guard
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || !user.is_admin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-parko-ivory">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public Guest Discovery */}
              <Route path="/" element={<SearchMapPage />} />
              <Route path="/login" element={<LoginPage />} />

              {/* Pre-Booking & Checkout */}
              <Route path="/book/:id" element={<BookingFlowPage />} />

              {/* Driver Bookings */}
              <Route
                path="/bookings"
                element={
                  <ProtectedRoute>
                    <MyBookingsPage />
                  </ProtectedRoute>
                }
              />

              {/* Owner Workspace */}
              <Route
                path="/owner"
                element={
                  <ProtectedRoute>
                    <OwnerDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/owner/new"
                element={
                  <ProtectedRoute>
                    <CreateListingWizard />
                  </ProtectedRoute>
                }
              />

              {/* Profile */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              {/* Administrator Portal */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboardPage />
                  </AdminRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
