import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GlobalStateProvider } from './context/GlobalStateContext'
import './index.css'
import App from './App.jsx'
// The IT workspace language is app-wide, so it loads at the root: the shell, the
// portalled overlays and the auth/public pages all read the same tokens and rules.
import './styles/itxTokens.css'
import './styles/itxBase.css'
import './styles/itWorkspace.css'

// App-wide Atelier theme; set before the first paint, so it cannot live in an effect.
document.documentElement.classList.add('sa-theme');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalStateProvider>
      <App />
    </GlobalStateProvider>
  </StrictMode>,
)
