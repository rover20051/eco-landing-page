import React from 'react';
import { SignIn } from '@clerk/react';
import './AuthPage.css';

export default function AuthPage() {
    return (
        <div className="auth-container">
            <div className="auth-left">
                <div className="auth-branding">
                    <h2>CAMPUS ECO</h2>
                    <p>Una escuela de discipulado para adolescentes que quieren impactar su generación con propósito y fe.</p>
                </div>
            </div>
            <div className="auth-right">
                <SignIn
                    fallbackRedirectUrl="/dashboard"
                    appearance={{
                        elements: {
                            formButtonPrimary: 'eco-primary-btn',
                            card: 'eco-auth-card',
                            headerTitle: 'eco-auth-title',
                            headerSubtitle: 'eco-auth-subtitle'
                        }
                    }}
                />
            </div>
        </div>
    );
}
