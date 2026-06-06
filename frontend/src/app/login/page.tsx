'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authApi.login(form)
      const { access_token, user } = res.data
      login(access_token, user)
      if (user.role === 'admin') router.replace('/admin')
      else router.replace('/game')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-tribal">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🔥</div>
          <h1 className="text-3xl font-bold text-tribal-300 tracking-wide">SURVIVOR</h1>
          <p className="text-tribal-500 text-sm mt-1">Outwit. Outplay. Outlast.</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-tribal-200 mb-6">Sign In</h2>
          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-tribal-400 text-sm block mb-1">Username</label>
              <input
                className="input"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="Enter username"
                required
              />
            </div>
            <div>
              <label className="text-tribal-400 text-sm block mb-1">Password</label>
              <input
                type="password"
                className="input"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Enter password"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-tribal-500 text-sm mt-6">
            No account?{' '}
            <Link href="/register" className="text-tribal-300 hover:text-tribal-200">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
