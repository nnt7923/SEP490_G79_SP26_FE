import React, { useState, useMemo } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import * as AuthService from '../../../services/AuthService'
import useAuthStore from '../../../store/useAuthStore'

const VerifyOtp: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const store = useAuthStore()

  const emailFromQuery = useMemo(() => {
    try {
      const params = new URLSearchParams(location.search)
      return (params.get('email') || '').trim()
    } catch {
      return ''
    }
  }, [location.search])

  const [email, setEmail] = useState(emailFromQuery)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [verifying, setVerifying] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    const mail = email.trim()
    const otp = code.trim()
    if (!mail || !otp) {
      setError('Vui lòng nhập email đã đăng ký và mã OTP')
      return
    }

    try {
      setVerifying(true)
      const { user, token } = await AuthService.verifyOtp({ Email: mail, Otp: otp })
      try { store.setToken(token) } catch {}
      try { store.setUser(user as any) } catch {}
      setMessage('Xác nhận OTP thành công! Vui lòng đăng nhập.')
      setTimeout(() => navigate('/login'), 600)
    } catch (err: any) {
      const data = err?.response?.data
      const msg = data?.msg || data?.detail || data?.title || data?.message || err?.message || 'Xác nhận OTP thất bại.'
      setError(msg)
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="page">
      <section className="auth auth--split">
        <div className="auth__card">
          <h2 className="auth__title">Verify Your Account</h2>
          <p className="auth__subtitle">Nhập OTP đã gửi tới email đăng ký</p>
          <form className="form" onSubmit={onSubmit}>
            <label className="form__label" htmlFor="email">Email</label>
            <input id="email" type="email" className="form__input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />

            <label className="form__label" htmlFor="otp">OTP</label>
            <input id="otp" type="text" className="form__input" placeholder="Nhập mã OTP" value={code} onChange={(e) => setCode(e.target.value)} />

            {error && <div className="form__error" role="alert">{error}</div>}
            {message && <div style={{ color: '#10b981', fontSize: 14 }}>{message}</div>}

            <button type="submit" className="btn btn-primary auth__submit" disabled={verifying}>Xác nhận OTP</button>

            <div className="auth__links" style={{ justifyContent: 'space-between' }}>
              <span>Không nhận được email?</span>
              <a href="#" onClick={(e) => e.preventDefault()}>Thử lại</a>
            </div>

            <div className="auth__links">
              <span>Quay lại</span>
              <Link to="/register">Register</Link>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}

export default VerifyOtp