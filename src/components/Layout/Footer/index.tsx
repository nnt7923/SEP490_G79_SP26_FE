import React from 'react'
import { Link } from 'react-router-dom'
import ROUTER from '../../../router/ROUTER'
import BrandIcon from '../../../assets/div.png'

const Footer: React.FC = () => {
  return (
    <footer className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-900 border-t border-gray-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <Link to="/" className="flex items-center gap-3">
              <img src={BrandIcon} alt="CodeNexus" className="w-10 h-10 rounded-md" />
              <span className="text-lg font-semibold text-slate-900 dark:text-white">CodeNexus</span>
            </Link>
            <p className="text-sm text-slate-600 dark:text-slate-400">Personalized learning paths powered by real-time content and adaptive recommendations.</p>
          </div>

          <div className="flex justify-between md:justify-center">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><Link to={ROUTER.PLANS} className="hover:text-slate-900 dark:hover:text-white">Plans</Link></li>
                <li><Link to={ROUTER.STUDENT_DASHBOARD} className="hover:text-slate-900 dark:hover:text-white">Overview</Link></li>
              </ul>
            </div>
            <div className="ml-8 md:ml-12">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><Link to={ROUTER.ABOUT} className="hover:text-slate-900 dark:hover:text-white">About</Link></li>
                <li><Link to={ROUTER.PROFILE} className="hover:text-slate-900 dark:hover:text-white">My Profile</Link></li>
                <li><a href="#contact" className="hover:text-slate-900 dark:hover:text-white">Contact</a></li>
              </ul>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">Terms</a></li>
              <li><a href="#" className="hover:text-slate-900 dark:hover:text-white">Privacy</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-100 dark:border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">© {new Date().getFullYear()} CodeNexus. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <a href="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900">Terms</a>
            <a href="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900">Privacy</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer