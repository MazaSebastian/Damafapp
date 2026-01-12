import { Home, UtensilsCrossed, QrCode, User, Ticket } from 'lucide-react'
import { Link } from 'react-router-dom'

const BottomNav = () => {
    return (
        <nav className="fixed bottom-0 w-full bg-[var(--color-surface)] border-t border-white/5 px-6 py-3 flex justify-between items-center z-50">
            <Link to="/">
                <NavItem icon={<Home className="w-6 h-6" />} label="Inicio" active />
            </Link>
            <NavItem icon={<UtensilsCrossed className="w-6 h-6" />} label="Pide aquí" />
            <NavItem icon={<QrCode className="w-6 h-6" />} label="Código" />
            <NavItem icon={<User className="w-6 h-6" />} label="Canjes" />
            <NavItem icon={<Ticket className="w-6 h-6" />} label="Cupones" />
        </nav>
    )
}

const NavItem = ({ icon, label, active }) => (
    <div className={`flex flex-col items-center gap-1 ${active ? 'text-[var(--color-secondary)]' : 'text-[var(--color-text-muted)] hover:text-white transition-colors cursor-pointer'}`}>
        {icon}
        <span className="text-[10px] font-medium">{label}</span>
    </div>
)

export default BottomNav
