import React, { useMemo, useState } from 'react'
import Layout from '../../../components/Layout'
import { useStudentSidebarConfig } from '../Student/components/StudentSideBar'
import { useMentorSidebarConfig } from '../Mentor/components/MentorSideBar'
import useAuthStore from '../../../store/useAuthStore'
import ProgressToast from '../../../components/Toast/ProgressToast'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, KeyRound, ShieldCheck, CheckCircle2, TerminalSquare, ChevronRight } from 'lucide-react'

type PasswordFormState = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

type VisibilityState = {
  currentPassword: boolean
  newPassword: boolean
  confirmPassword: boolean
}

const ChangePassword = () => {
  const { changePassword, user } = useAuthStore()
  const { t } = useTranslation('auth')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<{
    message: string
    progress: number
    status: 'loading' | 'success' | 'error'
  } | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<keyof PasswordFormState, string>>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [visibility, setVisibility] = useState<VisibilityState>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  })

  const roleName = (user?.role?.name || (user as any)?.roleName || (user as any)?.roles?.[0] || '').toString().trim().toLowerCase()
  const studentNav = useStudentSidebarConfig()
  const mentorNav = useMentorSidebarConfig()
  const navItems = roleName === 'mentor' ? mentorNav : studentNav

  const sidebarConfig = {
    navItems,
    actions: [],
    brand: {
      name: 'Dashboard',
      subtitle: roleName === 'mentor' ? 'Teaching' : 'Learning',
    },
  }

  const [form, setForm] = useState<PasswordFormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const passwordRules = useMemo(() => {
    const nextPassword = form.newPassword
    return [
      {
        key: 'min-length',
        label: t('changePassword.ruleMinLength', { defaultValue: 'Ít nhất 8 ký tự' }),
        passed: nextPassword.length >= 8,
      },
      {
        key: 'different',
        label: t('changePassword.ruleDifferent', { defaultValue: 'Khác mật khẩu hiện tại' }),
        passed: nextPassword.length > 0 && nextPassword !== form.currentPassword,
      },
      {
        key: 'number',
        label: t('changePassword.ruleNumber', { defaultValue: 'Có ít nhất 1 chữ số' }),
        passed: /\d/.test(nextPassword),
      },
      {
        key: 'special',
        label: t('changePassword.ruleSpecial', { defaultValue: 'Có ít nhất 1 ký tự đặc biệt' }),
        passed: /[^A-Za-z0-9]/.test(nextPassword),
      },
      {
        key: 'confirm-match',
        label: t('changePassword.ruleConfirmMatch', { defaultValue: 'Mật khẩu xác nhận phải khớp mật khẩu mới' }),
        passed: Boolean(form.confirmPassword) && form.confirmPassword === form.newPassword,
      },
    ]
  }, [form.confirmPassword, form.currentPassword, form.newPassword, t])

  const isFormValid = passwordRules.every((rule) => rule.passed) &&
    Boolean(form.currentPassword) &&
    Boolean(form.newPassword) &&
    Boolean(form.confirmPassword) &&
    form.newPassword === form.confirmPassword
  const passedRuleCount = passwordRules.filter((rule) => rule.passed).length
  const ruleProgress = Math.round((passedRuleCount / passwordRules.length) * 100)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setFieldErrors((previous) => ({
      ...previous,
      [e.target.name]: '',
    }))
  }

  const toggleVisibility = (key: keyof VisibilityState) => {
    setVisibility((previous) => ({
      ...previous,
      [key]: !previous[key],
    }))
  }

  const validate = () => {
    const nextErrors: Record<keyof PasswordFormState, string> = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }

    if (!form.currentPassword) {
      nextErrors.currentPassword = t('changePassword.fillAllFields')
    }

    if (!form.newPassword) {
      nextErrors.newPassword = t('changePassword.fillAllFields')
    } else if (form.newPassword.length < 8) {
      nextErrors.newPassword = t('changePassword.passwordMin')
    } else if (form.newPassword === form.currentPassword) {
      nextErrors.newPassword = t('changePassword.passwordSame')
    }

    if (!form.confirmPassword) {
      nextErrors.confirmPassword = t('changePassword.fillAllFields')
    } else if (form.newPassword !== form.confirmPassword) {
      nextErrors.confirmPassword = t('changePassword.passwordMismatch')
    }

    setFieldErrors(nextErrors)
    return Object.values(nextErrors).every((message) => !message)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      setToast({
        message: t('changePassword.checkErrors', { defaultValue: 'Vui lòng kiểm tra lại thông tin đã nhập' }),
        progress: 100,
        status: 'error',
      })
      return
    }

    try {
      setIsSubmitting(true)
      setToast({
        message: t('changePassword.submitting', { defaultValue: 'Đang cập nhật mật khẩu...' }),
        progress: 60,
        status: 'loading',
      })

      const res = await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })

      if (res?.isOk) {
        setToast({
          message: res.msg || t('changePassword.success'),
          progress: 100,
          status: 'success',
        })

        setForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })
        setFieldErrors({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })
      } else {
        setToast({
          message: res?.msg || t('changePassword.failed'),
          progress: 100,
          status: 'error',
        })
      }
    } catch {
      setToast({
        message: t('changePassword.error'),
        progress: 100,
        status: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClassName =
    'w-full pl-10 pr-14 py-2.5 border rounded-sm bg-th-page text-heading placeholder:text-muted outline-none transition font-mono text-sm focus:ring-2 focus:ring-status-blue/20 hide-password-reveal'

  const renderPasswordField = (
    key: keyof PasswordFormState,
    label: string,
    placeholder: string,
  ) => {
    const hasError = Boolean(fieldErrors[key])

    return (
      <div>
        <label htmlFor={key} className="block text-sm font-semibold text-heading mb-2">
          <span className="font-mono text-xs text-muted">{`const ${key} =`}</span>
          <span className="ml-2">{label}</span>
        </label>
        <div className="relative">
          <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id={key}
            type={visibility[key] ? 'text' : 'password'}
            name={key}
            placeholder={placeholder}
            value={form[key]}
            onChange={handleChange}
            className={`${inputClassName} ${hasError ? 'border-red-400' : 'border-bd-input'}`}
            autoComplete={key === 'currentPassword' ? 'current-password' : 'new-password'}
          />
          <button
            type="button"
            onClick={() => toggleVisibility(key)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-heading cursor-pointer"
          >
            {visibility[key] ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {hasError ? <p className="text-xs text-red-600 mt-1">{fieldErrors[key]}</p> : null}
      </div>
    )
  }

  return (
    <Layout sidebar={sidebarConfig}>
      {toast && (
        <ProgressToast
          message={toast.message}
          progress={toast.progress}
          status={toast.status}
          onClose={() => setToast(null)}
        />
      )}
      <div className="px-4 md:px-6 py-8 bg-th-page min-h-screen">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] gap-4">
          <div className="bg-th-card border border-bd-strong rounded-sm overflow-hidden">
            <div className="px-4 py-2 border-b border-bd bg-th-page flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 font-mono text-xs text-heading">
                <TerminalSquare size={14} className="text-status-blue" />
                <span>security/password.change.tsx</span>
              </div>
              <div className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
            </div>

            <div className="p-5 md:p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-heading tracking-tight">{t('changePassword.title')}</h2>
                <p className="text-sm text-muted mt-1 font-mono">
                  {`> ${t('changePassword.description', { defaultValue: 'Cập nhật mật khẩu để bảo vệ tài khoản học tập của bạn.' })}`}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {renderPasswordField('currentPassword', t('changePassword.currentPassword'), t('changePassword.currentPassword'))}
                {renderPasswordField('newPassword', t('changePassword.newPassword'), t('changePassword.newPassword'))}
                {renderPasswordField('confirmPassword', t('changePassword.confirmPassword'), t('changePassword.confirmPassword'))}

                <button
                  type="submit"
                  style={{ backgroundColor: 'black' }}
                  disabled={isSubmitting || !isFormValid}
                  className="w-full  text-white py-2.5 rounded-sm font-mono font-semibold inline-flex items-center justify-center gap-2 hover:brightness-95 transition disabled:opacity-80 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                  {isSubmitting
                    ? t('changePassword.submitting', { defaultValue: 'Đang cập nhật mật khẩu...' })
                    : t('changePassword.submit')}
                </button>
              </form>
            </div>
          </div>

          <div className="bg-th-card border border-bd-strong rounded-sm overflow-hidden h-fit">
            <div className="px-4 py-2 border-b border-bd bg-th-page font-mono text-xs text-heading">
              <span>$ password-policy --check</span>
            </div>

            <div className="p-5 md:p-6">
              <div className="inline-flex items-center gap-2 text-heading font-semibold mb-4">
                <ShieldCheck size={18} className="text-status-blue" />
                {t('changePassword.securityTitle', { defaultValue: 'Yêu cầu bảo mật mật khẩu' })}
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-xs font-mono text-muted mb-1.5">
                  <span>rule_match_progress</span>
                  <span>{passedRuleCount}/{passwordRules.length}</span>
                </div>
                <div className="h-2 bg-th-page border border-bd overflow-hidden rounded-sm">
                  <div className="h-full bg-status-blue" style={{ width: `${ruleProgress}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                {passwordRules.map((rule) => (
                  <div key={rule.key} className="flex items-start gap-2 text-sm">
                    <CheckCircle2
                      size={16}
                      className={rule.passed ? 'text-emerald-600 mt-0.5' : 'text-muted mt-0.5'}
                    />
                    <span className={`${rule.passed ? 'text-heading' : 'text-muted'} font-mono`}>{rule.label}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 p-3 rounded-sm border border-bd bg-th-page">
                <div className="text-xs text-muted font-mono leading-relaxed">
                  {`// ${t('changePassword.securityHint', {
                    defaultValue: 'Mẹo: Không dùng lại mật khẩu cũ hoặc mật khẩu đang dùng ở nền tảng khác.',
                  })}`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default ChangePassword