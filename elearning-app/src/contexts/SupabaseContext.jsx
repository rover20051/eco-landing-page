import { createContext, useContext, useMemo } from 'react'
import { useSession } from '@clerk/react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const SupabaseContext = createContext()

export const SupabaseProvider = ({ children }) => {
    const { session } = useSession()

    const supabase = useMemo(() => {
        // If no active session, create a standard anon client
        if (!session) {
            return createClient(supabaseUrl, supabaseAnonKey)
        }

        // Clerk native integration for Supabase
        // We send the raw session token via the accessToken function
        return createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                // Supabase-js v2 allows setting a dynamic access token fetcher function
                // that is injected automatically into request headers
            },
            accessToken: async () => {
                return await session.getToken({ template: 'supabase' })
            }
        })
    }, [session])

    return (
        <SupabaseContext.Provider value={supabase}>
            {children}
        </SupabaseContext.Provider>
    )
}

export const useSupabase = () => {
    return useContext(SupabaseContext)
}
