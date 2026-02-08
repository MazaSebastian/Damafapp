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

        // Listen for auth state changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            console.log('Auth state changed:', _event, session ? `(${session.user?.email})` : '(no session)')
            if (!mounted) return

            // CRITICAL: Ignore spurious events without a session
            // Supabase can fire SIGNED_IN before initialization completes
            if (_event === 'SIGNED_IN' && !session) {
                console.warn('Ignoring false SIGNED_IN event (no session)')
                return
            }

            if (session?.user) {
                setUser(session.user)
                try {
                    await fetchProfile(session.user.id)
                } catch (e) {
                    console.error("Profile fetch failed", e)
                }
            } else {
                setUser(null)
                setProfile(null)
                setRole(null)
            }

            // CRITICAL: Always set loading to false after processing auth change
            if (mounted) setLoading(false)
        })

        // CRITICAL FIX: Initialize auth state with proper error handling
        const initAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession()
                if (error) throw error

                if (mounted && session?.user) {
                    console.log("Session found on mount, loading profile...")
                    setUser(session.user)
                    await fetchProfile(session.user.id)
                }
            } catch (err) {
                console.error("Auth initialization error:", err)
            } finally {
                // GUARANTEE: Always set loading to false, no matter what
                if (mounted) {
                    console.log("Auth initialization complete")
                    setLoading(false)
                }
            }
        }

        initAuth()

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [])

    const fetchProfile = async (userId) => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3500)

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle()
                .abortSignal(controller.signal)

            if (error) {
                if (error.name === 'AbortError') {
                    console.warn('Profile fetch aborted (timeout)')
                } else {
                    console.error('Profile fetch error:', error)
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
                setProfile(null)
                setRole(null)
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Unexpected profile error:', error)
            }
            setProfile(null)
            setRole(null)
        } finally {
            clearTimeout(timeoutId)
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
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    return useContext(AuthContext)
}
