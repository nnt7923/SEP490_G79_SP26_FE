import React from 'react'
import { useTranslation } from 'react-i18next'

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation()

  const currentLang = i18n.language?.startsWith('vi') ? 'vi' : 'en'

  const toggleLanguage = () => {
    const newLang = currentLang === 'vi' ? 'en' : 'vi'
    i18n.changeLanguage(newLang)
  }

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      style={{
        padding: '4px 10px',
        border: '1px solid var(--border-base)',
        borderRadius: 2,
        background: 'transparent',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        fontSize: 13,
        fontFamily: 'inherit',
        fontWeight: 600,
        transition: 'all 0.2s ease',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent-primary)'
        e.currentTarget.style.color = 'var(--text-primary)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-base)'
        e.currentTarget.style.color = 'var(--text-secondary)'
      }}
      aria-label="Toggle language"
      title={currentLang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
    >
      {currentLang === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}
    </button>
  )
}

export default LanguageSwitcher
