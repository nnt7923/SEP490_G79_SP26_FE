import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Code2, Terminal, Zap, Users, Award, TrendingUp, ArrowRight, Star, CheckCircle2 } from 'lucide-react'
import GroupImg from '../../../assets/img-code.png'
import LanguageOrbit from '../../../components/Icons/Orbit'
import useAuthStore from '../../../store/useAuthStore'
import ROUTER from '../../../router/ROUTER'

const Stat: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div className="stat">
    <div className="stat__value">{value}</div>
    <div className="stat__label">{label}</div>
  </div>
)

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({
  icon,
  title,
  description,
}) => (
  <div className="feature-card">
    <div className="feature-card__icon">{icon}</div>
    <h3 className="feature-card__title">{title}</h3>
    <p className="feature-card__description">{description}</p>
  </div>
)

const CourseCard: React.FC<{ level: string; title: string; students: number; rating: number }> = ({
  level,
  title,
  students,
  rating,
}) => (
  <div className="course-card">
    <div className="course-card__header">
      <span className={`course-badge course-badge--${level.toLowerCase()}`}>{level}</span>
      <div className="rating-badge">
        <div className="rating-stars">
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={12} className={i < rating ? 'filled' : 'empty'} />
          ))}
        </div>
        <span className="rating-value">{rating.toFixed(1)}</span>
      </div>
    </div>
    <h4 className="course-card__title">{title}</h4>
    <div className="course-card__stats">
      <div className="stat-item">
        <Users size={14} />
        <span>{students.toLocaleString()}</span>
      </div>
    </div>
  </div>
)

const TestimonialCard: React.FC<{ name: string; role: string; text: string; avatar: string }> = ({
  name,
  role,
  text,
  avatar,
}) => (
  <div className="testimonial-card">
    <div className="testimonial-header">
      <div className="rating-stars-row">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={14} className="filled" />
        ))}
      </div>
      <span className="verified-badge">★ Verified</span>
    </div>
    <p className="testimonial-text">
      "{text}"</p>
    <div className="testimonial-author">
      <div className="author-avatar-large">{avatar}</div>
      <div className="author-details">
        <div className="author-name">{name}</div>
        <div className="author-role">{role}</div>
      </div>
    </div>
  </div>
)

const Home: React.FC = () => {
  const navigate = useNavigate()
  const { token, user } = useAuthStore()

  useEffect(() => {
    // Auto redirect if user is already logged in
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

  return (
    <div className="page">
      {/* ========== HERO SECTION ========== */}
      <section className="hero">
        <div className="hero__content">
          <div className="hero__badge">🚀 Launch Your Tech Career</div>
          <h1 className="hero__title">
            Master <span className="highlight">Modern Programming</span>
            <br />and Land Your Dream Job
          </h1>
          <p className="hero__subtitle">
            Learn from industry experts with 1000+ hands-on courses. Get mentored, build real projects, and join 5000+ 
            successful graduates now earning at top tech companies.
          </p>
          <div className="hero__actions">
            <a href="#" className="btn btn-primary">
              Start Free Trial <ArrowRight size={16} />
            </a>
            <a href="#" className="btn btn-outline">
              Explore Courses
            </a>
          </div>

          <div className="hero__stats">
            <Stat value="1000+" label="Courses" />
            <Stat value="5000+" label="Students" />
            <Stat value="200+" label="Experts" />
          </div>
        </div>
        <div className="hero__visual">
          <div className="decor decor--purple" />
          <div className="decor decor--yellow" />
          <div className="decor decor--ring" />
          <div className="decor decor--dot" />

          <div className="floating floating--rocket">
            <Code2 size={120} color="#2f80ed" />
          </div>
          <div className="floating floating--trophy">
            <Terminal size={120} color="#f59e0b" />
          </div>

          <div className="hero-circle">
            <img
              src={GroupImg}
              alt="coding students collaborating"
              className="hero-circle__img"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>
          <LanguageOrbit />
        </div>
      </section>

      {/* ========== FEATURES SECTION ========== */}
      <section className="features-section">
        <div className="features-container">
          <div className="section-header">
            <h2>Why Choose Our Platform?</h2>
            <p>Everything you need to become a professional developer</p>
          </div>

          <div className="features-grid">
            <FeatureCard
              icon={<Users size={32} />}
              title="Learn from Experts"
              description="Get mentored by developers from Google, Meta, Microsoft, and more"
            />
            <FeatureCard
              icon={<Code2 size={32} />}
              title="Real-World Projects"
              description="Build portfolio projects you can showcase to employers"
            />
            <FeatureCard
              icon={<TrendingUp size={32} />}
              title="Career Growth"
              description="Job-ready curriculum designed by industry professionals"
            />
            <FeatureCard
              icon={<Award size={32} />}
              title="Certifications"
              description="Get recognized certificates upon course completion"
            />
            <FeatureCard
              icon={<Zap size={32} />}
              title="Fast Learning"
              description="Structured paths designed to learn 3x faster than traditional courses"
            />
            <FeatureCard
              icon={<Terminal size={32} />}
              title="Live Coding Sessions"
              description="Weekly live sessions and 1-on-1 mentoring with instructors"
            />
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS SECTION ========== */}
      <section className="courses-section">
        <div className="courses-container">
          <div className="section-header">
            <h2>How It Works</h2>
            <p>Create your personalized learning path in 4 simple steps</p>
          </div>

          <div className="how-it-works-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-icon">🧩</div>
              <h3 className="step-title">Choose Programming Language</h3>
              <p className="step-description">Select the programming language you want to learn from our curated list</p>
            </div>

            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-icon">📍</div>
              <h3 className="step-title">Choose Your Goal</h3>
              <p className="step-description">Pick a learning goal that matches your career aspirations</p>
            </div>

            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-icon">🎯</div>
              <h3 className="step-title">Choose Level</h3>
              <p className="step-description">Select your current skill level: Beginner, Intermediate, or Advanced</p>
            </div>

            <div className="step-card">
              <div className="step-number">4</div>
              <div className="step-icon">🛠️</div>
              <h3 className="step-title">Generate Learning Path</h3>
              <p className="step-description">Get your personalized learning path with AI-powered recommendations</p>
            </div>
          </div>

          <div className="courses-footer">
            <button type="button" className="btn btn-primary" onClick={() => navigate(ROUTER.PLANS)}>
              Start Your Journey <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
