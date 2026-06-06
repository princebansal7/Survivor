from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Boolean, Enum as SAEnum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class GameStatus(str, enum.Enum):
    waiting = "waiting"
    active = "active"
    completed = "completed"


class PlayerStatus(str, enum.Enum):
    active = "active"
    captain = "captain"
    immune = "immune"
    eliminated = "eliminated"


class RoundState(str, enum.Enum):
    waiting = "waiting"
    captain_voting_open = "captain_voting_open"
    captain_voting_closed = "captain_voting_closed"
    elimination_voting_open = "elimination_voting_open"
    elimination_voting_closed = "elimination_voting_closed"
    tie_breaker = "tie_breaker"
    completed = "completed"


class VisibilityMode(str, enum.Enum):
    secret = "secret"
    live = "live"


class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, default="Survivor Game")
    status = Column(SAEnum(GameStatus), default=GameStatus.waiting, nullable=False)
    captain_vote_weight = Column(Float, default=2.0)
    votes_per_player = Column(Integer, default=3)
    visibility_mode = Column(SAEnum(VisibilityMode), default=VisibilityMode.secret)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    players = relationship("GamePlayer", back_populates="game")
    rounds = relationship("Round", back_populates="game", order_by="Round.round_number")


class GamePlayer(Base):
    __tablename__ = "game_players"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(SAEnum(PlayerStatus), default=PlayerStatus.active, nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    game = relationship("Game", back_populates="players")
    user = relationship("User", back_populates="game_players")


class Round(Base):
    __tablename__ = "rounds"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    round_number = Column(Integer, nullable=False)
    state = Column(SAEnum(RoundState), default=RoundState.waiting, nullable=False)
    captain_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    eliminated_player_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    visibility_mode = Column(SAEnum(VisibilityMode), default=VisibilityMode.secret)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    game = relationship("Game", back_populates="rounds")
    captain = relationship("User", foreign_keys=[captain_id], back_populates="captained_rounds")
    eliminated_player = relationship("User", foreign_keys=[eliminated_player_id])
    voting_windows = relationship("VotingWindow", back_populates="round")
    votes = relationship("Vote", back_populates="round")
    comments = relationship("Comment", back_populates="round")


class VotingWindow(Base):
    __tablename__ = "voting_windows"

    id = Column(Integer, primary_key=True, index=True)
    round_id = Column(Integer, ForeignKey("rounds.id"), nullable=False)
    vote_type = Column(String(20), nullable=False)  # captain / elimination
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    is_open = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    round = relationship("Round", back_populates="voting_windows")
