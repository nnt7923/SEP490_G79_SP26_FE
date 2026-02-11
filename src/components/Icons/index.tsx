import React from 'react'
import ReactLogo from '../../assets/react.svg'

const langs = [
  { name: 'Python', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg' },
  { name: 'PHP', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg' },
  { name: 'JavaScript', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg' },
  { name: 'Java', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg' },
  { name: 'C++', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg' },
]

const LanguageIcons: React.FC = () => {
  return (
    <div className="language-strip" aria-label="Programming languages">
      {langs.map(l => (
        <div key={l.name} className="language-icon" title={l.name}>
          <img src={l.src} alt={l.name} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>
      ))}
      <div className="language-icon" title="React">
        <img src={ReactLogo} alt="React" />
      </div>
    </div>
  )
}

export default LanguageIcons