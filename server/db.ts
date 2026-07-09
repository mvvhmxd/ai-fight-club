import mysql from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { User, Stage, Topic, WeeklyTask, Submission, Review, Streak, Achievement, DiscussionSession, Excuse } from '../shared/schema';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'ai_fight_club',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function query<T>(sql: string, values?: any[]): Promise<T[]> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(sql, values);
    return rows as T[];
  } finally {
    connection.release();
  }
}

export async function queryOne<T>(sql: string, values?: any[]): Promise<T | null> {
  const results = await query<T>(sql, values);
  return results.length > 0 ? results[0] : null;
}

export async function execute(sql: string, values?: any[]): Promise<any> {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(sql, values);
    return result;
  } finally {
    connection.release();
  }
}

// User queries
export async function getUserById(id: string): Promise<User | null> {
  return queryOne<User>(
    'SELECT * FROM `user` WHERE id = ?',
    [id]
  );
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return queryOne<User>(
    'SELECT * FROM `user` WHERE email = ?',
    [email]
  );
}

export async function createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
  const id = randomUUID();
  await execute(
    'INSERT INTO `user` (id, name, email, password_hash, role, joined_date, current_stage_id, timezone, is_blocked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, user.name, user.email, user.password_hash, user.role, user.joined_date, user.current_stage_id, user.timezone, user.is_blocked]
  );
  const newUser = await getUserById(id);
  if (!newUser) throw new Error('Failed to create user');
  return newUser;
}

export async function updateUserBlockStatus(userId: string, isBlocked: boolean): Promise<void> {
  await execute(
    'UPDATE `user` SET is_blocked = ? WHERE id = ?',
    [isBlocked, userId]
  );
}

export async function getAllUsers(): Promise<User[]> {
  return query<User>('SELECT * FROM `user` ORDER BY joined_date DESC');
}

// Stage queries
export async function getStages(): Promise<Stage[]> {
  return query<Stage>('SELECT * FROM `stage` ORDER BY order_index ASC');
}

export async function getStageById(id: string): Promise<Stage | null> {
  return queryOne<Stage>('SELECT * FROM `stage` WHERE id = ?', [id]);
}

export async function createStage(stage: Omit<Stage, 'id' | 'created_at' | 'updated_at'>): Promise<Stage> {
  const id = randomUUID();
  await execute(
    'INSERT INTO `stage` (id, name, order_index, description) VALUES (?, ?, ?, ?)',
    [id, stage.name, stage.order_index, stage.description]
  );
  const newStage = await getStageById(id);
  if (!newStage) throw new Error('Failed to create stage');
  return newStage;
}

export async function updateStage(
  id: string,
  changes: Pick<Stage, 'name' | 'order_index' | 'description'>
): Promise<Stage> {
  await execute(
    'UPDATE `stage` SET name = ?, order_index = ?, description = ? WHERE id = ?',
    [changes.name, changes.order_index, changes.description, id]
  );
  const stage = await getStageById(id);
  if (!stage) throw new Error('Stage not found');
  return stage;
}

export async function deleteStage(id: string): Promise<void> {
  await execute('DELETE FROM `stage` WHERE id = ?', [id]);
}

export async function reorderStages(ids: string[]): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute('SELECT id FROM `stage` ORDER BY order_index');
    const existing = (rows as Array<{ id: string }>).map(row => String(row.id));
    if (existing.length !== ids.length || existing.some(id => !ids.includes(id))) {
      throw new Error('Stage order must contain every stage exactly once');
    }
    for (let index = 0; index < ids.length; index++) {
      await connection.execute('UPDATE `stage` SET order_index = ? WHERE id = ?', [-(index + 1000), ids[index]]);
    }
    for (let index = 0; index < ids.length; index++) {
      await connection.execute('UPDATE `stage` SET order_index = ? WHERE id = ?', [index + 1, ids[index]]);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Topic queries
export async function getTopicsByStageId(stageId: string): Promise<Topic[]> {
  return query<Topic>(
    'SELECT * FROM `topic` WHERE stage_id = ? ORDER BY order_index ASC',
    [stageId]
  );
}

export async function getAllTopics(): Promise<Topic[]> {
  return query<Topic>('SELECT * FROM `topic` ORDER BY stage_id, order_index ASC');
}

export async function getTopicById(id: string): Promise<Topic | null> {
  return queryOne<Topic>('SELECT * FROM `topic` WHERE id = ?', [id]);
}

export async function createTopic(topic: Omit<Topic, 'id' | 'created_at' | 'updated_at'>): Promise<Topic> {
  const id = randomUUID();
  await execute(
    'INSERT INTO `topic` (id, stage_id, name, order_index, resources) VALUES (?, ?, ?, ?, ?)',
    [id, topic.stage_id, topic.name, topic.order_index, JSON.stringify(topic.resources)]
  );
  const newTopic = await getTopicById(id);
  if (!newTopic) throw new Error('Failed to create topic');
  return newTopic;
}

export async function updateTopic(
  id: string,
  changes: Pick<Topic, 'stage_id' | 'name' | 'order_index' | 'resources'>
): Promise<Topic> {
  await execute(
    'UPDATE `topic` SET stage_id = ?, name = ?, order_index = ?, resources = ? WHERE id = ?',
    [changes.stage_id, changes.name, changes.order_index, JSON.stringify(changes.resources), id]
  );
  const topic = await getTopicById(id);
  if (!topic) throw new Error('Topic not found');
  return topic;
}

export async function deleteTopic(id: string): Promise<void> {
  await execute('DELETE FROM `topic` WHERE id = ?', [id]);
}

export async function reorderTopics(stageId: string, ids: string[]): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      'SELECT id FROM `topic` WHERE stage_id = ? ORDER BY order_index',
      [stageId]
    );
    const existing = (rows as Array<{ id: string }>).map(row => String(row.id));
    if (existing.length !== ids.length || existing.some(id => !ids.includes(id))) {
      throw new Error('Topic order must contain every topic in the stage exactly once');
    }
    for (let index = 0; index < ids.length; index++) {
      await connection.execute('UPDATE `topic` SET order_index = ? WHERE id = ?', [-(index + 1000), ids[index]]);
    }
    for (let index = 0; index < ids.length; index++) {
      await connection.execute('UPDATE `topic` SET order_index = ? WHERE id = ?', [index + 1, ids[index]]);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Weekly task queries
export async function getWeeklyTasksByTopicId(topicId: string): Promise<WeeklyTask[]> {
  return query<WeeklyTask>(
    'SELECT * FROM `weekly_task` WHERE topic_id = ? ORDER BY week_number ASC',
    [topicId]
  );
}

export async function getAllWeeklyTasks(): Promise<WeeklyTask[]> {
  return query<WeeklyTask>('SELECT * FROM `weekly_task` ORDER BY assigned_date, week_number ASC');
}

export async function getWeeklyTaskById(id: string): Promise<WeeklyTask | null> {
  return queryOne<WeeklyTask>('SELECT * FROM `weekly_task` WHERE id = ?', [id]);
}

export async function createWeeklyTask(task: Omit<WeeklyTask, 'id' | 'created_at' | 'updated_at'>): Promise<WeeklyTask> {
  const id = randomUUID();
  await execute(
    'INSERT INTO `weekly_task` (id, topic_id, week_number, assigned_date, due_date, required_milestones) VALUES (?, ?, ?, ?, ?, ?)',
    [id, task.topic_id, task.week_number, task.assigned_date, task.due_date, JSON.stringify(task.required_milestones)]
  );
  const newTask = await getWeeklyTaskById(id);
  if (!newTask) throw new Error('Failed to create weekly task');
  return newTask;
}

export async function updateWeeklyTask(
  id: string,
  changes: Pick<WeeklyTask, 'topic_id' | 'week_number' | 'assigned_date' | 'due_date' | 'required_milestones'>
): Promise<WeeklyTask> {
  await execute(
    'UPDATE `weekly_task` SET topic_id = ?, week_number = ?, assigned_date = ?, due_date = ?, required_milestones = ? WHERE id = ?',
    [
      changes.topic_id, changes.week_number, changes.assigned_date, changes.due_date,
      JSON.stringify(changes.required_milestones), id,
    ]
  );
  const task = await getWeeklyTaskById(id);
  if (!task) throw new Error('Task not found');
  return task;
}

export async function deleteWeeklyTask(id: string): Promise<void> {
  await execute('DELETE FROM `weekly_task` WHERE id = ?', [id]);
}

export async function reorderWeeklyTasks(topicId: string, ids: string[]): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      'SELECT id FROM `weekly_task` WHERE topic_id = ? ORDER BY week_number, assigned_date',
      [topicId]
    );
    const existing = (rows as Array<{ id: string }>).map(row => String(row.id));
    if (existing.length !== ids.length || existing.some(id => !ids.includes(id))) {
      throw new Error('Task order must contain every task in the topic exactly once');
    }
    for (let index = 0; index < ids.length; index++) {
      await connection.execute('UPDATE `weekly_task` SET week_number = ? WHERE id = ?', [index + 1, ids[index]]);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Submission queries
export async function getSubmissionById(id: string): Promise<Submission | null> {
  return queryOne<Submission>('SELECT * FROM `submission` WHERE id = ?', [id]);
}

export async function getSubmissionsByUserId(userId: string): Promise<Submission[]> {
  return query<Submission>(
    'SELECT * FROM `submission` WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
}

export async function getSubmissionsByWeeklyTaskId(weeklyTaskId: string): Promise<Submission[]> {
  return query<Submission>(
    'SELECT * FROM `submission` WHERE weekly_task_id = ? ORDER BY created_at DESC',
    [weeklyTaskId]
  );
}

export async function getOverdueSubmissions(): Promise<Submission[]> {
  return query<Submission>(
    'SELECT s.* FROM `submission` s JOIN `weekly_task` wt ON s.weekly_task_id = wt.id WHERE s.status = "overdue" OR (s.status = "pending" AND wt.due_date < NOW())'
  );
}

export async function markExpiredSubmissionsOverdue(): Promise<string[]> {
  await execute(
    `INSERT IGNORE INTO \`submission\` (user_id, weekly_task_id, milestone_type, status)
     SELECT u.id, wt.id, milestones.milestone, "pending"
       FROM \`user\` u
       JOIN \`weekly_task\` wt ON wt.due_date < NOW()
       JOIN JSON_TABLE(
         wt.required_milestones,
         '$[*]' COLUMNS (milestone VARCHAR(32) PATH '$')
       ) milestones
      WHERE u.role = "member"`
  );
  const expired = await query<Submission>(
    'SELECT s.* FROM `submission` s JOIN `weekly_task` wt ON s.weekly_task_id = wt.id WHERE s.status = "pending" AND wt.due_date < NOW()'
  );
  if (expired.length === 0) return [];

  const ids = expired.map(submission => submission.id);
  await execute(
    `UPDATE \`submission\` SET status = "overdue" WHERE id IN (${ids.map(() => '?').join(',')})`,
    ids
  );
  return [...new Set(expired.map(submission => submission.user_id))];
}

export async function hasOverdueSubmissions(userId: string): Promise<boolean> {
  const row = await queryOne<{ total: number }>(
    'SELECT COUNT(*) AS total FROM `submission` WHERE user_id = ? AND status = "overdue"',
    [userId]
  );
  return Number(row?.total || 0) > 0;
}

export async function createSubmission(submission: Omit<Submission, 'id' | 'created_at' | 'updated_at'>): Promise<Submission> {
  const id = randomUUID();
  await execute(
    'INSERT INTO `submission` (id, user_id, weekly_task_id, milestone_type, status, submitted_at, github_url, notes_content, quiz_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, submission.user_id, submission.weekly_task_id, submission.milestone_type, submission.status, submission.submitted_at, submission.github_url, submission.notes_content, submission.quiz_score]
  );
  const newSubmission = await getSubmissionById(id);
  if (!newSubmission) throw new Error('Failed to create submission');
  return newSubmission;
}

export async function updateSubmissionStatus(submissionId: string, status: string): Promise<void> {
  await execute(
    'UPDATE `submission` SET status = ? WHERE id = ?',
    [status, submissionId]
  );
}

// Review queries
export async function getReviewById(id: string): Promise<Review | null> {
  return queryOne<Review>('SELECT * FROM `review` WHERE id = ?', [id]);
}

export async function getReviewsByReviewerId(reviewerId: string): Promise<Review[]> {
  return query<Review>(
    `SELECT r.*, submitter.name AS submitter_name, reviewer.name AS reviewer_name,
            s.milestone_type, s.github_url
       FROM \`review\` r
       JOIN \`submission\` s ON r.submission_id = s.id
       JOIN \`user\` submitter ON s.user_id = submitter.id
       JOIN \`user\` reviewer ON r.reviewer_id = reviewer.id
      WHERE r.reviewer_id = ?
      ORDER BY r.created_at DESC`,
    [reviewerId]
  );
}

export async function getAllReviews(): Promise<Review[]> {
  return query<Review>(
    `SELECT r.*, submitter.name AS submitter_name, reviewer.name AS reviewer_name,
            s.milestone_type, s.github_url
       FROM \`review\` r
       JOIN \`submission\` s ON r.submission_id = s.id
       JOIN \`user\` submitter ON s.user_id = submitter.id
       JOIN \`user\` reviewer ON r.reviewer_id = reviewer.id
      ORDER BY r.created_at DESC`
  );
}

export async function hasCompletedReview(reviewerId: string): Promise<boolean> {
  const row = await queryOne<{ total: number }>(
    'SELECT COUNT(*) AS total FROM `review` WHERE reviewer_id = ? AND reviewed_at IS NOT NULL',
    [reviewerId]
  );
  return Number(row?.total || 0) > 0;
}

export async function getReviewBySubmissionId(submissionId: string): Promise<Review | null> {
  return queryOne<Review>('SELECT * FROM `review` WHERE submission_id = ?', [submissionId]);
}

export async function createReview(review: Omit<Review, 'id' | 'created_at' | 'updated_at'>): Promise<Review> {
  const id = randomUUID();
  await execute(
    'INSERT INTO `review` (id, submission_id, reviewer_id, feedback, decision, reviewed_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, review.submission_id, review.reviewer_id, review.feedback, review.decision, review.reviewed_at]
  );
  const newReview = await getReviewById(id);
  if (!newReview) throw new Error('Failed to create review');
  return newReview;
}

export async function createReviewAssignment(submissionId: string, reviewerId: string): Promise<Review> {
  const id = randomUUID();
  await execute(
    'INSERT INTO `review` (id, submission_id, reviewer_id, feedback, decision, reviewed_at) VALUES (?, ?, ?, NULL, NULL, NULL)',
    [id, submissionId, reviewerId]
  );
  const review = await getReviewById(id);
  if (!review) throw new Error('Failed to create review assignment');
  return review;
}

export async function completeReview(
  reviewId: string,
  feedback: string,
  decision: 'approve' | 'changes_requested' | 'reject'
): Promise<Review> {
  await execute(
    'UPDATE `review` SET feedback = ?, decision = ?, reviewed_at = NOW() WHERE id = ? AND reviewed_at IS NULL',
    [feedback, decision, reviewId]
  );
  const review = await getReviewById(reviewId);
  if (!review) throw new Error('Failed to complete review');
  return review;
}

export async function findReviewerForSubmission(
  submitterId: string,
  topicId: string
): Promise<User | null> {
  return queryOne<User>(
    `SELECT u.*
       FROM \`user\` u
       LEFT JOIN \`review\` r ON r.reviewer_id = u.id AND r.reviewed_at IS NULL
      WHERE u.role = "member" AND u.id <> ? AND u.is_blocked = FALSE
      GROUP BY u.id
      ORDER BY EXISTS (
        SELECT 1
          FROM \`submission\` completed
          JOIN \`weekly_task\` completed_task ON completed.weekly_task_id = completed_task.id
         WHERE completed.user_id = u.id
           AND completed_task.topic_id = ?
           AND completed.status = "approved"
      ) DESC, COUNT(r.id) ASC, u.joined_date ASC
      LIMIT 1`,
    [submitterId, topicId]
  );
}

// Streak queries
export async function getStreakByUserId(userId: string): Promise<Streak | null> {
  return queryOne<Streak>('SELECT * FROM `streak` WHERE user_id = ?', [userId]);
}

export async function createStreak(userId: string): Promise<Streak> {
  await execute(
    'INSERT INTO `streak` (user_id, current_streak_weeks, longest_streak_weeks) VALUES (?, 0, 0)',
    [userId]
  );
  const streak = await getStreakByUserId(userId);
  if (!streak) throw new Error('Failed to create streak');
  return streak;
}

export async function updateStreak(
  userId: string,
  currentWeeks: number,
  longestWeeks: number,
  completedAt: Date | null = new Date()
): Promise<void> {
  await execute(
    'UPDATE `streak` SET current_streak_weeks = ?, longest_streak_weeks = ?, last_complete_week = ? WHERE user_id = ?',
    [currentWeeks, longestWeeks, completedAt, userId]
  );
}

// Achievement queries
export async function getAchievementsByUserId(userId: string): Promise<Achievement[]> {
  return query<Achievement>(
    'SELECT * FROM `achievement` WHERE user_id = ? ORDER BY earned_at DESC',
    [userId]
  );
}

export async function createAchievement(achievement: Omit<Achievement, 'id' | 'created_at' | 'updated_at'>): Promise<Achievement> {
  const id = randomUUID();
  await execute(
    'INSERT INTO `achievement` (id, user_id, type, earned_at) VALUES (?, ?, ?, ?)',
    [id, achievement.user_id, achievement.type, achievement.earned_at]
  );
  const newAchievement = await query<Achievement>(
    'SELECT * FROM `achievement` WHERE id = ?',
    [id]
  );
  if (!newAchievement || newAchievement.length === 0) throw new Error('Failed to create achievement');
  return newAchievement[0];
}

// Excuse queries
export async function getExcuseBySubmissionId(submissionId: string): Promise<Excuse | null> {
  return queryOne<Excuse>('SELECT * FROM `excuse` WHERE submission_id = ?', [submissionId]);
}

export async function createExcuse(excuse: Omit<Excuse, 'id' | 'created_at' | 'updated_at'>): Promise<Excuse> {
  const id = randomUUID();
  await execute(
    'INSERT INTO `excuse` (id, submission_id, granted_by_admin_id, reason, granted_at) VALUES (?, ?, ?, ?, ?)',
    [id, excuse.submission_id, excuse.granted_by_admin_id, excuse.reason, excuse.granted_at]
  );
  const newExcuse = await queryOne<Excuse>('SELECT * FROM `excuse` WHERE id = ?', [id]);
  if (!newExcuse) throw new Error('Failed to create excuse');
  return newExcuse;
}

// Discussion session queries
export async function getDiscussionSessionsByTopicId(topicId: string): Promise<DiscussionSession[]> {
  return query<DiscussionSession>(
    'SELECT * FROM `discussion_session` WHERE topic_id = ? ORDER BY scheduled_at DESC',
    [topicId]
  );
}

export async function createDiscussionSession(session: Omit<DiscussionSession, 'id' | 'created_at' | 'updated_at'>): Promise<DiscussionSession> {
  const id = randomUUID();
  await execute(
    'INSERT INTO `discussion_session` (id, topic_id, scheduled_at, host_id, attendee_ids) VALUES (?, ?, ?, ?, ?)',
    [id, session.topic_id, session.scheduled_at, session.host_id, JSON.stringify(session.attendee_ids)]
  );
  const newSession = await query<DiscussionSession>(
    'SELECT * FROM `discussion_session` WHERE id = ?',
    [id]
  );
  if (!newSession || newSession.length === 0) throw new Error('Failed to create discussion session');
  return newSession[0];
}

export async function closePool(): Promise<void> {
  await pool.end();
}
