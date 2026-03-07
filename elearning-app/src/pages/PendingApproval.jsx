import React from 'react';
import { useClerk } from '@clerk/react';
import './PendingApproval.css';

export default function PendingApproval() {
    const { signOut } = useClerk();

    return (
        <div className="pending-container">
            <div className="pending-card">
                <div className="pending-icon">⏳</div>
                <h1>Acceso pendiente de aprobación</h1>
                <p>
                    Tu cuenta fue creada correctamente. Un administrador de ECO
                    debe aprobarla antes de que puedas acceder a los contenidos.
                </p>
                <p className="pending-hint">
                    Esto suele tardar menos de 24 horas. Si tenés urgencia, contactá
                    a tu coordinador ECO.
                </p>
                <button
                    className="eco-secondary-btn"
                    onClick={() => signOut({ redirectUrl: '/' })}
                >
                    Cerrar sesión
                </button>
            </div>
        </div>
    );
}
