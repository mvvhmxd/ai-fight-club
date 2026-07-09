import mysql from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'ai_fight_club',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});
export async function query(sql, values) {
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.execute(sql, values);
        return rows;
    }
    finally {
        connection.release();
    }
}
export async function queryOne(sql, values) {
    const results = await query(sql, values);
    return results.length > 0 ? results[0] : null;
}
export async function execute(sql, values) {
    const connection = await pool.getConnection();
    try {
        const [result] = await connection.execute(sql, values);
        return result;
    }
    finally {
        connection.release();
    }
}
// User queries
export async function getUserById(id) {
    return queryOne('SELECT * FROM `user` WHERE id = ?', [id]);
}
export async function getUserByEmail(email) {
    return queryOne('SELECT * FROM `user` WHERE email = ?', [email]);
}
export async function createUser(user) {
    const id = randomUUID();
    await execute('INSERT INTO `user` (id, name, email, password_hash, role, joined_date, current_stage_id, timezone, is_blocked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, user.name, user.email, user.password_hash, user.role, user.joined_date, user.current_stage_id, user.timezone, user.is_blocked]);
    const newUser = await getUserById(id);
    if (!newUser)
        throw new Error('Failed to create user');
    return newUser;
}
export async function updateUserBlockStatus(userId, isBlocked) {
    await execute('UPDATE `user` SET is_blocked = ? WHERE id = ?', [isBlocked, userId]);
}
export async function getAllUsers() {
    return query('SELECT * FROM `user` ORDER BY joined_date DESC');
}
// Stage queries
export async function getStages() {
    return query('SELECT * FROM `stage` ORDER BY order_index ASC');
}
export async function getStageById(id) {
    return queryOne('SELECT * FROM `stage` WHERE id = ?', [id]);
}
export async function createStage(stage) {
    const id = randomUUID();
    await execute('INSERT INTO `stage` (id, name, order_index, description) VALUES (?, ?, ?, ?)', [id, stage.name, stage.order_index, stage.description]);
    const newStage = await getStageById(id);
    if (!newStage)
        throw new Error('Failed to create stage');
    return newStage;
}
export async function updateStage(id, changes) {
    await execute('UPDATE `stage` SET name = ?, order_index = ?, description = ? WHERE id = ?', [changes.name, changes.order_index, changes.description, id]);
    const stage = await getStageById(id);
    if (!stage)
        throw new Error('Stage not found');
    return stage;
}
export async function deleteStage(id) {
    await execute('DELETE FROM `stage` WHERE id = ?', [id]);
}
export async function reorderStages(ids) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [rows] = await connection.execute('SELECT id FROM `stage` ORDER BY order_index');
        const existing = rows.map(row => String(row.id));
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
    }
    catch (error) {
        await connection.rollback();
        throw error;
    }
    finally {
        connection.release();
    }
}
// Topic queries
export async function getTopicsByStageId(stageId) {
    return query('SELECT * FROM `topic` WHERE stage_id = ? ORDER BY order_index ASC', [stageId]);
}
export async function getAllTopics() {
    return query('SELECT * FROM `topic` ORDER BY stage_id, order_index ASC');
}
export async function getTopicById(id) {
    return queryOne('SELECT * FROM `topic` WHERE id = ?', [id]);
}
export async function createTopic(topic) {
    const id = randomUUID();
    await execute('INSERT INTO `topic` (id, stage_id, name, order_index, resources) VALUES (?, ?, ?, ?, ?)', [id, topic.stage_id, topic.name, topic.order_index, JSON.stringify(topic.resources)]);
    const newTopic = await getTopicById(id);
    if (!newTopic)
        throw new Error('Failed to create topic');
    return newTopic;
}
export async function updateTopic(id, changes) {
    await execute('UPDATE `topic` SET stage_id = ?, name = ?, order_index = ?, resources = ? WHERE id = ?', [changes.stage_id, changes.name, changes.order_index, JSON.stringify(changes.resources), id]);
    const topic = await getTopicById(id);
    if (!topic)
        throw new Error('Topic not found');
    return topic;
}
export async function deleteTopic(id) {
    await execute('DELETE FROM `topic` WHERE id = ?', [id]);
}
export async function reorderTopics(stageId, ids) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [rows] = await connection.execute('SELECT id FROM `topic` WHERE stage_id = ? ORDER BY order_index', [stageId]);
        const existing = rows.map(row => String(row.id));
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
    }
    catch (error) {
        await connection.rollback();
        throw error;
    }
    finally {
        connection.release();
    }
}
// Weekly task queries
export async function getWeeklyTasksByTopicId(topicId) {
    return query('SELECT * FROM `weekly_task` WHERE topic_id = ? ORDER BY week_number ASC', [topicId]);
}
export async function getAllWeeklyTasks() {
    return query('SELECT * FROM `weekly_task` ORDER BY assigned_date, week_number ASC');
}
export async function getWeeklyTaskById(id) {
    return queryOne('SELECT * FROM `weekly_task` WHERE id = ?', [id]);
}
export async function createWeeklyTask(task) {
    const id = randomUUID();
    await execute('INSERT INTO `weekly_task` (id, topic_id, week_number, assigned_date, due_date, required_milestones) VALUES (?, ?, ?, ?, ?, ?)', [id, task.topic_id, task.week_number, task.assigned_date, task.due_date, JSON.stringify(task.required_milestones)]);
    const newTask = await getWeeklyTaskById(id);
    if (!newTask)
        throw new Error('Failed to create weekly task');
    return newTask;
}
export async function updateWeeklyTask(id, changes) {
    await execute('UPDATE `weekly_task` SET topic_id = ?, week_number = ?, assigned_date = ?, due_date = ?, required_milestones = ? WHERE id = ?', [
        changes.topic_id, changes.week_number, changes.assigned_date, changes.due_date,
        JSON.stringify(changes.required_milestones), id,
    ]);
    const task = await getWeeklyTaskById(id);
    if (!task)
        throw new Error('Task not found');
    return task;
}
export async function deleteWeeklyTask(id) {
    await execute('DELETE FROM `weekly_task` WHERE id = ?', [id]);
}
export async function reorderWeeklyTasks(topicId, ids) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [rows] = await connection.execute('SELECT id FROM `weekly_task` WHERE topic_id = ? ORDER BY week_number, assigned_date', [topicId]);
        const existing = rows.map(row => String(row.id));
        if (existing.length !== ids.length || existing.some(id => !ids.includes(id))) {
            throw new Error('Task order must contain every task in the topic exactly once');
        }
        for (let index = 0; index < ids.length; index++) {
            await connection.execute('UPDATE `weekly_task` SET week_number = ? WHERE id = ?', [index + 1, ids[index]]);
        }
        await connection.commit();
    }
    catch (error) {
        await connection.rollback();
        throw error;
    }
    finally {
        connection.release();
    }
}
// Submission queries
export async function getSubmissionById(id) {
    return queryOne('SELECT * FROM `submission` WHERE id = ?', [id]);
}
export async function getSubmissionsByUserId(userId) {
    return query('SELECT * FROM `submission` WHERE user_id = ? ORDER BY created_at DESC', [userId]);
}
export async function getSubmissionsByWeeklyTaskId(weeklyTaskId) {
    return query('SELECT * FROM `submission` WHERE weekly_task_id = ? ORDER BY created_at DESC', [weeklyTaskId]);
}
export async function getOverdueSubmissions() {
    return query('SELECT s.* FROM `submission` s JOIN `weekly_task` wt ON s.weekly_task_id = wt.id WHERE s.status = "overdue" OR (s.status = "pending" AND wt.due_date < NOW())');
}
export async function markExpiredSubmissionsOverdue() {
    await execute(`INSERT IGNORE INTO \`submission\` (user_id, weekly_task_id, milestone_type, status)
     SELECT u.id, wt.id, milestones.milestone, "pending"
       FROM \`user\` u
       JOIN \`weekly_task\` wt ON wt.due_date < NOW()
       JOIN JSON_TABLE(
         wt.required_milestones,
         '$[*]' COLUMNS (milestone VARCHAR(32) PATH '$')
       ) milestones
      WHERE u.role = "member"`);
    const expired = await query('SELECT s.* FROM `submission` s JOIN `weekly_task` wt ON s.weekly_task_id = wt.id WHERE s.status = "pending" AND wt.due_date < NOW()');
    if (expired.length === 0)
        return [];
    const ids = expired.map(submission => submission.id);
    await execute(`UPDATE \`submission\` SET status = "overdue" WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
    return [...new Set(expired.map(submission => submission.user_id))];
}
export async function hasOverdueSubmissions(userId) {
    const row = await queryOne('SELECT COUNT(*) AS total FROM `submission` WHERE user_id = ? AND status = "overdue"', [userId]);
    return Number(row?.total || 0) > 0;
}
export async function createSubmission(submission) {
    const id = randomUUID();
    await execute('INSERT INTO `submission` (id, user_id, weekly_task_id, milestone_type, status, submitted_at, github_url, notes_content, quiz_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, submission.user_id, submission.weekly_task_id, submission.milestone_type, submission.status, submission.submitted_at, submission.github_url, submission.notes_content, submission.quiz_score]);
    const newSubmission = await getSubmissionById(id);
    if (!newSubmission)
        throw new Error('Failed to create submission');
    return newSubmission;
}
export async function updateSubmissionStatus(submissionId, status) {
    await execute('UPDATE `submission` SET status = ? WHERE id = ?', [status, submissionId]);
}
// Review queries
export async function getReviewById(id) {
    return queryOne('SELECT * FROM `review` WHERE id = ?', [id]);
}
export async function getReviewsByReviewerId(reviewerId) {
    return query(`SELECT r.*, submitter.name AS submitter_name, reviewer.name AS reviewer_name,
            s.milestone_type, s.github_url
       FROM \`review\` r
       JOIN \`submission\` s ON r.submission_id = s.id
       JOIN \`user\` submitter ON s.user_id = submitter.id
       JOIN \`user\` reviewer ON r.reviewer_id = reviewer.id
      WHERE r.reviewer_id = ?
      ORDER BY r.created_at DESC`, [reviewerId]);
}
export async function getAllReviews() {
    return query(`SELECT r.*, submitter.name AS submitter_name, reviewer.name AS reviewer_name,
            s.milestone_type, s.github_url
       FROM \`review\` r
       JOIN \`submission\` s ON r.submission_id = s.id
       JOIN \`user\` submitter ON s.user_id = submitter.id
       JOIN \`user\` reviewer ON r.reviewer_id = reviewer.id
      ORDER BY r.created_at DESC`);
}
export async function hasCompletedReview(reviewerId) {
    const row = await queryOne('SELECT COUNT(*) AS total FROM `review` WHERE reviewer_id = ? AND reviewed_at IS NOT NULL', [reviewerId]);
    return Number(row?.total || 0) > 0;
}
export async function getReviewBySubmissionId(submissionId) {
    return queryOne('SELECT * FROM `review` WHERE submission_id = ?', [submissionId]);
}
export async function createReview(review) {
    const id = randomUUID();
    await execute('INSERT INTO `review` (id, submission_id, reviewer_id, feedback, decision, reviewed_at) VALUES (?, ?, ?, ?, ?, ?)', [id, review.submission_id, review.reviewer_id, review.feedback, review.decision, review.reviewed_at]);
    const newReview = await getReviewById(id);
    if (!newReview)
        throw new Error('Failed to create review');
    return newReview;
}
export async function createReviewAssignment(submissionId, reviewerId) {
    const id = randomUUID();
    await execute('INSERT INTO `review` (id, submission_id, reviewer_id, feedback, decision, reviewed_at) VALUES (?, ?, ?, NULL, NULL, NULL)', [id, submissionId, reviewerId]);
    const review = await getReviewById(id);
    if (!review)
        throw new Error('Failed to create review assignment');
    return review;
}
export async function completeReview(reviewId, feedback, decision) {
    await execute('UPDATE `review` SET feedback = ?, decision = ?, reviewed_at = NOW() WHERE id = ? AND reviewed_at IS NULL', [feedback, decision, reviewId]);
    const review = await getReviewById(reviewId);
    if (!review)
        throw new Error('Failed to complete review');
    return review;
}
export async function findReviewerForSubmission(submitterId, topicId) {
    return queryOne(`SELECT u.*
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
      LIMIT 1`, [submitterId, topicId]);
}
// Streak queries
export async function getStreakByUserId(userId) {
    return queryOne('SELECT * FROM `streak` WHERE user_id = ?', [userId]);
}
export async function createStreak(userId) {
    await execute('INSERT INTO `streak` (user_id, current_streak_weeks, longest_streak_weeks) VALUES (?, 0, 0)', [userId]);
    const streak = await getStreakByUserId(userId);
    if (!streak)
        throw new Error('Failed to create streak');
    return streak;
}
export async function updateStreak(userId, currentWeeks, longestWeeks, completedAt = new Date()) {
    await execute('UPDATE `streak` SET current_streak_weeks = ?, longest_streak_weeks = ?, last_complete_week = ? WHERE user_id = ?', [currentWeeks, longestWeeks, completedAt, userId]);
}
// Achievement queries
export async function getAchievementsByUserId(userId) {
    return query('SELECT * FROM `achievement` WHERE user_id = ? ORDER BY earned_at DESC', [userId]);
}
export async function createAchievement(achievement) {
    const id = randomUUID();
    await execute('INSERT INTO `achievement` (id, user_id, type, earned_at) VALUES (?, ?, ?, ?)', [id, achievement.user_id, achievement.type, achievement.earned_at]);
    const newAchievement = await query('SELECT * FROM `achievement` WHERE id = ?', [id]);
    if (!newAchievement || newAchievement.length === 0)
        throw new Error('Failed to create achievement');
    return newAchievement[0];
}
// Excuse queries
export async function getExcuseBySubmissionId(submissionId) {
    return queryOne('SELECT * FROM `excuse` WHERE submission_id = ?', [submissionId]);
}
export async function createExcuse(excuse) {
    const id = randomUUID();
    await execute('INSERT INTO `excuse` (id, submission_id, granted_by_admin_id, reason, granted_at) VALUES (?, ?, ?, ?, ?)', [id, excuse.submission_id, excuse.granted_by_admin_id, excuse.reason, excuse.granted_at]);
    const newExcuse = await queryOne('SELECT * FROM `excuse` WHERE id = ?', [id]);
    if (!newExcuse)
        throw new Error('Failed to create excuse');
    return newExcuse;
}
// Discussion session queries
export async function getDiscussionSessionsByTopicId(topicId) {
    return query('SELECT * FROM `discussion_session` WHERE topic_id = ? ORDER BY scheduled_at DESC', [topicId]);
}
export async function createDiscussionSession(session) {
    const id = randomUUID();
    await execute('INSERT INTO `discussion_session` (id, topic_id, scheduled_at, host_id, attendee_ids) VALUES (?, ?, ?, ?, ?)', [id, session.topic_id, session.scheduled_at, session.host_id, JSON.stringify(session.attendee_ids)]);
    const newSession = await query('SELECT * FROM `discussion_session` WHERE id = ?', [id]);
    if (!newSession || newSession.length === 0)
        throw new Error('Failed to create discussion session');
    return newSession[0];
}
export async function closePool() {
    await pool.end();
}
//# sourceMappingURL=db.js.map