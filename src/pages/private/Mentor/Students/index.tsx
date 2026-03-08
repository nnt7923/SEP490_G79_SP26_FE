import React, { useState } from 'react'
import Layout from '../../../../components/Layout'
import { getMentorSidebarConfig } from '../components/MentorSideBar'
import { Users, Search, Mail, TrendingUp, Award } from 'lucide-react'

type Student = {
  id: string
  name: string
  email: string
  avatar?: string
  enrolledClasses: number
  progress: number
  status: 'active' | 'inactive'
}

const MentorStudents: React.FC = () => {
  const [students] = useState<Student[]>([
    {
      id: '1',
      name: 'Nguyễn Văn A',
      email: 'nguyenvana@example.com',
      enrolledClasses: 3,
      progress: 75,
      status: 'active',
    },
    {
      id: '2',
      name: 'Trần Thị B',
      email: 'tranthib@example.com',
      enrolledClasses: 2,
      progress: 60,
      status: 'active',
    },
    {
      id: '3',
      name: 'Lê Văn C',
      email: 'levanc@example.com',
      enrolledClasses: 4,
      progress: 90,
      status: 'active',
    },
  ])

  const [searchQuery, setSearchQuery] = useState('')

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-status-green bg-status-green-bg'
    if (progress >= 50) return 'text-status-blue bg-status-blue-bg'
    return 'text-yellow-600 bg-yellow-50'
  }

  const sidebarConfig = {
    navItems: getMentorSidebarConfig(),
    actions: [],
    brand: { name: 'Students', subtitle: 'Mentor' },
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="min-h-screen bg-[var(--gray-100)] px-4 py-8 font-mono">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-6 border-b border-bd pb-4">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-pink-600" />
              <div>
                <h1 className="text-2xl font-bold text-heading border-none bg-transparent flex items-center">
                  <span className="text-pink-600 mr-2">{'>_'}</span>
                  my_students
                </h1>
                <p className="text-xs text-label mt-1 font-mono">
                  {'//'} track and manage student progress
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-th-card border border-bd-strong p-4">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-status-blue" />
                <div>
                  <p className="text-xs font-bold text-muted uppercase">total_students</p>
                  <p className="text-xl font-bold text-heading">[{students.length}]</p>
                </div>
              </div>
            </div>

            <div className="bg-th-card border border-bd-strong p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-status-green" />
                <div>
                  <p className="text-xs font-bold text-muted uppercase">avg_progress</p>
                  <p className="text-xl font-bold text-heading">
                    [{Math.round(students.reduce((acc, s) => acc + s.progress, 0) / students.length)}%]
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-th-card border border-bd-strong p-4">
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-xs font-bold text-muted uppercase">active_students</p>
                  <p className="text-xl font-bold text-heading">
                    [{students.filter(s => s.status === 'active').length}]
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-th-card border border-bd-strong p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                type="text"
                placeholder="grep 'students'..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-bd-strong focus:outline-none focus:border-pink-600 transition-colors text-heading placeholder:text-placeholder font-mono"
              />
            </div>
          </div>

          {/* Students List */}
          {filteredStudents.length === 0 ? (
            <div className="bg-th-card border border-bd-strong p-12 text-center">
              <Users className="w-12 h-12 text-disabled mx-auto mb-4" />
              <h3 className="text-lg font-bold text-heading mb-2">no_students_found()</h3>
              <p className="text-sm text-muted font-mono">
                {'//'} {searchQuery ? 'try adjusting your search' : 'no students enrolled yet'}
              </p>
            </div>
          ) : (
            <div className="bg-th-card border border-bd-strong overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-th-input border-b border-bd">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider">
                        student
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider">
                        email
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider">
                        classes
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider">
                        progress
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-muted uppercase tracking-wider">
                        actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300">
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-th-page transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 border border-bd-strong bg-th-card flex items-center justify-center text-heading font-bold text-sm uppercase">
                              {getInitials(student.name)}
                            </div>
                            <div>
                              <p className="font-bold text-heading uppercase">{student.name}</p>
                              <p className="text-xs text-muted">[{student.status}]</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-label">
                            <Mail className="w-4 h-4 text-placeholder" />
                            <span>{student.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-heading">
                            [{student.enrolledClasses}] classes
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 border text-xs font-bold uppercase ${getProgressColor(student.progress)}`}>
                            {student.progress}% cmpltd
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button className="text-sm font-bold text-pink-600 hover:text-pink-800 transition-colors uppercase">
                            [ view ]
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default MentorStudents
