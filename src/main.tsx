import React from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AOS from 'aos'
import 'aos/dist/aos.css'
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css'
import './theme.css'
import './index.css'
import './global.css'
import './styles/chat-ui-kit-overrides.css'
import 'devicon/devicon.min.css'
import './i18n' // i18n - Khởi tạo đa ngôn ngữ
import App from './App.tsx'
import { ThemeProvider } from './contexts/ThemeContext'


// Khởi tạo AOS một lần duy nhất
AOS.init({
  duration: 550,
  once: true,
  offset: 60,
  easing: 'ease-out-cubic',
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)

