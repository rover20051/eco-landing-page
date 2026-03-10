import React from 'react';
import { SignIn, SignUp } from '@clerk/react';
import { useLocation } from 'react-router-dom';
import './AuthPage.css';

const BASE = import.meta.env.BASE_URL;

export default function AuthPage() {
    const location = useLocation();
    const isSignUp = location.pathname.includes('/sign-up');

    return (
        <div className="auth-container">
            <div className="auth-left" style={{ backgroundImage: `url('${BASE}images/auth-bg.png')` }}>
                <div className="auth-branding">
                    <h2>CAMPUS ECO</h2>
                    <p>Una escuela de discipulado para adolescentes que quieren impactar su generación con propósito y fe.</p>
                </div>
            </div>
            <div className="auth-right">
                {isSignUp ? (
                    <SignUp
                        routing="path"
                        path={`${BASE}sign-up`}
                        signInUrl={`${BASE}sign-in`}
                        forceRedirectUrl={`${BASE}dashboard`}
                        fallbackRedirectUrl={`${BASE}dashboard`}
                        appearance={{
                            elements: {
                                formButtonPrimary: 'eco-primary-btn',
                                card: 'eco-auth-card',
                                headerTitle: 'eco-auth-title',
                                headerSubtitle: 'eco-auth-subtitle'
                            }
                        }}
                    />
                ) : (
                    <SignIn
                        routing="path"
                        path={`${BASE}sign-in`}
                        signUpUrl={`${BASE}sign-up`}
                        forceRedirectUrl={`${BASE}dashboard`}
                        fallbackRedirectUrl={`${BASE}dashboard`}
                        appearance={{
                            elements: {
                                formButtonPrimary: 'eco-primary-btn',
                                card: 'eco-auth-card',
                                headerTitle: 'eco-auth-title',
                                headerSubtitle: 'eco-auth-subtitle'
                            }
                        }}
                    />
                )}
            </div>
        </div>
    );
}
