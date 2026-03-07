import React from 'react';
import { useAuth, RedirectToSignIn } from '@clerk/react';
import { Navigate, Outlet } from 'react-router-dom';
import { useUserProfile } from '../hooks/useSupabase';

/**
 * Wrapper component to protect routes based on authentication and role.
 * Also enforces the pending-approval check for non-admin users.
 * 
 * @param {string} allowedRole - 'student', 'mentor', 'admin' (optional, if omitted checks only auth)
 */
export default function ProtectedRoute({ allowedRole }) {
    const { isLoaded, isSignedIn } = useAuth();
    const { profile, loading: profileLoading } = useUserProfile();

    if (!isLoaded) {
        return (
            <div className="eco-fullscreen-loader">
                <div className="eco-spinner"></div>
            </div>
        );
    }

    // If not signed in to Clerk, redirect to auth page
    if (!isSignedIn) {
        return <RedirectToSignIn redirectUrl={window.location.pathname} />;
    }

    // Wait for Supabase profile to be fetched
    if (profileLoading) {
        return (
            <div className="eco-fullscreen-loader">
                <div className="eco-spinner"></div>
            </div>
        );
    }

    // If profile exists and is pending, redirect to pending approval page
    // Admins bypass this check so they're never locked out
    if (profile && profile.status === 'pending' && profile.role !== 'admin') {
        return <Navigate to="/pending-approval" replace />;
    }

    // Role-based access control
    if (allowedRole) {
        if (!profile) {
            return <Navigate to="/dashboard" replace />;
        }

        if (allowedRole === 'admin' && profile.role !== 'admin') {
            return <Navigate to="/dashboard" replace />;
        }

        if (allowedRole === 'mentor' && !['mentor', 'admin'].includes(profile.role)) {
            return <Navigate to="/dashboard" replace />;
        }
    }

    // Authorised: render the nested routes
    return <Outlet />;
}
