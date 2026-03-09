import React from 'react'
import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import useAuthStore from '../../../store/useAuthStore'
import type { User } from '../../../store/useAuthStore'
import Layout from '../../../components/Layout'
import { useStudentSidebarConfig } from '../Student/components/StudentSideBar'
import { useMentorSidebarConfig } from '../Mentor/components/MentorSideBar'
import ROUTER from '../../../router/ROUTER'
import { useNavigate } from 'react-router-dom'
import { LogOut, Loader } from 'lucide-react'
import ProgressToast from '../../../components/Toast/ProgressToast'
import { useTranslation } from 'react-i18next'

interface ProfileForm extends Partial<User> {
    dateOfBirth?: string
}

const Profile: React.FC = () => {
    const { user, updateProfile, uploadAvatar, updatingProfile, logout } = useAuthStore()
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const [open, setOpen] = useState<boolean>(false)
    const [form, setForm] = useState<ProfileForm | null>(null)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [toast, setToast] = useState<{ message: string; progress: number; status: 'loading' | 'success' | 'error' } | null>(null)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const navigate = useNavigate()
    const { t } = useTranslation('student')
    const { t: tc } = useTranslation('common')

    const handleLogout = async () => { await logout(); navigate(ROUTER.LOGIN) }
    const roleName = (user?.role?.name || (user as any)?.roleName || (user as any)?.roles?.[0] || '').toString().trim().toLowerCase()

    useEffect(() => {
        if (roleName === 'admin') navigate(ROUTER.ADMIN_DASHBOARD, { replace: true })
    }, [roleName, navigate])

    const studentNav = useStudentSidebarConfig()
    const mentorNav = useMentorSidebarConfig()
    const navItems = roleName === 'mentor' ? mentorNav : studentNav
    const sidebarConfig = {
        navItems,
        actions: [{ label: tc('sidebar.logout'), icon: <LogOut className="w-5 h-5" />, onClick: handleLogout, variant: 'danger' as const }],
        brand: { name: 'Profile', subtitle: roleName === 'mentor' ? 'Teaching' : 'Learning' },
    }

    useEffect(() => {
        if (user) {
            setForm({
                firstName: user.firstName || '', lastName: user.lastName || '', email: user.email || '',
                phone: user.phone || '', bio: user.bio || '', address: user.address || '',
                dateOfBirth: user.dateOfBirth ? dayjs(user.dateOfBirth).format('YYYY-MM-DD') : ''
            })
        }
    }, [user])

    useEffect(() => {
        if (!toast) return
        const timer = setTimeout(() => setToast(null), 3000)
        return () => clearTimeout(timer)
    }, [toast])

    const handleChange = (field: keyof ProfileForm, value: string) => {
        setForm(prev => prev ? { ...prev, [field]: value } : prev)
    }

    if (!user || !form) return <div style={{ padding: 24, color: 'var(--text-secondary)', fontSize: 13 }}>{tc('status.loading')}</div>

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {}
        const phoneRegex = /^0\d{9}$/
        if (form.phone && form.phone.trim() !== '' && !phoneRegex.test(form.phone)) {
            newErrors.phone = t('profile.phoneError')
        }
        if (!form.dateOfBirth || form.dateOfBirth.trim() === '') {
            newErrors.dateOfBirth = t('profile.dobRequired')
        } else {
            const dob = dayjs(form.dateOfBirth)
            if (!dob.isValid()) newErrors.dateOfBirth = t('profile.dobInvalid')
            else if (dob.isAfter(dayjs())) newErrors.dateOfBirth = t('profile.dobFuture')
        }
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) return
        const res = await updateProfile(form)
        if (res?.isOk) {
            setToast({ message: res.msg || t('profile.updateSuccess'), progress: 100, status: 'success' })
            setOpen(false)
        } else {
            setToast({ message: res?.msg || t('profile.updateFailed'), progress: 100, status: 'error' })
        }
    }

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
        if (!allowedTypes.includes(file.type)) { setToast({ message: t('profile.avatarOnlyImages'), progress: 100, status: 'error' }); return }
        if (file.size > 10 * 1024 * 1024) { setToast({ message: t('profile.avatarMaxSize'), progress: 100, status: 'error' }); return }
        setUploadingAvatar(true)
        setToast({ message: t('profile.avatarUploading'), progress: 0, status: 'loading' })
        const res = await uploadAvatar(file, (progress) => {
            setToast(prev => prev ? { ...prev, progress } : { message: t('profile.avatarUploading'), progress, status: 'loading' })
        })
        setUploadingAvatar(false)
        if (res?.isOk) setToast({ message: res.msg || t('profile.avatarSuccess'), progress: 100, status: 'success' })
        else setToast({ message: res?.msg || t('profile.avatarFailed'), progress: 100, status: 'error' })
        e.target.value = ''
    }

    const formatDate = (dateStr?: string): string => {
        if (!dateStr) return tc('status.notUpdated')
        return dayjs(dateStr).format('MM/DD/YYYY')
    }

    const getInitials = (first?: string, last?: string) => {
        return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase() || 'U'
    }

    const infoCardStyle: React.CSSProperties = {
        padding: 12, background: 'var(--bg-main)', border: '1px solid var(--gray-200)', borderRadius: 2,
    }

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2,
        background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
    }

    return (
        <Layout sidebar={sidebarConfig}>
            {toast && <ProgressToast message={toast.message} progress={toast.progress} status={toast.status} onClose={() => setToast(null)} />}
            <div style={{ padding: 24, background: 'var(--bg-surface)', minHeight: '100vh' }}>
                {/* Message Alert */}
                {message && (
                    <div style={{ marginBottom: 20, padding: 12, border: `1px solid ${message.type === 'success' ? 'var(--success-primary)' : 'var(--danger-primary)'}`, borderRadius: 2, color: message.type === 'success' ? 'var(--success-primary)' : 'var(--danger-primary)', fontSize: 13 }}>
                        // {message.type === 'success' ? 'SUCCESS' : 'ERROR'}: {message.text}
                    </div>
                )}

                {/* Profile Header */}
                <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, overflow: 'hidden', marginBottom: 24 }}>
                    <div style={{ height: 4, background: 'var(--text-primary)' }} />
                    <div style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            {/* Avatar */}
                            <div style={{ position: 'relative' }}>
                                <div style={{ width: 80, height: 80, borderRadius: 2, border: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', overflow: 'hidden', position: 'relative' }}>
                                    {user.avatarUrl?.trim() ? (
                                        <img src={user.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>{getInitials(user.firstName, user.lastName)}</span>
                                    )}
                                    {uploadingAvatar && (
                                        <div style={{ position: 'absolute', inset: 0, background: 'var(--overlay-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Loader size={24} className="animate-spin" style={{ color: 'var(--bg-surface-short)' }} />
                                        </div>
                                    )}
                                </div>
                                <label style={{ position: 'absolute', inset: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--shadow-lg)', opacity: 0, transition: 'opacity 0.2s', borderRadius: 2, fontSize: 11, color: 'var(--bg-surface-short)', fontWeight: 600 }}
                                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }} onMouseLeave={(e) => { e.currentTarget.style.opacity = '0' }}>
                                    {t('profile.upload')}
                                    <input type="file" accept="image/*" hidden onChange={handleAvatarUpload} />
                                </label>
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{'>'} {user.firstName} {user.lastName}</h1>
                                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0' }}>// {user.email}</p>
                            </div>

                            <button onClick={() => setOpen(true)} style={{ padding: '8px 20px', background: 'var(--text-primary)', color: 'var(--bg-surface-short)', border: '1px solid var(--text-primary)', borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--text-strong)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--text-primary)' }}>
                                {t('profile.editProfile')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Personal Information */}
                <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border-base)' }}>
                        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('profile.personalInfo')}</h2>
                    </div>
                    <div style={{ padding: 24 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {[
                                { label: '$ firstName', value: user.firstName || tc('status.notUpdated') },
                                { label: '$ lastName', value: user.lastName || tc('status.notUpdated') },
                                { label: '$ email', value: user.email },
                                { label: '$ phone', value: user.phone || tc('status.notUpdated') },
                                { label: '$ dateOfBirth', value: formatDate(user.dateOfBirth) },
                                { label: '$ address', value: user.address || tc('status.notUpdated') },
                            ].map((info) => (
                                <div key={info.label} style={infoCardStyle}>
                                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{info.label}</p>
                                    <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0 }}>{info.value}</p>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--gray-200)' }}>
                            <h3 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>$ bio</h3>
                            <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0, lineHeight: 1.6 }}>{user.bio || t('profile.noBio')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {open && (
                <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
                    <div style={{ background: 'var(--bg-surface-short)', border: '1px solid var(--border-base)', borderRadius: 2, maxWidth: 640, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottom: '1px solid var(--border-base)', position: 'sticky', top: 0, background: 'var(--bg-surface-short)', zIndex: 1 }}>
                            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('profile.updateProfile')}</h2>
                            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: 16, color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}>✕</button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: 20 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                {[
                                    { field: 'firstName' as keyof ProfileForm, label: '$ firstName', type: 'text' },
                                    { field: 'lastName' as keyof ProfileForm, label: '$ lastName', type: 'text' },
                                    { field: 'phone' as keyof ProfileForm, label: '$ phone', type: 'text', placeholder: '0123456789' },
                                    { field: 'dateOfBirth' as keyof ProfileForm, label: '$ dateOfBirth', type: 'date' },
                                ].map(({ field, label, type, placeholder }) => (
                                    <div key={field}>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</label>
                                        <input type={type} value={(form[field] as string) || ''} onChange={(e) => handleChange(field, e.target.value)} placeholder={placeholder}
                                            style={{ ...inputStyle, borderColor: errors[field] ? 'var(--danger-primary)' : 'var(--border-base)' }}
                                            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} onBlur={(e) => { e.currentTarget.style.borderColor = errors[field] ? 'var(--danger-primary)' : 'var(--border-base)' }} />
                                        {errors[field] && <p style={{ fontSize: 11, color: 'var(--danger-primary)', margin: '4px 0 0' }}>// {errors[field]}</p>}
                                    </div>
                                ))}
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>$ address</label>
                                    <input type="text" value={form.address || ''} onChange={(e) => handleChange('address', e.target.value)} style={inputStyle}
                                        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }} />
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>$ bio</label>
                                    <textarea value={form.bio || ''} onChange={(e) => handleChange('bio', e.target.value)} placeholder={t('profile.bioPlaceholder')}
                                        style={{ ...inputStyle, resize: 'none', minHeight: 100 }}
                                        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }} />
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: 20, borderTop: '1px solid var(--border-base)', position: 'sticky', bottom: 0, background: 'var(--bg-main)' }}>
                            <button onClick={() => setOpen(false)} style={{ padding: '8px 20px', border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-surface-short)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{tc('actions.cancel')}</button>
                            <button onClick={handleSubmit} disabled={updatingProfile}
                                style={{ padding: '8px 20px', background: updatingProfile ? 'var(--text-secondary)' : 'var(--text-primary)', color: 'var(--bg-surface-short)', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: updatingProfile ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                {updatingProfile && <Loader size={14} className="animate-spin" />}
                                {'>'} {updatingProfile ? t('profile.updating') : t('profile.update')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    )
}

export default Profile