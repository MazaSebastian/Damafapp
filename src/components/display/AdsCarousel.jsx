import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTenant } from '../../context/TenantContext'

// Placeholder images - You should replace these with your actual promotional assets
const ADS = [
    {
        id: 1,
        image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=2944&auto=format&fit=crop',
        title: '¡Hamburguesas Supremas!',
        subtitle: 'Prueba nuestra nueva Doble Cheddar'
    },
    {
        id: 2,
        image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=2865&auto=format&fit=crop',
        title: 'Combos Familiares',
        subtitle: 'La mejor opción para compartir'
    },
    {
        id: 3,
        image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?q=80&w=2942&auto=format&fit=crop',
        title: 'Postres Irresistibles',
        subtitle: 'Termina tu comida con algo dulce'
    }
]

const AdsCarousel = () => {
    const { tenantLogo } = useTenant()
    const [currentIndex, setCurrentIndex] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % ADS.length)
        }, 8000) // Change slide every 8 seconds

        return () => clearInterval(timer)
    }, [])

    return (
        <div className="w-full h-screen bg-black overflow-hidden relative">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.5 }}
                    className="absolute inset-0"
                >
                    {/* Background Image */}
                    <img
                        src={ADS[currentIndex].image}
                        alt={ADS[currentIndex].title}
                        className="w-full h-full object-cover opacity-60"
                    />

                    {/* Dark Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />

                    {/* Content */}
                    <div className="absolute bottom-20 left-10 max-w-2xl">
                        <motion.h1
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="text-7xl font-black text-white mb-4 drop-shadow-lg leading-tight"
                        >
                            {ADS[currentIndex].title}
                        </motion.h1>
                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            className="text-3xl text-gray-200 font-medium drop-shadow-md"
                        >
                            {ADS[currentIndex].subtitle}
                        </motion.p>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Progress indicators */}
            <div className="absolute bottom-10 left-10 flex gap-3">
                {ADS.map((_, idx) => (
                    <div
                        key={idx}
                        className={`h-2 rounded-full transition-all duration-500 ${idx === currentIndex ? 'w-12 bg-[var(--color-primary)]' : 'w-4 bg-white/30'
                            }`}
                    />
                ))}
            </div>

            <div className="absolute top-10 right-10">
                <img src={tenantLogo || '/logo-stacked.png'} alt="Logo" className="h-24 w-auto drop-shadow-2xl" />
            </div>
        </div>
    )
}

export default AdsCarousel
