import React, { useState } from 'react'
import { X, UserPlus, Loader2 } from 'lucide-react'
import { UserService } from '../../services'
import type { CreateMentorPayload } from '../../services/UserService'
import { useTranslation } from 'react-i18next'

interface CreateMentorModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const INITIAL_FORM: CreateMentorPayload = {
  email: '',
  username: '',
  firstName: '',
  lastName: '',
  bio: '',
  phone: '',
  address: '',
  dateOfBirth: '',
  sendSetupEmail: true,
}

const CreateMentorModal: React.FC<CreateMentorModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation('admin')
  const [form, setForm] = useState<CreateMentorPayload>(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleChange = (field: keyof CreateMentorPayload, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload: CreateMentorPayload = {
        ...form,
        dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : undefined,
      }
      await UserService.createMentor(payload)
      setForm(INITIAL_FORM)
      onSuccess()
      onClose()
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.title || err?.message || t('createMentor.failed')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '7px 10px',
    border: '1px solid var(--border-base, #e2e8f0)',
    borderRadius: 2,
    background: 'var(--bg-main)',
    color: 'var(--text-primary)',
    fontSize: 12,
    fontFamily: 'monospace',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    color: 'var(--text-secondary)',
    fontFamily: 'monospace',
    marginBottom: 4,
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-base)',
          borderRadius: 2,
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-base)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserPlus size={15} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              {t('createMentor.title')}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 2, display: 'flex' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <form id="create-mentor-form" onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Row: firstName + lastName */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>{t('createMentor.firstName')} *</label>
              <input
                required
                style={inputStyle}
                value={form.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="An"
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base, #e2e8f0)' }}
              />
            </div>
            <div>
              <label style={labelStyle}>{t('createMentor.lastName')} *</label>
              <input
                required
                style={inputStyle}
                value={form.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Nguyen"
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base, #e2e8f0)' }}
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label style={labelStyle}>{t('createMentor.username')} *</label>
            <input
              required
              style={inputStyle}
              value={form.username}
              onChange={(e) => handleChange('username', e.target.value)}
              placeholder="mentor1"
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base, #e2e8f0)' }}
            />
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle}>{t('createMentor.email')} *</label>
            <input
              required
              type="email"
              style={inputStyle}
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="mentor@example.com"
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base, #e2e8f0)' }}
            />
          </div>

          {/* Row: phone + dateOfBirth */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>{t('createMentor.phone')}</label>
              <input
                style={inputStyle}
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="0909123456"
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base, #e2e8f0)' }}
              />
            </div>
            <div>
              <label style={labelStyle}>{t('createMentor.dateOfBirth')}</label>
              <input
                type="date"
                style={inputStyle}
                value={form.dateOfBirth}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base, #e2e8f0)' }}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label style={labelStyle}>{t('createMentor.address')}</label>
            <input
              style={inputStyle}
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="HCM"
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base, #e2e8f0)' }}
            />
          </div>

          {/* Bio */}
          <div>
            <label style={labelStyle}>{t('createMentor.bio')}</label>
            <textarea
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
              value={form.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              placeholder={t('createMentor.bioPlaceholder')}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base, #e2e8f0)' }}
            />
          </div>

          {/* sendSetupEmail */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.sendSetupEmail}
              onChange={(e) => handleChange('sendSetupEmail', e.target.checked)}
              style={{ width: 14, height: 14, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
              {t('createMentor.sendSetupEmail')}
            </span>
          </label>

          {/* Error */}
          {error && (
            <div style={{
              padding: '8px 12px',
              background: 'var(--bg-main)',
              border: '1px solid var(--danger-primary, #ef4444)',
              borderRadius: 2,
              color: 'var(--danger-primary, #ef4444)',
              fontSize: 11,
              fontFamily: 'monospace',
            }}>
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-base)',
          display: 'flex', gap: 8, justifyContent: 'flex-end',
          background: 'var(--bg-main)',
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '7px 16px',
              background: 'transparent',
              border: '1px solid var(--border-base)',
              borderRadius: 2,
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontFamily: 'monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            {t('createMentor.cancel')}
          </button>
          <button
            type="submit"
            form="create-mentor-form"
            disabled={loading}
            style={{
              padding: '7px 16px',
              background: 'var(--accent-primary)',
              border: 'none',
              borderRadius: 2,
              fontSize: 11,
              fontWeight: 700,
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
            {loading ? t('createMentor.creating') : t('createMentor.create')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreateMentorModal
