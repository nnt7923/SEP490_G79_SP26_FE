const ROUTER = {
  // Public routes
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY_OTP: '/verify-otp',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  // Example future routes
  CLASSES: '/classes',
  PLANS: '/plans',
  PLANS_RESULT: '/plans/result',
  ABOUT: '/about',
  // Private routes
  STUDENT_DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  CHANGE_PASSWORD: '/change-password',
  ADMIN_DASHBOARD: '/admin',
  MENTOR_DASHBOARD: '/mentor',
  // Admin nested
  ADMIN_API_KEY: '/admin/api-key',
  ADMIN_USERS: '/admin/users',
};

export default ROUTER;