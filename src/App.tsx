import React from 'react'
import './App.css'
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hook/useAuth'
import Home from './pages/public/Home'
import Login from './pages/public/Login'

function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="app-header">
      <nav>
        <Link to="/">Home</Link>
        {' | '}
        {user ? (
          <button onClick={() => logout()}>Logout</button>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </nav>
    </header>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <main className="app-main">
          <AppRoutes />
        </main>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
