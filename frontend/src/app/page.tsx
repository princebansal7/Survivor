'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/login'); return }
    if (user.role === 'admin') { router.replace('/admin'); return }
    router.replace('/game')
  }, [user, loading, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-torch rounded-full border-t-transparent animate-spin" />
        <p className="text-tribal-400 text-sm">Loading Survivor...</p>
      </div>
    </div>
  )
}
