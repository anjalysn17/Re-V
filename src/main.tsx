import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { bootstrapBackend } from './services/api'

const root = ReactDOM.createRoot(document.getElementById('root')!)

function render() {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

// Mode API: ambil data server ke cache dulu agar render pertama sudah berisi data terbaru.
// Mode lokal (VITE_API_URL kosong): langsung render seperti sebelumnya.
bootstrapBackend().catch(() => undefined).finally(render)
