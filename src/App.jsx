import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import { SettingsProvider } from './context/SettingsContext'
import { AnimatePresence } from 'framer-motion'
import PageTransition from './components/PageTransition'
import ProtectedRoute from './components/ProtectedRoute'

import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AdminDashboard from './pages/AdminDashboard'
import ClubInfoPage from './pages/ClubInfoPage'
import RewardsStorePage from './pages/RewardsStorePage'
import MenuPage from './pages/MenuPage'
import CheckoutPage from './pages/CheckoutPage'
import MyOrdersPage from './pages/MyOrdersPage'
import CouponsPage from './pages/CouponsPage'
import ProfilePage from './pages/ProfilePage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsPage from './pages/TermsPage'
import DeliveryDashboard from './components/DeliveryDashboard'
import RiderInterface from './components/RiderInterface'
import { CartProvider } from './context/CartContext'
import KDSPage from './pages/KDSPage'
import CustomerDisplayPage from './pages/CustomerDisplayPage'
import POSPage from './pages/POSPage'
import useFCM from './hooks/useFCM.jsx'

const AnimatedRoutes = () => {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/kds" element={
          <ProtectedRoute role={['admin', 'kitchen']}>
            <KDSPage />
          </ProtectedRoute>
        } />

        <Route path="/display/client" element={<CustomerDisplayPage />} />

        <Route path="/delivery" element={
          <ProtectedRoute role="admin">
            <DeliveryDashboard />
          </ProtectedRoute>
        } />
        <Route path="/rider" element={
          <RiderInterface />
        } />

        {/* Specific Admin Routes first */}
        <Route path="/admin/pos" element={
          <ProtectedRoute role={['admin', 'owner']}>
            <POSPage />
          </ProtectedRoute>
        } />

        {/* General Admin Dashboard last (catch-all for /admin) */}
        <Route path="/admin" element={<PageTransition><AdminDashboard /></PageTransition>} />

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
      </Routes >
    </AnimatePresence >
  )
}


import IOSInstallPrompt from './components/pwa/IOSInstallPrompt';
import NotificationModal from './components/NotificationModal';

// Wrapper to use hooks that depend on contexts
const AppContent = () => {
  // Initialize FCM
  useFCM();

  return (
    <>
      <AnimatedRoutes />
      <IOSInstallPrompt />
      <NotificationModal />
    </>
  );
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
            transform: 'translateY(40px)',
            minWidth: '320px',
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
              textAlign: 'center',
            },
            icon: '⏳',
          },
        }}
      />
      <SettingsProvider>
        <AuthProvider>
          <LanguageProvider>
            <CartProvider>
              <AppContent />
            </CartProvider>
          </LanguageProvider>
        </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>
  )
}


export default App
