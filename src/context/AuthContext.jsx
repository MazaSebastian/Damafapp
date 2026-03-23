import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { toast } from 'sonner'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [role, setRole] = useState(null)
    const [tenantId, setTenantId] = useState(null)
    const [loading, setLoading] = useState(true)
    // Ref to track current user ID — used to prevent redundant state updates
    // from auth events that fire without an actual user change (TOKEN_REFRESHED,
    // SIGNED_IN on reconnect, etc.), which would create new object references
    // and cascade useEffect([user]) re-runs across all pages.
    const currentUserIdRef = useRef(null)

    useEffect(() => {
        let mounted = true
        let isInitializing = true // CRITICAL: Block listener until initAuth completes

        // Listen for auth state changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!mounted) return

            // CRITICAL: Ignore ALL events during initial mount - initAuth handles it
            if (isInitializing) {
                return
            }

            // CRITICAL: Ignore INITIAL_SESSION - initAuth handles this
            if (_event === 'INITIAL_SESSION') {
                return
            }

            if (session?.user) {
                // CRITICAL FIX: Skip if the user hasn't actually changed.
                // Supabase fires TOKEN_REFRESHED, SIGNED_IN (on reconnect), etc.
                // when the tab regains focus. These carry the same user but create
                // new object references → useEffect([user]) re-runs → skeleton flash.
                if (session.user.id === currentUserIdRef.current) {
                    return
                }
                currentUserIdRef.current = session.user.id
                setUser(session.user)
                try {
                    await fetchProfile(session.user.id)
                } catch (e) {
                    console.error("Profile fetch failed", e)
                }
            } else {
                currentUserIdRef.current = null
                setUser(null)
                setProfile(null)
                setRole(null)
                setTenantId(null)
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
                    currentUserIdRef.current = session.user.id
                    setUser(session.user)
                    await fetchProfile(session.user.id)
                }
            } catch (err) {
                console.error("Auth initialization error:", err)
            } finally {
                // GUARANTEE: Always set loading to false, no matter what
                if (mounted) {
                    setLoading(false)
                    isInitializing = false // CRITICAL: Now listener can process events
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
                setProfile(data)
                setRole(data.role)
                setTenantId(data.tenant_id)
            } else {
                console.warn('Profile not found for user:', userId)
                setProfile(null)
                setRole(null)
                setTenantId(null)
            }
        } catch (error) {
            const isAbort = error.name === 'AbortError' || error.message?.includes('AbortError')
            if (!isAbort) {
                console.error('Unexpected profile error:', error)
            }
            setProfile(null)
            setRole(null)
            setTenantId(null)
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
        setTenantId(null)
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
        tenantId,
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
