const ROUTER = {
  // Public routes
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  VERIFY_OTP: "/verify-otp",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  // Example future routes
  CLASSES: "/classes",
  PLANS: "/plans",
  PLANS_RESULT: "/plans/result",
  ABOUT: "/about",
  // Private routes
  STUDENT_DASHBOARD: "/dashboard",
  STUDENT_OVERVIEW: "/overview",
  MY_PLANS: "/my-plans",
  GOALS: "/goals",
  PROFILE: "/profile", // Student profile
  CHANGE_PASSWORD: "/change-password",
  ADMIN_DASHBOARD: "/admin",
  MENTOR_DASHBOARD: "/mentor",
  MENTOR_AI_PLANS: "/mentor/ai-plans",
  MENTOR_AI_PLAN_DETAIL: "/mentor/ai-plans/:pathId",
  MENTOR_DRAFTS: "/mentor/drafts",
  MENTOR_DRAFT_CREATE: "/mentor/drafts/new",
  MENTOR_DRAFT_DETAIL: "/mentor/drafts/:pathId",
  // Admin nested
  ADMIN_API_KEY: "/admin/api-key",
  ADMIN_USERS: "/admin/users",
  ADMIN_REPORTS: "/admin/reports",
  ADMIN_AUDIT_LOGS: "/admin/audit-logs",
  // Mentor nested
  MENTOR_PROFILE: "/mentor/profile",
  // Student resources
  MY_RESOURCES: "/my-resources",
  // Quiz
  QUIZ: "/quiz/:quizId",
  // Task (Chapter Tasks)
  TASK: "/task/:chapterId",
  // Focus Session
  FOCUS_SESSION: "/focus-session",
  // Chat
  CHAT: "/chat",
  MENTOR_CHAT: "/mentor/chat",
};

export default ROUTER;
