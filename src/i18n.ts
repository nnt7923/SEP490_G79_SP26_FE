import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Vietnamese
import viCommon from './locales/vi/common.json'
import viAuth from './locales/vi/auth.json'
import viHome from './locales/vi/home.json'
import viStudent from './locales/vi/student.json'
import viMentor from './locales/vi/mentor.json'
import viAdmin from './locales/vi/admin.json'
import viErrors from './locales/vi/errors.json'
import viGoals from './locales/vi/goals.json'

// English
import enCommon from './locales/en/common.json'
import enAuth from './locales/en/auth.json'
import enHome from './locales/en/home.json'
import enStudent from './locales/en/student.json'
import enMentor from './locales/en/mentor.json'
import enAdmin from './locales/en/admin.json'
import enErrors from './locales/en/errors.json'
import enGoals from './locales/en/goals.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      vi: {
        common: viCommon,
        auth: viAuth,
        home: viHome,
        student: viStudent,
        mentor: viMentor,
        admin: viAdmin,
        errors: viErrors,
        goals: viGoals,
      },
      en: {
        common: enCommon,
        auth: enAuth,
        home: enHome,
        student: enStudent,
        mentor: enMentor,
        admin: enAdmin,
        errors: enErrors,
        goals: enGoals,
      },
    },
    defaultNS: 'common',
    fallbackLng: 'vi',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
  })

export default i18n
