import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { toast } from 'sonner'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [role, setRole] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true
        let retryCount = 0

        // Safety timeout (Force load after 6s if DB hangs in bad networks)
        const timeout = setTimeout(() => {
            if (mounted) {
                setLoading((current) => {
                    if (current) console.warn('Auth loading safety timeout triggered')
                    return false
                })
            }
        }, 6000)

        // Check active sessions and sets the user
        const initAuth = async () => {
            // Redundant explicitly calling getSession is fine, but we rely on onAuthStateChange for the main flow usually.
            // However, strictly getting it once is safe.
            // We will depend on onAuthStateChange for the logic to avoid double-fetching.
            pass
        }

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            console.log('Auth state changed:', _event)
            if (!mounted) return

            setUser(session?.user ?? null)

            if (session?.user) {
                // Await profile fetch
                try {
                    await fetchProfile(session.user.id)
                } catch (e) {
                    console.error("Profile fetch sequence failed")
                }
            } else {
                setProfile(null)
                setRole(null)
            }

            // Critical: Clean up timeout if we successfully loaded
            if (mounted) {
                clearTimeout(timeout)
                setLoading(false)
            }
        })

        return () => {
            mounted = false
            subscription.unsubscribe()
            clearTimeout(timeout)
        }
    }, [])

    const fetchProfile = async (userId, retries = 3) => {
        try {
            // using maybeSingle() instead of single() avoids the 406 error when no rows are found
            // This is cleaner and allows us to distinguish between "network error" and "not found"
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle()

            if (error) {
                console.error('Error fetching profile:', error)
                // Retry specific errors (e.g. network timeout), but maybe restrict logic
                if (retries > 0) {
                    console.log(`Retrying profile fetch in 1s... (${retries} left)`)
                    await new Promise(r => setTimeout(r, 1000))
                    return await fetchProfile(userId, retries - 1)
                }

                setProfile(null)
                setRole(null)
                return
            }

            if (data) {
                console.log('Profile loaded:', data.email, 'Role:', data.role)
                setProfile(data)
                setRole(data.role)
            } else {
                console.warn('Profile not found for user:', userId)
                // If the user exists but profile is missing, it might be an RLS issue or true missing data.
                // We'll retry once after a delay if we haven't already, just in case of a race condition with token propagation.
                if (retries === 3) {
                    console.log('Profile missing on first attempt. Retrying once in 500ms in case of RLS/Token delay...')
                    await new Promise(r => setTimeout(r, 500))
                    return await fetchProfile(userId, 0) // No more retries after this custom one
                }
                setProfile(null)
                setRole(null)
            }
        } catch (error) {
            console.error('Exception fetching profile:', error)
            if (retries > 0) {
                await new Promise(r => setTimeout(r, 1000))
                return await fetchProfile(userId, retries - 1)
            }
            setProfile(null)
            setRole(null)
        }
    }

    const signUp = async (email, password, options) => {
        return await supabase.auth.signUp({
            email,
            password,
            options
        })
    }

    const signIn = async (email, password) => {
        return await supabase.auth.signInWithPassword({ email, password })
    }

    const signOut = async () => {
        await supabase.auth.signOut()
        setUser(null)
        setProfile(null)
        setRole(null)
    }

    const refreshProfile = async () => {
        if (user?.id) await fetchProfile(user.id)
    }

    const value = {
        signUp,
        signIn,
        user,
        profile,
        role,
        loading,
        signOut,
        refreshProfile,
    }

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    return useContext(AuthContext)
}
