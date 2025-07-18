import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// 禁用右鍵菜單（在生產環境中）
if (process.env.NODE_ENV === 'production') {
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault()
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)