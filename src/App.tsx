import React from 'react'
import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hook/useAuth'
import Home from './pages/public/Home/index'
import Login from './pages/public/login/index'
import Register from './pages/public/Register/index'
import ForgotPassword from './pages/public/forgotpassword/index'
import ResetPassword from './pages/public/resetpassword/index'
import SiteHeader from './components/Layout/SiteHeader/index'
import SiteFooter from './components/Layout/SiteFooter/index'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SiteHeader />
        <main className="app-main">
          <AppRoutes />
        </main>
        <SiteFooter />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
