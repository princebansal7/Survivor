from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.models.game import Round, GamePlayer, PlayerStatus, RoundState, Game
from app.models.vote import Vote
from app.models.user import User
from app.schemas.vote import VoteResults, CandidateResult


def calculate_vote_results(db: Session, round_id: int, vote_type: str) -> VoteResults:
    round_ = db.query(Round).filter(Round.id == round_id).first()
    game = db.query(Game).filter(Game.id == round_.game_id).first()

    votes = db.query(Vote).filter(
        Vote.round_id == round_id,
        Vote.vote_type == vote_type,
    ).all()

    tally: dict[int, float] = {}
    raw_counts: dict[int, int] = {}
    voters = set()

    for vote in votes:
        tally[vote.candidate_id] = tally.get(vote.candidate_id, 0) + vote.weight
        raw_counts[vote.candidate_id] = raw_counts.get(vote.candidate_id, 0) + 1
        voters.add(vote.voter_id)

    results = []
    for user_id, weighted_count in sorted(tally.items(), key=lambda x: -x[1]):
        user = db.query(User).filter(User.id == user_id).first()
        results.append(CandidateResult(
            user_id=user_id,
            username=user.username if user else "Unknown",
            vote_count=weighted_count,
            raw_votes=raw_counts.get(user_id, 0),
        ))

    is_tie = False
    winner = None
    tied_players = []

    if results:
        max_votes = results[0].vote_count
        tied = [r for r in results if r.vote_count == max_votes]
        if len(tied) > 1:
            is_tie = True
            tied_players = tied
        else:
            winner = tied[0]

    return VoteResults(
        vote_type=vote_type,
        results=results,
        winner=winner,
        is_tie=is_tie,
        tied_players=tied_players,
        total_votes=len(votes),
        voters_who_voted=list(voters),
    )


def get_active_players(db: Session, game_id: int) -> List[GamePlayer]:
    return db.query(GamePlayer).filter(
        GamePlayer.game_id == game_id,
        GamePlayer.status.in_([PlayerStatus.active, PlayerStatus.captain, PlayerStatus.immune]),
    ).all()


def has_voted(db: Session, round_id: int, voter_id: int, vote_type: str) -> bool:
    return db.query(Vote).filter(
        Vote.round_id == round_id,
        Vote.voter_id == voter_id,
        Vote.vote_type == vote_type,
    ).first() is not None


def get_player_vote_weight(db: Session, game_id: int, voter_id: int, vote_type: str) -> float:
    if vote_type != "elimination":
        return 1.0
    game = db.query(Game).filter(Game.id == game_id).first()
    round_ = db.query(Round).filter(
        Round.game_id == game_id,
        Round.state.in_([RoundState.elimination_voting_open, RoundState.elimination_voting_closed]),
    ).order_by(Round.round_number.desc()).first()
    if round_ and round_.captain_id == voter_id:
        return game.captain_vote_weight
    return 1.0
