import React from 'react'
import ReactLogo from '../../assets/react.svg'

const icons = {
  python: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg',
  js: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg',
  java: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg',
  cpp: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg',
}

const LanguageOrbit: React.FC = () => {
  return (
    <div className="lang-orbit" aria-label="Language orbit">
      <div className="lang-icon lang--python" title="Python">
        <img src={icons.python} alt="Python" />
      </div>
      <div className="lang-icon lang--js" title="JavaScript">
        <img src={icons.js} alt="JavaScript" />
      </div>
      <div className="lang-icon lang--java" title="Java">
        <img src={icons.java} alt="Java" />
      </div>
      <div className="lang-icon lang--cpp" title="C++">
        <img src={icons.cpp} alt="C++" />
      </div>
      <div className="lang-icon lang--react" title="React">
        <img src={ReactLogo} alt="React" />
      </div>
    </div>
  )
}

export default LanguageOrbit