import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [role, setRole] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true

        // Safety timeout (Force load after 4s if DB hangs)
        const timeout = setTimeout(() => {
            if (mounted) {
                setLoading((current) => {
                    if (current) console.warn('Auth loading safety timeout triggered')
                    return false
                })
            }
        }, 4000)

        // Check active sessions and sets the user
        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()

                if (mounted) {
                    setUser(session?.user ?? null)

                    if (session?.user) {
                        // WAIT for profile before opening the app
                        await fetchProfile(session.user.id)
                    }
                }
            } catch (error) {
                console.error('Auth initialization error:', error)
            } finally {
                if (mounted) setLoading(false)
            }
        }

        initAuth()

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            console.log('Auth state changed:', _event)
            if (!mounted) return

            setUser(session?.user ?? null)

            if (session?.user) {
                // If logging in, pause loading until profile is ready
                await fetchProfile(session.user.id)
            } else {
                setProfile(null)
                setRole(null)
            }
            setLoading(false)
        })

        return () => {
            mounted = false
            subscription.unsubscribe()
            clearTimeout(timeout)
        }
    }, [])

    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (error) {
                console.error('Error fetching profile:', error)
                // Even if there's an error, we should clear the profile/role
                setProfile(null)
                setRole(null)
                return
            }

            if (data) {
                setProfile(data)
                setRole(data.role)
            }
        } catch (error) {
            console.error('Error fetching profile:', error)
            setProfile(null)
            setRole(null)
        }
        // Note: We don't set loading(false) here, the caller handles it
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

    const value = {
        signUp,
        signIn,
        user,
        profile,
        role,
        loading,
        signOut,
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
