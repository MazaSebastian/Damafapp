import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import OrderModal from './OrderModal'

const FloatingOrderButton = () => {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const navigate = useNavigate()

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#d64322] text-white px-6 py-3 rounded-full shadow-[0_0_20px_rgba(214,67,34,0.6)] flex items-center gap-2 z-50 animate-bounce hover:scale-105 active:scale-95 transition-all font-bold border-2 border-white/20"
                style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
            >
                <ShoppingBag className="w-5 h-5 fill-white/20" />
                PIDE AQUÍ
            </button>

            <OrderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    )
}

export default FloatingOrderButton
