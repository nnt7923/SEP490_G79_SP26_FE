import React, { useState } from 'react'
import Layout from '../../../../components/Layout'
import { useMentorSidebarConfig } from '../components/MentorSideBar'
import { Users, Plus, Search, Clock, BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation('mentor')

  const filteredClasses = classes.filter(cls =>
    cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cls.subject.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'border-green-500 text-status-green bg-status-green-bg'
      case 'upcoming': return 'border-blue-500 text-status-blue bg-status-blue-bg'
      case 'completed': return 'border-bd-input text-label bg-th-page'
      default: return 'border-bd-input text-label bg-th-page'
    }
  }

  const sidebarConfig = {
    navItems: useMentorSidebarConfig(),
    actions: [],
    brand: { name: 'Classes', subtitle: 'Mentor' },
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="min-h-screen bg-[var(--gray-100)] px-4 py-8 font-mono">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-6 border-b border-bd pb-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-purple-600" />
                <div>
                  <h1 className="text-2xl font-bold text-heading border-none bg-transparent flex items-center">
                    {t('classes.title')}
                  </h1>
                  <p className="text-xs text-label mt-1 font-mono">
                    {t('classes.subtitle')}
                  </p>
                </div>
              </div>
              <button className="flex items-center gap-2 px-6 py-2 border border-purple-600 bg-th-card text-purple-600 font-bold hover:bg-purple-50 transition-colors uppercase rounded-sm">
                <Plus className="w-4 h-4" />
                <span>{t('classes.newClass')}</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-th-card border border-bd-strong p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                type="text"
                placeholder={t('classes.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-bd-strong focus:outline-none focus:border-purple-600 transition-colors text-heading placeholder:text-placeholder font-mono"
              />
            </div>
          </div>

          {/* Classes Grid */}
          {filteredClasses.length === 0 ? (
            <div className="bg-th-card border border-bd-strong p-12 text-center rounded-md">
              <Users className="w-12 h-12 text-disabled mx-auto mb-4" />
              <h3 className="text-lg font-bold text-heading mb-2">{t('classes.noClassesFound')}</h3>
              <p className="text-sm text-muted font-mono mb-4">
                {searchQuery ? t('classes.adjustSearch') : t('classes.createFirst')}
              </p>
              <button className="px-6 py-2 border border-purple-600 bg-th-card text-purple-600 font-bold hover:bg-purple-50 transition-colors uppercase rounded-sm">
                {t('classes.createClass')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClasses.map((cls) => (
                <div key={cls.id} className="bg-th-card border border-bd-strong hover:bg-th-page transition-colors flex flex-col font-mono group">
                  <div className="h-2 bg-purple-600 relative w-full" />
                  
                  <div className="p-5 flex-grow">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-bold text-heading line-clamp-1 uppercase mr-2">{cls.name}</h3>
                      <span className={`px-2 py-0.5 text-[10px] uppercase font-bold border ${getStatusColor(cls.status)}`}>
                        {cls.status}
                      </span>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-3 text-sm text-label">
                        <BookOpen className="w-4 h-4 text-placeholder" />
                        <span>{cls.subject}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-label">
                        <Clock className="w-4 h-4 text-placeholder" />
                        <span>{cls.schedule}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-label">
                        <Users className="w-4 h-4 text-placeholder" />
                        <span>{cls.studentCount} {t('classes.students')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto px-5 pb-5 pt-4 border-t border-bd">
                    <div className="flex gap-2">
                      <button className="flex-1 px-4 py-2 border border-purple-600 bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors uppercase rounded-sm">
                        {t('classes.view')}
                      </button>
                      <button className="flex-1 px-4 py-2 border border-bd-strong bg-th-card text-body text-xs font-bold hover:bg-th-input transition-colors uppercase rounded-sm">
                        {t('classes.edit')}
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
