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
import useFCM from './hooks/useFCM'

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


// Wrapper to use hooks that depend on contexts
const AppContent = () => {
  // Initialize FCM
  useFCM();

  return (
    <AnimatedRoutes />
  );
}

function App() {
  return (
    <BrowserRouter>
      <Toaster
        richColors
        position="top-center"
        theme="dark"
        toastOptions={{
          style: {
            background: 'var(--color-surface)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white',
            fontFamily: 'Outfit, sans-serif',
          },
          className: 'premium-toast',
          actionButtonStyle: {
            background: 'var(--color-primary)',
            color: 'white',
            fontWeight: 'bold',
          },
          cancelButtonStyle: {
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--color-text-muted)',
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
