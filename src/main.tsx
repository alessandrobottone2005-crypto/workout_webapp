import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './app/App'
// Syne ExtraBold for display titles (bundled locally — no CDN)
import '@fontsource/syne/700.css'
import '@fontsource/syne/800.css'
// Tailwind base (includes @tailwind base/components/utilities)
import './styles/tailwind.css'
// Custom design tokens and global styles (after Tailwind)
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
