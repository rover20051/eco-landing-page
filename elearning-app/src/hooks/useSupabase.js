import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/react';
import { useSupabase } from '../contexts/SupabaseContext';

/**
 * Custom hook to get the Supabase profile tied to the logged-in Clerk user.
 * It also provisions the profile row if it doesn't exist upon first login.
 */
export function useUserProfile() {
    const { isSignedIn, isLoaded: clAuthLoaded } = useAuth();
    const { user, isLoaded: clUserLoaded } = useUser();
    const supabase = useSupabase();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const updateProfile = async (fields) => {
        if (!user?.id) return { data: null, error: new Error('No user') };
        const { data, error: updateError } = await supabase
            .from('profiles')
            .update(fields)
            .eq('id', user.id)
            .select()
            .single();
        if (!updateError && data) setProfile(data);
        return { data, error: updateError };
    };

    useEffect(() => {
        // Wait until Clerk finishes loading auth state
        if (!clAuthLoaded || !clUserLoaded) return;

        // If suddenly logged out, clear the profile
        if (!isSignedIn) {
            setProfile(null);
            setLoading(false);
            return;
        }

        // If we already have the profile for THIS active user, don't trigger a hard reload
        // unless they literally log into a different account.
        if (profile && user && profile.id === user.id) {
            if (loading) setLoading(false);
            return;
        }

        let isMounted = true;

        async function ensureProfile() {
            try {
                if (isMounted && !profile) setLoading(true);

                const userId = user.id; // The Clerk user ID (e.g., 'user_2xyz...')

                // 1. Try to fetch the existing profile
                const { data, error: fetchError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (fetchError && fetchError.code !== 'PGRST116') {
                    // PGRST116 means "No rows found" -- anything else is a real error
                    throw fetchError;
                }

                if (data) {
                    if (isMounted) setProfile(data);
                } else {
                    // 2. No profile found. User just signed up via Clerk!
                    // We need to provision a Supabase profile row for them.
                    const newProfileData = {
                        id: userId,
                        full_name: user.fullName || user.username || user.primaryEmailAddress?.emailAddress,
                        avatar_url: user.imageUrl,
                        role: 'student',
                        status: 'pending', // Must be explicitly approved by admin
                        eco_points: 0,
                        current_streak: 0,
                        last_login_date: new Date().toISOString().split('T')[0]
                    };

                    const { data: newData, error: insertError } = await supabase
                        .from('profiles')
                        .insert(newProfileData)
                        .select()
                        .single();

                    if (insertError) throw insertError;

                    if (isMounted) setProfile(newData);
                }

            } catch (err) {
                console.error('Error ensuring Supabase profile:', err);
                if (isMounted) setError(err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        ensureProfile();

        return () => {
            isMounted = false;
        };
        // Use user?.id instead of user object to avoid refetching when Clerk mutates user reference on window focus
    }, [clAuthLoaded, clUserLoaded, isSignedIn, user?.id, supabase]);

    return { profile, loading, error, updateProfile };
}
