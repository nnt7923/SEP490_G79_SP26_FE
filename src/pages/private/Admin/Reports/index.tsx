import React, { useMemo } from 'react'
import Layout from '../../../../components/Layout'
import { getAdminSidebarConfig } from '../components/AdminSideBar'
import { Download, Filter, FileText } from 'lucide-react'

const AdminReportsPage: React.FC = () => {
  const sidebarConfig = useMemo(() => ({
    navItems: getAdminSidebarConfig() as any,
    actions: [],
    brand: { name: 'Reports', subtitle: 'Admin' },
  }), [])

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
           <div className="mb-6 border-b border-gray-300 pb-4">
             <div className="flex items-center justify-between gap-4">
               <div>
                 <h1 className="text-2xl font-bold text-gray-900 border-none bg-transparent">
                   <span className="text-blue-600 mr-2">{'>_'}</span>
                   admin_reports
                 </h1>
                 <p className="text-gray-500 mt-2">
                   <span className="text-gray-400 mr-2">{'//'}</span>
                   view and download system analytics
                 </p>
               </div>
               <button
                 className="inline-flex items-center gap-2 px-4 py-2 border border-blue-600 bg-white text-blue-600 font-bold hover:bg-blue-50 transition-colors cursor-pointer"
                 title="Generat New Report"
               >
                 <FileText className="w-4 h-4" />
                 [ generate_new ]
               </button>
             </div>
           </div>

           {/* Toolbar */}
           <div className="flex flex-col sm:flex-row gap-4 mb-6">
             <div className="flex-1">
               <input
                 type="text"
                 placeholder="grep 'report_name'..."
                 className="w-full px-4 py-3 bg-white border border-gray-400 focus:outline-none focus:border-blue-500 transition-colors text-sm"
               />
             </div>
             <button className="px-6 py-2 border border-gray-400 bg-white text-gray-700 font-bold hover:bg-gray-50 transition-colors inline-flex items-center gap-2 cursor-pointer">
               <Filter className="w-4 h-4" />
               [ filter: all ]
             </button>
           </div>

           {/* Report List */}
           <div className="bg-white border border-gray-400">
             <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-300 bg-gray-100 font-bold text-xs text-gray-600 uppercase">
               <div className="col-span-6">filename</div>
               <div className="col-span-2">size</div>
               <div className="col-span-3">created_at</div>
               <div className="col-span-1 text-right">action</div>
             </div>
             
             <div className="divide-y divide-gray-200">
               {mockReports.map((report) => (
                 <div key={report.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50 transition-colors text-sm">
                   <div className="col-span-6 font-bold text-gray-900">
                     <span className="text-blue-600 mr-2">[*]</span>
                     {report.name}
                   </div>
                   <div className="col-span-2 text-gray-500">{report.size}</div>
                   <div className="col-span-3 text-gray-500">{report.date}</div>
                   <div className="col-span-1 flex justify-end">
                     <button
                       className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                       title="Download"
                     >
                       <Download className="w-4 h-4" />
                     </button>
                   </div>
                 </div>
               ))}
               {mockReports.length === 0 && (
                 <div className="p-8 text-center text-gray-500 font-bold">
                   {'//'} no_reports_found()
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
