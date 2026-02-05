import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import ROUTER from '../../../router/ROUTER'

const StudentSideBar: React.FC = () => {
  const location = useLocation()
  const isActive = (path: string) => location.pathname === path

  return (
    <aside style={{ borderRight: '1px solid #eee', padding: 16, minWidth: 220 }}>
      <nav style={{ display: 'grid', gap: 8 }}>
        <Link to={ROUTER.STUDENT_DASHBOARD} style={{ color: isActive(ROUTER.STUDENT_DASHBOARD) ? '#111' : '#555' }}>Dashboard</Link>
        <a href="#" style={{ color: '#555' }} onClick={(e) => e.preventDefault()}>Lớp học</a>
        <a href="#" style={{ color: '#555' }} onClick={(e) => e.preventDefault()}>Tiến độ</a>
        <a href="#" style={{ color: '#555' }} onClick={(e) => e.preventDefault()}>Hồ sơ</a>
      </nav>
    </aside>
  )
}

export default StudentSideBar