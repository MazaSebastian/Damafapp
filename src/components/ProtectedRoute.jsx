import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loader2 } from 'lucide-react'

const ProtectedRoute = ({ children, role }) => {
    const { user, role: userRole, loading } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-[var(--color-primary)]" />
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    if (role) {
        const allowedRoles = Array.isArray(role) ? role : [role]
        // Owner always has access to everything
        if (!allowedRoles.includes(userRole) && userRole !== 'owner' && userRole !== 'admin') {
            // Logic update: 'admin' implies 'owner' privileges level usually, but if we restrict KDS strictly to kitchen... 
            // Actually, usually Admin should see everything. 
            // Let's make it simple: if userRole is owner/admin, allow.
            // OR if userRole is in allowedRoles.
            // But if allowedRoles=['kitchen'], and I am admin, I should probably see it? 
            // Let's stick to strict role check unless 'owner'. Admin usually has role='admin'.

            // If we want admin to access kitchen route, we pass role=['admin', 'kitchen'] to the route.

            if (!allowedRoles.includes(userRole) && userRole !== 'owner') {
                return <Navigate to="/" replace />
            }
        }
    }

    return children
}

export default ProtectedRoute
