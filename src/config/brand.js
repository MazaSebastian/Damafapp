/**
 * Central Configuration for Brand Identity
 * 
 * In SaaS mode, these serve as DEFAULT values.
 * The actual brand is loaded dynamically from the tenant's config.
 * Use the useBrand() hook to access the current brand values.
 */
import { useTenant } from '../context/TenantContext'

// Default brand values (used as fallback when tenant data isn't loaded yet)
export const defaultBrand = {
    // Identity
    name: "Stacked",
    companyName: "Stacked",
    slogan: "Tu gestión gastronómica, simplificada.",

    // Assets
    logo: "/logo-stacked.png",
    favicon: "/favicon.ico",

    // Colors (Reference to CSS Variables in index.css)
    colors: {
        primary: "#f97316",
        secondary: "#ea580c",
        background: "#0a0a0a",
    },

    // Contact & Socials
    contact: {
        email: "soporte@stacked.com",
        phone: "+54 9 11 1234 5678",
        instagram: "https://instagram.com/stacked",
        website: "https://stacked.com"
    },

    // Features Flags (Toggle features per client)
    features: {
        loyaltySystem: true,
        coupons: true,
        delivery: true,
        reservations: false,
    },

    // Versioning
    version: "2.1.0"
}

/**
 * Hook to get the current brand, merging tenant overrides with defaults.
 * 
 * Usage:
 *   const brand = useBrand()
 *   brand.name → "Hamburguesas Pepito" (from tenant) or "Stacked" (default)
 */
export const useBrand = () => {
    try {
        const { tenant, tenantSettings } = useTenant()

        return {
            ...defaultBrand,
            name: tenant?.name || defaultBrand.name,
            logo: tenant?.logo_url || defaultBrand.logo,
            slogan: tenantSettings?.slogan || defaultBrand.slogan,
            contact: {
                ...defaultBrand.contact,
                email: tenant?.contact_email || defaultBrand.contact.email,
                phone: tenant?.contact_phone || defaultBrand.contact.phone,
            },
        }
    } catch {
        // If used outside TenantProvider, return defaults
        return defaultBrand
    }
}

// Keep backward compatibility for imports that use `brand` directly
export const brand = defaultBrand
export default defaultBrand
