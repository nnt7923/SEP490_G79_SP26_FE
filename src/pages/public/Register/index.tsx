import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'


const schema = z
  .object({
    name: z.string().min(2, 'Your name'),
    email: z.string().email('Valid email is required'),
    password: z.string().min(6, 'At least 6 characters'),
    confirm: z.string(),
    accept: z.boolean().refine((v) => v, 'Please accept terms'),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords don't match",
    path: ['confirm'],
  })

type FormValues = z.infer<typeof schema>

const Register: React.FC = () => {
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { accept: true },
  })

  const onSubmit = async (data: FormValues) => {
    await new Promise((r) => setTimeout(r, 400))
    alert('Account created successfully (mock)')
    navigate('/login')
  }

  return (
    <div className="page">
      <section className="auth">
        <div className="auth__card">
          <h2 className="auth__title">Create your account</h2>
          <p className="auth__subtitle">Join Pro-Skills and start learning</p>

          <form onSubmit={handleSubmit(onSubmit)} className="form">
            <label className="form__label">Full Name</label>
            <input className="form__input" type="text" placeholder="Jane Doe" {...register('name')} />
            {errors.name && <div className="form__error">{errors.name.message}</div>}

            <label className="form__label">Email</label>
            <input className="form__input" type="email" placeholder="you@example.com" {...register('email')} />
            {errors.email && <div className="form__error">{errors.email.message}</div>}

            <label className="form__label">Password</label>
            <input className="form__input" type="password" placeholder="At least 6 characters" {...register('password')} />
            {errors.password && <div className="form__error">{errors.password.message}</div>}

            <label className="form__label">Confirm Password</label>
            <input className="form__input" type="password" placeholder="Repeat password" {...register('confirm')} />
            {errors.confirm && <div className="form__error">{errors.confirm.message}</div>}

            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" {...register('accept')} />
              <span>I agree to the Terms and Privacy Policy</span>
            </label>
            {errors.accept && <div className="form__error">{errors.accept.message}</div>}

            <button className="btn btn-primary auth__submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Creating...' : 'Sign Up'}
            </button>
          </form>

          <div className="auth__links">
            <span>Already have an account?</span>
            <Link to="/login">Login</Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Register