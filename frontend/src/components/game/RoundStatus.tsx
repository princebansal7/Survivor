'use client'
import { Round, RoundState } from '@/types'

const stateLabels: Record<RoundState, { label: string; color: string; desc: string }> = {
  waiting:                  { label: 'Waiting',              color: 'text-tribal-400', desc: 'Round has not started yet' },
  captain_voting_open:      { label: 'Captain Voting Open',  color: 'text-jungle-400', desc: 'Vote for your captain now!' },
  captain_voting_closed:    { label: 'Captain Voting Closed',color: 'text-tribal-300', desc: 'Captain has been selected' },
  elimination_voting_open:  { label: 'Elimination Voting',   color: 'text-torch-light', desc: 'Cast your elimination votes!' },
  elimination_voting_closed:{ label: 'Voting Closed',        color: 'text-tribal-300', desc: 'Results being calculated...' },
  tie_breaker:              { label: 'Tie Breaker!',         color: 'text-yellow-400', desc: 'Tied players must compete' },
  completed:                { label: 'Round Complete',       color: 'text-tribal-500', desc: 'Round has ended' },
}

interface Props {
  round: Round
}

export default function RoundStatus({ round }: Props) {
  const cfg = stateLabels[round.state]
  const isVotingOpen = round.state === 'captain_voting_open' || round.state === 'elimination_voting_open'

  return (
    <div className="card">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-tribal-500 text-xs uppercase tracking-wider">Round {round.round_number}</p>
          <h2 className={`text-lg font-bold mt-0.5 ${cfg.color} ${isVotingOpen ? 'animate-pulse' : ''}`}>
            {cfg.label}
          </h2>
          <p className="text-tribal-500 text-sm mt-0.5">{cfg.desc}</p>
        </div>
        <div className="text-right text-sm space-y-1">
          <div>
            <span className="text-tribal-500">Visibility: </span>
            <span className="text-tribal-300">{round.visibility_mode === 'live' ? 'Live' : 'Secret'}</span>
          </div>
          {round.captain_username && (
            <div>
              <span className="text-tribal-500">Captain: </span>
              <span className="text-tribal-300 font-medium">{round.captain_username}</span>
              <span className="ml-1 text-xs text-blue-400">(immune)</span>
            </div>
          )}
          {round.eliminated_username && (
            <div>
              <span className="text-tribal-500">Eliminated: </span>
              <span className="text-red-400 font-medium">{round.eliminated_username}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
