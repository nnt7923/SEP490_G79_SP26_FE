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
  [ROUTER.ABOUT]: { breadcrumb: 'About', title: 'About Us' },
  [ROUTER.STUDENT_DASHBOARD]: { breadcrumb: 'Dashboard', title: 'Student Dashboard' },
  [ROUTER.PROFILE]: { breadcrumb: 'Profile', title: 'My Profile' },
}

export default ROUTER_META