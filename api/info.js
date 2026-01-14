import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    )

    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase Environment Variables')
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // Fetch settings
        const { data: settings, error } = await supabase
            .from('app_settings')
            .select('key, value')

        if (error) throw error

        // Transform to key-value map
        const settingsMap = settings?.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {}) || {}

        const responseData = {
            id: 'damafapp', // Unique ID for this instance?
            name: "Damafa Hamburguesas",
            slogan: settingsMap.store_slogan || "Hamburguesas",
            status: settingsMap.store_status || "closed",
            address: settingsMap.store_address || "",
            schedule: settingsMap.store_schedule_text || "",
            instagram: settingsMap.store_instagram || "",
            // Additional Metadata
            type: "burger_joint",
            api_version: "v1"
        }

        res.status(200).json(responseData)

    } catch (error) {
        console.error('API Error:', error)
        res.status(500).json({ error: 'Internal Server Error', details: error.message })
    }
}
