# 📖 Hướng dẫn: Đa ngôn ngữ (i18n) & Dark/Light Mode

> Tài liệu dành cho nhóm phát triển. Khi tạo giao diện cho **chức năng mới**, hãy làm theo hướng dẫn này để đảm bảo tương thích với hệ thống change language & dark/light mode.

---

## 📁 Cấu trúc hệ thống hiện tại

```
src/
├── i18n.ts                         # Cấu hình i18next
├── contexts/ThemeContext.tsx        # ThemeProvider + useTheme hook
├── theme.css                       # CSS variables (light + dark)
├── components/LanguageSwitcher/     # Component đổi ngôn ngữ
├── locales/
│   ├── vi/                         # Tiếng Việt
│   │   ├── common.json             # Sidebar, footer, actions chung
│   │   ├── auth.json               # Login, Register, OTP, ChangePassword
│   │   ├── home.json               # Trang chủ
│   │   ├── student.json            # Student: dashboard, plans, goals, overview
│   │   ├── mentor.json             # Mentor: dashboard, subjects, classes, students
│   │   └── admin.json              # Admin: dashboard, users, reports, apiKey
│   └── en/                         # English (cùng key structure với vi/)
│       ├── common.json
│       ├── auth.json
│       ├── home.json
│       ├── student.json
│       ├── mentor.json
│       └── admin.json
```

---

## 🎨 PHẦN 1: Dark/Light Mode (Theme)

### Nguyên tắc: KHÔNG BAO GIỜ hardcode màu

```tsx
// ❌ SAI — sẽ bể khi chuyển dark mode
<div style={{ background: '#ffffff', color: '#333333', border: '1px solid #ddd' }}>

// ✅ ĐÚNG — tự động chuyển theo theme
<div style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-base)' }}>
```

### CSS Variables thường dùng

| Mục đích | Variable | Light | Dark |
|---|---|---|---|
| **Nền chính** | `--bg-main` | `#fafafa` | `#1a1d23` |
| **Nền card/surface** | `--bg-surface` | `#ffffff` | `#22272e` |
| **Text chính** | `--text-primary` | `#1e1e1e` | `#e6edf3` |
| **Text phụ** | `--text-secondary` | `#6b7280` | `#9da5ae` |
| **Text mờ** | `--text-disabled` | `#a3a3a3` | `#545d68` |
| **Viền** | `--border-base` | `#d4d4d4` | `#3d444d` |
| **Accent (link, button)** | `--accent-primary` | `#0969da` | `#58a6ff` |
| **Success** | `--success-primary` | `#1a7f37` | `#3fb950` |
| **Danger** | `--danger-primary` | `#cf222e` | `#f85149` |
| **Warning** | `--warning-primary` | `#ca8a04` | `#d29922` |
| **Code block** | `--code-block-bg` | `#2d333b` | `#1a1d23` |
| **Input bg** | `--gray-100` | `#f3f4f6` | `#22272e` |

### Nếu dùng Tailwind (các class đã được map):

| Class | Ý nghĩa |
|---|---|
| `bg-th-page` | Background trang |
| `bg-th-card` | Background card |
| `bg-th-input` | Background input |
| `text-heading` | Text tiêu đề |
| `text-body` | Text nội dung |
| `text-muted` | Text mờ |
| `border-bd` | Border mặc định |
| `border-bd-strong` | Border đậm |

### Sử dụng useTheme hook

```tsx
import { useTheme } from '../../contexts/ThemeContext'

const MyComponent = () => {
  const { theme, toggleTheme } = useTheme()
  // theme = 'light' | 'dark'
  // toggleTheme() để đổi
}
```

### Thêm variable mới

Nếu cần thêm variable, **phải thêm cả 2 chỗ** trong `src/theme.css`:

```css
/* 1. Thêm vào :root (light mode) */
:root {
  --my-new-color: #somelight;
}

/* 2. Thêm vào [data-theme="dark"] */
[data-theme="dark"] {
  --my-new-color: #somedark;
}
```

---

## 🌐 PHẦN 2: Đa ngôn ngữ (i18n)

### Nguyên tắc: KHÔNG BAO GIỜ hardcode text hiển thị

```tsx
// ❌ SAI
<h1>Quick Actions</h1>
<button>Create Goal</button>

// ✅ ĐÚNG
<h1>{t('dashboard.quickActions')}</h1>
<button>{t('dashboard.createGoal')}</button>
```

### Bước 1: Import useTranslation

```tsx
import { useTranslation } from 'react-i18next'

const MyPage = () => {
  const { t } = useTranslation('student')         // namespace chính
  const { t: tc } = useTranslation('common')       // nếu cần dùng common

  return <h1>{t('mySection.title')}</h1>
}
```

### Bước 2: Thêm keys vào JSON

Thêm keys vào **CẢ HAI** file `vi/` và `en/`:

```json
// src/locales/vi/student.json
{
  "myNewFeature": {
    "title": "Tiêu đề mới",
    "description": "Mô tả bằng tiếng Việt",
    "save": "Lưu",
    "cancel": "Hủy"
  }
}

// src/locales/en/student.json
{
  "myNewFeature": {
    "title": "New Title",
    "description": "Description in English",
    "save": "Save",
    "cancel": "Cancel"
  }
}
```

### Bước 3: Dùng biến động (interpolation)

```json
// JSON
{ "welcome": "Xin chào, {{name}}" }
{ "chapters": "{{count}} chương" }
```

```tsx
// TSX
t('welcome', { name: 'Minh' })     // → "Xin chào, Minh"
t('chapters', { count: 5 })         // → "5 chương"
```

### Namespace nào cho page nào?

| Namespace | Dùng cho |
|---|---|
| `common` | Sidebar, footer, header, actions chung, pagination |
| `auth` | Login, Register, ForgotPassword, VerifyOtp, ChangePassword |
| `home` | Trang chủ (public) |
| `student` | Student dashboard, overview, goals, plans, myPlans, profile |
| `mentor` | Mentor dashboard, subjects, classes, students |
| `admin` | Admin dashboard, users, reports, apiKey |

### Thêm namespace mới (nếu cần)

Nếu tạo namespace mới (vd: `quiz`), phải update `src/i18n.ts`:

```ts
// 1. Import files
import viQuiz from './locales/vi/quiz.json'
import enQuiz from './locales/en/quiz.json'

// 2. Thêm vào resources
resources: {
  vi: { ..., quiz: viQuiz },
  en: { ..., quiz: enQuiz },
}
```

---

## 🔧 PHẦN 3: Sidebar

### ⚠️ LUÔN dùng hook version, KHÔNG dùng function version

```tsx
// ❌ SAI — text cứng, không đổi ngôn ngữ
import { getStudentSidebarConfig } from '../components/StudentSideBar'
navItems: getStudentSidebarConfig()

// ✅ ĐÚNG — dùng hook có i18n
import { useStudentSidebarConfig } from '../components/StudentSideBar'
navItems: useStudentSidebarConfig()
```

| Role | Hook |
|---|---|
| Student | `useStudentSidebarConfig()` |
| Mentor | `useMentorSidebarConfig()` |
| Admin | `useAdminSidebarConfig()` |

### ⚠️ CẢNH BÁO: Rules of Hooks

```tsx
// ❌ CRASH APP — Hook bên trong useMemo/useCallback
const sidebarConfig = useMemo(() => ({
  navItems: useAdminSidebarConfig(),  // ← CRASH!
}), [])

// ✅ ĐÚNG — Hook ở top level
const adminNavItems = useAdminSidebarConfig()
const sidebarConfig = {
  navItems: adminNavItems,
}
```

---

## 📝 PHẦN 4: Template tạo trang mới

### Template cho 1 trang Student mới

```tsx
import React from 'react'
import Layout from '../../../../components/Layout'
import { useStudentSidebarConfig } from '../components/StudentSideBar'
import { LogOut, Save } from 'lucide-react'
import useAuthStore from '../../../../store/useAuthStore'
import { useNavigate } from 'react-router-dom'
import ROUTER from '../../../../router/ROUTER'
import { useTranslation } from 'react-i18next'

const MyNewPage: React.FC = () => {
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const { t } = useTranslation('student')
  const { t: tc } = useTranslation('common')

  const handleLogout = async () => { await logout(); navigate(ROUTER.LOGIN) }

  // ✅ Hook ở top level
  const navItems = useStudentSidebarConfig()
  const sidebarConfig = {
    navItems,
    actions: [{ label: tc('sidebar.logout'), icon: <LogOut className="w-5 h-5" />, onClick: handleLogout, variant: 'danger' as const }],
    brand: { name: 'My Feature', subtitle: 'Learning' },
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div style={{
        padding: 32,
        background: 'var(--bg-main)',       /* ✅ CSS variable */
        minHeight: '100vh',
      }}>
        {/* ✅ Dùng t() cho text */}
        <h1 style={{ color: 'var(--text-primary)' }}>
          {t('myNewFeature.title')}
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {t('myNewFeature.description')}
        </p>
        <button style={{
          background: 'var(--accent-primary)',  /* ✅ CSS variable */
          color: 'var(--bg-surface)',
          border: 'none',
          padding: '8px 16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <Save size={16} />
          {t('myNewFeature.save')}
        </button>
      </div>
    </Layout>
  )
}

export default MyNewPage
```

---

## ✅ Checklist khi tạo feature mới

- [ ] Dùng `var(--css-variable)` cho tất cả màu sắc (không hardcode `#fff`, `blue`, v.v.)
- [ ] Import `useTranslation` và dùng `t('key')` cho tất cả text hiển thị
- [ ] **Giao diện sạch sẽ**: Tránh lạm dụng các ký tự dạng terminal (`//`, `>_`, `{...}`, `/*`, `*/`, `$`, `./`) trong code hoặc text hiển thị.
- [ ] Dùng icon (`lucide-react`) cho các menu phức tạp như Sidebar, nhưng giữ sự tối giản cho Header/Footer (không thêm icon thừa, và ẩn các menu điều hướng nếu user chưa đăng nhập).
- [ ] Thêm translation keys vào **cả** `vi/*.json` và `en/*.json`
- [ ] Sidebar dùng `useXSidebarConfig()` hook (không dùng `getXSidebarConfig()`)
- [ ] Hook gọi ở **top level** component (không gọi trong `useMemo`, `useCallback`, `if`, `for`)
- [ ] Nếu tạo namespace mới → update `src/i18n.ts`
- [ ] Nếu cần màu mới → thêm CSS variable vào **cả** `:root` và `[data-theme="dark"]` trong `theme.css`
- [ ] Test bằng cách: đổi ngôn ngữ + đổi theme → UI phải hiển thị đúng

---

## 🐛 Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách fix |
|---|---|---|
| Trang trắng (white screen) | Hook gọi trong `useMemo`/`useCallback` | Chuyển hook ra top level |
| Text không đổi ngôn ngữ | Dùng `getXSidebarConfig()` | Đổi sang `useXSidebarConfig()` |
| Text hiện key thay vì nội dung | Thiếu key trong JSON hoặc sai namespace | Kiểm tra JSON + namespace |
| Màu không đổi theo theme | Hardcode màu trong style | Dùng `var(--tên-variable)` |
| Lỗi build khi thêm namespace | Chưa import vào `i18n.ts` | Thêm import + resources |
