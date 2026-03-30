import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Buffer } from 'buffer'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.tsx'

if (typeof window !== 'undefined') {
  window.Buffer = Buffer
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
