import { useEffect } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTenantNav } from '../hooks/useTenantNav'

/**
 * Component that redirects users to their role-specific page
 * when they land on the home page
 */
const RoleBasedRedirect = ({ children }) => {
    const { role, loading } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const tenantNav = useTenantNav()
    const { tenantSlug } = useParams()

    useEffect(() => {
        // Only redirect if we're on the tenant home page and not loading
        const tenantHome = `/${tenantSlug}`
        if (loading || (location.pathname !== '/' && location.pathname !== tenantHome && location.pathname !== `${tenantHome}/`)) return

        // Redirect based on role
        if (role === 'kitchen') {
            tenantNav.navigate('/kds', { replace: true })
        } else if (role === 'admin' || role === 'owner') {
            tenantNav.navigate('/admin', { replace: true })
        } else if (role === 'rider' || role === 'driver') {
            // NOTE: 'driver' is legacy — standardize on 'rider' for new profiles
            tenantNav.navigate('/rider', { replace: true })
        }
        // Regular users stay on home page
    }, [role, loading, location.pathname, navigate, tenantSlug])

    return children
}

export default RoleBasedRedirect
