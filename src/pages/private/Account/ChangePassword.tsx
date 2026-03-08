import React from 'react'
import { useState, useMemo } from 'react'
import Layout from '../../../components/Layout'
import { getStudentSidebarConfig } from '../Student/components/StudentSideBar'
import { getMentorSidebarConfig } from '../Mentor/components/MentorSideBar'
import ROUTER from '../../../router/ROUTER'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import useAuthStore from '../../../store/useAuthStore'
import ProgressToast from '../../../components/Toast/ProgressToast'
const ChangePassword = () => {
  const navigate = useNavigate()
  const { logout, changePassword, user } = useAuthStore()
  const [toast, setToast] = useState<{
    message: string
    progress: number
    status: 'loading' | 'success' | 'error'
  } | null>(null)
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
      setToast({
        message: 'Please fill in all fields',
        progress: 100,
        status: 'error'
      })
      return
    }

    if (form.newPassword.length < 8) {
      setToast({
        message: 'New password must be at least 8 characters',
        progress: 100,
        status: 'error'
      })
      return
    }

    if (form.newPassword === form.currentPassword) {
      setToast({
        message: 'New password must be different from current password',
        progress: 100,
        status: 'error'
      })
      return
    }

    if (form.newPassword !== form.confirmPassword) {
      setToast({
        message: 'Passwords do not match',
        progress: 100,
        status: 'error'
      })
      return
    }

    try {
      const res = await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      })

      if (res?.isOk) {
        setToast({
          message: res.msg || 'Password changed successfully!',
          progress: 100,
          status: 'success'
        })

        setForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      } else {
        setToast({
          message: res?.msg || 'Change password failed',
          progress: 100,
          status: 'error'
        })
      }

    } catch {
      setToast({
        message: 'Something went wrong',
        progress: 100,
        status: 'error'
      })
    }
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
      <div className="px-6 py-8 bg-th-page min-h-screen">
        <div className="max-w-2xl mx-auto bg-th-card p-8 rounded-2xl border-2 border-bd-muted shadow-sm">
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
              className="w-full px-4 py-2 border-2 border-bd-muted rounded-lg"
            />

            <input
              type="password"
              name="newPassword"
              placeholder="New Password"
              value={form.newPassword}
              onChange={handleChange}
              className="w-full px-4 py-2 border-2 border-bd-muted rounded-lg"
            />

            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-2 border-2 border-bd-muted rounded-lg"
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