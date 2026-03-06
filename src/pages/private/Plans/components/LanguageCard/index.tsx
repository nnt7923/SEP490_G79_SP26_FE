import React from 'react'

interface LanguageCardProps {
  active?: boolean
  name: string
  tag?: string
  colorClass: string
  icon?: string
  desc?: string
  onClick?: () => void
}

const LanguageCard: React.FC<LanguageCardProps> = ({
  active,
  name,
  tag,
  colorClass,
  icon,
  desc,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active ? 'true' : 'false'}
    className={`group relative overflow-hidden rounded-xl border transition-all duration-200 text-left p-5 cursor-pointer h-full ${
      active
        ? 'border-teal-600 bg-teal-50 shadow-sm'
        : 'border-gray-300 bg-white hover:border-teal-500 hover:bg-gray-50'
    }`}
  >
    <div className="flex flex-col h-full">
      <div className="flex items-start gap-3 flex-1">
        <div
          className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-lg ${colorClass} text-white text-xl transition-colors duration-200`}
        >
          {icon ?? '🔖'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-base mb-1">{name}</div>
          {desc && <div className="text-sm text-gray-600 line-clamp-2">{desc}</div>}
        </div>
      </div>
      {tag && (
        <span className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-md bg-gray-100 text-xs font-medium text-gray-700 mt-3">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
          {tag}
        </span>
      )}
    </div>
  </button>
)

export default LanguageCard
