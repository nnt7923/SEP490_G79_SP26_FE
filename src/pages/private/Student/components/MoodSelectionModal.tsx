import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Smile, Frown, Target, Coffee, Flame, BatteryWarning } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface MoodSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (mood: string) => Promise<void>
}

const moodOptions = [
  { key: 'Happy', icon: Smile, color: '#16a34a', bg: 'rgba(22, 163, 74, 0.1)' },
  { key: 'Motivated', icon: Flame, color: '#ea580c', bg: 'rgba(234, 88, 12, 0.1)' },
  { key: 'Focused', icon: Target, color: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)' },
  { key: 'Tired', icon: Coffee, color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' },
  { key: 'Sad', icon: Frown, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
  { key: 'Stressed', icon: BatteryWarning, color: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)' },
]

export const MoodSelectionModal: React.FC<MoodSelectionModalProps> = ({ isOpen, onClose, onSave }) => {
  const { t } = useTranslation('student')
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  if (!isOpen) return null

  const handleSave = async () => {
    if (!selectedMood) return
    try {
      setIsSaving(true)
      await onSave(selectedMood)
    } finally {
      setIsSaving(false)
      onClose()
    }
  }

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 150,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          style={{
            width: '100%',
            maxWidth: 480,
            background: 'var(--bg-surface)',
            borderRadius: 12,
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-base)' }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              {t('dashboard.dailyCheckin.moodModal.title')}
            </h3>
            <button
              onClick={onClose}
              disabled={isSaving}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ padding: 20 }}>
            <p style={{ margin: '0 0 20px 0', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {t('dashboard.dailyCheckin.moodModal.description')}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
              {moodOptions.map(({ key, icon: Icon, color, bg }) => {
                const isSelected = selectedMood === key
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedMood(key)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '16px 8px',
                      border: `2px solid ${isSelected ? color : 'var(--border-base)'}`,
                      borderRadius: 8,
                      background: isSelected ? bg : 'var(--bg-main)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Icon size={28} color={isSelected ? color : 'var(--text-secondary)'} />
                    <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: isSelected ? color : 'var(--text-primary)' }}>
                      {t(`dashboard.dailyCheckin.moodModal.moods.${key}`, { defaultValue: key })}
                    </span>
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                disabled={isSaving}
                className="btn-secondary"
                style={{
                  padding: '10px 16px',
                  borderRadius: 6,
                  border: '1px solid var(--border-base)',
                  background: 'var(--bg-main)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t('dashboard.dailyCheckin.moodModal.skip')}
              </button>
              <button
                onClick={handleSave}
                disabled={!selectedMood || isSaving}
                className="btn-primary"
                style={{
                  padding: '10px 20px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'var(--accent-primary)',
                  color: 'white',
                  fontWeight: 600,
                  cursor: !selectedMood || isSaving ? 'not-allowed' : 'pointer',
                  opacity: !selectedMood || isSaving ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {isSaving ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} />
                  </motion.div>
                ) : null}
                {t('dashboard.dailyCheckin.moodModal.save')}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
