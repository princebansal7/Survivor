'use client'
import { useAuth } from '@/contexts/AuthContext'
import { Game } from '@/types'
import Link from 'next/link'

interface Props {
  game: Game | null
}

export default function GameHeader({ game }: Props) {
  const { user, logout } = useAuth()

  return (
    <header className="border-b border-dark-border bg-dark-card">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔥</span>
          <div>
            <h1 className="text-tribal-300 font-bold leading-tight">SURVIVOR</h1>
            {game && (
              <p className="text-tribal-600 text-xs">{game.name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {game && (
            <div className="hidden sm:flex items-center gap-3 text-xs text-tribal-500">
              <span>{game.active_player_count} active</span>
              <span>·</span>
              <span>{game.player_count - game.active_player_count} eliminated</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-tribal-300 text-sm font-medium">{user?.username}</p>
              <p className="text-tribal-600 text-xs capitalize">{user?.role}</p>
            </div>
            {user?.role === 'admin' && (
              <Link href="/admin" className="btn-secondary text-xs py-1 px-3">Admin</Link>
            )}
            <button onClick={logout} className="text-tribal-600 hover:text-tribal-400 text-sm">
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
