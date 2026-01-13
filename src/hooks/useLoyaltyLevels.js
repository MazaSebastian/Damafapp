import { useSettings } from '../context/SettingsContext'
import { useAuth } from '../context/AuthContext'

export const useLoyaltyLevels = () => {
    const { getSetting, loading: settingsLoading } = useSettings()
    const { profile } = useAuth()

    const lifetimeStars = profile?.lifetime_stars || 0

    // Fetch dynamic settings (with defaults if missing)
    const LEVEL_GREEN_MIN = getSetting('loyalty_level_green', 50, 'number')
    const LEVEL_GOLD_MIN = getSetting('loyalty_level_gold', 300, 'number')
    const REWARD_CYCLE = 100

    // Helper to parse comma-separated benefits
    const parseBenefits = (key, defaultText) => {
        const val = getSetting(key, defaultText)
        return val ? val.split(',').map(b => b.trim()).filter(Boolean) : []
    }

    const BENEFITS_WELCOME = parseBenefits('loyalty_benefits_welcome', 'Bebida de cumpleaños')
    const BENEFITS_GREEN = parseBenefits('loyalty_benefits_green', 'Refill Café del Día, Ofertas especiales')
    const BENEFITS_GOLD = parseBenefits('loyalty_benefits_gold', 'Bebida Alta cada 100 stars, Eventos VIP, Gold Card Digital')

    // Define Levels based on dynamic settings
    const LEVELS = [
        {
            name: 'Welcome',
            min: 0,
            max: LEVEL_GREEN_MIN - 1,
            color: 'text-gray-400',
            bg: 'bg-gray-400',
            benefits: BENEFITS_WELCOME
        },
        {
            name: 'Green',
            min: LEVEL_GREEN_MIN,
            max: LEVEL_GOLD_MIN - 1,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500',
            benefits: BENEFITS_GREEN
        },
        {
            name: 'Gold',
            min: LEVEL_GOLD_MIN,
            max: Infinity,
            color: 'text-yellow-400',
            bg: 'bg-yellow-400',
            benefits: BENEFITS_GOLD
        }
    ]

    // Calculate current level
    let currentLevelIndex = 0
    for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (lifetimeStars >= LEVELS[i].min) {
            currentLevelIndex = i
            break
        }
    }

    const currentLevel = LEVELS[currentLevelIndex]
    const nextLevel = LEVELS[currentLevelIndex + 1] || null

    let progress = 0
    let starsToNext = 0

    if (nextLevel) {
        // Calculate progress to next level
        const totalRange = nextLevel.min - currentLevel.min
        const currentProgress = lifetimeStars - currentLevel.min
        progress = (currentProgress / totalRange) * 100
        starsToNext = nextLevel.min - lifetimeStars
    } else {
        // Max level reached (Gold)
        // For Gold, calculate progress towards next free drink (every REWARD_CYCLE stars)
        const starsSinceGold = lifetimeStars - currentLevel.min
        const starsTowardsNextDrink = starsSinceGold % REWARD_CYCLE
        progress = (starsTowardsNextDrink / REWARD_CYCLE) * 100 // 0 to 100
        starsToNext = REWARD_CYCLE - starsTowardsNextDrink
    }

    const levelsMap = {
        WELCOME: LEVELS[0],
        GREEN: LEVELS[1],
        GOLD: LEVELS[2]
    }

    return {
        currentLevel,
        nextLevel,
        progress: Math.min(Math.max(progress, 0), 100), // Clamp 0-100
        starsToNext,
        loading: settingsLoading,
        levels: levelsMap,
        moneyPerStar: getSetting('loyalty_earning_divisor', 100, 'number')
    }
}
