import { FormEvent, useEffect, useState } from 'react'
import axios from 'axios'
import { ArrowDown, ArrowUp, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { Stage, Submission, Topic, User, WeeklyTask } from '../../../shared/schema'

interface AdminPanelProps { user: User; token: string }
type Milestone = WeeklyTask['required_milestones'][number]
const milestoneOptions: Milestone[] = ['reading', 'video', 'notes', 'coding', 'mini_project', 'quiz', 'discussion']
const dateInput = (value: Date | string) => new Date(value).toISOString().slice(0, 16)

export default function AdminPanel({ token }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([])
  const [overdue, setOverdue] = useState<Submission[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [tasks, setTasks] = useState<WeeklyTask[]>([])
  const [message, setMessage] = useState('')
  const [stageForm, setStageForm] = useState({ id: '', name: '', order_index: 1, description: '' })
  const [topicForm, setTopicForm] = useState({ id: '', stage_id: '', name: '', order_index: 1, resources: '{}' })
  const [taskForm, setTaskForm] = useState({
    id: '', topic_id: '', week_number: 1, assigned_date: dateInput(new Date()),
    due_date: dateInput(new Date(Date.now() + 7 * 86400000)),
    required_milestones: ['reading'] as Milestone[],
  })
  const headers = { Authorization: `Bearer ${token}` }

  const load = async () => {
    const [userResponse, overdueResponse, curriculumResponse] = await Promise.all([
      axios.get('/api/admin/users', { headers }),
      axios.get('/api/admin/overdue', { headers }),
      axios.get('/api/admin/curriculum', { headers }),
    ])
    setUsers(userResponse.data.users)
    setOverdue(overdueResponse.data.overdue)
    setStages(curriculumResponse.data.stages)
    setTopics(curriculumResponse.data.topics)
    setTasks(curriculumResponse.data.tasks)
  }
  useEffect(() => { load().catch(() => setMessage('Admin data could not be loaded.')) }, [token])

  const save = async (event: FormEvent, kind: 'stages' | 'topics' | 'tasks', form: any) => {
    event.preventDefault()
    setMessage('')
    try {
      const url = form.id ? `/api/admin/${kind}/${form.id}` : `/api/admin/${kind}`
      let body = { ...form }
      if (!form.id && kind === 'stages') body.order_index = stages.length + 1
      if (!form.id && kind === 'topics') {
        body.order_index = topics.filter(topic => topic.stage_id === form.stage_id).length + 1
      }
      if (!form.id && kind === 'tasks') {
        body.week_number = tasks.filter(task => task.topic_id === form.topic_id).length + 1
      }
      if (kind === 'topics') body.resources = JSON.parse(form.resources || '{}')
      await axios.request({ method: form.id ? 'put' : 'post', url, data: body, headers })
      setMessage(`${kind.slice(0, -1)} saved.`)
      await load()
    } catch (error: any) {
      setMessage(error.response?.data?.error || error.message || 'Save failed')
    }
  }

  const chooseStage = (id: string) => {
    const stage = stages.find(item => item.id === id)
    setStageForm(stage ? {
      id: stage.id, name: stage.name, order_index: stage.order_index, description: stage.description,
    } : { id: '', name: '', order_index: stages.length + 1, description: '' })
  }
  const chooseTopic = (id: string) => {
    const topic = topics.find(item => item.id === id)
    setTopicForm(topic ? {
      id: topic.id, stage_id: topic.stage_id, name: topic.name, order_index: topic.order_index,
      resources: JSON.stringify(topic.resources || {}, null, 2),
    } : { id: '', stage_id: stages[0]?.id || '', name: '', order_index: 1, resources: '{}' })
  }
  const chooseTask = (id: string) => {
    const task = tasks.find(item => item.id === id)
    const milestones = task && Array.isArray(task.required_milestones)
      ? task.required_milestones : ['reading'] as Milestone[]
    setTaskForm(task ? {
      id: task.id, topic_id: task.topic_id, week_number: task.week_number,
      assigned_date: dateInput(task.assigned_date), due_date: dateInput(task.due_date),
      required_milestones: milestones,
    } : {
      id: '', topic_id: topics[0]?.id || '', week_number: 1,
      assigned_date: dateInput(new Date()), due_date: dateInput(new Date(Date.now() + 7 * 86400000)),
      required_milestones: ['reading'],
    })
  }
  const toggleMilestone = (milestone: Milestone) => {
    const selected = taskForm.required_milestones.includes(milestone)
    setTaskForm({
      ...taskForm,
      required_milestones: selected
        ? taskForm.required_milestones.filter(item => item !== milestone)
        : [...taskForm.required_milestones, milestone],
    })
  }
  const reorderMilestone = (dragged: Milestone, target: Milestone) => {
    if (dragged === target) return
    const ordered = taskForm.required_milestones.filter(item => item !== dragged)
    ordered.splice(ordered.indexOf(target), 0, dragged)
    setTaskForm({ ...taskForm, required_milestones: ordered })
  }
  const nudgeMilestone = (milestone: Milestone, direction: -1 | 1) => {
    const ordered = [...taskForm.required_milestones]
    const index = ordered.indexOf(milestone)
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= ordered.length) return
    ;[ordered[index], ordered[nextIndex]] = [ordered[nextIndex], ordered[index]]
    setTaskForm({ ...taskForm, required_milestones: ordered })
  }
  const excuse = async (id: string) => {
    const reason = window.prompt('Reason for excuse')
    if (!reason) return
    await axios.post(`/api/submissions/${id}/excuse`, { reason }, { headers })
    await load()
  }

  const moveBefore = <T extends { id: string }>(items: T[], draggedId: string, targetId: string) => {
    const dragged = items.find(item => item.id === draggedId)
    if (!dragged || draggedId === targetId) return items
    const remaining = items.filter(item => item.id !== draggedId)
    const targetIndex = remaining.findIndex(item => item.id === targetId)
    remaining.splice(targetIndex, 0, dragged)
    return remaining
  }

  const reorder = async (kind: 'stages' | 'topics' | 'tasks', parentId: string | null, draggedId: string, targetId: string) => {
    try {
      let orderedIds: string[]
      let data: Record<string, unknown>
      if (kind === 'stages') {
        orderedIds = moveBefore([...stages].sort((a, b) => a.order_index - b.order_index), draggedId, targetId).map(item => item.id)
        data = { ids: orderedIds }
      } else if (kind === 'topics') {
        const siblings = topics.filter(item => item.stage_id === parentId).sort((a, b) => a.order_index - b.order_index)
        orderedIds = moveBefore(siblings, draggedId, targetId).map(item => item.id)
        data = { stage_id: parentId, ids: orderedIds }
      } else {
        const siblings = tasks.filter(item => item.topic_id === parentId).sort((a, b) => a.week_number - b.week_number)
        orderedIds = moveBefore(siblings, draggedId, targetId).map(item => item.id)
        data = { topic_id: parentId, ids: orderedIds }
      }
      await axios.put(`/api/admin/reorder/${kind}`, data, { headers })
      setMessage('Order updated.')
      await load()
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Order could not be updated')
    }
  }

  const nudge = <T extends { id: string }>(
    kind: 'stages' | 'topics' | 'tasks',
    parentId: string | null,
    items: T[],
    currentId: string,
    direction: -1 | 1
  ) => {
    const index = items.findIndex(item => item.id === currentId)
    const adjacent = items[index + direction]
    if (!adjacent) return
    if (direction === -1) void reorder(kind, parentId, currentId, adjacent.id)
    else void reorder(kind, parentId, adjacent.id, currentId)
  }

  const remove = async (kind: 'stages' | 'topics' | 'tasks', id: string, label: string) => {
    const consequence = kind === 'stages'
      ? 'This also deletes every topic, weekly task, submission, and review inside it.'
      : kind === 'topics'
        ? 'This also deletes every weekly task, submission, and review inside it.'
        : 'This also deletes submissions and reviews for this task.'
    if (!window.confirm(`Delete “${label}”? ${consequence}`)) return
    try {
      await axios.delete(`/api/admin/${kind}/${id}`, { headers })
      setMessage(`${kind.slice(0, -1)} deleted.`)
      await load()
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Delete failed')
    }
  }

  return <div className="page">
    <header className="page-header"><div><p className="eyebrow">Club operations</p><h1>Admin workspace</h1><p className="page-description">Shape the curriculum, tune weekly milestones, and resolve accountability blockers.</p></div></header>
    {message && <div className="card">{message}</div>}
    <div className="stats-grid">
      <div className="card"><h3>Members</h3><strong>{users.length}</strong></div>
      <div className="card"><h3>Blocked</h3><strong>{users.filter(item => item.is_blocked).length}</strong></div>
      <div className="card"><h3>Overdue</h3><strong>{overdue.length}</strong></div>
    </div>

    <section className="card hierarchy-card">
      <div className="section-heading">
        <div><h2>Curriculum structure</h2><p className="text-muted">Drag stages, topics, and weekly tasks into order. Ordering is normalized automatically.</p></div>
        <button className="btn-secondary" onClick={() => chooseStage('')}><Plus size={16} /> New stage</button>
      </div>
      <ol className="sortable-list stage-sortable">
        {[...stages].sort((a, b) => a.order_index - b.order_index).map(stage =>
          <li className="sortable-stage" draggable key={stage.id}
            onDragStart={event => { event.stopPropagation(); event.dataTransfer.setData('text/plain', stage.id) }}
            onDragOver={event => { event.preventDefault(); event.stopPropagation() }}
            onDrop={event => { event.preventDefault(); event.stopPropagation(); void reorder('stages', null, event.dataTransfer.getData('text/plain'), stage.id) }}>
            <div className="sortable-row">
              <span className="drag-handle" title="Drag stage"><GripVertical size={18} /></span>
              <span className="order-chip">{stage.order_index}</span>
              <strong>{stage.name}</strong>
              <span className="item-count">{topics.filter(topic => topic.stage_id === stage.id).length} topics</span>
              <button className="icon-button order-button" aria-label={`Move ${stage.name} up`} onClick={() => nudge('stages', null, [...stages].sort((a, b) => a.order_index - b.order_index), stage.id, -1)}><ArrowUp size={14} /></button>
              <button className="icon-button order-button" aria-label={`Move ${stage.name} down`} onClick={() => nudge('stages', null, [...stages].sort((a, b) => a.order_index - b.order_index), stage.id, 1)}><ArrowDown size={14} /></button>
              <button className="icon-button" aria-label={`Edit ${stage.name}`} onClick={() => chooseStage(stage.id)}><Pencil size={16} /></button>
              <button className="icon-button danger-icon" aria-label={`Delete ${stage.name}`} onClick={() => remove('stages', stage.id, stage.name)}><Trash2 size={16} /></button>
            </div>
            <ol className="sortable-list topic-sortable">
              {topics.filter(topic => topic.stage_id === stage.id).sort((a, b) => a.order_index - b.order_index).map(topic =>
                <li className="sortable-topic" draggable key={topic.id}
                  onDragStart={event => { event.stopPropagation(); event.dataTransfer.setData('text/plain', topic.id) }}
                  onDragOver={event => { event.preventDefault(); event.stopPropagation() }}
                  onDrop={event => { event.preventDefault(); event.stopPropagation(); void reorder('topics', stage.id, event.dataTransfer.getData('text/plain'), topic.id) }}>
                  <div className="sortable-row">
                    <span className="drag-handle" title="Drag topic"><GripVertical size={16} /></span>
                    <span className="order-chip">{topic.order_index}</span>
                    <span>{topic.name}</span>
                    <span className="item-count">{tasks.filter(task => task.topic_id === topic.id).length} tasks</span>
                    <button className="icon-button order-button" aria-label={`Move ${topic.name} up`} onClick={() => nudge('topics', stage.id, topics.filter(item => item.stage_id === stage.id).sort((a, b) => a.order_index - b.order_index), topic.id, -1)}><ArrowUp size={13} /></button>
                    <button className="icon-button order-button" aria-label={`Move ${topic.name} down`} onClick={() => nudge('topics', stage.id, topics.filter(item => item.stage_id === stage.id).sort((a, b) => a.order_index - b.order_index), topic.id, 1)}><ArrowDown size={13} /></button>
                    <button className="icon-button" aria-label={`Edit ${topic.name}`} onClick={() => chooseTopic(topic.id)}><Pencil size={15} /></button>
                    <button className="icon-button danger-icon" aria-label={`Delete ${topic.name}`} onClick={() => remove('topics', topic.id, topic.name)}><Trash2 size={15} /></button>
                  </div>
                  <ol className="sortable-list task-sortable">
                    {tasks.filter(task => task.topic_id === topic.id).sort((a, b) => a.week_number - b.week_number).map(task =>
                      <li className="sortable-task" draggable key={task.id}
                        onDragStart={event => { event.stopPropagation(); event.dataTransfer.setData('text/plain', task.id) }}
                        onDragOver={event => { event.preventDefault(); event.stopPropagation() }}
                        onDrop={event => { event.preventDefault(); event.stopPropagation(); void reorder('tasks', topic.id, event.dataTransfer.getData('text/plain'), task.id) }}>
                        <div className="sortable-row">
                          <span className="drag-handle" title="Drag weekly task"><GripVertical size={15} /></span>
                          <span className="order-chip">{task.week_number}</span>
                          <span>Weekly task</span>
                          <span className="milestone-summary">{task.required_milestones.length} milestones</span>
                          <button className="icon-button order-button" aria-label={`Move week ${task.week_number} up`} onClick={() => nudge('tasks', topic.id, tasks.filter(item => item.topic_id === topic.id).sort((a, b) => a.week_number - b.week_number), task.id, -1)}><ArrowUp size={12} /></button>
                          <button className="icon-button order-button" aria-label={`Move week ${task.week_number} down`} onClick={() => nudge('tasks', topic.id, tasks.filter(item => item.topic_id === topic.id).sort((a, b) => a.week_number - b.week_number), task.id, 1)}><ArrowDown size={12} /></button>
                          <button className="icon-button" aria-label={`Edit week ${task.week_number}`} onClick={() => chooseTask(task.id)}><Pencil size={14} /></button>
                          <button className="icon-button danger-icon" aria-label={`Delete week ${task.week_number}`} onClick={() => remove('tasks', task.id, `Week ${task.week_number}`)}><Trash2 size={14} /></button>
                        </div>
                      </li>)}
                  </ol>
                </li>)}
            </ol>
          </li>)}
      </ol>
    </section>

    <div className="card">
      <h2>Stages</h2>
      <select value={stageForm.id} onChange={event => chooseStage(event.target.value)}>
        <option value="">Create a new stage</option>
        {stages.map(stage => <option key={stage.id} value={stage.id}>{stage.order_index}. {stage.name}</option>)}
      </select>
      <form className="editor-grid" onSubmit={event => save(event, 'stages', stageForm)}>
        <label>Name<input value={stageForm.name} onChange={event => setStageForm({ ...stageForm, name: event.target.value })} required /></label>
        <label className="full-row">Description<textarea value={stageForm.description} onChange={event => setStageForm({ ...stageForm, description: event.target.value })} /></label>
        <button className="btn-primary" type="submit">{stageForm.id ? 'Update stage' : 'Create stage'}</button>
      </form>
    </div>

    <div className="card">
      <h2>Topics</h2>
      <select value={topicForm.id} onChange={event => chooseTopic(event.target.value)}>
        <option value="">Create a new topic</option>
        {topics.map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
      </select>
      <form className="editor-grid" onSubmit={event => save(event, 'topics', topicForm)}>
        <label>Stage<select value={topicForm.stage_id} onChange={event => setTopicForm({ ...topicForm, stage_id: event.target.value })} required><option value="">Select stage</option>{stages.map(stage => <option key={stage.id} value={stage.id}>{stage.name}</option>)}</select></label>
        <label>Name<input value={topicForm.name} onChange={event => setTopicForm({ ...topicForm, name: event.target.value })} required /></label>
        <label className="full-row">Resources (JSON)<textarea rows={5} value={topicForm.resources} onChange={event => setTopicForm({ ...topicForm, resources: event.target.value })} /></label>
        <button className="btn-primary" type="submit">{topicForm.id ? 'Update topic' : 'Create topic'}</button>
      </form>
    </div>

    <div className="card">
      <h2>Weekly tasks and milestones</h2>
      <select value={taskForm.id} onChange={event => chooseTask(event.target.value)}>
        <option value="">Create a new weekly task</option>
        {tasks.map(task => <option key={task.id} value={task.id}>Week {task.week_number} · {topics.find(topic => topic.id === task.topic_id)?.name}</option>)}
      </select>
      <form className="editor-grid" onSubmit={event => save(event, 'tasks', taskForm)}>
        <label>Topic<select value={taskForm.topic_id} onChange={event => setTaskForm({ ...taskForm, topic_id: event.target.value })} required><option value="">Select topic</option>{topics.map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></label>
        <label>Assigned<input type="datetime-local" value={taskForm.assigned_date} onChange={event => setTaskForm({ ...taskForm, assigned_date: event.target.value })} required /></label>
        <label>Due<input type="datetime-local" value={taskForm.due_date} onChange={event => setTaskForm({ ...taskForm, due_date: event.target.value })} required /></label>
        <fieldset className="full-row milestone-picker"><legend>Required milestones</legend>
          <p className="field-help">Choose milestones, then drag the selected list into completion order.</p>
          <div className="milestone-options">{milestoneOptions.map(milestone =>
            <label key={milestone}><input type="checkbox" checked={taskForm.required_milestones.includes(milestone)} onChange={() => toggleMilestone(milestone)} /> {milestone.replace('_', ' ')}</label>)}</div>
          <ol className="milestone-order-list">
            {taskForm.required_milestones.map((milestone, index) =>
              <li draggable key={milestone}
                onDragStart={event => event.dataTransfer.setData('text/plain', milestone)}
                onDragOver={event => event.preventDefault()}
                onDrop={event => { event.preventDefault(); reorderMilestone(event.dataTransfer.getData('text/plain') as Milestone, milestone) }}>
                <GripVertical size={15} /><span className="order-chip">{index + 1}</span><span>{milestone.replace('_', ' ')}</span>
                <button type="button" className="icon-button order-button" aria-label={`Move ${milestone} up`} onClick={() => nudgeMilestone(milestone, -1)}><ArrowUp size={13} /></button>
                <button type="button" className="icon-button order-button" aria-label={`Move ${milestone} down`} onClick={() => nudgeMilestone(milestone, 1)}><ArrowDown size={13} /></button>
              </li>)}
          </ol>
        </fieldset>
        <button className="btn-primary" type="submit">{taskForm.id ? 'Update task' : 'Create task'}</button>
      </form>
    </div>

    <div className="card"><h2>Overdue work</h2>{overdue.map(item =>
      <p key={item.id}>{item.user_id} · {item.milestone_type} <button className="btn-secondary" onClick={() => excuse(item.id)}>Excuse</button></p>)}
      {overdue.length === 0 && <p>No overdue work.</p>}
    </div>
  </div>
}
