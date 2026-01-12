/**
 * Central Configuration for Brand Identity
 * 
 * Update this file to rebrand the application for a new client.
 * Ideally, these values should replace hardcoded strings in components.
 */

export const brand = {
    // Identity
    name: "DamafAPP",
    companyName: "DamafAPP Inc.", // For Footer/Copyright
    slogan: "¿Con qué pensas bajonear hoy?",

    // Assets
    logo: "/logo-damaf.png", // Path in /public
    favicon: "/favicon.ico",

    // Colors (Reference to CSS Variables in index.css)
    // To change colors effectively, update index.css :root variables.
    colors: {
        primary: "#d62300",   // Burger King Red
        secondary: "#502314", // Burger King Brown
        background: "#302c64", // Damaf Purple
    },

    // Contact & Socials
    contact: {
        email: "soporte@damafapp.com",
        phone: "+54 9 11 1234 5678",
        instagram: "https://instagram.com/damafapp",
        website: "https://damafapp.com"
    },

    // Features Flags (Toggle features per client)
    features: {
        loyaltySystem: true, // Points/Club
        coupons: true,
        delivery: true,
        reservations: false, // "Encotrar restaurante" aka reservations/map
    },

    // Versioning
    version: "2.1.0"
}

export default brand
