import { useNavigate } from 'react-router-dom'
import { useTenant } from '../context/TenantContext'

/**
 * Tenant-aware navigation hook.
 * 
 * Automatically prefixes all paths with the current tenant slug.
 * 
 * Usage:
 *   const tenantNav = useTenantNav()
 *   tenantNav.navigate('/menu')         → navigates to /damafa/menu
 *   tenantNav.path('/admin')            → returns '/damafa/admin'
 *   tenantNav.navigate('/login')        → navigates to /damafa/login
 */
export const useTenantNav = () => {
    const navigate = useNavigate()
    const { tenantSlug } = useTenant()

    const tenantPath = (path) => {
        // If path already starts with the tenant slug, don't double-prefix
        if (path.startsWith(`/${tenantSlug}`)) return path
        // Ensure path starts with /
        const cleanPath = path.startsWith('/') ? path : `/${path}`
        return `/${tenantSlug}${cleanPath}`
    }

    const tenantNavigate = (path, options) => {
        navigate(tenantPath(path), options)
    }

    return {
        navigate: tenantNavigate,
        path: tenantPath,
        slug: tenantSlug,
    }
}
