'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.register(form)
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-tribal">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🔥</div>
          <h1 className="text-3xl font-bold text-tribal-300 tracking-wide">SURVIVOR</h1>
          <p className="text-tribal-500 text-sm mt-1">Outwit. Outplay. Outlast.</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-tribal-200 mb-6">Create Account</h2>

          {success ? (
            <div className="text-center space-y-4">
              <div className="text-4xl">⏳</div>
              <p className="text-tribal-200 font-medium">Registration submitted!</p>
              <p className="text-tribal-500 text-sm">
                Your account is pending admin approval. You will be able to log in once approved.
              </p>
              <Link href="/login" className="btn-primary inline-block">Back to Login</Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-tribal-400 text-sm block mb-1">Username</label>
                  <input className="input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="Choose a username" required />
                </div>
                <div>
                  <label className="text-tribal-400 text-sm block mb-1">Email</label>
                  <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" required />
                </div>
                <div>
                  <label className="text-tribal-400 text-sm block mb-1">Password</label>
                  <input type="password" className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 characters" minLength={8} required />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                  {loading ? 'Registering...' : 'Register'}
                </button>
              </form>
              <p className="text-center text-tribal-500 text-sm mt-6">
                Already have an account?{' '}
                <Link href="/login" className="text-tribal-300 hover:text-tribal-200">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
