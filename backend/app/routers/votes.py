from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.core.deps import get_approved_user
from app.models.user import User, UserRole
from app.models.game import Game, Round, GamePlayer, PlayerStatus, RoundState
from app.models.vote import Vote
from app.schemas.vote import VoteCreate, VoteOut
from app.services.voting_service import has_voted, get_player_vote_weight, get_active_players

router = APIRouter(prefix="/votes", tags=["votes"])


@router.post("/rounds/{round_id}", response_model=List[VoteOut])
def cast_votes(round_id: int, body: VoteCreate, db: Session = Depends(get_db), current_user: User = Depends(get_approved_user)):
    round_ = db.query(Round).filter(Round.id == round_id).first()
    if not round_:
        raise HTTPException(404, "Round not found")

    game = db.query(Game).filter(Game.id == round_.game_id).first()

    # Validate round state
    if body.vote_type == "captain" and round_.state != RoundState.captain_voting_open:
        raise HTTPException(400, "Captain voting is not open")
    if body.vote_type == "elimination" and round_.state != RoundState.elimination_voting_open:
        raise HTTPException(400, "Elimination voting is not open")

    # Must be an active player
    player = db.query(GamePlayer).filter(
        GamePlayer.game_id == round_.game_id,
        GamePlayer.user_id == current_user.id,
    ).first()
    if not player or player.status == PlayerStatus.eliminated:
        raise HTTPException(403, "You are not an active player")

    # Cannot vote twice
    if has_voted(db, round_id, current_user.id, body.vote_type):
        raise HTTPException(400, "You have already voted in this round")

    # Validate vote count for elimination
    if body.vote_type == "elimination":
        if len(body.candidate_ids) != game.votes_per_player:
            raise HTTPException(400, f"You must cast exactly {game.votes_per_player} votes")

    # Captain voting: exactly 1 vote
    if body.vote_type == "captain" and len(body.candidate_ids) != 1:
        raise HTTPException(400, "Captain voting requires exactly 1 vote")

    # No duplicates
    if len(body.candidate_ids) != len(set(body.candidate_ids)):
        raise HTTPException(400, "Duplicate votes are not allowed")

    # No self-vote
    if current_user.id in body.candidate_ids:
        raise HTTPException(400, "You cannot vote for yourself")

    # Validate candidates are active players
    active_players = get_active_players(db, round_.game_id)
    active_ids = {p.user_id for p in active_players}

    # Captain is immune from elimination
    if body.vote_type == "elimination" and round_.captain_id:
        active_ids.discard(round_.captain_id)

    for cid in body.candidate_ids:
        if cid not in active_ids:
            raise HTTPException(400, f"Player {cid} is not eligible to be voted for")

    weight = get_player_vote_weight(db, round_.game_id, current_user.id, body.vote_type)
    created_votes = []
    for cid in body.candidate_ids:
        vote = Vote(
            round_id=round_id,
            voter_id=current_user.id,
            candidate_id=cid,
            vote_type=body.vote_type,
            weight=weight,
        )
        db.add(vote)
        created_votes.append(vote)

    db.commit()
    for v in created_votes:
        db.refresh(v)

    return [VoteOut(
        id=v.id,
        round_id=v.round_id,
        voter_id=v.voter_id,
        candidate_id=v.candidate_id,
        vote_type=v.vote_type,
        weight=v.weight,
        created_at=v.created_at,
        candidate_username=v.candidate.username,
    ) for v in created_votes]


@router.get("/rounds/{round_id}/my-votes", response_model=List[VoteOut])
def my_votes(round_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_approved_user)):
    votes = db.query(Vote).filter(Vote.round_id == round_id, Vote.voter_id == current_user.id).all()
    return [VoteOut(
        id=v.id,
        round_id=v.round_id,
        voter_id=v.voter_id,
        candidate_id=v.candidate_id,
        vote_type=v.vote_type,
        weight=v.weight,
        created_at=v.created_at,
        candidate_username=v.candidate.username,
    ) for v in votes]


@router.get("/rounds/{round_id}/has-voted/{vote_type}")
def check_voted(round_id: int, vote_type: str, db: Session = Depends(get_db), current_user: User = Depends(get_approved_user)):
    voted = has_voted(db, round_id, current_user.id, vote_type)
    return {"has_voted": voted}


@router.get("/rounds/{round_id}/breakdown/{vote_type}")
def vote_breakdown(round_id: int, vote_type: str, db: Session = Depends(get_db), current_user: User = Depends(get_approved_user)):
    from app.models.game import VisibilityMode
    round_ = db.query(Round).filter(Round.id == round_id).first()
    if not round_:
        raise HTTPException(404, "Round not found")
    if round_.visibility_mode != VisibilityMode.live and current_user.role != UserRole.admin:
        raise HTTPException(403, "Breakdown only available in live voting mode")
    votes = db.query(Vote).filter(Vote.round_id == round_id, Vote.vote_type == vote_type).all()
    return [{"voter": v.voter.username, "candidate": v.candidate.username} for v in votes]
