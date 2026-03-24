import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { Toaster } from 'sonner'
import { AuthProvider } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import { SettingsProvider } from './context/SettingsContext'
import { TenantProvider } from './context/TenantContext'
import { AnimatePresence } from 'framer-motion'
import { ThemeProvider } from './context/ThemeContext'
import PageTransition from './components/PageTransition'
import ProtectedRoute from './components/ProtectedRoute'
import GlobalErrorBoundary from './components/GlobalErrorBoundary'
import { Loader2 } from 'lucide-react'

// Lightweight pages — loaded eagerly
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ClubInfoPage from './pages/ClubInfoPage'
import MenuPage from './pages/MenuPage'
import CouponsPage from './pages/CouponsPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsPage from './pages/TermsPage'
import CustomerDisplayPage from './pages/CustomerDisplayPage'
import NotFoundPage from './pages/NotFoundPage'
import { CartProvider } from './context/CartContext'
import useFCM from './hooks/useFCM.jsx'
import IOSInstallPrompt from './components/pwa/IOSInstallPrompt'
import NotificationModal from './components/NotificationModal'

// Heavy pages — lazy loaded for better initial bundle
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))
const MyOrdersPage = lazy(() => import('./pages/MyOrdersPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const RewardsStorePage = lazy(() => import('./pages/RewardsStorePage'))
const KDSPage = lazy(() => import('./pages/KDSPage'))
const POSPage = lazy(() => import('./pages/POSPage'))
const DeliveryDashboard = lazy(() => import('./components/DeliveryDashboard'))
const RiderInterface = lazy(() => import('./components/RiderInterface'))
const AdminIntegraciones = lazy(() => import('./pages/AdminIntegraciones'))

// Suspense fallback
const LazyFallback = () => (
  <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
    <Loader2 className="w-10 h-10 animate-spin text-[var(--color-primary)]" />
  </div>
)

/**
 * Routes within a tenant context (/:tenantSlug/*)
 * All routes here have access to useTenant()
 */
const TenantRoutes = () => {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<LazyFallback />}>
        <Routes location={location} key={location.pathname}>
          {/* Protected: Kitchen Display */}
          <Route path="/kds" element={
            <ProtectedRoute role={['admin', 'owner', 'kitchen']}>
              <KDSPage />
            </ProtectedRoute>
          } />

          {/* Public: Customer-facing display */}
          <Route path="/display/client" element={<CustomerDisplayPage />} />

          {/* Protected: Delivery management */}
          <Route path="/delivery" element={
            <ProtectedRoute role={['admin', 'owner']}>
              <DeliveryDashboard />
            </ProtectedRoute>
          } />

          {/* Protected: Rider interface */}
          <Route path="/rider" element={
            <ProtectedRoute role={['admin', 'owner', 'rider', 'driver']}>
              <RiderInterface />
            </ProtectedRoute>
          } />

          {/* Protected: POS (specific admin route first) */}
          <Route path="/admin/pos" element={
            <ProtectedRoute role={['admin', 'owner']}>
              <POSPage />
            </ProtectedRoute>
          } />

          {/* Protected: Admin Integraciones */}
          <Route path="/admin/integraciones" element={
            <ProtectedRoute role={['admin', 'owner']}>
              <PageTransition><AdminIntegraciones /></PageTransition>
            </ProtectedRoute>
          } />

          {/* Protected: Admin Dashboard */}
          <Route path="/admin" element={
            <ProtectedRoute role={['admin', 'owner']}>
              <PageTransition><AdminDashboard /></PageTransition>
            </ProtectedRoute>
          } />

          {/* Public pages */}
          <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
          <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
          <Route path="/register" element={<PageTransition><RegisterPage /></PageTransition>} />
          <Route path="/club-info" element={<PageTransition><ClubInfoPage /></PageTransition>} />
          <Route path="/rewards" element={<PageTransition><RewardsStorePage /></PageTransition>} />
          <Route path="/menu" element={<PageTransition><MenuPage /></PageTransition>} />
          <Route path="/checkout" element={<PageTransition><CheckoutPage /></PageTransition>} />
          <Route path="/my-orders" element={<PageTransition><MyOrdersPage /></PageTransition>} />
          <Route path="/coupons" element={<PageTransition><CouponsPage /></PageTransition>} />
          <Route path="/profile" element={<PageTransition><ProfilePage /></PageTransition>} />
          <Route path="/privacy" element={<PageTransition><PrivacyPolicyPage /></PageTransition>} />
          <Route path="/terms" element={<PageTransition><TermsPage /></PageTransition>} />

          {/* 404 catch-all */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  )
}

/**
 * Wrapper for tenant routes — provides TenantContext and all
 * nested providers that depend on tenant (Settings, Language, Cart)
 */
const TenantApp = () => {
  return (
    <GlobalErrorBoundary>
      <TenantProvider>
        <ThemeProvider>
          <SettingsProvider>
            <AuthProvider>
              <LanguageProvider>
                <CartProvider>
                  <TenantAppContent />
                </CartProvider>
              </LanguageProvider>
            </AuthProvider>
          </SettingsProvider>
        </ThemeProvider>
      </TenantProvider>
    </GlobalErrorBoundary>
  )
}

// Wrapper to use hooks that depend on contexts
const TenantAppContent = () => {
  // Initialize FCM
  useFCM();

  return (
    <>
      <TenantRoutes />
      <IOSInstallPrompt />
      <NotificationModal />
    </>
  );
}

/**
 * Landing page for root URL (/)
 * This is the Stacked platform page — NOT a tenant page.
 * Each tenant has their own path: /damafa, /pepito, etc.
 */
const StackedLanding = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex flex-col items-center justify-center p-6 text-center">
      {/* Logo */}
      <img
        src="/logo-stacked.png"
        alt="Stacked"
        className="w-28 h-28 object-contain mb-8 drop-shadow-2xl"
      />

      {/* Hero */}
      <h1 className="text-5xl font-black text-white mb-3 tracking-tight">
        Stacked
      </h1>
      <p className="text-lg text-white/60 max-w-md mb-10">
        La plataforma todo-en-uno para tu restaurante. Pedidos, menú digital, delivery, facturación y más.
      </p>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-4">
        <a
          href="mailto:contacto@stacked.com"
          className="px-8 py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all hover:scale-105 active:scale-95"
        >
          Quiero Stacked para mi local
        </a>
      </div>

      {/* Footer */}
      <p className="text-white/30 text-xs mt-16">
        © {new Date().getFullYear()} Stacked. Todos los derechos reservados.
      </p>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Toaster
        richColors
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'linear-gradient(135deg, #1e1b4b 0%, #3b3678 100%)',
            border: '2px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '20px 24px',
            fontSize: '16px',
            fontWeight: '600',
            color: 'white',
            fontFamily: 'Outfit, sans-serif',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.1)',
            minWidth: '320px',
            maxWidth: '500px',
            textAlign: 'center',
          },
          className: 'premium-toast',

          // Success Style (Green border)
          success: {
            style: {
              background: 'linear-gradient(135deg, #1e1b4b 0%, #3b3678 100%)',
              border: '2px solid #10b981',
              borderRadius: '16px',
              padding: '20px 24px',
              fontSize: '16px',
              fontWeight: '600',
              boxShadow: '0 20px 40px rgba(16, 185, 129, 0.3), 0 0 0 1px rgba(255,255,255,0.1)',
              minWidth: '320px',
              maxWidth: '500px',
              textAlign: 'center',
            },
            icon: '✅',
          },

          // Error Style (Red border)
          error: {
            style: {
              background: 'linear-gradient(135deg, #1e1b4b 0%, #3b3678 100%)',
              border: '2px solid #ef4444',
              borderRadius: '16px',
              padding: '20px 24px',
              fontSize: '16px',
              fontWeight: '600',
              boxShadow: '0 20px 40px rgba(239, 68, 68, 0.3), 0 0 0 1px rgba(255,255,255,0.1)',
              minWidth: '320px',
              maxWidth: '500px',
              textAlign: 'center',
            },
            icon: '❌',
          },

          // Warning Style (Orange border)
          warning: {
            style: {
              background: 'linear-gradient(135deg, #1e1b4b 0%, #3b3678 100%)',
              border: '2px solid #f59e0b',
              borderRadius: '16px',
              padding: '20px 24px',
              fontSize: '16px',
              fontWeight: '600',
              boxShadow: '0 20px 40px rgba(245, 158, 11, 0.3), 0 0 0 1px rgba(255,255,255,0.1)',
              minWidth: '320px',
              maxWidth: '500px',
              textAlign: 'center',
            },
            icon: '⚠️',
          },

          // Info Style (Blue border)
          info: {
            style: {
              background: 'linear-gradient(135deg, #1e1b4b 0%, #3b3678 100%)',
              border: '2px solid #3b82f6',
              borderRadius: '16px',
              padding: '20px 24px',
              fontSize: '16px',
              fontWeight: '600',
              boxShadow: '0 20px 40px rgba(59, 130, 246, 0.3), 0 0 0 1px rgba(255,255,255,0.1)',
              minWidth: '320px',
              maxWidth: '500px',
              textAlign: 'center',
            },
            icon: 'ℹ️',
          },

          // Loading Style (Cyan border)
          loading: {
            style: {
              background: 'linear-gradient(135deg, #1e1b4b 0%, #3b3678 100%)',
              border: '2px solid #06b6d4',
              borderRadius: '16px',
              padding: '20px 24px',
              fontSize: '16px',
              fontWeight: '600',
              boxShadow: '0 20px 40px rgba(6, 182, 212, 0.3), 0 0 0 1px rgba(255,255,255,0.1)',
              minWidth: '320px',
              maxWidth: '500px',
              textAlign: 'center',
            },
            icon: '⏳',
          },
        }}
      />
      <Routes>
        {/* Root landing page */}
        <Route path="/" element={<StackedLanding />} />

        {/* Tenant-scoped routes: /:tenantSlug/* */}
        <Route path="/:tenantSlug/*" element={<TenantApp />} />
      </Routes>
    </BrowserRouter>
  )
}


export default App
