import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'
import { useTenantNav } from '../hooks/useTenantNav'
import LandingPage from '../components/LandingPage'
import UserHome from '../components/UserHome'

const HomePage = () => {
    const { user, role } = useAuth()
    const tenantNav = useTenantNav()

    // Redirect Admins/Owners to Admin Dashboard
    if (role === 'admin' || role === 'owner') {
        return <Navigate to={tenantNav.path('/admin')} replace />
    }

    // Redirect Kitchen users to KDS
    if (role === 'kitchen') {
        return <Navigate to={tenantNav.path('/kds')} replace />
    }

    // Redirect Riders/Drivers to Rider Interface
    if (role === 'rider' || role === 'driver') {
        return <Navigate to={tenantNav.path('/rider')} replace />
    }

    // Guest View (Not logged in)
    if (!user) {
        return <LandingPage />
    }

    // Authenticated View (Logged in as regular user)
    return <UserHome />
}

export default HomePage
