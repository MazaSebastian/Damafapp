```javascript
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import { AnimatePresence } from 'framer-motion'
import PageTransition from './components/PageTransition'
import ProtectedRoute from './components/ProtectedRoute'

import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
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

const AnimatedRoutes = () => {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
        <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
        <Route path="/delivery" element={
          <ProtectedRoute role="admin">
            <DeliveryDashboard />
          </ProtectedRoute>
        } />
        <Route path="/rider" element={
          <RiderInterface />
        } />
        <Route path="/admin" element={<PageTransition><AdminDashboard /></PageTransition>} />
        <Route path="/club-info" element={<PageTransition><ClubInfoPage /></PageTransition>} />
        <Route path="/rewards" element={<PageTransition><RewardsStorePage /></PageTransition>} />
        <Route path="/menu" element={<PageTransition><MenuPage /></PageTransition>} />
        <Route path="/checkout" element={<PageTransition><CheckoutPage /></PageTransition>} />
        <Route path="/my-orders" element={<PageTransition><MyOrdersPage /></PageTransition>} />
        <Route path="/coupons" element={<PageTransition><CouponsPage /></PageTransition>} />
        <Route path="/profile" element={<PageTransition><ProfilePage /></PageTransition>} />
        <Route path="/privacy" element={<PageTransition><PrivacyPolicyPage /></PageTransition>} />
        <Route path="/terms" element={<PageTransition><TermsPage /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  )
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
            color: 'var(--color-text-main)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
          actionButtonStyle: {
            background: 'var(--color-primary)',
            color: 'white',
          },
          cancelButtonStyle: {
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'var(--color-text-muted)',
          },
        }}
      />
      <AuthProvider>
        <LanguageProvider>
          <CartProvider>
            <AnimatedRoutes />
          </CartProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
