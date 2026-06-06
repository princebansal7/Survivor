'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GamePlayer, Round, VoteResults, VoteBreakdownEntry } from '@/types'
import { voteApi } from '@/lib/api'
import PlayerCard from './PlayerCard'

interface Props {
  round: Round
  players: GamePlayer[]
  currentUserId: number
  voteType: 'captain' | 'elimination'
  votesPerPlayer: number
  hasVoted: boolean
  results: VoteResults | null
  onVoted: () => void
  onRefresh: () => void
  canSeeResults: boolean
}

export default function VotingPanel({
  round, players, currentUserId, voteType, votesPerPlayer,
  hasVoted, results, onVoted, onRefresh, canSeeResults,
}: Props) {
  const [selected, setSelected] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const maxVotes = voteType === 'captain' ? 1 : votesPerPlayer

  const isLive = round.visibility_mode === 'live'
  const isVotingOpen = voteType === 'captain'
    ? round.state === 'captain_voting_open'
    : round.state === 'elimination_voting_open'

  // Fetch who-voted-whom only in live mode (or always for results page)
  const { data: breakdown = [] } = useQuery<VoteBreakdownEntry[]>({
    queryKey: ['vote-breakdown', round.id, voteType],
    queryFn: () => voteApi.breakdown(round.id, voteType).then(r => r.data),
    enabled: isLive && canSeeResults && (isVotingOpen || !!results),
    refetchInterval: isVotingOpen ? 6_000 : false,
  })

  const eligiblePlayers = players.filter(p => {
    if (p.user_id === currentUserId) return false
    if (p.status === 'eliminated') return false
    if (voteType === 'elimination' && round.captain_id === p.user_id) return false
    return true
  })

  const toggleSelect = (userId: number) => {
    setSelected(prev => {
      if (prev.includes(userId)) return prev.filter(id => id !== userId)
      if (prev.length >= maxVotes) return voteType === 'captain' ? [userId] : prev
      return [...prev, userId]
    })
  }

  const submit = async () => {
    if (selected.length !== maxVotes) {
      setError(`You must select exactly ${maxVotes} player${maxVotes > 1 ? 's' : ''}`)
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await voteApi.castVotes(round.id, { candidate_ids: selected, vote_type: voteType })
      onVoted()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to submit votes')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isVotingOpen && !hasVoted && !results) {
    return (
      <div className="card text-center py-8">
        <div className="text-4xl mb-3">🔒</div>
        <p className="text-tribal-400">Voting Lines Are Closed</p>
        <p className="text-tribal-600 text-sm mt-1">
          {voteType === 'captain' ? 'Captain' : 'Elimination'} voting has not opened yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-tribal-200">
          {voteType === 'captain' ? 'Captain Vote' : 'Elimination Vote'}
        </h3>
        <div className="flex items-center gap-2">
          {isVotingOpen && !hasVoted && <span className="badge-open">Voting Open</span>}
          {hasVoted && <span className="badge bg-blue-900 text-blue-300">Voted</span>}
          {!isVotingOpen && results && <span className="badge-closed">Closed</span>}
          {/* Refresh button — shown whenever results are visible */}
          {canSeeResults && (isVotingOpen || results) && (
            <button
              onClick={onRefresh}
              title="Refresh results"
              className="p-1.5 rounded-lg border border-dark-border text-tribal-500 hover:text-tribal-300 hover:border-tribal-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Voting form */}
      {isVotingOpen && !hasVoted && (
        <div className="space-y-3">
          <p className="text-tribal-500 text-sm">
            Select {maxVotes} player{maxVotes > 1 ? 's' : ''} — {selected.length}/{maxVotes} chosen
          </p>
          {voteType === 'elimination' && round.captain_username && (
            <div className="bg-blue-900/20 border border-blue-800 text-blue-300 text-xs rounded-lg px-3 py-2">
              Captain <strong>{round.captain_username}</strong> is immune and cannot be voted out this round.
            </div>
          )}
          <div className="grid gap-2">
            {eligiblePlayers.map(p => (
              <PlayerCard
                key={p.id}
                player={p}
                selectable
                selected={selected.includes(p.user_id)}
                onSelect={toggleSelect}
                disabled={!selected.includes(p.user_id) && selected.length >= maxVotes}
              />
            ))}
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={submit}
            disabled={submitting || selected.length !== maxVotes}
            className="btn-primary w-full"
          >
            {submitting ? 'Submitting...' : `Submit ${voteType === 'captain' ? 'Captain' : 'Elimination'} Vote`}
          </button>
        </div>
      )}

      {/* Already voted — voting still open */}
      {hasVoted && isVotingOpen && !isLive && (
        <div className="bg-jungle-900/20 border border-jungle-800 text-jungle-300 text-sm rounded-lg px-4 py-3">
          Your vote has been cast. Results will be shown when voting closes.
        </div>
      )}

      {/* Results (counts + bar chart) */}
      {canSeeResults && results && results.results.length > 0 && (
        <div className="space-y-2">
          <p className="text-tribal-500 text-xs uppercase tracking-wider">
            Tally — {results.total_votes} vote{results.total_votes !== 1 ? 's' : ''} cast
          </p>
          {results.is_tie && (
            <div className="bg-yellow-900/20 border border-yellow-700 text-yellow-300 text-sm rounded-lg px-3 py-2">
              Tie between: {results.tied_players.map(p => p.username).join(', ')}
            </div>
          )}
          {!results.is_tie && results.winner && (
            <div className="bg-tribal-900/20 border border-tribal-700 text-tribal-300 text-sm rounded-lg px-3 py-2">
              {voteType === 'captain' ? 'Captain' : 'Most votes'}: <strong>{results.winner.username}</strong>
            </div>
          )}
          {results.results.map((r, i) => {
            const maxCount = Math.max(...results.results.map(x => x.vote_count))
            const pct = maxCount > 0 ? (r.vote_count / maxCount) * 100 : 0
            return (
              <div key={r.user_id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-tribal-200">{r.username}</span>
                  <span className="text-tribal-400">{r.vote_count} pts ({r.raw_votes} votes)</span>
                </div>
                <div className="h-2 bg-dark rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${i === 0 ? 'bg-torch' : 'bg-dark-muted'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Live breakdown — who voted whom */}
      {isLive && canSeeResults && breakdown.length > 0 && (
        <div className="space-y-2 border-t border-dark-border pt-3">
          <p className="text-tribal-500 text-xs uppercase tracking-wider">Who voted whom</p>
          <div className="space-y-1">
            {breakdown.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-tribal-300 font-medium w-24 truncate">{entry.voter}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-tribal-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-torch-light font-medium">{entry.candidate}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live mode — voted but showing live data */}
      {isLive && hasVoted && isVotingOpen && (
        <p className="text-tribal-600 text-xs text-center">Live results update every 6 seconds</p>
      )}

      {/* Secret voting message */}
      {!canSeeResults && round.visibility_mode === 'secret' && (isVotingOpen || round.state.includes('closed')) && (
        <div className="text-center py-4 text-tribal-600 text-sm">
          Results are hidden until voting closes.
        </div>
      )}
    </div>
  )
}
