'use client'
import { GamePlayer } from '@/types'

interface Props {
  player: GamePlayer
  isCurrentUser?: boolean
  selectable?: boolean
  selected?: boolean
  onSelect?: (id: number) => void
  disabled?: boolean
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  active:     { label: 'Active',     cls: 'badge-active' },
  captain:    { label: 'Captain',    cls: 'badge-captain' },
  immune:     { label: 'Immune',     cls: 'badge-immune' },
  eliminated: { label: 'Eliminated', cls: 'badge-eliminated' },
}

export default function PlayerCard({ player, isCurrentUser, selectable, selected, onSelect, disabled }: Props) {
  const cfg = statusConfig[player.status] || statusConfig.active
  const initials = player.username.slice(0, 2).toUpperCase()

  const handleClick = () => {
    if (selectable && !disabled && onSelect) onSelect(player.user_id)
  }

  return (
    <div
      onClick={handleClick}
      className={[
        'card flex items-center gap-3 transition-all duration-200',
        selectable && !disabled ? 'cursor-pointer hover:border-tribal-500' : '',
        selected ? 'border-tribal-400 bg-tribal-950/30' : '',
        player.status === 'eliminated' ? 'opacity-50' : '',
        disabled && selectable ? 'opacity-40 cursor-not-allowed' : '',
      ].join(' ')}
    >
      <div className={[
        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
        selected ? 'bg-tribal-600 text-white' : 'bg-dark-muted text-tribal-300',
      ].join(' ')}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-tribal-100 truncate">{player.username}</span>
          {isCurrentUser && <span className="text-xs text-tribal-500">(you)</span>}
        </div>
        <span className={cfg.cls}>{cfg.label}</span>
      </div>
      {selected && (
        <div className="text-tribal-400 flex-shrink-0">✓</div>
      )}
    </div>
  )
}
