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
      case 'active': return 'border-green-500 text-green-600 bg-green-50'
      case 'upcoming': return 'border-blue-500 text-blue-600 bg-blue-50'
      case 'completed': return 'border-gray-500 text-gray-600 bg-gray-50'
      default: return 'border-gray-500 text-gray-600 bg-gray-50'
    }
  }

  const sidebarConfig = {
    navItems: getMentorSidebarConfig(),
    actions: [],
    brand: { name: 'Classes', subtitle: 'Mentor' },
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="min-h-screen bg-[var(--gray-100)] px-4 py-8 font-mono">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-6 border-b border-gray-300 pb-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-purple-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 border-none bg-transparent flex items-center">
                    <span className="text-purple-600 mr-2">{'>_'}</span>
                    my_classes
                  </h1>
                  <p className="text-xs text-gray-600 mt-1 font-mono">
                    {'//'} manage your teaching classes
                  </p>
                </div>
              </div>
              <button className="flex items-center gap-2 px-6 py-2 border border-purple-600 bg-white text-purple-600 font-bold hover:bg-purple-50 transition-colors uppercase">
                <Plus className="w-4 h-4" />
                <span>[ new_class ]</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white border border-gray-400 p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="grep 'classes'..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-400 focus:outline-none focus:border-purple-600 transition-colors text-gray-900 placeholder:text-gray-400 font-mono"
              />
            </div>
          </div>

          {/* Classes Grid */}
          {filteredClasses.length === 0 ? (
            <div className="bg-white border border-gray-400 p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">no_classes_found()</h3>
              <p className="text-sm text-gray-500 font-mono mb-4">
                {'//'} {searchQuery ? 'try adjusting your search' : 'create your first class to get started'}
              </p>
              <button className="px-6 py-2 border border-purple-600 bg-white text-purple-600 font-bold hover:bg-purple-50 transition-colors uppercase">
                [ + create_class ]
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClasses.map((cls) => (
                <div key={cls.id} className="bg-white border border-gray-400 hover:bg-gray-50 transition-colors flex flex-col font-mono group">
                  <div className="h-2 bg-purple-600 relative w-full" />
                  
                  <div className="p-5 flex-grow">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-bold text-gray-900 line-clamp-1 uppercase mr-2">{cls.name}</h3>
                      <span className={`px-2 py-0.5 text-[10px] uppercase font-bold border ${getStatusColor(cls.status)}`}>
                        {cls.status}
                      </span>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <BookOpen className="w-4 h-4 text-gray-400" />
                        <span>{'//'} {cls.subject}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{'//'} {cls.schedule}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>{'//'} [{cls.studentCount}] students</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto px-5 pb-5 pt-4 border-t border-gray-300">
                    <div className="flex gap-2">
                      <button className="flex-1 px-4 py-2 border border-purple-600 bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors uppercase">
                        [ view ]
                      </button>
                      <button className="flex-1 px-4 py-2 border border-gray-400 bg-white text-gray-700 text-xs font-bold hover:bg-gray-100 transition-colors uppercase">
                        [ edit ]
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
