import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './interactive'
import { initTheme } from './theme'
import { initSync } from './sync'
import App from './App.tsx'

initTheme()
initSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
