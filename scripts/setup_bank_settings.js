import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase Environment Variables')
    process.exit(1)
}

console.log('Connecting to Supabase...')
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
    console.log('Inserting bank settings...')
    const values = [
        { key: 'bank_cbu', value: '', description: 'CBU/CVU para transferencias' },
        { key: 'bank_alias', value: '', description: 'Alias para transferencias' },
        { key: 'bank_holder', value: '', description: 'Titular de la cuenta' },
        { key: 'bank_name', value: '', description: 'Nombre del Banco/Billetera' }
    ]

    for (const item of values) {
        // We use upsert to ensure we don't duplicate or error if exists
        // 'ignoreDuplicates: true' would skip update, but here we want to ensure keys exist.
        // The SQL script said 'ON CONFLICT DO NOTHING', so we should probably preserve existing values if any.
        // We'll Fetch first.

        const { data: existing } = await supabase
            .from('app_settings')
            .select('*')
            .eq('key', item.key)
            .single()

        if (!existing) {
            const { error } = await supabase
                .from('app_settings')
                .insert([item])

            if (error) {
                console.error(`Error inserting ${item.key}:`, error.message)
            } else {
                console.log(`Inserted ${item.key}`)
            }
        } else {
            console.log(`Skipped ${item.key} (already exists)`)
        }
    }
    console.log('Done.')
}

run()
