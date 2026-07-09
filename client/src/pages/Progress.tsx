import { useEffect, useState } from 'react'
import axios from 'axios'
import { Achievement, Streak, Submission, User } from '../../../shared/schema'

interface ProgressProps { user: User; token: string }

export default function Progress({ user, token }: ProgressProps) {
  const [data, setData] = useState<{ submissions: Submission[]; streak: Streak | null; achievements: Achievement[] }>()
  useEffect(() => {
    axios.get(`/api/users/${user.id}/progress`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(response => setData(response.data))
  }, [token, user.id])

  return <div className="page">
    <header className="page-header"><div><p className="eyebrow">Performance</p><h1>Your progress</h1><p className="page-description">A record of the work you shipped and the momentum you built.</p></div></header>
    <div className="card">
      <h2>Achievements</h2>
      {data?.achievements.map(item => <span className="badge badge-success achievement" key={item.id}>{item.type.replaceAll('_', ' ')}</span>)}
      {data?.achievements.length === 0 && <p>No achievements yet.</p>}
    </div>
    <div className="card">
      <h2>Submission history</h2>
      <table><thead><tr><th>Milestone</th><th>Status</th><th>Submitted</th></tr></thead>
        <tbody>{data?.submissions.map(item => <tr key={item.id}><td>{item.milestone_type.replace('_', ' ')}</td><td><span className={`badge badge-${item.status === 'approved' ? 'success' : item.status === 'overdue' ? 'error' : 'warning'}`}>{item.status}</span></td><td>{item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : '—'}</td></tr>)}</tbody>
      </table>
    </div>
  </div>
}
