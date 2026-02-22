import ROUTER from './ROUTER'

const ROUTER_META = {
  [ROUTER.HOME]: {
    breadcrumb: 'Home',
    title: 'Home'
  },
  [ROUTER.ABOUT]: {
    breadcrumb: 'About',
    title: 'About'
  },
  [ROUTER.STUDENT_DASHBOARD]: {
    breadcrumb: 'Dashboard',
    title: 'Dashboard'
  },
  [ROUTER.PROFILE]: {
    breadcrumb: 'Profile',
    title: 'Student Profile'
  },
  [ROUTER.MENTOR_PROFILE]: {
    breadcrumb: 'Profile',
    title: 'Mentor Profile'
  },
  [ROUTER.CHANGE_PASSWORD]: {
    breadcrumb: 'Change Password',
    title: 'Change Password'
  },
  [ROUTER.ADMIN_DASHBOARD]: {
    breadcrumb: 'Admin',
    title: 'Admin Overview'
  },
  [ROUTER.ADMIN_API_KEY]: {
    breadcrumb: 'API Key',
    title: 'Admin API Key'
  },
  [ROUTER.ADMIN_USERS]: {
    breadcrumb: 'Users',
    title: 'Admin Users'
  },
  [ROUTER.MENTOR_DASHBOARD]: {
    breadcrumb: 'Mentor',
    title: 'Mentor Overview'
  }
}

export default ROUTER_META