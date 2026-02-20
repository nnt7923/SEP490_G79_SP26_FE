import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import useAuthStore from '../../../store/useAuthStore'
import type { User } from '../../../store/useAuthStore'
import Layout from '../../../components/Layout'
import { getStudentSidebarConfig } from '../Student/components/StudentSideBar'
import ROUTER from '../../../router/ROUTER'
import { useNavigate } from 'react-router-dom'
import { LogOut, Settings, HelpCircle } from 'lucide-react'
interface ProfileForm extends Partial<User> {
    dateOfBirth?: string
}

const Profile: React.FC = () => {
    const { user, updateProfile, uploadAvatar, loading, logout } = useAuthStore()
    const [open, setOpen] = useState<boolean>(false)
    const [form, setForm] = useState<ProfileForm | null>(null)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [message, setMessage] = useState<{
        type: 'success' | 'error'
        text: string
    } | null>(null)

    const navigate = useNavigate()

    const handleLogout = async () => {
        await logout()
        navigate(ROUTER.LOGIN)
    }

    const sidebarConfig = {
        navItems: getStudentSidebarConfig(),
        actions: [
            {
                label: 'Settings',
                icon: <Settings className="w-5 h-5" />,
                onClick: () => navigate(ROUTER.PROFILE),
            },
            {
                label: 'Help',
                icon: <HelpCircle className="w-5 h-5" />,
                onClick: () => console.log('Help clicked'),
            },
            {
                label: 'Logout',
                icon: <LogOut className="w-5 h-5" />,
                onClick: handleLogout,
                variant: 'danger' as const,
            },
        ],
        brand: {
            name: 'Dashboard',
            subtitle: 'Learning',
        },
    }
    useEffect(() => {
        if (user) {
            setForm({
                ...user,
                dateOfBirth: user.dateOfBirth
                    ? dayjs(user.dateOfBirth).format('YYYY-MM-DD')
                    : ''
            })
        }
    }, [user])

    useEffect(() => {
        if (!message) return

        const timer = setTimeout(() => {
            setMessage(null)
        }, 3000)

        return () => clearTimeout(timer)
    }, [message])

    const handleChange = (field: keyof ProfileForm, value: string) => {
        setForm(prev => {
            if (!prev) return prev
            return { ...prev, [field]: value }
        })
    }
    if (!user || !form) return <div>Loading...</div>
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {}
        const phoneRegex = /^0\d{9}$/

        if (!form.phone) {
            newErrors.phone = 'Please enter your phone number'
        } else if (!phoneRegex.test(form.phone)) {
            newErrors.phone =
                'Phone number must contain 10 digits and start with 0'
        }

        if (form.dateOfBirth) {
            const dob = dayjs(form.dateOfBirth)

            if (!dob.isValid()) {
                newErrors.dateOfBirth = 'Invalid date of birth'
            } else if (dob.isAfter(dayjs())) {
                newErrors.dateOfBirth =
                    'Date of birth cannot be in the future'
            }
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) return

        const res = await updateProfile(form)

        if (res?.isOk) {
            setMessage({
                type: 'success',
                text: res.msg || 'Profile updated successfully'
            })
        } else {
            setMessage({
                type: 'error',
                text: res?.msg || 'Update failed'
            })
        }
    }

    const handleAvatarUpload = async (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0]
        if (!file) return

        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/jpg',
            'image/webp'
        ]

        if (!allowedTypes.includes(file.type)) {
            alert('Only image files are allowed (jpg, jpeg, png, webp)')
            return
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('Maximum file size is 10MB')
            return
        }

        const res = await uploadAvatar(file)

        if (res.isOk) {
            setMessage({
                type: 'success',
                text: res.msg || 'Avatar uploaded successfully'
            })
        } else {
            setMessage({
                type: 'error',
                text: res?.msg || 'Update failed'
            })
        }
    }

    const formatDate = (dateStr?: string): string => {
        if (!dateStr) return 'Not updated'
        return dayjs(dateStr).format('MM/DD/YYYY')
    }

    return (
        <Layout sidebar={sidebarConfig}>
            <div className="px-6 py-6 profile-container ">
                {message && (
                    <div
                        style={{
                            marginBottom: 12,
                            padding: '10px 14px',
                            borderRadius: 6,
                            background:
                                message.type === 'success'
                                    ? '#e6fffa'
                                    : '#ffe6e6',
                            color:
                                message.type === 'success'
                                    ? '#007a5a'
                                    : '#cc0000',
                            fontWeight: 500
                        }}
                    >
                        {message.text}
                    </div>
                )}

                <div className="profile-top">
                    <button className="edit-btn" onClick={() => setOpen(true)}>
                        Edit
                    </button>
                </div>

                <div className="profile-header">
                    <div className="avatar-wrapper">
                        <img
                            src={
                                user.avatarUrl?.trim()
                                    ? user.avatarUrl
                                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                        `${user.firstName || ''} ${user.lastName || ''}`
                                    )}`
                            }
                            alt="avatar"
                            className="avatar-img"
                        />

                        <label className="avatar-overlay">
                            +
                            <input
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={handleAvatarUpload}
                            />
                        </label>
                    </div>

                    <div>
                        <h2>
                            {user.firstName} {user.lastName}
                        </h2>
                        <p>{user.email}</p>
                        <span>{user.bio || 'Not updated'}</span>
                    </div>
                </div>

                <h3 className="section-title">Personal Information</h3>

                <div className="info-grid">
                    <Info
                        label="Full Name"
                        value={`${user.firstName || ''} ${user.lastName || ''}`}
                    />
                    <Info label="Email" value={user.email} />
                    <Info label="Phone Number" value={user.phone} />
                    <Info
                        label="Date of Birth"
                        value={formatDate(user.dateOfBirth)}
                    />
                    <Info label="Bio" value={user.bio} />
                    <Info label="Address" value={user.address} />
                </div>

                {open && (
                    <div
                        className="modal-overlay"
                        onClick={() => setOpen(false)}
                    >
                        <div
                            className="modal-card"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3>Update Personal Information</h3>

                            <div className="modal-grid">
                                <Input
                                    label="First Name"
                                    value={form.firstName}
                                    onChange={(v) => handleChange('firstName', v)}
                                />

                                <Input
                                    label="Last Name"
                                    value={form.lastName}
                                    onChange={(v) => handleChange('lastName', v)}
                                />

                                <Input
                                    label="Phone Number"
                                    value={form.phone}
                                    onChange={(v) => handleChange('phone', v)}
                                    error={errors.phone}
                                />

                                <Input
                                    label="Date of Birth"
                                    type="date"
                                    value={form.dateOfBirth}
                                    onChange={(v) => handleChange('dateOfBirth', v)}
                                    error={errors.dateOfBirth}
                                />

                                <Input
                                    label="Bio"
                                    value={form.bio}
                                    onChange={(v) => handleChange('bio', v)}
                                />

                                <Input
                                    label="Address"
                                    value={form.address}
                                    onChange={(v) => handleChange('address', v)}
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    className="btn-cancel"
                                    onClick={() => setOpen(false)}
                                >
                                    Cancel
                                </button>

                                <button
                                    className="btn-save"
                                    onClick={handleSubmit}
                                    disabled={loading}
                                >
                                    {loading ? 'Updating...' : 'Update'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    )
}

interface InfoProps {
    label: string
    value?: string
}

const Info: React.FC<InfoProps> = ({ label, value }) => (
    <div className="info-card">
        <label>{label}</label>
        <p>{value || 'Not updated'}</p>
    </div>
)

interface InputProps {
    label: string
    value?: string
    onChange: (value: string) => void
    type?: string
    error?: string
}

const Input: React.FC<InputProps> = ({
    label,
    value,
    onChange,
    type = 'text',
    error
}) => (
    <div>
        <label>{label}</label>
        <input
            type={type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
        />
        {error && (
            <p style={{ color: 'red', fontSize: '12px' }}>
                {error}
            </p>
        )}
    </div>
)

export default Profile