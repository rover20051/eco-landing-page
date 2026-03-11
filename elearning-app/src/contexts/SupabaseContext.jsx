import { createContext, useContext, useMemo, useRef, useEffect } from 'react'
import { useSession } from '@clerk/react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const SupabaseContext = createContext()

export const SupabaseProvider = ({ children }) => {
    const { session } = useSession()

    // Keep a mutable ref of the session so the token fetcher is never stale
    const sessionRef = useRef(session)
    useEffect(() => {
        sessionRef.current = session
    }, [session])

    const supabase = useMemo(() => {
        // If no active session, create a standard anon client
        if (!session?.id) {
            return createClient(supabaseUrl, supabaseAnonKey)
        }

        // Clerk native integration for Supabase
        return createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                // Supabase-js v2 allows setting a dynamic access token fetcher function
            },
            accessToken: async () => {
                if (sessionRef.current) {
                    return await sessionRef.current.getToken({ template: 'supabase' })
                }
                return null
            }
        })
    }, [session?.id])

    return (
        <SupabaseContext.Provider value={supabase}>
            {children}
        </SupabaseContext.Provider>
    )
}

export const useSupabase = () => {
    return useContext(SupabaseContext)
}
