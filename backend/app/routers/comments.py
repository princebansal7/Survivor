from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.core.deps import get_approved_user
from app.models.user import User
from app.models.game import GamePlayer, PlayerStatus, Round
from app.models.comment import Comment
from app.schemas.comment import CommentCreate, CommentOut

router = APIRouter(prefix="/comments", tags=["comments"])


@router.post("/rounds/{round_id}", response_model=CommentOut, status_code=201)
def post_comment(round_id: int, body: CommentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_approved_user)):
    round_ = db.query(Round).filter(Round.id == round_id).first()
    if not round_:
        raise HTTPException(404, "Round not found")

    player = db.query(GamePlayer).filter(
        GamePlayer.game_id == round_.game_id,
        GamePlayer.user_id == current_user.id,
    ).first()
    if player and player.status == PlayerStatus.eliminated:
        raise HTTPException(403, "Eliminated players cannot comment")

    if not body.content.strip():
        raise HTTPException(400, "Comment cannot be empty")

    comment = Comment(round_id=round_id, user_id=current_user.id, content=body.content.strip())
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return CommentOut(
        id=comment.id,
        round_id=comment.round_id,
        user_id=comment.user_id,
        author_username=current_user.username,
        content=comment.content,
        created_at=comment.created_at,
    )


@router.get("/rounds/{round_id}", response_model=List[CommentOut])
def get_comments(round_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_approved_user)):
    comments = db.query(Comment).filter(Comment.round_id == round_id).order_by(Comment.created_at).all()
    return [CommentOut(
        id=c.id,
        round_id=c.round_id,
        user_id=c.user_id,
        author_username=c.author.username,
        content=c.content,
        created_at=c.created_at,
    ) for c in comments]
