import { useState, useMemo } from 'react'
import Layout from '../../../components/Layout'
import { getStudentSidebarConfig } from '../Student/components/StudentSideBar'
import { getMentorSidebarConfig } from '../Mentor/components/MentorSideBar'
import ROUTER from '../../../router/ROUTER'
import { useNavigate } from 'react-router-dom'
import { LogOut, Settings, HelpCircle } from 'lucide-react'
import useAuthStore from '../../../store/useAuthStore'

const ChangePassword = () => {
  const navigate = useNavigate()
  const { logout, changePassword, user } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    navigate(ROUTER.LOGIN)
  }

  const roleName = (user?.role?.name || (user as any)?.roleName || (user as any)?.roles?.[0] || '').toString().trim().toLowerCase()
  const navItems = useMemo(() => roleName === 'mentor' ? getMentorSidebarConfig() : getStudentSidebarConfig(), [roleName])

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
      name: 'Dashboard',
      subtitle: roleName === 'mentor' ? 'Teaching' : 'Learning',
    },
  }

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
    alert('Please fill in all fields')
    return
  }

  if (form.newPassword.length < 8) {
    alert('New password must be at least 8 characters')
    return
  }

  if (form.newPassword === form.currentPassword) {
    alert('New password must be different from current password')
    return
  }

  if (form.newPassword !== form.confirmPassword) {
    alert('Passwords do not match')
    return
  }

  try {
    const res = await changePassword({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    })

    console.log('API response:', res)

    if (res?.isOk) {
      alert(res.msg || 'Password changed successfully!')
      setForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } else {
      alert(res?.msg || 'Change password failed')
    }
  } catch (error) {
    console.error(error)
    alert('Something went wrong')
  }
}

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-6 py-8 bg-gray-50 min-h-screen">
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl border-2 border-gray-200 shadow-sm">
          <h2 className="text-2xl font-bold mb-6">
            Change Password
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">

            <input
              type="password"
              name="currentPassword"
              placeholder="Current Password"
              value={form.currentPassword}
              onChange={handleChange}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg"
            />

            <input
              type="password"
              name="newPassword"
              placeholder="New Password"
              value={form.newPassword}
              onChange={handleChange}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg"
            />

            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg"
            />

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 transition"
            >
              Update Password
            </button>

          </form>
        </div>
      </div>
    </Layout>
  )
}

export default ChangePassword