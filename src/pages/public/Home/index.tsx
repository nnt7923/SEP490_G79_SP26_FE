import React, { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import useAuthStore from '../../../store/useAuthStore'
import ROUTER from '../../../router/ROUTER'

/* ─── Shared sub-components ─── */

const FeatureCard: React.FC<{
  prefix: string
  title: string
  description: string
  accent?: string
}> = ({ prefix, title, description, accent }) => (
  <div
    style={{
      padding: 20,
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-base)',
      borderRadius: 2,
      transition: 'border-color 0.2s ease',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      cursor: 'default',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = accent || 'var(--accent-primary)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'var(--border-base)'
    }}
  >
    <span
      style={{
        fontSize: 12,
        color: accent || 'var(--accent-primary)',
        fontWeight: 600,
      }}
    >
      {prefix}
    </span>
    <h3
      style={{
        fontSize: 14,
        fontWeight: 700,
        color: 'var(--text-primary)',
        margin: 0,
      }}
    >
      {title}
    </h3>
    <p
      style={{
        color: 'var(--text-secondary)',
        fontSize: 13,
        margin: 0,
        lineHeight: 1.6,
      }}
    >
      {description}
    </p>
  </div>
)

/* ─── Main component ─── */

const Home: React.FC = () => {
  const navigate = useNavigate()
  const { token, user } = useAuthStore()

  useEffect(() => {
    if (token && user) {
      const roleName = String((user as any)?.role?.name || '').toLowerCase()
      if (roleName === 'admin') {
        navigate(ROUTER.ADMIN_DASHBOARD, { replace: true })
      } else if (roleName === 'mentor') {
        navigate(ROUTER.MENTOR_DASHBOARD, { replace: true })
      } else if (roleName === 'student') {
        navigate(ROUTER.STUDENT_OVERVIEW, { replace: true })
      }
    }
  }, [token, user, navigate])

  // Terminal code for hero — shows what the platform does
  const heroCode = [
    { num: 1, content: '// CodeNexus — Learning Support', color: '#8b949e' },
    { num: 2, content: '', color: '' },
    { num: 3, content: 'const myPlan = CodeNexus.createPlan({', color: '#e6edf3' },
    { num: 4, content: '  language: "JavaScript",', color: '#79c0ff' },
    { num: 5, content: '  goal: "Full-stack Developer",', color: '#79c0ff' },
    { num: 6, content: '  level: "Intermediate",', color: '#79c0ff' },
    { num: 7, content: '});', color: '#e6edf3' },
    { num: 8, content: '', color: '' },
    { num: 9, content: 'myPlan.generateLessons();', color: '#e6edf3' },
    { num: 10, content: 'myPlan.trackProgress();', color: '#e6edf3' },
    { num: 11, content: '', color: '' },
    { num: 12, content: '// → 12 chapters generated', color: '#3fb950' },
    { num: 13, content: '// → Progress: 3/12 completed', color: '#3fb950' },
  ]

  return (
    <div className="page">
      {/* ========== HERO SECTION ========== */}
      <section
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '48px 20px 60px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 40,
          alignItems: 'center',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--bg-blue-hover)',
              border: '1px solid var(--border-base)',
              borderRadius: 2,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--accent-primary)',
              marginBottom: 16,
            }}
          >
            {'>'} AI-Powered Learning Platform
          </div>
          <h1
            style={{
              fontSize: 28,
              lineHeight: 1.35,
              color: 'var(--text-primary)',
              margin: '0 0 12px',
              fontWeight: 700,
            }}
          >
            Tạo lộ trình học{' '}
            <span style={{ color: 'var(--accent-primary)' }}>lập trình</span>
            <br />
            được cá nhân hóa bởi AI
          </h1>
          <p
            style={{
              color: 'var(--text-secondary)',
              marginBottom: 24,
              maxWidth: 480,
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            // Chọn ngôn ngữ, đặt mục tiêu, AI tự động tạo learning path.
            <br />
            // Theo dõi tiến độ, ôn tập bài học, hoàn thiện kỹ năng.
          </p>
          <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate(ROUTER.PLANS)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {'>'} Tạo Learning Plan <ArrowRight size={14} />
            </button>
            <Link
              to="/register"
              className="btn btn-outline"
            >
              Đăng ký miễn phí
            </Link>
          </div>
        </div>

        {/* Terminal panel */}
        <div
          style={{
            border: '1px solid var(--border-base)',
            borderRadius: 2,
            background: 'var(--code-block-bg)',
            overflow: 'hidden',
          }}
        >
          {/* Title bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              background: 'var(--terminal-bg)',
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'var(--terminal-btn-red)',
              }}
            />
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'var(--terminal-btn-yellow)',
              }}
            />
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'var(--terminal-btn-green)',
              }}
            />
            <span
              style={{
                marginLeft: 12,
                fontSize: 11,
                color: '#8b949e',
              }}
            >
              learning-plan.js — CodeNexus
            </span>
          </div>
          {/* Code content */}
          <div style={{ padding: '16px 0' }}>
            {heroCode.map((line) => (
              <div
                key={line.num}
                style={{
                  display: 'flex',
                  padding: '1px 14px',
                  lineHeight: '22px',
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    width: 32,
                    textAlign: 'right',
                    color: '#484f58',
                    userSelect: 'none',
                    paddingRight: 16,
                    flexShrink: 0,
                  }}
                >
                  {line.num}
                </span>
                <span style={{ color: line.color || 'transparent' }}>
                  {line.content || '\u00A0'}
                </span>
              </div>
            ))}
          </div>
          {/* Terminal prompt */}
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.1)',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--terminal-bg)',
            }}
          >
            <span style={{ color: '#3fb950', fontSize: 13 }}>➜</span>
            <span style={{ color: '#79c0ff', fontSize: 13 }}>codenexus</span>
            <span style={{ color: '#484f58', fontSize: 13 }}>
              git:(main)
            </span>
            <span
              style={{
                display: 'inline-block',
                width: 7,
                height: 14,
                background: '#e6edf3',
                animation: 'blink 1s step-end infinite',
              }}
            />
          </div>
        </div>
      </section>

      {/* ========== PLATFORM FEATURES ========== */}
      <section
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '48px 20px',
          borderTop: '1px solid var(--border-base)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 8px',
            }}
          >
            // Nền tảng hỗ trợ bạn học gì?
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            Mọi thứ bạn cần để xây dựng lộ trình học lập trình hiệu quả
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          <FeatureCard
            prefix="[plan]"
            title="Tạo Learning Plan"
            description="Chọn ngôn ngữ lập trình, đặt mục tiêu và AI sẽ tạo lộ trình học phù hợp với trình độ của bạn."
          />
          <FeatureCard
            prefix="[goal]"
            title="Đặt mục tiêu học tập"
            description="Thiết lập goal cụ thể: Frontend, Backend, Full-stack, Mobile,... và theo dõi quá trình đạt được."
            accent="var(--success-primary)"
          />
          <FeatureCard
            prefix="[track]"
            title="Theo dõi tiến độ"
            description="Xem progress qua từng chapter, bài học. Dashboard cá nhân hiển thị tổng quan quá trình học."
            accent="var(--warning-primary)"
          />
          <FeatureCard
            prefix="[lesson]"
            title="Bài học có nội dung chi tiết"
            description="Mỗi bài học gồm lý thuyết, code examples, common mistakes, và bài tập thực hành."
          />
          <FeatureCard
            prefix="[ai]"
            title="AI tạo nội dung"
            description="Nội dung bài học được AI generate dựa trên mục tiêu và trình độ, đảm bảo phù hợp nhất."
            accent="var(--success-primary)"
          />
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '48px 20px',
          borderTop: '1px solid var(--border-base)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 8px',
            }}
          >
            // Cách sử dụng
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            4 bước để bắt đầu lộ trình học lập trình của bạn
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          {[
            {
              step: 1,
              icon: '01',
              title: 'Chọn ngôn ngữ',
              desc: 'JavaScript, Python, Java, C#, Go,... chọn ngôn ngữ bạn muốn học hoặc nâng cao.',
            },
            {
              step: 2,
              icon: '02',
              title: 'Đặt mục tiêu',
              desc: 'Frontend, Backend, Full-stack, Data Science,... xác định hướng đi rõ ràng.',
            },
            {
              step: 3,
              icon: '03',
              title: 'Chọn trình độ',
              desc: 'Beginner, Intermediate, Advanced — AI điều chỉnh nội dung theo level của bạn.',
            },
            {
              step: 4,
              icon: '04',
              title: 'Học theo lộ trình',
              desc: 'AI tạo chapters → lessons → code examples. Theo dõi progress trên dashboard.',
            },
          ].map((item) => (
            <div
              key={item.step}
              style={{
                padding: 20,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-base)',
                borderRadius: 2,
                transition: 'border-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-base)'
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: 'var(--border-base)',
                  marginBottom: 12,
                  fontFamily: 'inherit',
                }}
              >
                {item.icon}
              </div>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: '0 0 8px',
                }}
              >
                {item.title}
              </h3>
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate(ROUTER.PLANS)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {'>'} Bắt đầu học ngay <ArrowRight size={14} />
          </button>
        </div>
      </section>

      {/* ========== ROLES SECTION ========== */}
      <section
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '48px 20px 64px',
          borderTop: '1px solid var(--border-base)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 8px',
            }}
          >
            // Dành cho ai?
          </h2>
        </div>

        <div
          style={{
            maxWidth: 500,
            margin: '0 auto',
          }}
        >
          <div
            style={{
              padding: 24,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-base)',
              borderRadius: 2,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--accent-primary)',
                marginBottom: 8,
              }}
            >
              {'>'} Cá nhân hóa trải nghiệm
            </div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: '0 0 12px',
              }}
            >
              Phát triển kỹ năng lập trình cùng CodeNexus
            </h3>
            <ul
              style={{
                margin: 0,
                padding: '0 0 0 16px',
                color: 'var(--text-secondary)',
                fontSize: 13,
                lineHeight: 2,
              }}
            >
              <li>Tạo và quản lý lộ trình học tập cá nhân</li>
              <li>Tổng hợp tài nguyên học lập trình thực tế</li>
              <li>Công cụ theo dõi tiến độ và dashboard trực quan</li>
              <li>Hệ thống tài nguyên và bài thực hành phong phú</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
