import ROUTER from './ROUTER'

const ROUTER_META = {
  [ROUTER.HOME]: { breadcrumb: 'Home', title: 'Home' },
  [ROUTER.LOGIN]: { breadcrumb: 'Login', title: 'Login' },
  [ROUTER.REGISTER]: { breadcrumb: 'Register', title: 'Register' },
  [ROUTER.VERIFY_OTP]: { breadcrumb: 'Verify OTP', title: 'Verify OTP' },
  [ROUTER.FORGOT_PASSWORD]: { breadcrumb: 'Forgot Password', title: 'Forgot Password' },
  [ROUTER.RESET_PASSWORD]: { breadcrumb: 'Reset Password', title: 'Reset Password' },
  [ROUTER.CLASSES]: { breadcrumb: 'Classes', title: 'Classes' },
  [ROUTER.PLANS]: { breadcrumb: 'Plans', title: 'Plans' },
  [ROUTER.PLANS_RESULT]: { breadcrumb: 'Plan Result', title: 'Learning Path' },
  [ROUTER.ABOUT]: { breadcrumb: 'About', title: 'About Us' },
  [ROUTER.STUDENT_DASHBOARD]: { breadcrumb: 'Dashboard', title: 'Student Dashboard' },
  [ROUTER.PROFILE]: { breadcrumb: 'Profile', title: 'My Profile' },
  [ROUTER.CHANGE_PASSWORD]: { breadcrumb: 'Change Password', title: 'Change Password' },
  [ROUTER.ADMIN_DASHBOARD]: { breadcrumb: 'Admin', title: 'Admin Dashboard' },
  [ROUTER.MENTOR_DASHBOARD]: { breadcrumb: 'Mentor', title: 'Mentor Dashboard' },
  [ROUTER.ADMIN_API_KEY]: { breadcrumb: 'API Key', title: 'Admin API Key' },
  [ROUTER.ADMIN_USERS]: { breadcrumb: 'Users', title: 'Admin Users' },
}

export default ROUTER_META