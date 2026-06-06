import axios from 'axios'
import Cookies from 'js-cookie'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = Cookies.get('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      Cookies.remove('token')
      if (typeof window !== 'undefined') window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

// Auth
export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
}

// Admin
export const adminApi = {
  getUsers: () => api.get('/admin/users'),
  getPendingUsers: () => api.get('/admin/users/pending'),
  approveUser: (id: number, status: string) =>
    api.patch(`/admin/users/${id}/approve`, { status }),
  updateRole: (id: number, role: string) =>
    api.patch(`/admin/users/${id}/role`, { role }),
  createGame: (data: object) => api.post('/admin/games', data),
  updateGame: (id: number, data: object) => api.patch(`/admin/games/${id}`, data),
  getGames: () => api.get('/admin/games'),
  addPlayer: (gameId: number, userId: number) =>
    api.post(`/admin/games/${gameId}/add-player/${userId}`),
  removePlayer: (gameId: number, userId: number) =>
    api.delete(`/admin/games/${gameId}/remove-player/${userId}`),
  startGame: (gameId: number) => api.post(`/admin/games/${gameId}/start`),
  endGame: (gameId: number) => api.post(`/admin/games/${gameId}/end`),
  nextRound: (gameId: number) => api.post(`/admin/games/${gameId}/rounds/next`),
  updateRoundState: (roundId: number, state: string) =>
    api.patch(`/admin/rounds/${roundId}/state`, { state }),
  updateRoundVisibility: (roundId: number, mode: string) =>
    api.patch(`/admin/rounds/${roundId}/visibility`, { visibility_mode: mode }),
  setVotingWindow: (roundId: number, data: object) =>
    api.post(`/admin/rounds/${roundId}/voting-window`, data),
  openVoting: (roundId: number, type: string) =>
    api.post(`/admin/rounds/${roundId}/open-voting/${type}`),
  closeVoting: (roundId: number, type: string) =>
    api.post(`/admin/rounds/${roundId}/close-voting/${type}`),
  declareCaptain: (roundId: number, userId: number) =>
    api.post(`/admin/rounds/${roundId}/declare-captain/${userId}`),
  declareElimination: (roundId: number, userId: number) =>
    api.post(`/admin/rounds/${roundId}/declare-elimination/${userId}`),
}

// Games
export const gameApi = {
  getActive: () => api.get('/games/active'),
  getPlayers: (gameId: number) => api.get(`/games/${gameId}/players`),
  getRounds: (gameId: number) => api.get(`/games/${gameId}/rounds`),
  getCurrentRound: (gameId: number) => api.get(`/games/${gameId}/rounds/current`),
  getResults: (gameId: number, roundId: number, voteType: string) =>
    api.get(`/games/${gameId}/rounds/${roundId}/results/${voteType}`),
}

// Votes
export const voteApi = {
  castVotes: (roundId: number, data: { candidate_ids: number[]; vote_type: string }) =>
    api.post(`/votes/rounds/${roundId}`, data),
  myVotes: (roundId: number) => api.get(`/votes/rounds/${roundId}/my-votes`),
  hasVoted: (roundId: number, voteType: string) =>
    api.get(`/votes/rounds/${roundId}/has-voted/${voteType}`),
  breakdown: (roundId: number, voteType: string) =>
    api.get(`/votes/rounds/${roundId}/breakdown/${voteType}`),
}

// Comments
export const commentApi = {
  post: (roundId: number, content: string) =>
    api.post(`/comments/rounds/${roundId}`, { content }),
  get: (roundId: number) => api.get(`/comments/rounds/${roundId}`),
}
