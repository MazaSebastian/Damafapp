import { useState, useEffect } from 'react';
import { Share, PlusSquare, X } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';

const IOSInstallPrompt = () => {
    const { tenantLogo, tenantName } = useTenant();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Detect iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

        // Detect Standalone (already installed)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

        // Show only if iOS and NOT standalone (and avoiding PWA which launches in standalone)
        if (isIOS && !isStandalone) {
            // Check if user has dismissed it recently (e.g. dont show for 24h)
            const lastDismissed = localStorage.getItem('iosInstallDismissed');
            if (lastDismissed) {
                const hoursSince = (Date.now() - parseInt(lastDismissed)) / 1000 / 60 / 60;
                if (hoursSince < 24) return;
            }

            // Start visible immediately (animation handles the transition)
            setIsVisible(true);
        }
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('iosInstallDismissed', Date.now().toString());
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-10 fade-in duration-700 ease-out">
            <div className="bg-[var(--color-surface)] border border-white/10 rounded-2xl p-5 shadow-2xl relative max-w-md mx-auto backdrop-blur-xl bg-black/80">
                <button
                    onClick={handleDismiss}
                    className="absolute top-3 right-3 text-white/40 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex items-start gap-4">
                    <img src={tenantLogo || '/logo-stacked.png'} alt={tenantName} className="w-14 h-14 rounded-2xl shadow-lg border border-white/10 object-cover" />
                    <div className="space-y-2">
                        <h3 className="font-bold text-white text-lg leading-tight">
                            Instala {tenantName}
                        </h3>
                        <p className="text-sm text-[var(--color-text-muted)]">
                            Para recibir notificaciones y tener la mejor experiencia, agrega la App a tu inicio.
                        </p>
                    </div>
                </div>

                <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-3 text-sm text-white/80 bg-white/5 p-3 rounded-xl">
                        <Share size={20} className="text-blue-400" />
                        <span>1. Toca el botón <b>Compartir</b> abajo</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-white/80 bg-white/5 p-3 rounded-xl">
                        <PlusSquare size={20} className="text-[var(--color-text-primary)]" />
                        <span>2. Elige <b>Agregar a Inicio</b></span>
                    </div>
                </div>

                {/* Pointing Arrow Animation */}
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce text-white/50">
                    <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-[var(--color-surface)]"></div>
                    <span className="text-xs font-bold mt-1">Aquí abajo</span>
                </div>
            </div>
        </div>
    );
};

export default IOSInstallPrompt;
