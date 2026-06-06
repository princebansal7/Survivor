'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { adminApi, gameApi } from '@/lib/api'
import { User, Game, GamePlayer, Round, VoteResults } from '@/types'
import Link from 'next/link'

type AdminTab = 'users' | 'game' | 'round' | 'results'

const ELIM_LOCKED_STATES = ['elimination_voting_open', 'elimination_voting_closed', 'tie_breaker', 'completed']

export default function AdminPage() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()
  const qc = useQueryClient()
  const [elimTarget, setElimTarget] = useState<number | null>(null)
  const [tab, setTab] = useState<AdminTab>('users')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) router.replace('/')
  }, [user, authLoading, router])

  const notify = (m: string, isErr = false) => {
    if (isErr) setErr(m); else setMsg(m)
    setTimeout(() => { setMsg(''); setErr('') }, 3500)
  }

  // Data
  const { data: users = [] } = useQuery<User[]>({ queryKey: ['admin-users'], queryFn: () => adminApi.getUsers().then(r => r.data) })
  const { data: games = [] } = useQuery<Game[]>({ queryKey: ['admin-games'], queryFn: () => adminApi.getGames().then(r => r.data) })
  const { data: game } = useQuery<Game | null>({ queryKey: ['active-game'], queryFn: () => gameApi.getActive().then(r => r.data) })
  const { data: players = [] } = useQuery<GamePlayer[]>({ queryKey: ['game-players', game?.id], queryFn: () => gameApi.getPlayers(game!.id).then(r => r.data), enabled: !!game })
  const { data: round } = useQuery<Round | null>({ queryKey: ['current-round', game?.id], queryFn: () => gameApi.getCurrentRound(game!.id).then(r => r.data), enabled: !!game, refetchInterval: 8_000 })
  const { data: captainResults } = useQuery<VoteResults>({ queryKey: ['captain-results', round?.id], queryFn: () => gameApi.getResults(game!.id, round!.id, 'captain').then(r => r.data), enabled: !!round && !!game })
  const { data: elimResults } = useQuery<VoteResults>({ queryKey: ['elim-results', round?.id], queryFn: () => gameApi.getResults(game!.id, round!.id, 'elimination').then(r => r.data), enabled: !!round && !!game })

  const inv = (keys: string[][]) => keys.forEach(k => qc.invalidateQueries({ queryKey: k }))
  const wrap = async (fn: () => Promise<any>, successMsg: string) => {
    try { await fn(); notify(successMsg); inv([['admin-users'], ['admin-games'], ['active-game'], ['game-players', String(game?.id)], ['current-round', String(game?.id)], ['captain-results', String(round?.id)], ['elim-results', String(round?.id)]]) }
    catch (e: any) { notify(e.response?.data?.detail || 'Action failed', true) }
  }

  const approvedPlayers = users.filter(u => u.status === 'approved' && u.role !== 'admin')
  const pendingUsers = users.filter(u => u.status === 'pending')
  const activePlayers = players.filter(p => p.status !== 'eliminated')

  // Game creation form state
  const [newGame, setNewGame] = useState({ name: 'Survivor Season 1', captain_vote_weight: 2, votes_per_player: 3, visibility_mode: 'secret' })

  const tabs: { key: AdminTab; label: string }[] = [
    { key: 'users', label: `Users${pendingUsers.length > 0 ? ` (${pendingUsers.length} pending)` : ''}` },
    { key: 'game', label: 'Game Setup' },
    { key: 'round', label: 'Round Control' },
    { key: 'results', label: 'Vote Results' },
  ]

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-torch rounded-full border-t-transparent animate-spin" /></div>
  if (!user || user.role !== 'admin') return null

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-dark-border bg-dark-card">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔥</span>
            <div>
              <h1 className="text-tribal-300 font-bold">SURVIVOR — Admin</h1>
              {game && <p className="text-tribal-600 text-xs">{game.name} · {game.status}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/game" className="btn-secondary text-xs py-1 px-3">View Game</Link>
            <button onClick={logout} className="text-tribal-600 hover:text-tribal-400 text-sm">Sign out</button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Notifications */}
        {msg && <div className="bg-jungle-900/30 border border-jungle-700 text-jungle-300 rounded-lg px-4 py-3 mb-4 text-sm">{msg}</div>}
        {err && <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">{err}</div>}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-dark-border mb-6">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${tab === t.key ? 'text-tribal-300 border-b-2 border-torch -mb-px' : 'text-tribal-500 hover:text-tribal-400'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── USERS TAB ── */}
        {tab === 'users' && (
          <div className="space-y-6">
            {pendingUsers.length > 0 && (
              <div className="card">
                <h2 className="font-semibold text-tribal-200 mb-4">Pending Approval ({pendingUsers.length})</h2>
                <div className="space-y-2">
                  {pendingUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between gap-3 py-2 border-b border-dark-border last:border-0">
                      <div>
                        <span className="text-tribal-200 font-medium">{u.username}</span>
                        <span className="text-tribal-500 text-sm ml-2">{u.email}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => wrap(() => adminApi.approveUser(u.id, 'approved'), `${u.username} approved`)} className="btn-primary text-xs py-1">Approve</button>
                        <button onClick={() => wrap(() => adminApi.approveUser(u.id, 'rejected'), `${u.username} rejected`)} className="btn-danger text-xs py-1">Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card">
              <h2 className="font-semibold text-tribal-200 mb-4">All Users</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-tribal-500 text-xs uppercase border-b border-dark-border">
                      <th className="text-left pb-2">Username</th>
                      <th className="text-left pb-2">Email</th>
                      <th className="text-left pb-2">Role</th>
                      <th className="text-left pb-2">Status</th>
                      <th className="text-left pb-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border">
                    {users.map(u => (
                      <tr key={u.id} className="text-tribal-300">
                        <td className="py-2 font-medium">{u.username}</td>
                        <td className="py-2 text-tribal-500">{u.email}</td>
                        <td className="py-2 capitalize">{u.role}</td>
                        <td className="py-2">
                          <span className={`badge ${u.status === 'approved' ? 'badge-active' : u.status === 'pending' ? 'badge-pending' : 'badge-eliminated'}`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-2">
                          {u.id !== user.id && (
                            <div className="flex gap-1">
                              {u.status === 'pending' && <button onClick={() => wrap(() => adminApi.approveUser(u.id, 'approved'), 'Approved')} className="text-jungle-400 hover:text-jungle-300 text-xs">Approve</button>}
                              {u.role !== 'admin' && <button onClick={() => wrap(() => adminApi.updateRole(u.id, 'admin'), 'Made admin')} className="text-tribal-400 hover:text-tribal-300 text-xs ml-2">Make Admin</button>}
                              {u.role === 'admin' && <button onClick={() => wrap(() => adminApi.updateRole(u.id, 'player'), 'Role changed')} className="text-tribal-400 hover:text-tribal-300 text-xs ml-2">Make Player</button>}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── GAME SETUP TAB ── */}
        {tab === 'game' && (
          <div className="space-y-6">
            {!game && (
              <div className="card">
                <h2 className="font-semibold text-tribal-200 mb-4">Create New Game</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-tribal-400 text-sm block mb-1">Game Name</label>
                    <input className="input" value={newGame.name} onChange={e => setNewGame(g => ({ ...g, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-tribal-400 text-sm block mb-1">Votes Per Player (Elimination)</label>
                    <input type="number" min={1} max={10} className="input" value={newGame.votes_per_player} onChange={e => setNewGame(g => ({ ...g, votes_per_player: +e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-tribal-400 text-sm block mb-1">Captain Vote Weight</label>
                    <input type="number" step={0.5} min={1} max={5} className="input" value={newGame.captain_vote_weight} onChange={e => setNewGame(g => ({ ...g, captain_vote_weight: +e.target.value }))} />
                    <p className="text-tribal-600 text-xs mt-1">Captain's elimination votes count this many times</p>
                  </div>
                  <div>
                    <label className="text-tribal-400 text-sm block mb-1">Voting Visibility</label>
                    <select className="input" value={newGame.visibility_mode} onChange={e => setNewGame(g => ({ ...g, visibility_mode: e.target.value }))}>
                      <option value="secret">Secret (hidden until closed)</option>
                      <option value="live">Live (visible during voting)</option>
                    </select>
                  </div>
                </div>
                <button className="btn-primary mt-4" onClick={() => wrap(() => adminApi.createGame(newGame), 'Game created!')}>
                  Create Game
                </button>
              </div>
            )}

            {game && (
              <div className="space-y-4">
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-tribal-200">Current Game</h2>
                    <span className={`badge ${game.status === 'active' ? 'badge-active' : game.status === 'waiting' ? 'badge-pending' : 'badge-eliminated'}`}>
                      {game.status}
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm mb-4">
                    <div><span className="text-tribal-500">Name:</span> <span className="text-tribal-200">{game.name}</span></div>
                    <div><span className="text-tribal-500">Players:</span> <span className="text-tribal-200">{game.player_count} ({game.active_player_count} active)</span></div>
                    <div><span className="text-tribal-500">Votes per player:</span> <span className="text-tribal-200">{game.votes_per_player}</span></div>
                    <div><span className="text-tribal-500">Captain weight:</span> <span className="text-tribal-200">{game.captain_vote_weight}×</span></div>
                    <div><span className="text-tribal-500">Visibility:</span> <span className="text-tribal-200 capitalize">{game.visibility_mode}</span></div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {game.status === 'waiting' && (
                      <button className="btn-primary" onClick={() => wrap(() => adminApi.startGame(game.id), 'Game started!')}>Start Game</button>
                    )}
                    {game.status === 'active' && (
                      <button className="btn-danger" onClick={() => { if (confirm('End game?')) wrap(() => adminApi.endGame(game.id), 'Game ended') }}>End Game</button>
                    )}
                  </div>
                </div>

                {/* Player management */}
                <div className="card">
                  <h3 className="font-semibold text-tribal-200 mb-4">Player Roster</h3>
                  <div className="grid sm:grid-cols-2 gap-3 mb-4">
                    {players.map(p => (
                      <div key={p.id} className="flex items-center justify-between gap-2 py-1">
                        <div className="flex items-center gap-2">
                          <span className="text-tribal-200 text-sm">{p.username}</span>
                          <span className={`badge text-xs ${p.status === 'eliminated' ? 'badge-eliminated' : p.status === 'captain' ? 'badge-captain' : 'badge-active'}`}>{p.status}</span>
                        </div>
                        {game.status !== 'active' && (
                          <button onClick={() => wrap(() => adminApi.removePlayer(game.id, p.user_id), `${p.username} removed`)} className="text-red-500 hover:text-red-400 text-xs">Remove</button>
                        )}
                      </div>
                    ))}
                  </div>
                  {game.status !== 'active' && (
                    <div>
                      <p className="text-tribal-500 text-xs mb-2">Add approved players:</p>
                      <div className="flex flex-wrap gap-2">
                        {approvedPlayers.filter(u => !players.find(p => p.user_id === u.id)).map(u => (
                          <button key={u.id} onClick={() => wrap(() => adminApi.addPlayer(game.id, u.id), `${u.username} added`)} className="btn-secondary text-xs py-1 px-3">
                            + {u.username}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ROUND CONTROL TAB ── */}
        {tab === 'round' && (
          <div className="space-y-4">
            {!game || game.status !== 'active' ? (
              <div className="card text-center py-8"><p className="text-tribal-500">Game must be active to manage rounds.</p></div>
            ) : (
              <>
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-tribal-200">
                      {round ? `Round ${round.round_number}` : 'No Active Round'}
                    </h2>
                    {round && (
                      <span className="text-tribal-400 text-sm capitalize">{round.state.replace(/_/g, ' ')}</span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary text-sm" onClick={() => wrap(() => adminApi.nextRound(game.id), 'New round created')}>
                      + New Round
                    </button>
                  </div>
                </div>

                {round && (
                  <>
                    {/* State controls */}
                    <div className="card">
                      <h3 className="font-semibold text-tribal-200 mb-3">Voting Controls</h3>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <p className="text-tribal-500 text-xs uppercase tracking-wider">Captain Voting</p>
                          <div className="flex gap-2">
                            <button
                              disabled={round.state === 'captain_voting_open' || ELIM_LOCKED_STATES.includes(round.state)}
                              onClick={() => wrap(() => adminApi.openVoting(round.id, 'captain'), 'Captain voting opened')}
                              className="btn-primary text-sm flex-1 disabled:opacity-40">
                              Open
                            </button>
                            <button
                              disabled={round.state !== 'captain_voting_open'}
                              onClick={() => wrap(() => adminApi.closeVoting(round.id, 'captain'), 'Captain voting closed')}
                              className="btn-secondary text-sm flex-1 disabled:opacity-40">
                              Close
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-tribal-500 text-xs uppercase tracking-wider">Elimination Voting</p>
                          <div className="flex gap-2">
                            <button
                              disabled={round.state === 'elimination_voting_open' || !round.captain_id}
                              onClick={() => wrap(() => adminApi.openVoting(round.id, 'elimination'), 'Elimination voting opened')}
                              className="btn-primary text-sm flex-1 disabled:opacity-40">
                              Open
                            </button>
                            <button
                              disabled={round.state !== 'elimination_voting_open'}
                              onClick={() => wrap(() => adminApi.closeVoting(round.id, 'elimination'), 'Elimination voting closed')}
                              className="btn-secondary text-sm flex-1 disabled:opacity-40">
                              Close
                            </button>
                          </div>
                          {!round.captain_id && <p className="text-tribal-600 text-xs">Declare captain first</p>}
                        </div>
                      </div>
                    </div>

                    {/* Declare captain */}
                    {(round.state === 'captain_voting_closed' || round.state === 'waiting' || round.state === 'captain_voting_open') && (
                      <div className="card">
                        <h3 className="font-semibold text-tribal-200 mb-3">Declare Captain</h3>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {activePlayers.map(p => (
                            <button
                              key={p.user_id}
                              onClick={() => wrap(() => adminApi.declareCaptain(round.id, p.user_id), `${p.username} declared captain`)}
                              className={`btn-secondary text-sm text-left ${round.captain_id === p.user_id ? 'border-tribal-500 text-tribal-300' : ''}`}>
                              {p.username}
                              {round.captain_id === p.user_id && ' ✓'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Declare elimination — select then confirm */}
                    {(round.state === 'elimination_voting_closed' || round.state === 'tie_breaker') && (
                      <div className="card border-red-900/60">
                        <h3 className="font-semibold text-red-400 mb-1">Declare Elimination</h3>
                        <p className="text-tribal-500 text-sm mb-4">
                          Select a player, then confirm to eliminate them from the game.
                        </p>

                        {/* Step 1 — pick player */}
                        <div className="grid sm:grid-cols-2 gap-2 mb-4">
                          {activePlayers.filter(p => p.user_id !== round.captain_id).map(p => {
                            const isSelected = elimTarget === p.user_id
                            return (
                              <button
                                key={p.user_id}
                                onClick={() => setElimTarget(isSelected ? null : p.user_id)}
                                className={[
                                  'flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium transition-all',
                                  isSelected
                                    ? 'border-red-500 bg-red-900/30 text-red-300'
                                    : 'border-dark-border bg-dark text-tribal-300 hover:border-red-800 hover:text-red-400',
                                ].join(' ')}
                              >
                                <div className="w-7 h-7 rounded-full bg-dark-muted flex items-center justify-center text-xs flex-shrink-0">
                                  {p.username.slice(0, 2).toUpperCase()}
                                </div>
                                <span className="flex-1 text-left">{p.username}</span>
                                {isSelected && <span className="text-red-400 text-lg leading-none">✕</span>}
                              </button>
                            )
                          })}
                        </div>

                        {/* Step 2 — confirm banner */}
                        {elimTarget !== null && (() => {
                          const target = activePlayers.find(p => p.user_id === elimTarget)
                          return target ? (
                            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 flex items-center justify-between gap-4">
                              <div>
                                <p className="text-red-300 font-semibold">Eliminate {target.username}?</p>
                                <p className="text-red-500 text-xs mt-0.5">This action cannot be undone. They will be removed from the game.</p>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <button
                                  onClick={() => setElimTarget(null)}
                                  className="btn-secondary text-sm px-3 py-1.5">
                                  Cancel
                                </button>
                                <button
                                  onClick={() => {
                                    wrap(() => adminApi.declareElimination(round.id, elimTarget), `${target.username} eliminated`)
                                    setElimTarget(null)
                                  }}
                                  className="btn-danger text-sm px-3 py-1.5">
                                  Confirm Eliminate
                                </button>
                              </div>
                            </div>
                          ) : null
                        })()}
                      </div>
                    )}

                    {/* Tie breaker */}
                    <div className="card">
                      <h3 className="font-semibold text-tribal-200 mb-2">Tie Breaker / Override</h3>
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => wrap(() => adminApi.updateRoundState(round.id, 'tie_breaker'), 'Tie breaker set')} className="btn-secondary text-sm">
                          Set Tie Breaker
                        </button>
                        <button onClick={() => wrap(() => adminApi.updateRoundVisibility(round.id, round.visibility_mode === 'live' ? 'secret' : 'live'), 'Visibility updated')} className="btn-secondary text-sm">
                          Toggle Visibility ({round.visibility_mode})
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ── RESULTS TAB ── */}
        {tab === 'results' && (
          <div className="space-y-4">
            {!round ? (
              <div className="card text-center py-8"><p className="text-tribal-500">No active round.</p></div>
            ) : (
              <>
                <div className="card">
                  <h2 className="font-semibold text-tribal-200 mb-4">Round {round.round_number} Results</h2>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-tribal-500 text-xs uppercase tracking-wider mb-3">Captain Voting</h3>
                      {captainResults ? (
                        <ResultsDisplay results={captainResults} />
                      ) : <p className="text-tribal-600 text-sm">No votes yet</p>}
                    </div>
                    <div>
                      <h3 className="text-tribal-500 text-xs uppercase tracking-wider mb-3">Elimination Voting</h3>
                      {elimResults ? (
                        <ResultsDisplay results={elimResults} />
                      ) : <p className="text-tribal-600 text-sm">No votes yet</p>}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ResultsDisplay({ results }: { results: VoteResults }) {
  if (!results.results.length) return <p className="text-tribal-600 text-sm">No votes cast</p>
  const max = Math.max(...results.results.map(r => r.vote_count))
  return (
    <div className="space-y-3">
      {results.is_tie && (
        <div className="bg-yellow-900/20 border border-yellow-700 text-yellow-300 text-xs rounded px-2 py-1">
          Tie: {results.tied_players.map(p => p.username).join(', ')}
        </div>
      )}
      {results.results.map((r, i) => (
        <div key={r.user_id}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-tribal-200">{r.username}</span>
            <span className="text-tribal-400">{r.vote_count} pts ({r.raw_votes} votes)</span>
          </div>
          <div className="h-2 bg-dark rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${i === 0 ? 'bg-torch' : 'bg-dark-muted'}`} style={{ width: `${(r.vote_count / max) * 100}%` }} />
          </div>
        </div>
      ))}
      <p className="text-tribal-600 text-xs">{results.voters_who_voted.length} players voted · {results.total_votes} total votes</p>
    </div>
  )
}
