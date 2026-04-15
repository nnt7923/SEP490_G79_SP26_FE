import React from 'react'
import useAuthStore from '../../store/useAuthStore'
import useNotificationStore from '../../store/useNotificationStore'
import DailyReminderModal from './index'

const DailyReminderGate: React.FC = () => {
  const {
    token,
    user,
    shouldPromptDailyReminderTime,
    setShouldPromptDailyReminderTime,
    updateProfile,
  } = useAuthStore()
  const showToast = useNotificationStore((state) => state.showToast)
  const [open, setOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const isStudent = String(user?.role?.name || '').trim().toLowerCase() === 'student'

  React.useEffect(() => {
    if (!token || !isStudent || !shouldPromptDailyReminderTime) {
      setOpen(false)
      return
    }

    setOpen(true)
  }, [isStudent, shouldPromptDailyReminderTime, token])

  const handleSkip = React.useCallback(() => {
    setOpen(false)
    setShouldPromptDailyReminderTime(false)
  }, [setShouldPromptDailyReminderTime])

  const handleSave = React.useCallback(async (time: string) => {
    setSaving(true)
    try {
      const response = await updateProfile({ dailyReminderTime: time })
      if (response?.isOk) {
        showToast(response.msg || 'Saved daily reminder time.', 'success')
        setOpen(false)
        setShouldPromptDailyReminderTime(false)
        return
      }

      showToast(response?.msg || 'Failed to save daily reminder time.', 'error')
    } catch {
      showToast('Failed to save daily reminder time.', 'error')
    } finally {
      setSaving(false)
    }
  }, [setShouldPromptDailyReminderTime, showToast, updateProfile])

  return (
    <DailyReminderModal
      open={open}
      loading={saving}
      initialTime={user?.dailyReminderTime}
      onSkip={handleSkip}
      onSave={handleSave}
    />
  )
}

export default DailyReminderGate
