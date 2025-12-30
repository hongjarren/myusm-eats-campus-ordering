import { useState, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { LoginForm } from './components/Auth/LoginForm';
import { RegisterForm } from './components/Auth/RegisterForm';
import { UpdatePassword } from './components/Auth/UpdatePassword';
const StudentDashboard = lazy(() => import('./components/Student/StudentDashboard'));
const AdminDashboard = lazy(() => import('./components/Admin/AdminDashboard'));
const VendorDashboard = lazy(() => import('./components/Vendor/VendorDashboard').then(m => ({ default: m.VendorDashboard })));
const DeliveryDashboard = lazy(() => import('./components/Delivery/DeliveryDashboard').then(m => ({ default: m.DeliveryDashboard })));
import { Store } from 'lucide-react';
import { Routes, Route, Navigate } from 'react-router-dom';
const ManageMenu = lazy(() => import('./components/Vendor/ManageMenu').then(m => ({ default: m.ManageMenu })));
const AllOrders = lazy(() => import('./components/Vendor/AllOrders').then(m => ({ default: m.AllOrders })));

function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-3">
        <Store className="h-10 w-10 text-blue-600" />
        <span className="text-2xl font-bold text-gray-900">MyUSM Eats</span>
      </div>

      {isLogin ? (
        <LoginForm onToggleMode={() => setIsLogin(false)} />
      ) : (
        <RegisterForm onToggleMode={() => setIsLogin(true)} />
      )}
    </div>
  );
}

function DashboardRouter() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // --- 3. LOGGED-OUT ROUTES ---
  // If user is not logged in, only show login/register routes
  if (!profile) {
    return (
      <Routes>
        <Route path="/login" element={<AuthScreen />} />
        <Route path="/auth/update-password" element={<UpdatePassword />} />
        {/* Any other path redirects to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // --- 4. LOGGED-IN ROUTES ---
  // If user is logged in, wrap routes in Layout
  return (
    <Layout>
      <Suspense
        fallback={
          <div className="min-h-[40vh] flex items-center justify-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-300 dark:border-gray-700 border-t-blue-600" />
          </div>
        }
      >
      <Routes>
        {/* === Student Routes === */}
        {profile.role === 'student' && (
          <>
            <Route path="/" element={<StudentDashboard />} />
            {/* Add other student pages here, e.g., /orders */}
            {/* Fallback: any other path redirects to student home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}

        {/* === Vendor Routes === */}
        {profile.role === 'vendor' && (
          <>
            <Route path="/vendor/dashboard" element={<VendorDashboard />} />
            <Route path="/vendor/menu" element={<ManageMenu />} />
            <Route path="/vendor/orders" element={<AllOrders />} />
            {/* Fallback: any other path redirects to vendor home */}
            <Route path="*" element={<Navigate to="/vendor/dashboard" replace />} />
          </>
        )}

        {/* === Admin Routes === */}
        {profile.role === 'admin' && (
          <>
            <Route path="/" element={<AdminDashboard />} />
            {/* Fallback: any other path redirects to admin home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}

        {/* === Delivery Routes === */}
        {profile.role === 'delivery' && (
          <>
            <Route path="/" element={<DeliveryDashboard />} />
            {/* Fallback: any other path redirects to delivery home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
      </Suspense>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <DashboardRouter />
    </AuthProvider>
  );
}

export default App;
