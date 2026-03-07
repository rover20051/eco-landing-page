import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import { BrowserRouter } from 'react-router-dom'
import { SupabaseProvider } from './contexts/SupabaseContext'
import App from './App.jsx'
import './index.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  // We throw this error so the developer knows immediately
  // if they forgot to add the environment variable.
  throw new Error('Missing Publishable Key (VITE_CLERK_PUBLISHABLE_KEY)')
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <SupabaseProvider>
        <BrowserRouter basename={import.meta.env.PROD ? "/elearning-app/dist/" : "/"}>
          <App />
        </BrowserRouter>
      </SupabaseProvider>
    </ClerkProvider>
  </React.StrictMode>
)
