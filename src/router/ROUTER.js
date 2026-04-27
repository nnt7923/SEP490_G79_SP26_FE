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
  STUDENT_ACHIEVEMENTS: "/achievements",
  MY_PLANS: "/my-plans",
  STUDENT_PATH_EDIT: "/my-plans/:pathId/edit",
  EXPLORE_PATHS: "/explore-paths",
  EXPLORE_PATH_PREVIEW: "/explore-paths/:pathId/preview",
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
  MENTOR_PUBLISHED_PATHS: "/mentor/published",
  MENTOR_PUBLISHED_PATH_DETAIL: "/mentor/published/:pathId",
  MENTOR_TASK_REVIEWS: "/mentor/task-reviews",
  MENTOR_MY_REVIEWS: "/mentors/me/reviews",
  // Admin nested
  ADMIN_API_KEY: "/admin/api-key",
  ADMIN_SHOP: "/admin/shop",
  ADMIN_SUBSCRIPTION_PLANS: "/admin/subscription-plans",
  ADMIN_BILLING_TRANSACTIONS: "/admin/billing/transactions",
  ADMIN_AI_SPENDING: "/admin/ai-spending",
  ADMIN_MENTOR_AI_USAGE: "/admin/mentor-ai-usage",
  ADMIN_USERS: "/admin/users",
  ADMIN_REPORTS: "/admin/reports",
  ADMIN_AUDIT_LOGS: "/admin/audit-logs",
  ADMIN_SYSTEM_RUNTIME_POLICY: "/admin/system-runtime-policy",
  ADMIN_MENTOR_REVIEWS: "/admin/mentor-reviews",
  // Mentor nested
  MENTOR_PROFILE: "/mentor/profile",
  // Student resources
  MY_RESOURCES: "/my-resources",
  NOTIFICATIONS: "/notifications",
  // Quiz
  QUIZ: "/quiz/:quizId",
  // Task (Chapter Tasks)
  TASK: "/task/:chapterId",
  // Focus Session
  FOCUS_SESSION: "/focus-session",
  FOCUS_SESSION_HISTORY: "/focus-session/history",
  TASK_REVIEW_DETAIL: "/task-reviews/:reviewId",
  // Chat
  CHAT: "/chat",
  CHAT_SHARE_PREVIEW: "/chat/share-preview/:shareId",
  LEARNING_PATH_SHARE_UPDATES: "/learning-path-shares/:shareId/updates",
  MENTOR_CHAT: "/mentor/chat",
  // Channel Chat (Community)
  CHANNEL_CHAT: "/community",
  MENTOR_CHANNEL_CHAT: "/mentor/community",
  // Subscription
  SHOP: "/shop",
  SUBSCRIPTION: "/subscription",
  SUBSCRIPTION_CURRENT: "/subscription/current",
  BILLING_RESULT: "/billing/result",
  BILLING_HISTORY: "/billing/history",
  SUBSCRIPTION_SUCCESS: "/subscription/success",
};

export default ROUTER;
