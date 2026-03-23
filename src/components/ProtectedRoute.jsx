import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTenantNav } from '../hooks/useTenantNav'
import { Loader2 } from 'lucide-react'

const ProtectedRoute = ({ children, role }) => {
    const { user, role: userRole, loading } = useAuth()
    const tenantNav = useTenantNav()

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-[var(--color-primary)]" />
            </div>
        )
    }

    if (!user) {
        return <Navigate to={tenantNav.path('/login')} replace />
    }

    if (role) {
        const allowedRoles = Array.isArray(role) ? role : [role]
        // Owner always has access to everything
        if (userRole !== 'owner' && !allowedRoles.includes(userRole)) {
            return <Navigate to={tenantNav.path('/')} replace />
        }
    }

    return children
}

export default ProtectedRoute
