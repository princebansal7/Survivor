from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.core.deps import get_admin_user
from app.models.user import User, UserStatus, UserRole
from app.models.game import Game, GamePlayer, Round, GameStatus, RoundState, PlayerStatus, VisibilityMode, VotingWindow
from app.schemas.user import UserOut, UserApprove, UserUpdateRole
from app.schemas.game import (
    GameCreate, GameOut, RoundOut, GameUpdate,
    VotingWindowCreate, RoundStateUpdate, RoundVisibilityUpdate
)
from app.services.game_service import build_game_out, check_game_over, eliminate_player, get_current_round
from app.services.voting_service import calculate_vote_results
from datetime import datetime

router = APIRouter(prefix="/admin", tags=["admin"])


# ── User management ─────────────────────────────────────────────────────────

@router.get("/users/pending", response_model=List[UserOut])
def pending_users(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    return db.query(User).filter(User.status == UserStatus.pending).all()


@router.get("/users", response_model=List[UserOut])
def all_users(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    return db.query(User).all()


@router.patch("/users/{user_id}/approve", response_model=UserOut)
def approve_user(user_id: int, body: UserApprove, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.status = body.status
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/role", response_model=UserOut)
def update_role(user_id: int, body: UserUpdateRole, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.role = body.role
    db.commit()
    db.refresh(user)
    return user


# ── Game management ──────────────────────────────────────────────────────────

@router.post("/games", response_model=GameOut, status_code=201)
def create_game(data: GameCreate, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    existing = db.query(Game).filter(Game.status.in_([GameStatus.waiting, GameStatus.active])).first()
    if existing:
        raise HTTPException(400, "An active or waiting game already exists")
    game = Game(**data.model_dump())
    db.add(game)
    db.commit()
    db.refresh(game)
    return build_game_out(game, db)


@router.get("/games", response_model=List[GameOut])
def list_games(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    games = db.query(Game).all()
    return [build_game_out(g, db) for g in games]


@router.patch("/games/{game_id}", response_model=GameOut)
def update_game(game_id: int, data: GameUpdate, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(404, "Game not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(game, field, value)
    db.commit()
    db.refresh(game)
    return build_game_out(game, db)


@router.post("/games/{game_id}/add-player/{user_id}")
def add_player(game_id: int, user_id: int, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(404, "Game not found")
    user = db.query(User).filter(User.id == user_id, User.status == UserStatus.approved).first()
    if not user:
        raise HTTPException(404, "Approved user not found")
    existing = db.query(GamePlayer).filter(GamePlayer.game_id == game_id, GamePlayer.user_id == user_id).first()
    if existing:
        raise HTTPException(400, "Player already in game")
    player = GamePlayer(game_id=game_id, user_id=user_id)
    db.add(player)
    db.commit()
    return {"message": "Player added"}


@router.delete("/games/{game_id}/remove-player/{user_id}")
def remove_player(game_id: int, user_id: int, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    player = db.query(GamePlayer).filter(GamePlayer.game_id == game_id, GamePlayer.user_id == user_id).first()
    if not player:
        raise HTTPException(404, "Player not found in game")
    db.delete(player)
    db.commit()
    return {"message": "Player removed"}


@router.post("/games/{game_id}/start")
def start_game(game_id: int, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(404, "Game not found")
    if game.status != GameStatus.waiting:
        raise HTTPException(400, "Game is not in waiting state")
    player_count = db.query(GamePlayer).filter(GamePlayer.game_id == game_id).count()
    if player_count < 2:
        raise HTTPException(400, "Need at least 2 players to start")
    game.status = GameStatus.active
    round_ = Round(game_id=game_id, round_number=1, state=RoundState.waiting)
    db.add(round_)
    db.commit()
    return {"message": "Game started", "game_id": game_id}


@router.post("/games/{game_id}/end")
def end_game(game_id: int, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(404, "Game not found")
    game.status = GameStatus.completed
    db.commit()
    return {"message": "Game ended"}


# ── Round management ─────────────────────────────────────────────────────────

@router.post("/games/{game_id}/rounds/next")
def next_round(game_id: int, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game or game.status != GameStatus.active:
        raise HTTPException(400, "Game not active")
    last_round = db.query(Round).filter(Round.game_id == game_id).order_by(Round.round_number.desc()).first()
    next_num = (last_round.round_number + 1) if last_round else 1
    round_ = Round(game_id=game_id, round_number=next_num, state=RoundState.waiting)
    db.add(round_)
    db.commit()
    db.refresh(round_)
    return {"round_id": round_.id, "round_number": round_.round_number}


@router.patch("/rounds/{round_id}/state")
def update_round_state(round_id: int, body: RoundStateUpdate, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    round_ = db.query(Round).filter(Round.id == round_id).first()
    if not round_:
        raise HTTPException(404, "Round not found")
    round_.state = body.state
    db.commit()
    return {"round_id": round_id, "state": body.state}


@router.patch("/rounds/{round_id}/visibility")
def update_round_visibility(round_id: int, body: RoundVisibilityUpdate, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    round_ = db.query(Round).filter(Round.id == round_id).first()
    if not round_:
        raise HTTPException(404, "Round not found")
    round_.visibility_mode = body.visibility_mode
    db.commit()
    return {"round_id": round_id, "visibility_mode": body.visibility_mode}


@router.post("/rounds/{round_id}/voting-window")
def set_voting_window(round_id: int, body: VotingWindowCreate, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    round_ = db.query(Round).filter(Round.id == round_id).first()
    if not round_:
        raise HTTPException(404, "Round not found")
    existing = db.query(VotingWindow).filter(VotingWindow.round_id == round_id, VotingWindow.vote_type == body.vote_type).first()
    if existing:
        existing.start_time = body.start_time
        existing.end_time = body.end_time
        db.commit()
        return {"message": "Voting window updated"}
    window = VotingWindow(round_id=round_id, vote_type=body.vote_type, start_time=body.start_time, end_time=body.end_time)
    db.add(window)
    db.commit()
    return {"message": "Voting window created"}


@router.post("/rounds/{round_id}/open-voting/{vote_type}")
def open_voting(round_id: int, vote_type: str, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    round_ = db.query(Round).filter(Round.id == round_id).first()
    if not round_:
        raise HTTPException(404, "Round not found")
    if vote_type == "captain":
        round_.state = RoundState.captain_voting_open
    elif vote_type == "elimination":
        round_.state = RoundState.elimination_voting_open
    else:
        raise HTTPException(400, "Invalid vote type")
    window = db.query(VotingWindow).filter(VotingWindow.round_id == round_id, VotingWindow.vote_type == vote_type).first()
    if window:
        window.is_open = True
    db.commit()
    return {"message": f"{vote_type} voting opened"}


@router.post("/rounds/{round_id}/close-voting/{vote_type}")
def close_voting(round_id: int, vote_type: str, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    round_ = db.query(Round).filter(Round.id == round_id).first()
    if not round_:
        raise HTTPException(404, "Round not found")
    if vote_type == "captain":
        round_.state = RoundState.captain_voting_closed
    elif vote_type == "elimination":
        round_.state = RoundState.elimination_voting_closed
    else:
        raise HTTPException(400, "Invalid vote type")
    window = db.query(VotingWindow).filter(VotingWindow.round_id == round_id, VotingWindow.vote_type == vote_type).first()
    if window:
        window.is_open = False
    db.commit()
    return {"message": f"{vote_type} voting closed"}


@router.post("/rounds/{round_id}/declare-captain/{user_id}")
def declare_captain(round_id: int, user_id: int, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    round_ = db.query(Round).filter(Round.id == round_id).first()
    if not round_:
        raise HTTPException(404, "Round not found")
    prev_captain = db.query(GamePlayer).filter(
        GamePlayer.game_id == round_.game_id,
        GamePlayer.status == PlayerStatus.captain,
    ).first()
    if prev_captain:
        prev_captain.status = PlayerStatus.active

    round_.captain_id = user_id
    round_.state = RoundState.captain_voting_closed
    player = db.query(GamePlayer).filter(GamePlayer.game_id == round_.game_id, GamePlayer.user_id == user_id).first()
    if player:
        player.status = PlayerStatus.captain
    db.commit()
    return {"message": "Captain declared", "captain_id": user_id}


@router.post("/rounds/{round_id}/declare-elimination/{user_id}")
def declare_elimination(round_id: int, user_id: int, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    round_ = db.query(Round).filter(Round.id == round_id).first()
    if not round_:
        raise HTTPException(404, "Round not found")
    round_.eliminated_player_id = user_id
    round_.state = RoundState.completed
    eliminate_player(db, round_.game_id, user_id)
    if round_.captain_id:
        player = db.query(GamePlayer).filter(GamePlayer.game_id == round_.game_id, GamePlayer.user_id == round_.captain_id).first()
        if player:
            player.status = PlayerStatus.active
    if check_game_over(db, round_.game_id):
        game = db.query(Game).filter(Game.id == round_.game_id).first()
        game.status = GameStatus.completed
    db.commit()
    return {"message": "Player eliminated", "eliminated_id": user_id}
