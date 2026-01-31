import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'

const schema = z.object({ email: z.string().email('Valid email is required') })

type FormValues = z.infer<typeof schema>

const ForgotPassword: React.FC = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormValues) => {
    await new Promise((r) => setTimeout(r, 400))
    alert(`Reset link sent to ${data.email} (mock)`) // will be API later
  }

  return (
    <div className="page">
      <section className="auth">
        <div className="auth__card">
          <h2 className="auth__title">Forgot password?</h2>
          <p className="auth__subtitle">Enter your email to receive a reset link</p>

          <form onSubmit={handleSubmit(onSubmit)} className="form">
            <label className="form__label">Email</label>
            <input className="form__input" type="email" placeholder="you@example.com" {...register('email')} />
            {errors.email && <div className="form__error">{errors.email.message}</div>}

            <button className="btn btn-primary auth__submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="auth__links">
            <Link to="/login">Back to Login</Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default ForgotPassword