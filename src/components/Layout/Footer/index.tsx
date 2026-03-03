import React from 'react'
import { Link } from 'react-router-dom'
import ROUTER from '../../../router/ROUTER'
import BrandIcon from '../../../assets/div.png'

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand Section */}
            <div className="md:col-span-1">
              <Link to="/" className="flex items-center gap-3 mb-3">
                <img src={BrandIcon} alt="CodeNexus" className="w-8 h-8 rounded-md" />
                <span className="text-lg font-semibold text-slate-900 dark:text-white">CodeNexus</span>
              </Link>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Personalized learning paths powered by AI
              </p>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Product</h4>
              <ul className="space-y-2">
                <li>
                  <Link 
                    to={ROUTER.PLANS} 
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    Plans
                  </Link>
                </li>
                <li>
                  <Link 
                    to={ROUTER.STUDENT_OVERVIEW} 
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    Overview
                  </Link>
                </li>
                <li>
                  <Link 
                    to={ROUTER.MY_RESOURCES} 
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    Resources
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Company</h4>
              <ul className="space-y-2">
                <li>
                  <Link 
                    to={ROUTER.ABOUT} 
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link 
                    to={ROUTER.HOME} 
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    Home
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 dark:border-slate-700 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              © {currentYear} CodeNexus. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a 
                href="#terms" 
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Terms
              </a>
              <a 
                href="#privacy" 
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Privacy
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer