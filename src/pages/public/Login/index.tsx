import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../../../hook/useAuth'
import { Link, useNavigate } from 'react-router-dom'

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

const Login: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormValues) => {
    try {
      await login(data.username, data.password)
      navigate('/')
    } catch (e: any) {
      alert(e.message || 'Login failed')
    }
  }

  return (
    <div className="page">
      <section className="auth">
        <div className="auth__card">
          <h2 className="auth__title">Welcome back</h2>
          <p className="auth__subtitle">Login to continue learning</p>

          <form onSubmit={handleSubmit(onSubmit)} className="form">
            <label className="form__label">Username</label>
            <input className="form__input" type="text" placeholder="e.g. user" {...register('username')} />
            {errors.username && <div className="form__error">{errors.username.message}</div>}

            <label className="form__label">Password</label>
            <input className="form__input" type="password" placeholder="Your password" {...register('password')} />
            {errors.password && <div className="form__error">{errors.password.message}</div>}

            <button className="btn btn-primary auth__submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="auth__links">
            <Link to="/forgot-password">Forgot password?</Link>
            <span>•</span>
            <Link to="/register">Create account</Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Login