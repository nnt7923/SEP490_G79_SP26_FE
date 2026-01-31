import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useSearchParams } from 'react-router-dom'

const schema = z
  .object({
    password: z.string().min(6, 'At least 6 characters'),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords don't match",
    path: ['confirm'],
  })

type FormValues = z.infer<typeof schema>

const ResetPassword: React.FC = () => {
  const [params] = useSearchParams()
  const token = params.get('token')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (_: FormValues) => {
    await new Promise((r) => setTimeout(r, 400))
    alert('Password reset successful (mock)')
  }

  return (
    <div className="page">
      <section className="auth">
        <div className="auth__card">
          <h2 className="auth__title">Reset your password</h2>
          <p className="auth__subtitle">Token: {token ? token : 'not provided'}</p>

          <form onSubmit={handleSubmit(onSubmit)} className="form">
            <label className="form__label">New Password</label>
            <input className="form__input" type="password" placeholder="At least 6 characters" {...register('password')} />
            {errors.password && <div className="form__error">{errors.password.message}</div>}

            <label className="form__label">Confirm Password</label>
            <input className="form__input" type="password" placeholder="Repeat password" {...register('confirm')} />
            {errors.confirm && <div className="form__error">{errors.confirm.message}</div>}

            <button className="btn btn-primary auth__submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
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

export default ResetPassword