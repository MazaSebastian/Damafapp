import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export const useStoreStatus = () => {
    const [isOpen, setIsOpen] = useState(true) // Default true to avoid flash of closed
    const [statusText, setStatusText] = useState('Abierto')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchStatus()

        // Realtime subscription
        const channel = supabase
            .channel('store_status_hook')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'app_settings',
                filter: "key=eq.store_status"
            }, (payload) => {
                const newStatus = payload.new.value
                setIsOpen(newStatus === 'open')
                setStatusText(newStatus === 'open' ? 'Abierto' : 'Cerrado')
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const fetchStatus = async () => {
        const { data } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'store_status')
            .single()

        if (data) {
            setIsOpen(data.value === 'open')
            setStatusText(data.value === 'open' ? 'Abierto' : 'Cerrado')
        }
        setLoading(false)
    }

    return { isOpen, statusText, loading }
}
