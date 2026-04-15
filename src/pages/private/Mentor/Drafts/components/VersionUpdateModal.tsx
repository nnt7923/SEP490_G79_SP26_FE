import React from 'react'
import { useTranslation } from 'react-i18next'
import type { ManualDraftVersionUpdateType } from '../editorTypes'
import { cardStyle, getButtonStyle, pillStyle, subtleTextStyle } from './editorUi'

type Props = {
  isOpen: boolean
  saving?: boolean
  onClose: () => void
  onSubmit: (options: { increaseVersion: boolean; versionUpdateType: ManualDraftVersionUpdateType | null }) => void | Promise<void>
}

const VersionUpdateModal: React.FC<Props> = ({
  isOpen,
  saving = false,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation('mentor')
  const [increaseVersion, setIncreaseVersion] = React.useState(false)
  const [versionUpdateType, setVersionUpdateType] = React.useState<ManualDraftVersionUpdateType | null>(null)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (!isOpen) return
    setIncreaseVersion(false)
    setVersionUpdateType(null)
    setError('')
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (increaseVersion && !versionUpdateType) {
      setError(t('drafts.versionUpdateTypeRequired'))
      return
    }

    setError('')
    await onSubmit({
      increaseVersion,
      versionUpdateType: increaseVersion ? versionUpdateType : null,
    })
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--overlay-dark)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 90,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="draft-version-update-title"
    >
      <div
        style={{
          ...cardStyle,
          width: '100%',
          maxWidth: 520,
          overflow: 'hidden',
          background: 'var(--bg-surface-short)',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.24)',
        }}
      >
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-base)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span style={pillStyle({ accent: true })}>{t('drafts.versionUpdateModalBadge')}</span>
          </div>
          <h2 id="draft-version-update-title" style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
            {t('drafts.versionUpdateModalTitle')}
          </h2>
          <p style={{ ...subtleTextStyle, margin: '8px 0 0' }}>
            {t('drafts.versionUpdateModalDescription')}
          </p>
        </div>

        <div style={{ padding: 20, display: 'grid', gap: 18 }}>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.7 }}>
              {t('drafts.versionUpdateQuestion')}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                style={getButtonStyle({ active: !increaseVersion })}
                disabled={saving}
                onClick={() => {
                  setIncreaseVersion(false)
                  setVersionUpdateType(null)
                  setError('')
                }}
              >
                {t('drafts.versionKeepOption')}
              </button>
              <button
                type="button"
                style={getButtonStyle({ active: increaseVersion })}
                disabled={saving}
                onClick={() => {
                  setIncreaseVersion(true)
                  setError('')
                }}
              >
                {t('drafts.versionIncreaseOption')}
              </button>
            </div>
          </div>

          {increaseVersion ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.7 }}>
                {t('drafts.versionTypeQuestion')}
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                <button
                  type="button"
                  style={{ ...getButtonStyle({ active: versionUpdateType === 'Minor' }), justifyContent: 'space-between', width: '100%' }}
                  disabled={saving}
                  onClick={() => {
                    setVersionUpdateType('Minor')
                    setError('')
                  }}
                >
                  <span>{t('drafts.versionTypeMinor')}</span>
                  <span style={pillStyle({ accent: versionUpdateType === 'Minor' })}>+0.1</span>
                </button>
                <button
                  type="button"
                  style={{ ...getButtonStyle({ active: versionUpdateType === 'Major' }), justifyContent: 'space-between', width: '100%' }}
                  disabled={saving}
                  onClick={() => {
                    setVersionUpdateType('Major')
                    setError('')
                  }}
                >
                  <span>{t('drafts.versionTypeMajor')}</span>
                  <span style={pillStyle({ accent: versionUpdateType === 'Major' })}>+1.0</span>
                </button>
              </div>
            </div>
          ) : null}

          {error ? <div style={{ color: 'var(--danger-primary)', fontSize: 13 }}>{error}</div> : null}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            padding: 16,
            borderTop: '1px solid var(--border-base)',
            background: 'var(--bg-main)',
          }}
        >
          <button type="button" style={getButtonStyle({ disabled: saving })} onClick={onClose} disabled={saving}>
            {t('drafts.versionUpdateCancel')}
          </button>
          <button type="button" style={getButtonStyle({ accent: true, disabled: saving })} onClick={handleSubmit} disabled={saving}>
            {saving ? t('drafts.saving') : t('drafts.versionUpdateConfirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default VersionUpdateModal
