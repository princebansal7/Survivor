from sqlalchemy.orm import Session
from app.models.game import Game, GamePlayer, Round, PlayerStatus, GameStatus, RoundState
from app.models.user import User, UserStatus, UserRole
from typing import Optional


def get_active_game(db: Session) -> Optional[Game]:
    return db.query(Game).filter(Game.status == GameStatus.active).first()


def get_current_round(db: Session, game_id: int) -> Optional[Round]:
    return db.query(Round).filter(
        Round.game_id == game_id,
        Round.state != RoundState.completed,
    ).order_by(Round.round_number.desc()).first()


def get_player_in_game(db: Session, game_id: int, user_id: int) -> Optional[GamePlayer]:
    return db.query(GamePlayer).filter(
        GamePlayer.game_id == game_id,
        GamePlayer.user_id == user_id,
    ).first()


def is_player_active(db: Session, game_id: int, user_id: int) -> bool:
    player = get_player_in_game(db, game_id, user_id)
    if not player:
        return False
    return player.status in [PlayerStatus.active, PlayerStatus.captain, PlayerStatus.immune]


def eliminate_player(db: Session, game_id: int, user_id: int) -> GamePlayer:
    player = get_player_in_game(db, game_id, user_id)
    if player:
        player.status = PlayerStatus.eliminated
        db.commit()
        db.refresh(player)
    return player


def check_game_over(db: Session, game_id: int) -> bool:
    active_count = db.query(GamePlayer).filter(
        GamePlayer.game_id == game_id,
        GamePlayer.status.in_([PlayerStatus.active, PlayerStatus.captain, PlayerStatus.immune]),
    ).count()
    return active_count <= 1


def build_game_out(game: Game, db: Session) -> dict:
    total = len(game.players)
    active = sum(1 for p in game.players if p.status in [
        PlayerStatus.active, PlayerStatus.captain, PlayerStatus.immune
    ])
    return {
        "id": game.id,
        "name": game.name,
        "status": game.status,
        "captain_vote_weight": game.captain_vote_weight,
        "votes_per_player": game.votes_per_player,
        "visibility_mode": game.visibility_mode,
        "player_count": total,
        "active_player_count": active,
        "created_at": game.created_at,
    }
