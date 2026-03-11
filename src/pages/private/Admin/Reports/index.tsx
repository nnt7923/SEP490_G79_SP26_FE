import React from 'react'
import Layout from '../../../../components/Layout'
import { useAdminSidebarConfig } from '../components/AdminSideBar'
import { Download, Filter, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const AdminReportsPage: React.FC = () => {
  const adminNavItems = useAdminSidebarConfig()
  const sidebarConfig = {
    navItems: adminNavItems as any,
    actions: [],
    brand: { name: 'Reports', subtitle: 'Admin' },
  }
  const { t } = useTranslation('admin')

  // Mock data for reports
  const mockReports = [
    { id: 'rpt-01', name: 'user_activity_log.csv', size: '2.4 MB', date: '2026-03-08' },
    { id: 'rpt-02', name: 'api_usage_metrics.json', size: '1.1 MB', date: '2026-03-07' },
    { id: 'rpt-03', name: 'system_health_dump.txt', size: '450 KB', date: '2026-03-06' },
  ]

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-4 py-8 bg-[var(--gray-100)] min-h-screen font-mono">
        <div className="max-w-6xl mx-auto space-y-6">
           {/* Header */}
           <div className="mb-6 border-b border-bd pb-4">
             <div className="flex items-center justify-between gap-4">
               <div>
                 <h1 className="text-2xl font-bold text-heading border-none bg-transparent flex items-center gap-2">
                   <FileText className="text-status-blue flex-shrink-0" size={28} />
                   {t('reports.title')}
                 </h1>
                 <p className="text-muted mt-2">
                   {t('reports.subtitle')}
                 </p>
               </div>
               <button
                 className="inline-flex items-center gap-2 px-4 py-2 border border-blue-600 bg-th-card text-status-blue font-bold hover:bg-status-blue-bg transition-colors cursor-pointer rounded-sm"
                 title="Generat New Report"
               >
                 <FileText className="w-4 h-4" />
                  {t('reports.generateNew')}
               </button>
             </div>
           </div>

           {/* Toolbar */}
           <div className="flex flex-col sm:flex-row gap-4 mb-6">
             <div className="flex-1">
               <input
                 type="text"
                  placeholder={t('reports.searchPlaceholder')}
                 className="w-full px-4 py-3 bg-th-card border border-bd-strong focus:outline-none focus:border-blue-500 transition-colors text-sm"
               />
             </div>
             <button className="px-6 py-2 border border-bd-strong bg-th-card text-body font-bold hover:bg-th-page transition-colors inline-flex items-center gap-2 cursor-pointer rounded-sm">
               <Filter className="w-4 h-4" />
                {t('reports.filterAll')}
             </button>
           </div>

           {/* Report List */}
           <div className="bg-th-card border border-bd-strong">
             <div className="grid grid-cols-12 gap-4 p-4 border-b border-bd bg-th-input font-bold text-xs text-label uppercase">
                <div className="col-span-6">{t('reports.filename')}</div>
                <div className="col-span-2">{t('reports.size')}</div>
                <div className="col-span-3">{t('reports.createdAt')}</div>
                <div className="col-span-1 text-right">{t('reports.action')}</div>
             </div>
             
             <div className="divide-y divide-gray-200">
               {mockReports.map((report) => (
                 <div key={report.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-th-page transition-colors text-sm">
                   <div className="col-span-6 font-bold text-heading flex items-center gap-2">
                     <FileText size={16} className="text-status-blue flex-shrink-0" />
                     {report.name}
                   </div>
                   <div className="col-span-2 text-muted">{report.size}</div>
                   <div className="col-span-3 text-muted">{report.date}</div>
                   <div className="col-span-1 flex justify-end">
                     <button
                       className="p-2 text-status-blue hover:text-status-blue-dark hover:bg-status-blue-bg rounded-sm transition-colors cursor-pointer"
                       title="Download"
                     >
                       <Download className="w-4 h-4" />
                     </button>
                   </div>
                 </div>
               ))}
               {mockReports.length === 0 && (
                 <div className="p-8 text-center text-muted font-bold">
                    {t('reports.noReportsFound')}
                 </div>
               )}
             </div>
           </div>
        </div>
      </div>
    </Layout>
  )
}

export default AdminReportsPage
