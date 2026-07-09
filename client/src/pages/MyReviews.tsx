import { useEffect, useState } from 'react'
import axios from 'axios'
import { Check, ClipboardCheck, ExternalLink, GitPullRequest, RotateCcw, X } from 'lucide-react'
import { Review, User } from '../../../shared/schema'

interface MyReviewsProps { user: User; token: string }
type ReviewDetails = Review & {
  submitter_name?: string
  reviewer_name?: string
  milestone_type?: string
  github_url?: string | null
}

export default function MyReviews({ user, token }: MyReviewsProps) {
  const [reviews, setReviews] = useState<ReviewDetails[]>([])
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const headers = { Authorization: `Bearer ${token}` }
  const load = () => {
    setLoading(true)
    const url = user.role === 'admin' ? '/api/admin/reviews' : `/api/users/${user.id}/reviews`
    return axios.get(url, { headers })
      .then(response => { setReviews(response.data.reviews); setError('') })
      .catch(err => setError(err.response?.data?.error || 'Reviews could not be loaded'))
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    void load()
  }, [token, user.id, user.role])

  const decide = async (review: ReviewDetails, decision: 'approve' | 'changes_requested' | 'reject') => {
    await axios.post(`/api/submissions/${review.submission_id}/review`, {
      feedback: feedback[review.id], decision,
    }, { headers })
    await load()
  }

  return <div className="page">
    <header className="page-header">
      <div><p className="eyebrow">{user.role === 'admin' ? 'Quality control' : 'Peer queue'}</p>
        <h1>{user.role === 'admin' ? 'Review oversight' : 'My reviews'}</h1>
        <p className="page-description">{user.role === 'admin' ? 'Inspect pending and completed peer reviews across the club.' : 'Give useful feedback and keep your teammates moving.'}</p>
      </div>
      <span className="count-pill">{reviews.filter(review => !review.reviewed_at).length} pending</span>
    </header>
    {loading && <div className="card">Loading reviews…</div>}
    {error && <div className="card status-blocked">{error}</div>}
    {reviews.map(review => <article className="card review-card" key={review.id}>
      <div className="review-heading">
        <div className="review-icon"><GitPullRequest size={21} /></div>
        <div><h2>{review.submitter_name || `Submission #${review.submission_id}`}</h2>
          <p className="text-muted">{review.milestone_type?.replace('_', ' ') || 'Project submission'} · Reviewer: {review.reviewer_name || `#${review.reviewer_id}`}</p></div>
        <span className={`badge ${review.reviewed_at ? 'badge-info' : 'badge-warning'}`}>{review.reviewed_at ? 'Completed' : 'Awaiting review'}</span>
      </div>
      {review.github_url && <a className="repo-link" href={review.github_url} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Open GitHub repository</a>}
      {review.reviewed_at ? <div className="review-result"><strong>{review.decision?.replace('_', ' ')}</strong><p>{review.feedback}</p></div> : <>
        <label htmlFor={`feedback-${review.id}`}>Review feedback</label>
        <textarea id={`feedback-${review.id}`} rows={5} value={feedback[review.id] || ''} onChange={event => setFeedback({ ...feedback, [review.id]: event.target.value })} placeholder="Call out what works, what can improve, and one useful next step…" />
        <div className="button-row review-actions">
          <button className="btn-success" onClick={() => decide(review, 'approve')}><Check size={17} /> Approve</button>
          <button className="btn-secondary" onClick={() => decide(review, 'changes_requested')}><RotateCcw size={17} /> Request changes</button>
          <button className="btn-danger btn-quiet-danger" onClick={() => decide(review, 'reject')}><X size={17} /> Reject</button>
        </div>
      </>}
    </article>)}
    {!loading && !error && reviews.length === 0 && <div className="card empty-state"><ClipboardCheck size={28} /><h2>Queue cleared</h2><p>No reviews need your attention right now.</p></div>}
  </div>
}
