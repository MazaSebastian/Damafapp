
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

try {
    const envConfig = dotenv.parse(fs.readFileSync('.env'))
    for (const k in envConfig) {
        process.env[k] = envConfig[k]
    }
} catch (e) {
    console.log("No .env file found")
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

// Note: If we don't have SERVICE_ROLE key in .env (common in local dev if not exposed), 
// we might still face RLS. But let's verify what we get.
console.log("Connecting with key length:", supabaseKey?.length);

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    console.log("Checking afip_credentials table (Service Role Attempt)...")

    const { data, error } = await supabase.from('afip_credentials').select('*')

    if (error) {
        console.error("Error fetching credentials:", error)
    } else {
        console.log(`Fetched ${data.length} credentials rows.`)
        data.forEach(c => {
            console.log(`[ID: ${c.id}] Env: ${c.environment}, CUIT: ${c.cuit}, PTO_VTA: ${c.sales_point}, Tax: ${c.tax_condition}, Active: ${c.is_active}`)
        })
    }
}

check()
