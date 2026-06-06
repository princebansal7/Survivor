export type UserRole = 'admin' | 'player' | 'spectator'
export type UserStatus = 'pending' | 'approved' | 'rejected'

export interface User {
  id: number
  username: string
  email: string
  role: UserRole
  status: UserStatus
  created_at: string
}

export interface AuthToken {
  access_token: string
  token_type: string
  user: User
}

export type GameStatus = 'waiting' | 'active' | 'completed'
export type VisibilityMode = 'secret' | 'live'

export interface Game {
  id: number
  name: string
  status: GameStatus
  captain_vote_weight: number
  votes_per_player: number
  visibility_mode: VisibilityMode
  player_count: number
  active_player_count: number
  created_at: string
}

export type PlayerStatus = 'active' | 'captain' | 'immune' | 'eliminated'
export type RoundState =
  | 'waiting'
  | 'captain_voting_open'
  | 'captain_voting_closed'
  | 'elimination_voting_open'
  | 'elimination_voting_closed'
  | 'tie_breaker'
  | 'completed'

export interface GamePlayer {
  id: number
  user_id: number
  username: string
  status: PlayerStatus
  joined_at: string
}

export interface VotingWindow {
  id: number
  vote_type: string
  start_time: string | null
  end_time: string | null
  is_open: boolean
}

export interface Round {
  id: number
  round_number: number
  state: RoundState
  captain_id: number | null
  captain_username: string | null
  eliminated_player_id: number | null
  eliminated_username: string | null
  visibility_mode: VisibilityMode
  voting_windows: VotingWindow[]
  created_at: string
}

export interface CandidateResult {
  user_id: number
  username: string
  vote_count: number
  raw_votes: number
}

export interface VoteResults {
  vote_type: string
  results: CandidateResult[]
  winner: CandidateResult | null
  is_tie: boolean
  tied_players: CandidateResult[]
  total_votes: number
  voters_who_voted: number[]
}

export interface VoteBreakdownEntry {
  voter: string
  candidate: string
}

export interface Comment {
  id: number
  round_id: number
  user_id: number
  author_username: string
  content: string
  created_at: string
}
