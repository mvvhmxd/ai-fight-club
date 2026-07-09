import { useEffect, useState } from 'react'
import axios from 'axios'
import { AlertTriangle, Flame, Trophy } from 'lucide-react'
import { Achievement, Streak, Submission, User } from '../../../shared/schema'

interface DashboardProps { user: User; token: string }

export default function Dashboard({ user, token }: DashboardProps) {
  const [data, setData] = useState<{ submissions: Submission[]; streak: Streak | null; achievements: Achievement[] }>()

  useEffect(() => {
    axios.get(`/api/users/${user.id}/progress`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(response => setData(response.data))
  }, [token, user.id])

  const overdue = data?.submissions.filter(item => item.status === 'overdue') || []
  return (
    <div className="page">
      <header className="page-header"><div><p className="eyebrow">Your training room</p><h1>Good to see you, {user.name.split(' ')[0]}</h1><p className="page-description">Stay on pace, clear your queue, and keep the streak alive.</p></div></header>
      {user.is_blocked && <div className="card status-blocked">Submissions are blocked until overdue work is resolved.</div>}
      <div className="stats-grid">
        <div className="card stat-card"><Flame size={20} /><h3>Current streak</h3><strong>{data?.streak?.current_streak_weeks || 0} weeks</strong></div>
        <div className="card stat-card"><Trophy size={20} /><h3>Achievements</h3><strong>{data?.achievements.length || 0}</strong></div>
        <div className="card stat-card"><AlertTriangle size={20} /><h3>Overdue</h3><strong>{overdue.length}</strong></div>
      </div>
      <div className="card">
        <h2>Recent work</h2>
        <p className="text-muted mb-md">Your five latest milestones</p>
        {data?.submissions.slice(0, 5).map(item => (
          <p key={item.id}>{item.milestone_type} <span className={`badge badge-${item.status === 'approved' ? 'success' : item.status === 'overdue' ? 'error' : 'warning'}`}>{item.status}</span></p>
        ))}
        {data?.submissions.length === 0 && <p>No submissions yet. Start in Curriculum.</p>}
      </div>
    </div>
  )
}
