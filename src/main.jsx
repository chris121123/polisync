import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GlobalStateProvider } from './context/GlobalStateContext'
import './index.css'
import App from './App.jsx'

// App-wide Atelier theme; set before the first paint, so it cannot live in an effect.
document.documentElement.classList.add('sa-theme');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalStateProvider>
      <App />
    </GlobalStateProvider>
  </StrictMode>,
)
