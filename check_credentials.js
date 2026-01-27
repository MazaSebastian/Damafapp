
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    console.log("Checking afip_credentials table...")

    // Since we might need RLS bypass to see credentials, we might need service role or just try if we can see them.
    // Credentials table usually HAS RLS. 
    // If this fails, I'll need to disable RLS on credentials too or use service key properly.
    // But let's try reading.

    const { data, error } = await supabase.from('afip_credentials').select('*')

    if (error) {
        console.error("Error fetching credentials:", error)
    } else {
        console.log(`Fetched ${data.length} credentials rows.`)
        data.forEach(c => {
            console.log(`Env: ${c.environment}, CUIT: ${c.cuit}, PTO_VTA: ${c.sales_point}, Tax: ${c.tax_condition}, Active: ${c.is_active}`)
        })
    }
}

check()
