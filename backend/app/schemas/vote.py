from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime


class VoteCreate(BaseModel):
    candidate_ids: List[int]
    vote_type: str  # captain / elimination


class VoteOut(BaseModel):
    id: int
    round_id: int
    voter_id: int
    candidate_id: int
    vote_type: str
    weight: float
    created_at: datetime
    candidate_username: Optional[str] = None

    class Config:
        from_attributes = True


class CandidateResult(BaseModel):
    user_id: int
    username: str
    vote_count: float
    raw_votes: int


class VoteResults(BaseModel):
    vote_type: str
    results: List[CandidateResult]
    winner: Optional[CandidateResult] = None
    is_tie: bool
    tied_players: List[CandidateResult] = []
    total_votes: int
    voters_who_voted: List[int] = []
