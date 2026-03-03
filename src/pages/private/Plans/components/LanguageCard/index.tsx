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
    className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 text-left p-6 ${
      active
        ? 'border-blue-500 bg-blue-50 shadow-lg scale-[1.02]'
        : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md hover:-translate-y-1'
    }`}
  >
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center justify-center w-14 h-14 rounded-xl ${colorClass} text-white text-2xl shadow-md transition-transform duration-300 ${
            active ? 'scale-110' : 'group-hover:scale-105'
          }`}
        >
          {icon ?? '🔖'}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-gray-900 text-lg">{name}</div>
          {desc && <div className="text-sm text-gray-600 mt-1">{desc}</div>}
        </div>
      </div>
      {tag && (
        <span className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-white/80 border border-gray-200 text-xs font-medium text-gray-700">
          <span className="w-2 h-2 rounded-full bg-teal-500" />
          {tag}
        </span>
      )}
    </div>
    {active && (
      <div className="absolute top-3 right-3 flex items-center justify-center w-7 h-7 rounded-full bg-teal-500 text-white text-xs font-bold shadow-md">
        ✓
      </div>
    )}
  </button>
)

export default LanguageCard
