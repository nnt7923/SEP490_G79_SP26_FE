import React from 'react'
import { Rocket, Trophy } from 'lucide-react'


const Stat: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div className="stat">
    <div className="stat__value">{value}</div>
    <div className="stat__label">{label}</div>
  </div>
)

const Home: React.FC = () => {
  return (
    <div className="page">
      <section className="hero">
        <div className="hero__content">
          <h1 className="hero__title">
            Learn a <span className="highlight">New Skill</span>
            <br />Everyday, Anytime,
            <br />and Anywhere.
          </h1>
          <p className="hero__subtitle">
            1000+ Courses covering all tech domains for you to learn and explore new opportunities.
            Learn from Industry Experts and land your Dream Job.
          </p>
          <div className="hero__actions">
            <a className="btn btn-primary">Start Trial</a>
            <a className="btn btn-outline">How it Works</a>
          </div>

          <div className="hero__stats">
            <Stat value="1000+" label="Courses to choose from" />
            <Stat value="5000+" label="Students Trained" />
            <Stat value="200+" label="Professional Trainers" />
          </div>
        </div>
        <div className="hero__visual">
          <div className="decor decor--purple" />
          <div className="decor decor--yellow" />
          <div className="decor decor--ring" />
          <div className="floating floating--rocket">
            <img src="/assets/rocket.png" alt="rocket" onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }} />
            <Rocket size={120} color="#2f80ed" />
          </div>
          <div className="floating floating--trophy">
            <img src="/assets/trophy.png" alt="trophy" onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }} />
            <Trophy size={120} color="#f59e0b" />
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home