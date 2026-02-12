import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import useAuthStore from '../../../store/useAuthStore'

const Profile = () => {
    const { user, updateProfile, uploadAvatar, loading } = useAuthStore()

    const [open, setOpen] = useState(false)
    const [form, setForm] = useState<any>(null)
    const [errors, setErrors] = useState<any>({})
    const [message, setMessage] = useState<string>('')

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

    if (!user || !form) return <div>Loading...</div>

    const handleChange = (field: string, value: any) => {
        setForm({ ...form, [field]: value })
    }

    const validate = () => {
        const newErrors: any = {}
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

        if (res.isOk) {
            alert(res.msg || 'Profile updated successfully')
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
            alert(
                'Only image files are allowed (jpg, jpeg, png, webp)'
            )
            return
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('Maximum file size is 10MB')
            return
        }

        const res = await uploadAvatar(file)

        if (res.isOk) {
            alert(res.msg || 'Avatar uploaded successfully')
        } else {
            alert(res.msg || 'Avatar upload failed')
        }
    }

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'Not updated'
        return dayjs(dateStr).format('DD/MM/YYYY')
    }

    return (
        <div className="profile-container">

            {message && (
                <div style={{ marginBottom: 10, color: 'green' }}>
                    {message}
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
                            user?.avatarUrl?.trim()
                                ? user.avatarUrl
                                : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    `${user?.firstName || ''} ${user?.lastName || ''}`
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
                    value={`${user.firstName} ${user.lastName}`}
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
                                onChange={(v: any) =>
                                    handleChange('firstName', v)
                                }
                            />

                            <Input
                                label="Last Name"
                                value={form.lastName}
                                onChange={(v: any) =>
                                    handleChange('lastName', v)
                                }
                            />

                            <Input
                                label="Phone Number"
                                value={form.phone}
                                onChange={(v: any) =>
                                    handleChange('phone', v)
                                }
                                error={errors.phone}
                            />

                            <Input
                                label="Date of Birth"
                                type="date"
                                value={form.dateOfBirth}
                                onChange={(v: any) =>
                                    handleChange('dateOfBirth', v)
                                }
                                error={errors.dateOfBirth}
                            />

                            <Input
                                label="Bio"
                                value={form.bio}
                                onChange={(v: any) =>
                                    handleChange('bio', v)
                                }
                            />

                            <Input
                                label="Address"
                                value={form.address}
                                onChange={(v: any) =>
                                    handleChange('address', v)
                                }
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
                                {loading
                                    ? 'Updating...'
                                    : 'Update'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

const Info = ({ label, value }: any) => (
    <div className="info-card">
        <label>{label}</label>
        <p>{value || 'Not updated'}</p>
    </div>
)

const Input = ({
    label,
    value,
    onChange,
    type = 'text',
    error,
}: any) => (
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
