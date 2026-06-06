'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { commentApi } from '@/lib/api'
import { Comment } from '@/types'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  roundId: number
  canComment: boolean
}

export default function CommentsSection({ roundId, canComment }: Props) {
  const [content, setContent] = useState('')
  const qc = useQueryClient()

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ['comments', roundId],
    queryFn: () => commentApi.get(roundId).then(r => r.data),
    refetchInterval: 10_000,
  })

  const { mutate: postComment, isPending } = useMutation({
    mutationFn: () => commentApi.post(roundId, content),
    onSuccess: () => {
      setContent('')
      qc.invalidateQueries({ queryKey: ['comments', roundId] })
    },
  })

  return (
    <div className="card space-y-4">
      <h3 className="font-semibold text-tribal-200">Discussion</h3>

      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {comments.length === 0 && (
          <p className="text-tribal-600 text-sm text-center py-4">No comments yet. Start the discussion!</p>
        )}
        {comments.map(c => (
          <div key={c.id} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-dark-muted flex items-center justify-center text-xs font-bold text-tribal-400 flex-shrink-0">
              {c.author_username.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-tribal-300 text-sm font-medium">{c.author_username}</span>
                <span className="text-tribal-600 text-xs">
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-tribal-400 text-sm mt-0.5 break-words">{c.content}</p>
            </div>
          </div>
        ))}
      </div>

      {canComment ? (
        <div className="flex gap-2">
          <input
            className="input flex-1"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Add a comment..."
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && content.trim() && postComment()}
            maxLength={500}
          />
          <button
            onClick={() => content.trim() && postComment()}
            disabled={!content.trim() || isPending}
            className="btn-primary flex-shrink-0"
          >
            Post
          </button>
        </div>
      ) : (
        <p className="text-tribal-600 text-sm text-center">Eliminated players cannot comment.</p>
      )}
    </div>
  )
}
