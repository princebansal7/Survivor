from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.core.deps import get_approved_user
from app.models.user import User
from app.models.game import Game, GamePlayer, Round, PlayerStatus, GameStatus, RoundState, VisibilityMode
from app.schemas.game import GameOut, RoundOut, GamePlayerOut, VotingWindowOut
from app.services.game_service import build_game_out, get_current_round
from app.services.voting_service import calculate_vote_results
from app.schemas.vote import VoteResults

router = APIRouter(prefix="/games", tags=["games"])


@router.get("/active", response_model=Optional[GameOut])
def get_active_game(db: Session = Depends(get_db), current_user: User = Depends(get_approved_user)):
    game = db.query(Game).filter(Game.status.in_([GameStatus.waiting, GameStatus.active])).first()
    if not game:
        return None
    return build_game_out(game, db)


@router.get("/{game_id}/players", response_model=List[GamePlayerOut])
def get_players(game_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_approved_user)):
    players = db.query(GamePlayer).filter(GamePlayer.game_id == game_id).all()
    result = []
    for p in players:
        result.append(GamePlayerOut(
            id=p.id,
            user_id=p.user_id,
            username=p.user.username,
            status=p.status,
            joined_at=p.joined_at,
        ))
    return result


@router.get("/{game_id}/rounds", response_model=List[RoundOut])
def get_rounds(game_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_approved_user)):
    rounds = db.query(Round).filter(Round.game_id == game_id).order_by(Round.round_number).all()
    return [_build_round_out(r) for r in rounds]


@router.get("/{game_id}/rounds/current", response_model=Optional[RoundOut])
def get_current_round_endpoint(game_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_approved_user)):
    round_ = get_current_round(db, game_id)
    if not round_:
        last = db.query(Round).filter(Round.game_id == game_id).order_by(Round.round_number.desc()).first()
        return _build_round_out(last) if last else None
    return _build_round_out(round_)


@router.get("/{game_id}/rounds/{round_id}/results/{vote_type}", response_model=VoteResults)
def get_vote_results(game_id: int, round_id: int, vote_type: str, db: Session = Depends(get_db), current_user: User = Depends(get_approved_user)):
    round_ = db.query(Round).filter(Round.id == round_id, Round.game_id == game_id).first()
    if not round_:
        raise HTTPException(404, "Round not found")
    if round_.visibility_mode == VisibilityMode.secret and round_.state in [
        RoundState.captain_voting_open, RoundState.elimination_voting_open
    ]:
        from app.models.user import UserRole
        if current_user.role != UserRole.admin:
            raise HTTPException(403, "Voting results are hidden until voting closes")
    return calculate_vote_results(db, round_id, vote_type)


def _build_round_out(r: Round) -> RoundOut:
    if not r:
        return None
    return RoundOut(
        id=r.id,
        round_number=r.round_number,
        state=r.state,
        captain_id=r.captain_id,
        captain_username=r.captain.username if r.captain else None,
        eliminated_player_id=r.eliminated_player_id,
        eliminated_username=r.eliminated_player.username if r.eliminated_player else None,
        visibility_mode=r.visibility_mode,
        voting_windows=[
            VotingWindowOut(
                id=w.id,
                vote_type=w.vote_type,
                start_time=w.start_time,
                end_time=w.end_time,
                is_open=w.is_open,
            ) for w in r.voting_windows
        ],
        created_at=r.created_at,
    )
