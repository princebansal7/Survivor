from sqlalchemy import Column, Integer, String, DateTime, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    player = "player"
    spectator = "spectator"


class UserStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.player, nullable=False)
    status = Column(SAEnum(UserStatus), default=UserStatus.pending, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    game_players = relationship("GamePlayer", back_populates="user")
    votes_cast = relationship("Vote", foreign_keys="Vote.voter_id", back_populates="voter")
    votes_received = relationship("Vote", foreign_keys="Vote.candidate_id", back_populates="candidate")
    comments = relationship("Comment", back_populates="author")
    captained_rounds = relationship("Round", foreign_keys="Round.captain_id", back_populates="captain")
