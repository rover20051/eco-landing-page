import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// This creates a singleton instance of the Supabase client.
// However, to make requests on behalf of the signed-in Clerk user,
// we will inject the Clerk JWT into the headers of individual queries.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to create a Supabase client with the user's Clerk JWT
export const createClerkSupabaseClient = (clerkToken) => {
    return createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${clerkToken}`,
            },
        },
    })
}
