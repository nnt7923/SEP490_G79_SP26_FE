import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import useAuthStore from '../../../store/useAuthStore'
import type { User } from '../../../store/useAuthStore'
import Layout from '../../../components/Layout'
import { getStudentSidebarConfig } from '../Student/components/StudentSideBar'
import { getMentorSidebarConfig } from '../Mentor/components/MentorSideBar'
import ROUTER from '../../../router/ROUTER'
import { useNavigate } from 'react-router-dom'
import { LogOut, Settings, HelpCircle, Camera, X, Loader } from 'lucide-react'

/**
 * Profile page for students and mentors
 * Displays and allows editing of personal information
 */

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

    const roleName = (user?.role?.name || (user as any)?.roleName || (user as any)?.roles?.[0] || '').toString().trim().toLowerCase()

    useEffect(() => {
        if (roleName === 'admin') {
            navigate(ROUTER.ADMIN_DASHBOARD, { replace: true })
        }
    }, [roleName, navigate])

    const navItems = roleName === 'mentor' ? getMentorSidebarConfig() : getStudentSidebarConfig()

    const sidebarConfig = {
        navItems,
        actions: [
            {
                label: 'Settings',
                icon: <Settings className="w-5 h-5" />,
                onClick: () => navigate(roleName === 'mentor' ? ROUTER.MENTOR_PROFILE : ROUTER.PROFILE),
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
            name: 'Profile',
            subtitle: roleName === 'mentor' ? 'Teaching' : 'Learning',
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
            setOpen(false)
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

    const getInitials = (first?: string, last?: string) => {
        return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase() || 'U'
    }

    return (
        <Layout sidebar={sidebarConfig}>
            <div className="px-6 py-8 bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] min-h-screen">
                {/* Message Alert */}
                {message && (
                    <div className={`mb-6 p-4 rounded-lg border-l-4 ${
                        message.type === 'success' 
                            ? 'bg-[#dcfce7] border-[#16a34a]' 
                            : 'bg-[#fee2e2] border-[#dc2626]'
                    }`}>
                        <p className={message.type === 'success' ? 'text-[#15803d]' : 'text-[#991b1b]'}>
                            {message.text}
                        </p>
                    </div>
                )}

                {/* Profile Header Card */}
                <div className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden shadow-sm mb-8">
                    <div className="h-24 bg-gradient-to-r "></div>
                    
                    <div className="px-6 pb-6 -mt-12 relative">
                        <div className="flex items-end gap-4 mb-6">
                            {/* Avatar */}
                            <div className="relative group">
                                <div className="w-28 h-28 rounded-xl bg-gradient-to-br from-[#2f80ed] to-[#7c3aed] border-4 border-white shadow-lg flex items-center justify-center">
                                    {user.avatarUrl?.trim() ? (
                                        <img
                                            src={user.avatarUrl}
                                            alt="avatar"
                                            className="w-full h-full rounded-lg object-cover"
                                        />
                                    ) : (
                                        <span className="text-white font-bold text-3xl">
                                            {getInitials(user.firstName, user.lastName)}
                                        </span>
                                    )}
                                </div>
                                
                                {/* Avatar Upload Overlay */}
                                <label className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center cursor-pointer">
                                    <Camera size={24} className="text-white" />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        hidden
                                        onChange={handleAvatarUpload}
                                    />
                                </label>
                            </div>
                            
                            {/* Profile Info */}
                            <div className="flex-1 pb-2">
                                <h1 className="text-2xl font-bold text-[#111827]">
                                    {user.firstName} {user.lastName}
                                </h1>
                                <p className="text-sm text-[#6b7280]">{user.email}</p>
                                {/* <p className="text-sm text-[#9ca3af] mt-1">{user.bio || 'No bio yet'}</p> */}
                            </div>

                            {/* Edit Button */}
                            <button
                                onClick={() => setOpen(true)}
                                className="h-10 px-6 rounded-lg bg-[#2f80ed] text-white text-sm font-600 hover:bg-[#1d5ed4] transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg"
                            >
                                Edit Profile
                            </button>
                        </div>

                        {/* Quick Stats */}
                        {/* <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            
                            <div className="stat-card">
                                <div className="stat-card__label">Phone</div>
                                <div className="stat-card__value">{user.phone || '—'}</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-card__label">Birth Date</div>
                                <div className="stat-card__value text-xs">{formatDate(user.dateOfBirth)}</div>
                            </div>
                        </div> */}
                    </div>
                </div>

                {/* Personal Information Card */}
                <div className="dashboard-card">
                    <div className="dashboard-card__header">
                        <div className="flex items-center gap-3">
                            {/* <div className="icon-badge icon-badge--primary">
                                <Settings size={20} />
                            </div> */}
                            <div>
                                <h2 className="text-lg font-bold text-[#111827]">Personal Information</h2>
                            </div>
                        </div>
                    </div>

                    <div className="dashboard-card__body">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InfoCard
                                label="First Name"
                                value={user.firstName || 'Not updated'}
                            />
                            <InfoCard
                                label="Last Name"
                                value={user.lastName || 'Not updated'}
                            />
                            <InfoCard
                                label="Email"
                                value={user.email}
                            />
                            <InfoCard
                                label="Phone Number"
                                value={user.phone || 'Not updated'}
                            />
                            <InfoCard
                                label="Date of Birth"
                                value={formatDate(user.dateOfBirth)}
                            />
                            <InfoCard
                                label="Address"
                                value={user.address || 'Not updated'}
                            />
                        </div>
                        
                        <div className="mt-6 pt-6 border-t border-[#e5e7eb]">
                            <h3 className="text-sm font-600 text-[#6b7280] mb-3">Bio</h3>
                            <p className="text-sm text-[#374151] leading-relaxed">
                                {user.bio || 'No bio added yet.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-[#e5e7eb] bg-white">
                            <h2 className="text-xl font-bold text-[#111827]">Update Personal Information</h2>
                            <button
                                onClick={() => setOpen(false)}
                                className="p-2 hover:bg-[#f3f4f6] rounded-lg transition-colors duration-200"
                                title="Close modal"
                            >
                                <X size={20} className="text-[#6b7280]" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput
                                    label="First Name"
                                    value={form.firstName}
                                    onChange={(v) => handleChange('firstName', v)}
                                />

                                <FormInput
                                    label="Last Name"
                                    value={form.lastName}
                                    onChange={(v) => handleChange('lastName', v)}
                                />

                                <FormInput
                                    label="Phone Number"
                                    value={form.phone}
                                    placeholder="0123456789"
                                    onChange={(v) => handleChange('phone', v)}
                                    error={errors.phone}
                                />

                                <FormInput
                                    label="Date of Birth"
                                    type="date"
                                    value={form.dateOfBirth}
                                    onChange={(v) => handleChange('dateOfBirth', v)}
                                    error={errors.dateOfBirth}
                                />

                                <div className="md:col-span-2">
                                    <FormInput
                                        label="Address"
                                        value={form.address}
                                        onChange={(v) => handleChange('address', v)}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-600 text-[#111827] mb-2">
                                        Bio
                                    </label>
                                    <textarea
                                        value={form.bio || ''}
                                        onChange={(e) => handleChange('bio', e.target.value)}
                                        placeholder="Tell us about yourself..."
                                        className="w-full px-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f80ed] focus:border-transparent resize-none"
                                        rows={4}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="sticky bottom-0 flex items-center justify-end gap-3 p-6 border-t border-[#e5e7eb] bg-[#f9fafb]">
                            <button
                                onClick={() => setOpen(false)}
                                className="px-6 py-2 rounded-lg border border-[#e5e7eb] text-[#374151] font-600 hover:bg-[#f3f4f6] transition-all duration-200 cursor-pointer"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="px-6 py-2 rounded-lg bg-[#2f80ed] text-white font-600 hover:bg-[#1d5ed4] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
                            >
                                {loading && <Loader size={16} className="animate-spin" />}
                                {loading ? 'Updating...' : 'Update Profile'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    )
}

interface InfoCardProps {
    label: string
    value?: string
}

const InfoCard: React.FC<InfoCardProps> = ({ label, value }) => (
    <div className="p-4 bg-[#f9fafb] rounded-lg border border-[#f3f4f6]">
        <p className="text-xs font-600 text-[#6b7280] text-transform: uppercase letter-spacing-0.5 mb-2">
            {label}
        </p>
        <p className="text-sm font-500 text-[#111827]">
            {value || 'Not updated'}
        </p>
    </div>
)

interface FormInputProps {
    label: string
    value?: string
    onChange: (value: string) => void
    type?: string
    error?: string
    placeholder?: string
}

const FormInput: React.FC<FormInputProps> = ({
    label,
    value,
    onChange,
    type = 'text',
    error,
    placeholder
}) => (
    <div className="flex flex-col gap-2">
        <label className="text-sm font-600 text-[#111827]">
            {label}
        </label>
        <input
            type={type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f80ed] focus:border-transparent transition-all duration-200 ${
                error
                    ? 'border-[#dc2626] focus:ring-[#dc2626]'
                    : 'border-[#e5e7eb]'
            }`}
        />
        {error && (
            <p className="text-xs text-[#dc2626]">
                {error}
            </p>
        )}
    </div>
)

export default Profile