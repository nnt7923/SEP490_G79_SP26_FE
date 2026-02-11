import React from 'react'
import useAuthStore from '../../../store/useAuthStore'
import ROUTER_META from '../../../router/ROUTER_META'
import ROUTER from '../../../router/ROUTER'
import { useNavigate } from 'react-router-dom'

const StudentIndex: React.FC = () => {
  const { user, logout } = useAuthStore()
  const displayName = user?.name || user?.username || 'Student'
  const navigate = useNavigate()

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ marginBottom: '12px' }}>{ROUTER_META[ROUTER.STUDENT_DASHBOARD]?.title || 'Dashboard'}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate(ROUTER.HOME)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff' }}>Back Home</button>
          <button onClick={async () => { await logout(); navigate(ROUTER.LOGIN) }} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff' }}>Logout</button>
        </div>
      </div>
      <p style={{ color: '#555', marginBottom: '24px' }}>Hello, {displayName}! This is the basic Student dashboard.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
        <section style={{ border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Profile Summary</h2>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            <li>Name: {user?.name || '—'}</li>
            <li>Username: {user?.username || '—'}</li>
            <li>Email: {user?.email || '—'}</li>
            <li>Role: {user?.role?.name || 'Student'}</li>
          </ul>
        </section>

        <section style={{ border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Upcoming Classes</h2>
          <p style={{ margin: 0, color: '#777' }}>No data yet. Coming soon.</p>
        </section>

        <section style={{ border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Study Progress</h2>
          <p style={{ margin: 0, color: '#777' }}>Updating. You will see statistics here.</p>
        </section>
      </div>

      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href="#" style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', textDecoration: 'none' }}>Enroll in class</a>
          <a href="#" style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', textDecoration: 'none' }}>View schedule</a>
          <a href="#" style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', textDecoration: 'none' }}>Update profile</a>
        </div>
      </div>
    </div>
  )
}

export default StudentIndex