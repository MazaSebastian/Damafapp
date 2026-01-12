import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/AdminDashboard'
import ClubInfoPage from './pages/ClubInfoPage'
import RewardsStorePage from './pages/RewardsStorePage'
import MenuPage from './pages/MenuPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/club-info" element={<ClubInfoPage />} />
          <Route path="/rewards" element={<RewardsStorePage />} />
          <Route path="/menu" element={<MenuPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
