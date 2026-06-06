'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { gameApi, voteApi } from '@/lib/api'
import { Game, Round, GamePlayer, VoteResults } from '@/types'
import GameHeader from '@/components/game/GameHeader'
import RoundStatus from '@/components/game/RoundStatus'
import VotingPanel from '@/components/game/VotingPanel'
import PlayerCard from '@/components/game/PlayerCard'
import CommentsSection from '@/components/game/CommentsSection'

export default function GamePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [user, authLoading, router])

  const { data: game, isLoading: gameLoading } = useQuery<Game | null>({
    queryKey: ['active-game'],
    queryFn: () => gameApi.getActive().then(r => r.data),
    enabled: !!user,
    refetchInterval: 15_000,
  })

  const { data: players = [] } = useQuery<GamePlayer[]>({
    queryKey: ['game-players', game?.id],
    queryFn: () => gameApi.getPlayers(game!.id).then(r => r.data),
    enabled: !!game,
    refetchInterval: 15_000,
  })

  const { data: round, refetch: refetchRound } = useQuery<Round | null>({
    queryKey: ['current-round', game?.id],
    queryFn: () => gameApi.getCurrentRound(game!.id).then(r => r.data),
    enabled: !!game,
    refetchInterval: 8_000,
  })

  const { data: captainVoted, refetch: refetchCaptainVoted } = useQuery<{ has_voted: boolean }>({
    queryKey: ['has-voted-captain', round?.id],
    queryFn: () => voteApi.hasVoted(round!.id, 'captain').then(r => r.data),
    enabled: !!round,
    refetchInterval: 10_000,
  })

  const { data: elimVoted, refetch: refetchElimVoted } = useQuery<{ has_voted: boolean }>({
    queryKey: ['has-voted-elim', round?.id],
    queryFn: () => voteApi.hasVoted(round!.id, 'elimination').then(r => r.data),
    enabled: !!round,
    refetchInterval: 10_000,
  })

  const canSeeResults = (voteType: 'captain' | 'elimination') => {
    if (!round) return false
    if (user?.role === 'admin') return true
    if (round.visibility_mode === 'live') return true
    if (voteType === 'captain') return round.state !== 'captain_voting_open'
    return round.state !== 'elimination_voting_open'
  }

  const { data: captainResults, refetch: refetchCaptainResults } = useQuery<VoteResults>({
    queryKey: ['captain-results', round?.id],
    queryFn: () => gameApi.getResults(game!.id, round!.id, 'captain').then(r => r.data),
    enabled: !!round && !!game && canSeeResults('captain'),
    refetchInterval: 10_000,
  })

  const { data: elimResults, refetch: refetchElimResults } = useQuery<VoteResults>({
    queryKey: ['elim-results', round?.id],
    queryFn: () => gameApi.getResults(game!.id, round!.id, 'elimination').then(r => r.data),
    enabled: !!round && !!game && canSeeResults('elimination'),
    refetchInterval: 10_000,
  })

  if (authLoading || gameLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-torch rounded-full border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!user) return null

  const myPlayer = players.find(p => p.user_id === user.id)
  const isEliminated = myPlayer?.status === 'eliminated'
  const isActive = myPlayer && !isEliminated
  const activePlayers = players.filter(p => p.status !== 'eliminated')
  const eliminatedPlayers = players.filter(p => p.status === 'eliminated')

  return (
    <div className="min-h-screen flex flex-col">
      <GameHeader game={game ?? null} />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 space-y-6">

        {!game && (
          <div className="card text-center py-12">
            <div className="text-5xl mb-4">🏝️</div>
            <h2 className="text-2xl font-bold text-tribal-300">No Active Game</h2>
            <p className="text-tribal-500 mt-2">Waiting for the game to start. Check back soon!</p>
          </div>
        )}

        {game && (
          <>
            {/* Game status banner */}
            {game.status === 'completed' && (
              <div className="card text-center py-6 border-tribal-700">
                <div className="text-4xl mb-2">🏆</div>
                <h2 className="text-xl font-bold text-tribal-300">Game Over!</h2>
                {activePlayers.length === 1 && (
                  <p className="text-tribal-400 mt-1">Winner: <strong className="text-tribal-200">{activePlayers[0].username}</strong></p>
                )}
              </div>
            )}

            {isEliminated && (
              <div className="bg-red-900/20 border border-red-800 text-red-300 rounded-xl px-4 py-3 text-sm">
                You have been eliminated. You can still watch the game progress.
              </div>
            )}

            {myPlayer === undefined && user.role === 'player' && (
              <div className="bg-tribal-900/20 border border-tribal-700 text-tribal-300 rounded-xl px-4 py-3 text-sm">
                You are not a player in this game. Contact the admin to be added.
              </div>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left: Players */}
              <div className="space-y-4">
                <div className="card">
                  <h3 className="font-semibold text-tribal-200 mb-3">
                    Active Players <span className="text-tribal-500 font-normal">({activePlayers.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {activePlayers.map(p => (
                      <PlayerCard key={p.id} player={p} isCurrentUser={p.user_id === user.id} />
                    ))}
                    {activePlayers.length === 0 && <p className="text-tribal-600 text-sm">No active players</p>}
                  </div>
                </div>
                {eliminatedPlayers.length > 0 && (
                  <div className="card">
                    <h3 className="font-semibold text-tribal-500 mb-3 text-sm">
                      Eliminated <span className="font-normal">({eliminatedPlayers.length})</span>
                    </h3>
                    <div className="space-y-2">
                      {eliminatedPlayers.map(p => (
                        <PlayerCard key={p.id} player={p} isCurrentUser={p.user_id === user.id} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Center: Round + Voting */}
              <div className="lg:col-span-2 space-y-4">
                {round ? (
                  <>
                    <RoundStatus round={round} />

                    {/* Captain voting */}
                    {(round.state === 'captain_voting_open' ||
                      round.state === 'captain_voting_closed' ||
                      (captainResults && captainResults.total_votes > 0)) && (
                      <div className="card">
                        <VotingPanel
                          round={round}
                          players={players}
                          currentUserId={user.id}
                          voteType="captain"
                          votesPerPlayer={game.votes_per_player}
                          hasVoted={captainVoted?.has_voted ?? false}
                          results={captainResults ?? null}
                          onVoted={() => { refetchCaptainVoted(); refetchRound() }}
                          onRefresh={() => { refetchCaptainResults(); refetchRound() }}
                          canSeeResults={canSeeResults('captain')}
                        />
                      </div>
                    )}

                    {/* Elimination voting */}
                    {(round.state === 'elimination_voting_open' ||
                      round.state === 'elimination_voting_closed' ||
                      round.state === 'tie_breaker' ||
                      round.state === 'completed') && (
                      <div className="card">
                        <VotingPanel
                          round={round}
                          players={players}
                          currentUserId={user.id}
                          voteType="elimination"
                          votesPerPlayer={game.votes_per_player}
                          hasVoted={elimVoted?.has_voted ?? false}
                          results={elimResults ?? null}
                          onVoted={() => { refetchElimVoted(); refetchRound() }}
                          onRefresh={() => { refetchElimResults(); refetchRound() }}
                          canSeeResults={canSeeResults('elimination')}
                        />
                      </div>
                    )}

                    {/* Tie breaker notice */}
                    {round.state === 'tie_breaker' && (
                      <div className="card border-yellow-700 bg-yellow-900/10">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">⚔️</span>
                          <div>
                            <h3 className="font-semibold text-yellow-300">Tie Breaker in Progress</h3>
                            <p className="text-yellow-500 text-sm mt-1">
                              Tied players must compete in a task. The winner survives; the loser is eliminated. Admin will announce the result.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <CommentsSection roundId={round.id} canComment={!isEliminated} />
                  </>
                ) : (
                  <div className="card text-center py-8">
                    <div className="text-4xl mb-3">⏳</div>
                    <p className="text-tribal-400">Waiting for the round to begin...</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
