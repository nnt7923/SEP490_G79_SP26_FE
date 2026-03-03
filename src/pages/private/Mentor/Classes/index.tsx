import React, { useState } from 'react'
import Layout from '../../../../components/Layout'
import { getMentorSidebarConfig } from '../components/MentorSideBar'
import { Users, Plus, Search, Calendar, Clock, BookOpen } from 'lucide-react'

type Class = {
  id: string
  name: string
  subject: string
  schedule: string
  studentCount: number
  status: 'active' | 'upcoming' | 'completed'
}

const MentorClasses: React.FC = () => {
  const [classes] = useState<Class[]>([
    {
      id: '1',
      name: 'JavaScript Fundamentals',
      subject: 'JavaScript',
      schedule: 'Mon, Wed, Fri - 10:00 AM',
      studentCount: 24,
      status: 'active',
    },
    {
      id: '2',
      name: 'React Advanced',
      subject: 'React',
      schedule: 'Tue, Thu - 2:00 PM',
      studentCount: 18,
      status: 'active',
    },
  ])

  const [searchQuery, setSearchQuery] = useState('')

  const filteredClasses = classes.filter(cls =>
    cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cls.subject.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-200'
      case 'upcoming': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'completed': return 'bg-gray-100 text-gray-700 border-gray-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const sidebarConfig = {
    navItems: getMentorSidebarConfig(),
    actions: [],
    brand: { name: 'Classes', subtitle: 'Mentor' },
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] to-[#F1F5F9] px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-[#1E293B]">My Classes</h1>
                  <p className="text-sm text-[#64748B] mt-1">Manage your teaching classes</p>
                </div>
              </div>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors shadow-md">
                <Plus className="w-5 h-5" />
                <span className="font-medium">New Class</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search classes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all text-[#1E293B] placeholder:text-[#94A3B8]"
              />
            </div>
          </div>

          {/* Classes Grid */}
          {filteredClasses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center">
              <Users className="w-16 h-16 text-[#CBD5E1] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[#1E293B] mb-2">No classes found</h3>
              <p className="text-sm text-[#64748B] mb-4">
                {searchQuery ? 'Try adjusting your search' : 'Create your first class to get started'}
              </p>
              <button className="px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors">
                Create Class
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClasses.map((cls) => (
                <div key={cls.id} className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
                  <div className="h-24 bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] relative">
                    <div className="absolute top-3 right-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(cls.status)}`}>
                        {cls.status}
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="text-lg font-bold text-[#1E293B] mb-2 line-clamp-1">{cls.name}</h3>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-[#64748B]">
                        <BookOpen className="w-4 h-4" />
                        <span>{cls.subject}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[#64748B]">
                        <Clock className="w-4 h-4" />
                        <span>{cls.schedule}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[#64748B]">
                        <Users className="w-4 h-4" />
                        <span>{cls.studentCount} students</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button className="flex-1 px-4 py-2 bg-[#2563EB] text-white text-sm font-medium rounded-lg hover:bg-[#1D4ED8] transition-colors">
                        View
                      </button>
                      <button className="px-4 py-2 border border-[#E2E8F0] text-[#64748B] text-sm font-medium rounded-lg hover:bg-[#F8FAFC] transition-colors">
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default MentorClasses
