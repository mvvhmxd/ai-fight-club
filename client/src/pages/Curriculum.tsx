import { useEffect, useState } from 'react'
import axios from 'axios'
import { Lock } from 'lucide-react'
import { Stage, Topic, User, WeeklyTask } from '../../../shared/schema'

type TopicWithLock = Topic & { locked: boolean }
interface CurriculumProps { user: User; token: string }

export default function Curriculum({ user, token }: CurriculumProps) {
  const [stages, setStages] = useState<Stage[]>([])
  const [topics, setTopics] = useState<Record<string, TopicWithLock[]>>({})
  const [tasks, setTasks] = useState<WeeklyTask[]>([])
  const [selected, setSelected] = useState<TopicWithLock>()
  const [githubUrl, setGithubUrl] = useState('')
  const [message, setMessage] = useState('')
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    axios.get('/api/stages', { headers }).then(async response => {
      setStages(response.data.stages)
      const entries = await Promise.all(response.data.stages.map(async (stage: Stage) => {
        const result = await axios.get(`/api/stages/${stage.id}/topics`, { headers })
        return [stage.id, result.data.topics] as const
      }))
      setTopics(Object.fromEntries(entries))
    })
  }, [token])

  const openTopic = async (topic: TopicWithLock) => {
    if (topic.locked) return
    setSelected(topic)
    const response = await axios.get(`/api/topics/${topic.id}/tasks`, { headers })
    setTasks(response.data.tasks)
  }

  const submit = async (task: WeeklyTask, milestone: string) => {
    setMessage('')
    try {
      await axios.post('/api/submissions', {
        weekly_task_id: task.id, milestone_type: milestone,
        github_url: ['coding', 'mini_project'].includes(milestone) ? githubUrl : undefined,
      }, { headers })
      setMessage('Submission recorded.')
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Submission failed')
    }
  }

  return <div className="page">
    <header className="page-header"><div><p className="eyebrow">Learning path</p><h1>Curriculum</h1><p className="page-description">Work through each stage in order. Finishing a topic unlocks the next challenge.</p></div></header>
    {stages.map(stage => <div className="card" key={stage.id}>
      <h2>{stage.order_index}. {stage.name}</h2><p className="text-muted">{stage.description}</p>
      <div className="topic-list">{topics[stage.id]?.map(topic =>
        <button className="btn-secondary" disabled={topic.locked} key={topic.id} onClick={() => openTopic(topic)}>
          {topic.locked && <Lock size={15} />}{topic.name}
        </button>)}</div>
    </div>)}
    {selected && <div className="card">
      <h2>{selected.name}</h2>
      <input className="wide-input" value={githubUrl} onChange={event => setGithubUrl(event.target.value)} placeholder="GitHub repository URL (for coding/project milestones)" />
      {tasks.map(task => <div key={task.id} className="task">
        <strong>Week {task.week_number}</strong> · due {new Date(task.due_date).toLocaleDateString()}
        <div className="button-row">{task.required_milestones.map(milestone =>
          <button className="btn-primary" disabled={user.is_blocked} key={milestone} onClick={() => submit(task, milestone)}>{milestone.replace('_', ' ')}</button>)}</div>
      </div>)}
      {message && <p>{message}</p>}
    </div>}
  </div>
}
