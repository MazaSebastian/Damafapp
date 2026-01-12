import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: Missing environment variables.')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkUsers() {
    console.log('Checking profiles table...')

    const { data, error } = await supabase
        .from('profiles')
        .select('*')

    if (error) {
        console.error('Error fetching profiles:', error.message)
        return
    }

    if (data.length === 0) {
        console.log('No profiles found. Sign up a user on the website first.')
    } else {
        console.log(`Found ${data.length} profiles:`)
        console.table(data)
    }
}

checkUsers()
