import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import GlobalErrorBoundary from './components/GlobalErrorBoundary.jsx'

// Force unregister any service workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function (registrations) {
    for (let registration of registrations) {
      console.log('Unregistering Service Worker:', registration)
      registration.unregister()
    }
  }).catch(function (error) {
    console.error('Error unregistering service worker:', error)
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <GlobalErrorBoundary>
        <App />
      </GlobalErrorBoundary>
    </ThemeProvider>
  </StrictMode>,
)
