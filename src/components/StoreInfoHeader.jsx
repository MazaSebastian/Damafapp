import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { MapPin, Clock, Instagram } from 'lucide-react'
import { motion } from 'framer-motion'

const StoreInfoHeader = () => {
    const [info, setInfo] = useState({
        slogan: 'Perfectamente desubicadas.',
        address: 'Carapachay, Vicente López',
        schedule: 'Jueves a Domingos de 20hs a 23hs',
        status: 'open',
        instagram: 'https://instagram.com/damafa'
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchInfo = async () => {
            const { data } = await supabase.from('app_settings').select('*')
            if (data) {
                const newInfo = { ...info }
                data.forEach(item => {
                    if (item.key === 'store_slogan') newInfo.slogan = item.value
                    if (item.key === 'store_address') newInfo.address = item.value
                    if (item.key === 'store_schedule_text') newInfo.schedule = item.value
                    if (item.key === 'store_status') newInfo.status = item.value
                    if (item.key === 'store_instagram') newInfo.instagram = item.value
                })
                setInfo(newInfo)
            }
            setLoading(false)
        }

        fetchInfo()

        // Realtime updates for status changes (open/closed)
        const channel = supabase
            .channel('store_info_header')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_settings' }, fetchInfo)
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [])

    if (loading) return <div className="h-48 animate-pulse bg-white/5 rounded-xl mb-6"></div>

    return (
        <div className="text-center mb-8 relative">
            {/* Logo Area */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
            >
                {/* Logo Area */}
                <div className="flex justify-center mb-2">
                    <img src="/logo-damaf.png" alt="DAMAFAPP" className="h-20 md:h-28 w-auto drop-shadow-2xl hover:scale-105 transition-transform" />
                </div>

                <div>
                    <p className="text-lg font-bold text-gray-400 italic">{info.slogan}</p>
                </div>

                <div className="flex flex-col items-center gap-1 text-sm text-gray-300">
                    <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-orange-500" />
                        <span>{info.address}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-orange-500" />
                        <span>{info.schedule}</span>
                    </div>
                </div>

                {/* Status Indicator */}
                <div className="flex justify-center my-4">
                    {info.status === 'open' ? (
                        <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            ABIERTO
                        </div>
                    ) : (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                            <span className="w-3 h-3 rounded-full bg-red-500"></span>
                            CERRADO
                        </div>
                    )}
                </div>

                {/* Instagram CTA */}
                <a
                    href={info.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2.5 rounded-full font-bold hover:shadow-lg hover:shadow-pink-500/20 transition-all transform hover:-translate-y-0.5"
                >
                    <Instagram className="w-5 h-5" />
                    Instagram
                </a>
            </motion.div>
        </div>
    )
}

export default StoreInfoHeader
