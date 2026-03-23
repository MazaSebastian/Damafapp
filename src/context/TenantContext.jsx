import { createContext, useContext, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Loader2, AlertTriangle } from 'lucide-react'

const TenantContext = createContext()

/**
 * TenantProvider resolves the current tenant from the URL slug.
 * 
 * URL pattern: /:tenantSlug/menu, /:tenantSlug/admin, etc.
 * 
 * It fetches the tenant from the `tenants` table using the slug,
 * and provides tenant data to all child components.
 */
export const TenantProvider = ({ children }) => {
    const { tenantSlug } = useParams()
    const [tenant, setTenant] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (!tenantSlug) {
            setLoading(false)
            setError('No se especificó un local')
            return
        }

        const fetchTenant = async () => {
            try {
                const { data, error: fetchError } = await supabase
                    .from('tenants')
                    .select('*')
                    .eq('slug', tenantSlug)
                    .eq('is_active', true)
                    .maybeSingle()

                if (fetchError) throw fetchError

                if (!data) {
                    setError('Local no encontrado o inactivo')
                    setTenant(null)
                } else {
                    setTenant(data)
                    setError(null)
                }
            } catch (err) {
                console.error('Error fetching tenant:', err)
                setError('Error al cargar el local')
            } finally {
                setLoading(false)
            }
        }

        fetchTenant()
    }, [tenantSlug])

    // Set browser tab title and favicon to tenant branding (must be before conditional returns)
    useEffect(() => {
        if (tenant?.name) {
            document.title = tenant.name
        }
        // Update favicon to tenant logo
        const favicon = document.querySelector('link[rel="icon"]')
        const appleFavicon = document.querySelector('link[rel="apple-touch-icon"]')
        if (tenant?.logo_url) {
            if (favicon) favicon.href = tenant.logo_url
            if (appleFavicon) appleFavicon.href = tenant.logo_url
        }
        return () => {
            document.title = 'Stacked'
            if (favicon) favicon.href = '/logo-stacked.png'
            if (appleFavicon) appleFavicon.href = '/logo-stacked.png'
        }
    }, [tenant?.name, tenant?.logo_url])

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--color-background)] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-[var(--color-primary)]" />
                <p className="text-[var(--color-text-muted)] text-sm">Cargando local...</p>
            </div>
        )
    }

    // Error state
    if (error || !tenant) {
        return (
            <div className="min-h-screen bg-[var(--color-background)] flex flex-col items-center justify-center gap-4 p-6">
                <div className="bg-[var(--color-surface)]/80 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-2xl max-w-sm w-full text-center">
                    <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Local no disponible</h2>
                    <p className="text-[var(--color-text-muted)] text-sm">
                        {error || 'El local solicitado no existe o está temporalmente inactivo.'}
                    </p>
                    <p className="text-[var(--color-text-muted)] text-xs mt-4 opacity-60">
                        Slug: {tenantSlug}
                    </p>
                </div>
            </div>
        )
    }

    const value = {
        tenant,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
        tenantLogo: tenant.logo_url,
        tenantTheme: tenant.theme || {},
        tenantSettings: tenant.settings || {},
        tenantPlan: tenant.plan,
    }

    return (
        <TenantContext.Provider value={value}>
            {children}
        </TenantContext.Provider>
    )
}

export const useTenant = () => {
    const context = useContext(TenantContext)
    if (!context) {
        throw new Error('useTenant must be used within a TenantProvider (inside a /:tenantSlug route)')
    }
    return context
}
