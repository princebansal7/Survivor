from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.game import GameStatus, PlayerStatus, RoundState, VisibilityMode


class GameCreate(BaseModel):
    name: str = "Survivor Game"
    captain_vote_weight: float = 2.0
    votes_per_player: int = 3
    visibility_mode: VisibilityMode = VisibilityMode.secret


class GameUpdate(BaseModel):
    name: Optional[str] = None
    captain_vote_weight: Optional[float] = None
    votes_per_player: Optional[int] = None
    visibility_mode: Optional[VisibilityMode] = None


class GamePlayerOut(BaseModel):
    id: int
    user_id: int
    username: str
    status: PlayerStatus
    joined_at: datetime

    class Config:
        from_attributes = True


class VotingWindowOut(BaseModel):
    id: int
    vote_type: str
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    is_open: bool

    class Config:
        from_attributes = True


class RoundOut(BaseModel):
    id: int
    round_number: int
    state: RoundState
    captain_id: Optional[int]
    captain_username: Optional[str]
    eliminated_player_id: Optional[int]
    eliminated_username: Optional[str]
    visibility_mode: VisibilityMode
    voting_windows: List[VotingWindowOut] = []
    created_at: datetime

    class Config:
        from_attributes = True


class GameOut(BaseModel):
    id: int
    name: str
    status: GameStatus
    captain_vote_weight: float
    votes_per_player: int
    visibility_mode: VisibilityMode
    player_count: int
    active_player_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class VotingWindowCreate(BaseModel):
    vote_type: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class RoundStateUpdate(BaseModel):
    state: RoundState


class RoundVisibilityUpdate(BaseModel):
    visibility_mode: VisibilityMode
