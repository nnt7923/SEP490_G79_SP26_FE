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
            newErrors.phone = 'Vui lòng nhập số điện thoại'
        } else if (!phoneRegex.test(form.phone)) {
            newErrors.phone = 'Số điện thoại phải gồm 10 số và bắt đầu bằng 0'
        }

        if (form.dateOfBirth) {
            const dob = dayjs(form.dateOfBirth)

            if (!dob.isValid()) {
                newErrors.dateOfBirth = 'Ngày sinh không hợp lệ'
            } else if (dob.isAfter(dayjs())) {
                newErrors.dateOfBirth = 'Ngày sinh không được lớn hơn hôm nay'
            }
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) return

        const res = await updateProfile(form)

        if (res.isOk) {
            alert(res.msg)
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
            alert('Chỉ chấp nhận file ảnh (jpg, jpeg, png, webp)')
            return
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('Ảnh tối đa 10MB')
            return
        }

        const res = await uploadAvatar(file)

        if (res.isOk) {
            alert(res.msg || 'Upload avatar thành công')
        } else {
            alert(res.msg || 'Upload thất bại')
        }
    }


    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'Chưa cập nhật'
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
                    Chỉnh sửa
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
                    <span>{user.bio || 'Chưa cập nhật'}</span>
                </div>
            </div>

            <h3 className="section-title">Thông Tin Cá Nhân</h3>

            <div className="info-grid">
                <Info
                    label="Họ và tên"
                    value={`${user.firstName} ${user.lastName}`}
                />
                <Info label="Email" value={user.email} />
                <Info label="Số Điện Thoại" value={user.phone} />
                <Info label="Ngày Sinh" value={formatDate(user.dateOfBirth)} />
                <Info label="Chuyên Ngành" value={user.bio} />
                <Info label="Địa Chỉ" value={user.address} />
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
                        <h3>Cập nhật thông tin cá nhân</h3>

                        <div className="modal-grid">
                            <Input
                                label="Họ"
                                value={form.firstName}
                                onChange={(v: any) =>
                                    handleChange('firstName', v)
                                }
                            />

                            <Input
                                label="Tên"
                                value={form.lastName}
                                onChange={(v: any) =>
                                    handleChange('lastName', v)
                                }
                            />

                            <Input
                                label="Số điện thoại"
                                value={form.phone}
                                onChange={(v: any) =>
                                    handleChange('phone', v)
                                }
                                error={errors.phone}
                            />

                            <Input
                                label="Ngày sinh"
                                type="date"
                                value={form.dateOfBirth}
                                onChange={(v: any) =>
                                    handleChange('dateOfBirth', v)
                                }
                                error={errors.dateOfBirth}
                            />

                            <Input
                                label="Chuyên ngành"
                                value={form.bio}
                                onChange={(v: any) =>
                                    handleChange('bio', v)
                                }
                            />

                            <Input
                                label="Địa chỉ"
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
                                Hủy
                            </button>

                            <button
                                className="btn-save"
                                onClick={handleSubmit}
                                disabled={loading}
                            >
                                {loading
                                    ? 'Đang cập nhật...'
                                    : 'Cập nhật'}
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
        <p>{value || 'Chưa cập nhật'}</p>
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
