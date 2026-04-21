import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GlobalStateProvider } from './context/GlobalStateContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalStateProvider>
      <App />
    </GlobalStateProvider>
  </StrictMode>,
)
